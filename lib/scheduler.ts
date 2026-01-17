
// Basic schedule generation logic

export interface CourseSession {
    day: string;
    start: number; // minutes from midnight
    end: number;
    location?: string;
}

export interface Course {
    id: string;
    code: string;
    crn: string;
    title: string;
    days?: string | null;
    times?: string | null;
    instructor?: string | null;
    building?: string | null;
    rooms?: string | null;
    enrolled?: string | null;
    capacity?: string | null;
}

const DAYS_MAP: Record<string, number> = {
    // Turkish
    'Pazartesi': 0,
    'Salı': 1,
    'Çarşamba': 2,
    'Perşembe': 3,
    'Cuma': 4,
    'Cumartesi': 5,
    'Pazar': 6,
    // English (ITU OBS now provides English day names)
    'Monday': 0,
    'Tuesday': 1,
    'Wednesday': 2,
    'Thursday': 3,
    'Friday': 4,
    'Saturday': 5,
    'Sunday': 6
};

// Helper: Normalize day strings (just trim, both English and Turkish are now in DAYS_MAP)
function normalizeDay(day: string): string {
    return day.trim();
}

// Helper: Parse "HH:MM" to minutes from midnight
function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export function parseSchedule(times: string, days: string): CourseSession[] {
    if (!times || !days) return [];

    const rawDayList = days.split(',').map(d => d.trim());
    const dayList = rawDayList.map(normalizeDay);
    const timeList = times.split(',').map(t => t.trim());

    const sessions: CourseSession[] = [];

    // CASE 1: Single time for all days
    // e.g. Days: "Mon, Wed, Fri", Times: "10:00/12:00"
    if (timeList.length === 1 && dayList.length >= 1) {
        const [startStr, endStr] = timeList[0].split('/');
        if (!startStr || !endStr) return [];

        const start = timeToMinutes(startStr);
        let end = timeToMinutes(endStr);
        if (end < start) end += 1440; // Wrap around midnight

        dayList.forEach(day => {
            sessions.push({ day, start, end });
        });
        return sessions;
    }

    // CASE 2: Mismatched counts (Days > Times)
    // Common pattern: "Mon, Wed, Fri" with "10:30/12:30, 08:30/10:30"
    // Usually means the FIRST time slot applies to multiple days (e.g. Lecture)
    // and the LAST time slot applies to the last day (e.g. Lab) or vice versa.
    // Heuristic: Distribute the first time slot to the first N days to make counts match.
    if (dayList.length > timeList.length && timeList.length > 0) {
        const extraDays = dayList.length - timeList.length;

        // We assume the first time slot repeats for the extra days
        // e.g. Days: M, W, F (3) | Times: T1, T2 (2) -> M=T1, W=T1, F=T2

        let dayIndex = 0;

        // Process first time slot for (1 + extraDays)
        const firstTime = timeList[0];
        const [startStr1, endStr1] = firstTime.split('/');
        if (startStr1 && endStr1) {
            const s1 = timeToMinutes(startStr1);
            let e1 = timeToMinutes(endStr1);
            if (e1 < s1) e1 += 1440;

            for (let k = 0; k < 1 + extraDays; k++) {
                if (dayIndex < dayList.length) {
                    sessions.push({ day: dayList[dayIndex], start: s1, end: e1 });
                    dayIndex++;
                }
            }
        }

        // Process remaining time slots 1-to-1
        for (let i = 1; i < timeList.length; i++) {
            const [startStr, endStr] = timeList[i].split('/');
            if (startStr && endStr && dayIndex < dayList.length) {
                const s = timeToMinutes(startStr);
                let e = timeToMinutes(endStr);
                if (e < s) e += 1440;
                sessions.push({ day: dayList[dayIndex], start: s, end: e });
                dayIndex++;
            }
        }

        return sessions;
    }

    // CASE 3: 1-to-1 Mapping (or Times > Days, which shouldn't happen usually)
    const count = Math.min(dayList.length, timeList.length);
    for (let i = 0; i < count; i++) {
        const [startStr, endStr] = timeList[i].split('/');
        if (!startStr || !endStr) continue;

        let start = timeToMinutes(startStr);
        let end = timeToMinutes(endStr);
        if (end < start) end += 1440; // Wrap around midnight
        sessions.push({ day: dayList[i], start, end });
    }

    return sessions;
}

export function checkConflict(courseA: Course, courseB: Course): boolean {
    const sessionsA = parseSchedule(courseA.times || '', courseA.days || '');
    const sessionsB = parseSchedule(courseB.times || '', courseB.days || '');

    for (const a of sessionsA) {
        for (const b of sessionsB) {
            if (a.day === b.day) {
                // Check overlap: (StartA < EndB) and (StartB < EndA)
                if (a.start < b.end && b.start < a.end) {
                    return true;
                }
            }
        }
    }
    return false;
}


export interface SelectiveGroup {
    id: string;
    name: string;
    required: number;
    options: Course[][]; // List of list of sections (options)
}

interface ScheduleState {
    courses: Course[];
    mustCount: number;
    selectiveCounts: Record<string, number>; // groupId -> count
    totalRequested: number;
}

export function generateSchedules(
    mustCourses: Course[][], // List of courses (each is list of sections)
    selectiveGroups: SelectiveGroup[],
    constraints: any
): { courses: Course[], match: number }[] {
    const MAX_SCHEDULES = 100;

    // 1. Calculate Total Requested (Denominator for Score)
    const totalMust = mustCourses.length;
    let totalSelectiveReq = 0;
    selectiveGroups.forEach(g => totalSelectiveReq += g.required);
    const totalRequested = totalMust + totalSelectiveReq;

    // We will collect "Pareto Optimal" schedules.
    // Actually, we just want to collect valid schedules and effectively score them.
    // To generate variations, we shouldn't just keep the single best. We keep top K.

    let results: ScheduleState[] = [];

    // --- PHASE 1: Must Courses (Best Effort) ---
    // We want to maximize the number of Must courses fit.
    // "Comibation of 6:5" -> If we can fit 6, great. If not, fit 5.
    // We use recursion. At each step (course index), we try to ADD it.
    // If we can't add ANY section of it due to conflict, we SKIP it.
    // Optimization: If current + remaining < best_found_so_far, prune?
    // User wants variations, so we might return multiple 5/6 solutions.

    function solveMust(
        idx: number,
        current: Course[],
        scheduledIndices: Set<number> // tracking which must indices were scheduled
    ): { courses: Course[], indices: Set<number> }[] {
        // Base case
        if (idx === mustCourses.length) {
            return [{ courses: current, indices: scheduledIndices }];
        }

        const sections = mustCourses[idx];
        let branches: { courses: Course[], indices: Set<number> }[] = [];
        let scheduledThisCourse = false;

        // Try to pick a section
        for (const section of sections) {
            // Check conflicts
            let conflict = false;
            for (const existing of current) {
                if (checkConflict(section, existing)) {
                    conflict = true;
                    break;
                }
            }

            if (!conflict) {
                // Branch: Schedule this section
                // We only need to recurse if we are collecting ALL variants.
                // This can explode. 6 courses * 10 sections = 10^6? No, 6^10? No. 10^6.
                // With conflicts, it's less.
                // To keep it sane, if we successfully schedule this course, do we ANYWAY try skipping it?
                // "Combination of 6:5" implies we try subsets.
                // But usually we only want 5/6 if 6/6 is impossible.
                // Let's try to schedule it.
                scheduledThisCourse = true;

                // Recurse
                // Note: We might get many duplicates if multiple sections work.
                // Let's maybe limit sections tried? No, sections imply different times.

                const nextResults = solveMust(idx + 1, [...current, section], new Set([...scheduledIndices, idx]));
                branches.push(...nextResults);
            }
        }

        // If we found ANY way to schedule this course, we generally prefer that.
        // BUT, maybe scheduling this course prevents 2 others?
        // True "Max Independent Set" requires allowing Skip even if calculable.

        // Let's Always allow Skip as a branch.
        const skipResults = solveMust(idx + 1, current, scheduledIndices);
        branches.push(...skipResults);

        // Optimization: Filter branches to keep only "Optimal" ones?
        // This is locally hard. Let's do it at the end of Phase 1.
        return branches;
    }

    // This full recursion is too heavy (2^N * Sections).
    // Heuristic:
    // 1. Try to find 100% solutions.
    // 2. If count < 5 (arbitrary), return max found.

    // Improved Logic: "Iterative Deepening" style or just straightforward recursion with Limit.

    let mustSolutions: { courses: Course[], count: number }[] = [];

    // We implement a custom recursive solver that manages a global list of "best solutions found".
    function backtrackMust(idx: number, current: Course[]) {
        // Pruning: If (current.len + remaining) < (best found len - 1), stop?
        // User wants variations.

        if (idx === mustCourses.length) {
            mustSolutions.push({ courses: current, count: current.length });
            return;
        }

        // Option 1: Try to schedule (if possible)
        const sections = mustCourses[idx];
        let placed = false;

        // Heuristic: Shuffle sections to get variety? Or just take first few?
        // Taking all is safe for small N.
        for (const section of sections) {
            let conflict = false;
            for (const c of current) {
                if (checkConflict(section, c)) {
                    conflict = true;
                    break;
                }
            }
            if (!conflict) {
                placed = true;
                backtrackMust(idx + 1, [...current, section]);
                // If we have enough solutions, maybe break?
                if (mustSolutions.length > 200) return;
            }
        }

        // Option 2: Skip
        // We ALWAYS allow skipping to find subsets? 
        // If we enforce "Must", we only skip if we HAVE to?
        // User said: "program is available for 5/6... creates variations".
        // This usually means "Try to fit 6. If not, fit 5".
        // If we force skipping when we could have placed, we generate 5/6 variations even if 6/6 exists.
        // Is that desired? "Objective is to include as many of them as possible".
        // This implies we prefer 6/6.
        // But maybe valid 5/6 is better than invalid 6/6.

        // Heuristic: Only explore "Skip" if we haven't found a "Full" solution yet?
        // Or better: Explore Skip, but filtering later will remove 5/6 if 6/6 exists and is strictly better?
        // Actually, 5/6 is strictly worse than 6/6 score-wise.
        // So we can indiscriminately generate all valid independent sets (up to a limit) and sort by score.

        backtrackMust(idx + 1, current);
    }

    backtrackMust(0, []);

    // Deduplicate and Prune Must Solutions
    // Sort by count desc.
    mustSolutions.sort((a, b) => b.count - a.count);

    // Filter: Keep top tier (e.g. if max is 6, keep 6s and maybe 5s. Don't keep 1s).
    if (mustSolutions.length > 0) {
        const maxScore = mustSolutions[0].count;
        // Keep feasible ones. Let's say max - 2.
        mustSolutions = mustSolutions.filter(s => s.count >= maxScore - 2);
    }

    // Dedupe by "Course Codes in Schedule" + "Times"?
    // Just keep unique signatures.
    const uniqueMap = new Map<string, { courses: Course[], count: number }>();
    mustSolutions.forEach(sol => {
        // Signature: Sorted CRNs
        const sig = sol.courses.map(c => c.crn).sort().join('|');
        if (!uniqueMap.has(sig)) uniqueMap.set(sig, sol);
    });
    mustSolutions = Array.from(uniqueMap.values());

    // Limit fan-out
    mustSolutions = mustSolutions.slice(0, 50);

    // --- PHASE 2: Selective Groups ---

    let finalSchedules: ScheduleState[] = [];

    // For each Must-Base, try to fill Selective groups
    for (const base of mustSolutions) {
        // Recursive solver for groups
        // groups: SelectiveGroup[]
        // We handle groups sequentially as requested: "Moves to the second selective field"

        function solveGroups(
            grpIdx: number,
            currentSchedule: Course[],
            currentSelectiveCounts: Record<string, number>
        ) {
            if (grpIdx === selectiveGroups.length) {
                finalSchedules.push({
                    courses: currentSchedule,
                    mustCount: base.count,
                    selectiveCounts: { ...currentSelectiveCounts },
                    totalRequested
                });
                return;
            }

            const group = selectiveGroups[grpIdx];
            const target = group.required;

            // We want to add UP TO target courses from group.options
            // Best effort: Try to add 'target', if fail, try 'target-1', etc.

            // Helper to generate combinations of options of size K
            // options is Course[][] (List of lists of sections)
            const optionCourses = group.options; // These are the "Subject/Course" entities

            // We need to pick K unique indices from optionCourses.
            // And for each index, pick 1 valid section.

            // This is a mini-CSP.
            // Let's try to find ONE valid combination of size K.
            // If not, K-1.

            let bestKForThisGroup = -1;
            let variantsForBestK: Course[][] = [];

            // We iterate k from target down to 0
            for (let k = target; k >= 0; k--) {
                // Try to find combinations of size k
                // If k=0, it's trivial (empty list), always succeeds.
                if (k === 0) {
                    if (bestKForThisGroup === -1) {
                        bestKForThisGroup = 0;
                        variantsForBestK.push([]);
                    }
                    break;
                }

                // Get combinations of indices [0..M-1] of size k
                const combIndices = getCombinations(optionCourses.length, k);

                // For each combination of courses, try to find sections that fit
                for (const combination of combIndices) {
                    // combination: e.g. [0, 2] (indices in optionCourses)
                    // We need to pick 1 section for optionCourses[0] and 1 for optionCourses[2]
                    // that don't conflict with currentSchedule OR each other.

                    const coursesToSched = combination.map(i => optionCourses[i]);
                    // coursesToSched: Course[][]

                    const found = findValidExtension(currentSchedule, coursesToSched);
                    if (found.length > 0) {
                        // We found valid extensions of size k!
                        if (bestKForThisGroup === -1) bestKForThisGroup = k;
                        variantsForBestK.push(...found);

                        // Limit variations per group to avoid explosion
                        if (variantsForBestK.length > 20) break;
                    }
                }

                if (bestKForThisGroup !== -1 && variantsForBestK.length > 0) {
                    // Found max possible K for this group. Stop looking for smaller Ks.
                    break;
                }
            }

            // Now recurse for next group with these variants
            for (const variant of variantsForBestK) {
                solveGroups(
                    grpIdx + 1,
                    [...currentSchedule, ...variant],
                    { ...currentSelectiveCounts, [group.id]: bestKForThisGroup }
                );
            }
        }

        solveGroups(0, base.courses, {});
    }

    // --- SCORING & FINALIZATION ---

    // Map to Output Format
    const graded = finalSchedules.map(state => {
        // Calculate "Selection Rate"
        let scheduledSelective = 0;
        Object.values(state.selectiveCounts).forEach(c => scheduledSelective += c);

        const totalScheduled = state.mustCount + scheduledSelective;
        const baseScore = (totalRequested > 0) ? (totalScheduled / totalRequested) * 100 : 100;

        // Constraint Penalties (Soft)
        // We simply subtract from the weighted score to break ties
        // Or we strictly sort by (BaseScore, Penalities).
        // Let's apply penalties to the score but clamp.
        let penalties = 0;
        if (constraints.freeDays) {
            const usedDays = new Set<string>();
            state.courses.forEach(c => {
                parseSchedule(c.times || '', c.days || '').forEach(s => usedDays.add(s.day));
            });
            constraints.freeDays.forEach((d: string) => {
                if (usedDays.has(d)) penalties += 5; // 5% penalty per missed free day
            });
        }
        if (constraints.noMorning) {
            let hasMorning = false;
            for (const c of state.courses) {
                if (parseSchedule(c.times || '', c.days || '').some(s => s.start < 630)) { // 10:30 is 630
                    hasMorning = true; break;
                }
            }
            if (hasMorning) penalties += 5;
        }

        return {
            courses: state.courses,
            match: Math.max(0, parseFloat((baseScore - penalties).toFixed(1)))
        };
    });

    // Sort: High score first
    graded.sort((a, b) => b.match - a.match);

    return graded.slice(0, MAX_SCHEDULES);
}

// --- HELPERS ---

function getCombinations(N: number, K: number): number[][] {
    if (K > N) return [];
    if (K === 0) return [[]];
    const res: number[][] = [];
    function backtrack(start: number, curr: number[]) {
        if (curr.length === K) {
            res.push([...curr]);
            return;
        }
        for (let i = start; i < N; i++) {
            backtrack(i + 1, [...curr, i]);
        }
    }
    backtrack(0, []);
    return res;
}

function findValidExtension(currentBase: Course[], coursesToSolve: Course[][]): Course[][] {
    const results: Course[][] = [];

    function solve(idx: number, currentExt: Course[]) {
        if (results.length > 20) return; // limit
        if (idx === coursesToSolve.length) {
            results.push(currentExt);
            return;
        }

        const sections = coursesToSolve[idx];
        for (const section of sections) {
            // Check vs Base
            let conflict = false;
            for (const baseC of currentBase) {
                if (checkConflict(section, baseC)) { conflict = true; break; }
            }
            if (!conflict) {
                // Check vs Current Extension
                for (const extC of currentExt) {
                    if (checkConflict(section, extC)) { conflict = true; break; }
                }
            }

            if (!conflict) {
                solve(idx + 1, [...currentExt, section]);
            }
        }
    }

    solve(0, []);
    return results;
}

// Keep existing helpers if not replaced
export function calculateMatchRate(schedule: Course[], constraints: any): number {
    // Legacy support, or unused now. 
    // The main logic is inside generateSchedules now.
    return 0;
}

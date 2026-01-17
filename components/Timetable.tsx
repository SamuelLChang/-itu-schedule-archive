'use client';

import { useMemo } from 'react';
import { Course, CourseSession } from '@/lib/scheduler';
import { Clock, MapPin, User } from 'lucide-react';

interface TimetableProps {
    courses: Course[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_LABELS: Record<string, string> = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri'
};

// Unified color palette - Distinctive vibrant pastels matching website design
const COLORS = [
    'bg-[#DBEAFE] text-[#1E40AF] ring-1 ring-black/5', // Blue
    'bg-[#F3E8FF] text-[#6B21A8] ring-1 ring-black/5', // Purple
    'bg-[#D1FAE5] text-[#065F46] ring-1 ring-black/5', // Emerald
    'bg-[#FEF3C7] text-[#92400E] ring-1 ring-black/5', // Amber
    'bg-[#FCE7F3] text-[#9D174D] ring-1 ring-black/5', // Pink
    'bg-[#CFFAFE] text-[#155E75] ring-1 ring-black/5', // Cyan
    'bg-[#FFEDD5] text-[#C2410C] ring-1 ring-black/5', // Orange
    'bg-[#E0E7FF] text-[#3730A3] ring-1 ring-black/5', // Indigo
    'bg-[#CCFBF1] text-[#115E59] ring-1 ring-black/5', // Teal
    'bg-[#FEE2E2] text-[#991B1B] ring-1 ring-black/5', // Red
    'bg-[#FEF9C3] text-[#854D0E] ring-1 ring-black/5', // Yellow
    'bg-[#F1F5F9] text-[#334155] ring-1 ring-black/5', // Slate
];

// Day mapping from Turkish to English
const DAY_MAP: Record<string, string> = {
    'Pazartesi': 'Monday', 'Salı': 'Tuesday', 'Çarşamba': 'Wednesday',
    'Perşembe': 'Thursday', 'Cuma': 'Friday', 'Cumartesi': 'Saturday', 'Pazar': 'Sunday',
    'Monday': 'Monday', 'Tuesday': 'Tuesday', 'Wednesday': 'Wednesday',
    'Thursday': 'Thursday', 'Friday': 'Friday', 'Saturday': 'Saturday', 'Sunday': 'Sunday'
};

// Extended session type with location info
interface TimetableSession extends CourseSession {
    building: string;
    room: string;
    course: Course;
}

// Custom parsing function that matches calendar page logic - distributes location per session
function parseScheduleWithLocation(course: Course): TimetableSession[] {
    if (!course.times || !course.days) return [];

    const times = course.times.split(',').map((t: string) => t.trim());
    const days = course.days.split(',').map((d: string) => d.trim());

    // Split location data
    const buildings = (course.building || '').split(',').map((b: string) => b.trim());
    const rooms = (course.rooms || '').split(',').map((r: string) => r.trim());

    const parseMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const sessions: TimetableSession[] = [];
    const maxLen = Math.max(times.length, days.length);

    for (let i = 0; i < maxLen; i++) {
        const time = times[i] || times[times.length - 1];
        const day = days[i] || days[days.length - 1];

        // Distribute location logic (same as calendar page)
        let building = buildings[i];
        if (building === undefined) building = buildings.length === 1 ? buildings[0] : (buildings[buildings.length - 1] || '');

        let room = rooms[i];
        if (room === undefined) room = rooms.length === 1 ? rooms[0] : (rooms[rooms.length - 1] || '');

        if (time && day) {
            const [startStr, endStr] = time.split(/[-\/]/); // support - or /
            if (!startStr || !endStr) continue;

            let s = parseMin(startStr);
            let e = parseMin(endStr);
            if (e < s) e += 1440; // Wrap around

            sessions.push({
                day: DAY_MAP[day] || day,
                start: s,
                end: e,
                building: building,
                room: room,
                course: course
            });
        }
    }
    return sessions;
}

export default function Timetable({ courses }: TimetableProps) {
    // Generate accurate time slots
    // 08:30 start
    const startHour = 8;
    const startMin = 30;
    const startTotalMinutes = startHour * 60 + startMin; // 510 minutes

    // Parse all sessions with location data
    const sessions = useMemo(() => {
        return courses.flatMap(c => parseScheduleWithLocation(c));
    }, [courses]);

    // Dynamic end time based on courses
    const maxEndMin = sessions.reduce((max, s) => Math.max(max, s.end), 0);
    const defaultEndMin = 17 * 60 + 30; // 17:30
    const endTotalMinutes = Math.max(defaultEndMin, maxEndMin + 60);

    // Create time labels: 08:30, 09:30, ...
    const timeLabels: string[] = [];
    for (let m = startTotalMinutes; m < endTotalMinutes; m += 60) {
        const h = Math.floor(m / 60) % 24;
        const mm = m % 60;
        timeLabels.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }

    // Map course CRN to color index
    const courseColors = useMemo(() => {
        const map = new Map<string, string>();
        courses.forEach((c, i) => {
            map.set(c.crn, COLORS[i % COLORS.length]);
        });
        return map;
    }, [courses]);

    // Grid config
    const pxPerMin = 1.2;
    const gridHeight = timeLabels.length * 60 * pxPerMin;

    const getPositionStyle = (s: CourseSession) => {
        const itemStart = s.start - startTotalMinutes;
        const duration = s.end - s.start;
        return {
            top: `${itemStart * pxPerMin}px`,
            height: `${Math.max(duration * pxPerMin, 45)}px`, // Minimum height for readability
        };
    };

    // Helper to format minutes to HH:MM
    const formatTime = (totalMinutes: number) => {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full max-h-[80vh]">
            {/* Header: Days */}
            <div className="grid grid-cols-[60px_repeat(5,1fr)] bg-white border-b border-slate-100 flex-shrink-0 z-20 sticky top-0">
                <div className="h-[50px] flex items-center justify-center text-slate-400 text-[10px] font-mono opacity-60">
                    GMT+3
                </div>
                {DAYS.map(d => (
                    <div key={d} className="h-[50px] flex flex-col items-center justify-center border-l border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{DAY_LABELS[d]}<span className="hidden sm:inline">{d.slice(3)}</span></span>
                    </div>
                ))}
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto custom-scrollbar flex-1 relative bg-white p-4">
                <div className="grid grid-cols-[60px_repeat(5,1fr)] min-h-[600px] relative" style={{ height: `${gridHeight}px` }}>

                    {/* Time Column (Axis) */}
                    <div className="relative">
                        {timeLabels.map((time, i) => (
                            <div
                                key={time}
                                className="absolute w-full text-right pr-3 text-[10px] font-mono text-slate-400 opacity-60 -mt-2"
                                style={{ top: `${i * 60 * pxPerMin}px` }}
                            >
                                {time}
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {DAYS.map((day, dayIdx) => (
                        <div key={day} className="relative border-l border-slate-100">
                            {/* Horizontal grid lines */}
                            {timeLabels.map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-full border-t border-slate-100"
                                    style={{ top: `${i * 60 * pxPerMin}px` }}
                                />
                            ))}

                            {/* Render matching sessions */}
                            {sessions
                                .filter(s => s.day === day)
                                .map((s, idx) => {
                                    const style = getPositionStyle(s);
                                    const colorClass = courseColors.get(s.course.crn) || 'bg-gray-100';
                                    const timeStr = `${formatTime(s.start)}-${formatTime(s.end)}`;

                                    return (
                                        <div
                                            key={`${s.course.crn}-${idx}`}
                                            className={`absolute left-1 right-1 rounded-2xl px-2.5 py-2 flex flex-col justify-start shadow-sm hover:shadow-xl hover:scale-[1.02] hover:z-50 transition-all duration-300 cursor-pointer z-10 overflow-hidden ${colorClass}`}
                                            style={style}
                                            title={`${s.course.code}: ${s.course.title}`}
                                        >
                                            {/* Card Content */}
                                            <div className="flex flex-col h-full relative">
                                                {/* Top Row: Code & CRN */}
                                                <div className="flex justify-between items-start leading-tight mb-1">
                                                    <span className="font-extrabold text-[11px] tracking-tight">{s.course.code}</span>
                                                    <span className="font-mono text-[9px] bg-black/5 px-1.5 rounded text-current/70 font-bold">
                                                        {s.course.crn}
                                                    </span>
                                                </div>

                                                {/* Middle: Title */}
                                                <div className="font-medium text-[9px] opacity-90 leading-tight line-clamp-2 mb-auto">
                                                    {s.course.title}
                                                </div>

                                                {/* Bottom Row: Location & Instructor */}
                                                <div className="mt-1 pt-1.5 flex justify-between items-center border-t border-black/5 opacity-80 min-h-[18px]">
                                                    <div className="flex items-center gap-1 text-[9px] font-semibold">
                                                        <MapPin className="w-2.5 h-2.5 opacity-70" />
                                                        <span className="truncate">{s.building || 'TBA'} <span className="opacity-70 font-medium">{s.room}</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[9px]">
                                                        <User className="w-2.5 h-2.5 opacity-70" />
                                                        <span className="truncate">{s.course.instructor?.split(' ')[1] || 'Staff'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


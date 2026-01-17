/**
 * ITU Schedule Scraper
 * Fetches course schedule data from ITU OBS and seeds directly to the database.
 * 
 * Usage:
 *   npm run scrape           # Scrape and seed to database
 *   npm run scrape -- --dry-run  # Test without writing to database
 */

import { PrismaClient } from '@prisma/client';
import { parse as parseHTML } from 'node-html-parser';

const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'https://obs.itu.edu.tr';
const SCHEDULE_URL = `${BASE_URL}/public/DersProgram/DersProgramSearch`;
const COURSE_CODES_URL = `${BASE_URL}/public/DersProgram/SearchBransKoduByProgramSeviye`;

const LEVELS: Record<string, string> = {
    associate: 'OL',
    undergraduate: 'LS',
    graduate: 'LU',
    graduate_evening: 'LUI'
};

interface CourseCode {
    id: string;
    code: string;
}

interface CourseData {
    crn: string;
    code: string;
    title: string;
    teachingMethod: string;
    instructor: string;
    building: string;
    days: string;
    times: string;
    rooms: string;
    capacity: string;
    enrolled: string;
    reservation: string;
    majorRestriction: string;
    prerequisites: string;
    creditConstraint: string;
    level: string;
}

// Helpers
function cleanText(s: string): string {
    return s ? s.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() : '';
}

function cleanList(s: string): string {
    return s ? s.replace(/<br\s*\/?>/gi, ',').replace(/\s+/g, '').trim() : '';
}

function parseDay(dayStr: string): string {
    if (!dayStr) return '';

    const dayMap: Record<string, string> = {
        'pazartesi': 'Monday', 'monday': 'Monday',
        'salı': 'Tuesday', 'sali': 'Tuesday', 'tuesday': 'Tuesday',
        'çarşamba': 'Wednesday', 'carsamba': 'Wednesday', 'wednesday': 'Wednesday',
        'perşembe': 'Thursday', 'persembe': 'Thursday', 'thursday': 'Thursday',
        'cuma': 'Friday', 'friday': 'Friday',
        'cumartesi': 'Saturday', 'saturday': 'Saturday',
        'pazar': 'Sunday', 'sunday': 'Sunday'
    };

    // Split by comma to handle multiple days (from br-separated HTML)
    const parts = dayStr.split(',').map(s => s.trim().toLowerCase());
    const result = new Set<string>();

    for (const part of parts) {
        const mapped = dayMap[part];
        if (mapped) {
            result.add(mapped);
        }
    }

    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return Array.from(result).sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(',');
}

// Fetch helpers
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ...options?.headers
                }
            });
            if (response.ok) return response;
        } catch (e) {
            if (i === retries - 1) throw e;
            await sleep(1000 * (i + 1));
        }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Core scraping functions
async function getTerm(): Promise<string> {
    console.log('Fetching current term...');
    const response = await fetchWithRetry(`${BASE_URL}/public/DersProgram`);
    const html = await response.text();
    const root = parseHTML(html);
    const termElement = root.querySelector('#baslik1');
    const term = termElement?.textContent?.trim() || 'Unknown Term';
    console.log(`  Term: ${term}`);
    return term;
}

async function getCourseCodes(levelCode: string): Promise<CourseCode[]> {
    const response = await fetchWithRetry(`${COURSE_CODES_URL}?programSeviyeTipiAnahtari=${levelCode}`);
    const data = await response.json() as Array<{ bransKoduId: number; dersBransKodu: string }>;

    return data
        .filter(item => item.bransKoduId && item.dersBransKodu)
        .map(item => ({
            id: String(item.bransKoduId),
            code: item.dersBransKodu
        }));
}

function parseTable(html: string): CourseData[] | null {
    const root = parseHTML(html);
    // The table may be inside a div with same id, find the actual table
    const container = root.querySelector('#dersProgramContainer');
    if (!container) return null;

    // Find the table (could be the container itself or a child table)
    const table = container.tagName === 'TABLE' ? container : container.querySelector('table');
    if (!table) return null;

    const rows = table.querySelectorAll('tbody tr');
    const courses: CourseData[] = [];

    for (const tr of rows) {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 15) continue;

        // Get text content, handling <br> tags as comma separators
        const getText = (idx: number): string => {
            const td = tds[idx];
            // Replace <br> tags with commas before getting text
            const htmlWithCommas = td.innerHTML.replace(/<br\s*\/?>/gi, ',');
            // Parse the modified HTML and get text content
            const text = parseHTML(htmlWithCommas).textContent?.trim() || '';
            return text || '-';
        };

        const crn = getText(0);
        const code = getText(1);
        if (!crn || crn === '-' || !code || code === '-') continue;

        // Day is already in English from ITU OBS (e.g., "Tuesday", "Monday")
        const rawDay = getText(6);
        const days = parseDay(rawDay);

        // Time format from ITU: "08:30/11:29" - keep as-is
        const times = getText(7);

        courses.push({
            crn,
            code,
            title: cleanText(getText(2)),
            teachingMethod: cleanText(getText(3)),
            instructor: cleanText(getText(4)),
            building: getText(5),
            days,
            times,
            rooms: getText(8),
            capacity: getText(9),
            enrolled: getText(10),
            reservation: getText(11),
            majorRestriction: cleanText(getText(12)),
            prerequisites: cleanText(getText(13)),
            creditConstraint: cleanText(getText(14)),
            level: '' // Will be set by caller
        });
    }

    return courses.length > 0 ? courses : null;
}

async function scrapeLevel(levelName: string, levelCode: string): Promise<CourseData[]> {
    console.log(`\n== ${levelName.toUpperCase()} ==`);

    const codes = await getCourseCodes(levelCode);
    console.log(`[•] Found ${codes.length} course codes`);

    const allCourses: CourseData[] = [];

    for (const { id, code } of codes) {
        try {
            const url = `${SCHEDULE_URL}?programSeviyeTipiAnahtari=${levelCode}&dersBransKoduId=${id}`;
            const response = await fetchWithRetry(url);
            const html = await response.text();
            const courses = parseTable(html);

            if (courses) {
                // Set level for all courses
                for (const course of courses) {
                    course.level = levelName;
                }
                allCourses.push(...courses);
                console.log(`[✓] ${code}: ${courses.length} courses`);
            } else {
                console.log(`[ ] ${code}: no data`);
            }

            await sleep(300); // Rate limiting
        } catch (e) {
            console.error(`[!] ${code}: ${e instanceof Error ? e.message : e}`);
        }
    }

    return allCourses;
}

async function seedDatabase(termName: string, courses: CourseData[], dryRun: boolean): Promise<void> {
    if (dryRun) {
        console.log(`\n[DRY RUN] Would seed ${courses.length} courses for term "${termName}"`);
        console.log('Sample courses:');
        courses.slice(0, 3).forEach(c => console.log(`  - ${c.code}: ${c.title}`));
        return;
    }

    console.log(`\nSeeding ${courses.length} courses to database...`);

    // Upsert term
    const term = await prisma.term.upsert({
        where: { name: termName },
        update: {},
        create: { name: termName }
    });

    // Delete existing courses for this term (fresh scrape)
    await prisma.course.deleteMany({
        where: { termId: term.id }
    });

    // Batch insert courses
    const batchSize = 100;
    for (let i = 0; i < courses.length; i += batchSize) {
        const batch = courses.slice(i, i + batchSize);
        await prisma.course.createMany({
            data: batch.map(c => ({
                termId: term.id,
                crn: c.crn,
                code: c.code,
                title: c.title,
                teachingMethod: c.teachingMethod,
                instructor: c.instructor,
                building: c.building,
                days: c.days,
                times: c.times,
                rooms: c.rooms,
                capacity: c.capacity,
                enrolled: c.enrolled,
                reservation: c.reservation,
                majorRestriction: c.majorRestriction,
                prerequisites: c.prerequisites,
                creditConstraint: c.creditConstraint,
                level: c.level
            }))
        });
        console.log(`  Inserted ${Math.min(i + batchSize, courses.length)}/${courses.length}`);
    }

    console.log(`✓ Successfully seeded ${courses.length} courses for "${termName}"`);
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    if (dryRun) {
        console.log('=== DRY RUN MODE ===\n');
    }

    console.log('ITU Schedule Scraper\n');
    console.log(`Started at: ${new Date().toISOString()}`);

    try {
        const termName = await getTerm();
        const allCourses: CourseData[] = [];

        for (const [levelName, levelCode] of Object.entries(LEVELS)) {
            const courses = await scrapeLevel(levelName, levelCode);
            allCourses.push(...courses);
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Total courses scraped: ${allCourses.length}`);

        await seedDatabase(termName, allCourses, dryRun);

    } catch (e) {
        console.error('Scraping failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }

    console.log(`\nCompleted at: ${new Date().toISOString()}`);
}

main();


import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

const ARCHIVE_DIR = path.resolve(__dirname, '../../itu-schedule-archive (old)/Archive');

function parseTime(timeStr: string): string {
    return timeStr ? timeStr.trim() : '';
}

function parseDay(dayStr: string): string {
    if (!dayStr) return '';

    // keys: lowercase search term, value: English output
    const dayMap: { [key: string]: string } = {
        'pazartesi': 'Monday',
        'monday': 'Monday',
        'mon': 'Monday',
        'salı': 'Tuesday',
        'sali': 'Tuesday', // non-turkish char fallback
        'tuesday': 'Tuesday',
        'tue': 'Tuesday',
        'çarşamba': 'Wednesday',
        'carsamba': 'Wednesday',
        'wednesday': 'Wednesday',
        'wed': 'Wednesday',
        'perşembe': 'Thursday',
        'persembe': 'Thursday',
        'thursday': 'Thursday',
        'thu': 'Thursday',
        'cuma': 'Friday',
        'friday': 'Friday',
        'fri': 'Friday',
        'cumartesi': 'Saturday',
        'saturday': 'Saturday',
        'sat': 'Saturday',
        'pazar': 'Sunday',
        'sunday': 'Sunday',
        'sun': 'Sunday'
    };

    const lowerStr = dayStr.toLowerCase();
    const result: Set<string> = new Set();

    // Check availability of each day in the string
    for (const [key, value] of Object.entries(dayMap)) {
        if (lowerStr.includes(key)) {
            result.add(value);
        }
    }

    // Sort days correctly
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return Array.from(result).sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(',');
}

async function main() {
    console.log(`Scanning archive directory: ${ARCHIVE_DIR}`);

    // Clean up existing data
    console.log('Cleaning up existing data...');
    try {
        await prisma.course.deleteMany();
        await prisma.term.deleteMany();
    } catch (e: any) {
        console.warn('Cleanup warning:', e.message);
    }

    if (!fs.existsSync(ARCHIVE_DIR)) {
        console.error('Archive directory not found!');
        return;
    }

    const terms = fs.readdirSync(ARCHIVE_DIR).filter(f => {
        try {
            return fs.statSync(path.join(ARCHIVE_DIR, f)).isDirectory();
        } catch (e) { return false; }
    });

    for (const termName of terms) {
        try {
            console.log(`Processing term: ${termName}`);

            const term = await prisma.term.upsert({
                where: { name: termName },
                update: {},
                create: { name: termName }
            });

            const termPath = path.join(ARCHIVE_DIR, termName);
            const dates = fs.readdirSync(termPath).filter(f => {
                try {
                    return fs.statSync(path.join(termPath, f)).isDirectory();
                } catch (e) { return false; }
            });

            dates.sort();
            const latestDate = dates[dates.length - 1];
            if (!latestDate) continue;

            console.log(`  Using scrape date: ${latestDate}`);
            const datePath = path.join(termPath, latestDate);

            const levels = fs.readdirSync(datePath).filter(f => {
                try {
                    return fs.statSync(path.join(datePath, f)).isDirectory();
                } catch (e) { return false; }
            });

            for (const level of levels) {
                console.log(`    Processing level: ${level}`);
                const levelPath = path.join(datePath, level);
                const files = fs.readdirSync(levelPath).filter(f => f.endsWith('.csv'));

                for (const file of files) {
                    try {
                        const filePath = path.join(levelPath, file);
                        const content = fs.readFileSync(filePath, 'utf-8');
                        // Parse the entire file content at once using csv-parse
                        const records = parse(content, {
                            columns: true,
                            skip_empty_lines: true,
                            trim: true,
                            relax_quotes: true,
                        });

                        const coursesToCreate = records.map((record: any) => {
                            const crn = record['CRN'];
                            const code = record['Course Code'];

                            if (!crn || !code) return null;

                            // Helper to clean HTML breaks and weird chars
                            const cleanText = (s: string) => s ? s.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() : '';
                            // For days/times, <br> usually implies a list separator
                            const cleanList = (s: string) => s ? s.replace(/<br\s*\/?>/gi, ',').replace(/\s+/g, '').trim() : '';

                            return {
                                termId: term.id,
                                crn: crn,
                                code: code,
                                title: cleanText(record['Course Title']),
                                teachingMethod: cleanText(record['Teaching Method']),
                                instructor: cleanText(record['Instructor']),
                                building: cleanList(record['Building']),
                                days: parseDay(cleanList(record['Day'])),
                                times: cleanList(record['Time']),
                                rooms: cleanList(record['Room']),
                                capacity: record['Capacity'],
                                enrolled: record['Enrolled'],
                                reservation: record['Reservation'],
                                majorRestriction: cleanText(record['Major Restriction']),
                                prerequisites: cleanText(record['Prerequisites']),
                                creditConstraint: cleanText(record['Credit/Class Resc.']) || '',
                                level: level
                            };
                        }).filter((c): c is NonNullable<typeof c> => c !== null);

                        if (coursesToCreate.length > 0) {
                            await prisma.course.createMany({
                                data: coursesToCreate
                            });
                        }

                    } catch (e: any) {
                        console.error(`Error processing file ${file}:`, e.message);
                    }
                }
            }
        } catch (e: any) {
            console.error(`Error processing term ${termName}:`, e.message);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

// Fast batch migration script using Turso's batch API
// Run with: npx tsx scripts/migrate-to-turso.ts

import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';

const TURSO_URL = 'libsql://itu-schedule-archive-samuellchang.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njg2NjA1OTQsImlkIjoiY2U3NjY0MzUtYjZlNi00Yjg1LThjODQtYTIyYjZmMjQxMjA5IiwicmlkIjoiNjdlYmI2ZTgtMjY5OC00MjYxLWFkNGUtN2Y2YWVkNDBjMDIxIn0.zLiHs9lxqKh2a54hHK2vTEFRxpISjKyqg1Z6QZaQ9bKK8e7MWBr9HTa-9Wo-7VJblrSjTOOpu1iG5WPy5UhlCw';

async function migrate() {
    console.log('Starting FAST migration from local SQLite to Turso...');
    const startTime = Date.now();

    // Connect to local SQLite
    const localDb = new Database('./prisma/dev.db');

    // Connect to Turso
    const turso = createClient({
        url: TURSO_URL,
        authToken: TURSO_AUTH_TOKEN,
    });

    try {
        // Drop existing tables first (clean slate)
        console.log('Dropping existing tables...');
        await turso.execute('DROP TABLE IF EXISTS Course');
        await turso.execute('DROP TABLE IF EXISTS Term');

        // Create tables in Turso
        console.log('Creating tables in Turso...');

        await turso.execute(`
            CREATE TABLE IF NOT EXISTS Term (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await turso.execute(`
            CREATE TABLE IF NOT EXISTS Course (
                id TEXT PRIMARY KEY,
                crn TEXT NOT NULL,
                code TEXT NOT NULL,
                title TEXT NOT NULL,
                level TEXT,
                teachingMethod TEXT,
                instructor TEXT,
                building TEXT,
                days TEXT,
                times TEXT,
                rooms TEXT,
                capacity TEXT,
                enrolled TEXT,
                reservation TEXT,
                majorRestriction TEXT,
                prerequisites TEXT,
                creditConstraint TEXT,
                termId TEXT NOT NULL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (termId) REFERENCES Term(id)
            )
        `);

        // Migrate terms
        console.log('Migrating terms...');
        const terms = localDb.prepare('SELECT * FROM Term').all() as any[];

        // Use batch for terms
        const termStatements = terms.map(term => ({
            sql: 'INSERT INTO Term (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
            args: [term.id, term.name, term.createdAt, term.updatedAt]
        }));

        await turso.batch(termStatements, 'write');
        console.log(`✅ Migrated ${terms.length} terms`);

        // Migrate courses in large batches
        console.log('Reading courses from local database...');
        const courses = localDb.prepare('SELECT * FROM Course').all() as any[];
        console.log(`Found ${courses.length} courses to migrate`);

        const BATCH_SIZE = 500; // Turso supports large batches
        const totalBatches = Math.ceil(courses.length / BATCH_SIZE);

        for (let i = 0; i < courses.length; i += BATCH_SIZE) {
            const batch = courses.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;

            const statements = batch.map(course => ({
                sql: `INSERT INTO Course 
                    (id, crn, code, title, level, teachingMethod, instructor, building, days, times, rooms, capacity, enrolled, reservation, majorRestriction, prerequisites, creditConstraint, termId, createdAt, updatedAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    course.id, course.crn, course.code, course.title, course.level,
                    course.teachingMethod, course.instructor, course.building, course.days,
                    course.times, course.rooms, course.capacity, course.enrolled,
                    course.reservation, course.majorRestriction, course.prerequisites,
                    course.creditConstraint, course.termId, course.createdAt, course.updatedAt
                ]
            }));

            await turso.batch(statements, 'write');
            console.log(`📦 Batch ${batchNum}/${totalBatches} - Migrated ${Math.min(i + BATCH_SIZE, courses.length)}/${courses.length} courses`);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n🎉 Migration completed in ${elapsed} seconds!`);

        // Verify
        const termCount = await turso.execute('SELECT COUNT(*) as count FROM Term');
        const courseCount = await turso.execute('SELECT COUNT(*) as count FROM Course');
        console.log(`✅ Turso now has ${termCount.rows[0].count} terms and ${courseCount.rows[0].count} courses`);

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        localDb.close();
    }
}

migrate();

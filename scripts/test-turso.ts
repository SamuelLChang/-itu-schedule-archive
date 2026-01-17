// Test script to verify Turso connection
// Run with: npx tsx scripts/test-turso.ts

import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://itu-schedule-archive-samuellchang.aws-eu-west-1.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njg2NjA1OTQsImlkIjoiY2U3NjY0MzUtYjZlNi00Yjg1LThjODQtYTIyYjZmMjQxMjA5IiwicmlkIjoiNjdlYmI2ZTgtMjY5OC00MjYxLWFkNGUtN2Y2YWVkNDBjMDIxIn0.zLiHs9lxqKh2a54hHK2vTEFRxpISjKyqg1Z6QZaQ9bKK8e7MWBr9HTa-9Wo-7VJblrSjTOOpu1iG5WPy5UhlCw';

async function testConnection() {
    console.log('Testing Turso connection...');
    console.log('URL:', TURSO_URL);

    const client = createClient({
        url: TURSO_URL,
        authToken: TURSO_AUTH_TOKEN,
    });

    try {
        // Test 1: Basic query
        console.log('\n1. Testing basic connection...');
        const result = await client.execute('SELECT 1 as test');
        console.log('   ✅ Connection works:', result.rows);

        // Test 2: Check if tables exist
        console.log('\n2. Checking tables...');
        const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('   Tables:', tables.rows.map(r => r.name));

        // Test 3: Count terms
        console.log('\n3. Counting terms...');
        const termCount = await client.execute('SELECT COUNT(*) as count FROM Term');
        console.log('   ✅ Terms in database:', termCount.rows[0].count);

        // Test 4: Count courses
        console.log('\n4. Counting courses...');
        const courseCount = await client.execute('SELECT COUNT(*) as count FROM Course');
        console.log('   ✅ Courses in database:', courseCount.rows[0].count);

        // Test 5: Sample term
        console.log('\n5. Sample term...');
        const sampleTerm = await client.execute('SELECT * FROM Term LIMIT 1');
        console.log('   Sample term:', sampleTerm.rows[0]);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testConnection();

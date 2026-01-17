
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const level = searchParams.get('level');

    if (!termId) {
        return NextResponse.json({ error: 'Term ID is required' }, { status: 400 });
    }

    try {
        // Logic: Extract "BLG" from "BLG 102E" ?
        // The user said "course code". In the old site, you select "BLG", then see "BLG 101", "BLG 102"...
        // Wait, the user said "course code" -> "Table".
        // Usually "Course Code" means "BLG 102E". "Subject" means "BLG".

        // Let's assume the user wants to see a list of Codes (e.g. BLG 102E, MAT 101) to click one and see the sections/CRNs table.
        // OR they select Subject (BLG) and see all BLG courses?
        // "Simple by selecting term, graduate level, and course code".
        // Let's implement getting distinct codes ("BLG 102E").

        /*
          However, listing ALL codes might be too many (thousands).
          Maybe we should group by Subject first?
          Let's look at the old site behavior if possible?
          "Archive/Term/Level/Course.csv" -> The file name is "BLG.csv".
          So "BLG" is the Subject/Department.
          Inside "BLG.csv" are "BLG 101E", "BLG 102E".
          
          So the hierarchy is: Term -> Level -> Subject (File name) -> [Table of all courses in that subject] OR [List of codes].
          
          The user said "Table mode by simply selecting term, level, and course code".
          This sounds like selecting "BLG 102E" specifically.
          
          But standard efficient way is Term -> Level -> Subject -> (Optional: Course) -> Table.
          
          Given the file structure "BLG.csv", it seems "Course Code" in the user's mind might mean "Subject" (BLG).
          If I click "BLG", I likely want to see ALL BLG courses in a table?
          
          Let's enable fetching distinct Subjects.
          Since we stored code as "BLG 102E", we need to substring.
          BUT, we migrated data from "BLG.csv". We have the `code` column.
          
          Wait, in seed.ts:
          `const files = fs.readdirSync(levelPath).filter(f => f.endsWith('.csv'));`
          Loop `file` of `files`. `file` is `BLG.csv`.
          
          We didn't store the "Subject" (BLG) explicitly in the DB! We only stored `code` ("BLG 102E").
          We can derive Subject from Code (split by space).
          
          Or better: We can fetch all distinct codes, then client side group them?
          Or use SQLite substring?
          
          Let's try to just return all unique codes first. If it's too slow, we optimize.
          Actually, `Course` table might have 5000 rows. unique codes maybe 800.
          Fetching 800 strings is nothing.
        */

        const courses = await prisma.course.findMany({
            where: {
                termId: termId,
                level: level || undefined
            },
            select: {
                code: true
            },
            distinct: ['code'],
            orderBy: {
                code: 'asc'
            }
        });

        const codes = courses.map(c => c.code);

        return NextResponse.json(codes);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }
}

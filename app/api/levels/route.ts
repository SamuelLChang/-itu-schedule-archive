
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    if (!termId) {
        return NextResponse.json({ error: 'Term ID is required' }, { status: 400 });
    }

    try {
        // SQLite doesn't support distinct on a column directly in findMany with just 'select' easily in Prisma < 5.something without some tricks or groupBy.
        // groupBy is the way.
        const levels = await prisma.course.groupBy({
            by: ['level'],
            where: {
                termId: termId
            },
            orderBy: {
                level: 'asc'
            }
        });

        // levels = [{ level: 'undergraduate' }, { level: 'graduate' }]
        // Filter out nulls
        const levelNames = levels.map(l => l.level).filter(Boolean);

        return NextResponse.json(levelNames);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch levels' }, { status: 500 });
    }
}

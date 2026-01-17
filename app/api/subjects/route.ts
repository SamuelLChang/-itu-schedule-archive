
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
        // optimize: select distinct code
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

        // Extract subjects: "BLG 101E" -> "BLG"
        // "MAT 102" -> "MAT"
        // Handle edge cases?
        const subjects = new Set<string>();

        courses.forEach(c => {
            const parts = c.code.trim().split(' ');
            if (parts.length > 0) {
                subjects.add(parts[0]);
            }
        });

        return NextResponse.json(Array.from(subjects).sort());
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }
}

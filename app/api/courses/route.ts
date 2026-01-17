
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const query = searchParams.get('q');
    const level = searchParams.get('level');
    const code = searchParams.get('code');

    if (!termId) {
        return NextResponse.json({ error: 'Term ID is required' }, { status: 400 });
    }

    try {
        const where: any = {
            termId: termId
        };

        const searchField = searchParams.get('searchField');

        if (code) {
            where.code = code;
        } else if (query) {
            if (searchField === 'code') {
                where.code = { contains: query };
            } else {
                where.OR = [
                    { code: { contains: query } },
                    { title: { contains: query } },
                    { instructor: { contains: query } }
                ];
            }
        }

        if (level) {
            where.level = level;
        }

        const subject = searchParams.get('subject');
        if (subject) {
            where.code = { startsWith: subject + ' ' }; // strict prefix with space: "MAT " matches "MAT 103" but not "MATM"
        }

        const courses = await prisma.course.findMany({
            where
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
}

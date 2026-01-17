
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const codesParam = searchParams.get('codes');

    if (!termId || !codesParam) {
        return NextResponse.json({ error: 'Missing termId or codes' }, { status: 400 });
    }

    const codes = codesParam.split(',').map(c => c.trim());

    try {
        const courses = await prisma.course.findMany({
            where: {
                termId: termId,
                code: {
                    in: codes
                }
            }
            // We should select all necessary fields for scheduling
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.error('Error fetching course sections:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Custom sort function for terms: Yaz → Bahar → Güz order within each year
function sortTerms(terms: any[]) {
    const seasonOrder: Record<string, number> = {
        'Yaz': 0,    // Summer first
        'Bahar': 1,  // Spring second
        'Güz': 2,    // Fall third
        'Guz': 2,    // Alternative spelling
    };

    return terms.sort((a, b) => {
        // Extract year range and season from name like "2025-2026_Yaz_Dönemi_Ders_Programları"
        const yearMatchA = a.name.match(/(\d{4})-(\d{4})/);
        const yearMatchB = b.name.match(/(\d{4})-(\d{4})/);

        const yearA = yearMatchA ? parseInt(yearMatchA[2]) : 0;
        const yearB = yearMatchB ? parseInt(yearMatchB[2]) : 0;

        // Sort by year descending first (newest years first)
        if (yearB !== yearA) {
            return yearB - yearA;
        }

        // Within the same year, sort by season (Yaz → Bahar → Güz)
        const seasonA = Object.keys(seasonOrder).find(s => a.name.includes(s)) || '';
        const seasonB = Object.keys(seasonOrder).find(s => b.name.includes(s)) || '';

        const orderA = seasonOrder[seasonA] ?? 99;
        const orderB = seasonOrder[seasonB] ?? 99;

        return orderA - orderB;
    });
}

export async function GET() {
    try {
        const terms = await prisma.term.findMany({
            include: {
                _count: {
                    select: { courses: true }
                }
            }
        });

        // Apply custom sorting
        const sortedTerms = sortTerms(terms);

        return NextResponse.json(sortedTerms);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
    }
}

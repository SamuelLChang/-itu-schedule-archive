
import { PrismaClient } from '@prisma/client';
import CourseHierarchy from '@/components/CourseHierarchy';
import ArchiveHelp from '@/components/archive/ArchiveHelp';

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
        // Extract year range from name like "2025-2026_Yaz_Dönemi_Ders_Programları"
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

async function getTerms() {
    const terms = await prisma.term.findMany({
        include: {
            _count: {
                select: { courses: true }
            }
        }
    });
    return sortTerms(terms);
}

export default async function ArchivePage() {
    const terms = await getTerms();

    return (
        <div className="min-h-screen bg-[#F5F5F7] animate-in fade-in duration-500">
            {/* Header / Nav Area */}
            <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
                                Course <span className="text-blue-600">Archive.</span>
                            </h1>
                            <ArchiveHelp />
                        </div>
                        <p className="mt-4 text-lg text-slate-500 max-w-2xl font-light leading-relaxed">
                            Browse through thousands of courses from past semesters. Data is sourced directly from ITU's public records.
                        </p>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 pb-24">
                <CourseHierarchy termId={terms[0]?.id} terms={terms} />
            </main>
        </div>
    );
}

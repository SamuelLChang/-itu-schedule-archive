
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CourseHierarchy from './CourseHierarchy';
import { useSchedule } from '@/context/ScheduleContext';

export default function CourseBrowser({ termId, termName }: { termId: string, termName: string }) {
    const { selectedCourses } = useSchedule();

    return (
        <div className="min-h-screen bg-white text-slate-800 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header with Cart Indicator */}
                <div className="flex flex-col gap-4 pb-6 border-b border-slate-200">
                    <div className="flex justify-between items-start">
                        <Link href="/archive" className="flex items-center text-slate-500 hover:text-blue-600 gap-2 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Terms
                        </Link>

                        {/* Simple Cart Preview */}
                        {selectedCourses.length > 0 && (
                            <Link href="/calendar" className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-bold animate-in fade-in hover:bg-blue-700 transition">
                                {selectedCourses.length} in Schedule
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold font-display text-slate-900">
                                {termName.replace(/_/g, ' ')}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Content - STRICT LEGACY FLOW */}
                <CourseHierarchy termId={termId} />
            </div>
        </div>
    );
}

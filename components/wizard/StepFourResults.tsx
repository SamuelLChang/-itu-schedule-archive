'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WizardState } from './Wizard';
import { generateSchedules, calculateMatchRate, Course, SelectiveGroup } from '@/lib/scheduler';
import { CheckCircle, AlertTriangle, Calendar, RefreshCcw, ChevronDown, ChevronUp, X, Layers, Download, FileText } from 'lucide-react';
import Timetable from '@/components/Timetable';
import { exportToImage, exportToPDF, exportSelections, generateFilename, ITUSchedData } from '@/lib/exportUtils';

export default function StepFourResults({ data }: { data: WizardState }) {
    const [schedules, setSchedules] = useState<{ courses: Course[], match: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedIds, setExpandedIds] = useState<number[]>([]);
    const [exporting, setExporting] = useState(false);
    const timetableRef = useRef<HTMLDivElement>(null);

    const toggleExpand = (idx: number) => {
        setExpandedIds(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    };

    // Export wizard configuration
    const handleExportConfig = () => {
        const wizardState: ITUSchedData['wizardState'] = {
            termId: data.termId,
            mustCourses: data.mustCourses,
            selectiveGroups: data.selectiveGroups,
            constraints: data.constraints
        };

        exportSelections([], 'wizard', 'wizard_config', data.termId, wizardState);
    };

    // Export individual schedule as image
    const handleExportSchedule = async (sched: { courses: Course[], match: number }, format: 'png' | 'pdf') => {
        // No need for timetableRef check anymore

        setExporting(true);
        try {
            const filename = generateFilename(sched.courses, 'schedule');
            const metadata: ITUSchedData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                type: 'calendar',
                termId: data.termId,
                courses: sched.courses,
                wizardState: {
                    termId: data.termId,
                    mustCourses: data.mustCourses,
                    selectiveGroups: data.selectiveGroups,
                    constraints: data.constraints
                }
            };

            if (format === 'pdf') {
                await exportToPDF(sched.courses, filename, metadata);
            } else {
                await exportToImage(sched.courses, format, filename, metadata);
            }
        } catch (e) {
            console.error('Export failed', e);
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const generate = async () => {
            setLoading(true);
            try {
                // 1. Collect ALL codes
                const allCodes = new Set<string>([
                    ...data.mustCourses,
                    ...data.selectiveGroups.flatMap(g => g.courses)
                ]);

                if (allCodes.size === 0) {
                    setLoading(false);
                    return;
                }

                // 2. Fetch sections for ALL codes
                const codesParam = Array.from(allCodes).join(',');
                const res = await fetch(`/api/courses/sections?termId=${data.termId}&codes=${encodeURIComponent(codesParam)}`);
                if (!res.ok) throw new Error('Failed to fetch course sections');
                const allSections: Course[] = await res.json();

                // 3. Group sections by Code
                const sectionsByCode: Record<string, Course[]> = {};
                for (const section of allSections) {
                    if (!sectionsByCode[section.code]) sectionsByCode[section.code] = [];
                    sectionsByCode[section.code].push(section);
                }

                // 4. Prepare inputs for generator
                const mustInput = data.mustCourses
                    .map(code => sectionsByCode[code] || [])
                    .filter(list => list.length > 0);

                // Selective Groups
                const selectiveInput: SelectiveGroup[] = data.selectiveGroups.map(g => ({
                    id: g.id,
                    name: g.name,
                    required: g.required,
                    options: g.courses.map(code => sectionsByCode[code] || []).filter(list => list.length > 0)
                }));

                // 5. Run generation
                await new Promise(r => setTimeout(r, 100));
                const rated = generateSchedules(mustInput, selectiveInput, data.constraints);

                setSchedules(rated);
            } catch (e: any) {
                console.error(e);
                setError(e.message || 'An error occurred while generating schedules.');
            } finally {
                setLoading(false);
            }
        };

        generate();
    }, [data]);

    // --- Actions ---
    const [selectedSchedule, setSelectedSchedule] = useState<{ courses: Course[], match: number } | null>(null);

    // --- Render ---

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCcw className="w-8 h-8 text-blue-500 animate-pulse" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold mt-8 text-slate-900">Generating Schedules</h2>
                <p className="text-slate-500 mt-2">Analyzing combinations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-10">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
                <p className="text-slate-500">{error}</p>
            </div>
        );
    }

    if (schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-10">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">No Valid Schedules Found</h2>
                <p className="text-slate-500 max-w-md">
                    We couldn't find any combination that satisfies all requirements.
                    Try reducing constraints or changing "Must" courses to "Selective".
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Generated Schedules</h2>
                    <p className="text-slate-500">Found {schedules.length} valid combinations</p>
                </div>
                <div className="flex items-center gap-3">
                    {schedules.length > 0 && (
                        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 text-sm font-bold flex items-center gap-2 shadow-sm">
                            <CheckCircle className="w-4 h-4" />
                            Top Match: {schedules[0].match}%
                        </div>
                    )}
                    <button
                        onClick={handleExportConfig}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                    >
                        <FileText className="w-4 h-4" />
                        Export Wizard Config
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
                {schedules.map((sched, idx) => (
                    <div key={idx} className="bg-white/70 backdrop-blur-sm border text-slate-900 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 border-white/60 hover:bg-white/90 flex flex-col group">
                        {/* Card Header */}
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-white/50 text-slate-500 text-xs font-mono px-2 py-1 rounded border border-white/60 backdrop-blur-sm">
                                    Option #{idx + 1}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-bold ${sched.match > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {sched.match}% Match
                                    </span>
                                </div>
                            </div>

                            {/* List Preview */}
                            <div className="space-y-2 mb-4">
                                {sched.courses.slice(0, 3).map(c => (
                                    <div key={c.crn} className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-800">{c.code}</span>
                                        <span className="text-slate-500 font-mono text-xs">{c.days} {c.times}</span>
                                    </div>
                                ))}
                                {sched.courses.length > 3 && (
                                    <div className="text-xs text-center text-slate-400 pt-1">
                                        + {sched.courses.length - 3} more courses
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="p-4 bg-white/40 border-t border-white/50 backdrop-blur-sm">
                            <button
                                onClick={() => setSelectedSchedule(sched)}
                                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                View Timetable
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Portal */}
            {selectedSchedule && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedSchedule(null)} />

                    <div className="relative w-full max-w-6xl h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/20">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between bg-white/50 shrink-0 backdrop-blur-md">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Schedule Details</h2>
                                <p className="text-sm text-slate-500">
                                    {selectedSchedule.courses.length} Courses • {selectedSchedule.match}% Match
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleExportSchedule(selectedSchedule, 'png')}
                                    disabled={exporting}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    PNG
                                </button>
                                <button
                                    onClick={() => handleExportSchedule(selectedSchedule, 'pdf')}
                                    disabled={exporting}
                                    className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    PDF
                                </button>
                                <button
                                    onClick={() => setSelectedSchedule(null)}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white/30">
                            {/* Left: Course List */}
                            <div className="w-full lg:w-1/3 border-r border-blue-50 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-white/40">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-600" />
                                    Course List
                                </h3>
                                {selectedSchedule.courses.map(c => (
                                    <div key={c.crn} className="bg-white/80 p-4 rounded-xl border border-white/60 shadow-sm hover:border-blue-300 transition-all backdrop-blur-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-blue-700">{c.code}</span>
                                            <span className="text-xs font-mono text-slate-400">{c.crn}</span>
                                        </div>
                                        <h4 className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">{c.title}</h4>
                                        <div className="text-xs text-slate-500 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-4 text-center">👨‍🏫</span>
                                                {c.instructor}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-4 text-center">📍</span>
                                                {c.building || 'Unknown'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-4 text-center">⏰</span>
                                                {c.days} {c.times}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Right: Timetable (with ref for export) */}
                            <div className="w-full lg:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-white/60">
                                <div ref={timetableRef}>
                                    <Timetable courses={selectedSchedule.courses} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

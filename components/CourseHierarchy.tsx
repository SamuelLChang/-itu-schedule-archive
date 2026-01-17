'use client';

import { useRef, useState, useEffect } from 'react';
import { Filter, ChevronDown, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import CourseTable from './CourseTable';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ModernSelect from '@/components/ui/ModernSelect';

export default function CourseHierarchy({ termId: initialTermId, terms = [] }: { termId: string, terms?: any[] }) {
    const [loading, setLoading] = useState(false);

    // Parsing Logic
    const parsedTerms = terms.map(t => {
        const name = t.name.replace(/_/g, ' ');
        const match = name.match(/(\d{4}-\d{4})\s+(\S+)/);
        const rawSeason = match ? match[2] : name;

        const seasonMap: Record<string, string> = {
            'Yaz': 'Summer',
            'Bahar': 'Spring',
            'Güz': 'Fall',
            'Guz': 'Fall',
            'G': 'Fall'
        };

        return {
            id: t.id,
            year: match ? match[1] : 'Other',
            season: seasonMap[rawSeason] || rawSeason,
            originalName: name
        };
    });

    const uniqueYears = Array.from(new Set(parsedTerms.map(t => t.year))).sort().reverse();

    // Initial state derived from initialTermId
    const initialTerm = parsedTerms.find(t => t.id === initialTermId) || parsedTerms[0];

    const [selectedYear, setSelectedYear] = useState(initialTerm?.year || '');
    const [selectedSeason, setSelectedSeason] = useState(initialTerm?.season || '');

    // Derived seasons for the selected year
    const availableSeasons = parsedTerms
        .filter(t => t.year === selectedYear)
        .map(t => ({ label: t.season, value: t.season }));

    // Term State - Sync with Year/Season changes
    const [currentTermId, setCurrentTermId] = useState(initialTerm?.id || '');

    useEffect(() => {
        const term = parsedTerms.find(t => t.year === selectedYear && t.season === selectedSeason);
        if (term) {
            setCurrentTermId(term.id);
        } else if (availableSeasons.length > 0) {
            // Auto-select first season if current selection is invalid for new year
            setSelectedSeason(availableSeasons[0].value);
        }
    }, [selectedYear, selectedSeason]);


    // Level State
    const [levels, setLevels] = useState<string[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    // Subject State (Legacy: FIZ, MAT, BLG)
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');

    // Courses State
    const [courses, setCourses] = useState<any[]>([]);

    // 1. Fetch Levels (depends on currentTermId)
    useEffect(() => {
        async function fetchLevels() {
            try {
                const res = await fetch(`/api/levels?termId=${currentTermId}`);
                if (res.ok) setLevels(await res.json());
            } catch (e) {
                console.error(e);
            }
        }
        fetchLevels();
        // Reset selections when term changes
        setSelectedLevel('');
        setSelectedSubject('');
        setCourses([]);
    }, [currentTermId]);

    // 2. Fetch Subjects when Level Selected
    useEffect(() => {
        if (!selectedLevel) {
            setSubjects([]);
            return;
        }
        async function fetchSubjects() {
            try {
                const res = await fetch(`/api/subjects?termId=${currentTermId}&level=${selectedLevel}`);
                if (res.ok) setSubjects(await res.json());
            } catch (e) {
                console.error(e);
            }
        }
        fetchSubjects();
    }, [currentTermId, selectedLevel]);

    // 3. Fetch Courses when Subject Selected
    useEffect(() => {
        if (!selectedSubject || !selectedLevel) {
            setCourses([]);
            return;
        }
        async function fetchCourses() {
            setLoading(true);
            try {
                const res = await fetch(`/api/courses?termId=${currentTermId}&subject=${encodeURIComponent(selectedSubject)}&level=${selectedLevel}`);
                if (res.ok) setCourses(await res.json());
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        }
        fetchCourses();
    }, [currentTermId, selectedLevel, selectedSubject]);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">

            {/*  Filter Section (Bento Card) */}
            <ScrollReveal>
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative group z-50">
                    {/* Decorative background blob */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 p-8 sm:p-10">
                        <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100/50 flex items-center justify-center text-blue-600">
                                <Filter className="w-5 h-5" />
                            </div>
                            Browse Archive
                        </h3>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Step 1: Term (Split into Year & Season) */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider ml-1">1. Academic Term</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <ModernSelect
                                        label="Year"
                                        value={selectedYear}
                                        onChange={setSelectedYear}
                                        options={uniqueYears.map(y => ({ label: y, value: y }))}
                                        placeholder="Year"
                                    />
                                    <ModernSelect
                                        label="Semester"
                                        value={selectedSeason}
                                        onChange={setSelectedSeason}
                                        options={availableSeasons}
                                        placeholder="Select Semester"
                                        disabled={!selectedYear}
                                    />
                                </div>
                            </div>

                            {/* Step 2: Level */}
                            {/* ... (Existing Level Buttons - keeping them as buttons is fine/better than dropdown for < 3 items) */}
                            {/* Actually, user didn't ask to change Level buttons, but I'll make sure they fit. Level rendering logic below can stay as is. */}
                            <div className={`space-y-3 transition-opacity duration-300 ${!currentTermId ? 'opacity-40 pointer-events-none' : ''}`}>
                                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider ml-1">2. Course Level</label>
                                <div className="flex flex-wrap gap-2">
                                    {levels.length > 0 ? (
                                        levels.map((lvl: any) => (
                                            <button
                                                key={lvl}
                                                onClick={() => { setSelectedLevel(lvl as string); setSelectedSubject(''); }}
                                                className={`px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${selectedLevel === lvl
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-100'
                                                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white hover:shadow-md'
                                                    }`}
                                            >
                                                {String(lvl).replace(/_/g, ' ')}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-transparent"></div>
                                            Loading...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 3: Subject */}
                            <div className={`space-y-3 transition-opacity duration-300 ${!selectedLevel ? 'opacity-40 pointer-events-none' : ''}`}>
                                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider ml-1">3. Subject Code</label>
                                <ModernSelect
                                    value={selectedSubject}
                                    onChange={setSelectedSubject}
                                    options={subjects.map(s => ({ label: s, value: s }))}
                                    placeholder="Select Code"
                                    disabled={!selectedLevel}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            {/* Content Area */}
            {selectedSubject ? (
                <ScrollReveal delay={200}>
                    <div>
                        <div className="flex items-end justify-between mb-6 px-4">
                            <div>
                                <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">
                                    {selectedSubject}
                                </h2>
                                <p className="text-lg text-slate-500 font-medium">Found {courses.length} classes available</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
                                <div className="relative">
                                    <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-slate-100 border-t-blue-500"></div>
                                </div>
                                <p className="text-slate-400 mt-6 font-medium tracking-wide text-sm uppercase">Loading Courses...</p>
                            </div>
                        ) : (
                            <div className="mt-4">
                                <CourseTable courses={courses} />
                            </div>
                        )}
                    </div>
                </ScrollReveal>
            ) : (
                <ScrollReveal delay={200}>
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400 border-2 border-dashed border-slate-200/80 rounded-[2.5rem] bg-slate-50/50">
                        {selectedLevel ? (
                            <>
                                <div className="w-20 h-20 rounded-3xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center mb-6 ring-1 ring-slate-100">
                                    <BookOpen className="w-8 h-8 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold text-slate-700 mb-2">Ready to explore</p>
                                <p className="text-slate-500 font-medium max-w-xs text-center">Select a <span className="text-blue-600">Subject Code</span> above to view the full schedule.</p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-3xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center mb-6 ring-1 ring-slate-100">
                                    <Filter className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-2xl font-bold text-slate-700 mb-2">Start Browsing</p>
                                <p className="text-slate-500 font-medium max-w-xs text-center">Select a <span className="text-blue-600">Term and Level</span> to begin your search.</p>
                            </>
                        )}
                    </div>
                </ScrollReveal>
            )}
        </div>
    );
}

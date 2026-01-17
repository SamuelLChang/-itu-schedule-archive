'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Filter, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useSchedule, Course } from '@/context/ScheduleContext';
import ModernSelect from '@/components/ui/ModernSelect';

interface Term {
    id: string;
    name: string;
}

interface CourseSection extends Course {
    // extending Course from context which likely has { id, code, crn, title, instructor, days, times, building }
}

export default function CourseSelector() {
    const { addCourse, isCourseSelected } = useSchedule();

    // State
    const [terms, setTerms] = useState<any[]>([]); // Using any for parsed structure
    const [selectedTermId, setSelectedTermId] = useState<string>('');

    // Parsed Term State
    const [parsedTerms, setParsedTerms] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSeason, setSelectedSeason] = useState<string>('');

    const [levels, setLevels] = useState<string[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ code: string; title: string }[]>([]);
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);
    const [loadingTerms, setLoadingTerms] = useState(false);
    const [loadingLevels, setLoadingLevels] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingSections, setLoadingSections] = useState(false);

    // 1. Fetch Terms on Mount
    useEffect(() => {
        const fetchTerms = async () => {
            setLoadingTerms(true);
            try {
                const res = await fetch('/api/terms');
                if (res.ok) {
                    const data = await res.json();
                    setTerms(data);

                    // Parsing Logic
                    const parsed = data.map((t: any) => {
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
                        const season = seasonMap[rawSeason] || rawSeason;
                        const year = match ? match[1] : 'Other';

                        return {
                            id: t.id,
                            year,
                            season,
                            displayName: `${year} ${season}`,
                            originalName: name
                        };
                    });
                    setParsedTerms(parsed);

                    if (data.length > 0) {
                        const first = parsed[0];
                        setSelectedYear(first.year);
                        setSelectedSeason(first.season);
                        // selectedTermId will be set by the sync effect
                    }
                }
            } catch (e) {
                console.error('Failed to fetch terms', e);
            } finally {
                setLoadingTerms(false);
            }
        };
        fetchTerms();
    }, []);

    // Sync Year/Season to TermId
    useEffect(() => {
        const term = parsedTerms.find((t: any) => t.year === selectedYear && t.season === selectedSeason);
        if (term) {
            setSelectedTermId(term.id);
        } else if (selectedYear && parsedTerms.length > 0) {
            // Fallback: Use first available season for this year
            const firstSeasonForYear = parsedTerms.find((t: any) => t.year === selectedYear);
            if (firstSeasonForYear) {
                setSelectedSeason(firstSeasonForYear.season);
            }
        }
    }, [selectedYear, selectedSeason, parsedTerms]);

    // ... (keep fetchLevels useEffect and others)

    // 2. Fetch Levels when Term Changes
    useEffect(() => {
        if (!selectedTermId) return;

        const fetchLevels = async () => {
            setLoadingLevels(true);
            try {
                const res = await fetch(`/api/levels?termId=${selectedTermId}`);
                if (res.ok) {
                    const data = await res.json();
                    setLevels(data);
                    // Default to 'LS' (Lisans) if available, otherwise first item
                    if (data.includes('LS')) setSelectedLevel('LS');
                    else if (data.length > 0) setSelectedLevel(data[0]);
                    else setSelectedLevel('');
                } else {
                    setLevels([]);
                    setSelectedLevel('');
                }
            } catch (e) {
                console.error('Failed to fetch levels', e);
                setLevels([]);
            } finally {
                setLoadingLevels(false);
            }
        };
        fetchLevels();
    }, [selectedTermId]);

    // 3. Search Courses (Debounced)
    useEffect(() => {
        const handler = setTimeout(() => {
            if (query.trim().length >= 2 && selectedTermId) {
                searchCourses();
            } else if (query.trim().length === 0) {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [query, selectedTermId, selectedLevel]);

    const searchCourses = async () => {
        setLoadingSearch(true);
        try {
            // Reusing existing API with searchField=code and level
            const res = await fetch(`/api/courses?termId=${selectedTermId}&q=${query}&searchField=code&level=${selectedLevel}`);
            if (res.ok) {
                const data = await res.json();
                // Deduplicate by code
                const unique = new Map();
                data.forEach((c: any) => {
                    if (!unique.has(c.code)) {
                        unique.set(c.code, { code: c.code, title: c.title });
                    }
                });
                setSearchResults(Array.from(unique.values())); // Show all matching courses
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSearch(false);
        }
    };

    // 3. Fetch Sections for a Code
    const handleSelectCourse = async (code: string) => {
        if (selectedCourseCode === code) {
            setSelectedCourseCode(null); // Toggle off
            setSections([]);
            return;
        }

        setSelectedCourseCode(code);
        setLoadingSections(true);
        try {
            // Reusing sections API
            const res = await fetch(`/api/courses/sections?termId=${selectedTermId}&codes=${encodeURIComponent(code)}`);
            if (res.ok) {
                const data = await res.json();
                setSections(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSections(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
            {/* Header / Selectors */}
            <div className="p-5 border-b border-slate-100 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Plus className="w-5 h-5" />
                    </div>
                    Add Courses
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    {/* Term Selector */}
                    <ModernSelect
                        label="Term"
                        value={selectedTermId}
                        onChange={(val) => setSelectedTermId(val)}
                        options={parsedTerms.map(t => ({ label: t.displayName, value: t.id }))}
                        placeholder="Select Term"
                        disabled={loadingTerms}
                    />

                    {/* Level Selector */}
                    <ModernSelect
                        label="Level"
                        value={selectedLevel}
                        onChange={(val) => setSelectedLevel(val)}
                        options={[
                            { label: 'All Levels', value: '' },
                            ...levels.map(l => ({ label: l, value: l }))
                        ]}
                        placeholder="Select Level"
                        disabled={loadingLevels || levels.length === 0}
                    />
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search (e.g. MAT 103)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-slate-100/50 border border-slate-200/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                    />
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    {loadingSearch && <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-blue-500 animate-spin" />}
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {/* Course List */}
                {!selectedCourseCode && searchResults.map(course => (
                    <button
                        key={course.code}
                        onClick={() => handleSelectCourse(course.code)}
                        className="w-full text-left p-3.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all group relative overflow-hidden"
                    >
                        <div className="font-bold text-slate-800 text-sm flex justify-between items-center relative z-10">
                            {course.code}
                            <span className="text-blue-600 opacity-0 group-hover:opacity-100 text-[10px] font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full transition-all transform translate-x-2 group-hover:translate-x-0">Sections</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5 relative z-10 font-medium">{course.title}</div>
                    </button>
                ))}

                {/* Section List (Drill Down) */}
                {selectedCourseCode && (
                    <div className="space-y-3 p-1 animate-in slide-in-from-right-4 duration-300">
                        <button
                            onClick={() => setSelectedCourseCode(null)}
                            className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2 font-bold uppercase tracking-wide px-1"
                        >
                            &larr; Back to results
                        </button>

                        <div className="flex items-center justify-between px-1">
                            <h4 className="font-extrabold text-slate-900 text-lg">{selectedCourseCode}</h4>
                            {loadingSections && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                        </div>

                        {sections.map(section => {
                            const selected = isCourseSelected(section.id);
                            return (
                                <div key={section.id} className={`p-3.5 rounded-2xl border text-sm transition-all duration-200 ${selected ? 'bg-blue-50/80 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg font-medium">CRN: {section.crn}</span>
                                        <button
                                            onClick={() => !selected && addCourse(section)}
                                            disabled={selected}
                                            className={`p-2 rounded-lg text-xs font-bold transition-all ${selected
                                                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                                : 'bg-slate-900 text-white hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20'
                                                }`}
                                        >
                                            {selected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="text-slate-800 font-semibold truncate mb-1">{section.instructor}</div>
                                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 font-medium opacity-80">
                                        <span>{section.days}</span>
                                        <span>{section.times}</span>
                                        <span>{section.building}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {!loadingSections && sections.length === 0 && (
                            <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">No sections found.</div>
                        )}
                    </div>
                )}

                {/* Empty States */}
                {!selectedCourseCode && searchResults.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center">
                        <Search className="w-8 h-8 mb-3 opacity-20" />
                        <span className="font-medium">{query.length < 2 ? 'Type to search...' : 'No courses found'}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

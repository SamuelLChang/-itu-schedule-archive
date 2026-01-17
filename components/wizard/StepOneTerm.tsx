'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Loader2, Upload, FileText } from 'lucide-react';
import { importSelections } from '@/lib/exportUtils';
import { WizardState } from './Wizard';
import ModernSelect from '@/components/ui/ModernSelect';

interface Term {
    id: string;
    name: string;
    _count: { courses: number };
}

interface StepOneTermProps {
    selectedTerm: string;
    onSelect: (id: string) => void;
    onImport?: (state: WizardState) => void;
}

export default function StepOneTerm({ selectedTerm, onSelect, onImport }: StepOneTermProps) {
    const [terms, setTerms] = useState<Term[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch('/api/terms')
            .then(res => res.json())
            .then(data => {
                setTerms(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImport) return;

        setImporting(true);
        try {
            const data = await importSelections(file);
            if (data && data.wizardState) {
                onImport(data.wizardState as WizardState);
            } else if (data && data.courses && data.courses.length > 0) {
                // Import from calendar format - create wizard state
                const mustCodes = data.courses.map(c => c.code);
                onImport({
                    termId: data.termId || '',
                    mustCourses: mustCodes,
                    selectiveGroups: [],
                    constraints: { freeDays: [], noMorning: false }
                });
            }
        } catch (e) {
            console.error('Import failed', e);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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
            originalName: name,
            count: t._count ? t._count.courses : 0
        };
    });

    const uniqueYears = Array.from(new Set(parsedTerms.map(t => t.year))).sort().reverse();

    const initialParsedTerm = parsedTerms.find(t => t.id === selectedTerm);
    const [selectedYear, setSelectedYear] = useState(initialParsedTerm?.year || '');
    const [selectedSeason, setSelectedSeason] = useState(initialParsedTerm?.season || '');

    // Update initial state once loaded if empty
    useEffect(() => {
        if (!loading && initialParsedTerm && !selectedYear) {
            setSelectedYear(initialParsedTerm.year);
            setSelectedSeason(initialParsedTerm.season);
        }
    }, [loading, initialParsedTerm, selectedYear]);


    // Update internal state if prop changes (e.g. import)
    useEffect(() => {
        const t = parsedTerms.find(pt => pt.id === selectedTerm);
        if (t) {
            setSelectedYear(t.year);
            setSelectedSeason(t.season);
        }
    }, [selectedTerm, loading]); // loading dependency ensures terms are loaded

    const availableSeasons = parsedTerms
        .filter(t => t.year === selectedYear)
        .map(t => ({ label: t.season, value: t.season }));

    useEffect(() => {
        const term = parsedTerms.find(t => t.year === selectedYear && t.season === selectedSeason);
        if (term) {
            onSelect(term.id);
        } else if (availableSeasons.length > 0 && !selectedSeason) {
            // Optional: Auto-select first season? Better to let user choose
            // setSelectedSeason(availableSeasons[0].value);
        }
    }, [selectedYear, selectedSeason]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Loading terms...</p>
        </div>
    );


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            {/* Import Option */}
            {onImport && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-blue-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Have a previous configuration?
                            </h3>
                            <p className="text-sm text-blue-700/70 mt-1">Import a .itusched file to restore your previous wizard setup.</p>
                        </div>
                        <button
                            onClick={handleImportClick}
                            disabled={importing}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                        >
                            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Import Config
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".itusched,.json,.png,.svg"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                </div>
            )}

            <div className="text-center space-y-4 mb-10">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600 mb-4 shadow-sm">
                    <Calendar className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">
                    Select Academic Term
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">Choose the academic year and semester to begin planning your schedule.</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative">
                {/* Decorative background blob */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Academic Year</label>
                        <ModernSelect
                            value={selectedYear}
                            onChange={(val) => { setSelectedYear(val); setSelectedSeason(''); }}
                            options={uniqueYears.map(y => ({ label: y, value: y }))}
                            placeholder="Select Year"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Semester</label>
                        <ModernSelect
                            value={selectedSeason}
                            onChange={setSelectedSeason}
                            options={availableSeasons}
                            placeholder="Select Semester"
                            disabled={!selectedYear}
                        />
                    </div>
                </div>

                {/* Selected Term Summary / Info */}
                {selectedTerm && (
                    <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Selected Term</p>
                            <p className="text-blue-900 font-bold">
                                {parsedTerms.find(t => t.id === selectedTerm)?.originalName}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

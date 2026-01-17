'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, X, Trash2, Layers, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { WizardState } from './Wizard';

// Simplified Course for Selection
interface SearchResult {
    id: string;
    code: string;
    title: string;
    instructor: string;
    type: 'course' | 'subject'; // New type to distinguish
}

interface StepTwoPlanningProps {
    termId: string;
    data: WizardState;
    updateData: (updates: Partial<WizardState>) => void;
}

export default function StepTwoPlanning({ termId, data, updateData }: StepTwoPlanningProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [draggingCourse, setDraggingCourse] = useState<SearchResult | null>(null);
    const [actionItem, setActionItem] = useState<SearchResult | null>(null);

    // Search Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            if (query.length >= 2) searchCourses();
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    const searchCourses = async () => {
        setLoading(true);
        try {
            // Added searchField=code for strict matching
            const res = await fetch(`/api/courses?termId=${termId}&q=${query}&searchField=code`);
            const rawData = await res.json();

            // Deduplication
            const seen = new Set();
            const unique: SearchResult[] = [];

            // Check if query looks like a subject (e.g. "ATA", "BLG") - 3 uppercase letters
            const potentialSubject = query.toUpperCase().trim();
            if (/^[A-Z]{3}$/.test(potentialSubject)) {
                // Add a "Subject" Item
                unique.push({
                    id: `SUB-${potentialSubject}`,
                    code: potentialSubject,
                    title: `All ${potentialSubject} Courses`,
                    instructor: 'Bulk Selection',
                    type: 'subject'
                });
            }

            rawData.forEach((c: any) => {
                if (!seen.has(c.code)) {
                    seen.add(c.code);
                    unique.push({ ...c, type: 'course' });
                }
            });

            setResults(unique.slice(0, 50));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Helper to fetch all courses for a subject
    const fetchSubjectCourses = async (subject: string): Promise<string[]> => {
        try {
            const res = await fetch(`/api/courses?termId=${termId}&subject=${subject}`);
            const data = await res.json();
            // dedupe codes
            const codes = new Set<string>(data.map((c: any) => c.code));
            return Array.from(codes);
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    // Actions
    const addMustCourse = async (item: SearchResult) => {
        if (item.type === 'subject') {
            setLoading(true);
            const codes = await fetchSubjectCourses(item.code);
            const newCodes = codes.filter(c => !data.mustCourses.includes(c));
            if (newCodes.length > 0) {
                updateData({ mustCourses: [...data.mustCourses, ...newCodes] });
            }
            setLoading(false);
        } else {
            if (!data.mustCourses.includes(item.code)) {
                updateData({ mustCourses: [...data.mustCourses, item.code] });
            }
        }
    };

    const removeMustCourse = (code: string) => {
        updateData({ mustCourses: data.mustCourses.filter(c => c !== code) });
    };

    const addSelectiveGroup = () => {
        const newGroup = {
            id: crypto.randomUUID(),
            name: `Elective Group ${data.selectiveGroups.length + 1}`,
            required: 1,
            courses: []
        };
        updateData({ selectiveGroups: [...data.selectiveGroups, newGroup] });
    };

    const removeSelectiveGroup = (groupId: string) => {
        updateData({ selectiveGroups: data.selectiveGroups.filter(g => g.id !== groupId) });
    };

    const updateGroup = (groupId: string, updates: Partial<typeof data.selectiveGroups[0]>) => {
        updateData({
            selectiveGroups: data.selectiveGroups.map(g => g.id === groupId ? { ...g, ...updates } : g)
        });
    };

    const addToGroup = async (groupId: string, item: SearchResult) => {
        const group = data.selectiveGroups.find(g => g.id === groupId);
        if (!group) return;

        if (item.type === 'subject') {
            setLoading(true);
            const codes = await fetchSubjectCourses(item.code);
            const newCodes = codes.filter(c => !group.courses.includes(c));
            if (newCodes.length > 0) {
                updateGroup(groupId, { courses: [...group.courses, ...newCodes] });
            }
            setLoading(false);
        } else {
            if (!group.courses.includes(item.code)) {
                updateGroup(groupId, { courses: [...group.courses, item.code] });
            }
        }
    };

    const removeFromGroup = (groupId: string, code: string) => {
        const group = data.selectiveGroups.find(g => g.id === groupId);
        if (group) {
            updateGroup(groupId, { courses: group.courses.filter(c => c !== code) });
        }
    };

    // Helper: Is course selected anywhere?
    const isSelected = (code: string) => {
        if (data.mustCourses.includes(code)) return true;
        if (data.selectiveGroups.some(g => g.courses.includes(code))) return true;
        return false;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px] -m-4 sm:-m-0">
            {/* LEFT: Search */}
            <div className="lg:col-span-4 flex flex-col gap-4 bg-white/40 backdrop-blur-md p-4 border border-white/50 rounded-2xl h-full overflow-hidden shadow-xl shadow-blue-500/5">
                <div className="space-y-1 flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-600" />
                        Find Courses
                    </h3>
                    <p className="text-slate-500 text-xs">Search via Code (e.g. FIZ 101) or Subject (e.g. ATA)</p>
                </div>

                <div className="relative flex-shrink-0">
                    <input
                        type="text"
                        className="w-full bg-white/70 border border-white/50 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm shadow-sm transition-all"
                        placeholder="e.g. FIZ 101 or ATA"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    {loading && <Loader2 className="absolute right-3 top-3.5 w-4 h-4 text-blue-600 animate-spin" />}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-0 pr-1">
                    {results.length > 0 ? (
                        results.map(item => {
                            if (item.type === 'subject') {
                                return (
                                    <div
                                        key={item.id}
                                        className="p-3 rounded-xl border border-blue-200/60 bg-blue-50/60 hover:bg-blue-100/80 cursor-grab active:cursor-grabbing flex justify-between items-center group transition-all shadow-sm backdrop-blur-sm"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('course', JSON.stringify(item));
                                            setDraggingCourse(item);
                                        }}
                                        onDragEnd={() => setDraggingCourse(null)}
                                    >
                                        <div>
                                            <div className="font-bold text-blue-700 text-sm flex items-center gap-2">
                                                <Layers className="w-4 h-4" />
                                                {item.code}
                                            </div>
                                            <div className="text-xs text-blue-600/70">{item.title}</div>
                                        </div>
                                        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setActionItem(item)}
                                                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                                            >
                                                Add All
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            const selected = isSelected(item.code);
                            return (
                                <div
                                    key={item.id}
                                    className={`p-3 rounded-xl border flex justify-between items-center group transition-all shadow-sm backdrop-blur-sm ${selected
                                        ? 'bg-slate-100/50 border-slate-200/50 opacity-50'
                                        : 'bg-white/60 border-white/60 hover:bg-white hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing'
                                        }`}
                                    draggable={!selected}
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('course', JSON.stringify(item));
                                        setDraggingCourse(item);
                                    }}
                                    onDragEnd={() => setDraggingCourse(null)}
                                >
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm font-mono">{item.code}</div>
                                        <div className="text-xs text-slate-500 line-clamp-1">{item.title}</div>
                                    </div>

                                    {!selected && (
                                        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setActionItem(item)}
                                                className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1"
                                                title="Add Course"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add
                                            </button>
                                        </div>
                                    )}
                                    {selected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            {query.length > 2 ? 'No courses found' : 'Type code or subject'}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Planning Board */}
            <div className="lg:col-span-8 flex flex-col gap-6 p-4 overflow-y-auto custom-scrollbar h-full rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm">

                {/* Must Courses Area */}
                <div
                    className="bg-white/40 border border-white/50 rounded-2xl p-5 flex-shrink-0 shadow-sm backdrop-blur-md transition-all hover:bg-white/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        const dataStr = e.dataTransfer.getData('course');
                        if (dataStr) {
                            const item = JSON.parse(dataStr);
                            addMustCourse(item);
                        }
                    }}
                >
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-blue-600" />
                                Must Courses
                            </h3>
                            <p className="text-slate-500 text-xs">Courses you definitely want to take.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {data.mustCourses.length > 0 && (
                                <button onClick={() => updateData({ mustCourses: [] })} className="text-xs text-red-500 hover:text-red-700 font-medium">
                                    Clear
                                </button>
                            )}
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-mono font-bold">
                                {data.mustCourses.length} Selected
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {data.mustCourses.map(code => (
                            <div key={code} className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3 flex items-center gap-3 hover:bg-white transition-colors">
                                <div className="font-bold text-slate-700 text-sm">{code}</div>
                                <button onClick={() => removeMustCourse(code)} className="text-slate-400 hover:text-red-500">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {data.mustCourses.length === 0 && (
                            <div className="w-full py-8 border-2 border-dashed border-blue-200/50 rounded-xl flex flex-col items-center text-center text-blue-400/70">
                                <span className="text-sm font-medium">Drag courses (or Subjects like "ATA") here</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Selective Groups Area */}
                <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900">Selective Groups</h3>
                        <button
                            onClick={addSelectiveGroup}
                            className="text-sm bg-white/50 hover:bg-white text-slate-700 border border-white/50 shadow-sm px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all font-medium backdrop-blur-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Group
                        </button>
                    </div>

                    {data.selectiveGroups.map(group => (
                        <div
                            key={group.id}
                            className="bg-white/40 border border-white/50 rounded-2xl p-5 shadow-sm backdrop-blur-md transition-all hover:bg-white/50"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const dataStr = e.dataTransfer.getData('course');
                                if (dataStr) {
                                    const item = JSON.parse(dataStr);
                                    addToGroup(group.id, item);
                                }
                            }}
                        >
                            <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-slate-200/50">
                                <div className="flex-1 min-w-[200px]">
                                    <input
                                        value={group.name}
                                        onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                                        className="bg-transparent text-slate-900 font-bold text-lg border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="flex items-center gap-3 bg-white/50 p-1.5 rounded-lg border border-white/50">
                                    <span className="text-xs text-slate-500 pl-2">Pick</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={Math.max(1, group.courses.length)}
                                        value={group.required}
                                        onChange={(e) => updateGroup(group.id, { required: parseInt(e.target.value) || 1 })}
                                        className="w-12 bg-white/80 text-center rounded text-slate-900 border border-slate-200 text-sm py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-slate-500 pr-2">of {group.courses.length} courses</span>
                                </div>

                                <button onClick={() => removeSelectiveGroup(group.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {group.courses.map(code => (
                                    <div key={code} className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3 flex justify-between items-start hover:bg-white transition-colors">
                                        <div className="font-bold text-slate-700 text-sm">{code}</div>
                                        <button onClick={() => removeFromGroup(group.id, code)} className="text-slate-400 hover:text-red-500">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="border border-dashed border-slate-300/60 rounded-xl p-3 flex items-center justify-center text-slate-400 text-xs text-center min-h-[50px] bg-slate-50/30">
                                    Drag courses here
                                </div>
                            </div>
                        </div>
                    ))}

                    {data.selectiveGroups.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            <p>No selective groups yet.</p>
                            <p className="opacity-75">Create a group to model "Pick 2 of 5" scenarios.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Mobile Interaction Modal */}
            {actionItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-4 space-y-4 animate-in zoom-in-95 duration-200">
                        <div>
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg text-slate-900 leading-tight pr-2">
                                    Add <span className="text-blue-600">{actionItem.code}</span>
                                </h3>
                                <button
                                    onClick={() => setActionItem(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{actionItem.title}</p>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Destination</div>

                            {/* Add to Must */}
                            <button
                                onClick={() => {
                                    addMustCourse(actionItem);
                                    setActionItem(null);
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all group text-left"
                            >
                                <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">Must Course</div>
                                    <div className="text-xs text-slate-500">I definitely want this</div>
                                </div>
                            </button>

                            {/* Add to Groups */}
                            {data.selectiveGroups.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => {
                                        addToGroup(group.id, actionItem);
                                        setActionItem(null);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all group text-left"
                                >
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                                        <Layers className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{group.name}</div>
                                        <div className="text-xs text-slate-500">Pick {group.required} of {group.courses.length}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

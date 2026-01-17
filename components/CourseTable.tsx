'use client';

import { useState, useMemo } from 'react';
import { useSchedule, Course } from '@/context/ScheduleContext';
import { Check, Plus, Minus, Search, Calendar, Clock, X, Users, Info } from 'lucide-react';
import { parseSchedule, CourseSession } from '@/lib/scheduler';

export default function CourseTable({ courses }: { courses: Course[] }) {
    const { isCourseSelected, toggleCourse, selectedCourses } = useSchedule();

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [dayFilter, setDayFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState(''); // Morning / Afternoon

    // Preview State
    const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

    // Filter Logic
    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch =
                course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (course.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (course.instructor || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDay = dayFilter ? (course.days || '').includes(dayFilter) : true;

            let matchesTime = true;
            if (timeFilter === 'Morning') {
                // heuristic: start time contains 08, 09, 10, 11
                matchesTime = /0[8-9]:|1[0-1]:/.test((course.times || '').split('-')[0]);
            } else if (timeFilter === 'Afternoon') {
                // heuristic: start time contains 12, 13, 14, 15, 16, 17
                matchesTime = /1[2-7]:/.test((course.times || '').split('-')[0]);
            }

            return matchesSearch && matchesDay && matchesTime;
        });
    }, [courses, searchTerm, dayFilter, timeFilter]);

    // Derived State
    const isFiltered = searchTerm || dayFilter || timeFilter;

    // Helper to format minutes to HH:MM
    const formatTime = (totalMinutes: number) => {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Helper to render grouped schedule
    const renderSchedule = (course: Course) => {
        const sessions = parseSchedule(course.times || '', course.days || '');
        if (sessions.length === 0) return <span className="text-slate-400 italic">TBA</span>;

        // Group by time to show nicely: "Mon, Wed 08:30-10:29"
        const groups: Record<string, string[]> = {};
        sessions.forEach(s => {
            const timeStr = `${formatTime(s.start)}-${formatTime(s.end)}`;
            if (!groups[timeStr]) groups[timeStr] = [];
            groups[timeStr].push(s.day);
        });

        return (
            <div className="flex flex-col gap-1">
                {Object.entries(groups).map(([time, days], idx) => (
                    <div key={idx} className="flex flex-col">
                        <span className="font-bold text-slate-700 text-xs">{days.join(', ')}</span>
                        <span className="text-xs text-slate-500">{time}</span>
                    </div>
                ))}
            </div>
        );
    };

    if (courses.length === 0) return <div className="text-slate-500 py-4">No courses found.</div>;

    return (
        <div className="relative space-y-4">

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center z-20 relative">

                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by code, title, or instructor..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <div className="relative min-w-[120px]">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:border-blue-500 outline-none"
                            value={dayFilter}
                            onChange={(e) => setDayFilter(e.target.value)}
                        >
                            <option value="">All Days</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-400"></div>
                    </div>

                    <div className="relative min-w-[140px]">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:border-blue-500 outline-none"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option value="">Any Time</option>
                            <option value="Morning">Morning</option>
                            <option value="Afternoon">Afternoon</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-400"></div>
                    </div>

                    {isFiltered && (
                        <button
                            onClick={() => { setSearchTerm(''); setDayFilter(''); setTimeFilter(''); }}
                            className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Results Info */}
            {isFiltered && (
                <div className="text-sm text-slate-500 px-1">
                    Showing {filteredCourses.length} of {courses.length} courses
                </div>
            )}

            {/* Desktop Table View - hidden on mobile */}
            <div className="hidden md:block relative">
                <table className="w-full text-left border-separate border-spacing-y-3 -mt-3 border-none">
                    <thead>
                        <tr className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                            <th className="px-5 pb-2 text-center w-16">Action</th>
                            <th className="px-5 pb-2">CRN</th>
                            <th className="px-5 pb-2">Code</th>
                            <th className="px-5 pb-2">Title</th>
                            <th className="px-5 pb-2">Instructor</th>
                            <th className="px-5 pb-2">Day/Time</th>
                            <th className="px-5 pb-2">Building</th>
                            <th className="px-5 pb-2 w-28">Stats</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-600">
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map((course) => {
                                const selected = isCourseSelected(course.id);
                                return (
                                    <tr
                                        key={course.id}
                                        onMouseEnter={() => setPreviewCourse(course)}
                                        onMouseLeave={() => setPreviewCourse(null)}
                                        className={`group relative transition-all duration-300 ${selected ? 'scale-[1.01] z-40' : 'hover:scale-[1.01] hover:z-50'}`}
                                    >
                                        <td className={`bg-white rounded-l-2xl shadow-sm border-y border-l border-slate-100 px-4 py-4 text-center align-middle group-hover:shadow-md transition-all ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            <button
                                                onClick={() => toggleCourse(course)}
                                                className={`p-2 rounded-xl transition-all shadow-sm ${selected
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-red-100'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-blue-100'
                                                    }`}
                                                title={selected ? "Remove from Schedule" : "Add to Schedule"}
                                            >
                                                {selected ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className={`bg-white shadow-sm border-y border-slate-100 px-4 py-4 align-middle font-mono text-slate-500 text-xs group-hover:shadow-md transition-all ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            {course.crn}
                                        </td>
                                        <td className={`bg-white shadow-sm border-y border-slate-100 px-4 py-4 align-middle font-bold text-slate-900 group-hover:shadow-md transition-all ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            {course.code}
                                        </td>
                                        <td className={`bg-white shadow-sm border-y border-slate-100 px-4 py-4 align-middle font-medium text-slate-800 max-w-xs group-hover:shadow-md transition-all ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            <div className="truncate" title={course.title}>{course.title}</div>
                                        </td>
                                        <td className={`bg-white shadow-sm border-y border-slate-100 px-4 py-4 align-middle text-slate-600 text-xs uppercase tracking-wide group-hover:shadow-md transition-all ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            <div className="line-clamp-2">{course.instructor}</div>
                                        </td>
                                        <td className={`bg-white shadow-sm border-y border-slate-100 px-4 py-4 align-middle text-slate-600 group-hover:shadow-md transition-all ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            {renderSchedule(course)}
                                        </td>
                                        <td className={`bg-white shadow-sm border-y border-slate-100 px-4 py-4 align-middle text-slate-600 text-xs group-hover:shadow-md transition-all ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            <span className="font-semibold block">{course.building}</span>
                                            <span className="text-slate-400">{course.rooms}</span>
                                        </td>
                                        <td className={`bg-white rounded-r-2xl shadow-sm border-y border-r border-slate-100 px-4 py-4 align-middle group-hover:shadow-md transition-all relative ${selected ? 'bg-blue-50/30 border-blue-200' : ''}`}>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                    <span>Enrolled</span>
                                                    <span className="text-slate-600">{course.enrolled || 0}/{course.capacity || 0}</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${parseInt(course.enrolled || '0') >= parseInt(course.capacity || '1')
                                                            ? 'bg-red-500'
                                                            : 'bg-emerald-400'
                                                            }`}
                                                        style={{
                                                            width: `${Math.min(100, (parseInt(course.enrolled || '0') / parseInt(course.capacity || '1')) * 100)}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Hover Preview Tooltip */}
                                            {previewCourse?.id === course.id && (
                                                <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl shadow-xl shadow-blue-900/10 border border-slate-200/60 p-4 pointer-events-none animate-in fade-in zoom-in-95 duration-200 origin-top-right backdrop-blur-md">
                                                    <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                        Schedule Preview
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-1 h-32 text-[10px] text-slate-400 font-mono">
                                                        {['M', 'T', 'W', 'R', 'F'].map(d => (
                                                            <div key={d} className="text-center pb-1 border-b border-slate-100">{d}</div>
                                                        ))}
                                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((dayName, colIdx) => {
                                                            const daySessions = [
                                                                ...selectedCourses.filter(c => c.id !== course.id).flatMap(c =>
                                                                    parseSchedule(c.times || '', c.days || '')
                                                                        .filter(s => s.day === dayName)
                                                                        .map(s => ({ ...s, type: 'existing' }))
                                                                ),
                                                                ...parseSchedule(previewCourse.times || '', previewCourse.days || '')
                                                                    .filter(s => s.day === dayName)
                                                                    .map(s => ({ ...s, type: 'preview' }))
                                                            ];
                                                            return (
                                                                <div key={dayName} className="relative h-full bg-slate-50/50 rounded-sm">
                                                                    {daySessions.map((session, sIdx) => {
                                                                        const startPercent = ((session.start - 510) / (1050 - 510)) * 100;
                                                                        const heightPercent = ((session.end - session.start) / (1050 - 510)) * 100;
                                                                        return (
                                                                            <div
                                                                                key={sIdx}
                                                                                className={`absolute w-full rounded-[2px] ${session.type === 'preview' ? 'bg-blue-500 z-10 shadow-sm' : 'bg-slate-300/80'}`}
                                                                                style={{
                                                                                    top: `${Math.max(0, startPercent)}%`,
                                                                                    height: `${Math.max(4, heightPercent)}%`
                                                                                }}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-4 py-16 text-center text-slate-400 italic bg-white rounded-3xl border border-slate-100 border-dashed">
                                    No courses match your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View - shown only on mobile */}
            <div className="md:hidden space-y-3">
                {filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => {
                        const selected = isCourseSelected(course.id);
                        return (
                            <div
                                key={course.id}
                                className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${selected
                                    ? 'border-blue-200 bg-blue-50/30 shadow-blue-100'
                                    : 'border-slate-100 hover:shadow-md'
                                    }`}
                            >
                                {/* Header: Code, CRN, Action */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-900 text-lg">{course.code}</span>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{course.crn}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleCourse(course)}
                                        className={`p-2.5 rounded-xl transition-all shadow-sm ${selected
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                    >
                                        {selected ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Title */}
                                <h3 className="font-medium text-slate-800 mb-3 leading-tight">{course.title}</h3>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {/* Instructor */}
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Instructor</span>
                                        <span className="text-slate-600 text-xs line-clamp-2">{course.instructor || 'TBA'}</span>
                                    </div>

                                    {/* Building */}
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Location</span>
                                        <span className="text-slate-600 text-xs">
                                            {course.building || 'TBA'} {course.rooms ? `- ${course.rooms}` : ''}
                                        </span>
                                    </div>

                                    {/* Schedule */}
                                    <div className="flex flex-col col-span-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Schedule</span>
                                        <div className="text-slate-600">{renderSchedule(course)}</div>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Enrollment</span>
                                        <span className="text-xs font-medium text-slate-600">{course.enrolled || 0}/{course.capacity || 0}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${parseInt(course.enrolled || '0') >= parseInt(course.capacity || '1')
                                                ? 'bg-red-500'
                                                : 'bg-emerald-400'
                                                }`}
                                            style={{
                                                width: `${Math.min(100, (parseInt(course.enrolled || '0') / parseInt(course.capacity || '1')) * 100)}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="px-4 py-16 text-center text-slate-400 italic bg-white rounded-3xl border border-slate-100 border-dashed">
                        No courses match your filters.
                    </div>
                )}
            </div>
        </div>
    );
}

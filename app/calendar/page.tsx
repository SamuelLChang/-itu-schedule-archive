'use client';

import { useRef, useState } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { Calendar as CalendarIcon, X, AlertCircle, Clock, AlertTriangle } from 'lucide-react';

import CourseSelector from '@/components/calendar/CourseSelector';
import ExportImportToolbar from '@/components/calendar/ExportImportToolbar';
import CalendarHelp from '@/components/calendar/CalendarHelp';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default function CalendarPage() {
    const { selectedCourses, removeCourse, conflicts, importCourses } = useSchedule();

    // Helper to parse time string "13:30-16:29,15:30-17:29" into blocks
    const parseSchedule = (course: any) => {
        if (!course.times || !course.days) return [];

        const times = course.times.split(',').map((t: string) => t.trim());
        const days = course.days.split(',').map((d: string) => d.trim());

        // Also split locations
        const buildings = (course.building || '').split(',').map((b: string) => b.trim());
        const rooms = (course.rooms || '').split(',').map((r: string) => r.trim());

        const dayMap: Record<string, string> = {
            'Pazartesi': 'Monday', 'Salı': 'Tuesday', 'Çarşamba': 'Wednesday',
            'Perşembe': 'Thursday', 'Cuma': 'Friday', 'Cumartesi': 'Saturday', 'Pazar': 'Sunday'
        };

        const parseMin = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const events: any[] = [];
        const maxLen = Math.max(times.length, days.length);

        for (let i = 0; i < maxLen; i++) {
            const time = times[i] || times[times.length - 1];
            const day = days[i] || days[days.length - 1];

            // Distribute location logic
            let building = buildings[i];
            if (building === undefined) building = buildings.length === 1 ? buildings[0] : (buildings[buildings.length - 1] || '');

            let room = rooms[i];
            if (room === undefined) room = rooms.length === 1 ? rooms[0] : (rooms[rooms.length - 1] || '');

            if (time && day) {
                const [startStr, endStr] = time.split(/[-\/]/); // support - or /
                if (!startStr || !endStr) continue;

                let s = parseMin(startStr);
                let e = parseMin(endStr);
                if (e < s) e += 1440; // Wrap around

                events.push({
                    day: dayMap[day] || day, // Map Turkish to English for grid
                    start: s,
                    end: e,
                    text: `${startStr}-${endStr}`,
                    courseCode: course.code,
                    building: building,
                    rooms: room,
                    crn: course.crn,
                    id: course.id,
                    title: course.title,
                    instructor: course.instructor
                });
            }
        }
        return events;
    };

    const allEvents = selectedCourses.flatMap(parseSchedule);

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const startHour = 8.5; // 08:30

    // Dynamic End Hour Calculation
    const maxEventEnd = allEvents.reduce((max, ev) => Math.max(max, ev.end), 0);
    const maxEventHour = maxEventEnd > 0 ? maxEventEnd / 60 : 17.5;

    // Ensure at least until 17:30, otherwise extend to fit latest class + buffer
    const endHour = Math.max(17.5, Math.ceil(maxEventHour - 0.5) + 0.5);

    const totalMinutes = (endHour - startHour) * 60;
    const hoursCount = Math.ceil(endHour - startHour);

    // Unified color palette - Distinctive vibrant pastels matching website design
    const eventColors = [
        'bg-[#DBEAFE] text-[#1E40AF] shadow-sm hover:shadow-md hover:bg-[#BFDBFE]', // Blue
        'bg-[#F3E8FF] text-[#6B21A8] shadow-sm hover:shadow-md hover:bg-[#E9D5FF]', // Purple
        'bg-[#D1FAE5] text-[#065F46] shadow-sm hover:shadow-md hover:bg-[#A7F3D0]', // Emerald
        'bg-[#FEF3C7] text-[#92400E] shadow-sm hover:shadow-md hover:bg-[#FDE68A]', // Amber
        'bg-[#FCE7F3] text-[#9D174D] shadow-sm hover:shadow-md hover:bg-[#FBCFE8]', // Pink
        'bg-[#CFFAFE] text-[#155E75] shadow-sm hover:shadow-md hover:bg-[#A5F3FC]', // Cyan
        'bg-[#FFEDD5] text-[#C2410C] shadow-sm hover:shadow-md hover:bg-[#FED7AA]', // Orange
        'bg-[#E0E7FF] text-[#3730A3] shadow-sm hover:shadow-md hover:bg-[#C7D2FE]', // Indigo
        'bg-[#CCFBF1] text-[#115E59] shadow-sm hover:shadow-md hover:bg-[#99F6E4]', // Teal
        'bg-[#FEE2E2] text-[#991B1B] shadow-sm hover:shadow-md hover:bg-[#FECACA]', // Red
        'bg-[#FEF9C3] text-[#854D0E] shadow-sm hover:shadow-md hover:bg-[#FEF08A]', // Yellow
        'bg-[#F1F5F9] text-[#334155] shadow-sm hover:shadow-md hover:bg-[#E2E8F0]', // Slate
    ];

    const getEventColor = (crn: string, code: string) => {
        // Check conflict
        const isConflicting = conflicts.some(c => c.courseA === code || c.courseB === code);
        if (isConflicting) {
            return 'bg-red-50 text-red-600 border border-red-200 shadow-md ring-2 ring-red-100 z-30';
        }

        const index = (parseInt(crn) || 0) % eventColors.length;
        return eventColors[index];
    };

    const [mobileTab, setMobileTab] = useState<'calendar' | 'courses'>('calendar');

    return (
        <div className="min-h-screen bg-[#F5F5F7] text-slate-900 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 animate-in fade-in duration-500">

            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Weekly <span className="text-blue-600">Planner.</span></h1>
                        <CalendarHelp />
                    </div>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Drag courses from the sidebar to visualize your week.</p>
                </div>
            </div>

            {/* Conflict Alert Banner */}
            {conflicts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-100 rounded-xl text-red-600 shadow-sm">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900 text-sm">Schedule Conflict Detected</h3>
                            <p className="text-xs text-red-700 font-medium">
                                {conflicts.length} overlapping course pairs found.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex bg-slate-200/50 p-1.5 rounded-2xl backdrop-blur-sm">
                <button
                    onClick={() => setMobileTab('calendar')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mobileTab === 'calendar'
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Schedule
                </button>
                <button
                    onClick={() => setMobileTab('courses')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mobileTab === 'courses'
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Courses & Selection
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-180px)] md:h-[calc(100vh-160px)]">
                {/* Sidebar: Wrapper */}
                <ScrollReveal className={`w-full md:w-80 flex-shrink-0 flex flex-col gap-4 h-full ${mobileTab === 'courses' ? 'flex' : 'hidden md:flex'}`}>

                    {/* NEW: Course Selector (Top of Sidebar) */}
                    <div className="flex-1 min-h-[400px]">
                        <CourseSelector />
                    </div>

                    {/* Selected Courses List (Bottom of Sidebar) */}
                    <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[2rem] border border-slate-200/60 p-5 flex flex-col shadow-lg shadow-slate-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
                        <h2 className="text-xs font-black font-display flex items-center gap-2 text-slate-400 mb-4 uppercase tracking-widest">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Selected Items
                        </h2>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {selectedCourses.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20 text-blue-500" />
                                    <p>No courses selected.</p>
                                </div>
                            ) : (
                                selectedCourses.map((c, i) => {
                                    const isConflicting = conflicts.some(conf => conf.courseA === c.code || conf.courseB === c.code);
                                    return (
                                        <div key={c.id} className={`relative flex justify-between items-start p-3.5 rounded-2xl border transition-all duration-300 group ${isConflicting ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100 hover:border-blue-300/50 hover:shadow-lg hover:shadow-blue-500/5'
                                            }`}>
                                            <div className="min-w-0 pr-2">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className={`font-bold text-sm ${isConflicting ? 'text-red-700' : 'text-slate-900'}`}>{c.code}</div>
                                                    <div className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono font-bold">{c.crn}</div>
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-medium truncate leading-snug">{c.title}</div>
                                                <div className="text-[10px] text-slate-400 mt-1 truncate">{c.instructor}</div>
                                            </div>
                                            <button
                                                onClick={() => removeCourse(c.id)}
                                                className="absolute top-2 right-2 p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </ScrollReveal>

                {/* Main Calendar Grid */}
                <ScrollReveal delay={200} className={`flex-1 flex flex-col overflow-hidden ${mobileTab === 'calendar' ? 'flex' : 'hidden md:flex'}`}>

                    {/* Calendar Container */}
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 flex flex-col overflow-hidden relative">
                        {/* Header Bar inside Card */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-20">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Time Grid</span>
                            </div>
                            <ExportImportToolbar
                                courses={selectedCourses}
                                onImport={importCourses}
                            />
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-white relative z-10">
                            {/* Export target: just the grid content */}
                            <div className="bg-white min-h-full">
                                {/* Header Row */}
                                <div className="flex mb-2 text-center font-semibold text-slate-500 text-xs border-b border-slate-100 pb-3 min-w-[700px] sticky top-0 bg-white/95 backdrop-blur-sm z-30">
                                    <div className="w-[60px] text-right pr-4 self-end opacity-40 font-normal shrink-0">GMT+3</div>
                                    {daysOfWeek.map(d => (
                                        <div key={d} className="flex-1 uppercase tracking-wide text-[10px] text-slate-400 font-bold">{d.slice(0, 3)}<span className="hidden sm:inline">{d.slice(3)}</span></div>
                                    ))}
                                </div>

                                {/* Timetable Body */}
                                <div className="relative min-w-[700px]" style={{ height: `${Math.max(600, hoursCount * 60)}px` }}>
                                    {/* Grid Lines (Hours) starting 08:30 */}
                                    {Array.from({ length: hoursCount + 1 }).map((_, i) => {
                                        const time = startHour + i; // 8.30, 9.30...
                                        const hourInt = Math.floor(time) % 24; // Handle 24 -> 00

                                        return (
                                            <div
                                                key={i}
                                                className="absolute w-full border-t border-slate-100 flex items-center text-slate-400 font-medium group pointer-events-none"
                                                style={{ top: `${(i / hoursCount) * 100}%` }}
                                            >
                                                <span className="w-12 text-right pr-4 -mt-3 text-[10px] font-mono opacity-60">
                                                    {hourInt.toString().padStart(2, '0')}:30
                                                </span>
                                            </div>
                                        );
                                    })}

                                    {/* Vertical Day Separators */}
                                    {daysOfWeek.map((_, i) => (
                                        <div key={i} className="absolute h-full border-r border-slate-50 pointer-events-none" style={{ left: `calc(${((i + 1) * 100) / 5}% + 60px / 5)` }}></div>
                                    ))}


                                    {/* Events */}
                                    {allEvents.map((event, idx) => {
                                        const dayIndex = daysOfWeek.indexOf(event.day);
                                        if (dayIndex === -1) return null;

                                        const leftPos = ((dayIndex * 100) / 5) + '%';
                                        const startMin = event.start;
                                        const endMin = event.end;
                                        const dayStartMin = 8 * 60 + 30; // 08:30 = 510 min

                                        const topPos = Math.max(0, ((startMin - dayStartMin) / totalMinutes) * 100);
                                        const height = Math.min(100 - topPos, ((endMin - startMin) / totalMinutes) * 100);

                                        // Minimal height for short events
                                        const safeHeight = Math.max(height, 2.5);

                                        return (
                                            <div
                                                key={`${event.crn}-${idx}`}
                                                className={`absolute mx-1 px-3 py-2.5 rounded-2xl text-xs overflow-hidden flex flex-col justify-start transition-all duration-500 hover:scale-[1.02] hover:z-50 cursor-pointer z-10 animate-in fade-in zoom-in-95 fill-mode-forwards shadow-sm hover:shadow-xl ring-1 ring-black/5 ${getEventColor(event.crn, event.courseCode)}`}
                                                style={{
                                                    left: `calc(${leftPos} + 60px)`, // Offset for time column
                                                    width: `calc((100% - 60px) / 5 - 12px)`, // Width divided by 5 days, minus margins
                                                    top: `${topPos}%`,
                                                    height: `${safeHeight}%`,
                                                    animationDelay: `${idx * 20}ms`
                                                }}
                                                title={`${event.courseCode}: ${event.title}`}
                                            >
                                                {/* Card Content - Flex Column */}
                                                <div className="flex flex-col h-full relative">

                                                    {/* Top Row: Code & CRN */}
                                                    <div className="flex justify-between items-start leading-tight mb-1">
                                                        <span className="font-extrabold text-[11px] sm:text-[12px] tracking-tight">{event.courseCode}</span>
                                                        <span className="font-mono text-[9px] bg-black/5 px-1.5 rounded text-current/70 font-bold">{event.crn}</span>
                                                    </div>

                                                    {/* Middle: Title & Instructor */}
                                                    <div className="font-medium text-[9px] sm:text-[10px] opacity-90 leading-tight line-clamp-2 md:line-clamp-3 mb-auto">
                                                        {event.title}
                                                    </div>

                                                    {/* Bottom Row: Time & Location */}
                                                    <div className="mt-1 pt-1.5 flex justify-between items-center border-t border-black/5 opacity-80 min-h-[20px]">
                                                        {/* Time (Down Left) */}
                                                        <div className="flex items-center gap-1 font-mono text-[9px] font-semibold tracking-tight">
                                                            <Clock className="w-2.5 h-2.5 opacity-70" />
                                                            {event.text}
                                                        </div>

                                                        {/* Location (Down Right) */}
                                                        <div className="text-[9px] font-bold text-right truncate pl-2">
                                                            {event.building} <span className="opacity-70 font-medium">{event.rooms}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* End export target */}
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </div>
    );
}

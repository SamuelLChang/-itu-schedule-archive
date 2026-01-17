'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkConflict, Course } from '@/lib/scheduler';
export type { Course };

// Re-defining Course here if needed, or import shared type.
// For now, let's assume the context uses the same shape or we map it.
// The scheduler expects Course to have { times, days }
// The context previously had { times, days } so it matches.

interface ScheduleContextType {
    selectedCourses: Course[];
    conflicts: { courseA: string, courseB: string }[];
    addCourse: (course: Course) => void;
    removeCourse: (courseId: string) => void;
    toggleCourse: (course: Course) => void;
    isCourseSelected: (courseId: string) => boolean;
    clearSchedule: () => void;
    importCourses: (courses: Course[]) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
    const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
    const [conflicts, setConflicts] = useState<{ courseA: string, courseB: string }[]>([]);

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('itu_schedule_cart');
        if (saved) {
            try {
                setSelectedCourses(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse schedule cart', e);
            }
        }
    }, []);

    // Save to local storage on change
    useEffect(() => {
        localStorage.setItem('itu_schedule_cart', JSON.stringify(selectedCourses));

        // Check conflicts whenever courses change
        const newConflicts: { courseA: string, courseB: string }[] = [];
        for (let i = 0; i < selectedCourses.length; i++) {
            for (let j = i + 1; j < selectedCourses.length; j++) {
                if (checkConflict(selectedCourses[i], selectedCourses[j])) {
                    newConflicts.push({
                        courseA: selectedCourses[i].code,
                        courseB: selectedCourses[j].code
                    });
                }
            }
        }
        setConflicts(newConflicts);

    }, [selectedCourses]);

    const addCourse = (course: Course) => {
        if (!selectedCourses.some(c => c.id === course.id)) {
            setSelectedCourses(prev => [...prev, course]);
        }
    };

    const removeCourse = (courseId: string) => {
        setSelectedCourses(prev => prev.filter(c => c.id !== courseId));
    };

    const toggleCourse = (course: Course) => {
        if (selectedCourses.some(c => c.id === course.id)) {
            removeCourse(course.id);
        } else {
            addCourse(course);
        }
    };

    const isCourseSelected = (courseId: string) => {
        return selectedCourses.some(c => c.id === courseId);
    };

    const clearSchedule = () => {
        setSelectedCourses([]);
    };

    const importCourses = (courses: Course[]) => {
        setSelectedCourses(courses);
    };

    return (
        <ScheduleContext.Provider value={{ selectedCourses, conflicts, addCourse, removeCourse, toggleCourse, isCourseSelected, clearSchedule, importCourses }}>
            {children}
        </ScheduleContext.Provider>
    );
}

export function useSchedule() {
    const context = useContext(ScheduleContext);
    if (context === undefined) {
        throw new Error('useSchedule must be used within a ScheduleProvider');
    }
    return context;
}

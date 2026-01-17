'use client';

import { useState, useEffect } from 'react';
import { Calendar, BookOpen, Settings, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import StepOneTerm from './StepOneTerm';
// StepTwoLevel removed
import StepTwoPlanning from './StepTwoPlanning';
import StepThreeConstraints from './StepThreeConstraints';
import StepFourResults from './StepFourResults';
import ScrollReveal from '@/components/ui/ScrollReveal';

export type WizardState = {
    termId: string;
    // level: string; // Removed
    mustCourses: string[]; // List of Course Codes
    selectiveGroups: {
        id: string;
        name: string;
        required: number;
        courses: string[]; // List of Course Codes
    }[];
    constraints: {
        freeDays: string[];
        noMorning: boolean;
    };
};

export default function Wizard() {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<WizardState>({
        termId: '',
        mustCourses: [],
        selectiveGroups: [],
        constraints: {
            freeDays: [],
            noMorning: false
        }
    });

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const updateData = (updates: Partial<WizardState>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const importWizardState = (state: WizardState) => {
        setData(state);
        // Skip to step 2 if term and courses are set
        if (state.termId && (state.mustCourses.length > 0 || state.selectiveGroups.length > 0)) {
            setStep(2);
        } else if (state.termId) {
            setStep(1); // Stay on step 1 but with term selected
        }
    };

    return (
        <div className="relative min-h-[700px] flex flex-col items-center">

            {/* Progress Bar (Floating Pill) */}
            <ScrollReveal>
                <div className="relative z-20 mb-8 p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-lg shadow-slate-200/50 border border-slate-200/50 inline-flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                    {[
                        { id: 1, label: 'Term', icon: Calendar },
                        { id: 2, label: 'Courses', icon: BookOpen },
                        { id: 3, label: 'Preferences', icon: Settings },
                        { id: 4, label: 'Schedule', icon: CheckCircle }
                    ].map((s) => (
                        <div
                            key={s.id}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${step >= s.id
                                ? step === s.id
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-blue-50 text-blue-600'
                                : 'text-slate-400'
                                }`}
                        >
                            <s.icon className={`w-4 h-4 ${step === s.id ? 'text-white' : step > s.id ? 'text-blue-500' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">{s.label}</span>
                        </div>
                    ))}
                </div>
            </ScrollReveal>

            {/* Main Content Card */}
            <ScrollReveal delay={200} className="w-full">
                <div className="w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100/50 overflow-hidden flex flex-col relative z-10 transition-all duration-500">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-sky-400"></div>

                    <div className="flex-1 p-6 sm:p-10 text-slate-900 overflow-hidden relative z-10">
                        <div className="relative z-10 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {step === 1 && <StepOneTerm selectedTerm={data.termId} onSelect={(id) => updateData({ termId: id })} onImport={importWizardState} />}

                            {step === 2 && <StepTwoPlanning
                                termId={data.termId}
                                data={data}
                                updateData={updateData}
                            />}

                            {step === 3 && <StepThreeConstraints value={data.constraints} onChange={(c) => updateData({ constraints: c })} />}
                            {step === 4 && <StepFourResults data={data} />}
                        </div>
                    </div>

                    {/* Footer / Navigation */}
                    <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center relative z-20 backdrop-blur-sm">
                        <button
                            onClick={prevStep}
                            disabled={step === 1}
                            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 font-bold text-sm shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={nextStep}
                                disabled={
                                    (step === 1 && !data.termId) ||
                                    (step === 2 && (data.mustCourses.length === 0 && data.selectiveGroups.length === 0))
                                }
                                className="group px-8 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-md active:scale-95"
                            >
                                Next Step <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </ScrollReveal>
        </div>
    );
}

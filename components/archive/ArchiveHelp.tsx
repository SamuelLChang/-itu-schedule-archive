'use client';

import { useState } from 'react';
import { HelpCircle, ChevronRight, Plus, Calendar } from 'lucide-react';
import InfoModal from '@/components/ui/InfoModal';

export default function ArchiveHelp() {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
                <HelpCircle className="w-4 h-4" />
                How it Works
            </button>

            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="How to use the Archive"
            >
                <div className="space-y-6">
                    <p className="text-slate-600">
                        The <strong>Course Archive</strong> lets you browse schedules from past semesters and build a mock schedule.
                    </p>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                            <div>
                                <h4 className="font-bold text-slate-900">Find Courses</h4>
                                <p className="text-slate-500 text-sm mt-1">
                                    Select a Term, Level (Undergraduate/Graduate), and Subject Code to view available classes.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
                            <div>
                                <h4 className="font-bold text-slate-900">Build Your Basket</h4>
                                <p className="text-slate-500 text-sm mt-1">
                                    Click the <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 text-xs font-bold mx-1"><Plus className="w-3 h-3 mr-1" /> Add</span> button on any course to add it to your global basket.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
                            <div>
                                <h4 className="font-bold text-slate-900">View Schedule & Conflicts</h4>
                                <p className="text-slate-500 text-sm mt-1">
                                    All added courses are sent to the <span className="font-bold text-slate-800">Calendar Page</span>.
                                    Go there to see your weekly schedule grid and check for specific time conflicts.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                        <strong>Tip:</strong> Your selected courses are saved automatically as you browse different subjects!
                    </div>
                </div>
            </InfoModal>
        </>
    );
}

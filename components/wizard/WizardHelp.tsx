'use client';

import { useState } from 'react';
import { HelpCircle, Sparkles, Sliders, List } from 'lucide-react';
import InfoModal from '@/components/ui/InfoModal';

export default function WizardHelp() {
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
                title="Using the Schedule Wizard"
            >
                <div className="space-y-6">
                    <p className="text-slate-600">
                        The <strong>Wizard</strong> automatically generates hundreds of possible non-conflicting schedules for you.
                    </p>

                    <ol className="relative border-l border-slate-200 ml-3 space-y-6">
                        <li className="ml-6">
                            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
                                <span className="text-blue-600 font-bold text-xs">1</span>
                            </span>
                            <h4 className="font-bold text-slate-900">Plan Courses</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Search and add courses. Mark them as <strong>Must</strong> (required) or create <strong>Selective Groups</strong> (e.g. "Pick 2 of 5 Electives").
                            </p>
                        </li>
                        <li className="ml-6">
                            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
                                <span className="text-blue-600 font-bold text-xs">2</span>
                            </span>
                            <h4 className="font-bold text-slate-900">Set Constraints</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Choose days you want free or strict hours to avoid (e.g. "No Morning Classes").
                            </p>
                        </li>
                        <li className="ml-6">
                            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
                                <span className="text-blue-600 font-bold text-xs">3</span>
                            </span>
                            <h4 className="font-bold text-slate-900">Generate & Pick</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                We'll find all valid combinations. Pick the one you like best and export it!
                            </p>
                        </li>
                    </ol>
                </div>
            </InfoModal>
        </>
    );
}

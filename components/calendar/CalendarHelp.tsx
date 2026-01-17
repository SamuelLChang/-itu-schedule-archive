'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import InfoModal from '@/components/ui/InfoModal';

export default function CalendarHelp() {
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
                title="Using the Calendar"
            >
                <div className="space-y-6">
                    <p className="text-slate-600">
                        The <strong>Calendar</strong> helps you visualize your weekly schedule and check for conflicts.
                    </p>

                    <ol className="relative border-l border-slate-200 ml-3 space-y-6">
                        <li className="ml-6">
                            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
                                <span className="text-blue-600 font-bold text-xs">1</span>
                            </span>
                            <h4 className="font-bold text-slate-900">Add Courses</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Search for courses in the sidebar and click to add them. They'll appear as <strong>colored blocks</strong> on the grid.
                            </p>
                        </li>
                        <li className="ml-6">
                            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
                                <span className="text-blue-600 font-bold text-xs">2</span>
                            </span>
                            <h4 className="font-bold text-slate-900">Check Conflicts</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                If two courses overlap, they will turn <span className="text-red-600 font-bold">RED</span> and you'll see an alert banner at the top.
                            </p>
                        </li>
                        <li className="ml-6">
                            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full ring-4 ring-white">
                                <span className="text-blue-600 font-bold text-xs">3</span>
                            </span>
                            <h4 className="font-bold text-slate-900">Export & Save</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Download your schedule as <strong>PNG</strong> or <strong>PDF</strong>, or export the configuration to reload it later.
                            </p>
                        </li>
                    </ol>
                </div>
            </InfoModal>
        </>
    );
}


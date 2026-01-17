
import Wizard from '@/components/wizard/Wizard';
import WizardHelp from '@/components/wizard/WizardHelp';

export default function WizardPage() {
    return (
        <div className="min-h-screen bg-[#F5F5F7] animate-in fade-in duration-500">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
                                Schedule <span className="text-blue-600">Wizard.</span>
                            </h1>
                            <WizardHelp />
                        </div>
                        <p className="mt-4 text-lg text-slate-500 max-w-2xl font-light leading-relaxed">
                            Automatically generate conflict-free schedules based on your selected courses and free days.
                        </p>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 pb-24">
                <Wizard />
            </main>
        </div>
    );
}

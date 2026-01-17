import { PrismaClient } from '@prisma/client';
import { Database, Calendar, Sparkles, Code, Github, Mail, User, Cpu, GitFork, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';

const prisma = new PrismaClient();

async function getStats() {
    const [termCount, courseCount] = await Promise.all([
        prisma.term.count(),
        prisma.course.count()
    ]);

    return {
        termCount,
        courseCount
    };
}

export default async function AboutPage() {
    const stats = await getStats();

    return (
        <div className="min-h-screen bg-[#F5F5F7] overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-6 py-24 sm:py-32">

                {/* Header */}
                <ScrollReveal className="text-center max-w-3xl mx-auto mb-24">
                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-slate-900 mb-8">
                        About <span className="text-blue-600">ITU Scheduler</span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-slate-500 leading-relaxed font-light">
                        A modern, open-source tool designed to help Istanbul Technical University students plan their semesters with ease.
                    </p>
                </ScrollReveal>

                {/* Features Grid (Bento Style) */}
                <div className="grid md:grid-cols-3 gap-6 mb-24">
                    <ScrollReveal delay={100} className="p-10 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-500 group">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                            <Database className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Historical Archive</h3>
                        <p className="text-lg text-slate-500 leading-relaxed font-light">
                            Access a comprehensive database of past schedules. Analyze trends and verify course details.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal delay={200} className="p-10 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-500 group">
                        <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mb-6 text-sky-600 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Smart Wizard</h3>
                        <p className="text-lg text-slate-500 leading-relaxed font-light">
                            Generate hundreds of conflict-free schedule combinations in seconds using our algorithm.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal delay={300} className="p-10 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-500 group">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                            <Calendar className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Interactive Calendar</h3>
                        <p className="text-lg text-slate-500 leading-relaxed font-light">
                            Visualize your week with a drag-and-drop ready interface. Export to PDF or Image.
                        </p>
                    </ScrollReveal>
                </div>

                {/* Statistics (Dark Mode Strip) */}
                <ScrollReveal delay={400} className="mb-24">
                    <div className="bg-slate-900 rounded-[2.5rem] p-12 sm:p-16 text-white overflow-hidden relative shadow-2xl shadow-slate-900/20">
                        {/* Decorational background elements */}
                        <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-1/2 -translate-y-1/2">
                            <Database className="w-80 h-80" />
                        </div>

                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-12 text-center sm:text-left">
                            <div>
                                <div className="text-5xl sm:text-6xl font-black text-blue-400 mb-2 tracking-tight">
                                    {stats.termCount}
                                </div>
                                <div className="text-lg text-slate-400 font-medium uppercase tracking-wider">Terms Archived</div>
                            </div>
                            <div>
                                <div className="text-5xl sm:text-6xl font-black text-emerald-400 mb-2 tracking-tight">
                                    {(stats.courseCount / 1000).toFixed(1)}k+
                                </div>
                                <div className="text-lg text-slate-400 font-medium uppercase tracking-wider">Total Courses</div>
                            </div>
                            <div>
                                <div className="text-5xl sm:text-6xl font-black text-amber-400 mb-2 tracking-tight">
                                    100%
                                </div>
                                <div className="text-lg text-slate-400 font-medium uppercase tracking-wider">Open Source</div>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>

                {/* Built with AI & For Developers */}
                <div className="grid md:grid-cols-2 gap-8 mb-24">
                    <ScrollReveal delay={500} className="bg-gradient-to-br from-white to-blue-50 p-10 rounded-[2.5rem] border border-blue-100 hover:shadow-xl transition-all duration-500">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 text-blue-600">
                            <Cpu className="w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 mb-4">Built with <span className="text-blue-600">AI</span></h3>
                        <p className="text-lg text-slate-600 leading-relaxed mb-6 font-light">
                            This entire platform was architected and coded using <strong>Google Antigravity</strong>. It serves as a demonstration of the power of AI-assisted software engineering.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal delay={600} className="bg-white p-10 rounded-[2.5rem] border border-slate-200/50 shadow-lg shadow-slate-200/30 hover:shadow-xl transition-all duration-500">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl shadow-sm flex items-center justify-center mb-6 text-slate-700">
                            <GitFork className="w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 mb-4">For Developers</h3>
                        <p className="text-lg text-slate-600 leading-relaxed mb-6 font-light">
                            The codebase is fully open-source. We encourage developers to fork the repository and adapt it for their own university's schedule system.
                        </p>
                        <a href="#" className="inline-flex items-center text-slate-900 font-semibold text-lg hover:text-blue-600 transition-colors">
                            View on GitHub <ArrowRight className="w-5 h-5 ml-2" />
                        </a>
                    </ScrollReveal>
                </div>

                {/* Developer Info */}
                <ScrollReveal delay={700}>
                    <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 border-t border-slate-200 pt-16 max-w-4xl mx-auto">
                        <div className="flex-shrink-0">
                            <div className="w-40 h-40 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-300 border-4 border-white">
                                <User className="w-20 h-20" />
                            </div>
                        </div>
                        <div className="flex-grow text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
                                Creator
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-2">Samuel L. Chang</h2>
                            <h3 className="text-blue-600 text-xl mb-6 font-medium">ITU Student</h3>

                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <a href="#" className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all shadow-lg hover:shadow-xl active:scale-95 font-medium">
                                    <Github className="w-5 h-5" />
                                    GitHub
                                </a>
                                <a href="#" className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full transition-all shadow-sm hover:shadow-md active:scale-95 font-medium">
                                    <Mail className="w-5 h-5" />
                                    Contact
                                </a>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </div>
    );
}

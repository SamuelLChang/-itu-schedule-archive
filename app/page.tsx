'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Database, Sparkles, ArrowRight, BookOpen, GitFork, Cpu } from 'lucide-react';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-100/30 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-slate-100/30 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 sm:py-32 flex flex-col items-center">

        {/* Hero Section */}
        <ScrollReveal className="text-center max-w-3xl mx-auto mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 backdrop-blur-md border border-white/60 shadow-sm text-xs font-medium text-slate-500 mb-8 hover:bg-white/80 transition-colors cursor-default">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            Updated for Spring 2025
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1]">
            ITU Course <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">Archive & Planner.</span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-500 leading-relaxed font-light mb-12 max-w-2xl mx-auto">
            The modern, AI-powered planner for Istanbul Technical University students. Built to be fast, beautiful, and open.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/wizard" className="group relative px-8 py-4 bg-slate-900 text-white rounded-full text-lg font-medium transition-all hover:scale-105 hover:bg-slate-800 shadow-xl shadow-slate-900/20 active:scale-95">
              Start Wizard
              <Sparkles className="inline-block w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
            </Link>
            <Link href="/archive" className="px-8 py-4 bg-white/50 backdrop-blur-md text-slate-900 rounded-full text-lg font-medium transition-all hover:bg-white hover:scale-105 border border-white/60 shadow-lg shadow-black/5 active:scale-95">
              Browse Archive
            </Link>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">

          {/* Card 1: Archive (Large) */}
          <ScrollReveal delay={100} className="md:col-span-2 relative group overflow-hidden rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-200/50 hover:shadow-3xl hover:shadow-slate-200/80 transition-all duration-500 h-[400px] flex flex-col justify-between border border-slate-100">
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 transform translate-x-12 -translate-y-12">
              <Database className="w-64 h-64" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform duration-500">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-2">Course Archive</h3>
              <p className="text-lg text-slate-500 max-w-md">Access detailed data from past semesters. Analyze trends and plan ahead.</p>
            </div>
            <div className="relative z-10 mt-8">
              <Link href="/archive" className="inline-flex items-center text-blue-600 font-semibold text-lg group-hover:translate-x-2 transition-transform">
                Explore Archive <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            {/* Decorative UI elements mimicking a table */}
            <div className="absolute right-[-20px] bottom-[-20px] w-[60%] h-[70%] bg-slate-50 border border-slate-200 rounded-tl-3xl p-6 shadow-inner opacity-50 group-hover:translate-x-[-10px] group-hover:translate-y-[-10px] transition-transform duration-700 ease-out">
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 w-3/4 rounded animate-pulse"></div>
                <div className="h-4 bg-slate-200 w-1/2 rounded animate-pulse delay-75"></div>
                <div className="h-4 bg-slate-200 w-full rounded animate-pulse delay-150"></div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Wizard (Tall) */}
          <ScrollReveal delay={200} className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-sky-500 p-10 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-500 h-[400px] flex flex-col text-white">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-t from-transparent via-white/10 to-transparent rotate-45 translate-y-[100%] group-hover:translate-y-[-100%] transition-transform duration-[1000ms] ease-in-out"></div>

            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center text-white mb-6 group-hover:rotate-12 transition-transform duration-500">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-bold mb-2">Schedule Wizard</h3>
              <p className="text-blue-100 text-lg">AI-powered generation. Hundreds of possibilities in seconds.</p>
            </div>
            <div className="mt-auto relative z-10">
              <Link href="/wizard" className="inline-flex items-center text-white font-semibold text-lg group-hover:translate-x-2 transition-transform">
                Launch Wizard <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </ScrollReveal>

          {/* Card 3: For Developers */}
          <ScrollReveal delay={300} className="order-4 lg:order-3 relative group overflow-hidden rounded-[2.5rem] bg-slate-900 p-10 shadow-2xl shadow-slate-900/20 hover:shadow-slate-900/30 transition-all duration-500 h-[300px] flex flex-col justify-between text-white md:col-span-1 border border-slate-700">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 mb-6">
                <GitFork className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Open Source</h3>
              <p className="text-slate-400">Fork on GitHub. Adapt for your campus.</p>
            </div>
            <div className="relative z-10">
              <Link href="/about" className="inline-flex items-center text-slate-300 hover:text-white font-semibold group-hover:translate-x-2 transition-transform">
                Learn More <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </ScrollReveal>

          {/* Card 4: Built with AI */}
          <ScrollReveal delay={400} className="order-3 lg:order-4 md:col-span-2 relative group overflow-hidden rounded-[2.5rem] bg-white p-10 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:scale-[1.01] transition-all duration-500 h-[300px] flex items-center justify-between border border-slate-100">
            <div className="max-w-md relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4">
                <Cpu className="w-3 h-3" /> Powered by AI
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-2">Built with Google Antigravity</h3>
              <p className="text-lg text-slate-500">Architected and coded using the next generation of AI development tools.</p>
            </div>
            <div className="relative z-0 hidden sm:block">
              <Cpu className="w-40 h-40 text-slate-50 group-hover:text-blue-50 transition-colors duration-500" />
            </div>
          </ScrollReveal>

        </div>
      </div>

      <footer className="text-center py-12 text-slate-400 text-sm">
        <p>&copy; 2025 ITU Scheduler. Not affiliated with Istanbul Technical University.</p>
      </footer>
    </main>
  );
}

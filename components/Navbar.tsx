
'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSchedule } from '@/context/ScheduleContext';
import { Calendar } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const { selectedCourses } = useSchedule();

    const links = [
        { href: '/', label: 'Home' },
        { href: '/archive', label: 'Archive' },
        { href: '/wizard', label: 'Wizard' },
        { href: '/calendar', label: 'Calendar' },
        { href: '/about', label: 'About' },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="font-bold text-xl text-slate-800 font-display tracking-tight flex items-center gap-2">
                            ITU Scheduler
                        </Link>
                    </div>

                    <div className="hidden sm:flex sm:space-x-8">
                        {links.map(link => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${isActive
                                        ? 'border-blue-500 text-slate-900'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/calendar" className="relative p-2 text-slate-500 hover:text-blue-600 transition-colors">
                            <Calendar className="w-5 h-5" />
                            {selectedCourses.length > 0 && (
                                <span className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                            )}
                        </Link>

                        {/* Mobile menu button */}
                        <div className="sm:hidden flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            >
                                <span className="sr-only">Open main menu</span>
                                {/* Icon when menu is closed. */}
                                {/* Heroicon name: outline/menu */}
                                {!isMobileMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    /* Icon when menu is open. */
                                    /* Heroicon name: outline/x */
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state. */}
            {isMobileMenuOpen && (
                <div className="sm:hidden bg-white border-b border-slate-200">
                    <div className="pt-2 pb-3 space-y-1">
                        {links.map(link => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive
                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                        : 'border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface ModernSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    label?: string;
    searchable?: boolean;
}

export default function ModernSelect({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    disabled = false,
    className = '',
    label,
    searchable = false
}: ModernSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const term = searchTerm.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(term) ||
            opt.value.toLowerCase().includes(term)
        );
    }, [options, searchTerm]);

    // Reset highlighted index when filtered options change
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredOptions]);

    // Calculate position on open
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 200) // Ensure minimum width for search
            });
            // Focus search input when opened
            if (searchable) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }
        }
    }, [isOpen, searchable]);

    // Reset search when closing
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setHighlightedIndex(0);
        }
    }, [isOpen]);

    // Close on resize to avoid misalignment
    useEffect(() => {
        const handleResize = () => setIsOpen(false);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Backdrop click handler
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = () => setIsOpen(false);
        // Delay to avoid immediate close from trigger click bubbling
        setTimeout(() => window.addEventListener('click', handleClick), 0);
        return () => window.removeEventListener('click', handleClick);
    }, [isOpen]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const highlightedButton = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedButton) {
                highlightedButton.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    // Auto-search: enable searchable for long lists
    const shouldSearch = searchable || options.length > 10;

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    {label}
                </label>
            )}

            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    if (disabled) return;
                    e.stopPropagation(); // Prevent immediate close
                    setIsOpen(!isOpen);
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl sm:rounded-2xl border text-sm font-semibold transition-all duration-200 outline-none
                ${disabled
                        ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                        : isOpen
                            ? 'bg-white border-blue-500 ring-4 ring-blue-500/10 text-slate-900 shadow-md'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-700 hover:border-blue-300 shadow-sm'
                    }`}
            >
                <span className={`truncate ${!selectedOption ? 'text-slate-400 font-normal' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="absolute z-[9999] overflow-hidden bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl shadow-slate-200/50 animate-zoom-in origin-top"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        width: coords.width
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
                    onKeyDown={handleKeyDown}
                >
                    {/* Search Input */}
                    {shouldSearch && (
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Type to search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <div ref={listRef} className="max-h-[250px] overflow-y-auto custom-scrollbar p-1.5">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, idx) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                                    ${option.value === value
                                            ? 'bg-blue-50 text-blue-700'
                                            : idx === highlightedIndex
                                                ? 'bg-slate-100 text-slate-900'
                                                : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="truncate text-left">{option.label}</span>
                                    {option.value === value && (
                                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium">
                                No options match "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

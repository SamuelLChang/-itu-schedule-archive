'use client';

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Course } from './scheduler';

// File format version
const FORMAT_VERSION = '1.0';

// Types for export data
export interface ITUSchedData {
    version: string;
    exportedAt: string;
    type: 'calendar' | 'wizard';
    termId?: string;
    courses: Course[];
    wizardState?: {
        termId: string;
        mustCourses: string[];
        selectiveGroups: {
            id: string;
            name: string;
            required: number;
            courses: string[];
        }[];
        constraints: {
            freeDays: string[];
            noMorning: boolean;
        };
    };
}

// Metadata key for PNG tEXt chunk (we'll encode in base64 comment)
const METADATA_MARKER = 'ITU_SCHED_DATA:';

/**
 * UTF-8 safe base64 encoding (handles Turkish and other Unicode characters)
 */
function utf8ToBase64(str: string): string {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
    ));
}

/**
 * UTF-8 safe base64 decoding
 */
function base64ToUtf8(str: string): string {
    return decodeURIComponent(
        atob(str).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
    );
}

// ============================================================================
// CANVAS-BASED CALENDAR RENDERING
// This bypasses all DOM/CSS complexity by rendering directly to a canvas
// ============================================================================

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_MAP: Record<string, string> = {
    'Pazartesi': 'Monday',
    'Salı': 'Tuesday',
    'Çarşamba': 'Wednesday',
    'Perşembe': 'Thursday',
    'Cuma': 'Friday'
};

// Unified color palette - Distinctive vibrant pastels matching website design
const EVENT_COLORS = [
    { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }, // Blue
    { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' }, // Purple
    { bg: '#D1FAE5', border: '#10B981', text: '#065F46' }, // Emerald
    { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }, // Amber
    { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' }, // Pink
    { bg: '#CFFAFE', border: '#06B6D4', text: '#155E75' }, // Cyan
    { bg: '#FFEDD5', border: '#F97316', text: '#C2410C' }, // Orange
    { bg: '#E0E7FF', border: '#6366F1', text: '#3730A3' }, // Indigo
    { bg: '#CCFBF1', border: '#14B8A6', text: '#115E59' }, // Teal
    { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }, // Red
    { bg: '#FEF9C3', border: '#EAB308', text: '#854D0E' }, // Yellow
    { bg: '#F1F5F9', border: '#64748B', text: '#334155' }, // Slate
];

interface ParsedEvent {
    day: string;
    startMin: number;
    endMin: number;
    code: string;
    title: string;
    crn: string;
    instructor: string;
    building: string;
    rooms: string;
    timeText: string;
}

function parseCoursesToEvents(courses: Course[]): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    for (const course of courses) {
        if (!course.days || !course.times) continue;

        // Split days, times, buildings, and rooms
        // We handle them in parallel if their counts match, or default to first/all
        const days = course.days.split(',').map(d => d.trim());
        const times = course.times.split(',').map(t => t.trim());

        // Handle potentially multiple locations/rooms
        const buildings = (course.building || '').split(',').map(b => b.trim());
        const rooms = (course.rooms || '').split(',').map(r => r.trim()); // Assuming rooms are also comma-separated

        const maxLen = Math.max(days.length, times.length);

        for (let i = 0; i < maxLen; i++) {
            const day = days[i] || days[days.length - 1];
            const timeStr = times[i] || times[times.length - 1];

            // Get location for this specific slot
            // If we have fewer locations than slots, logic depends:
            // - If 1 location, use it for all.
            // - If lists match length (e.g. 2 days, 2 rooms), map 1-to-1.
            // - If mismatch (e.g. 3 days, 2 rooms), heuristic needed? 
            //   Standard behavior: align with days usually. 
            //   Safest: use index if exists, else generic or last? 
            //   Common pattern: "Mon, Wed" "10:30, 10:30" "FEB, FEB" "D1, D2"

            // NOTE: buildings[i] might be undefined if buildings.length < maxLen. 
            // Fallback to buildings[0] if it exists? Or empty.
            // If building string was NOT comma separated (just "FEB"), then length is 1.
            // So buildings[i] works for i=0 to N if length matches. 
            // If length is 1, we want to reuse it.

            let building = buildings[i];
            if (building === undefined) {
                // If we ran out, strictly use the last one available? Or the first?
                // If the user entered "FEB" (length 1), it should apply to all.
                // If "FEB, FEB" (length 2) for 3 days... maybe reuse last?
                building = buildings.length === 1 ? buildings[0] : (buildings[buildings.length - 1] || '');
            }

            let room = rooms[i];
            if (room === undefined) {
                room = rooms.length === 1 ? rooms[0] : (rooms[rooms.length - 1] || '');
            }

            if (!day || !timeStr) continue;

            const [startStr, endStr] = timeStr.split(/[-\/]/);
            if (!startStr || !endStr) continue;

            const parseMin = (t: string) => {
                const parts = t.split(':').map(Number);
                if (parts.length < 2) return 0;
                return parts[0] * 60 + parts[1];
            };

            events.push({
                day: DAY_MAP[day] || day,
                startMin: parseMin(startStr),
                endMin: parseMin(endStr),
                code: course.code,
                title: course.title,
                crn: course.crn,
                instructor: course.instructor || '',
                building: building || '',
                rooms: room || '',
                timeText: `${startStr}-${endStr}`
            });
        }
    }

    return events;
}

interface RenderContext {
    width: number;
    height: number;
    rect(x: number, y: number, w: number, h: number, options?: { fill?: string, stroke?: string, strokeWidth?: number }): void;
    line(x1: number, y1: number, x2: number, y2: number, options?: { stroke?: string, strokeWidth?: number }): void;
    text(str: string, x: number, y: number, options?: {
        color?: string,
        size?: number,
        align?: 'left' | 'center' | 'right',
        font?: 'sans-serif' | 'monospace',
        bold?: boolean,
        opacity?: number
    }): void;
    measureText(str: string, size?: number, font?: 'sans-serif' | 'monospace', bold?: boolean): number;
}

class CanvasRenderer implements RenderContext {
    constructor(private ctx: CanvasRenderingContext2D, public width: number, public height: number) { }

    rect(x: number, y: number, w: number, h: number, opts?: { fill?: string, stroke?: string, strokeWidth?: number }) {
        if (opts?.fill) {
            this.ctx.fillStyle = opts.fill;
            this.ctx.fillRect(x, y, w, h);
        }
        if (opts?.stroke) {
            this.ctx.strokeStyle = opts.stroke;
            this.ctx.lineWidth = opts.strokeWidth || 1;
            this.ctx.strokeRect(x, y, w, h);
        }
    }

    line(x1: number, y1: number, x2: number, y2: number, opts?: { stroke?: string, strokeWidth?: number }) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        if (opts?.stroke) this.ctx.strokeStyle = opts.stroke;
        if (opts?.strokeWidth) this.ctx.lineWidth = opts.strokeWidth;
        this.ctx.stroke();
    }

    text(str: string, x: number, y: number, opts?: { color?: string, size?: number, align?: 'left' | 'center' | 'right', font?: 'sans-serif' | 'monospace', bold?: boolean, opacity?: number }) {
        this.ctx.fillStyle = opts?.color || '#000000';
        const weight = opts?.bold ? 'bold ' : '';
        const family = opts?.font === 'monospace' ? 'Monaco, monospace' : 'Inter, system-ui, sans-serif';
        this.ctx.font = `${weight}${opts?.size || 10}px ${family}`;
        this.ctx.textAlign = opts?.align || 'left';
        if (opts?.opacity !== undefined) this.ctx.globalAlpha = opts.opacity;
        this.ctx.fillText(str, x, y);
        this.ctx.globalAlpha = 1;
    }

    measureText(str: string, size?: number, font?: 'sans-serif' | 'monospace', bold?: boolean): number {
        const weight = bold ? 'bold ' : '';
        const family = font === 'monospace' ? 'Monaco, monospace' : 'Inter, system-ui, sans-serif';
        this.ctx.font = `${weight}${size || 10}px ${family}`;
        return this.ctx.measureText(str).width;
    }
}

class SvgRenderer implements RenderContext {
    private buffer = '';

    constructor(public width: number, public height: number) { }

    getSvgString(): string {
        return this.buffer;
    }

    private escape(str: string): string {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    rect(x: number, y: number, w: number, h: number, opts?: { fill?: string, stroke?: string, strokeWidth?: number }) {
        let attrs = `x="${x}" y="${y}" width="${w}" height="${h}"`;
        if (opts?.fill) attrs += ` fill="${opts.fill}"`; else attrs += ` fill="none"`;
        if (opts?.stroke) attrs += ` stroke="${opts.stroke}" stroke-width="${opts.strokeWidth || 1}"`;
        this.buffer += `<rect ${attrs} />\n`;
    }

    line(x1: number, y1: number, x2: number, y2: number, opts?: { stroke?: string, strokeWidth?: number }) {
        let attrs = `x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`;
        if (opts?.stroke) attrs += ` stroke="${opts.stroke}" stroke-width="${opts.strokeWidth || 1}"`;
        this.buffer += `<line ${attrs} />\n`;
    }

    text(str: string, x: number, y: number, opts?: { color?: string, size?: number, align?: 'left' | 'center' | 'right', font?: 'sans-serif' | 'monospace', bold?: boolean, opacity?: number }) {
        let attrs = `x="${x}" y="${y}" fill="${opts?.color || '#000000'}"`;
        attrs += ` font-size="${opts?.size || 10}"`;

        let family = 'system-ui, sans-serif';
        if (opts?.font === 'monospace') family = 'monospace';

        attrs += ` font-family="${family}"`;

        if (opts?.bold) attrs += ` font-weight="bold"`;

        const anchor = opts?.align === 'center' ? 'middle' : opts?.align === 'right' ? 'end' : 'start';
        attrs += ` text-anchor="${anchor}"`;

        if (opts?.opacity !== undefined) attrs += ` opacity="${opts.opacity}"`;

        this.buffer += `<text ${attrs}>${this.escape(str)}</text>\n`;
    }

    // Rough estimation for SVG
    measureText(str: string, size?: number, font?: 'sans-serif' | 'monospace', bold?: boolean): number {
        // Average char width factor
        const factor = font === 'monospace' ? 0.6 : 0.55;
        // Bolding adds slight width
        const boldFactor = bold ? 1.1 : 1.0;
        return str.length * (size || 10) * factor * boldFactor;
    }
}

class PdfRenderer implements RenderContext {
    constructor(private doc: jsPDF, public width: number, public height: number) { }

    rect(x: number, y: number, w: number, h: number, opts?: { fill?: string, stroke?: string, strokeWidth?: number }) {
        const style = (opts?.fill && opts?.stroke) ? 'FD' : opts?.fill ? 'F' : 'S';
        if (opts?.fill) this.doc.setFillColor(opts.fill);
        if (opts?.stroke) {
            this.doc.setDrawColor(opts.stroke);
            this.doc.setLineWidth(opts.strokeWidth || 1);
        }
        this.doc.rect(x, y, w, h, style);
    }

    line(x1: number, y1: number, x2: number, y2: number, opts?: { stroke?: string, strokeWidth?: number }) {
        if (opts?.stroke) {
            this.doc.setDrawColor(opts.stroke);
            this.doc.setLineWidth(opts.strokeWidth || 1);
        }
        this.doc.line(x1, y1, x2, y2);
    }

    text(str: string, x: number, y: number, opts?: { color?: string, size?: number, align?: 'left' | 'center' | 'right', font?: 'sans-serif' | 'monospace', bold?: boolean, opacity?: number }) {
        this.doc.setTextColor(opts?.color || '#000000');
        this.doc.setFontSize(opts?.size || 10);

        // We use Roboto for everything to ensure Turkish character support
        // because standard PDF fonts (Helvetica/Courier) don't support UTF-8 well.
        const fontName = 'Roboto';
        const fontStyle = opts?.bold ? 'bold' : 'normal';
        this.doc.setFont(fontName, fontStyle);

        const align = opts?.align || 'left';
        this.doc.text(str, x, y, { align });
    }

    measureText(str: string, size?: number, font?: 'sans-serif' | 'monospace', bold?: boolean): number {
        this.doc.setFontSize(size || 10);
        const fontName = 'Roboto';
        const fontStyle = bold ? 'bold' : 'normal';
        this.doc.setFont(fontName, fontStyle);
        return this.doc.getTextWidth(str);
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function drawCalendar(courses: Course[], renderer: RenderContext) {
    const events = parseCoursesToEvents(courses);

    // Config
    const HEADER_HEIGHT = 40;
    const TIME_COL_WIDTH = 60;
    const DAY_WIDTH = 160;
    const HOUR_HEIGHT = 50;
    const START_HOUR = 8.5;

    // Dynamic End Hour Calculation (Sync with UI)
    const maxEventEnd = events.reduce((max, ev) => Math.max(max, ev.endMin), 0);
    const maxEventHour = maxEventEnd > 0 ? maxEventEnd / 60 : 17.5;
    const END_HOUR = Math.max(17.5, Math.ceil(maxEventHour - 0.5) + 0.5);

    const TOTAL_HOURS = END_HOUR - START_HOUR;

    const width = renderer.width;
    // We assume renderer is sized correctly by caller

    // Background
    renderer.rect(0, 0, width, renderer.height, { fill: '#ffffff' });

    // Header row
    renderer.rect(0, 0, width, HEADER_HEIGHT, { fill: '#f8fafc' });
    renderer.line(0, HEADER_HEIGHT, width, HEADER_HEIGHT, { stroke: '#e2e8f0' });

    // Day headers
    for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
        const x = TIME_COL_WIDTH + (i * DAY_WIDTH) + (DAY_WIDTH / 2);
        renderer.text(DAYS_OF_WEEK[i].toUpperCase(), x, HEADER_HEIGHT / 2 + 4, {
            color: '#64748b', size: 12, font: 'sans-serif', bold: true, align: 'center'
        });
    }

    // Time labels
    for (let h = 0; h <= TOTAL_HOURS; h++) {
        const hour = Math.floor(START_HOUR + h);
        const y = HEADER_HEIGHT + (h * HOUR_HEIGHT);
        renderer.text(`${hour.toString().padStart(2, '0')}:30`, TIME_COL_WIDTH - 8, y + 4, {
            color: '#94a3b8', size: 10, font: 'monospace', align: 'right'
        });

        // Horizontal grid line
        renderer.line(TIME_COL_WIDTH, y, width, y, { stroke: '#f1f5f9' });
    }

    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
        const x = TIME_COL_WIDTH + (i * DAY_WIDTH);
        renderer.line(x, HEADER_HEIGHT, x, renderer.height, { stroke: '#f1f5f9' });
    }

    // Draw events
    for (let eventIdx = 0; eventIdx < events.length; eventIdx++) {
        const event = events[eventIdx];
        const dayIndex = DAYS_OF_WEEK.indexOf(event.day);
        if (dayIndex === -1) continue;

        const colorIdx = (parseInt(event.crn) || eventIdx) % EVENT_COLORS.length;
        const colors = EVENT_COLORS[colorIdx];

        const x = TIME_COL_WIDTH + (dayIndex * DAY_WIDTH) + 2;
        const dayStartMin = 8 * 60 + 30; // 08:30
        const startOffset = (event.startMin - dayStartMin) / 60;
        const duration = (event.endMin - event.startMin) / 60;

        const y = HEADER_HEIGHT + (startOffset * HOUR_HEIGHT) + 1;
        const eventHeight = Math.max(duration * HOUR_HEIGHT - 2, 30);
        const eventWidth = DAY_WIDTH - 4;

        // Event background
        renderer.rect(x, y, eventWidth, eventHeight, { fill: colors.bg });

        // Left border accent
        renderer.rect(x, y, 4, eventHeight, { fill: colors.border });

        // Event text
        const padding = 8;
        const textX = x + padding;
        const maxTextWidth = eventWidth - padding * 2;

        // Truncate helper
        const trunc = (txt: string, w: number, font: 'sans-serif' | 'monospace', bold: boolean, size: number) => {
            if (renderer.measureText(txt, size, font, bold) <= w) return txt;
            let val = txt;
            while (val.length > 0 && renderer.measureText(val + '...', size, font, bold) > w) {
                val = val.slice(0, -1);
            }
            return val + '...';
        };

        // Course code (bold)
        const codeText = trunc(event.code, maxTextWidth - 50, 'sans-serif', true, 11);
        renderer.text(codeText, textX, y + 14, { color: colors.text, size: 11, font: 'sans-serif', bold: true });

        // CRN
        renderer.text(event.crn, x + eventWidth - padding, y + 14, {
            color: colors.text, size: 9, font: 'monospace', align: 'right', opacity: 0.7
        });

        // Title
        if (eventHeight >= 45) {
            const titleText = trunc(event.title, maxTextWidth, 'sans-serif', false, 10);
            renderer.text(titleText, textX, y + 28, { color: colors.text, size: 10, font: 'sans-serif' });
        }

        // Instructor
        if (eventHeight >= 60) {
            const instructorText = trunc(event.instructor, maxTextWidth, 'sans-serif', false, 9);
            renderer.text(instructorText, textX, y + 40, { color: colors.text, size: 9, font: 'sans-serif', opacity: 0.8 });
        }

        // Time and building (bottom)
        if (eventHeight >= 50) {
            renderer.text(event.timeText, textX, y + eventHeight - 6, {
                color: colors.text, size: 9, font: 'monospace', opacity: 0.7
            });

            const locationText = trunc(`${event.building} ${event.rooms}`.trim(), 50, 'sans-serif', true, 9);
            renderer.text(locationText, x + eventWidth - padding, y + eventHeight - 6, {
                color: colors.text, size: 9, font: 'sans-serif', bold: true, align: 'right'
            });
        }
    }
}

/**
 * Render to Canvas (Wrapper)
 */
function renderCalendarToCanvas(courses: Course[], scale = 2): HTMLCanvasElement {
    const HEADER_HEIGHT = 40;
    const TIME_COL_WIDTH = 60;
    const DAY_WIDTH = 160;
    const HOUR_HEIGHT = 50;
    const START_HOUR = 8.5;

    // Dynamic End Hour Calculation
    const events = parseCoursesToEvents(courses);
    const maxEventEnd = events.reduce((max, ev) => Math.max(max, ev.endMin), 0);
    const maxEventHour = maxEventEnd > 0 ? maxEventEnd / 60 : 17.5;
    const END_HOUR = Math.max(17.5, Math.ceil(maxEventHour - 0.5) + 0.5);
    const TOTAL_HOURS = END_HOUR - START_HOUR;

    const width = TIME_COL_WIDTH + (DAY_WIDTH * 5) + 20;
    const height = HEADER_HEIGHT + (TOTAL_HOURS * HOUR_HEIGHT) + 20;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    const renderer = new CanvasRenderer(ctx, width, height);
    drawCalendar(courses, renderer);
    return canvas;
}

/**
 * Render to SVG String (Wrapper)
 */
function renderCalendarToSVG(courses: Course[]): string {
    const HEADER_HEIGHT = 40;
    const TIME_COL_WIDTH = 60;
    const DAY_WIDTH = 160;
    const HOUR_HEIGHT = 50;
    const START_HOUR = 8.5;

    // Dynamic End Hour Calculation
    const events = parseCoursesToEvents(courses);
    const maxEventEnd = events.reduce((max, ev) => Math.max(max, ev.endMin), 0);
    const maxEventHour = maxEventEnd > 0 ? maxEventEnd / 60 : 17.5;
    const END_HOUR = Math.max(17.5, Math.ceil(maxEventHour - 0.5) + 0.5);
    const TOTAL_HOURS = END_HOUR - START_HOUR;

    const width = TIME_COL_WIDTH + (DAY_WIDTH * 5) + 20;
    const height = HEADER_HEIGHT + (TOTAL_HOURS * HOUR_HEIGHT) + 20;

    const renderer = new SvgRenderer(width, height);
    drawCalendar(courses, renderer);
    return renderer.getSvgString();
}

/**
 * Render to PDF (Wrapper)
 */
function renderCalendarToPDF(courses: Course[], doc: jsPDF) {
    const HEADER_HEIGHT = 40;
    const TIME_COL_WIDTH = 60;
    const DAY_WIDTH = 160;
    const HOUR_HEIGHT = 50;
    const START_HOUR = 8.5;

    // Dynamic End Hour Calculation
    const events = parseCoursesToEvents(courses);
    const maxEventEnd = events.reduce((max, ev) => Math.max(max, ev.endMin), 0);
    const maxEventHour = maxEventEnd > 0 ? maxEventEnd / 60 : 17.5;
    const END_HOUR = Math.max(17.5, Math.ceil(maxEventHour - 0.5) + 0.5);
    const TOTAL_HOURS = END_HOUR - START_HOUR;

    const width = TIME_COL_WIDTH + (DAY_WIDTH * 5) + 20;
    const height = HEADER_HEIGHT + (TOTAL_HOURS * HOUR_HEIGHT) + 20;

    const renderer = new PdfRenderer(doc, width, height);
    drawCalendar(courses, renderer);
}

/**
 * Helper to convert any valid CSS color string to a standard RGB/RGBA format
 * This is necessary because html2canvas doesn't support modern color formats like lab/oklch
 * which are the default in Tailwind CSS v4
 */
let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

function sanitizeColor(color: string): string {
    if (!color || color === 'none' || color === 'transparent') return color;

    // Check if it's already a safe format (hex, rgb, rgba, named colors)
    // and doesn't contain modern functions
    if (!color.includes('lab(') && !color.includes('oklch(') &&
        !color.includes('lch(') && !color.includes('oklab(')) {
        return color;
    }

    try {
        if (!colorCanvas) {
            colorCanvas = document.createElement('canvas');
            colorCanvas.width = 1;
            colorCanvas.height = 1;
            colorCtx = colorCanvas.getContext('2d');
        }

        if (colorCtx) {
            colorCtx.fillStyle = color;
            // The browser will convert the color to resolved RGB/RGBA string
            // even if the input was lab/oklch (if browser supports it)
            return colorCtx.fillStyle;
        }
    } catch (e) {
        console.warn('Failed to sanitize color:', color);
    }

    return color;
}

/**
 * Handle complex values that might contain colors (like gradients, box-shadows)
 */
function convertComplexColors(value: string): string {
    if (!value) return value;

    // Regex to match modern color functions: lab(...), oklch(...), etc.
    // Matches nested parentheses to some extent
    const modernColorRegex = /(?:lab|oklch|lch|oklab)\([^)]+\)/g;

    if (value.match(modernColorRegex)) {
        return value.replace(modernColorRegex, (match) => sanitizeColor(match));
    }

    return value;
}

/**
 * Copy computed styles from source element to target element
 * This ensures the target looks identical even without stylesheets
 */
/**
 * Export course schedule to an image format
 */
export async function exportToImage(
    courses: Course[],
    format: 'png' | 'jpg' | 'svg',
    filename: string,
    metadata?: ITUSchedData
): Promise<void> {

    if (format === 'svg') {
        // High-Quality Vector Export
        const svgBody = renderCalendarToSVG(courses);

        // We know dimensions from the same constants used in render
        const HEADER_HEIGHT = 40;
        const TIME_COL_WIDTH = 60;
        const DAY_WIDTH = 160;
        const HOUR_HEIGHT = 50;
        const START_HOUR = 8.5;

        // Dynamic End Hour Calculation
        const events = parseCoursesToEvents(courses);
        const maxEventEnd = events.reduce((max, ev) => Math.max(max, ev.endMin), 0);
        const maxEventHour = maxEventEnd > 0 ? maxEventEnd / 60 : 17.5;
        const END_HOUR = Math.max(17.5, Math.ceil(maxEventHour - 0.5) + 0.5);
        const TOTAL_HOURS = END_HOUR - START_HOUR;

        const width = TIME_COL_WIDTH + (DAY_WIDTH * 5) + 20;
        const height = HEADER_HEIGHT + (TOTAL_HOURS * HOUR_HEIGHT) + 20;

        const metadataStr = metadata ? `<!-- ${METADATA_MARKER + utf8ToBase64(JSON.stringify(metadata))} -->` : '';

        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${metadataStr}
    <rect width="${width}" height="${height}" fill="white"/>
    ${svgBody}
</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        saveAs(blob, `${filename}.svg`);
        return;
    }

    // High-Res Raster Export (Scale 4 for sharp text)
    const canvas = renderCalendarToCanvas(courses, 4);
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.95));

    if (blob) {
        if (metadata && format === 'png') {
            const embeddedBlob = await embedMetadataInPNG(blob, metadata);
            saveAs(embeddedBlob, `${filename}.${format}`);
        } else {
            saveAs(blob, `${filename}.${format}`);
        }
    }
}

/**
 * Export course schedule to PDF
 */
export async function exportToPDF(
    courses: Course[],
    filename: string,
    metadata?: ITUSchedData
): Promise<void> {
    // Generate PDF directly using vector commands

    // We need to calculate dimensions to set up doc
    const HEADER_HEIGHT = 40;
    const TIME_COL_WIDTH = 60;
    const DAY_WIDTH = 160;
    const HOUR_HEIGHT = 50;
    const START_HOUR = 8.5;

    // Dynamic End Hour Calculation
    const events = parseCoursesToEvents(courses);
    const maxEventEnd = events.reduce((max, ev) => Math.max(max, ev.endMin), 0);
    const maxEventHour = maxEventEnd > 0 ? maxEventEnd / 60 : 17.5;
    const END_HOUR = Math.max(17.5, Math.ceil(maxEventHour - 0.5) + 0.5);
    const TOTAL_HOURS = END_HOUR - START_HOUR;

    const widthPx = TIME_COL_WIDTH + (DAY_WIDTH * 5) + 20;
    const heightPx = HEADER_HEIGHT + (TOTAL_HOURS * HOUR_HEIGHT) + 20;

    const pdf = new jsPDF({
        orientation: widthPx > heightPx ? ((widthPx / heightPx) > 1.4 ? 'landscape' : 'portrait') : 'portrait',
        unit: 'px',
        format: [widthPx, heightPx]
    });

    // Embed Roboto font for Turkish support
    try {
        const fontBaseUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto';

        // Parallel fetch
        const [regularBytes, boldBytes] = await Promise.all([
            fetch(`${fontBaseUrl}/Roboto-Regular.ttf`).then(res => res.arrayBuffer()),
            fetch(`${fontBaseUrl}/Roboto-Medium.ttf`).then(res => res.arrayBuffer())
        ]);

        const regularBase64 = arrayBufferToBase64(regularBytes);
        const boldBase64 = arrayBufferToBase64(boldBytes);

        pdf.addFileToVFS('Roboto-Regular.ttf', regularBase64);
        pdf.addFileToVFS('Roboto-Bold.ttf', boldBase64);

        pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

        // Set default
        pdf.setFont('Roboto', 'normal');

    } catch (e) {
        console.warn('Failed to load custom fonts, falling back to standard fonts. Turkish characters may not render correctly.', e);
    }

    renderCalendarToPDF(courses, pdf);

    if (metadata) {
        pdf.setProperties({
            title: `ITU Schedule - ${filename}`,
            subject: 'Course Schedule',
            creator: 'ITU Schedule Archive',
            keywords: METADATA_MARKER + utf8ToBase64(JSON.stringify(metadata))
        });
    }

    pdf.save(`${filename}.pdf`);
}

/**
 * Export course selections to .itusched file
 */
export function exportSelections(
    courses: Course[],
    type: 'calendar' | 'wizard',
    filename: string,
    termId?: string,
    wizardState?: ITUSchedData['wizardState']
): void {
    const data: ITUSchedData = {
        version: FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        type,
        termId,
        courses,
        wizardState
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `${filename}.itusched`);
}

/**
 * Import selections from a file (either .itusched or image with metadata)
 */
export async function importSelections(file: File): Promise<ITUSchedData | null> {
    const fileName = file.name.toLowerCase();

    // Handle .itusched files (JSON)
    if (fileName.endsWith('.itusched') || fileName.endsWith('.json')) {
        try {
            const text = await file.text();
            const data = JSON.parse(text) as ITUSchedData;

            // Validate format
            if (!data.version || !data.courses) {
                throw new Error('Invalid file format');
            }

            return data;
        } catch (e) {
            console.error('Failed to parse .itusched file', e);
            return null;
        }
    }

    // Handle PNG files with embedded metadata
    if (fileName.endsWith('.png')) {
        try {
            const metadata = await extractMetadataFromPNG(file);
            return metadata;
        } catch (e) {
            console.error('Failed to extract metadata from PNG', e);
            return null;
        }
    }

    // Handle SVG files
    if (fileName.endsWith('.svg')) {
        try {
            const text = await file.text();
            const match = text.match(new RegExp(`${METADATA_MARKER}([A-Za-z0-9+/=]+)`));
            if (match) {
                const data = JSON.parse(base64ToUtf8(match[1])) as ITUSchedData;
                return data;
            }
        } catch (e) {
            console.error('Failed to extract metadata from SVG', e);
        }
        return null;
    }

    // Handle PDF files - extract from keywords
    if (fileName.endsWith('.pdf')) {
        // PDF metadata extraction is complex client-side
        // For now, we'll return null and recommend using .itusched files
        console.warn('PDF import not fully supported. Use .itusched files for best results.');
        return null;
    }

    return null;
}

/**
 * Embed metadata in PNG using a custom approach
 * We'll add the metadata as a data URL comment that can be extracted
 */
async function embedMetadataInPNG(blob: Blob, metadata: ITUSchedData): Promise<Blob> {
    // For simplicity, we'll store metadata in a separate chunk approach
    // by creating a new PNG with a tEXt chunk

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Create metadata chunk
    const metadataString = METADATA_MARKER + utf8ToBase64(JSON.stringify(metadata));
    const textEncoder = new TextEncoder();
    const metadataBytes = textEncoder.encode(metadataString);

    // Create iTXt chunk (zTXt would be better but more complex)
    // For simplicity, we'll append as a comment chunk
    // Structure: keyword (null-terminated) + text
    const keyword = textEncoder.encode('Comment\0');

    const chunkData = new Uint8Array(keyword.length + metadataBytes.length);
    chunkData.set(keyword, 0);
    chunkData.set(metadataBytes, keyword.length);

    // Create the tEXt chunk
    const chunkType = textEncoder.encode('tEXt');
    const chunkLength = chunkData.length;

    // Calculate CRC (simplified - in production use a proper CRC32)
    const crc = calculateCRC32(new Uint8Array([...chunkType, ...chunkData]));

    // Build the complete chunk
    const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
    // Length (big endian)
    chunk[0] = (chunkLength >> 24) & 0xff;
    chunk[1] = (chunkLength >> 16) & 0xff;
    chunk[2] = (chunkLength >> 8) & 0xff;
    chunk[3] = chunkLength & 0xff;
    // Type
    chunk.set(chunkType, 4);
    // Data
    chunk.set(chunkData, 8);
    // CRC (big endian)
    chunk[chunk.length - 4] = (crc >> 24) & 0xff;
    chunk[chunk.length - 3] = (crc >> 16) & 0xff;
    chunk[chunk.length - 2] = (crc >> 8) & 0xff;
    chunk[chunk.length - 1] = crc & 0xff;

    // Insert chunk before IEND (last 12 bytes of PNG)
    const newPng = new Uint8Array(uint8Array.length + chunk.length);
    newPng.set(uint8Array.slice(0, -12), 0);
    newPng.set(chunk, uint8Array.length - 12);
    newPng.set(uint8Array.slice(-12), uint8Array.length - 12 + chunk.length);

    return new Blob([newPng], { type: 'image/png' });
}

/**
 * Extract metadata from PNG file
 */
async function extractMetadataFromPNG(file: File): Promise<ITUSchedData | null> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder();

    // Search for tEXt chunks containing our marker
    let offset = 8; // Skip PNG signature

    while (offset < uint8Array.length - 12) {
        // Read chunk length (big endian)
        const length = (uint8Array[offset] << 24) |
            (uint8Array[offset + 1] << 16) |
            (uint8Array[offset + 2] << 8) |
            uint8Array[offset + 3];

        // Read chunk type
        const type = textDecoder.decode(uint8Array.slice(offset + 4, offset + 8));

        if (type === 'tEXt' || type === 'iTXt') {
            const data = textDecoder.decode(uint8Array.slice(offset + 8, offset + 8 + length));

            if (data.includes(METADATA_MARKER)) {
                const markerIndex = data.indexOf(METADATA_MARKER);
                const base64Data = data.slice(markerIndex + METADATA_MARKER.length);
                try {
                    const jsonStr = base64ToUtf8(base64Data);
                    return JSON.parse(jsonStr) as ITUSchedData;
                } catch (e) {
                    console.error('Failed to parse embedded metadata', e);
                }
            }
        }

        if (type === 'IEND') break;

        // Move to next chunk: length (4) + type (4) + data (length) + crc (4)
        offset += 4 + 4 + length + 4;
    }

    return null;
}

/**
 * Simple CRC32 calculation for PNG chunks
 */
function calculateCRC32(data: Uint8Array): number {
    let crc = 0xffffffff;
    const table = getCRC32Table();

    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    }

    return (crc ^ 0xffffffff) >>> 0;
}

let crc32Table: Uint32Array | null = null;

function getCRC32Table(): Uint32Array {
    if (crc32Table) return crc32Table;

    crc32Table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crc32Table[i] = c;
    }
    return crc32Table;
}

/**
 * Generate a filename from courses
 */
export function generateFilename(courses: Course[], prefix: string = 'schedule'): string {
    const date = new Date().toISOString().split('T')[0];
    const courseCount = courses.length;
    return `${prefix}_${courseCount}courses_${date}`;
}

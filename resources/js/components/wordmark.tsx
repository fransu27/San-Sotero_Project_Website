import { Building2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';

/** Wordmark — blue icon tile + two-line brand name. Static text only (no user input rendered). */
export default function Wordmark() {
    return (
        <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0197F6] text-white">
                <Building2 size={18} />
            </span>
            <span className="grid leading-tight">
                <span className="text-[14px] font-semibold">{BRAND.place}</span>
                <span className="text-[11px] opacity-60">{BRAND.product}</span>
            </span>
        </span>
    );
}

/** PaletteStripe — thin decorative bar with all five brand colors (aria-hidden). */
export function PaletteStripe({ className = '' }: { className?: string }) {
    return (
        <div aria-hidden className={`flex h-1.5 w-full ${className}`}>
            {['#D7263D', '#02182B', '#0197F6', '#448FA3', '#68C5DB'].map((c) => (
                <span key={c} className="flex-1" style={{ backgroundColor: c }} />
            ))}
        </div>
    );
}

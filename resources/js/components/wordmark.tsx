import { usePage } from '@inertiajs/react';
import BrandMark from '@/components/brand-mark';
import { BRAND } from '@/lib/brand';

/** Wordmark — the barangay seal (public/images/logo.png) + two-line brand name. Static text only (no user input rendered). */
export default function Wordmark() {
    const { barangay } = usePage().props as any;

    return (
        <span className="flex items-center gap-3">
            <BrandMark
                size={40}
                className="transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-[-5deg]"
            />
            <span className="grid leading-tight">
                <span className="text-[14px] font-semibold transition-colors duration-300 group-hover:text-[rgb(var(--w-accent)/1)]">
                    {barangay?.name || BRAND.place}
                </span>
                <span className="text-[11px] opacity-60 transition-opacity duration-300 group-hover:opacity-90">
                    {BRAND.product}
                </span>
            </span>
        </span>
    );
}

/** PaletteStripe — thin decorative bar with all five brand colors (aria-hidden). */
export function PaletteStripe({ className = '' }: { className?: string }) {
    return (
        <div aria-hidden className={`flex h-1.5 w-full ${className}`}>
            {['#D7263D', '#02182B', '#0197F6', '#448FA3', '#68C5DB'].map(
                (c) => (
                    <span
                        key={c}
                        className="flex-1"
                        style={{ backgroundColor: c }}
                    />
                ),
            )}
        </div>
    );
}

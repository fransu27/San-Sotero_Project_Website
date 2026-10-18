import { usePage } from '@inertiajs/react';
import BrandMark from '@/components/brand-mark';
import { BRAND } from '@/lib/brand';

/** Sidebar logo (used by the old starter sidebar). Now shows the barangay name instead of "Laravel". */
export default function AppLogo() {
    const page = usePage().props as any;

    return (
        <>
            <BrandMark size={32} className="transition-transform duration-500 ease-out group-hover:rotate-[-5deg] group-hover:scale-110" />
            <div className="ml-1 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold transition-colors duration-300 group-hover:text-primary">
                    {page.barangay?.name || BRAND.place}
                </span>
                <span className="truncate text-xs opacity-60">
                    {BRAND.product}
                </span>
            </div>
        </>
    );
}

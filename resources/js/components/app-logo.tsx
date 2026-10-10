import { usePage } from '@inertiajs/react';
import BrandMark from '@/components/brand-mark';
import { BRAND } from '@/lib/brand';

/** Sidebar logo (used by the old starter sidebar). Now shows the barangay name instead of "Laravel". */
export default function AppLogo() {
    const page = usePage().props as any;
    return (
        <>
            <BrandMark size={32} />
            <div className="ml-1 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{page.barangay?.name || BRAND.place}</span>
                <span className="truncate text-xs opacity-60">
                    {BRAND.product}
                </span>
            </div>
        </>
    );
}

import { Building2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';

/** Sidebar logo (used by the old starter sidebar). Now shows the barangay name instead of "Laravel". */
export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-[#0197F6] text-white">
                <Building2 className="size-4" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{BRAND.place}</span>
                <span className="truncate text-xs opacity-60">
                    {BRAND.product}
                </span>
            </div>
        </>
    );
}

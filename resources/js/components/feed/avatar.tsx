import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Round initials badge (no external image, so nothing extra to load or leak). Admins get the barangay blue. */
export function Avatar({ name, staff = false, size = 36, anonymous = false }: { name: string; staff?: boolean; size?: number; anonymous?: boolean }) {
    const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
    if (anonymous) {
        // No initials for an anonymous author: a neutral person icon, so nothing about the name leaks
        return <span style={{ width: size, height: size }} aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted-foreground/40 text-white"><UserRound size={size * 0.55} /></span>;
    }

    return (
        <span style={{ width: size, height: size, fontSize: size * 0.38 }}
            className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', staff ? 'bg-[#0197F6]' : 'bg-[#448FA3]')}>
            {initials || '?'}
        </span>
    );
}

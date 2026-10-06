import { UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Round profile picture (`src`, uploaded in Settings → Profile) or, when there is none / it fails to load, the initials badge.
 * Admins get the barangay blue. `src` is null for anonymous authors, so a picture never gives them away.
 */
export function Avatar({
    name,
    src = null,
    staff = false,
    size = 36,
    anonymous = false,
}: {
    name: string;
    src?: string | null;
    staff?: boolean;
    size?: number;
    anonymous?: boolean;
}) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);

    const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

    if (anonymous) {
        // No initials for an anonymous author: a neutral person icon, so nothing about the name leaks
        return (
            <span
                style={{ width: size, height: size }}
                aria-hidden
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted-foreground/40 text-white"
            >
                <UserRound size={size * 0.55} />
            </span>
        );
    }

    if (src && !failed) {
        return (
            <img
                src={src}
                alt=""
                width={size}
                height={size}
                loading="lazy"
                onError={() => setFailed(true)}
                style={{ width: size, height: size }}
                className={cn(
                    'shrink-0 rounded-full object-cover ring-2',
                    staff ? 'ring-[#0197F6]' : 'ring-transparent',
                )}
            />
        );
    }

    return (
        <span
            style={{ width: size, height: size, fontSize: size * 0.38 }}
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
                staff ? 'bg-[#0197F6]' : 'bg-[#448FA3]',
            )}
        >
            {initials || '?'}
        </span>
    );
}

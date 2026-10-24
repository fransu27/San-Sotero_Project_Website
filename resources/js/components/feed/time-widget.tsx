import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * The Philippine time card (UTC+8): label, live clock and the full date.
 * It is the same card the Newsfeed's left panel shows, pulled out so Dashboard, Announcements,
 * My submissions and Moderation all show the exact same widget.
 * Display only: it reads the browser clock and formats it for Asia/Manila, nothing is sent to the server.
 */
const manila = { timeZone: 'Asia/Manila' } as const;

export default function TimeWidget({ className }: { className?: string }) {
    const [clock, setClock] = useState(() => new Date());

    // Tick once a second while the card is on screen.
    useEffect(() => {
        const timer = window.setInterval(() => setClock(new Date()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <div
            role="timer"
            aria-label="Philippines local time"
            className={cn(
                'rounded-xl border border-[#0197F6]/20 bg-gradient-to-br from-[#0197F6]/15 to-[#68C5DB]/10 p-4',
                className,
            )}
        >
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#0777bd] uppercase dark:text-[#4cb9f8]">
                Philippines · UTC+8
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">
                {clock.toLocaleTimeString('en-PH', {
                    ...manila,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                {clock.toLocaleDateString('en-PH', {
                    ...manila,
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })}
            </p>
        </div>
    );
}

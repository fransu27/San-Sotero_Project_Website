import { Link } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Search,
    Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Collapsible left panel: Philippine clock + report-status links + Settings.
 * Used by the Newsfeed (FeedLayout) and by the guest community page, so both look and behave the same.
 * It only DRAWS links; where a link goes (real filter URL, or the login page for guests) is decided by the caller.
 * Collapsed = one centred column of equal square icon buttons; expanded = icons and labels (no numbers).
 */
export type RailLink = {
    label: string;
    href: string;
    icon: LucideIcon;
    active?: boolean;
    count?: number;
};

type Props = {
    links: RailLink[];
    settings: { label: string; href: string };
    ariaLabel: string;
    /** Optional search box, drawn above the clock (the Newsfeed passes one; the guest page does not). */
    search?: ReactNode;
};

const manila = { timeZone: 'Asia/Manila' } as const;

export default function ReportRail({
    links,
    settings,
    ariaLabel,
    search,
}: Props) {
    const [collapsed, setCollapsed] = useState(false);
    const [clock, setClock] = useState(() => new Date());

    // Tick once a second, but only while the expanded clock is on screen.
    useEffect(() => {
        if (collapsed) {
            return;
        }

        const timer = window.setInterval(() => setClock(new Date()), 1000);

        return () => window.clearInterval(timer);
    }, [collapsed]);

    const iconBox = 'size-12 justify-center p-0';
    const row = 'flex w-full gap-3 px-3.5 py-2.5';

    return (
        <aside
            aria-label={ariaLabel}
            className={cn(
                'feed-filter-rail sticky top-[84px] hidden h-fit max-h-[calc(100vh-100px)] self-start overflow-x-hidden overflow-y-auto transition-[width] duration-300 ease-out xl:block',
                collapsed ? 'w-[88px]' : 'w-[272px]',
            )}
        >
            <div
                className={cn(
                    'rounded-2xl border border-border bg-card shadow-sm',
                    collapsed
                        ? 'flex flex-col items-center gap-3 px-3 py-4'
                        : 'space-y-4 p-4',
                )}
            >
                <button
                    type="button"
                    onClick={() => setCollapsed((v) => !v)}
                    aria-expanded={!collapsed}
                    aria-label={
                        collapsed
                            ? 'Expand report panel'
                            : 'Collapse report panel'
                    }
                    title={collapsed ? 'Expand report panel' : undefined}
                    className={cn(
                        'nav-fill-link rounded-xl text-sm font-medium',
                        collapsed ? iconBox : 'flex w-full px-3.5 py-2.5',
                    )}
                >
                    {collapsed ? (
                        <ChevronRight size={18} />
                    ) : (
                        <>
                            <ChevronLeft size={18} />
                            <span>Collapse</span>
                        </>
                    )}
                </button>

                {search &&
                    (collapsed ? (
                        <button
                            type="button"
                            onClick={() => setCollapsed(false)}
                            aria-label="Search reports"
                            title="Search reports"
                            className={cn(
                                'nav-fill-link rounded-xl text-sm font-medium',
                                iconBox,
                            )}
                        >
                            <Search size={18} />
                        </button>
                    ) : (
                        search
                    ))}

                {collapsed ? (
                    <div
                        role="img"
                        title={`Philippines · ${clock.toLocaleTimeString('en-PH', { ...manila, hour: '2-digit', minute: '2-digit', hour12: true })}`}
                        aria-label="Philippines local time"
                        className="flex size-12 items-center justify-center rounded-xl bg-[#0197F6]/10 text-[#0777bd] dark:text-[#4cb9f8]"
                    >
                        <Clock size={18} />
                    </div>
                ) : (
                    <div className="rounded-xl border border-[#0197F6]/20 bg-gradient-to-br from-[#0197F6]/15 to-[#68C5DB]/10 p-4">
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
                )}

                {collapsed && (
                    <div className="h-px w-8 bg-border" aria-hidden />
                )}

                <div className={cn(!collapsed && 'space-y-2.5')}>
                    {!collapsed && (
                        <p className="px-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            All reports
                        </p>
                    )}
                    <nav
                        className={cn(
                            'flex flex-col',
                            collapsed ? 'items-center gap-3' : 'gap-2',
                        )}
                    >
                        {links.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                preserveScroll
                                title={collapsed ? l.label : undefined}
                                aria-label={collapsed ? l.label : undefined}
                                aria-current={l.active ? 'page' : undefined}
                                className={cn(
                                    'nav-fill-link rounded-xl text-sm font-medium',
                                    collapsed ? iconBox : row,
                                    l.active && 'is-active',
                                )}
                            >
                                <l.icon size={18} className="shrink-0" />
                                {/* Icon (and label when expanded) only: the numbers live in the "Community reports" widget on the right. */}
                                {!collapsed && (
                                    <span className="flex-1">{l.label}</span>
                                )}
                            </Link>
                        ))}
                    </nav>
                </div>

                {collapsed && (
                    <div className="h-px w-8 bg-border" aria-hidden />
                )}

                <Link
                    href={settings.href}
                    title={collapsed ? settings.label : undefined}
                    aria-label={collapsed ? settings.label : undefined}
                    className={cn(
                        'nav-fill-link rounded-xl text-sm font-medium',
                        collapsed ? iconBox : row,
                    )}
                >
                    <Settings size={18} className="shrink-0" />
                    {!collapsed && <span>{settings.label}</span>}
                </Link>
            </div>
        </aside>
    );
}

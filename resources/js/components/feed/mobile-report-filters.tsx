import { Link, usePage } from '@inertiajs/react';
import {
    Ban,
    CheckCircle2,
    ChevronDown,
    ClipboardCheck,
    Clock,
    Eye,
    HardHat,
    Loader,
    MoreHorizontal,
    Shield,
    Trash2,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { statusColor } from '@/components/feed/post-card';
import { useLocale } from '@/hooks/use-locale';
import { asList, feedHref } from '@/lib/feed-filters';
import type { FilterValue } from '@/lib/feed-filters';
import { cn } from '@/lib/utils';

/**
 * Phone / tablet version of the Newsfeed's left rail: two side-by-side boxes, "All reports" (status filters) and
 * "Browse by category". Tapping a box opens its choices underneath; tap one again to switch that filter off.
 * It sits right above the New / Best / Hot row. On wide screens the left rail does this job, so this is hidden there.
 *
 * Display only: every link just changes the query string, and the SERVER re-validates it against fixed lists.
 */
const statusIcon: Record<string, LucideIcon> = {
    Pending: Clock,
    'Under Review': Eye,
    'In Progress': Loader,
    Resolved: CheckCircle2,
    Rejected: XCircle,
    Approval: ClipboardCheck,
    Removed: Ban,
};
const DEFAULT_STATUSES = [
    'Pending',
    'Under Review',
    'In Progress',
    'Resolved',
    'Rejected',
];
const CATEGORIES: { label: string; icon: LucideIcon }[] = [
    { label: 'Peace and Order', icon: Shield },
    { label: 'Infrastructure', icon: HardHat },
    { label: 'Sanitation', icon: Trash2 },
    { label: 'Others', icon: MoreHorizontal },
];

type Filters = {
    q: string;
    category: FilterValue;
    status: FilterValue;
    sort?: string | null;
};

export default function MobileReportFilters() {
    const { t } = useLocale();
    const { auth, filters, counts, statuses } = usePage().props as any;
    const [open, setOpen] = useState<'status' | 'category' | null>(null);
    const isAdmin = auth.user.role === 'admin';
    const f: Filters = filters ?? { q: '', category: null, status: null };
    const activeStatuses = asList(f.status);
    const activeCategories = asList(f.category);
    const total = Object.values(counts ?? {}).reduce<number>(
        (sum, value) => sum + Number(value ?? 0),
        0,
    );

    const statusLinks = (statuses ?? DEFAULT_STATUSES)
        .filter((s: string) => !['Rejected', 'Removed', 'Approval'].includes(s))
        .map((s: string) => ({
            key: s,
            label: t(
                s === 'Approval' && isAdmin
                    ? 'status.ApprovalAdmin'
                    : `status.${s}`,
            ),
            href: feedHref(f, { status: s }, { toggle: true }),
            icon: statusIcon[s] ?? Clock,
            active: activeStatuses.includes(s),
            count: counts ? Number(counts[s] ?? 0) : 0,
        }));

    const toggle = (name: 'status' | 'category') =>
        setOpen((current) => (current === name ? null : name));

    const box = (active: boolean, expanded: boolean) =>
        cn(
            'ss-card flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border bg-card px-3.5 py-2 text-left transition-[border-color,box-shadow,transform] duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#0197F6] focus-visible:outline-none active:scale-[0.97]',
            active || expanded
                ? 'border-[#0197F6] ring-1 ring-[#0197F6]/25'
                : 'border-border hover:border-[#0197F6]/50',
        );

    return (
        <section className="space-y-2 xl:hidden" aria-label={t('nav.filters')}>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => toggle('status')}
                    aria-expanded={open === 'status'}
                    className={box(
                        activeStatuses.length > 0,
                        open === 'status',
                    )}
                >
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                            All reports
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {activeStatuses.length > 0
                                ? `${activeStatuses.length} selected`
                                : `${total} total`}
                        </span>
                    </span>
                    <ChevronDown
                        size={17}
                        className={cn(
                            'shrink-0 transition-transform duration-300 ease-[var(--ease-spring)]',
                            open === 'status' && 'rotate-180',
                        )}
                    />
                </button>
                <button
                    type="button"
                    onClick={() => toggle('category')}
                    aria-expanded={open === 'category'}
                    className={box(
                        activeCategories.length > 0,
                        open === 'category',
                    )}
                >
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                            Browse by category
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                            {activeCategories.length > 0
                                ? `${activeCategories.length} selected`
                                : `${CATEGORIES.length} categories`}
                        </span>
                    </span>
                    <ChevronDown
                        size={17}
                        className={cn(
                            'shrink-0 transition-transform duration-300 ease-[var(--ease-spring)]',
                            open === 'category' && 'rotate-180',
                        )}
                    />
                </button>
            </div>

            {open === 'status' && (
                <nav
                    className="ss-card grid animate-[ss-pop-in_300ms_var(--ease-spring)_both] grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-3"
                    aria-label="Report status filters"
                >
                    {statusLinks.map((l: (typeof statusLinks)[number]) => (
                        <Link
                            key={l.key}
                            href={l.href}
                            preserveScroll
                            aria-current={l.active ? 'page' : undefined}
                            className={cn(
                                'nav-fill-link min-h-11 min-w-0 gap-2 rounded-xl px-3 py-2 text-xs font-medium sm:text-sm',
                                l.active && 'is-active',
                            )}
                        >
                            <span
                                aria-hidden
                                className="size-2 shrink-0 rounded-full"
                                style={{
                                    backgroundColor:
                                        statusColor[
                                            l.key as keyof typeof statusColor
                                        ] ?? '#8A94A0',
                                }}
                            />
                            <span className="min-w-0 flex-1 truncate">
                                {l.label}
                            </span>
                            <span className="rounded-full bg-black/10 px-1.5 text-[11px] font-semibold tabular-nums dark:bg-white/10">
                                {l.count}
                            </span>
                        </Link>
                    ))}
                </nav>
            )}

            {open === 'category' && (
                <nav
                    className="ss-card grid animate-[ss-pop-in_300ms_var(--ease-spring)_both] grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3"
                    aria-label="Report categories"
                >
                    {CATEGORIES.map(({ label, icon: Icon }) => (
                        <Link
                            key={label}
                            href={feedHref(
                                f,
                                { category: label },
                                { toggle: true },
                            )}
                            preserveScroll
                            aria-current={
                                activeCategories.includes(label)
                                    ? 'page'
                                    : undefined
                            }
                            className={cn(
                                'nav-fill-link min-h-11 min-w-0 gap-2 rounded-xl px-3 py-2 text-xs font-medium sm:text-sm',
                                activeCategories.includes(label) && 'is-active',
                            )}
                        >
                            <Icon size={16} className="shrink-0" />
                            <span className="truncate">{label}</span>
                        </Link>
                    ))}
                </nav>
            )}
        </section>
    );
}

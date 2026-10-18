import { Head, Link, usePage, usePoll } from '@inertiajs/react';
import { Lock, Building2, HardHat, Shield, Trash2, MoreHorizontal } from 'lucide-react';
import BarangayBanner from '@/components/barangay-banner';
import AnnouncementCard from '@/components/feed/announcement-card';
import type { Notice } from '@/components/feed/announcement-card';
import Composer from '@/components/feed/composer';
import PostCard, { statusColor } from '@/components/feed/post-card';
import type { Complaint, Status } from '@/components/feed/post-card';
import { useFeedSeen } from '@/hooks/use-feed-seen';
import { useLocale } from '@/hooks/use-locale';
import { asList, feedHref } from '@/lib/feed-filters';
import { cn } from '@/lib/utils';

/**
 * Newsfeed page (centre column + right widgets). The shell (top bar, left nav) is feed-layout.tsx.
 *
 * Feed order:  1) pinned announcements  →  2) everything else, newest first
 * (unpinned announcements and complaints are mixed by time, like one timeline).
 * When a filter/search is active only pinned notices + matching reports are shown.
 *
 * LIVE UPDATES: the page quietly re-fetches the feed every 15 s (only the posts, notices and counts, and only while
 * the tab is open), so a status change by the barangay shows up on the resident's post without a refresh.
 * Typing in a form is never lost: only the data props are replaced.
 *
 * SECURITY: `isAdmin` only decides what is DRAWN. Every write is re-checked on the server
 * (EnsureAdmin middleware, ownership checks, validation), so editing this file grants nothing.
 */
type Props = {
    isAdmin: boolean;
    counts: Record<string, number>;
    statusIds?: Record<string, number[]>;
    complaints: Complaint[];
    announcements: Notice[];
    filters: {
        q: string;
        category: string[] | string | null;
        status: string[] | string | null;
        sort?: 'new' | 'best' | 'hot';
    };
    categories: string[];
    statuses: Status[];
};

type FeedItem =
    | { kind: 'notice'; ts: number; a: Notice }
    | { kind: 'post'; ts: number; c: Complaint };

export default function Dashboard({
    isAdmin,
    counts,
    statusIds,
    complaints,
    announcements,
    filters,
    categories,
    statuses,
}: Props) {
    const { auth } = usePage().props as any;
    const { t } = useLocale();
    usePoll(15000, {
        only: [
            'complaints',
            'announcements',
            'counts',
            'statusIds',
            'analytics',
        ],
    });
    // Status and category are multi-select: several can be active at once.
    const activeStatuses = asList(filters.status);
    const activeCategories = asList(filters.category);
    const { unseen } = useFeedSeen(auth.user.id, statusIds, activeStatuses);
    const filtering = Boolean(
        filters.q || activeCategories.length || activeStatuses.length,
    );
    const sort = filters.sort ?? 'new';

    const pinned = announcements.filter((a) => a.pinned);
    const otherAnnouncements = announcements.filter((a) => !a.pinned);
    const rest: FeedItem[] = [
        ...complaints.map((c): FeedItem => ({ kind: 'post', ts: c.ts, c })),
    ].sort((x, y) => {
        if (sort === 'new') {
            return y.ts - x.ts;
        }

        if (x.kind === 'post' && y.kind === 'post') {
            const scoreX =
                sort === 'best'
                    ? (x.c.rating_avg ?? 0) * 100 + x.c.satisfied
                    : x.c.satisfied + x.c.not_satisfied;
            const scoreY =
                sort === 'best'
                    ? (y.c.rating_avg ?? 0) * 100 + y.c.satisfied
                    : y.c.satisfied + y.c.not_satisfied;

            return scoreY - scoreX || y.ts - x.ts;
        }

        if (x.kind !== y.kind) {
            return x.kind === 'post' ? -1 : 1;
        }

        return y.ts - x.ts;
    });

    const total = statuses.reduce(
        (sum, st) => sum + Number(counts[st] ?? 0),
        0,
    ); // approved posts only; Approval / Removed are shown on their own lines

    return (
        <>
            <Head title={t('nav.newsfeed')} />
            <div className="newsfeed-page grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,720px)_260px] 2xl:justify-center">
                {/* ── Centre feed ── */}
                <div className="stagger-children mx-auto w-full max-w-[760px] min-w-0 space-y-4 2xl:mx-0">
                    {/* 0. Barangay location photo (set by an admin in Settings → Barangay; placeholder until then) */}
                    <BarangayBanner />

                    <div className="sticky top-[116px] z-20 rounded-2xl border border-border/70 bg-background p-2 shadow-sm lg:top-[60px]">
                        <Composer
                            mode={isAdmin ? 'announcement' : 'complaint'}
                            userName={auth.user.name}
                            userAvatar={auth.user.avatar ?? null}
                            categories={categories}
                        />
                    </div>

                    <div
                        className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
                        aria-label="Newsfeed sort"
                    >
                        <span className="mr-1 text-sm text-muted-foreground">
                            Show:
                        </span>
                        {[
                            { value: 'new', label: 'New' },
                            { value: 'best', label: 'Best' },
                            { value: 'hot', label: 'Hot' },
                        ].map((option) => (
                            <Link
                                key={option.value}
                                href={feedHref(filters, {
                                    sort: option.value,
                                })}
                                preserveScroll
                                aria-current={
                                    sort === option.value ? 'page' : undefined
                                }
                                className={cn(
                                    'nav-fill-link rounded-full px-4 py-2 text-sm font-medium',
                                    sort === option.value && 'is-active',
                                )}
                            >
                                {option.label}
                            </Link>
                        ))}
                    </div>

                    {/* 1. Pinned admin announcements sit above everything */}
                    <section id="announcements" className="scroll-mt-20 space-y-3">
                        <h2 className="flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-[0.12em] text-[#0197F6]"><span className="h-px flex-1 bg-[#0197F6]/25" />Announcements<span className="h-px flex-1 bg-[#0197F6]/25" /></h2>
                        {[...pinned, ...otherAnnouncements].map((a) => <AnnouncementCard key={a.id} a={a} isAdmin={isAdmin} />)}
                        {announcements.length === 0 && <div className="rounded-xl border border-dashed border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground">No announcements have been posted yet.</div>}
                    </section>

                    {/* 2. Post box: admin → announcement, resident → complaint */}
                    {/* 3. Latest content */}
                    {filtering && (
                        <p className="text-sm text-muted-foreground">
                            {t('feed.showing', {
                                what: [
                                    ...activeStatuses.map((status) =>
                                        t(
                                            status === 'Approval'
                                                ? isAdmin
                                                    ? 'status.ApprovalAdmin'
                                                    : 'status.Approval'
                                                : `status.${status}`,
                                        ),
                                    ),
                                    ...activeCategories.map((category) =>
                                        t(`cat.${category}`),
                                    ),
                                    filters.q
                                        ? t('feed.results', { q: filters.q })
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(' · '),
                            })}{' '}
                            ·{' '}
                            <Link
                                href="/newsfeed"
                                className="text-[#0777bd] underline dark:text-[#4cb9f8]"
                            >
                                {t('feed.clear')}
                            </Link>
                        </p>
                    )}
                    {rest.length === 0 && (
                        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            {t(
                                filtering
                                    ? 'feed.emptyFiltered'
                                    : isAdmin
                                      ? 'feed.emptyAdmin'
                                      : 'feed.emptyResident',
                            )}
                        </div>
                    )}
                    {rest.map((item) =>
                        item.kind === 'notice' ? (
                            <AnnouncementCard
                                key={`n${item.a.id}`}
                                a={item.a}
                                isAdmin={isAdmin}
                            />
                        ) : (
                            <PostCard
                                key={`c${item.c.id}`}
                                c={item.c}
                                isAdmin={isAdmin}
                                statuses={statuses}
                                categories={categories}
                                allowStatusEdit={false}
                            />
                        ),
                    )}
                </div>

                {/* ── Right widgets (desktop only) ── */}
                <aside className="hidden h-fit space-y-3 2xl:sticky 2xl:top-[72px] 2xl:block">
                    {!isAdmin && (
                        <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3.5 text-xs leading-relaxed text-muted-foreground shadow-sm">
                            <Lock size={14} className="mt-0.5 shrink-0" />
                            <p>{t('widget.privacy')}</p>
                        </div>
                    )}

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <h2 className="mb-3 text-sm font-semibold">
                            {t(isAdmin ? 'widget.admin' : 'widget.resident')}
                        </h2>
                        <ul className="space-y-2 text-sm">
                            <li className="flex justify-between">
                                <span>{t('widget.total')}</span>
                                <span className="font-semibold">{total}</span>
                            </li>
                            {statuses.filter((s) => s !== 'Rejected').map((s) => (
                                <li
                                    key={s}
                                    className="flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <span
                                            className="size-2 rounded-full"
                                            style={{
                                                backgroundColor: statusColor[s],
                                            }}
                                        />
                                        {t(`status.${s}`)}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        {unseen(s) > 0 && (
                                            <span
                                                className="rounded-full bg-[#0197F6] px-2 py-0.5 text-[11px] leading-none font-semibold text-white"
                                                title={`${unseen(s)} new since you last checked`}
                                            >
                                                {unseen(s)} new
                                            </span>
                                        )}
                                        <span className="font-semibold">
                                            {counts[s] ?? 0}
                                        </span>
                                    </span>
                                </li>
                            ))}
                            <li className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{
                                            backgroundColor:
                                                statusColor.Approval,
                                        }}
                                    />
                                    {t(
                                        isAdmin
                                            ? 'status.ApprovalAdmin'
                                            : 'status.Approval',
                                    )}
                                </span>
                                <span className="font-semibold">
                                    {counts.Approval ?? 0}
                                </span>
                            </li>
                            <li className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{
                                            backgroundColor:
                                                statusColor.Removed,
                                        }}
                                    />
                                    {t('status.Removed')}
                                </span>
                                <span className="font-semibold">
                                    {counts.Removed ?? 0}
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Browse by category */}
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <h2 className="mb-3 text-sm font-semibold">
                            Browse by category
                        </h2>

                        <nav
                            className="flex flex-col gap-2"
                            aria-label="Report categories"
                        >
                            {[
                                { label: 'Peace and Order', icon: Shield },
                                { label: 'Infrastructure', icon: HardHat },
                                { label: 'Sanitation', icon: Trash2 },
                                { label: 'Others', icon: MoreHorizontal },
                            ].map(({ label, icon: Icon }) => (
                                <Link
                                    key={label}
                                    href={feedHref(
                                        filters,
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
                                        'nav-fill-link flex w-full gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium',
                                        activeCategories.includes(label) &&
                                            'is-active',
                                    )}
                                >
                                    <Icon size={16} />
                                    <span>{label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </aside>
            </div>
        </>
    );
}

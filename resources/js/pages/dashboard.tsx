import { Head, usePage, usePoll } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import BarangayBanner from '@/components/barangay-banner';
import AnnouncementCard from '@/components/feed/announcement-card';
import type { Notice } from '@/components/feed/announcement-card';
import Composer from '@/components/feed/composer';
import PostCard, { statusColor } from '@/components/feed/post-card';
import type { Complaint, Status } from '@/components/feed/post-card';
import { useLocale } from '@/hooks/use-locale';

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
    isAdmin: boolean; counts: Record<string, number>; complaints: Complaint[]; announcements: Notice[];
    filters: { q: string; category: string | null; status: string | null }; categories: string[]; statuses: Status[];
};

type FeedItem = { kind: 'notice'; ts: number; a: Notice } | { kind: 'post'; ts: number; c: Complaint };

export default function Dashboard({ isAdmin, counts, complaints, announcements, filters, categories, statuses }: Props) {
    const { auth } = usePage().props as any;
    const { t } = useLocale();
    usePoll(15000, { only: ['complaints', 'announcements', 'counts'] });
    const filtering = Boolean(filters.q || filters.category || filters.status);

    const pinned = announcements.filter((a) => a.pinned);
    const rest: FeedItem[] = [
        ...(filtering ? [] : announcements.filter((a) => !a.pinned).map((a): FeedItem => ({ kind: 'notice', ts: a.ts, a }))),
        ...complaints.map((c): FeedItem => ({ kind: 'post', ts: c.ts, c })),
    ].sort((x, y) => y.ts - x.ts);

    const total = statuses.reduce((sum, st) => sum + Number(counts[st] ?? 0), 0); // approved posts only; Approval / Removed are shown on their own lines

    return (
        <>
            <Head title={t('nav.newsfeed')} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                {/* ── Centre feed ── */}
                <div className="mx-auto w-full max-w-[680px] space-y-4 xl:mx-0 xl:max-w-none">
                    {/* 0. Barangay location photo (set by an admin in Settings → Barangay; placeholder until then) */}
                    <BarangayBanner />

                    {/* 1. Pinned admin announcements sit above everything */}
                    {pinned.map((a) => <AnnouncementCard key={a.id} a={a} isAdmin={isAdmin} />)}

                    {/* 2. Post box: admin → announcement, resident → complaint */}
                    <Composer mode={isAdmin ? 'announcement' : 'complaint'} userName={auth.user.name} categories={categories} />

                    {/* 3. Latest content */}
                    {filtering && (
                        <p className="text-sm text-muted-foreground">
                            {t('feed.showing', { what: filters.status ? t(filters.status === 'Approval' ? (isAdmin ? 'status.ApprovalAdmin' : 'status.Approval') : `status.${filters.status}`) : filters.category ? t(`cat.${filters.category}`) : t('feed.results', { q: filters.q }) })} · <a href="/dashboard" className="text-[#0197F6] underline">{t('feed.clear')}</a>
                        </p>
                    )}
                    {rest.length === 0 && (
                        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            {t(filtering ? 'feed.emptyFiltered' : isAdmin ? 'feed.emptyAdmin' : 'feed.emptyResident')}
                        </div>
                    )}
                    {rest.map((item) => item.kind === 'notice'
                        ? <AnnouncementCard key={`n${item.a.id}`} a={item.a} isAdmin={isAdmin} />
                        : <PostCard key={`c${item.c.id}`} c={item.c} isAdmin={isAdmin} statuses={statuses} categories={categories} />)}
                </div>

                {/* ── Right widgets (desktop only) ── */}
                <aside className="hidden h-fit space-y-4 xl:sticky xl:top-[72px] xl:block">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <h2 className="mb-3 text-sm font-semibold">{t(isAdmin ? 'widget.admin' : 'widget.resident')}</h2>
                        <ul className="space-y-2 text-sm">
                            <li className="flex justify-between"><span>{t('widget.total')}</span><span className="font-semibold">{total}</span></li>
                            {statuses.map((s) => (
                                <li key={s} className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: statusColor[s] }} />{t(`status.${s}`)}</span>
                                    <span className="font-semibold">{counts[s] ?? 0}</span>
                                </li>
                            ))}
                            <li className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: statusColor.Approval }} />{t(isAdmin ? 'status.ApprovalAdmin' : 'status.Approval')}</span>
                                <span className="font-semibold">{counts.Approval ?? 0}</span>
                            </li>
                            <li className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: statusColor.Removed }} />{t('status.Removed')}</span>
                                <span className="font-semibold">{counts.Removed ?? 0}</span>
                            </li>
                        </ul>
                    </div>
                    {!isAdmin && (
                        <div className="flex gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-sm">
                            <Lock size={14} className="mt-0.5 shrink-0" /> {t('widget.privacy')}
                        </div>
                    )}
                </aside>
            </div>
        </>
    );
}

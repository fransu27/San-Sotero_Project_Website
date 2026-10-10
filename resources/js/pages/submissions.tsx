import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronDown,
    Eye,
    Globe,
    Lock,
    MapPin,
    MessageCircle,
    Search,
    Tag,
    X,
    ThumbsUp,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import TicketCode from '@/components/feed/ticket-code';
import { statusColor } from '@/components/feed/post-card';
import { useLocale } from '@/hooks/use-locale';
import { DATE_LOCALE, timeAgo } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * My Submissions: the signed-in person's OWN reports. The server query is scoped to the user in SQL
 * (SubmissionController), so this page can only ever receive reports that belong to the viewer.
 * Residents can search by ticket code or title, filter by state, sort, and open each report's timeline.
 */
type Row = {
    id: number;
    ticket_code: string | null;
    title: string;
    excerpt: string;
    description: string;
    category: string;
    custom_category: string | null;
    location: string;
    ts: number;
    approval: 'pending' | 'approved';
    status: string;
    visibility: 'public' | 'private';
    anonymous: boolean;
    removed: boolean;
    feedback: string | null;
    image_url: string | null;
    reactions: number;
    comments: number;
    events: {
        id: number;
        type: string;
        status: string | null;
        note: string | null;
        ts: number;
        staff: boolean;
    }[];
};
type Filters = { q: string; ticket?: string; status: string | null; sort: 'new' | 'reacted' };
type Props = {
    rows: Row[];
    pagination: { page: number; last: number; total: number };
    tally: Record<string, number>;
    filters: Filters;
};

const CHIPS = [
    'all',
    'awaiting',
    'approved',
    'under_review',
    'in_progress',
    'resolved',
    'rejected',
    'removed',
] as const;

export default function Submissions({
    rows,
    pagination,
    tally,
    filters,
}: Props) {
    const { t } = useLocale();
    const [q, setQ] = useState(filters.q);
    const [preview, setPreview] = useState<Row | null>(null);
    const filtering = Boolean(filters.q || filters.status || filters.ticket);
    useEffect(() => { if (filters.ticket) { const match = rows.find((row) => row.ticket_code?.toUpperCase() === filters.ticket?.toUpperCase()); if (match) setPreview(match); } }, [filters.ticket, rows]);

    /** Reload the list with the new options. Only values from fixed lists (or the search text) are ever sent. */
    const go = (patch: Partial<Filters> & { page?: number }) => {
        const next = { ...filters, ...patch };
        const query: Record<string, string | number> = {};
        if (next.q) query.q = next.q;
        if (next.status) query.status = next.status;
        if (next.sort !== 'new') query.sort = next.sort;
        if (patch.page && patch.page > 1) query.page = patch.page;

        router.get('/my-submissions', query, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const search = (e: FormEvent) => {
        e.preventDefault();
        go({ q: q.trim() });
    };

    return (
        <>
            <Head title={t('sub.title')} />
            <div className="mx-auto max-w-3xl space-y-4">
                <header>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t('sub.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('sub.desc')}
                    </p>
                </header>

                <form onSubmit={search} role="search" className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                        <Search
                            size={16}
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            maxLength={100}
                            placeholder={t('sub.search')}
                            aria-label={t('sub.search')}
                            className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm outline-none focus:border-[#0197F6] focus:ring-2 focus:ring-[#0197F6]/30"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0197F6]/90 focus-visible:ring-2 focus-visible:ring-[#0197F6] focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        {t('sub.searchBtn')}
                    </button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                        role="group"
                        aria-label={t('sub.title')}
                        className="flex flex-wrap gap-2 px-1 pb-1"
                    >
                        {CHIPS.map((chip) => {
                            const value = chip === 'all' ? null : chip;
                            const active = filters.status === value;

                            return (
                                <button
                                    key={chip}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => go({ status: value })}
                                    className={cn(
                                        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]',
                                        active
                                            ? 'border-[#0197F6] bg-[#0197F6]/10 text-[#0197F6]'
                                            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {t(`sub.f.${chip}`)}
                                    <span className="text-xs tabular-nums opacity-80">
                                        {tally[chip] ?? 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        {t('sub.sort')}
                        <select
                            value={filters.sort}
                            onChange={(e) =>
                                go({ sort: e.target.value as Filters['sort'] })
                            }
                            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#0197F6]/30"
                        >
                            <option value="new">{t('sub.sort.new')}</option>
                            <option value="reacted">
                                {t('sub.sort.reacted')}
                            </option>
                        </select>
                    </label>
                </div>

                {rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            {t(
                                filtering
                                    ? 'sub.emptyFiltered'
                                    : 'sub.emptyAll',
                            )}
                        </p>
                        <Link
                            href={filtering ? '/my-submissions' : '/dashboard'}
                            className="mt-3 inline-block rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0197F6]/90"
                        >
                            {t(filtering ? 'sub.clear' : 'sub.emptyCta')}
                        </Link>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {rows.map((r) => (
                            <li key={r.id}>
                                <SubmissionCard r={r} onPreview={() => setPreview(r)} />
                            </li>
                        ))}
                    </ul>
                )}

                {pagination.last > 1 && (
                    <nav
                        className="flex items-center justify-between gap-3 pt-1 text-sm"
                        aria-label="Pagination"
                    >
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => go({ page: pagination.page - 1 })}
                            className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:bg-muted disabled:opacity-40"
                        >
                            {t('sub.prev')}
                        </button>
                        <span className="text-muted-foreground">
                            {t('sub.page', {
                                page: pagination.page,
                                last: pagination.last,
                            })}{' '}
                            · {t('sub.total', { n: pagination.total })}
                        </span>
                        <button
                            type="button"
                            disabled={pagination.page >= pagination.last}
                            onClick={() => go({ page: pagination.page + 1 })}
                            className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:bg-muted disabled:opacity-40"
                        >
                            {t('sub.next')}
                        </button>
                    </nav>
                )}
            </div>
            {preview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="submission-preview-title"
                    onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
                >
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#0197F6]">My report preview</p>
                                <h2 id="submission-preview-title" className="mt-1 text-xl font-bold">{preview.title}</h2>
                                {preview.ticket_code && <p className="mt-1 text-xs text-muted-foreground">{preview.ticket_code}</p>}
                            </div>
                            <button type="button" onClick={() => setPreview(null)} aria-label="Close report preview" className="rounded-lg p-2 hover:bg-muted"><X size={20}/></button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-muted px-3 py-1">{preview.status}</span>
                            <span className="rounded-full bg-muted px-3 py-1">{preview.approval === 'pending' ? 'Waiting approval' : 'Approved'}</span>
                            <span className="rounded-full bg-muted px-3 py-1">{preview.visibility === 'private' ? 'Private' : 'Public'}</span>
                        </div>
                        {preview.image_url && <img src={preview.image_url} alt={`Attachment for ${preview.title}`} className="mt-4 max-h-80 w-full rounded-xl border border-border object-contain" />}
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{preview.description || preview.excerpt || 'No description provided.'}</p>
                        <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                            <div className="flex items-start gap-2 text-sm"><Tag size={16} className="mt-0.5 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Category</p><p>{preview.category === 'Others' && preview.custom_category ? `${t('cat.Others')}: ${preview.custom_category}` : t(`cat.${preview.category}`)}</p></div></div>
                            <div className="flex items-start gap-2 text-sm"><MapPin size={16} className="mt-0.5 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Location</p><p>{preview.location || 'Not specified'}</p></div></div>
                            <div className="flex items-start gap-2 text-sm"><CalendarDays size={16} className="mt-0.5 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Submitted</p><p>{preview.ts ? new Date(preview.ts * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'Date unavailable'}</p></div></div>
                        </div>
                        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Barangay feedback</p><p className="mt-1 whitespace-pre-wrap text-sm">{preview.feedback || (preview.approval === 'pending' ? 'Your report is waiting for approval.' : 'No additional feedback yet.')}</p></div>
                        <div className="mt-5 flex justify-end"><button type="button" onClick={() => setPreview(null)} className="rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Close preview</button></div>
                    </div>
                </div>
            )}
        </>
    );
}

function SubmissionCard({ r, onPreview }: { r: Row; onPreview: () => void }) {
    const { t, locale } = useLocale();
    const [open, setOpen] = useState(false);

    const rejected = r.removed || r.status === 'Rejected';
    const waiting = r.approval === 'pending' && !r.removed;
    const color = waiting
        ? statusColor.Approval
        : rejected
          ? r.status === 'Rejected'
              ? statusColor.Rejected
              : statusColor.Removed
          : statusColor[r.status as keyof typeof statusColor];
    const label = waiting
        ? t('status.Approval')
        : r.removed && r.status !== 'Rejected'
          ? t('status.Removed')
          : t(`status.${r.status}`);
    const category =
        r.category === 'Others' && r.custom_category
            ? `${t('cat.Others')}: ${r.custom_category}`
            : t(`cat.${r.category}`);
    const submitted = new Date(r.ts * 1000).toLocaleDateString(
        DATE_LOCALE[locale],
        { year: 'numeric', month: 'short', day: 'numeric' },
    );
    const eventLabel = (e: Row['events'][number]) =>
        e.type === 'status'
            ? t('tl.status', { status: t(`status.${e.status}`) })
            : t(`tl.${e.type}`);

    return (
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <TicketCode code={r.ticket_code} />
                <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ color, backgroundColor: `${color}22` }}
                >
                    <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                    />
                    {label}
                </span>
            </div>

            <div className="mt-3 flex gap-3">
                <div className="min-w-0 flex-1">
                    <h2 className="text-base leading-6 font-semibold">
                        {r.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {r.excerpt}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{t('sub.submitted', { date: submitted })}</span>
                        <span aria-hidden>•</span>
                        <span>{category}</span>
                        <span aria-hidden>•</span>
                        <span className="inline-flex items-center gap-1">
                            {r.visibility === 'public' ? (
                                <Globe size={11} />
                            ) : (
                                <Lock size={11} />
                            )}
                            {t(
                                r.visibility === 'public'
                                    ? 'comp.public'
                                    : 'comp.private',
                            )}
                        </span>
                        {r.anonymous && (
                            <>
                                <span aria-hidden>•</span>
                                <span className="inline-flex items-center gap-1">
                                    <UserRound size={11} />
                                    {t('comp.anonymous')}
                                </span>
                            </>
                        )}
                    </p>
                </div>
                {r.image_url && (
                    <img
                        src={r.image_url}
                        alt=""
                        loading="lazy"
                        className="size-20 shrink-0 rounded-lg border border-border object-cover"
                    />
                )}
            </div>

            {/* The explanation from the barangay (rejection reason or the latest staff note) */}
            <div
                className={cn(
                    'mt-3 rounded-lg border px-3 py-2 text-sm',
                    r.feedback
                        ? 'border-[#0197F6]/30 bg-[#0197F6]/5'
                        : 'border-border bg-muted/40 text-muted-foreground',
                )}
            >
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('sub.feedback')}
                </p>
                <p className="mt-0.5 leading-5 text-foreground">
                    {r.feedback ?? (
                        <span className="text-muted-foreground">
                            {waiting
                                ? t('sub.awaitingNote')
                                : t('sub.noFeedback')}
                        </span>
                    )}
                </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                        <ThumbsUp size={12} />
                        {t('sub.reactions', { n: r.reactions })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <MessageCircle size={12} />
                        {t('sub.comments', { n: r.comments })}
                    </span>
                </span>
                <span className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onPreview}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[#0197F6] transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[#0197F6]"
                >
                    <Eye size={14} /> Preview
                </button>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[#0197F6] transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[#0197F6]"
                >
                    {open ? t('sub.hideTimeline') : t('sub.timeline')}
                    <ChevronDown
                        size={14}
                        className={cn(
                            'transition-transform',
                            open && 'rotate-180',
                        )}
                    />
                </button>
                </span>
            </div>

            {open && (
                <ol className="mt-3 space-y-3 border-l border-border pl-4">
                    {[...r.events].reverse().map((e) => (
                        <li key={e.id} className="relative">
                            <span
                                className="absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-card"
                                style={{
                                    backgroundColor:
                                        e.type === 'status' && e.status
                                            ? (statusColor[
                                                  e.status as keyof typeof statusColor
                                              ] ?? '#0197F6')
                                            : '#0197F6',
                                }}
                            />
                            <p className="text-sm leading-5">{eventLabel(e)}</p>
                            {e.note && (
                                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                                    “{e.note}”
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {timeAgo(e.ts, locale)}
                                {e.staff && ` · ${t('tl.staff')}`}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </article>
    );
}

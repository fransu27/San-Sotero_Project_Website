import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Eye,
    FileText,
    Image as ImageIcon,
    Search,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

type Event = {
    id: number;
    type: string;
    status: string | null;
    note: string | null;
    created_at: string | null;
};
type Complaint = {
    id: number;
    ticket_code: string | null;
    title: string;
    description: string;
    location: string;
    category: string;
    custom_category: string | null;
    status: string;
    approval: 'pending' | 'approved';
    visibility: 'public' | 'private';
    anonymous: boolean;
    date: string | null;
    created_at: string | null;
    author: string;
    author_email: string | null;
    image_url: string | null;
    removed: boolean;
    removed_reason: string | null;
    events: Event[];
};
type Props = {
    complaints: Complaint[];
    view: 'queue' | 'reviewed' | 'all';
    query: string;
    counts: { queue: number; reviewed: number };
};

const dateLabel = (value: string | null) =>
    value
        ? new Date(value).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : '—';

export default function Moderation({ complaints, view, query, counts }: Props) {
    const [preview, setPreview] = useState<Complaint | null>(null);
    const [rejectTarget, setRejectTarget] = useState<number | null>(null);
    const [reasons, setReasons] = useState<Record<number, string>>({});
    const [approveNotes, setApproveNotes] = useState<Record<number, string>>({});
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusDraft, setStatusDraft] = useState('Under Review');
    const [statusNote, setStatusNote] = useState('');
    const [removalReason, setRemovalReason] = useState('');

    const openPreview = (item: Complaint) => { setPreview(item); setStatusDraft(item.status); setStatusNote(''); setRemovalReason(''); setError(null); };

    const updateStatus = (item: Complaint) => {
        if (statusDraft === 'Rejected' && statusNote.trim().length < 5) { setError('Please enter a rejection reason of at least 5 characters.'); return; }
        setBusyId(item.id); setError(null);
        router.patch(`/complaints/${item.id}/status`, { status: statusDraft, note: statusNote.trim() || null }, { preserveScroll: true, onSuccess: () => setPreview(null), onError: (errors) => setError((errors.status as string) ?? (errors.note as string) ?? 'Unable to update status. Please try again.'), onFinish: () => setBusyId(null) });
    };

    const removePost = (item: Complaint) => {
        if (removalReason.trim().length < 5) { setError('Please provide a reason of at least 5 characters before removing this post.'); return; }
        setBusyId(item.id); setError(null);
        router.patch(`/complaints/${item.id}/remove`, { reason: removalReason.trim() }, { preserveScroll: true, onSuccess: () => setPreview(null), onError: (errors) => setError((errors.reason as string) ?? 'Unable to remove this post. Please try again.'), onFinish: () => setBusyId(null) });
    };

    const approve = (item: Complaint) => {
        setBusyId(item.id);
        setError(null);
        router.patch(
            `/complaints/${item.id}/approve`,
            { note: approveNotes[item.id]?.trim() || null },
            {
                preserveScroll: true,
                onSuccess: () => setPreview(null),
                onError: (errors) =>
                    setError(
                        (errors.note as string) ??
                            'Unable to approve this submission. Please try again.',
                    ),
                onFinish: () => setBusyId(null),
            },
        );
    };

    const reject = (item: Complaint) => {
        const reason = (reasons[item.id] ?? '').trim();
        if (reason.length < 5) {
            setError('Please enter a rejection reason of at least 5 characters.');
            return;
        }
        setBusyId(item.id);
        setError(null);
        router.patch(
            `/complaints/${item.id}/remove`,
            { reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectTarget(null);
                    setReasons((current) => ({ ...current, [item.id]: '' }));
                },
                onError: (errors) =>
                    setError(
                        (errors.reason as string) ??
                            'Unable to reject this submission. Please try again.',
                    ),
                onFinish: () => setBusyId(null),
            },
        );
    };

    return (
        <>
            <Head title="Admin · Submission moderation" />
            <main className="mx-auto w-full max-w-5xl space-y-6">
                <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0197F6]">
                                <ShieldCheck size={18} /> Administrator tools
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Submission moderation
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                Review residents’ concerns, inspect attached images, and record clear approval or rejection decisions.
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="inline-flex w-fit items-center rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                        >
                            Back to newsfeed
                        </Link>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Link
                            href="/admin/moderation?view=queue"
                            className={`rounded-xl border p-4 transition-colors hover:bg-muted/60 ${view === 'queue' ? 'border-[#0197F6] bg-[#0197F6]/5' : 'border-border'}`}
                        >
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock3 size={16} /> Awaiting review
                            </div>
                            <div className="mt-1 text-2xl font-bold">{counts.queue}</div>
                        </Link>
                        <Link
                            href="/admin/moderation?view=reviewed"
                            className={`rounded-xl border p-4 transition-colors hover:bg-muted/60 ${view === 'reviewed' ? 'border-[#0197F6] bg-[#0197F6]/5' : 'border-border'}`}
                        >
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 size={16} /> Reviewed submissions
                            </div>
                            <div className="mt-1 text-2xl font-bold">{counts.reviewed}</div>
                        </Link>
                    </div>

                    <form action="/admin/moderation" method="get" className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="view" value={view} />
                        <label className="relative min-w-0 flex-1">
                            <Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                            <input
                                name="q"
                                defaultValue={query}
                                maxLength={100}
                                placeholder="Search by ticket, title, description, or resident"
                                aria-label="Search submissions"
                                className="w-full rounded-lg border border-input bg-background py-2.5 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#0197F6]/30"
                            />
                        </label>
                        <button type="submit" className="rounded-lg bg-[#0197F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#087bc2]">
                            Search
                        </button>
                    </form>
                </header>

                {error && (
                    <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {complaints.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                        <CheckCircle2 className="mx-auto mb-3 text-muted-foreground" size={34} />
                        <h2 className="font-semibold">{view === 'queue' ? 'The review queue is clear' : 'No submissions found'}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {view === 'queue' ? 'New public concerns awaiting approval will appear here.' : 'Try another search or switch to the review queue.'}
                        </p>
                    </section>
                ) : (
                    <section className="space-y-4">
                        {complaints.map((item) => (
                            <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                                    {item.image_url ? (
                                        <button
                                            type="button"
                                            onClick={() => setPreview(item)}
                                            aria-label={`Preview image for ${item.title}`}
                                            className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-44"
                                        >
                                            <img src={item.image_url} alt={`Attachment for ${item.title}`} className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.03]" />
                                        </button>
                                    ) : (
                                        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:h-36 sm:w-44">
                                            <ImageIcon size={30} />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.removed || item.status === 'Rejected' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : item.approval === 'pending' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                                                {item.removed || item.status === 'Rejected' ? 'Rejected' : item.approval === 'pending' ? 'Awaiting approval' : 'Approved'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{item.ticket_code ?? `Submission #${item.id}`}</span>
                                        </div>
                                        <h2 className="mt-2 text-lg font-semibold leading-snug">{item.title}</h2>
                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span>{item.author}{item.anonymous ? ' · posted anonymously' : ''}</span>
                                            <span>{item.category === 'Others' && item.custom_category ? item.custom_category : item.category}</span>
                                            <span>{item.location}</span>
                                            <span>Submitted {dateLabel(item.created_at)}</span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => openPreview(item)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                                                <Eye size={16} /> Preview submission
                                            </button>
                                            {item.approval === 'pending' && !item.removed && (
                                                <button type="button" disabled={busyId === item.id} onClick={() => approve(item)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                                                    <CheckCircle2 size={16} /> {busyId === item.id ? 'Saving…' : 'Approve'}
                                                </button>
                                            )}
                                            {item.approval === 'pending' && !item.removed && (
                                                <button type="button" onClick={() => { setRejectTarget(rejectTarget === item.id ? null : item.id); setError(null); }} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-300">
                                                    <XCircle size={16} /> Reject
                                                </button>
                                            )}
                                        </div>
                                        {item.approval === 'pending' && !item.removed && (
                                            <div className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
                                                <label className="text-xs font-medium text-muted-foreground">
                                                    Approval note (optional; visible in the timeline)
                                                    <textarea value={approveNotes[item.id] ?? ''} onChange={(e) => setApproveNotes((current) => ({ ...current, [item.id]: e.target.value }))} maxLength={300} rows={2} placeholder="What was checked or what action is planned?" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#0197F6]/30" />
                                                </label>
                                                {rejectTarget === item.id && (
                                                    <label className="text-xs font-medium text-muted-foreground">
                                                        Rejection reason (required)
                                                        <textarea value={reasons[item.id] ?? ''} onChange={(e) => setReasons((current) => ({ ...current, [item.id]: e.target.value }))} maxLength={300} rows={2} placeholder="Explain why this concern cannot be approved." className="mt-1 w-full rounded-lg border border-red-500/40 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-red-500/20" />
                                                        <button type="button" disabled={busyId === item.id} onClick={() => reject(item)} className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                                            Confirm rejection
                                                        </button>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                        {(item.removed || item.status === 'Rejected') && item.removed_reason && (
                                            <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
                                                <strong>Rejection reason:</strong> {item.removed_reason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </main>

            {preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="preview-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card text-card-foreground shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#0197F6]">Submission preview</p>
                                <h2 id="preview-title" className="mt-1 text-lg font-bold">{preview.title}</h2>
                            </div>
                            <button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Close</button>
                        </div>
                        <div className="space-y-5 p-5">
                            {preview.image_url ? (
                                <img src={preview.image_url} alt={`Attachment for ${preview.title}`} className="max-h-[420px] w-full rounded-xl border border-border bg-muted object-contain" />
                            ) : (
                                <div className="flex items-center gap-3 rounded-xl bg-muted p-5 text-sm text-muted-foreground"><FileText size={24} /> No image attached to this submission.</div>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div><p className="text-xs text-muted-foreground">Ticket reference</p><p className="font-semibold">{preview.ticket_code ?? `Submission #${preview.id}`}</p></div>
                                <div><p className="text-xs text-muted-foreground">Submitted by</p><p className="font-semibold">{preview.author}{preview.anonymous ? ' (anonymous to residents)' : ''}</p>{preview.author_email && <p className="text-sm text-muted-foreground">{preview.author_email}</p>}</div>
                                <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium">{preview.category === 'Others' && preview.custom_category ? preview.custom_category : preview.category}</p></div>
                                <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{preview.location}</p></div>
                                <div><p className="text-xs text-muted-foreground">Incident date</p><p className="font-medium">{preview.date ?? '—'}</p></div>
                                <div><p className="text-xs text-muted-foreground">Visibility</p><p className="font-medium">{preview.visibility}</p></div>
                            </div>
                            <div><h3 className="mb-2 font-semibold">Concern details</h3><p className="whitespace-pre-wrap break-words text-sm leading-6">{preview.description}</p></div>
                            {preview.events.length > 0 && (
                                <div><h3 className="mb-2 font-semibold">Decision history</h3><ol className="space-y-3 border-l-2 border-border pl-4">{preview.events.map((event) => <li key={event.id}><p className="text-sm font-medium">{event.type === 'status' ? `Status: ${event.status ?? ''}` : event.type.charAt(0).toUpperCase() + event.type.slice(1)}</p>{event.note && <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>}<p className="mt-1 text-xs text-muted-foreground">{dateLabel(event.created_at)}</p></li>)}</ol></div>
                            )}
                            {preview.removed_reason && <div className="rounded-lg bg-red-500/10 p-3 text-sm"><strong>Rejection reason:</strong> {preview.removed_reason}</div>}
                            <div className="space-y-4 border-t border-border pt-4">
                                {preview.approval === 'pending' && !preview.removed && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"><h3 className="font-semibold">Approval decision</h3><label className="mt-3 block text-sm">Approval note (optional)<textarea value={approveNotes[preview.id] ?? ''} onChange={(e) => setApproveNotes((current) => ({ ...current, [preview.id]: e.target.value }))} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Optional note for the resident" /></label><button type="button" disabled={busyId === preview.id} onClick={() => approve(preview)} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Approve submission</button></div>}
                                {preview.approval === 'approved' && !preview.removed && <div className="rounded-xl border border-border p-4"><h3 className="font-semibold">Update report status</h3><p className="mt-1 text-sm text-muted-foreground">Changes are recorded in the decision history and visible to the resident.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">New status<select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"><option>Under Review</option><option>In Progress</option><option>Resolved</option><option>Rejected</option></select></label><label className="text-sm">Staff note {statusDraft === 'Rejected' ? '(required)' : '(optional)'}<textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder={statusDraft === 'Rejected' ? 'Explain why this report is rejected' : 'Progress update for the resident'} /></label></div><button type="button" disabled={busyId === preview.id || statusDraft === preview.status} onClick={() => updateStatus(preview)} className="mt-3 rounded-lg bg-[#0197F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#087bc2] disabled:opacity-50">Save status</button></div>}
                                {!preview.removed && <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4"><h3 className="font-semibold text-red-700 dark:text-red-300">Remove post from the community</h3><p className="mt-1 text-sm text-muted-foreground">This is a recorded removal, not a permanent database deletion. The resident can still see the decision and reason in their history.</p><label className="mt-3 block text-sm">Reason for removal (required)<textarea value={removalReason} onChange={(e) => setRemovalReason(e.target.value)} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" placeholder="Explain why this post must be removed" /></label><button type="button" disabled={busyId === preview.id} onClick={() => removePost(preview)} className="mt-3 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Remove post with reason</button></div>}
                                {preview.removed && <p className="rounded-lg bg-muted p-3 text-sm">This post is already removed. Reason: {preview.removed_reason ?? 'No reason recorded.'}</p>}
                                {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

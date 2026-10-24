
import { Head, Link, router, usePoll } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Eye,
    FileText,
    Image as ImageIcon,
    Paperclip,
    RotateCcw,
    Search,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AttachmentList } from '@/components/feed/attachments';
import type { Attachment } from '@/components/feed/attachments';
import { ZoomableImage } from '@/components/feed/image-lightbox';

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
    intake_channel?: 'online' | 'walk_in';
    reporter_name?: string | null;
    reporter_contact?: string | null;
    entered_by_user_id?: number | null;
    image_url: string | null;
    attachments: Attachment[];
    removed: boolean;
    removed_reason: string | null;
    events: Event[];
};

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    status: string;
    expires_at: string | null;
    reason: string | null;
    profile_restricted: boolean;
    profile_reason: string | null;
    last_seen_at: string | null;
};

type PostReport = {
    id: number;
    complaint_id: number;
    title: string;
    author_id: number | null;
    reporter: string;
    reason: string;
    details: string | null;
    status: string;
    admin_note: string | null;
    created_at: string | null;
};

type Props = {
    complaints: Complaint[];
    users: ManagedUser[];
    postReports: PostReport[];
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

const isRecentlyActive = (
    lastSeenAt: string | null,
    currentTime: number | null,
): boolean => {
    if (!lastSeenAt || currentTime === null) {
        return false;
    }

    const lastSeenTime = new Date(lastSeenAt).getTime();

    return (
        Number.isFinite(lastSeenTime) &&
        currentTime - lastSeenTime >= 0 &&
        currentTime - lastSeenTime < 5 * 60 * 1000
    );
};

export default function Moderation({
    complaints,
    view,
    query,
    counts,
    users,
    postReports,
}: Props) {
    usePoll(30000, { only: ['users', 'postReports', 'counts'] });

    // Keep the current time in state instead of calling Date.now() during render.
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        const updateTime = () => setNow(Date.now());

        updateTime();

        const intervalId = window.setInterval(updateTime, 60_000);

        return () => window.clearInterval(intervalId);
    }, []);

    const [preview, setPreview] = useState<Complaint | null>(null);
    const [rejectTarget, setRejectTarget] = useState<number | null>(null);
    const [reasons, setReasons] = useState<Record<number, string>>({});
    const [approveNotes, setApproveNotes] = useState<Record<number, string>>(
        {},
    );
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusDraft, setStatusDraft] = useState('Under Review');
    const [statusNote, setStatusNote] = useState('');
    const [removalReason, setRemovalReason] = useState('');
    const [confirmingRemove, setConfirmingRemove] = useState(false);

    const openPreview = (item: Complaint) => {
        setPreview(item);
        setStatusDraft(item.status);
        setStatusNote('');
        setRemovalReason('');
        setConfirmingRemove(false);
        setError(null);
    };

    const updateStatus = (item: Complaint) => {
        if (busyId !== null) {
            return;
        }

        if (statusDraft === 'Rejected' && statusNote.trim().length < 5) {
            setError(
                'Please enter a rejection reason of at least 5 characters.',
            );

            return;
        }

        setBusyId(item.id);
        setError(null);

        router.patch(
            `/complaints/${item.id}/status`,
            {
                status: statusDraft,
                note: statusNote.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setPreview(null),
                onError: (errors) =>
                    setError(
                        (errors.status as string) ??
                            (errors.note as string) ??
                            'Unable to update status. Please try again.',
                    ),
                onFinish: () => setBusyId(null),
            },
        );
    };

    const removePost = (item: Complaint) => {
        if (busyId !== null) {
            return;
        }

        if (removalReason.trim().length < 5) {
            setError(
                'Please provide a reason of at least 5 characters before removing this post.',
            );

            return;
        }

        setBusyId(item.id);
        setError(null);

        router.patch(
            `/complaints/${item.id}/remove`,
            { reason: removalReason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setPreview(null),
                onError: (errors) =>
                    setError(
                        (errors.reason as string) ??
                            'Unable to remove this post. Please try again.',
                    ),
                onFinish: () => setBusyId(null),
            },
        );
    };

    const restorePost = (item: Complaint) => {
        if (busyId !== null) {
            return;
        }

        setBusyId(item.id);
        setError(null);

        router.patch(
            `/complaints/${item.id}/restore`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setPreview(null),
                onError: () =>
                    setError('Unable to restore this post. Please try again.'),
                onFinish: () => setBusyId(null),
            },
        );
    };

    const approve = (item: Complaint) => {
        if (busyId !== null) {
            return;
        }

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
        if (busyId !== null) {
            return;
        }

        const reason = (reasons[item.id] ?? '').trim();

        if (reason.length < 5) {
            setError(
                'Please enter a rejection reason of at least 5 characters.',
            );

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
                    setReasons((current) => ({
                        ...current,
                        [item.id]: '',
                    }));
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

    const moderateUser = (user: ManagedUser) => {
        const action = window.prompt(
            'Action: restrict, ban, activate, profile_restrict, or profile_restore',
            user.profile_restricted
                ? 'profile_restore'
                : user.status === 'active'
                  ? 'restrict'
                  : 'activate',
        );

        if (
            !action ||
            ![
                'restrict',
                'ban',
                'activate',
                'profile_restrict',
                'profile_restore',
            ].includes(action)
        ) {
            return;
        }

        const reason = window.prompt(
            'Required moderation reason (minimum 5 characters):',
            action === 'profile_restrict'
                ? 'Inappropriate profile picture'
                : 'Community guideline violation',
        );

        if (!reason || reason.trim().length < 5) {
            window.alert('Please provide a reason of at least 5 characters.');

            return;
        }

        let days: number | undefined;

        if (action === 'restrict') {
            const duration = window.prompt(
                'Restriction duration in days (1–365):',
                '7',
            );

            if (duration === null) {
                return;
            }

            days = Number(duration);

            if (!Number.isInteger(days) || days < 1 || days > 365) {
                window.alert('Enter a whole number between 1 and 365.');

                return;
            }
        }

        router.patch(
            `/admin/users/${user.id}/moderation`,
            { action, reason: reason.trim(), days },
            { preserveScroll: true },
        );
    };

    const reviewPostReport = (report: PostReport, status: string) => {
        const adminNote = window.prompt(
            `Required note for ${status} (minimum 5 characters):`,
            status === 'actioned'
                ? 'Reviewed and action taken'
                : 'Reviewed by administration',
        );

        if (adminNote === null) {
            return;
        }

        if (adminNote.trim().length < 5) {
            window.alert('Please provide a note of at least 5 characters.');

            return;
        }

        router.patch(
            `/admin/post-reports/${report.id}`,
            { status, admin_note: adminNote.trim() },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Admin · Moderation" />

            <main className="mx-auto w-full max-w-5xl space-y-6">
                <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0197F6]">
                                <ShieldCheck size={18} />
                                Administrator tools
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight">
                                Moderation
                            </h1>

                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                Review residents’ concerns, inspect attached
                                images, and record clear approval or rejection
                                decisions.
                            </p>
                        </div>

                        <Link
                            href="/dashboard"
                            className="inline-flex w-fit items-center rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                        >
                            Back to dashboard
                        </Link>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Link
                            href="/admin/moderation?view=queue"
                            className={`rounded-xl border p-4 transition-colors hover:bg-muted/60 ${
                                view === 'queue'
                                    ? 'border-[#0197F6] bg-[#0197F6]/5'
                                    : 'border-border'
                            }`}
                        >
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock3 size={16} />
                                Awaiting review
                            </div>
                            <div className="mt-1 text-2xl font-bold">
                                {counts.queue}
                            </div>
                        </Link>

                        <Link
                            href="/admin/moderation?view=reviewed"
                            className={`rounded-xl border p-4 transition-colors hover:bg-muted/60 ${
                                view === 'reviewed'
                                    ? 'border-[#0197F6] bg-[#0197F6]/5'
                                    : 'border-border'
                            }`}
                        >
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 size={16} />
                                Reviewed submissions
                            </div>
                            <div className="mt-1 text-2xl font-bold">
                                {counts.reviewed}
                            </div>
                        </Link>
                    </div>

                    <form
                        action="/admin/moderation"
                        method="get"
                        className="mt-5 flex flex-col gap-2 sm:flex-row"
                    >
                        <input type="hidden" name="view" value={view} />

                        <label className="relative min-w-0 flex-1">
                            <Search
                                size={17}
                                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                name="q"
                                defaultValue={query}
                                maxLength={100}
                                placeholder="Search by ticket, title, description, or resident"
                                aria-label="Search submissions"
                                className="w-full rounded-lg border border-input bg-background py-2.5 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-[#0197F6]/30"
                            />
                        </label>

                        <button
                            type="submit"
                            className="rounded-lg bg-[#0197F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#087bc2]"
                        >
                            Search
                        </button>
                    </form>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
                    >
                        {error}
                    </div>
                )}

                {complaints.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                        <CheckCircle2
                            className="mx-auto mb-3 text-muted-foreground"
                            size={34}
                        />
                        <h2 className="font-semibold">
                            {view === 'queue'
                                ? 'The review queue is clear'
                                : 'No submissions found'}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {view === 'queue'
                                ? 'New public concerns awaiting approval will appear here.'
                                : 'Try another search or switch to the review queue.'}
                        </p>
                    </section>
                ) : (
                    <section className="space-y-4">
                        {complaints.map((item) => (
                            <article
                                key={item.id}
                                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                            >
                                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                                    {item.image_url ? (
                                        <button
                                            type="button"
                                            onClick={() => openPreview(item)}
                                            aria-label={`Preview image for ${item.title}`}
                                            className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-44"
                                        >
                                            <img
                                                src={item.image_url}
                                                alt={`Attachment for ${item.title}`}
                                                className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.03]"
                                            />
                                        </button>
                                    ) : (
                                        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:h-36 sm:w-44">
                                            <ImageIcon size={30} />
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    item.removed ||
                                                    item.status === 'Rejected'
                                                        ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                                                        : item.approval ===
                                                            'pending'
                                                          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                }`}
                                            >
                                                {item.removed ||
                                                item.status === 'Rejected'
                                                    ? 'Rejected'
                                                    : item.approval ===
                                                        'pending'
                                                      ? 'Awaiting approval'
                                                      : 'Approved'}
                                            </span>

                                            <span className="text-xs text-muted-foreground">
                                                {item.ticket_code ??
                                                    `Submission #${item.id}`}
                                            </span>
                                        </div>

                                        <h2 className="mt-2 text-lg leading-snug font-semibold">
                                            {item.title}
                                        </h2>

                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                            {item.description}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span>
                                                {item.author}
                                                {item.anonymous
                                                    ? ' · posted anonymously'
                                                    : ''}
                                            </span>
                                            <span>
                                                {item.category === 'Others' &&
                                                item.custom_category
                                                    ? item.custom_category
                                                    : item.category}
                                            </span>
                                            <span>{item.location}</span>

                                            {item.attachments.length > 0 && (
                                                <span className="inline-flex items-center gap-1 font-medium text-[#0777bd] dark:text-[#4cb9f8]">
                                                    <Paperclip size={12} />
                                                    {item.attachments.length}{' '}
                                                    {item.attachments.length ===
                                                    1
                                                        ? 'file'
                                                        : 'files'}
                                                </span>
                                            )}

                                            <span>
                                                Submitted{' '}
                                                {dateLabel(item.created_at)}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openPreview(item)}
                                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                                            >
                                                <Eye size={16} />
                                                Preview submission
                                            </button>

                                            {item.removed && (
                                                <button
                                                    type="button"
                                                    disabled={busyId !== null}
                                                    onClick={() =>
                                                        restorePost(item)
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-lg bg-[#0197F6] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#087bc2] disabled:opacity-50"
                                                >
                                                    <RotateCcw size={16} />
                                                    {busyId === item.id
                                                        ? 'Restoring…'
                                                        : 'Restore post'}
                                                </button>
                                            )}

                                            {item.approval === 'pending' &&
                                                !item.removed && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            busyId !== null
                                                        }
                                                        onClick={() =>
                                                            approve(item)
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2
                                                            size={16}
                                                        />
                                                        {busyId === item.id
                                                            ? 'Saving…'
                                                            : 'Approve'}
                                                    </button>
                                                )}

                                            {item.approval === 'pending' &&
                                                !item.removed && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            busyId !== null
                                                        }
                                                        onClick={() => {
                                                            setRejectTarget(
                                                                rejectTarget ===
                                                                    item.id
                                                                    ? null
                                                                    : item.id,
                                                            );
                                                            setError(null);
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                                                    >
                                                        <XCircle size={16} />
                                                        Reject
                                                    </button>
                                                )}
                                        </div>

                                        {item.approval === 'pending' &&
                                            !item.removed && (
                                                <div className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
                                                    <label className="text-xs font-medium text-muted-foreground">
                                                        Approval note (optional;
                                                        visible in the timeline)
                                                        <textarea
                                                            value={
                                                                approveNotes[
                                                                    item.id
                                                                ] ?? ''
                                                            }
                                                            onChange={(event) =>
                                                                setApproveNotes(
                                                                    (current) => ({
                                                                        ...current,
                                                                        [item.id]:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            maxLength={300}
                                                            rows={2}
                                                            placeholder="What was checked or what action is planned?"
                                                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#0197F6]/30"
                                                        />
                                                    </label>

                                                    {rejectTarget ===
                                                        item.id && (
                                                        <label className="text-xs font-medium text-muted-foreground">
                                                            Rejection reason
                                                            (required)
                                                            <textarea
                                                                value={
                                                                    reasons[
                                                                        item.id
                                                                    ] ?? ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setReasons(
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,
                                                                            [item.id]:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    )
                                                                }
                                                                maxLength={300}
                                                                rows={2}
                                                                placeholder="Explain why this concern cannot be approved."
                                                                className="mt-1 w-full rounded-lg border border-red-500/40 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-red-500/20"
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    busyId !==
                                                                    null
                                                                }
                                                                onClick={() =>
                                                                    reject(item)
                                                                }
                                                                className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                Confirm
                                                                rejection
                                                            </button>
                                                        </label>
                                                    )}
                                                </div>
                                            )}

                                        {(item.removed ||
                                            item.status === 'Rejected') &&
                                            item.removed_reason && (
                                                <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
                                                    <strong>
                                                        Rejection reason:
                                                    </strong>{' '}
                                                    {item.removed_reason}
                                                </p>
                                            )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-xl font-bold">User moderation</h2>
                        <p className="text-sm text-muted-foreground">
                            Active and offline accounts, temporary
                            restrictions, bans, and profile-picture
                            restrictions. Every action requires a reason and
                            is audited.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {users.map((user) => (
                            <article
                                key={user.id}
                                className="rounded-xl border border-border p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold">
                                            {user.name}
                                        </p>
                                        <p className="break-all text-xs text-muted-foreground">
                                            {user.email}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {isRecentlyActive(
                                                user.last_seen_at,
                                                now,
                                            )
                                                ? 'Active now'
                                                : 'Offline'}
                                            {' · Last seen: '}
                                            {dateLabel(user.last_seen_at)}
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                                        {user.status}
                                    </span>
                                </div>

                                {(user.reason || user.profile_reason) && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Reason:{' '}
                                        {user.reason || user.profile_reason}
                                    </p>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                                        onClick={() => moderateUser(user)}
                                    >
                                        Moderation tools
                                    </button>
                                </div>

                                {user.status === 'restricted' &&
                                    user.expires_at && (
                                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                            Restriction ends:{' '}
                                            {dateLabel(user.expires_at)}
                                        </p>
                                    )}
                            </article>
                        ))}

                        {users.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No resident accounts found.
                            </p>
                        )}
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-xl font-bold">Reported posts</h2>
                        <p className="text-sm text-muted-foreground">
                            Residents can report misinformation, harassment,
                            inappropriate content, spam, privacy concerns, and
                            other issues.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {postReports.map((report) => (
                            <article
                                key={report.id}
                                className="rounded-xl border border-border p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">
                                        {report.title}
                                    </p>
                                    <span className="rounded-full bg-muted px-2 py-1 text-xs">
                                        {report.status}
                                    </span>
                                </div>

                                <p className="mt-1 text-sm">
                                    {report.reason} · Reported by{' '}
                                    {report.reporter}
                                </p>

                                {report.details && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {report.details}
                                    </p>
                                )}

                                {report.admin_note && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Admin note: {report.admin_note}
                                    </p>
                                )}

                                {report.status === 'pending' && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {(
                                            [
                                                'actioned',
                                                'dismissed',
                                                'reviewed',
                                            ] as const
                                        ).map((status) => (
                                            <button
                                                key={status}
                                                type="button"
                                                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                                                onClick={() =>
                                                    reviewPostReport(
                                                        report,
                                                        status,
                                                    )
                                                }
                                            >
                                                {status === 'actioned'
                                                    ? 'Take action'
                                                    : status === 'dismissed'
                                                      ? 'Dismiss'
                                                      : 'Mark reviewed'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))}

                        {postReports.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No post reports have been submitted.
                            </p>
                        )}
                    </div>
                </section>
            </main>

            {preview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setPreview(null);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="preview-title"
                        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card text-card-foreground shadow-2xl"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#0197F6] uppercase">
                                    Submission preview
                                </p>
                                <h2
                                    id="preview-title"
                                    className="mt-1 text-lg font-bold"
                                >
                                    {preview.title}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPreview(null)}
                                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            {preview.image_url ? (
                                <ZoomableImage
                                    src={preview.image_url}
                                    alt={`Attachment for ${preview.title}`}
                                    className="max-h-[420px] w-full rounded-xl border border-border bg-muted object-contain"
                                />
                            ) : (
                                <div className="flex items-center gap-3 rounded-xl bg-muted p-5 text-sm text-muted-foreground">
                                    <FileText size={24} />
                                    No image attached to this submission.
                                </div>
                            )}

                            {preview.attachments.length > 0 ? (
                                <AttachmentList
                                    files={preview.attachments}
                                />
                            ) : (
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Paperclip size={14} />
                                    No files attached.
                                </p>
                            )}

                            {preview.intake_channel === 'walk_in' && (
                                <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
                                    <p className="text-sm font-semibold">
                                        Assisted walk-in report
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Resident:{' '}
                                        {preview.reporter_name ||
                                            'Not provided'}
                                    </p>
                                    <p className="text-sm">
                                        Contact:{' '}
                                        {preview.reporter_contact ||
                                            'Not provided'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Entered by staff account #
                                        {preview.entered_by_user_id ?? '—'}
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Ticket reference
                                    </p>
                                    <p className="font-semibold">
                                        {preview.ticket_code ??
                                            `Submission #${preview.id}`}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Submitted by
                                    </p>
                                    <p className="font-semibold">
                                        {preview.author}
                                        {preview.anonymous
                                            ? ' (anonymous to residents)'
                                            : ''}
                                    </p>
                                    {preview.author_email && (
                                        <p className="text-sm text-muted-foreground">
                                            {preview.author_email}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Category
                                    </p>
                                    <p className="font-medium">
                                        {preview.category === 'Others' &&
                                        preview.custom_category
                                            ? preview.custom_category
                                            : preview.category}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Location
                                    </p>
                                    <p className="font-medium">
                                        {preview.location}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Incident date
                                    </p>
                                    <p className="font-medium">
                                        {preview.date ?? '—'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Visibility
                                    </p>
                                    <p className="font-medium">
                                        {preview.visibility}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-2 font-semibold">
                                    Concern details
                                </h3>
                                <p className="text-sm leading-6 break-words whitespace-pre-wrap">
                                    {preview.description}
                                </p>
                            </div>

                            {preview.events.length > 0 && (
                                <div>
                                    <h3 className="mb-2 font-semibold">
                                        Decision history
                                    </h3>
                                    <ol className="space-y-3 border-l-2 border-border pl-4">
                                        {preview.events.map((event) => (
                                            <li key={event.id}>
                                                <p className="text-sm font-medium">
                                                    {event.type === 'status'
                                                        ? `Status: ${event.status ?? ''}`
                                                        : event.type
                                                              .charAt(0)
                                                              .toUpperCase() +
                                                          event.type.slice(1)}
                                                </p>

                                                {event.note && (
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {event.note}
                                                    </p>
                                                )}

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {dateLabel(
                                                        event.created_at,
                                                    )}
                                                </p>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {preview.removed_reason && (
                                <div className="rounded-lg bg-red-500/10 p-3 text-sm">
                                    <strong>Rejection reason:</strong>{' '}
                                    {preview.removed_reason}
                                </div>
                            )}

                            <div className="space-y-4 border-t border-border pt-4">
                                {preview.approval === 'pending' &&
                                    !preview.removed && (
                                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                                            <h3 className="font-semibold">
                                                Approval decision
                                            </h3>

                                            <label className="mt-3 block text-sm">
                                                Approval note (optional)
                                                <textarea
                                                    value={
                                                        approveNotes[
                                                            preview.id
                                                        ] ?? ''
                                                    }
                                                    onChange={(event) =>
                                                        setApproveNotes(
                                                            (current) => ({
                                                                ...current,
                                                                [preview.id]:
                                                                    event.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    maxLength={300}
                                                    rows={2}
                                                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
                                                    placeholder="Optional note for the resident"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                disabled={busyId !== null}
                                                onClick={() => approve(preview)}
                                                className="mt-3 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {busyId === preview.id
                                                    ? 'Saving…'
                                                    : 'Approve submission'}
                                            </button>
                                        </div>
                                    )}

                                {preview.approval === 'approved' &&
                                    !preview.removed && (
                                        <div className="rounded-xl border border-border p-4">
                                            <h3 className="font-semibold">
                                                Update report status
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Changes are recorded in the
                                                decision history and visible to
                                                the resident.
                                            </p>

                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <label className="text-sm">
                                                    New status
                                                    <select
                                                        value={statusDraft}
                                                        onChange={(event) =>
                                                            setStatusDraft(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
                                                    >
                                                        <option>
                                                            Under Review
                                                        </option>
                                                        <option>
                                                            In Progress
                                                        </option>
                                                        <option>
                                                            Resolved
                                                        </option>
                                                        <option>
                                                            Rejected
                                                        </option>
                                                    </select>
                                                </label>

                                                <label className="text-sm">
                                                    Staff note{' '}
                                                    {statusDraft === 'Rejected'
                                                        ? '(required)'
                                                        : '(optional)'}
                                                    <textarea
                                                        value={statusNote}
                                                        onChange={(event) =>
                                                            setStatusNote(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        maxLength={300}
                                                        rows={2}
                                                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
                                                        placeholder={
                                                            statusDraft ===
                                                            'Rejected'
                                                                ? 'Explain why this report is rejected'
                                                                : 'Progress update for the resident'
                                                        }
                                                    />
                                                </label>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={
                                                    busyId !== null ||
                                                    statusDraft ===
                                                        preview.status
                                                }
                                                onClick={() =>
                                                    updateStatus(preview)
                                                }
                                                className="mt-3 rounded-lg bg-[#0197F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#087bc2] disabled:opacity-50"
                                            >
                                                Save status
                                            </button>
                                        </div>
                                    )}

                                {!preview.removed && (
                                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                                        <h3 className="font-semibold text-red-700 dark:text-red-300">
                                            Remove post from the community
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            This is a recorded removal, not a
                                            permanent database deletion. The
                                            resident can still see the decision
                                            and reason in their history, and you
                                            can restore the post later if it was
                                            removed by mistake.
                                        </p>

                                        {!confirmingRemove ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setConfirmingRemove(true);
                                                    setError(null);
                                                }}
                                                className="mt-3 rounded-lg border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-300"
                                            >
                                                Remove post…
                                            </button>
                                        ) : (
                                            <div className="mt-3 space-y-3">
                                                <label className="block text-sm">
                                                    Reason for removal
                                                    (required)
                                                    <textarea
                                                        value={removalReason}
                                                        onChange={(event) => {
                                                            setRemovalReason(
                                                                event.target
                                                                    .value,
                                                            );
                                                            setError(null);
                                                        }}
                                                        maxLength={300}
                                                        rows={3}
                                                        autoFocus
                                                        aria-required="true"
                                                        className="mt-1 w-full rounded-lg border border-red-500/40 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-red-500/20"
                                                        placeholder="Explain why this post must be removed (at least 5 characters)"
                                                    />
                                                </label>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            busyId !== null ||
                                                            removalReason.trim()
                                                                .length < 5
                                                        }
                                                        onClick={() =>
                                                            removePost(preview)
                                                        }
                                                        className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {busyId === preview.id
                                                            ? 'Removing…'
                                                            : 'Remove post'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setConfirmingRemove(
                                                                false,
                                                            );
                                                            setRemovalReason(
                                                                '',
                                                            );
                                                        }}
                                                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {preview.removed && (
                                    <div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
                                        <p>
                                            This post is removed. Reason:{' '}
                                            {preview.removed_reason ??
                                                'No reason recorded.'}
                                        </p>

                                        <button
                                            type="button"
                                            disabled={busyId !== null}
                                            onClick={() => restorePost(preview)}
                                            className="inline-flex items-center gap-2 rounded-lg bg-[#0197F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#087bc2] disabled:opacity-50"
                                        >
                                            <RotateCcw size={16} />
                                            {busyId === preview.id
                                                ? 'Restoring…'
                                                : 'Restore post'}
                                        </button>
                                    </div>
                                )}

                                {error && (
                                    <p
                                        role="alert"
                                        className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
                                    >
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

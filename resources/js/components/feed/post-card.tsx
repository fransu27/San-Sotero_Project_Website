import { router } from '@inertiajs/react';
import {
    Ban,
    BadgeCheck,
    MapPin,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    RotateCcw,
    Send,
    ThumbsDown,
    ThumbsUp,
    Trash2,
    Volume2,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/feed/avatar';
import { fieldClass, PhotoEditor } from '@/components/feed/edit-fields';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type Status =
    'Pending' | 'Under Review' | 'In Progress' | 'Resolved' | 'Rejected';
type Vote = 'satisfied' | 'not_satisfied';
type Comment = { id: number; body: string; author: string; staff: boolean };
export type Complaint = {
    id: number;
    title: string;
    description: string;
    location: string;
    category: string;
    status: Status;
    date: string;
    date_raw: string;
    time: string;
    ts: number;
    author: string;
    mine: boolean;
    edited: boolean;
    satisfied: number;
    not_satisfied: number;
    my_vote: Vote | null;
    removed: boolean;
    removed_reason: string | null;
    image_url: string | null;
    comments: Comment[];
};

export const statusColor: Record<Status | 'Approval' | 'Removed', string> = {
    Pending: '#D7263D',
    'Under Review': '#68C5DB',
    'In Progress': '#0197F6',
    Resolved: '#448FA3',
    Rejected: '#9B2D5C',
    Approval: '#E0A100',
    Removed: '#8A94A0',
};

/** Text → voice with the browser's speech synthesis. Runs locally; nothing is sent to any server. */
const speak = (t: string) => {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(t));
};
const today = () => new Date().toISOString().slice(0, 10);

/** One equal-width button in the action bar (Satisfied · Not satisfied · Listen · Comment). */
const actionBtn =
    'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted';

/**
 * A complaint shown as a feed post.
 *  - Author or admin: can EDIT the post (⋯ menu); an "Edited" label appears next to the time afterwards.
 *  - Resident: can delete THEIR OWN post. If the barangay removed it, they see the reason instead of the content.
 *  - Admin: can change status, and "remove" any post WITH a written reason (restorable).
 *  - Everyone who can see the post can vote Satisfied / Not satisfied (one vote each, counts shown).
 * SECURITY: buttons are only DRAWN by role/ownership. The server re-checks everything
 * (EnsureAdmin, owner checks, validation). Text is escaped by React.
 */
export default function PostCard({
    c,
    isAdmin,
    statuses,
    categories,
}: {
    c: Complaint;
    isAdmin: boolean;
    statuses: Status[];
    categories: string[];
}) {
    const [showComments, setShowComments] = useState(c.comments.length > 0);
    const [body, setBody] = useState('');
    const [removing, setRemoving] = useState(false);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState<string | null>(null);

    // ── edit state ──
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [draft, setDraft] = useState({
        title: c.title,
        description: c.description,
        location: c.location,
        category: c.category,
        incident_date: c.date_raw,
    });
    const [newImage, setNewImage] = useState<File | null>(null);
    const [dropImage, setDropImage] = useState(false);

    const resolved = c.status === 'Resolved' && !c.removed;
    const hiddenFromMe = c.removed && !isAdmin; // server already blanked the content; show the notice only
    const canEdit = (c.mine || isAdmin) && !hiddenFromMe;
    const send = () =>
        body.trim() &&
        router.post(
            `/complaints/${c.id}/comments`,
            { body },
            { preserveScroll: true, onSuccess: () => setBody('') },
        );
    const vote = (type: Vote) =>
        router.post(
            `/complaints/${c.id}/react`,
            { type },
            { preserveScroll: true },
        );

    const startEdit = () => {
        setDraft({
            title: c.title,
            description: c.description,
            location: c.location,
            category: c.category,
            incident_date: c.date_raw,
        });
        setNewImage(null);
        setDropImage(false);
        setErrors({});
        setEditing(true);
    };

    /** Send the edit. Files need multipart, and PHP only reads multipart on POST, so we POST with _method=patch. */
    const saveEdit = () => {
        setSaving(true);
        router.post(
            `/complaints/${c.id}`,
            {
                _method: 'patch',
                ...draft,
                image: newImage,
                remove_image: dropImage,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setEditing(false),
                onError: (e) => setErrors(e as Record<string, string>),
                onFinish: () => setSaving(false),
            },
        );
    };

    /** Admin: flag the post as removed. The reason is required (min 5 chars) and validated again on the server. */
    const confirmRemove = () => {
        if (reason.trim().length < 5) {
            return setReasonError(
                'Please give a reason (at least 5 characters).',
            );
        }

        router.patch(
            `/complaints/${c.id}/remove`,
            { reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRemoving(false);
                    setReason('');
                    setReasonError(null);
                },
                onError: (e) =>
                    setReasonError(e.reason ?? 'Could not remove this post.'),
            },
        );
    };

    const canSave =
        draft.title.trim() && draft.description.trim() && draft.location.trim();

    return (
        <article
            className={cn(
                'overflow-hidden rounded-xl border bg-card shadow-sm',
                c.removed ? 'border-[#D7263D]/50' : 'border-border',
            )}
        >
            {c.removed && (
                <div className="flex items-start gap-2 bg-[#D7263D]/15 px-5 py-2.5 text-sm text-[#ff6b7f]">
                    <Ban size={16} className="mt-0.5 shrink-0" />
                    <p>
                        <span className="font-semibold">
                            Removed by the barangay.
                        </span>{' '}
                        Reason: {c.removed_reason}
                    </p>
                </div>
            )}

            {/* ── Header: avatar · name/meta · status · ⋯ ── */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <Avatar name={c.author} />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm leading-5 font-semibold">
                        <span className="truncate">{c.author}</span>
                        {resolved && (
                            <BadgeCheck
                                size={16}
                                className="shrink-0 text-[#0197F6]"
                                aria-label="Resolved"
                            />
                        )}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-muted-foreground">
                        <span>{c.time}</span>
                        {c.edited && (
                            <>
                                <span aria-hidden>•</span>
                                <span className="italic">Edited</span>
                            </>
                        )}
                        <span aria-hidden>•</span>
                        <span>{c.category}</span>
                        <span aria-hidden>•</span>
                        <span className="inline-flex items-center gap-1">
                            <MapPin size={11} />
                            {c.location}
                        </span>
                    </p>
                </div>

                {c.removed ? (
                    <span
                        className="rounded-full bg-[#8A94A0]/20 px-3 py-1 text-xs font-medium"
                        style={{ color: statusColor.Removed }}
                    >
                        Removed
                    </span>
                ) : isAdmin ? (
                    <select
                        value={c.status}
                        aria-label="Update status"
                        className="rounded-full border border-input bg-background px-3 py-1 text-xs font-medium"
                        style={{ color: statusColor[c.status] }}
                        onChange={(e) =>
                            router.patch(
                                `/complaints/${c.id}/status`,
                                { status: e.target.value },
                                { preserveScroll: true },
                            )
                        }
                    >
                        {statuses.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span
                        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                            color: statusColor[c.status],
                            backgroundColor: `${statusColor[c.status]}18`,
                        }}
                    >
                        {resolved ? (
                            <BadgeCheck size={13} />
                        ) : (
                            <span
                                className="size-1.5 rounded-full"
                                style={{
                                    backgroundColor: statusColor[c.status],
                                }}
                            />
                        )}
                        {c.status}
                    </span>
                )}

                {(c.mine || isAdmin) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            aria-label="Post options"
                            className="rounded-full p-1.5 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[#0197F6]"
                        >
                            <MoreHorizontal size={18} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canEdit && (
                                <DropdownMenuItem onSelect={startEdit}>
                                    <Pencil className="mr-2" size={15} /> Edit
                                    post
                                </DropdownMenuItem>
                            )}
                            {c.mine && (
                                <DropdownMenuItem
                                    className="text-[#D7263D] focus:text-[#D7263D]"
                                    onSelect={() =>
                                        confirm(
                                            'Delete your post permanently? This cannot be undone.',
                                        ) &&
                                        router.delete(`/complaints/${c.id}`, {
                                            preserveScroll: true,
                                        })
                                    }
                                >
                                    <Trash2 className="mr-2" size={15} /> Delete
                                    my post
                                </DropdownMenuItem>
                            )}
                            {isAdmin && !c.removed && (
                                <DropdownMenuItem
                                    onSelect={() => setRemoving(true)}
                                >
                                    <Ban className="mr-2" size={15} /> Remove
                                    with reason…
                                </DropdownMenuItem>
                            )}
                            {isAdmin && c.removed && (
                                <DropdownMenuItem
                                    onSelect={() =>
                                        router.patch(
                                            `/complaints/${c.id}/restore`,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <RotateCcw className="mr-2" size={15} />{' '}
                                    Restore post
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Admin: reason form */}
            {removing && (
                <div className="mx-5 mb-3 space-y-2 rounded-lg border border-[#D7263D]/40 bg-[#D7263D]/5 p-3">
                    <label
                        htmlFor={`reason-${c.id}`}
                        className="text-sm font-medium"
                    >
                        Why is this post being removed? The resident will see
                        this reason.
                    </label>
                    <textarea
                        id={`reason-${c.id}`}
                        rows={2}
                        maxLength={300}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Duplicate report, inappropriate language, not a barangay concern…"
                        className={fieldClass}
                    />
                    {reasonError && (
                        <p className="text-xs text-[#D7263D]">{reasonError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setRemoving(false);
                                setReasonError(null);
                            }}
                            className="rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmRemove}
                            className="rounded-lg bg-[#D7263D] px-3 py-1.5 text-sm font-medium text-white"
                        >
                            Remove post
                        </button>
                    </div>
                </div>
            )}

            {/* ── Body: edit form OR the post ── */}
            {editing ? (
                <div className="space-y-3 px-5 pb-4">
                    <input
                        className={fieldClass}
                        maxLength={150}
                        aria-label="Title"
                        value={draft.title}
                        onChange={(e) =>
                            setDraft({ ...draft, title: e.target.value })
                        }
                    />
                    {errors.title && (
                        <p className="text-xs text-[#D7263D]">{errors.title}</p>
                    )}
                    <textarea
                        className={fieldClass}
                        rows={4}
                        maxLength={3000}
                        aria-label="Details"
                        value={draft.description}
                        onChange={(e) =>
                            setDraft({ ...draft, description: e.target.value })
                        }
                    />
                    {errors.description && (
                        <p className="text-xs text-[#D7263D]">
                            {errors.description}
                        </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-3">
                        <input
                            className={fieldClass}
                            maxLength={150}
                            aria-label="Location"
                            placeholder="Location"
                            value={draft.location}
                            onChange={(e) =>
                                setDraft({ ...draft, location: e.target.value })
                            }
                        />
                        <select
                            className={fieldClass}
                            aria-label="Category"
                            value={draft.category}
                            onChange={(e) =>
                                setDraft({ ...draft, category: e.target.value })
                            }
                        >
                            {categories.map((k) => (
                                <option key={k}>{k}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            className={fieldClass}
                            aria-label="Date it happened"
                            max={today()}
                            value={draft.incident_date}
                            onChange={(e) =>
                                setDraft({
                                    ...draft,
                                    incident_date: e.target.value,
                                })
                            }
                        />
                    </div>
                    {(errors.location ||
                        errors.category ||
                        errors.incident_date) && (
                        <p className="text-xs text-[#D7263D]">
                            {errors.location ||
                                errors.category ||
                                errors.incident_date}
                        </p>
                    )}
                    <PhotoEditor
                        currentUrl={c.image_url}
                        file={newImage}
                        removed={dropImage}
                        onFile={setNewImage}
                        onRemove={setDropImage}
                        error={errors.image}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={saving || !canSave}
                            onClick={saveEdit}
                            className="rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="px-5 pb-4">
                        <h3
                            className={cn(
                                'text-base leading-6 font-semibold',
                                hiddenFromMe &&
                                    'text-muted-foreground line-through',
                            )}
                        >
                            {c.title}
                        </h3>
                        {hiddenFromMe ? (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                The content of this post is no longer shown.
                            </p>
                        ) : (
                            <p className="mt-1 text-sm leading-6 whitespace-pre-line">
                                {c.description}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                            Happened on {c.date}
                        </p>
                    </div>
                    {c.image_url && (
                        <div className="px-5 pb-4">
                            <img
                                src={c.image_url}
                                alt={`Photo for: ${c.title}`}
                                loading="lazy"
                                className="max-h-[520px] w-full rounded-lg border border-border object-cover"
                            />
                        </div>
                    )}
                </>
            )}

            {resolved && (
                <div className="flex items-center gap-2 border-t border-border bg-[#0197F6]/10 px-5 py-2.5 text-sm font-medium text-[#0197F6]">
                    <BadgeCheck size={16} /> Resolved by the barangay
                </div>
            )}

            {/* ── Action bar: Satisfied · Not satisfied · Listen · Comment ── */}
            {!hiddenFromMe && !editing && (
                <div className="flex flex-wrap border-t border-border px-3 py-1.5">
                    <button
                        type="button"
                        onClick={() => vote('satisfied')}
                        aria-pressed={c.my_vote === 'satisfied'}
                        aria-label={`Satisfied, ${c.satisfied} votes`}
                        className={cn(
                            actionBtn,
                            c.my_vote === 'satisfied'
                                ? 'bg-[#0197F6]/10 text-[#0197F6]'
                                : 'text-muted-foreground',
                        )}
                    >
                        <ThumbsUp
                            size={16}
                            fill={
                                c.my_vote === 'satisfied'
                                    ? 'currentColor'
                                    : 'none'
                            }
                        />{' '}
                        Satisfied{' '}
                        <span className="tabular-nums">{c.satisfied}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => vote('not_satisfied')}
                        aria-pressed={c.my_vote === 'not_satisfied'}
                        aria-label={`Not satisfied, ${c.not_satisfied} votes`}
                        className={cn(
                            actionBtn,
                            c.my_vote === 'not_satisfied'
                                ? 'bg-[#D7263D]/10 text-[#D7263D]'
                                : 'text-muted-foreground',
                        )}
                    >
                        <ThumbsDown
                            size={16}
                            fill={
                                c.my_vote === 'not_satisfied'
                                    ? 'currentColor'
                                    : 'none'
                            }
                        />{' '}
                        Not satisfied{' '}
                        <span className="tabular-nums">{c.not_satisfied}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => speak(`${c.title}. ${c.description}`)}
                        className={cn(actionBtn, 'text-muted-foreground')}
                    >
                        <Volume2 size={16} /> Listen
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowComments((v) => !v)}
                        className={cn(actionBtn, 'text-muted-foreground')}
                    >
                        <MessageCircle size={16} /> Comment
                        {c.comments.length > 0 && ` (${c.comments.length})`}
                    </button>
                </div>
            )}

            {showComments && !hiddenFromMe && !editing && (
                <div className="space-y-3 border-t border-border px-5 py-4">
                    {c.comments.map((m) => (
                        <div key={m.id} className="flex gap-2">
                            <Avatar name={m.author} staff={m.staff} size={28} />
                            <div className="rounded-2xl bg-[#F0F2F5] px-3 py-1.5 text-[13px] leading-5 dark:bg-muted">
                                <span className="font-semibold">
                                    {m.author}
                                </span>
                                {m.staff && (
                                    <span className="ml-1 rounded bg-[#0197F6] px-1.5 py-0.5 text-[10px] text-white">
                                        Barangay
                                    </span>
                                )}
                                <p>{m.body}</p>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <input
                            value={body}
                            maxLength={1000}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send()}
                            placeholder="Write a comment…"
                            aria-label="Write a comment"
                            className="w-full rounded-full bg-[#F0F2F5] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0197F6]/40 dark:bg-muted"
                        />
                        <button
                            type="button"
                            onClick={send}
                            aria-label="Send comment"
                            className="rounded-full bg-[#0197F6] p-2.5 text-white"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}

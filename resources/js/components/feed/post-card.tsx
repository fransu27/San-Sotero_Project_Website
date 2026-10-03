import { router } from '@inertiajs/react';
import { Ban, BadgeCheck, Check, ChevronDown, ClipboardCheck, Globe, Lock, MapPin, MessageCircle, MoreHorizontal, Pencil, RotateCcw, Send, ThumbsDown, ThumbsUp, Trash2, Volume2, X } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/feed/avatar';
import { fieldClass, PhotoEditor } from '@/components/feed/edit-fields';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useLocale } from '@/hooks/use-locale';
import { DATE_LOCALE, timeAgo } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type Status = 'Pending' | 'Under Review' | 'In Progress' | 'Resolved' | 'Rejected';
type Vote = 'satisfied' | 'not_satisfied';
type Comment = { id: number; body: string; author: string | null; staff: boolean };
type TimelineEvent = { id: number; type: 'submitted' | 'approved' | 'status' | 'edited' | 'resubmitted'; status: string | null; note: string | null; ts: number; staff: boolean };
export type Complaint = {
    id: number; title: string; description: string; location: string; category: string; custom_category: string | null;
    status: Status; approval: 'pending' | 'approved'; visibility: 'public' | 'private'; anonymous: boolean;
    date: string; ts: number; edited: boolean; author: string | null; mine: boolean;
    satisfied: number; not_satisfied: number; my_vote: Vote | null;
    removed: boolean; removed_reason: string | null; image_url: string | null; comments: Comment[]; events: TimelineEvent[];
};

export const statusColor: Record<Status | 'Approval' | 'Removed', string> = {
    Pending: '#D7263D', 'Under Review': '#68C5DB', 'In Progress': '#0197F6', Resolved: '#448FA3', Rejected: '#9B2D5C', Approval: '#E0A100', Removed: '#8A94A0',
};

/** Text → voice with the browser's speech synthesis. Runs locally; nothing is sent to any server. */
const speak = (text: string) => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); };
const today = () => new Date().toISOString().slice(0, 10);
const actionBtn = 'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted';

/**
 * One complaint in the feed.
 *
 * WHAT EACH PERSON SEES / CAN DO (the server decides; the buttons here are only drawn to match)
 *  - Resident, own post: sees "waiting for approval" until the admin approves a PUBLIC post; can edit, delete, see the timeline.
 *  - Admin, post in the queue: Approve / Reject buttons. A rejected post becomes "Rejected" with the reason on its timeline.
 *  - Admin, approved post: status picker (Pending, Under Review, In Progress, Resolved, Rejected) with an optional note.
 *    The note is REQUIRED for Rejected. Every change is added to the timeline, and the resident sees it within ~15 s.
 *  - Author or admin: Edit (title, text, location, category / "Others", date, photo; the author also Public/Private + anonymous).
 *    After saving, an "Edited" label shows. A resident's edit of a PUBLIC post goes back to the approval queue.
 *  - Anyone who can see an approved post can vote Satisfied / Not satisfied and comment.
 *
 * SECURITY: nothing here grants access. ComplaintPolicy + EnsureAdmin + validation on the server re-check every action;
 * server errors are shown instead of hidden. Text is rendered by React (auto-escaped), never as HTML.
 */
export default function PostCard({ c, isAdmin, statuses, categories }: { c: Complaint; isAdmin: boolean; statuses: Status[]; categories: string[] }) {
    const { t, locale } = useLocale();
    const [showComments, setShowComments] = useState(c.comments.length > 0);
    const [showTimeline, setShowTimeline] = useState(false);
    const [body, setBody] = useState('');

    // reject / remove with a reason
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState<string | null>(null);

    // admin status change (pick -> optional note -> confirm)
    const [nextStatus, setNextStatus] = useState<Status | null>(null);
    const [note, setNote] = useState('');
    const [statusError, setStatusError] = useState<string | null>(null);

    // edit
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newImage, setNewImage] = useState<File | null>(null);
    const [dropImage, setDropImage] = useState(false);
    const fresh = () => ({ title: c.title, description: c.description, location: c.location, category: c.category, custom_category: c.custom_category ?? '', incident_date: c.date, visibility: c.visibility, anonymous: c.anonymous });
    const [draft, setDraft] = useState(fresh);

    const waiting = c.approval === 'pending' && !c.removed;
    const live = c.approval === 'approved' && !c.removed;
    const resolved = c.status === 'Resolved' && live;
    const hiddenFromMe = c.removed && !isAdmin;
    const canEdit = (c.mine || isAdmin) && !hiddenFromMe;
    const name = c.author ?? t('post.anon');
    const categoryLabel = c.category === 'Others' && c.custom_category ? `${t('cat.Others')}: ${c.custom_category}` : t(`cat.${c.category}`);
    const prettyDate = new Date(`${c.date}T00:00:00`).toLocaleDateString(DATE_LOCALE[locale], { year: 'numeric', month: 'short', day: 'numeric' });

    const send = () => body.trim() && router.post(`/complaints/${c.id}/comments`, { body }, { preserveScroll: true, onSuccess: () => setBody('') });
    const vote = (type: Vote) => router.post(`/complaints/${c.id}/react`, { type }, { preserveScroll: true });
    const approve = () => router.patch(`/complaints/${c.id}/approve`, {}, { preserveScroll: true });

    /** Reject (post in the queue) or remove (approved post): a written reason is required and re-checked by the server. */
    const confirmReject = () => {
        if (reason.trim().length < 5) return setReasonError(t('post.reasonMin'));
        router.patch(`/complaints/${c.id}/remove`, { reason }, {
            preserveScroll: true,
            onSuccess: () => { setRejecting(false); setReason(''); setReasonError(null); },
            onError: (e) => setReasonError(e.reason ?? 'Error'),
        });
    };

    const pickStatus = (value: string) => { setNextStatus(value === c.status ? null : (value as Status)); setNote(''); setStatusError(null); };
    const confirmStatus = () => {
        if (!nextStatus) return;
        if (nextStatus === 'Rejected' && note.trim().length < 5) return setStatusError(t('post.noteRejected'));
        router.patch(`/complaints/${c.id}/status`, { status: nextStatus, note: note.trim() || null }, {
            preserveScroll: true,
            onSuccess: () => { setNextStatus(null); setNote(''); setStatusError(null); },
            onError: (e) => setStatusError(e.note ?? e.status ?? 'Error'), // e.g. "Approve this report before changing its status."
        });
    };

    const startEdit = () => { setDraft(fresh()); setNewImage(null); setDropImage(false); setErrors({}); setEditing(true); };

    /** Files need multipart, and PHP only reads multipart on POST, so we POST with _method=patch. */
    const saveEdit = () => {
        setSaving(true);
        router.post(`/complaints/${c.id}`, {
            _method: 'patch', title: draft.title, description: draft.description, location: draft.location, category: draft.category,
            custom_category: draft.category === 'Others' ? draft.custom_category : '', incident_date: draft.incident_date,
            visibility: draft.visibility, is_anonymous: draft.anonymous, image: newImage, remove_image: dropImage,
        }, {
            forceFormData: true, preserveScroll: true,
            onSuccess: () => setEditing(false),
            onError: (e) => setErrors(e as Record<string, string>),
            onFinish: () => setSaving(false),
        });
    };
    const canSave = draft.title.trim() && draft.description.trim() && draft.location.trim() && (draft.category !== 'Others' || draft.custom_category.trim());
    const E = ({ k }: { k: string[] }) => { const m = k.map((x) => errors[x]).find(Boolean); return m ? <p role="alert" className="text-xs text-[#D7263D]">{m}</p> : null; };

    const timelineLabel = (e: TimelineEvent) => e.type === 'status' ? t('tl.status', { status: t(`status.${e.status}`) }) : t(`tl.${e.type}`);
    const chipColor = waiting ? statusColor.Approval : c.removed ? statusColor.Removed : statusColor[c.status];
    const chipText = waiting ? t(isAdmin ? 'status.ApprovalAdmin' : 'status.Approval') : c.removed ? t('status.Removed') : t(`status.${c.status}`);

    return (
        <article className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', c.removed ? 'border-[#D7263D]/50' : waiting ? 'border-[#E0A100]/60' : 'border-border')}>
            {c.removed && (
                <div className="flex items-start gap-2 bg-[#D7263D]/15 px-5 py-2.5 text-sm text-[#ff6b7f]">
                    <Ban size={16} className="mt-0.5 shrink-0" />
                    <p><span className="font-semibold">{t(c.status === 'Rejected' ? 'post.rejectedBanner' : 'post.removedBanner')}</span> {t('post.reason', { reason: c.removed_reason ?? '' })}</p>
                </div>
            )}

            {/* Waiting for approval: the resident is told; the admin gets Approve / Reject */}
            {waiting && (
                <div className="flex flex-wrap items-center gap-3 bg-[#E0A100]/15 px-5 py-3 text-sm">
                    <ClipboardCheck size={18} className="shrink-0 text-[#E0A100]" />
                    <p className="min-w-0 flex-1">{t(isAdmin ? 'post.awaitingAdmin' : 'post.awaitingMine')}</p>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button type="button" onClick={approve} className="inline-flex items-center gap-1.5 rounded-lg bg-[#448FA3] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"><Check size={15} /> {t('post.approve')}</button>
                            <button type="button" onClick={() => setRejecting(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#D7263D] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"><X size={15} /> {t('post.reject')}</button>
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <Avatar name={name} anonymous={c.author === null} />
                <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-1.5 text-sm leading-5 font-semibold">
                        <span className="truncate">{name}</span>
                        {resolved && <BadgeCheck size={16} className="shrink-0 text-[#0197F6]" aria-label={t('status.Resolved')} />}
                        {c.anonymous && c.author !== null && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] leading-none font-medium text-muted-foreground">{t(c.mine ? 'post.anonMine' : 'post.anonAdmin')}</span>}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-muted-foreground">
                        <span>{timeAgo(c.ts, locale)}</span>
                        {c.edited && <><span aria-hidden>•</span><span className="italic">{t('post.edited')}</span></>}
                        <span aria-hidden>•</span><span>{categoryLabel}</span>
                        <span aria-hidden>•</span><span className="inline-flex items-center gap-1"><MapPin size={11} />{c.location}</span>
                        {(c.mine || isAdmin) && <><span aria-hidden>•</span><span className="inline-flex items-center gap-1" title={t(c.visibility === 'public' ? 'comp.public' : 'comp.private')}>{c.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}{t(c.visibility === 'public' ? 'comp.public' : 'comp.private')}</span></>}
                    </p>
                </div>

                {isAdmin && live ? (
                    <select value={nextStatus ?? c.status} aria-label={t('post.status')} className="rounded-full border border-input bg-background px-3 py-1 text-xs font-medium" style={{ color: statusColor[nextStatus ?? c.status] }}
                        onChange={(e) => pickStatus(e.target.value)}>
                        {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                    </select>
                ) : (
                    <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ color: chipColor, backgroundColor: `${chipColor}22` }}>
                        {resolved ? <BadgeCheck size={13} /> : <span className="size-1.5 rounded-full" style={{ backgroundColor: chipColor }} />}{chipText}
                    </span>
                )}

                {(c.mine || isAdmin) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger aria-label={t('post.menu')} className="rounded-full p-1.5 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[#0197F6]"><MoreHorizontal size={18} /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canEdit && <DropdownMenuItem onSelect={startEdit}><Pencil className="mr-2" size={15} /> {t('post.edit')}</DropdownMenuItem>}
                            {c.mine && (
                                <DropdownMenuItem className="text-[#D7263D] focus:text-[#D7263D]" onSelect={() => confirm(t('post.deleteConfirm')) && router.delete(`/complaints/${c.id}`, { preserveScroll: true })}>
                                    <Trash2 className="mr-2" size={15} /> {t('post.delete')}
                                </DropdownMenuItem>
                            )}
                            {isAdmin && !c.removed && <DropdownMenuItem onSelect={() => setRejecting(true)}><Ban className="mr-2" size={15} /> {t('post.remove')}</DropdownMenuItem>}
                            {isAdmin && c.removed && <DropdownMenuItem onSelect={() => router.patch(`/complaints/${c.id}/restore`, {}, { preserveScroll: true })}><RotateCcw className="mr-2" size={15} /> {t('post.restore')}</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Admin: confirm a status change, with an optional note (required for Rejected) */}
            {nextStatus && (
                <div className="mx-5 mb-3 space-y-2 rounded-lg border border-input bg-muted/40 p-3">
                    <p className="text-sm font-medium">{t('tl.status', { status: t(`status.${nextStatus}`) })}</p>
                    <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} aria-label={t('post.noteLabel')} placeholder={t(nextStatus === 'Rejected' ? 'post.noteRejected' : 'post.noteLabel')} />
                    {statusError && <p role="alert" className="text-xs text-[#D7263D]">{statusError}</p>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setNextStatus(null); setStatusError(null); }} className="rounded-lg px-3 py-1.5 text-sm hover:bg-muted">{t('post.cancel')}</button>
                        <button type="button" onClick={confirmStatus} className="rounded-lg bg-[#0197F6] px-3 py-1.5 text-sm font-medium text-white">{t('post.updateStatus')}</button>
                    </div>
                </div>
            )}

            {/* Admin: reject / remove reason */}
            {rejecting && (
                <div className="mx-5 mb-3 space-y-2 rounded-lg border border-[#D7263D]/40 bg-[#D7263D]/5 p-3">
                    <label htmlFor={`reason-${c.id}`} className="text-sm font-medium">{t('post.rejectAsk')}</label>
                    <textarea id={`reason-${c.id}`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('post.rejectPh')} className={fieldClass} />
                    {reasonError && <p role="alert" className="text-xs text-[#D7263D]">{reasonError}</p>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setRejecting(false); setReasonError(null); }} className="rounded-lg px-3 py-1.5 text-sm hover:bg-muted">{t('post.cancel')}</button>
                        <button type="button" onClick={confirmReject} className="rounded-lg bg-[#D7263D] px-3 py-1.5 text-sm font-medium text-white">{t('post.rejectBtn')}</button>
                    </div>
                </div>
            )}

            {/* Body: edit form OR the post */}
            {editing ? (
                <div className="space-y-3 px-5 pb-4">
                    <input className={fieldClass} maxLength={150} aria-label={t('post.title')} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    <textarea className={fieldClass} rows={4} maxLength={3000} aria-label={t('post.details')} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                    <E k={['title', 'description']} />
                    <div className="grid gap-2 sm:grid-cols-3">
                        <input className={fieldClass} maxLength={150} aria-label={t('comp.location')} placeholder={t('comp.location')} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
                        <select className={fieldClass} aria-label={t('comp.category')} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categories.map((k) => <option key={k} value={k}>{t(`cat.${k}`)}</option>)}</select>
                        <input type="date" className={fieldClass} aria-label={t('comp.date')} max={today()} value={draft.incident_date} onChange={(e) => setDraft({ ...draft, incident_date: e.target.value })} />
                    </div>
                    {draft.category === 'Others' && <input className={fieldClass} maxLength={60} placeholder={t('comp.other')} aria-label={t('comp.other')} value={draft.custom_category} onChange={(e) => setDraft({ ...draft, custom_category: e.target.value })} />}
                    <E k={['location', 'category', 'custom_category', 'incident_date']} />

                    {c.mine && (
                        <>
                            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('comp.visibility')}>
                                {([['public', Globe, 'comp.public', 'comp.publicHint'], ['private', Lock, 'comp.private', 'comp.privateHint']] as const).map(([v, Icon, label, hint]) => (
                                    <button key={v} type="button" role="radio" aria-checked={draft.visibility === v} onClick={() => setDraft({ ...draft, visibility: v })}
                                        className={cn('flex items-start gap-2 rounded-lg border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]', draft.visibility === v ? 'border-[#0197F6] bg-[#0197F6]/10' : 'border-input hover:bg-muted')}>
                                        <Icon size={16} className={cn('mt-0.5 shrink-0', draft.visibility === v && 'text-[#0197F6]')} />
                                        <span><span className="block text-sm font-medium">{t(label)}</span><span className="block text-xs text-muted-foreground">{t(hint)}</span></span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-start justify-between gap-3 rounded-lg border border-input p-3">
                                <div><p className="text-sm font-medium">{t('comp.anonymous')}</p><p className="text-xs text-muted-foreground">{t('comp.anonymousHint')}</p></div>
                                <Switch checked={draft.anonymous} onChange={(v) => setDraft({ ...draft, anonymous: v })} label={t('comp.anonymous')} />
                            </div>
                            {!isAdmin && draft.visibility === 'public' && <p className="text-xs text-muted-foreground">{t('post.reviewAgain')}</p>}
                        </>
                    )}

                    <PhotoEditor currentUrl={c.image_url} file={newImage} removed={dropImage} onFile={setNewImage} onRemove={setDropImage} error={errors.image} />
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-muted">{t('post.cancel')}</button>
                        <button type="button" disabled={saving || !canSave} onClick={saveEdit} className="rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? t('post.saving') : t('post.save')}</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="px-5 pb-4">
                        <h3 className={cn('text-base leading-6 font-semibold', hiddenFromMe && 'text-muted-foreground line-through')}>{c.title}</h3>
                        {hiddenFromMe
                            ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('post.removedContent')}</p>
                            : <p className="mt-1 text-sm leading-6 whitespace-pre-line">{c.description}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">{t('post.happened', { date: prettyDate })}</p>
                    </div>
                    {c.image_url && (
                        <div className="px-5 pb-4">
                            <img src={c.image_url} alt={c.title} loading="lazy" className="max-h-[520px] w-full rounded-lg border border-border object-cover" />
                        </div>
                    )}
                </>
            )}

            {resolved && !editing && (
                <div className="flex items-center gap-2 border-t border-border bg-[#0197F6]/10 px-5 py-2.5 text-sm font-medium text-[#0197F6]"><BadgeCheck size={16} /> {t('post.resolvedBar')}</div>
            )}

            {/* Progress timeline: every submit / approval / status change, so the resident can follow along */}
            {!hiddenFromMe && !editing && c.events.length > 0 && (
                <div className="border-t border-border px-5 py-3">
                    <button type="button" onClick={() => setShowTimeline((v) => !v)} aria-expanded={showTimeline} className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#0197F6]">
                        {t('post.timeline', { n: c.events.length })} <ChevronDown size={15} className={cn('transition-transform', showTimeline && 'rotate-180')} />
                    </button>
                    {showTimeline && (
                        <ol className="mt-3 space-y-3 border-l border-border pl-4">
                            {[...c.events].reverse().map((e) => (
                                <li key={e.id} className="relative">
                                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-card" style={{ backgroundColor: e.type === 'status' && e.status ? statusColor[e.status as Status] ?? '#0197F6' : '#0197F6' }} />
                                    <p className="text-sm leading-5">{timelineLabel(e)}</p>
                                    {e.note && <p className="mt-0.5 text-sm leading-5 text-muted-foreground">“{e.note}”</p>}
                                    <p className="text-xs text-muted-foreground">{timeAgo(e.ts, locale)}{e.staff && ` · ${t('tl.staff')}`}</p>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}

            {/* Action bar: Satisfied · Not satisfied · Listen · Comment (votes and comments only on approved posts) */}
            {!hiddenFromMe && !editing && (
                <div className="flex flex-wrap border-t border-border px-3 py-1.5">
                    {live && (
                        <>
                            <button type="button" onClick={() => vote('satisfied')} aria-pressed={c.my_vote === 'satisfied'} className={cn(actionBtn, c.my_vote === 'satisfied' ? 'bg-[#0197F6]/10 text-[#0197F6]' : 'text-muted-foreground')}>
                                <ThumbsUp size={16} fill={c.my_vote === 'satisfied' ? 'currentColor' : 'none'} /> {t('post.satisfied')} <span className="tabular-nums">{c.satisfied}</span>
                            </button>
                            <button type="button" onClick={() => vote('not_satisfied')} aria-pressed={c.my_vote === 'not_satisfied'} className={cn(actionBtn, c.my_vote === 'not_satisfied' ? 'bg-[#D7263D]/10 text-[#D7263D]' : 'text-muted-foreground')}>
                                <ThumbsDown size={16} fill={c.my_vote === 'not_satisfied' ? 'currentColor' : 'none'} /> {t('post.notSatisfied')} <span className="tabular-nums">{c.not_satisfied}</span>
                            </button>
                        </>
                    )}
                    <button type="button" onClick={() => speak(`${c.title}. ${c.description}`)} className={cn(actionBtn, 'text-muted-foreground')}><Volume2 size={16} /> {t('post.listen')}</button>
                    {live && <button type="button" onClick={() => setShowComments((v) => !v)} className={cn(actionBtn, 'text-muted-foreground')}><MessageCircle size={16} /> {t('post.comment')}{c.comments.length > 0 && ` (${c.comments.length})`}</button>}
                </div>
            )}

            {live && showComments && !editing && (
                <div className="space-y-3 border-t border-border px-5 py-4">
                    {c.comments.map((m) => (
                        <div key={m.id} className="flex gap-2">
                            <Avatar name={m.author ?? t('post.anon')} anonymous={m.author === null} staff={m.staff} size={28} />
                            <div className="rounded-2xl bg-[#F0F2F5] px-3 py-1.5 text-[13px] leading-5 dark:bg-muted">
                                <span className="font-semibold">{m.author ?? t('post.anon')}</span>
                                {m.staff && <span className="ml-1 rounded bg-[#0197F6] px-1.5 py-0.5 text-[10px] text-white">{t('post.barangay')}</span>}
                                <p>{m.body}</p>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <input value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={t('post.writeComment')} aria-label={t('post.writeComment')}
                            className="w-full rounded-full bg-[#F0F2F5] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0197F6]/40 dark:bg-muted" />
                        <button type="button" onClick={send} aria-label={t('post.sendComment')} className="rounded-full bg-[#0197F6] p-2.5 text-white"><Send size={15} /></button>
                    </div>
                </div>
            )}
        </article>
    );
}

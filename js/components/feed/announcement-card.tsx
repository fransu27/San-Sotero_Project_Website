import type { FormDataConvertible } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import {
    Megaphone,
    MessageCircle,
    Pencil,
    Pin,
    PinOff,
    ThumbsDown,
    ThumbsUp,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
    AttachmentList,
    AttachmentPicker,
} from '@/components/feed/attachments';
import type { Attachment } from '@/components/feed/attachments';
import { Avatar } from '@/components/feed/avatar';
import { fieldClass, PhotoEditor } from '@/components/feed/edit-fields';
import { ZoomableImage } from '@/components/feed/image-lightbox';
import PostModal from '@/components/feed/post-modal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/use-locale';
import { LOCALE_NAMES, localizeAnnouncement, timeAgo } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Translations = Partial<
    Record<Locale, { title?: string; body?: string }>
> | null;
export type Notice = {
    id: number;
    title: string;
    body: string;
    translations: Translations;
    pinned: boolean;
    edited: boolean;
    image_url: string | null;
    author: string;
    author_avatar: string | null;
    ts: number;
    attachments?: Attachment[];
    likes?: number;
    dislikes?: number;
    my_vote?: 'like' | 'dislike' | null;
    comments?: {
        id: number;
        body: string;
        staff: boolean;
        author: string;
        avatar: string | null;
    }[];
};

const LANGS = ['tl', 'ceb', 'war'] as const;
const actionBtn =
    'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted';

/**
 * One announcement. The text is shown in the reader's language (falls back to another language if the admin
 * did not write that one, and says so). Pin / edit / delete are only DRAWN for admins; the server (EnsureAdmin)
 * enforces it either way. After an edit, "Edited" shows next to the time. Text is rendered by React (auto-escaped).
 */
export default function AnnouncementCard({
    a,
    isAdmin,
}: {
    a: Notice;
    isAdmin: boolean;
}) {
    const { t, locale } = useLocale();
    const shown = localizeAnnouncement(a, locale);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const initial = () => {
        const d: Record<string, string> = { title: a.title, body: a.body };
        LANGS.forEach((k) => {
            d[`${k}_title`] = a.translations?.[k]?.title ?? '';
            d[`${k}_body`] = a.translations?.[k]?.body ?? '';
        });

        return d;
    };
    const [draft, setDraft] = useState(initial);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [dropImage, setDropImage] = useState(false);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [removeFileIds, setRemoveFileIds] = useState<number[]>([]);

    // like / dislike / comment (everyone who is signed in can; the server re-checks and throttles)
    const comments = a.comments ?? [];
    const [showComments, setShowComments] = useState(false); // opens the pop-out with the post and its comments
    const vote = (type: 'like' | 'dislike') =>
        router.post(
            `/announcements/${a.id}/react`,
            { type },
            { preserveScroll: true },
        );
    const send = (body: string, done: () => void) =>
        router.post(
            `/announcements/${a.id}/comments`,
            { body },
            { preserveScroll: true, onSuccess: done },
        );

    const startEdit = () => {
        setDraft(initial());
        setNewImage(null);
        setDropImage(false);
        setNewFiles([]);
        setRemoveFileIds([]);
        setErrors({});
        setEditing(true);
    };

    const save = () => {
        setSaving(true);
        const data: Record<string, FormDataConvertible> = {
            title: draft.title,
            body: draft.body,
            image: newImage,
            remove_image: dropImage,
            files: newFiles,
            remove_files: removeFileIds,
        };
        LANGS.forEach((k) => {
            if (draft[`${k}_title`].trim() || draft[`${k}_body`].trim()) {
                data[`${k}_title`] = draft[`${k}_title`];
                data[`${k}_body`] = draft[`${k}_body`];
            }
        });
        router.post(`/announcements/${a.id}`, data, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setEditing(false),
            onError: (e) => setErrors(e as Record<string, string>),
            onFinish: () => setSaving(false),
        });
    };

    const iconBtn =
        'inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
    const set = (k: string) => (e: { target: { value: string } }) =>
        setDraft({ ...draft, [k]: e.target.value });

    // Like · dislike · comment row (shared by the card and its pop-out)
    const actionBar = (
        <div className="flex border-t border-border px-3 py-1.5">
            <button
                type="button"
                onClick={() => vote('like')}
                aria-pressed={a.my_vote === 'like'}
                aria-label={`Like: ${a.likes ?? 0}`}
                title="Like"
                className={cn(
                    actionBtn,
                    a.my_vote === 'like'
                        ? 'bg-[#0197F6]/10 text-[#0197F6]'
                        : 'text-muted-foreground',
                )}
            >
                <ThumbsUp
                    size={18}
                    fill={a.my_vote === 'like' ? 'currentColor' : 'none'}
                />
                <span className="tabular-nums">{a.likes ?? 0}</span>
            </button>
            <button
                type="button"
                onClick={() => vote('dislike')}
                aria-pressed={a.my_vote === 'dislike'}
                aria-label={`Dislike: ${a.dislikes ?? 0}`}
                title="Dislike"
                className={cn(
                    actionBtn,
                    a.my_vote === 'dislike'
                        ? 'bg-[#D7263D]/10 text-[#D7263D]'
                        : 'text-muted-foreground',
                )}
            >
                <ThumbsDown
                    size={18}
                    fill={a.my_vote === 'dislike' ? 'currentColor' : 'none'}
                />
                <span className="tabular-nums">{a.dislikes ?? 0}</span>
            </button>
            <button
                type="button"
                onClick={() => setShowComments(true)}
                aria-haspopup="dialog"
                aria-label={`${t('post.comment')}: ${comments.length}`}
                title={t('post.comment')}
                className={cn(
                    actionBtn,
                    showComments ? 'text-[#0197F6]' : 'text-muted-foreground',
                )}
            >
                <MessageCircle size={18} />
                <span className="tabular-nums">{comments.length}</span>
            </button>
        </div>
    );

    // The post as shown inside the pop-out (no admin controls: those stay on the card itself).
    const postBody = (
        <div>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <Avatar name={a.author} src={a.author_avatar} staff />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm leading-5 font-semibold">
                        <span className="truncate">{a.author}</span>
                        <span className="rounded bg-[#0197F6] px-1.5 py-0.5 text-[10px] leading-none font-medium text-white">
                            {t('post.barangay')}
                        </span>
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                        {timeAgo(a.ts, locale)}
                        {a.edited && ` • ${t('post.edited')}`}
                    </p>
                </div>
            </div>
            <div className="px-4 pb-3">
                <h3 className="flex items-start gap-2 text-base leading-6 font-semibold">
                    <Megaphone
                        size={16}
                        color="#0197F6"
                        className="mt-1 shrink-0"
                    />
                    <span>{shown.title}</span>
                </h3>
                <p className="mt-1 text-sm leading-6 whitespace-pre-line">
                    {shown.body}
                </p>
            </div>
            {a.image_url && (
                <div className="px-4 pb-3">
                    <ZoomableImage
                        src={a.image_url}
                        alt={shown.title}
                        className="max-h-[420px] w-full rounded-lg border border-border object-contain"
                    />
                </div>
            )}
            {(a.attachments?.length ?? 0) > 0 && (
                <AttachmentList
                    files={a.attachments ?? []}
                    className="px-4 pb-3"
                />
            )}
        </div>
    );

    const deleteAnnouncement = () => {
        setDeleteSubmitting(true);
        setDeleteError(null);
        router.delete(`/announcements/${a.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteDialogOpen(false),
            onError: () =>
                setDeleteError('The announcement could not be deleted. Please try again.'),
            onFinish: () => setDeleteSubmitting(false),
        });
    };

    return (
        <article
            className={cn(
                'ss-card overflow-hidden rounded-2xl border bg-card',
                a.pinned
                    ? 'border-[#D7263D]/45 shadow-[0_12px_34px_-18px_rgb(215_38_61/0.55)]'
                    : 'border-border',
            )}
        >
            {a.pinned && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-[#D7263D] to-[#b81d32] px-4 py-2 text-xs font-semibold tracking-wide text-white">
                    <Pin size={13} className="rotate-45" /> {t('post.pinned')}
                </div>
            )}

            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <Avatar name={a.author} src={a.author_avatar} staff />
                <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm leading-5 font-semibold">
                        <span className="truncate">{a.author}</span>
                        <span className="shrink-0 rounded-full bg-[#0197F6]/15 px-2 py-0.5 text-[10px] leading-none font-semibold tracking-wide text-[#0a74c4] uppercase dark:bg-[#0197F6]/25 dark:text-[#7cc9fb]">
                            {t('post.barangay')}
                        </span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs leading-5 text-muted-foreground">
                        <span>{timeAgo(a.ts, locale)}</span>
                        {a.edited && (
                            <>
                                <span aria-hidden>•</span>
                                <span className="italic">
                                    {t('post.edited')}
                                </span>
                            </>
                        )}
                    </p>
                </div>
                {isAdmin && !editing && (
                    <div className="-mr-1 flex shrink-0 gap-0.5">
                        <button
                            title={t('post.editAnn')}
                            aria-label={t('post.editAnn')}
                            className={iconBtn}
                            onClick={startEdit}
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            title={t(a.pinned ? 'post.unpin' : 'post.pin')}
                            aria-label={t(a.pinned ? 'post.unpin' : 'post.pin')}
                            className={iconBtn}
                            onClick={() =>
                                router.patch(
                                    `/announcements/${a.id}/pin`,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            {a.pinned ? (
                                <PinOff size={16} />
                            ) : (
                                <Pin size={16} />
                            )}
                        </button>
                        <button
                            title={t('post.deleteAnn')}
                            aria-label={t('post.deleteAnn')}
                            className={iconBtn}
                            onClick={() => {
                                setDeleteError(null);
                                setDeleteDialogOpen(true);
                            }}
                        >
                            <Trash2 size={16} color="#D7263D" />
                        </button>
                    </div>
                )}
            </div>

            {editing ? (
                <div className="space-y-3 px-4 pb-3">
                    <input
                        className={fieldClass}
                        maxLength={120}
                        aria-label={t('post.title')}
                        value={draft.title}
                        onChange={set('title')}
                    />
                    <textarea
                        className={fieldClass}
                        rows={4}
                        maxLength={2000}
                        aria-label={t('post.details')}
                        value={draft.body}
                        onChange={set('body')}
                    />
                    {(errors.title || errors.body) && (
                        <p role="alert" className="text-xs text-[#D7263D]">
                            {errors.title || errors.body}
                        </p>
                    )}
                    <details
                        className="rounded-lg border border-input p-3"
                        open={LANGS.some(
                            (k) => draft[`${k}_title`] || draft[`${k}_body`],
                        )}
                    >
                        <summary className="cursor-pointer text-sm font-medium">
                            {t('comp.translations')}
                        </summary>
                        <div className="mt-3 space-y-3">
                            {LANGS.map((k) => (
                                <div key={k} className="space-y-2">
                                    <input
                                        className={fieldClass}
                                        maxLength={120}
                                        placeholder={t('comp.titleFor', {
                                            lang: LOCALE_NAMES[k],
                                        })}
                                        aria-label={t('comp.titleFor', {
                                            lang: LOCALE_NAMES[k],
                                        })}
                                        value={draft[`${k}_title`]}
                                        onChange={set(`${k}_title`)}
                                    />
                                    <textarea
                                        className={fieldClass}
                                        rows={2}
                                        maxLength={2000}
                                        placeholder={t('comp.bodyFor', {
                                            lang: LOCALE_NAMES[k],
                                        })}
                                        aria-label={t('comp.bodyFor', {
                                            lang: LOCALE_NAMES[k],
                                        })}
                                        value={draft[`${k}_body`]}
                                        onChange={set(`${k}_body`)}
                                    />
                                    {(errors[`${k}_title`] ||
                                        errors[`${k}_body`]) && (
                                        <p
                                            role="alert"
                                            className="text-xs text-[#D7263D]"
                                        >
                                            {errors[`${k}_title`] ||
                                                errors[`${k}_body`]}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </details>
                    <PhotoEditor
                        currentUrl={a.image_url}
                        file={newImage}
                        removed={dropImage}
                        onFile={setNewImage}
                        onRemove={setDropImage}
                        error={errors.image}
                    />
                    <AttachmentPicker
                        files={newFiles}
                        onFiles={setNewFiles}
                        existing={a.attachments ?? []}
                        removedIds={removeFileIds}
                        onRemoveExisting={setRemoveFileIds}
                        error={
                            Object.entries(errors).find(([k]) =>
                                k.startsWith('files'),
                            )?.[1]
                        }
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                        >
                            {t('post.cancel')}
                        </button>
                        <button
                            type="button"
                            disabled={
                                saving ||
                                !draft.title.trim() ||
                                !draft.body.trim()
                            }
                            onClick={save}
                            className="rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                            {saving ? t('post.saving') : t('post.save')}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="px-4 pb-3">
                        <h3 className="flex items-start gap-2.5 text-base leading-6 font-semibold">
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#0197F6]/12 text-[#0197F6]">
                                <Megaphone size={14} />
                            </span>
                            <span>{shown.title}</span>
                        </h3>
                        <p className="mt-1 text-sm leading-6 whitespace-pre-line">
                            {shown.body}
                        </p>
                        {shown.lang !== locale && (
                            <p className="mt-2 text-xs text-muted-foreground italic">
                                {t('post.shownIn', {
                                    lang: LOCALE_NAMES[shown.lang],
                                })}
                            </p>
                        )}
                    </div>
                    {a.image_url && (
                        <div className="px-4 pb-3">
                            <ZoomableImage
                                src={a.image_url}
                                alt={shown.title}
                                className="post-media max-h-[280px] w-full rounded-lg border border-border object-cover"
                            />
                        </div>
                    )}
                    {(a.attachments?.length ?? 0) > 0 && (
                        <AttachmentList
                            files={a.attachments ?? []}
                            className="px-4 pb-3"
                        />
                    )}
                </>
            )}

            {/* Like · dislike · comment (icons + counts only). Comment opens the pop-out. */}
            {!editing && actionBar}

            {!editing && (
                <PostModal
                    open={showComments}
                    onOpenChange={setShowComments}
                    title={`${a.author} · ${t('post.barangay')}`}
                    comments={comments}
                    onSend={send}
                >
                    {postBody}
                    {actionBar}
                </PostModal>
            )}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this announcement?</DialogTitle>
                        <DialogDescription>
                            Residents will no longer see this announcement in the feed. Continue only if you intend to delete it.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && (
                        <p role="alert" className="text-sm text-destructive">
                            {deleteError}
                        </p>
                    )}
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={deleteSubmitting}
                            className="rounded-lg border px-4 py-2 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={deleteAnnouncement}
                            disabled={deleteSubmitting}
                            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
                        >
                            {deleteSubmitting ? 'Deleting…' : 'Delete announcement'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </article>
    );
}

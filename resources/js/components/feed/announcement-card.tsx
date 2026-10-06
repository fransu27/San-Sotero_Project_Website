import { router } from '@inertiajs/react';
import { Megaphone, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/feed/avatar';
import { fieldClass, PhotoEditor } from '@/components/feed/edit-fields';
import { useLocale } from '@/hooks/use-locale';
import { LOCALE_NAMES, localizeAnnouncement, timeAgo } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

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
};

const LANGS = ['tl', 'ceb', 'war'] as const;

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

    const startEdit = () => {
        setDraft(initial());
        setNewImage(null);
        setDropImage(false);
        setErrors({});
        setEditing(true);
    };

    const save = () => {
        setSaving(true);
        const data: Record<string, string | boolean | File | null> = {
            title: draft.title,
            body: draft.body,
            image: newImage,
            remove_image: dropImage,
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

    const iconBtn = 'rounded-full p-2 hover:bg-muted';
    const set = (k: string) => (e: { target: { value: string } }) =>
        setDraft({ ...draft, [k]: e.target.value });

    return (
        <article
            className={`overflow-hidden rounded-xl border bg-card shadow-sm ${a.pinned ? 'border-[#D7263D]/40' : 'border-border'}`}
        >
            {a.pinned && (
                <div className="flex items-center gap-1.5 bg-[#D7263D] px-5 py-1.5 text-xs font-medium text-white">
                    <Pin size={12} /> {t('post.pinned')}
                </div>
            )}

            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <Avatar name={a.author} src={a.author_avatar} staff />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm leading-5 font-semibold">
                        <span className="truncate">{a.author}</span>
                        <span className="rounded bg-[#0197F6] px-1.5 py-0.5 text-[10px] leading-none font-medium text-white">
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
                    <div className="-mr-2 flex gap-0.5">
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
                            onClick={() =>
                                confirm(t('post.deleteAnnConfirm')) &&
                                router.delete(`/announcements/${a.id}`, {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <Trash2 size={16} color="#D7263D" />
                        </button>
                    </div>
                )}
            </div>

            {editing ? (
                <div className="space-y-3 px-5 pb-4">
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
                    <div className="px-5 pb-4">
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
                        {shown.lang !== locale && (
                            <p className="mt-2 text-xs text-muted-foreground italic">
                                {t('post.shownIn', {
                                    lang: LOCALE_NAMES[shown.lang],
                                })}
                            </p>
                        )}
                    </div>
                    {a.image_url && (
                        <div className="px-5 pb-4">
                            <img
                                src={a.image_url}
                                alt={shown.title}
                                loading="lazy"
                                className="max-h-[480px] w-full rounded-lg border border-border object-cover"
                            />
                        </div>
                    )}
                </>
            )}
        </article>
    );
}

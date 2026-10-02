import { router } from '@inertiajs/react';
import { Megaphone, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/feed/avatar';
import { fieldClass, PhotoEditor } from '@/components/feed/edit-fields';

export type Notice = {
    id: number;
    title: string;
    body: string;
    pinned: boolean;
    edited: boolean;
    image_url: string | null;
    author: string;
    time: string;
    ts: number;
};

/**
 * One announcement in the feed. Pinned ones get a red "Pinned" strip and are placed first by dashboard.tsx.
 * Pin / edit / delete buttons are only DRAWN for admins; the server (EnsureAdmin) enforces it either way.
 * After an edit the card shows "Edited" next to the time. Text is rendered through React (auto-escaped).
 */
export default function AnnouncementCard({
    a,
    isAdmin,
}: {
    a: Notice;
    isAdmin: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [draft, setDraft] = useState({ title: a.title, body: a.body });
    const [newImage, setNewImage] = useState<File | null>(null);
    const [dropImage, setDropImage] = useState(false);

    const startEdit = () => {
        setDraft({ title: a.title, body: a.body });
        setNewImage(null);
        setDropImage(false);
        setErrors({});
        setEditing(true);
    };

    const save = () => {
        setSaving(true);
        router.post(
            `/announcements/${a.id}`,
            { ...draft, image: newImage, remove_image: dropImage },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setEditing(false),
                onError: (e) => setErrors(e as Record<string, string>),
                onFinish: () => setSaving(false),
            },
        );
    };

    const iconBtn = 'rounded-full p-2 hover:bg-muted';

    return (
        <article
            className={`overflow-hidden rounded-xl border bg-card shadow-sm ${a.pinned ? 'border-[#D7263D]/40' : 'border-border'}`}
        >
            {a.pinned && (
                <div className="flex items-center gap-1.5 bg-[#D7263D] px-5 py-1.5 text-xs font-medium text-white">
                    <Pin size={12} /> Pinned announcement
                </div>
            )}

            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <Avatar name={a.author} staff />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm leading-5 font-semibold">
                        <span className="truncate">{a.author}</span>
                        <span className="rounded bg-[#0197F6] px-1.5 py-0.5 text-[10px] leading-none font-medium text-white">
                            Barangay
                        </span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs leading-5 text-muted-foreground">
                        <span>{a.time}</span>
                        {a.edited && (
                            <>
                                <span aria-hidden>•</span>
                                <span className="italic">Edited</span>
                            </>
                        )}
                    </p>
                </div>
                {isAdmin && !editing && (
                    <div className="-mr-2 flex gap-0.5">
                        <button
                            title="Edit"
                            aria-label="Edit announcement"
                            className={iconBtn}
                            onClick={startEdit}
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            title={a.pinned ? 'Unpin' : 'Pin to top'}
                            aria-label={a.pinned ? 'Unpin' : 'Pin to top'}
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
                            title="Delete"
                            aria-label="Delete announcement"
                            className={iconBtn}
                            onClick={() =>
                                confirm('Delete this announcement?') &&
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
                        maxLength={2000}
                        aria-label="Message"
                        value={draft.body}
                        onChange={(e) =>
                            setDraft({ ...draft, body: e.target.value })
                        }
                    />
                    {errors.body && (
                        <p className="text-xs text-[#D7263D]">{errors.body}</p>
                    )}
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
                            Cancel
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
                            {saving ? 'Saving…' : 'Save changes'}
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
                            <span>{a.title}</span>
                        </h3>
                        <p className="mt-1 text-sm leading-6 whitespace-pre-line">
                            {a.body}
                        </p>
                    </div>
                    {a.image_url && (
                        <div className="px-5 pb-4">
                            <img
                                src={a.image_url}
                                alt={`Photo for: ${a.title}`}
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

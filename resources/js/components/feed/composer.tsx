import { useForm } from '@inertiajs/react';
import { Image as ImageIcon, Megaphone, Pin, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/feed/avatar';
import { Button } from '@/components/ui/button';

/**
 * "What's on your mind?" box — one component, two modes:
 *   mode="complaint"     → residents file a report          → POST /complaints
 *   mode="announcement"  → the admin posts (and can pin)    → POST /announcements  (admin-only route)
 *
 * SECURITY: the client-side checks below (type, size) are only for a friendly, instant message.
 * The real checks run on the server (validate: image, mimes jpg/png/webp, max 4 MB), and the
 * announcement route is behind EnsureAdmin, so switching `mode` in dev-tools gets a 403.
 */
const MAX_MB = 4;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const field =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[#0197F6] focus:ring-2 focus:ring-[#0197F6]/30';
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
    mode: 'complaint' | 'announcement';
    userName: string;
    categories: string[];
};

export default function Composer({ mode, userName, categories }: Props) {
    const isNote = mode === 'announcement';
    const [open, setOpen] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const form = useForm<{
        title: string;
        body: string;
        location: string;
        category: string;
        incident_date: string;
        pinned: boolean;
        image: File | null;
    }>({
        title: '',
        body: '',
        location: '',
        category: categories[0] ?? '',
        incident_date: today(),
        pinned: false,
        image: null,
    });

    // Instant preview: a temporary local URL for the chosen file. It is revoked on change/unmount
    // so the browser frees the memory. Nothing is uploaded until "Post" is pressed.
    const previewUrl = useMemo(
        () => (form.data.image ? URL.createObjectURL(form.data.image) : null),
        [form.data.image],
    );
    useEffect(
        () => () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        },
        [previewUrl],
    );

    /** Validate the picked file in the browser, then keep it in form state for the preview. */
    const pick = (file?: File) => {
        if (!file) {
            return;
        }

        if (!TYPES.includes(file.type)) {
            return setFileError('Please choose a JPG, PNG or WebP photo.');
        }

        if (file.size > MAX_MB * 1024 * 1024) {
            return setFileError(
                `That photo is over ${MAX_MB} MB. Choose a smaller one.`,
            );
        }

        setFileError(null);
        form.setData('image', file);
    };

    const canPost =
        form.data.title.trim() &&
        form.data.body.trim() &&
        (isNote || form.data.location.trim());

    /** Map our single form onto each endpoint's field names (complaints call the text "description"). */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((d) =>
            isNote
                ? {
                      title: d.title,
                      body: d.body,
                      pinned: d.pinned,
                      image: d.image,
                  }
                : {
                      title: d.title,
                      description: d.body,
                      location: d.location,
                      category: d.category,
                      incident_date: d.incident_date,
                      image: d.image,
                  },
        );
        form.post(isNote ? '/announcements' : '/complaints', {
            forceFormData: true, // needed so the photo is sent as a file, not JSON
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
                setFileError(null);
            },
        });
    };

    const err = form.errors as Record<string, string | undefined>;
    const firstName = userName.split(' ')[0];

    return (
        <form
            onSubmit={submit}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
            <div className="flex gap-3">
                <Avatar name={userName} staff={isNote} />
                <div className="min-w-0 flex-1 space-y-3">
                    <input
                        className={`${field} rounded-full bg-[#F0F2F5] dark:bg-muted`}
                        maxLength={isNote ? 120 : 150}
                        onFocus={() => setOpen(true)}
                        placeholder={
                            isNote
                                ? 'Announcement title'
                                : `What's the concern, ${firstName}?`
                        }
                        aria-label="Title"
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                    {err.title && (
                        <p className="text-xs text-[#D7263D]">{err.title}</p>
                    )}

                    {open && (
                        <>
                            <textarea
                                className={field}
                                rows={3}
                                maxLength={isNote ? 2000 : 3000}
                                aria-label="Details"
                                placeholder={
                                    isNote
                                        ? 'Message to all residents…'
                                        : 'Describe the problem so the barangay can act on it…'
                                }
                                value={form.data.body}
                                onChange={(e) =>
                                    form.setData('body', e.target.value)
                                }
                            />
                            {(err.description || err.body) && (
                                <p className="text-xs text-[#D7263D]">
                                    {err.description || err.body}
                                </p>
                            )}

                            {!isNote && (
                                <div className="grid gap-2 sm:grid-cols-3">
                                    <input
                                        className={field}
                                        placeholder="Location (Purok / street)"
                                        maxLength={150}
                                        aria-label="Location"
                                        value={form.data.location}
                                        onChange={(e) =>
                                            form.setData(
                                                'location',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <select
                                        className={field}
                                        aria-label="Category"
                                        value={form.data.category}
                                        onChange={(e) =>
                                            form.setData(
                                                'category',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {categories.map((c) => (
                                            <option key={c}>{c}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        className={field}
                                        aria-label="Date it happened"
                                        max={today()}
                                        value={form.data.incident_date}
                                        onChange={(e) =>
                                            form.setData(
                                                'incident_date',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            )}
                            {(err.location ||
                                err.category ||
                                err.incident_date) && (
                                <p className="text-xs text-[#D7263D]">
                                    {err.location ||
                                        err.category ||
                                        err.incident_date}
                                </p>
                            )}

                            {/* Instant image preview with a remove (x) button */}
                            {previewUrl && (
                                <div className="relative overflow-hidden rounded-lg border border-border">
                                    <img
                                        src={previewUrl}
                                        alt="Selected photo preview"
                                        className="max-h-72 w-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Remove photo"
                                        onClick={() =>
                                            form.setData('image', null)
                                        }
                                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            {(fileError || err.image) && (
                                <p className="text-xs text-[#D7263D]">
                                    {fileError || err.image}
                                </p>
                            )}
                        </>
                    )}

                    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                        <div className="flex items-center gap-1">
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#0197F6] focus-within:ring-2 focus-within:ring-[#0197F6] hover:bg-muted">
                                <ImageIcon size={18} /> Photo
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={(e) => {
                                        setOpen(true);
                                        pick(e.target.files?.[0]);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            {isNote && (
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
                                    <input
                                        type="checkbox"
                                        checked={form.data.pinned}
                                        onChange={(e) =>
                                            form.setData(
                                                'pinned',
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <Pin size={16} className="text-[#D7263D]" />{' '}
                                    Pin to top
                                </label>
                            )}
                        </div>
                        <Button disabled={form.processing || !canPost}>
                            {isNote && <Megaphone />}{' '}
                            {form.processing ? 'Posting…' : 'Post'}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}

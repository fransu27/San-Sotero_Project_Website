import { Link, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Globe,
    Image as ImageIcon,
    Lock,
    Megaphone,
    Pin,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/feed/avatar';
import TicketCode from '@/components/feed/ticket-code';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLocale } from '@/hooks/use-locale';
import { LOCALE_NAMES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * "What's on your mind?" box. One component, two modes:
 *   mode="complaint"     → a resident files a report     → POST /complaints
 *   mode="announcement"  → the admin posts (and can pin) → POST /announcements  (admin-only route)
 *
 * COMPLAINT fields: title, details, location, category (+ typed text when "Others"), date, who can see it
 * (Public / Private) and an "anonymous" switch (its starting value comes from Settings → Profile).
 * A PUBLIC post goes to the barangay's approval queue first; a PRIVATE one is visible only to you and the officials.
 *
 * WHY "Post" USED TO DO NOTHING: the server requires `visibility` (and `custom_category` for "Others"), the old box
 * never sent it, and the error was never shown. Now every field is sent and EVERY server error is displayed.
 *
 * SECURITY: the checks here (file type/size) only give a friendly instant message. The server validates everything
 * again (ComplaintRequest / AnnouncementRequest), strips HTML tags, and the announcement route is behind
 * EnsureAdmin, so changing `mode` in dev-tools just gets a 403. Text is shown by React (auto-escaped).
 */
const MAX_MB = 4;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const field =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[#0197F6] focus:ring-2 focus:ring-[#0197F6]/30';
const today = () => new Date().toISOString().slice(0, 10);
const TRANSLATED = [
    ['tl', 'Tagalog'],
    ['ceb', 'Bisaya'],
    ['war', 'Waray'],
] as const;

type Props = {
    mode: 'complaint' | 'announcement';
    userName: string;
    userAvatar?: string | null;
    categories: string[];
};
type FormData = {
    title: string;
    body: string;
    location: string;
    category: string;
    custom_category: string;
    incident_date: string;
    visibility: 'public' | 'private';
    is_anonymous: boolean;
    pinned: boolean;
    image: File | null;
    tl_title: string;
    tl_body: string;
    ceb_title: string;
    ceb_body: string;
    war_title: string;
    war_body: string;
};

// Declared outside of render so React does not reset its state on every render tick
function Err({
    k,
    err,
}: {
    k: string | string[];
    err: Record<string, string | undefined>;
}) {
    const msg = (Array.isArray(k) ? k : [k]).map((x) => err[x]).find(Boolean);

    return msg ? (
        <p role="alert" className="text-xs text-[#D7263D]">
            {msg}
        </p>
    ) : null;
}

export default function Composer({
    mode,
    userName,
    userAvatar = null,
    categories,
}: Props) {
    const isNote = mode === 'announcement';
    const { t } = useLocale();
    const authUser = (
        usePage().props.auth as unknown as {
            user: { anonymous_default?: boolean };
        }
    ).user;
    const [open, setOpen] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [ticket, setTicket] = useState<{
        code: string;
        needs_approval: boolean;
    } | null>(null);

    const form = useForm<FormData>({
        title: '',
        body: '',
        location: '',
        category: categories[0] ?? '',
        custom_category: '',
        incident_date: today(),
        visibility: 'public',
        is_anonymous: Boolean(authUser.anonymous_default),
        pinned: false,
        image: null,
        tl_title: '',
        tl_body: '',
        ceb_title: '',
        ceb_body: '',
        war_title: '',
        war_body: '',
    });

    // Instant preview of the chosen photo (a temporary local URL, freed when it changes). Nothing uploads until "Post".
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

    const pick = (file?: File) => {
        if (!file) {
            return;
        }

        if (!TYPES.includes(file.type)) {
            return setFileError(t('comp.badType'));
        }

        if (file.size > MAX_MB * 1024 * 1024) {
            return setFileError(t('comp.tooBig', { mb: MAX_MB }));
        }

        setFileError(null);
        form.setData('image', file);
    };

    const isOthers = !isNote && form.data.category === 'Others';
    const canPost =
        form.data.title.trim() &&
        form.data.body.trim() &&
        (isNote ||
            (form.data.location.trim() &&
                (!isOthers || form.data.custom_category.trim())));

    /** Map the one form onto each endpoint's field names (complaints call the text "description"). */
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((d) => {
            if (!isNote) {
                return {
                    title: d.title,
                    description: d.body,
                    location: d.location,
                    category: d.category,
                    custom_category: isOthers ? d.custom_category : '',
                    incident_date: d.incident_date,
                    visibility: d.visibility,
                    is_anonymous: d.is_anonymous,
                    image: d.image,
                };
            }

            const out: Record<string, unknown> = {
                title: d.title,
                body: d.body,
                pinned: d.pinned,
                image: d.image,
            };
            TRANSLATED.forEach(([k]) => {
                const ti = d[`${k}_title` as keyof FormData] as string;
                const bo = d[`${k}_body` as keyof FormData] as string;

                if (ti.trim() || bo.trim()) {
                    out[`${k}_title`] = ti;
                    out[`${k}_body`] = bo;
                } // both or neither (server checks too)
            });

            return out;
        });
        form.post(isNote ? '/announcements' : '/complaints', {
            forceFormData: true, // so the photo travels as a file, not JSON
            preserveScroll: true,
            onSuccess: (page) => {
                // The server sends the new ticket code (flash) so it can be shown right away
                const flash = (
                    page as unknown as {
                        flash?: {
                            ticket?: { code: string; needs_approval: boolean };
                        };
                    }
                ).flash;
                if (flash?.ticket) setTicket(flash.ticket);
                form.reset();
                form.setData(
                    'is_anonymous',
                    Boolean(authUser.anonymous_default),
                );
                setOpen(false);
                setFileError(null);
            },
            onError: () => setOpen(true), // keep the form open so the person can read the errors
        });
    };

    const err = form.errors as Record<string, string | undefined>;
    const firstName = userName.split(' ')[0];
    const hasErrors = Object.keys(err).length > 0;

    return (
        <form
            onSubmit={submit}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
            {ticket && !isNote && (
                <div
                    role="status"
                    className="mb-4 rounded-lg border border-[#448FA3]/40 bg-[#448FA3]/10 p-4"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="flex items-center gap-2 font-semibold">
                                <CheckCircle2
                                    size={18}
                                    className="text-[#448FA3]"
                                />{' '}
                                {t('sub.doneTitle')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {t('sub.doneBody')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTicket(null)}
                            aria-label={t('sub.dismiss')}
                            className="rounded-full p-1.5 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[#0197F6]"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <TicketCode code={ticket.code} large />
                        <Link
                            href="/my-submissions"
                            className="text-sm font-medium text-[#0197F6] underline-offset-2 hover:underline"
                        >
                            {t('sub.track')}
                        </Link>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {t(
                            ticket.needs_approval
                                ? 'sub.doneWaiting'
                                : 'sub.donePrivate',
                        )}
                    </p>
                </div>
            )}

            <div className="flex gap-3">
                <Avatar name={userName} src={userAvatar} staff={isNote} />
                <div className="min-w-0 flex-1 space-y-3">
                    <input
                        className={`${field} rounded-full bg-[#F0F2F5] dark:bg-muted`}
                        maxLength={isNote ? 120 : 150}
                        onFocus={() => setOpen(true)}
                        placeholder={
                            isNote
                                ? t('comp.titleAnn')
                                : t('comp.titleComplaint', { name: firstName })
                        }
                        aria-label={t('comp.titleAnn')}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                    <Err k="title" err={err} />

                    {open && (
                        <>
                            <textarea
                                className={field}
                                rows={3}
                                maxLength={isNote ? 2000 : 3000}
                                aria-label="Details"
                                placeholder={
                                    isNote
                                        ? t('comp.detailsAnn')
                                        : t('comp.detailsComplaint')
                                }
                                value={form.data.body}
                                onChange={(e) =>
                                    form.setData('body', e.target.value)
                                }
                            />
                            <Err k={['description', 'body']} err={err} />

                            {!isNote && (
                                <>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        <input
                                            className={field}
                                            placeholder={t('comp.location')}
                                            maxLength={150}
                                            aria-label={t('comp.location')}
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
                                            aria-label={t('comp.category')}
                                            value={form.data.category}
                                            onChange={(e) =>
                                                form.setData(
                                                    'category',
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            {categories.map((c) => (
                                                <option key={c} value={c}>
                                                    {t(`cat.${c}`)}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="date"
                                            className={field}
                                            aria-label={t('comp.date')}
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
                                    <Err
                                        k={[
                                            'location',
                                            'category',
                                            'incident_date',
                                        ]}
                                        err={err}
                                    />

                                    {/* "Others": the resident types what it is (Vehicle, Accident, ...) */}
                                    {isOthers && (
                                        <>
                                            <input
                                                className={field}
                                                maxLength={60}
                                                placeholder={t('comp.other')}
                                                aria-label={t('comp.other')}
                                                value={
                                                    form.data.custom_category
                                                }
                                                onChange={(e) =>
                                                    form.setData(
                                                        'custom_category',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <Err
                                                k="custom_category"
                                                err={err}
                                            />
                                        </>
                                    )}

                                    {/* Who can see it */}
                                    <fieldset className="space-y-2">
                                        <legend className="mb-1 text-xs font-medium text-muted-foreground">
                                            {t('comp.visibility')}
                                        </legend>
                                        <div
                                            className="grid gap-2 sm:grid-cols-2"
                                            role="radiogroup"
                                            aria-label={t('comp.visibility')}
                                        >
                                            {(
                                                [
                                                    [
                                                        'public',
                                                        Globe,
                                                        'comp.public',
                                                        'comp.publicHint',
                                                    ],
                                                    [
                                                        'private',
                                                        Lock,
                                                        'comp.private',
                                                        'comp.privateHint',
                                                    ],
                                                ] as const
                                            ).map(([v, Icon, label, hint]) => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={
                                                        form.data.visibility ===
                                                        v
                                                    }
                                                    onClick={() =>
                                                        form.setData(
                                                            'visibility',
                                                            v,
                                                        )
                                                    }
                                                    className={cn(
                                                        'flex items-start gap-2 rounded-lg border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]',
                                                        form.data.visibility ===
                                                            v
                                                            ? 'border-[#0197F6] bg-[#0197F6]/10'
                                                            : 'border-input hover:bg-muted',
                                                    )}
                                                >
                                                    <Icon
                                                        size={16}
                                                        className={cn(
                                                            'mt-0.5 shrink-0',
                                                            form.data
                                                                .visibility ===
                                                                v &&
                                                                'text-[#0197F6]',
                                                        )}
                                                    />
                                                    <span>
                                                        <span className="block text-sm font-medium">
                                                            {t(label)}
                                                        </span>
                                                        <span className="block text-xs text-muted-foreground">
                                                            {t(hint)}
                                                        </span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        <Err k="visibility" err={err} />
                                    </fieldset>

                                    {/* Anonymous switch */}
                                    <div className="flex items-start justify-between gap-3 rounded-lg border border-input p-3">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {t('comp.anonymous')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t('comp.anonymousHint')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={form.data.is_anonymous}
                                            onChange={(v) =>
                                                form.setData('is_anonymous', v)
                                            }
                                            label={t('comp.anonymous')}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Admin only: optional Tagalog / Bisaya / Waray versions of the announcement */}
                            {isNote && (
                                <details className="rounded-lg border border-input p-3">
                                    <summary className="cursor-pointer text-sm font-medium">
                                        {t('comp.translations')}
                                    </summary>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {t('comp.translationsHint')}
                                    </p>
                                    <div className="mt-3 space-y-3">
                                        {TRANSLATED.map(([k, name]) => (
                                            <div key={k} className="space-y-2">
                                                <input
                                                    className={field}
                                                    maxLength={120}
                                                    placeholder={t(
                                                        'comp.titleFor',
                                                        {
                                                            lang:
                                                                LOCALE_NAMES[
                                                                    k
                                                                ] ?? name,
                                                        },
                                                    )}
                                                    aria-label={t(
                                                        'comp.titleFor',
                                                        { lang: name },
                                                    )}
                                                    value={
                                                        form.data[
                                                            `${k}_title` as keyof FormData
                                                        ] as string
                                                    }
                                                    onChange={(e) =>
                                                        form.setData(
                                                            `${k}_title` as keyof FormData,
                                                            e.target
                                                                .value as never,
                                                        )
                                                    }
                                                />
                                                <textarea
                                                    className={field}
                                                    rows={2}
                                                    maxLength={2000}
                                                    placeholder={t(
                                                        'comp.bodyFor',
                                                        { lang: name },
                                                    )}
                                                    aria-label={t(
                                                        'comp.bodyFor',
                                                        { lang: name },
                                                    )}
                                                    value={
                                                        form.data[
                                                            `${k}_body` as keyof FormData
                                                        ] as string
                                                    }
                                                    onChange={(e) =>
                                                        form.setData(
                                                            `${k}_body` as keyof FormData,
                                                            e.target
                                                                .value as never,
                                                        )
                                                    }
                                                />
                                                <Err
                                                    k={[
                                                        `${k}_title`,
                                                        `${k}_body`,
                                                    ]}
                                                    err={err}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}

                            {/* Instant image preview with a remove (x) button */}
                            {previewUrl && (
                                <div className="relative overflow-hidden rounded-lg border border-border">
                                    <img
                                        src={previewUrl}
                                        alt=""
                                        className="max-h-72 w-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        aria-label={t('comp.removePhoto')}
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
                                <p
                                    role="alert"
                                    className="text-xs text-[#D7263D]"
                                >
                                    {fileError || err.image}
                                </p>
                            )}
                            {hasErrors && (
                                <p
                                    role="alert"
                                    className="text-xs font-medium text-[#D7263D]"
                                >
                                    {t('comp.fixErrors')}
                                </p>
                            )}
                        </>
                    )}

                    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                        <div className="flex items-center gap-1">
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#0197F6] focus-within:ring-2 focus-within:ring-[#0197F6] hover:bg-muted">
                                <ImageIcon size={18} /> {t('comp.photo')}
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
                                    {t('comp.pin')}
                                </label>
                            )}
                        </div>
                        <Button disabled={form.processing || !canPost}>
                            {isNote && <Megaphone />}{' '}
                            {form.processing
                                ? t('comp.posting')
                                : t('comp.post')}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}

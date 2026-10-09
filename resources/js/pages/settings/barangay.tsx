import { Head, useForm, usePage } from '@inertiajs/react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';

/**
 * Settings → Barangay (admin only: the route is behind EnsureAdmin, and the tab is hidden for residents).
 * Sets the barangay name, caption and location photo shown by <BarangayBanner />.
 * The browser checks type/size only for a friendly message; BarangayController validates everything again.
 */
export default function BarangaySettings() {
    const { barangay } = usePage().props as unknown as {
        barangay: {
            name: string | null;
            caption: string | null;
            banner_url: string | null;
            banner_is_default: boolean;
        };
    };
    const { t } = useLocale();
    const [localError, setLocalError] = useState<string | null>(null);
    const form = useForm<{
        name: string;
        caption: string;
        image: File | null;
        remove_image: boolean;
    }>({
        name: barangay.name ?? '',
        caption: barangay.caption ?? '',
        image: null,
        remove_image: false,
    });

    const preview = useMemo(
        () => (form.data.image ? URL.createObjectURL(form.data.image) : null),
        [form.data.image],
    );
    useEffect(
        () => () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        },
        [preview],
    );
    const shown =
        preview ?? (form.data.remove_image ? null : barangay.banner_url);
    // "Remove" only makes sense for a photo the admin uploaded; removing it brings back the bundled default.
    const hasCustom =
        Boolean(preview) ||
        (!barangay.banner_is_default && !form.data.remove_image);

    const pick = (f?: File) => {
        if (!f) {
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
            return setLocalError(t('brgy.badType'));
        }

        if (f.size > 4 * 1024 * 1024) {
            return setLocalError(t('brgy.tooBig'));
        }

        setLocalError(null);
        form.setData((d) => ({ ...d, image: f, remove_image: false }));
    };

    return (
        <>
            <Head title={t('set.barangay')} />
            <form
                className="space-y-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post('/settings/barangay', {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () =>
                            form.setData((d) => ({
                                ...d,
                                image: null,
                                remove_image: false,
                            })),
                    });
                }}
            >
                <div>
                    <h2 className="text-lg font-semibold">{t('brgy.title')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t('brgy.desc')}
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="b-name">{t('brgy.name')}</Label>
                    <Input
                        id="b-name"
                        maxLength={80}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="Santotero"
                    />
                    <InputError message={form.errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="b-caption">{t('brgy.caption')}</Label>
                    <Input
                        id="b-caption"
                        maxLength={160}
                        value={form.data.caption}
                        onChange={(e) =>
                            form.setData('caption', e.target.value)
                        }
                        placeholder={t('brgy.captionPh')}
                    />
                    <InputError message={form.errors.caption} />
                </div>

                <div className="grid gap-2">
                    <Label>{t('brgy.photo')}</Label>
                    {shown && (
                        <img
                            src={shown}
                            alt=""
                            className="h-40 w-full rounded-lg border border-border object-cover sm:h-52"
                        />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-[#0197F6] hover:bg-muted">
                            <ImagePlus size={16} />{' '}
                            {shown ? t('brgy.change') : t('brgy.choose')}
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={(e) => {
                                    pick(e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                        {hasCustom && (
                            <button
                                type="button"
                                onClick={() =>
                                    form.setData((d) => ({
                                        ...d,
                                        image: null,
                                        remove_image: true,
                                    }))
                                }
                                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#D7263D] hover:bg-muted"
                            >
                                <Trash2 size={16} /> {t('brgy.remove')}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t('brgy.hint')}
                    </p>
                    <InputError message={localError ?? form.errors.image} />
                </div>

                <Button type="submit" disabled={form.processing}>
                    {form.processing ? t('brgy.saving') : t('brgy.save')}
                </Button>
            </form>
        </>
    );
}

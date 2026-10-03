import { Link, usePage } from '@inertiajs/react';
import { Camera, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from '@/hooks/use-locale';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * The barangay "location photo" header. It replaces the old fixed banner graphics on the dashboard (size="lg")
 * and the settings pages (size="sm"). The photo, name and caption come from Settings → Barangay (shared Inertia
 * prop `barangay`), so a local admin can change them any time. Until then the bundled San Sotero photo is shown.
 * If no photo can be loaded at all, a neutral placeholder is drawn instead; admins get a link to upload one.
 * SECURITY: name/caption were tag-stripped on save and are rendered as React text (auto-escaped);
 * the image URL is a server-built /media/branding/... path, never user-typed.
 */
export default function BarangayBanner({
    size = 'lg',
}: {
    size?: 'lg' | 'sm';
}) {
    const { barangay, auth } = usePage().props as unknown as {
        barangay: {
            name: string | null;
            caption: string | null;
            banner_url: string | null;
            banner_is_default: boolean;
        };
        auth: { user: { role: string } };
    };
    const { t } = useLocale();
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const isAdmin = auth.user.role === 'admin';
    const name = barangay.name || BRAND.place;
    const showPhoto =
        Boolean(barangay.banner_url) && failedUrl !== barangay.banner_url;

    return (
        <section
            aria-label={name}
            className={cn(
                'relative overflow-hidden rounded-xl border border-border bg-card shadow-sm',
                size === 'lg' ? 'h-40 sm:h-52' : 'h-28 sm:h-32',
            )}
        >
            {showPhoto ? (
                <>
                    <img
                        src={barangay.banner_url!}
                        alt={`${name}${barangay.caption ? ` — ${barangay.caption}` : ''}`}
                        onError={() => setFailedUrl(barangay.banner_url)}
                        className="size-full object-cover"
                    />
                    {/* Dark gradient behind the text keeps it readable on any photo, in light or dark theme */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 px-5 py-4 text-white">
                        <MapPin
                            size={size === 'lg' ? 20 : 16}
                            className="mb-1 shrink-0"
                        />
                        <div className="min-w-0">
                            <p
                                className={cn(
                                    'truncate leading-tight font-semibold',
                                    size === 'lg' ? 'text-xl' : 'text-base',
                                )}
                            >
                                {name}
                            </p>
                            {barangay.caption && (
                                <p className="truncate text-xs text-white/85">
                                    {barangay.caption}
                                </p>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#0197F6]/15 via-[#448FA3]/10 to-transparent px-5 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-[#0197F6]/50 text-[#0197F6]">
                        <MapPin size={20} />
                    </span>
                    <p className="text-sm font-semibold">
                        {barangay.name || t('banner.placeholderTitle')}
                    </p>
                    <p className="max-w-md text-xs text-muted-foreground">
                        {barangay.caption || t('banner.placeholderHint')}
                    </p>
                    {isAdmin && (
                        <Link
                            href="/settings/barangay"
                            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#0197F6]/10 px-3 py-1 text-xs font-medium text-[#0197F6] hover:bg-[#0197F6]/20"
                        >
                            <Camera size={13} /> {t('banner.adminHint')}
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}

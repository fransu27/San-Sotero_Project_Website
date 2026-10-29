import { Link, usePage } from '@inertiajs/react';
import { Bell, Camera, ShieldCheck } from 'lucide-react';
import LanguageSwitcher from '@/components/language-switcher';
import ThemeToggle from '@/components/theme-toggle';
import Wordmark, { PaletteStripe } from '@/components/wordmark';
import { useLocale } from '@/hooks/use-locale';
import { BRAND } from '@/lib/brand';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/**
 * Shared shell for login, register, forgot/reset password, 2FA, etc.
 * Desktop: barangay photo panel on the left, form card on the right. Mobile: photo header above the form.
 * The top-right corner has the language picker (English / Tagalog / Bisaya) and the Dark / Light switch.
 * The LEFT brand panel is always navy, so its text is hard-coded white (it must stay readable in light mode too);
 * the RIGHT form side follows the chosen theme.
 * SECURITY: presentational only. `title` / `description` come from each page's static `.layout`
 * object and are rendered as text (React escapes them). Links use Wayfinder's typed `home()`.
 */
const points = [
    { icon: Camera, key: 'auth.p1' },
    { icon: Bell, key: 'auth.p2' },
    { icon: ShieldCheck, key: 'auth.p3' },
];

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { t } = useLocale();
    const { barangay } = usePage().props as unknown as {
        barangay?: { banner_url?: string | null };
    };
    // Same photo the admin sets in Settings → Barangay; the bundled one until then.
    const photo = barangay?.banner_url || '/images/barangay-default.jpg';

    return (
        <div className="auth-shell relative min-h-svh overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div
                aria-hidden
                className="pointer-events-none fixed -top-24 -right-24 size-80 rounded-full bg-[#68C5DB]/15 blur-3xl"
            />
            {/* Photo panel (desktop) */}
            <aside
                className="auth-brand-panel auth-photo relative hidden min-h-svh flex-col justify-between overflow-hidden p-12 text-white lg:flex xl:p-16"
                style={{ backgroundImage: `url("${photo}")` }}
            >
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-[#02182B]/92 via-[#032a47]/80 to-[#0a4a75]/70"
                />
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[#02182B]/90 via-transparent to-transparent"
                />
                <Link
                    href={home()}
                    aria-label={`${BRAND.name} home`}
                    className="group relative w-fit"
                >
                    <Wordmark />
                </Link>

                <div className="relative max-w-md">
                    <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-[#bdeefa] uppercase backdrop-blur-sm">
                        <span className="size-2 animate-pulse rounded-full bg-[#68C5DB]" />{' '}
                        {t('auth.communityTag')}
                    </p>
                    <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
                        {t('auth.headline', { place: BRAND.place })}
                    </h2>
                    <ul className="mt-8 space-y-3">
                        {points.map(({ icon: Icon, key }) => (
                            <li
                                key={key}
                                className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-3 text-[15px] leading-snug text-white/90 backdrop-blur-md"
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0197F6]/25 text-[#7fd3ea] ring-1 ring-[#68C5DB]/25">
                                    <Icon size={17} />
                                </span>
                                {t(key)}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-white/55">{BRAND.name}</p>
            </aside>

            {/* Form panel */}
            <div className="flex min-h-svh flex-col">
                {/* Phone header: photo strip with the headline */}
                <div
                    className="auth-photo relative overflow-hidden text-white lg:hidden"
                    style={{ backgroundImage: `url("${photo}")` }}
                >
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-b from-[#02182B]/70 via-[#02182B]/75 to-[#02182B]"
                    />
                    <div className="relative px-5 pt-5 pb-8">
                        <Link
                            href={home()}
                            aria-label={`${BRAND.name} home`}
                            className="group inline-block"
                        >
                            <Wordmark />
                        </Link>
                        <p className="mt-6 mb-2.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#bdeefa] uppercase">
                            <span className="size-1.5 rounded-full bg-[#68C5DB]" />{' '}
                            {t('auth.communityTag')}
                        </p>
                        <h2 className="text-2xl leading-tight font-semibold tracking-tight text-balance">
                            {t('auth.headline', { place: BRAND.place })}
                        </h2>
                    </div>
                    <PaletteStripe />
                </div>

                <header className="flex items-center justify-end px-5 py-4 sm:px-6 lg:px-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <Link
                            href={home()}
                            className="rounded-lg px-1.5 py-1 text-[13px] text-foreground/65 hover:text-foreground"
                        >
                            {t('auth.back')}
                        </Link>
                    </div>
                </header>

                <main className="relative flex flex-1 items-start justify-center px-4 pb-12 sm:px-8 lg:items-center lg:px-10">
                    <div className="auth-form-card auth-card w-full max-w-md rounded-[1.75rem] border border-border/70 bg-card/90 p-5 backdrop-blur-sm sm:p-8">
                        <span
                            aria-hidden
                            className="mb-5 block h-1 w-12 rounded-full bg-gradient-to-r from-[#0197F6] to-[#68C5DB]"
                        />
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            {title}
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                            {description}
                        </p>
                        <div className="auth-form-content mt-7">{children}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}

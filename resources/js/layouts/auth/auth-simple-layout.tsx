import { Link } from '@inertiajs/react';
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
 * Desktop: brand panel on the left, form on the right. Mobile: brand header above the form.
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

    return (
        <div className="min-h-svh bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {/* Brand panel */}
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#02182B] via-[#032a47] to-[#0a4a75] p-12 text-white lg:flex">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-[#0197F6]/15 blur-3xl"
                />
                <Link
                    href={home()}
                    aria-label={`${BRAND.name} home`}
                    className="relative"
                >
                    <Wordmark />
                </Link>

                <div className="relative max-w-md">
                    <h2 className="text-4xl leading-tight font-semibold tracking-tight">
                        {t('auth.headline', { place: BRAND.place })}
                    </h2>
                    <ul className="mt-8 space-y-5">
                        {points.map(({ icon: Icon, key }) => (
                            <li
                                key={key}
                                className="flex gap-3 text-[15px] text-white/80"
                            >
                                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0197F6]/20 text-[#68C5DB]">
                                    <Icon size={16} />
                                </span>
                                {t(key)}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-white/50">{BRAND.name}</p>
            </aside>

            {/* Form panel */}
            <div className="flex min-h-svh flex-col">
                <div className="lg:hidden">
                    <PaletteStripe />
                </div>
                <header className="flex items-center justify-between px-6 py-4 lg:justify-end lg:px-10">
                    <Link
                        href={home()}
                        aria-label={`${BRAND.name} home`}
                        className="lg:hidden"
                    >
                        <Wordmark />
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <Link
                            href={home()}
                            className="text-[13px] text-foreground/65 hover:text-foreground"
                        >
                            {t('auth.back')}
                        </Link>
                    </div>
                </header>

                <main className="flex flex-1 items-center justify-center px-6 pb-12">
                    <div className="w-full max-w-md">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                            {description}
                        </p>
                        <div className="mt-8">{children}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}

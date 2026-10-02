import { Link, usePage } from '@inertiajs/react';
import { Building2, KeyRound, Palette, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import BarangayBanner from '@/components/barangay-banner';
import { useLocale } from '@/hooks/use-locale';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

/**
 * Settings shell (sits inside the feed layout). A tab row on top instead of the old
 * narrow side list, so it matches the newsfeed look and works on phones.
 * The Barangay tab (location photo / name) is only drawn for admins.
 * SECURITY: navigation only; every settings action is still protected by its own controller/route
 * (the Barangay page sits behind the EnsureAdmin middleware, so a resident typing the URL gets a 403).
 */

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { t } = useLocale();
    const isAdmin = (usePage().props.auth as unknown as { user: { role: string } }).user.role === 'admin';

    const tabs = [
        { title: t('set.profile'), href: edit(), icon: UserRound },
        { title: t('set.security'), href: editSecurity(), icon: KeyRound },
        { title: t('set.appearance'), href: editAppearance(), icon: Palette },
        ...(isAdmin ? [{ title: t('set.barangay'), href: '/settings/barangay', icon: Building2 }] : []),
    ];

    return (
        <div>
            <div className="mb-5"><BarangayBanner size="sm" /></div>
            <header className="mb-5">
                <h1 className="text-2xl font-semibold tracking-tight">{t('set.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('set.desc')}</p>
            </header>

            <nav aria-label={t('set.title')} className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
                {tabs.map((t) => {
                    const active = isCurrentOrParentUrl(t.href);
                    return (
                        <Link key={toUrl(t.href)} href={t.href} aria-current={active ? 'page' : undefined}
                            className={cn('-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                                active ? 'border-[#0197F6] text-[#0197F6]' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                            <t.icon size={16} /> {t.title}
                        </Link>
                    );
                })}
            </nav>

            <section className="max-w-xl space-y-12">{children}</section>
        </div>
    );
}

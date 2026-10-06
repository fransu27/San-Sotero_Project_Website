import { Link, usePage } from '@inertiajs/react';
import {
    Ban,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Eye,
    HardHat,
    Home,
    Loader,
    MoreHorizontal,
    Search,
    Settings,
    Shield,
    Trash2,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/feed/avatar';
import LanguageSwitcher from '@/components/language-switcher';
import ThemeToggle from '@/components/theme-toggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useLocale } from '@/hooks/use-locale';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/profile';

/**
 * Facebook-style shell: sticky top bar (logo · search · profile) + left navigation + content area.
 * The right-hand widgets live in the page itself (dashboard.tsx).
 *
 * SECURITY / behaviour notes:
 *  - The search box is a plain GET form to /dashboard?q=…; the SERVER validates and scopes it
 *    (a resident can only ever search posts they are allowed to see). Nothing is filtered by trusting React.
 *  - The top bar holds the language picker (EN / TL / CEB) and the Dark / Light switch; both are remembered.
 *  - Sidebar links only change query strings the server re-validates against fixed lists.
 */
type Filters = { q: string; category: string | null; status: string | null };
type NavLink = {
    label: string;
    href: string;
    icon: LucideIcon;
    active: boolean;
    count?: number;
};

const statusIcon: Record<string, LucideIcon> = {
    Pending: Clock,
    'Under Review': Eye,
    'In Progress': Loader,
    Resolved: CheckCircle2,
    Rejected: XCircle,
    Approval: ClipboardCheck,
    Removed: Ban,
};
// Settings pages don't receive these props from the server, so fall back to the same fixed lists.
const DEFAULT_STATUSES = [
    'Pending',
    'Under Review',
    'In Progress',
    'Resolved',
    'Rejected',
];
const DEFAULT_CATEGORIES = [
    'Infrastructure',
    'Sanitation',
    'Peace and Order',
    'Others',
];
const categoryIcon: Record<string, LucideIcon> = {
    Infrastructure: HardHat,
    Sanitation: Trash2,
    'Peace and Order': Shield,
    Others: MoreHorizontal,
};

export default function FeedLayout({ children }: { children: ReactNode }) {
    const page = usePage();
    const { t } = useLocale();
    const { auth, filters, counts, statuses, categories } = page.props as any;
    const isAdmin = auth.user.role === 'admin'; // display only; the server enforces every admin action
    const onSettings = page.url.startsWith('/settings');
    const f: Filters = filters ?? { q: '', category: null, status: null };
    const noFilter = !onSettings && !f.category && !f.status && !f.q;

    // Build the left navigation from the same fixed lists the server validates against.
    const feedLinks: NavLink[] = [
        {
            label: t('nav.newsfeed'),
            href: '/dashboard',
            icon: Home,
            active: noFilter,
        },
    ];
    const statusLinks: NavLink[] = [
        ...(statuses ?? DEFAULT_STATUSES),
        'Approval',
        'Removed',
    ].map((s: string) => ({
        // Approval = the moderation queue: admins see "Approval queue", residents see their own "Awaiting approval" posts.
        label: t(
            s === 'Approval' && isAdmin
                ? 'status.ApprovalAdmin'
                : `status.${s}`,
        ),
        href: `/dashboard?status=${encodeURIComponent(s)}`,
        icon: statusIcon[s] ?? Clock,
        active: !onSettings && f.status === s,
        count: Number(counts?.[s] ?? 0),
    }));
    const categoryLinks: NavLink[] = (categories ?? DEFAULT_CATEGORIES).map(
        (c: string) => ({
            label: t(`cat.${c}`),
            href: `/dashboard?category=${encodeURIComponent(c)}`,
            icon: categoryIcon[c] ?? Building2,
            active: !onSettings && f.category === c,
        }),
    );

    const renderLink = (l: NavLink) => (
        <Link
            key={l.label}
            href={l.href}
            preserveScroll
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                l.active
                    ? 'bg-[#0197F6]/10 text-[#0197F6]'
                    : 'text-foreground hover:bg-muted',
            )}
        >
            <l.icon size={18} />
            <span className="flex-1">{l.label}</span>
            {l.count !== undefined && (
                <span className="text-xs text-muted-foreground">{l.count}</span>
            )}
        </Link>
    );

    return (
        <div className="min-h-screen bg-[#F0F2F5] dark:bg-background">
            {/* ── Top bar ── */}
            <header className="sticky top-0 z-30 border-b border-border bg-card">
                <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 font-semibold"
                    >
                        <span className="flex size-9 items-center justify-center rounded-full bg-[#0197F6] text-white">
                            <Building2 size={18} />
                        </span>
                        <span className="hidden leading-tight sm:grid">
                            <span className="text-sm font-semibold">
                                {BRAND.place}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {BRAND.product}
                            </span>
                        </span>
                    </Link>

                    <form
                        action="/dashboard"
                        method="get"
                        role="search"
                        className="relative mx-auto min-w-0 flex-1 sm:max-w-md"
                    >
                        <Search
                            size={16}
                            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            name="q"
                            defaultValue={f.q}
                            maxLength={100}
                            placeholder={t('nav.search')}
                            aria-label={t('nav.search')}
                            className="w-full rounded-full bg-[#F0F2F5] py-2 pr-4 pl-9 text-sm outline-none focus:ring-2 focus:ring-[#0197F6]/40 dark:bg-muted"
                        />
                    </form>

                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        <LanguageSwitcher className="hidden sm:inline-flex" />
                        <ThemeToggle />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger
                            aria-label={t('nav.account')}
                            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]"
                        >
                            <Avatar
                                name={auth.user.name}
                                src={auth.user.avatar ?? null}
                                staff={isAdmin}
                            />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-56">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="mx-auto grid max-w-[1400px] gap-4 px-3 py-4 lg:grid-cols-[250px_minmax(0,1fr)]">
                {/* ── Left sidebar (desktop) ── */}
                <aside
                    className="sticky top-[72px] hidden h-fit space-y-4 lg:block"
                    aria-label={t('nav.main')}
                >
                    <nav className="space-y-0.5">
                        {feedLinks.map(renderLink)}
                    </nav>
                    <div>
                        <p className="px-3 pb-1 text-sm font-semibold text-muted-foreground">
                            {t(
                                isAdmin
                                    ? 'nav.reportsAdmin'
                                    : 'nav.reportsResident',
                            )}
                        </p>
                        <nav className="space-y-0.5">
                            {statusLinks.map(renderLink)}
                        </nav>
                    </div>
                    <div>
                        <p className="px-3 pb-1 text-sm font-semibold text-muted-foreground">
                            {t('nav.categories')}
                        </p>
                        <nav className="space-y-0.5">
                            {categoryLinks.map(renderLink)}
                        </nav>
                    </div>
                    <Link
                        href={edit()}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                            onSettings
                                ? 'bg-[#0197F6]/10 text-[#0197F6]'
                                : 'hover:bg-muted',
                        )}
                    >
                        <Settings size={18} /> {t('nav.settings')}
                    </Link>
                </aside>

                {/* ── Mobile / tablet: the same links as a scrollable chip row ── */}
                <nav
                    className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:hidden"
                    aria-label={t('nav.filters')}
                >
                    {[
                        ...feedLinks,
                        ...statusLinks,
                        ...categoryLinks,
                        {
                            label: t('nav.settings'),
                            href: edit().url,
                            icon: Settings,
                            active: onSettings,
                        },
                    ].map((l) => (
                        <Link
                            key={l.label}
                            href={l.href}
                            preserveScroll
                            className={cn(
                                'shrink-0 rounded-full px-3 py-1.5 text-sm',
                                l.active
                                    ? 'bg-[#0197F6] text-white'
                                    : 'bg-card text-foreground',
                            )}
                        >
                            {l.label}
                        </Link>
                    ))}
                    <LanguageSwitcher className="shrink-0 sm:hidden" />
                </nav>

                <main className="min-w-0">
                    {onSettings ? (
                        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
                            {children}
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}

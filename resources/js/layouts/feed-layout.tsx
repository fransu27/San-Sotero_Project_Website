import { Link, usePage } from '@inertiajs/react';
import {
    Ban,
    Megaphone,
    ChartNoAxesCombined,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Eye,
    Home,
    Loader,
    Menu,
    Settings,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import AssistantChat from '@/components/assistant-chat';
import BrandMark from '@/components/brand-mark';
import { Avatar } from '@/components/feed/avatar';
import FeedSearch from '@/components/feed/feed-search';
import ReportRail from '@/components/feed/report-rail';
import TimeWidget from '@/components/feed/time-widget';
import LanguageSwitcher from '@/components/language-switcher';
import ThemeToggle from '@/components/theme-toggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useLocale } from '@/hooks/use-locale';
import { BRAND } from '@/lib/brand';
import { asList, feedHref } from '@/lib/feed-filters';
import type { FilterValue } from '@/lib/feed-filters';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/profile';

/**
 * Facebook-style shell: sticky top bar (logo · navigation · profile) + left navigation + content area.
 * The dashboard and newsfeed are separate pages; the dashboard owns analytics.
 *
 * SECURITY / behaviour notes:
 *  - The "Search reports" box lives ONLY on the Newsfeed (left rail on desktop, top of the page on phones). It is a plain
 *    GET form to /newsfeed?q=…; the SERVER validates and scopes it (a resident can only ever search posts they are
 *    allowed to see). Nothing is filtered by trusting React.
 *  - The top bar holds the language picker (EN / TL / CEB) and the Dark / Light switch; both are remembered.
 *  - Sidebar links only change query strings the server re-validates against fixed lists.
 */
type Filters = {
    q: string;
    category: FilterValue;
    status: FilterValue;
    sort?: string | null;
};
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
// Fallback list used if the server did not send `statuses` (same fixed values the server validates).
const DEFAULT_STATUSES = [
    'Pending',
    'Under Review',
    'In Progress',
    'Resolved',
    'Rejected',
];

export default function FeedLayout({ children }: { children: ReactNode }) {
    const page = usePage();
    const { t } = useLocale();
    const { auth, filters, counts, statuses } = page.props as any;
    const isAdmin = auth.user.role === 'admin'; // display only; the server enforces every admin action
    const onSettings = page.url.startsWith('/settings');
    const onSubs = page.url.startsWith('/my-submissions');
    const onModeration = page.url.startsWith('/admin/moderation');
    const onAnnouncements = page.url.startsWith('/announcements');
    // my-submissions has its own `filters` prop; the feed's filter highlighting must ignore it
    const f: Filters = (!onSubs && filters) || {
        q: '',
        category: null,
        status: null,
    };
    const onDashboard =
        page.url === '/dashboard' || page.url.startsWith('/dashboard?');
    const onNewsfeed = page.url.startsWith('/newsfeed');
    const showTimeColumn = !onNewsfeed && !onSettings && !onSubs;
    const activeStatuses = asList(f.status);
    const activeCategories = asList(f.category);
    // Status links keep the active category / search / sort, so "Pending" + "Under Review" + "Peace and Order" can be combined.
    // Pressing a selected status again turns just that one filter off.
    const statusLinks: NavLink[] = (statuses ?? DEFAULT_STATUSES)
        .filter((s: string) => !['Rejected', 'Removed'].includes(s))
        .map((s: string) => ({
            label: t(
                s === 'Approval' && isAdmin
                    ? 'status.ApprovalAdmin'
                    : `status.${s}`,
            ),
            href: feedHref(f, { status: s }, { toggle: true }),
            icon: statusIcon[s] ?? Clock,
            active: activeStatuses.includes(s),
            count: counts ? Number(counts[s] ?? 0) : undefined,
        }));

    // "Search reports" is only drawn on the Newsfeed; the other active filters ride along as hidden fields.
    const searchHidden = [
        activeCategories.length > 0
            ? { name: 'category', value: activeCategories.join(',') }
            : null,
        activeStatuses.length > 0
            ? { name: 'status', value: activeStatuses.join(',') }
            : null,
        f.sort && f.sort !== 'new' ? { name: 'sort', value: f.sort } : null,
    ].filter((h): h is { name: string; value: string } => h !== null);
    const searchBox = (className?: string) => (
        <FeedSearch
            q={f.q}
            placeholder={t('nav.search')}
            hidden={searchHidden}
            className={className}
        />
    );

    const navItems: NavLink[] = [
        {
            label: 'Dashboard',
            href: '/dashboard',
            icon: ChartNoAxesCombined,
            active: onDashboard,
        },
        {
            label: 'Newsfeed',
            href: '/newsfeed',
            icon: Home,
            active: onNewsfeed,
        },
        {
            label: 'Announcements',
            href: '/announcements',
            icon: Megaphone,
            active: onAnnouncements,
        },
        isAdmin
            ? {
                  label: 'Submission moderation',
                  href: '/admin/moderation',
                  icon: ClipboardCheck,
                  active: onModeration,
              }
            : {
                  label: 'My submissions',
                  href: '/my-submissions',
                  icon: ClipboardList,
                  active: onSubs,
              },
    ];

    if (isAdmin) {
        navItems.push({
            label: 'Walk-in intake',
            href: '/admin/walk-in-complaints/create',
            icon: ClipboardList,
            active: page.url.startsWith('/admin/walk-in-complaints'),
        });
    }

    // Settings belongs at the bottom of the collapsible navigation drawer for every role,
    // rather than taking space in the compact All reports filter card.
    const drawerNavItems: NavLink[] = [
        ...navItems,
        {
            label: t('nav.settings'),
            href: edit().url,
            icon: Settings,
            active: onSettings,
        },
    ];

    return (
        <div className="min-h-screen bg-[#F0F2F5] dark:bg-background">
            {/* ── Top bar ── */}
            <header className="sticky top-0 z-40 border-b border-border bg-card">
                <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-5">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 font-semibold"
                    >
                        <BrandMark size={42} />
                        <span className="hidden leading-tight sm:grid">
                            <span className="text-sm font-semibold">
                                {(page.props as any).barangay?.name ||
                                    BRAND.place}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {BRAND.product}
                            </span>
                        </span>
                    </Link>

                    <nav
                        className="mx-auto hidden items-center gap-2 lg:flex"
                        aria-label={t('nav.main')}
                    >
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={item.active ? 'page' : undefined}
                                className={cn(
                                    'nav-fill-link rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                                    item.active && 'is-active',
                                )}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:ml-0">
                        <LanguageSwitcher />
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

            {/* Mobile-first navigation: keep the header compact and reveal links in a familiar
                Laravel-style drawer instead of forcing a second horizontal navigation row. */}
            <div className="sticky top-16 z-30 border-b border-border bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur lg:hidden">
                <div className="mx-auto flex max-w-[1320px] items-center gap-3">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                aria-label="Open navigation menu"
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-[#0197F6] focus-visible:outline-none"
                            >
                                <Menu size={20} />
                            </button>
                        </SheetTrigger>
                        <SheetContent
                            side="left"
                            className="w-[min(86vw,320px)] bg-card p-0"
                        >
                            <SheetHeader className="border-b border-border px-5 py-4 text-left">
                                <SheetTitle>
                                    {(page.props as any).barangay?.name ||
                                        BRAND.place}
                                </SheetTitle>
                                <p className="text-sm text-muted-foreground">
                                    {BRAND.product}
                                </p>
                            </SheetHeader>
                            <nav
                                className="grid gap-1 p-3"
                                aria-label={t('nav.main')}
                            >
                                {drawerNavItems.map((item) => (
                                    <SheetClose asChild key={item.href}>
                                        <Link
                                            href={item.href}
                                            aria-current={
                                                item.active ? 'page' : undefined
                                            }
                                            className={cn(
                                                'flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-[#0197F6] focus-visible:outline-none',
                                                item.active &&
                                                    'bg-accent text-accent-foreground',
                                            )}
                                        >
                                            <item.icon size={18} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SheetClose>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                        {navItems.find((item) => item.active)?.label ||
                            BRAND.product}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                        {BRAND.place}
                    </span>
                </div>
            </div>

            {/* The report rail (clock + status filters) belongs to the Newsfeed. Dashboard, Announcements and
                Submission moderation get the same time widget in the same left spot; My submissions places it
                inside its own filter column. */}
            <div
                className={cn(
                    'mx-auto grid max-w-[1320px] gap-5 px-4 py-5 sm:px-5',
                    onNewsfeed
                        ? 'xl:grid-cols-[auto_minmax(0,1fr)]'
                        : showTimeColumn
                          ? 'lg:grid-cols-[272px_minmax(0,1fr)]'
                          : 'grid-cols-1',
                )}
            >
                {showTimeColumn && (
                    <aside className="sticky top-[84px] hidden h-fit self-start lg:block">
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <TimeWidget />
                        </div>
                    </aside>
                )}

                {onNewsfeed && (
                    <div className="hidden xl:block">
                        <ReportRail
                            ariaLabel={t('nav.filters')}
                            links={statusLinks}
                            settings={{
                                label: t('nav.settings'),
                                href: edit().url,
                            }}
                            search={searchBox()}
                        />
                    </div>
                )}

                {/* Phones / tablets: the search box and language picker sit at the top of the Newsfeed. The "All reports" and
                    "Browse by category" boxes live in the page itself, right above the New / Best / Hot row. */}
                {onNewsfeed && (
                    <section
                        className="space-y-3 xl:hidden"
                        aria-label={t('nav.filters')}
                    >
                        {searchBox()}
                    </section>
                )}

                <main
                    className={cn(
                        'min-w-0',
                        onSettings && 'settings-workspace',
                    )}
                >
                    {onSettings ? (
                        <div className="settings-content mx-auto w-full max-w-5xl rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-7">
                            {children}
                        </div>
                    ) : (
                        // key = page component: Dashboard → Newsfeed → Submissions replays a short fade/slide,
                        // while polling or filter changes on the same page do not.
                        <div key={page.component} className="page-enter">
                            {children}
                        </div>
                    )}
                </main>
            </div>
            <AssistantChat />
        </div>
    );
}

import { Link, router, usePage } from '@inertiajs/react';
import {
    Ban,
    Bell,
    ChartNoAxesCombined,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Eye,
    Home,
    Loader,
    Megaphone,
    Menu,
    Settings,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AssistantChat from '@/components/assistant-chat';
import BrandMark from '@/components/brand-mark';
import { Avatar } from '@/components/feed/avatar';
import FeedSearch from '@/components/feed/feed-search';
import ReportRail from '@/components/feed/report-rail';
import LanguageSwitcher from '@/components/language-switcher';
import ThemeToggle from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
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

type Notification = {
    id: string;
    title: string;
    message: string;
    url?: string | null;
    read: boolean;
    created_at?: string | null;
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

    const notifications = (auth?.notifications ?? []) as Notification[];
    const unreadNotifications = notifications.filter(
        (notification) => !notification.read,
    ).length;

    const [appealMessage, setAppealMessage] = useState('');
    const [appealBusy, setAppealBusy] = useState(false);
    const [appealError, setAppealError] = useState('');
    const [appealSubmitted, setAppealSubmitted] = useState(false);

    const accountRestricted =
        auth.user?.role !== 'admin' &&
        auth.user?.effective_moderation_status === 'restricted';

    const profileRestricted =
        auth.user?.role !== 'admin' && Boolean(auth.user?.profile_restricted);

    const showModerationNotice = accountRestricted;
    const isAdmin = auth.user.role === 'admin';
    const onSettings = page.url.startsWith('/settings');
    const onSubs = page.url.startsWith('/my-submissions');
    const onModeration = page.url.startsWith('/admin/moderation');
    const onAnnouncements = page.url.startsWith('/announcements');
    const onDashboard =
        page.url === '/dashboard' || page.url.startsWith('/dashboard?');
    const onNewsfeed = page.url.startsWith('/newsfeed');

    // My submissions has its own filters prop. Do not use those to highlight feed filters.
    const f: Filters = (!onSubs && filters) || {
        q: '',
        category: null,
        status: null,
    };

    const activeStatuses = asList(f.status);
    const activeCategories = asList(f.category);

    const statusLinks: NavLink[] = (statuses ?? DEFAULT_STATUSES)
        .filter((status: string) => !['Rejected', 'Removed'].includes(status))
        .map((status: string) => ({
            label: t(
                status === 'Approval' && isAdmin
                    ? 'status.ApprovalAdmin'
                    : `status.${status}`,
            ),
            href: feedHref(f, { status }, { toggle: true }),
            icon: statusIcon[status] ?? Clock,
            active: activeStatuses.includes(status),
            count: counts ? Number(counts[status] ?? 0) : undefined,
        }));

    const searchHidden = [
        activeCategories.length > 0
            ? {
                  name: 'category',
                  value: activeCategories.join(','),
              }
            : null,
        activeStatuses.length > 0
            ? {
                  name: 'status',
                  value: activeStatuses.join(','),
              }
            : null,
        f.sort && f.sort !== 'new'
            ? {
                  name: 'sort',
                  value: f.sort,
              }
            : null,
    ].filter((item): item is { name: string; value: string } => item !== null);

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
                  label: 'Moderation',
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
            label: 'Walk-In Complaint',
            href: '/admin/walk-in-complaints/create',
            icon: ClipboardList,
            active: page.url.startsWith('/admin/walk-in-complaints'),
        });
    }

    const drawerNavItems: NavLink[] = [
        ...navItems,
        {
            label: t('nav.settings'),
            href: edit().url,
            icon: Settings,
            active: onSettings,
        },
    ];

    const submitAppeal = () => {
        setAppealBusy(true);
        setAppealError('');
        setAppealSubmitted(false);

        router.post(
            '/account-status/appeal',
            {
                appeal_type:
                    profileRestricted && !accountRestricted
                        ? 'profile'
                        : 'account',
                message: appealMessage,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAppealMessage('');
                    setAppealSubmitted(true);
                },
                onError: (errors) => {
                    setAppealError(
                        (errors.appeal as string) ||
                            (errors.message as string) ||
                            'Unable to submit the appeal. Please try again.',
                    );
                },
                onFinish: () => setAppealBusy(false),
            },
        );
    };

    return (
        <div className="ss-app-bg min-h-screen">
            <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
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

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative rounded-full"
                                    aria-label={`Notifications${
                                        unreadNotifications
                                            ? `, ${unreadNotifications} unread`
                                            : ''
                                    }`}
                                    title="Notifications"
                                >
                                    <Bell size={18} />
                                    {unreadNotifications > 0 && (
                                        <span className="absolute top-1 right-1 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                className="w-[min(22rem,calc(100vw-2rem))] p-0"
                            >
                                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                    <p className="text-sm font-semibold">
                                        Notifications
                                    </p>

                                    {unreadNotifications > 0 && (
                                        <button
                                            type="button"
                                            className="text-xs text-primary hover:underline"
                                            onClick={() =>
                                                router.patch(
                                                    '/notifications/read-all',
                                                )
                                            }
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-80 overflow-y-auto p-2">
                                    {notifications.length === 0 ? (
                                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                            You’re all caught up. New
                                            restrictions, comments, and status
                                            updates will appear here.
                                        </p>
                                    ) : (
                                        notifications.map((notification) => (
                                            <button
                                                key={notification.id}
                                                type="button"
                                                onClick={() => {
                                                    if (!notification.read) {
                                                        router.patch(
                                                            `/notifications/${notification.id}/read`,
                                                        );
                                                    }

                                                    if (notification.url) {
                                                        router.visit(
                                                            notification.url,
                                                        );
                                                    }
                                                }}
                                                className={cn(
                                                    'mb-1 flex w-full gap-2 rounded-lg p-3 text-left transition-colors hover:bg-muted',
                                                    !notification.read &&
                                                        'bg-primary/5',
                                                )}
                                            >
                                                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary/70" />

                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium">
                                                        {notification.title}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                                                        {notification.message}
                                                    </span>

                                                    {notification.created_at && (
                                                        <span className="mt-1 block text-[10px] text-muted-foreground">
                                                            {new Date(
                                                                notification.created_at,
                                                            ).toLocaleString()}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

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

            <div className="sticky top-16 z-30 border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-xl lg:hidden">
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

                            {onNewsfeed && (
                                <div className="border-b border-border p-3">
                                    {searchBox()}
                                </div>
                            )}

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

            <div
                className={cn(
                    'mx-auto grid max-w-[1320px] gap-5 px-4 py-5 sm:px-5',
                    onNewsfeed
                        ? 'xl:grid-cols-[auto_minmax(0,1fr)]'
                        : 'grid-cols-1',
                )}
            >
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
                        <div key={page.component} className="page-enter">
                            {children}
                        </div>
                    )}
                </main>
            </div>

            {showModerationNotice && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="account-restriction-title"
                >
                    <section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-amber-500/25 bg-card p-6 text-card-foreground shadow-2xl sm:p-8">
                        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                            <Clock size={24} />
                        </div>

                        <p className="text-xs font-bold tracking-[.16em] text-amber-700 uppercase dark:text-amber-300">
                            {profileRestricted && !accountRestricted
                                ? 'Profile restriction'
                                : 'Account restriction'}
                        </p>

                        <h2
                            id="account-restriction-title"
                            className="mt-2 text-2xl font-bold"
                        >
                            {profileRestricted && !accountRestricted
                                ? 'Your profile has been restricted'
                                : 'Your account is temporarily restricted'}
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {profileRestricted && !accountRestricted
                                ? 'Your profile picture and profile details have been hidden. You can appeal this decision below.'
                                : 'You cannot create posts, comment, react, or otherwise participate while this restriction is active. The restriction is enforced by the server, so opening another page will not bypass it.'}
                        </p>

                        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                            <p className="text-xs font-semibold">Reason</p>
                            <p className="mt-1 text-sm">
                                {profileRestricted && !accountRestricted
                                    ? auth.user.profile_restriction_message ||
                                      'Contact the barangay office for details.'
                                    : auth.user.moderation_message ||
                                      auth.user.restriction_reason ||
                                      'Contact the barangay office for details.'}
                            </p>

                            {accountRestricted &&
                                auth.user.restriction_expires_at && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Expires{' '}
                                        {new Date(
                                            auth.user.restriction_expires_at,
                                        ).toLocaleString()}
                                    </p>
                                )}
                        </div>

                        <label
                            className="mt-5 block text-sm font-semibold"
                            htmlFor="restriction-appeal"
                        >
                            Appeal this decision
                        </label>

                        <textarea
                            id="restriction-appeal"
                            value={appealMessage}
                            onChange={(event) =>
                                setAppealMessage(event.target.value)
                            }
                            rows={4}
                            maxLength={2000}
                            className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm"
                            placeholder="Explain why you believe this restriction should be reviewed (at least 20 characters)."
                        />

                        {appealSubmitted && (
                            <p
                                role="status"
                                className="mt-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                            >
                                Your appeal has been submitted for administrator
                                review.
                            </p>
                        )}

                        {appealError && (
                            <p
                                role="alert"
                                className="mt-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                            >
                                {appealError}
                            </p>
                        )}

                        <button
                            type="button"
                            disabled={
                                appealBusy || appealMessage.trim().length < 20
                            }
                            onClick={submitAppeal}
                            className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {appealBusy
                                ? 'Submitting appeal…'
                                : 'Submit appeal'}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="mt-3 w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
                        >
                            Log out
                        </button>

                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            This notice remains visible until the restriction
                            expires or an administrator changes your account
                            status.
                        </p>
                    </section>
                </div>
            )}

            <AssistantChat />
        </div>
    );
}

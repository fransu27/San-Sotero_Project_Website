import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Bell,
    ChartNoAxesCombined,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Eye,
    Heart,
    Home,
    Loader,
    LockKeyhole,
    MapPin,
    MessageCircle,
    Megaphone,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { ZoomableImage } from '@/components/feed/image-lightbox';
import ReportRail from '@/components/feed/report-rail';
import type { RailLink } from '@/components/feed/report-rail';
import LanguageSwitcher from '@/components/language-switcher';
import ThemeToggle from '@/components/theme-toggle';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Wordmark, { PaletteStripe } from '@/components/wordmark';
import { useLocale } from '@/hooks/use-locale';
import type { Locale } from '@/lib/i18n';
import { localizeAnnouncement } from '@/lib/i18n';
import { dashboard, login, register } from '@/routes';

type Announcement = {
    id: number;
    title: string;
    body: string;
    pinned: boolean;
    translations: Partial<
        Record<Locale, { title?: string; body?: string }>
    > | null;
    image_url?: string | null;
    created_at: string | null;
};

type PublicComplaint = {
    id: number;
    title: string;
    description: string;
    category: string;
    location: string;
    status: string;
    image_url: string | null;
    created_at: string | null;
};

type Props = {
    announcements: Announcement[];
    complaints: PublicComplaint[];
};

const statusStyles: Record<string, string> = {
    Pending:
        'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    'Under Review':
        'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    'In Progress':
        'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    Resolved:
        'border-teal-600/30 bg-teal-600/10 text-teal-700 dark:text-teal-300',
    Rejected:
        'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const statusIcon: Record<string, LucideIcon> = {
    Pending: Clock,
    'Under Review': Eye,
    'In Progress': Loader,
    Resolved: CheckCircle2,
};
const RAIL_STATUSES = ['Pending', 'Under Review', 'In Progress', 'Resolved'];

function dateLabel(value: string | null) {
    if (!value) {
        return 'Recently shared';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? 'Recently shared'
        : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
              date,
          );
}

export default function PublicNewsfeed({ announcements, complaints }: Props) {
    const { locale, t } = useLocale();
    const { auth } = usePage().props as unknown as {
        auth?: { user: { role: string } | null };
    };
    const user = auth?.user ?? null;
    const isAdmin = user?.role === 'admin';
    // Signed-in visitors go straight to the real page; guests are sent to the login page.
    const go = (path: string) => (user ? path : login().url);
    const navItems: { label: string; href: string; icon: LucideIcon }[] = [
        {
            label: 'Dashboard',
            href: go('/dashboard'),
            icon: ChartNoAxesCombined,
        },
        { label: 'Newsfeed', href: go('/newsfeed'), icon: Home },
        { label: 'Announcements', href: go('/announcements'), icon: Megaphone },
        isAdmin
            ? {
                  label: 'Submission moderation',
                  href: go('/admin/moderation'),
                  icon: ClipboardCheck,
              }
            : {
                  label: 'My submissions',
                  href: go('/my-submissions'),
                  icon: ClipboardList,
              },
    ];
    const railLinks: RailLink[] = RAIL_STATUSES.map((status) => ({
        label: t(`status.${status}`),
        href: go(`/newsfeed?status=${encodeURIComponent(status)}`),
        icon: statusIcon[status],
    }));
    const [loginPromptOpen, setLoginPromptOpen] = useState(false);
    const [promptAction, setPromptAction] = useState(
        'interact with community posts',
    );

    const requestSignIn = (action: string) => {
        setPromptAction(action);
        setLoginPromptOpen(true);
    };

    return (
        <>
            <Head title="Community Newsfeed" />
            <div className="min-h-screen bg-background text-foreground">
                <PaletteStripe />
                <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6">
                        <Link
                            href="/"
                            aria-label="San Sotero home"
                            className="shrink-0 transition-transform duration-300 hover:-translate-y-0.5"
                        >
                            <Wordmark />
                        </Link>
                        <nav
                            className="mx-auto hidden items-center gap-1.5 lg:flex"
                            aria-label={t('nav.main')}
                        >
                            {navItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="nav-fill-link rounded-full px-3.5 py-2 text-sm font-medium"
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:ml-0">
                            {!user && (
                                <span className="hidden items-center gap-2 rounded-full border border-teal-600/25 bg-teal-600/10 px-3 py-1.5 text-xs font-semibold text-teal-800 xl:inline-flex dark:text-teal-300">
                                    <span className="size-2 rounded-full bg-teal-500" />
                                    Guest preview
                                </span>
                            )}
                            <LanguageSwitcher />
                            <ThemeToggle />
                            {user ? (
                                <Link
                                    href={dashboard()}
                                    className="nav-fill-link rounded-full px-4 py-2 text-sm font-semibold"
                                >
                                    <ChartNoAxesCombined size={16} /> Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="nav-fill-link rounded-full px-4 py-2 text-sm font-semibold"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="rounded-full bg-[#0197F6] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#0197F6]/20 transition hover:-translate-y-0.5 hover:bg-[#0670b3]"
                                    >
                                        Join community
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <nav
                        className="mx-auto flex max-w-[1320px] gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden"
                        aria-label={t('nav.main')}
                    >
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="nav-fill-link shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium"
                            >
                                <item.icon size={15} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </header>

                <div className="mx-auto grid max-w-[1320px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[272px_minmax(0,1fr)]">
                    <ReportRail
                        ariaLabel={t('nav.filters')}
                        links={railLinks}
                        settings={{
                            label: t('nav.settings'),
                            href: go('/settings/profile'),
                        }}
                    />
                    <main className="page-enter min-w-0">
                        <section className="relative isolate overflow-hidden rounded-3xl border border-[#0197F6]/20 bg-gradient-to-br from-[#02182B] via-[#073657] to-[#087fc0] px-6 py-7 text-white shadow-[0_18px_50px_rgba(2,24,43,0.16)] sm:px-8 sm:py-9">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute -top-24 -right-16 -z-10 size-80 rounded-full bg-[#68C5DB]/25 blur-3xl"
                            />
                            <div
                                aria-hidden
                                className="pointer-events-none absolute right-1/4 bottom-[-7rem] -z-10 size-64 rounded-full bg-[#0197F6]/30 blur-3xl"
                            />
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.18em] text-[#a7e7f7] uppercase">
                                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-white/10">
                                    <Megaphone size={16} />
                                </span>
                                San Sotero community
                            </div>
                            <h1 className="mt-5 max-w-3xl text-2xl leading-tight font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                                Stay informed. See what your community is
                                working on.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                                Browse public announcements and approved
                                community concerns. This preview is read-only;
                                sign in to report an issue, comment, or react.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <a
                                    href="#public-announcements"
                                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#02182B] transition hover:-translate-y-0.5 hover:shadow-xl"
                                >
                                    <Bell size={16} /> Latest announcements
                                </a>
                                <a
                                    href="#community-reports"
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                                >
                                    Browse concerns <ArrowRight size={16} />
                                </a>
                            </div>
                        </section>

                        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="stagger-children min-w-0 space-y-8">
                                <section
                                    id="public-announcements"
                                    className="scroll-mt-28"
                                >
                                    <div className="mb-5 flex items-end justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-bold tracking-[0.18em] text-[#0197F6] uppercase">
                                                From the barangay
                                            </p>
                                            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                                                Announcements
                                            </h2>
                                        </div>
                                        <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                            {announcements.length} shown
                                        </span>
                                    </div>
                                    {announcements.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                                            <Bell className="mx-auto size-8 text-[#448FA3]" />
                                            <h3 className="mt-3 font-semibold">
                                                No announcements yet
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Please check back for community
                                                updates.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {announcements.map(
                                                (announcement) => {
                                                    const shown =
                                                        localizeAnnouncement(
                                                            announcement,
                                                            locale,
                                                        );

                                                    return (
                                                        <article
                                                            key={
                                                                announcement.id
                                                            }
                                                            className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#0197F6]/40 hover:shadow-xl hover:shadow-[#02182B]/[0.07] sm:p-6"
                                                        >
                                                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0197F6] via-[#68C5DB] to-[#448FA3]" />
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0197F6]/10 px-2.5 py-1 text-xs font-semibold text-[#087fc0] dark:text-[#68C5DB]">
                                                                    <Bell
                                                                        size={
                                                                            13
                                                                        }
                                                                    />{' '}
                                                                    {announcement.pinned
                                                                        ? 'Pinned notice'
                                                                        : 'Barangay update'}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {dateLabel(
                                                                        announcement.created_at,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <h3 className="mt-4 text-lg leading-snug font-semibold tracking-tight">
                                                                {shown.title}
                                                            </h3>
                                                            <p className="mt-2 text-sm leading-6 whitespace-pre-line text-muted-foreground">
                                                                {shown.body}
                                                            </p>
                                                            {announcement.image_url && (
                                                                <ZoomableImage
                                                                    src={
                                                                        announcement.image_url
                                                                    }
                                                                    alt={
                                                                        shown.title
                                                                    }
                                                                    wrapperClassName="mt-4"
                                                                    className="max-h-[260px] w-full rounded-xl border border-border object-cover"
                                                                />
                                                            )}
                                                            {shown.lang !==
                                                                locale && (
                                                                <p className="mt-3 text-xs text-[#087fc0] italic dark:text-[#68C5DB]">
                                                                    Showing
                                                                    available
                                                                    language
                                                                    version
                                                                </p>
                                                            )}
                                                        </article>
                                                    );
                                                },
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section
                                    id="community-reports"
                                    className="scroll-mt-28"
                                >
                                    <div className="mb-5">
                                        <p className="text-xs font-bold tracking-[0.18em] text-[#448FA3] uppercase">
                                            Community activity
                                        </p>
                                        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                                            Public concerns
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Only reports approved for public
                                            viewing appear here.
                                        </p>
                                    </div>
                                    {complaints.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                                            <ShieldCheck className="mx-auto size-8 text-[#448FA3]" />
                                            <h3 className="mt-3 font-semibold">
                                                No public concerns to show
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                New public reports appear here
                                                after barangay review.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {complaints.map((complaint) => (
                                                <article
                                                    key={complaint.id}
                                                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition duration-300 hover:border-[#0197F6]/35 hover:shadow-lg sm:p-5"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <span className="rounded-full bg-[#448FA3]/12 px-3 py-1 text-xs font-semibold text-[#36798b] dark:text-[#8fd8e9]">
                                                            {complaint.category}
                                                        </span>
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[complaint.status] ?? 'border-border bg-accent text-foreground'}`}
                                                        >
                                                            <CheckCircle2
                                                                size={13}
                                                            />{' '}
                                                            {complaint.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-4 text-lg font-semibold tracking-tight">
                                                        {complaint.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-6 break-words whitespace-pre-line text-muted-foreground">
                                                        {complaint.description}
                                                    </p>
                                                    {complaint.image_url && (
                                                        <ZoomableImage
                                                            src={
                                                                complaint.image_url
                                                            }
                                                            alt={
                                                                complaint.title
                                                            }
                                                            wrapperClassName="mt-4"
                                                            className="post-media max-h-[300px] w-full rounded-xl border border-border object-cover"
                                                        />
                                                    )}
                                                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <MapPin size={14} />{' '}
                                                            {complaint.location}
                                                        </span>
                                                        <span>
                                                            {dateLabel(
                                                                complaint.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                requestSignIn(
                                                                    'react to a concern',
                                                                )
                                                            }
                                                            className="nav-fill-link rounded-full px-3.5 py-1.5 text-sm font-medium"
                                                        >
                                                            <Heart size={15} />{' '}
                                                            React{' '}
                                                            <LockKeyhole
                                                                size={12}
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                requestSignIn(
                                                                    'comment on a concern',
                                                                )
                                                            }
                                                            className="nav-fill-link rounded-full px-3.5 py-1.5 text-sm font-medium"
                                                        >
                                                            <MessageCircle
                                                                size={15}
                                                            />{' '}
                                                            Comment{' '}
                                                            <LockKeyhole
                                                                size={12}
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                requestSignIn(
                                                                    'submit a report',
                                                                )
                                                            }
                                                            className="nav-fill-link ml-auto rounded-full px-3.5 py-1.5 text-sm font-semibold"
                                                        >
                                                            <UserRound
                                                                size={15}
                                                            />{' '}
                                                            Get involved
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>

                            <aside className="space-y-4 xl:sticky xl:top-24">
                                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#0197F6]/10 text-[#0197F6]">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <h2 className="mt-4 text-base font-semibold">
                                        Privacy comes first
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Private reports, pending submissions,
                                        and resident identities are not included
                                        in this guest preview.
                                    </p>
                                </section>
                                <section className="rounded-2xl border border-[#0197F6]/20 bg-gradient-to-br from-[#0197F6]/10 via-card to-[#68C5DB]/10 p-5">
                                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#0197F6] shadow-sm dark:bg-[#02182B]">
                                        <LockKeyhole size={19} />
                                    </div>
                                    <h2 className="mt-4 text-base font-semibold">
                                        Want to take part?
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Create an account to submit concerns and
                                        join the conversation.
                                    </p>
                                    <Link
                                        href={register()}
                                        className="nav-fill-link mt-4 flex w-full justify-center rounded-full px-4 py-2.5 text-sm font-semibold"
                                    >
                                        Create an account{' '}
                                        <ArrowRight size={15} />
                                    </Link>
                                </section>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 px-1 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                                >
                                    <ArrowLeft size={15} /> Back to home
                                </Link>
                            </aside>
                        </div>
                    </main>
                </div>

                <footer className="mt-12 border-t border-border/70">
                    <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
                        <span>San Sotero — Report Concerns</span>
                        <span>
                            © {new Date().getFullYear()} San Sotero. All rights
                            reserved.
                        </span>
                    </div>
                </footer>
            </div>

            <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
                <DialogContent className="rounded-2xl border-border p-6 sm:p-7">
                    <DialogHeader>
                        <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-[#0197F6]/10 text-[#0197F6]">
                            <LockKeyhole size={22} />
                        </div>
                        <DialogTitle className="text-xl">
                            Sign in to continue
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-6">
                            You’re browsing as a guest. Sign in to{' '}
                            {promptAction}; your action hasn’t been submitted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                        <Link
                            href={login()}
                            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#0197F6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0670b3]"
                        >
                            Log in
                        </Link>
                        <Link
                            href={register()}
                            className="nav-fill-link flex-1 justify-center rounded-full px-4 py-2.5 text-sm font-semibold"
                        >
                            Create account
                        </Link>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

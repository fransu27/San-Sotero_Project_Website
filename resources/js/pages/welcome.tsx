import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Bell,
    CheckCircle2,
    Clock,
    FileText,
    MapPin,
    Megaphone,
    Building2,
    ShieldCheck,
    Menu,
    ArrowRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import LanguageSwitcher from '@/components/language-switcher';
import ThemeToggle from '@/components/theme-toggle';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import Wordmark, { PaletteStripe } from '@/components/wordmark';
import { useLocale } from '@/hooks/use-locale';
import { BRAND } from '@/lib/brand';
import { localizeAnnouncement } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { dashboard, login } from '@/routes';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */

/**
 * Welcome (landing) page. Public and read-only: it renders static marketing content
 * and only reads `auth.user` (shared by HandleInertiaRequests) to swap Log in/Register
 * for a Dashboard link. No user input is rendered, so there is no XSS surface here.
 * LANGUAGE: every phrase comes from t() (English / Tagalog / Bisaya, see lang/welcome.ts).
 * ANNOUNCEMENTS are real rows written by the admin (WelcomeController) and shown in the visitor's language;
 * guests receive only title/body/translations, never author, photo or any complaint.
 * The 3 sample complaints in the right-hand panel are demo data, not real reports.
 *
 * THEME: colours that depend on Dark / Light use the --w-* variables from app.css; the button in the header switches them.
 * Palette (only): crimson #D7263D · navy #02182B · blue #0197F6 · teal #448FA3 · sky #68C5DB
 */
type Status = 'Pending' | 'In Progress' | 'Resolved';
const statusColor: Record<Status, string> = {
    Pending: '#D7263D',
    'In Progress': '#0197F6',
    Resolved: '#448FA3',
};

type Notice = {
    id: number;
    title: string;
    body: string;
    translations: Partial<
        Record<Locale, { title?: string; body?: string }>
    > | null;
};

const recent: { ref: string; key: string; place: string; status: Status }[] = [
    {
        ref: '#0142',
        key: 'w.s1',
        place: 'Purok 3, Sitio Mabuhay',
        status: 'In Progress',
    },
    { ref: '#0141', key: 'w.s2', place: 'Purok 7', status: 'Pending' },
    {
        ref: '#0139',
        key: 'w.s3',
        place: 'Purok 2, Main St.',
        status: 'Resolved',
    },
];

const steps: { icon: LucideIcon; color: string; key: string }[] = [
    { icon: FileText, color: '#0197F6', key: 'w.st1' },
    { icon: Clock, color: '#D7263D', key: 'w.st2' },
    { icon: CheckCircle2, color: '#448FA3', key: 'w.st3' },
];

const features: { icon: LucideIcon; key: string }[] = [
    { icon: FileText, key: 'w.f1' },
    { icon: Clock, key: 'w.f2' },
    { icon: MapPin, key: 'w.f3' },
    { icon: Megaphone, key: 'w.f4' },
    { icon: Building2, key: 'w.f5' },
    { icon: ShieldCheck, key: 'w.f6' },
];

const categories: [string, string][] = [
    ['Infrastructure', '#0197F6'],
    ['Sanitation', '#448FA3'],
    ['Peace and Order', '#D7263D'],
    ['Others', '#68C5DB'],
];

const card =
    'rounded-3xl border border-[rgb(var(--w-line))] bg-[rgb(var(--w-card))] shadow-[0_1px_2px_rgb(var(--w-fg)/0.06),0_8px_24px_rgb(var(--w-fg)/0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgb(var(--w-accent)/0.45)] hover:shadow-[0_22px_55px_rgb(var(--w-accent)/0.14)]';
const wrap = 'mx-auto max-w-6xl px-5 sm:px-6 lg:px-8';
const primaryBtn =
    'rounded-xl bg-[#D7263D] px-5 py-3 text-[14px] font-semibold text-white shadow-lg shadow-[#D7263D]/20 transition hover:-translate-y-0.5 hover:bg-[#bd2034] focus-visible:outline-offset-4';

/** Small uppercase label above each section heading. */
const Eyebrow = ({ children }: { children: string }) => (
    <p className="text-[12px] font-semibold tracking-wider text-[rgb(var(--w-accent)/1)] uppercase">
        {children}
    </p>
);

export default function Welcome({
    announcements,
}: {
    announcements: Notice[];
}) {
    const { auth, barangay } = usePage().props as unknown as {
        auth: { user?: unknown };
        barangay: {
            name: string | null;
            caption: string | null;
            banner_url: string | null;
        };
    };
    const { t, locale } = useLocale();
    // Signed-in residents/admins go straight to their real newsfeed; guests only get the read-only community feed.
    const feedHref = auth.user ? '/newsfeed' : '/community';
    const [photoFailed, setPhotoFailed] = useState(false);
    const [selectedSection, setSelectedSection] = useState('');
    const place = barangay.name || BRAND.place;
    // The picked link stays solid blue with white text (the !important utilities win over any other rule).
    const activeLink =
        'is-active !border-[#0678c5] !bg-[#0678c5] !text-white !shadow-[0_8px_18px_-6px_rgba(6,120,197,0.55)] dark:!border-[#0a74c4] dark:!bg-[#0a74c4]';

    useEffect(() => {
        const targets = Array.from(
            document.querySelectorAll<HTMLElement>('[data-reveal]'),
        );

        if (!('IntersectionObserver' in window)) {
            targets.forEach((target) => target.classList.add('is-visible'));

            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const target = entry.target as HTMLElement;
                    target.classList.add('reveal-pending');

                    if (entry.isIntersecting) {
                        target.classList.add('is-visible');
                        observer.unobserve(target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -36px 0px' },
        );

        targets.forEach((target) => observer.observe(target));

        return () => observer.disconnect();
    }, []);

    return (
        <>
            <Head title={t('w.footer1')} />
            <div className="w-theme page-enter min-h-screen scroll-smooth bg-[rgb(var(--w-bg))] text-[rgb(var(--w-fg))]">
                <PaletteStripe />
                <a
                    href="#main-content"
                    className="sr-only z-50 rounded-md bg-[rgb(var(--w-bg))] px-4 py-3 font-medium text-[rgb(var(--w-fg))] shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-[rgb(var(--w-accent))]"
                >
                    Skip to main content
                </a>

                {/* Header: the brand sits in the far-left corner, the account buttons in the far-right corner, and the
                    links share the middle as pills that turn solid blue when picked (same style as the Newsfeed). */}
                <header className="sticky top-0 z-10 border-b border-[rgb(var(--w-line))] bg-[rgb(var(--w-bg)/0.95)] backdrop-blur">
                    <div className="flex items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-10">
                        <Link
                            href="/"
                            aria-label={`${place} — ${BRAND.product}, home`}
                            className="group inline-flex shrink-0 rounded-xl transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-offset-4"
                        >
                            <Wordmark />
                        </Link>
                        <nav className="hidden items-center gap-2 text-[rgb(var(--w-fg-2))] xl:flex">
                            <Link
                                href="/track-complaint"
                                className="nav-fill-link rounded-full px-4 py-2 text-[13px] font-medium"
                            >
                                Track a complaint
                            </Link>
                            <a
                                href="#how-it-works"
                                onClick={() =>
                                    setSelectedSection('how-it-works')
                                }
                                aria-current={
                                    selectedSection === 'how-it-works'
                                        ? 'location'
                                        : undefined
                                }
                                className={`nav-fill-link rounded-full px-4 py-2 text-[13px] font-medium ${selectedSection === 'how-it-works' ? activeLink : ''}`}
                            >
                                {t('w.nav.how')}
                            </a>
                            <a
                                href="#features"
                                onClick={() => setSelectedSection('features')}
                                aria-current={
                                    selectedSection === 'features'
                                        ? 'location'
                                        : undefined
                                }
                                className={`nav-fill-link rounded-full px-4 py-2 text-[13px] font-medium ${selectedSection === 'features' ? activeLink : ''}`}
                            >
                                {t('w.nav.features')}
                            </a>
                            <a
                                href="#announcements"
                                onClick={() =>
                                    setSelectedSection('announcements')
                                }
                                aria-current={
                                    selectedSection === 'announcements'
                                        ? 'location'
                                        : undefined
                                }
                                className={`nav-fill-link rounded-full px-4 py-2 text-[13px] font-medium ${selectedSection === 'announcements' ? activeLink : ''}`}
                            >
                                {t('w.nav.ann')}
                            </a>
                            <Link
                                href={feedHref}
                                className="nav-fill-link rounded-full px-4 py-2 text-[13px] font-medium"
                            >
                                Community feed
                            </Link>
                        </nav>
                        <div className="flex items-center gap-2 text-[12px] sm:gap-4 sm:text-[13px]">
                            <div className="xl:hidden">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label="Open site navigation"
                                            className="inline-flex size-10 items-center justify-center rounded-xl border border-[rgb(var(--w-line))] bg-[rgb(var(--w-card))] text-[rgb(var(--w-fg))] shadow-sm transition hover:border-[rgb(var(--w-accent)/0.5)] focus-visible:ring-2 focus-visible:ring-[rgb(var(--w-accent))] focus-visible:outline-none"
                                        >
                                            <Menu size={20} />
                                        </button>
                                    </SheetTrigger>
                                    <SheetContent
                                        side="left"
                                        className="w-[min(86vw,320px)] border-[rgb(var(--w-line))] bg-[rgb(var(--w-bg))] p-0 text-[rgb(var(--w-fg))]"
                                    >
                                        <SheetHeader className="border-b border-[rgb(var(--w-line))] px-5 py-4 text-left">
                                            <SheetTitle className="text-[rgb(var(--w-fg))]">
                                                {place}
                                            </SheetTitle>
                                            <p className="text-sm text-[rgb(var(--w-fg-2))]">
                                                {BRAND.product}
                                            </p>
                                        </SheetHeader>
                                        <nav
                                            className="grid gap-1 p-3"
                                            aria-label="Mobile site navigation"
                                        >
                                            <SheetClose asChild>
                                                <a
                                                    href="#how-it-works"
                                                    onClick={() =>
                                                        setSelectedSection(
                                                            'how-it-works',
                                                        )
                                                    }
                                                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--w-accent)/0.08)]"
                                                >
                                                    <CheckCircle2 size={18} />
                                                    {t('w.nav.how')}
                                                </a>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <a
                                                    href="#features"
                                                    onClick={() =>
                                                        setSelectedSection(
                                                            'features',
                                                        )
                                                    }
                                                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--w-accent)/0.08)]"
                                                >
                                                    <ShieldCheck size={18} />
                                                    {t('w.nav.features')}
                                                </a>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <a
                                                    href="#announcements"
                                                    onClick={() =>
                                                        setSelectedSection(
                                                            'announcements',
                                                        )
                                                    }
                                                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--w-accent)/0.08)]"
                                                >
                                                    <Bell size={18} />
                                                    {t('w.nav.ann')}
                                                </a>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <Link
                                                    href="/track-complaint"
                                                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--w-accent)/0.08)]"
                                                >
                                                    <FileText size={18} />
                                                    Track a complaint
                                                </Link>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <Link
                                                    href={feedHref}
                                                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--w-accent)/0.08)]"
                                                >
                                                    <ArrowRight size={18} />
                                                    Community feed
                                                </Link>
                                            </SheetClose>
                                            {auth.user ? (
                                                <SheetClose asChild>
                                                    <Link
                                                        href={dashboard()}
                                                        className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--w-accent)/0.08)]"
                                                    >
                                                        {t('w.dashboard')}
                                                    </Link>
                                                </SheetClose>
                                            ) : (
                                                <>
                                                    <SheetClose asChild>
                                                        <Link
                                                            href={login()}
                                                            className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--w-accent)/0.08)]"
                                                        >
                                                            {t('w.login')}
                                                        </Link>
                                                    </SheetClose>
                                                    <SheetClose asChild>
                                                        <Link
                                                            href={register()}
                                                            className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-[#D7263D] px-3 py-2 text-sm font-semibold text-white"
                                                        >
                                                            {t('w.register')}
                                                        </Link>
                                                    </SheetClose>
                                                </>
                                            )}
                                        </nav>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <div className="hidden sm:block">
                                <LanguageSwitcher tone="landing" />
                            </div>
                            <ThemeToggle tone="landing" />
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="nav-fill-link hidden rounded-full px-4 py-2 text-[13px] font-medium lg:inline-flex"
                                >
                                    {t('w.dashboard')}
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="nav-fill-link hidden rounded-full px-4 py-2 text-[13px] font-medium lg:inline-flex"
                                    >
                                        {t('w.login')}
                                    </Link>
                                    {/* @chisel-registration */}
                                    <Link
                                        href={register()}
                                        className="hidden rounded-full bg-[#D7263D] px-5 py-2.5 font-semibold text-white shadow-md shadow-[#D7263D]/15 transition hover:-translate-y-0.5 hover:bg-[#bd2034] lg:inline-flex"
                                    >
                                        {t('w.register')}
                                    </Link>
                                    {/* @end-chisel-registration */}
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main id="main-content" tabIndex={-1} className="outline-none">
                    {/* Hero: the barangay photo sits BEHIND the headline at full strength, shaded only where the text is (it fades into the page at the bottom).
                        The photo is the admin's upload from Settings → Barangay, or the bundled Santotero photo. */}
                    <div className="relative isolate overflow-hidden">
                        <div aria-hidden className="absolute inset-0 -z-10">
                            {barangay.banner_url && !photoFailed && (
                                <img
                                    src={barangay.banner_url}
                                    alt=""
                                    onError={() => setPhotoFailed(true)}
                                    className="size-full scale-105 object-cover object-[center_45%]"
                                />
                            )}
                            <div className="absolute -top-36 right-[8%] size-[28rem] rounded-full bg-[#0197F6]/10 blur-3xl" />
                            <div className="absolute top-1/3 -left-48 size-[26rem] rounded-full bg-[#D7263D]/[0.06] blur-3xl" />
                            {/* The photo stays clearly visible. Phones get an even light veil (the text covers the whole width);
                                wide screens only shade the text side, so the right half shows the barangay at full strength. */}
                            <div className="absolute inset-0 bg-[rgb(var(--w-bg)/0.74)] lg:hidden" />
                            <div className="absolute inset-0 hidden bg-gradient-to-r from-[rgb(var(--w-bg)/0.93)] via-[rgb(var(--w-bg)/0.62)] to-[rgb(var(--w-bg)/0.05)] lg:block" />
                            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[rgb(var(--w-bg))] to-transparent" />
                        </div>
                        {barangay.banner_url && !photoFailed && (
                            <p className="absolute right-4 bottom-4 z-10 hidden items-center gap-1.5 rounded-full border border-[rgb(var(--w-line-strong))] bg-[rgb(var(--w-card))] px-3 py-1 text-[12px] backdrop-blur sm:flex">
                                <MapPin
                                    size={13}
                                    className="text-[rgb(var(--w-accent))]"
                                />{' '}
                                {place}
                            </p>
                        )}
                        <section
                            id="home"
                            className={`${wrap} grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20`}
                        >
                            <div data-reveal>
                                <span className="inline-flex items-center gap-2 rounded-full border border-[#0197F6]/25 bg-[#0197F6]/10 px-4 py-2 text-[12px] font-semibold tracking-wide text-[rgb(var(--w-accent)/1)] shadow-sm">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#0197F6]" />{' '}
                                    {t('w.badge')}
                                </span>
                                <h1 className="mt-6 max-w-2xl text-[38px] leading-[1.06] font-bold tracking-[-0.045em] sm:text-[48px] lg:text-[56px]">
                                    {t('w.h1a')}{' '}
                                    <span className="text-[rgb(var(--w-brand))]">
                                        {t('w.h1b')}
                                    </span>
                                </h1>
                                <p className="mt-5 text-[16px] font-semibold tracking-tight text-[rgb(var(--w-fg-2))] sm:text-[20px]">
                                    {t('w.tagline')}
                                </p>
                                <p className="mt-5 max-w-xl text-[15px] leading-7 text-[rgb(var(--w-fg-2))] sm:text-[16px]">
                                    {t('w.lead')}
                                </p>
                                <div className="mt-9 flex flex-wrap gap-3">
                                    <Link
                                        href={register()}
                                        className={primaryBtn}
                                    >
                                        {t('w.cta')}
                                    </Link>
                                    <Link
                                        href={feedHref}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--w-line-strong))] bg-[rgb(var(--w-card))] px-5 py-3 text-[14px] font-semibold text-[rgb(var(--w-fg))] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--w-accent)/0.5)] hover:bg-[rgb(var(--w-accent)/0.08)] hover:shadow-lg"
                                    >
                                        Browse community feed
                                    </Link>
                                    <a
                                        href="#how-it-works"
                                        className="rounded-xl border border-[rgb(var(--w-line-strong))] bg-[rgb(var(--w-card))] px-5 py-3 text-[14px] font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[rgb(var(--w-accent)/0.1)]"
                                    >
                                        {t('w.learn')}
                                    </a>
                                </div>
                                <div className="mt-8 flex flex-wrap gap-6 text-[12px] text-[rgb(var(--w-fg-2))]">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2
                                            size={14}
                                            color="#448FA3"
                                        />{' '}
                                        {t('w.trust1')}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck
                                            size={14}
                                            color="#0197F6"
                                        />{' '}
                                        {t('w.trust2')}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock size={14} color="#D7263D" />{' '}
                                        {t('w.trust3')}
                                    </span>
                                </div>
                            </div>

                            {/* Recent complaints panel */}
                            <div
                                data-reveal
                                className="relative rounded-3xl border border-[rgb(var(--w-line))] bg-[rgb(var(--w-band))] p-3 shadow-xl shadow-[#02182B]/10 sm:p-4"
                            >
                                <div className="rounded-2xl border border-[rgb(var(--w-line))] bg-[rgb(var(--w-card))] p-5 shadow-sm sm:p-7">
                                    <div className="flex items-start justify-between border-b border-[rgb(var(--w-line))] pb-4">
                                        <div>
                                            <p className="text-[12px] text-[rgb(var(--w-fg-3))]">
                                                {t('w.panelKicker')}
                                            </p>
                                            <h2 className="text-[16px] font-semibold">
                                                {t('w.panelTitle')}
                                            </h2>
                                        </div>
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0197F6]/20 text-[#0197F6]">
                                            <FileText size={16} />
                                        </span>
                                    </div>
                                    {recent.map((r) => (
                                        <div
                                            key={r.ref}
                                            className="flex items-start justify-between border-b border-[rgb(var(--w-line))] py-4"
                                        >
                                            <div>
                                                <p className="text-[14px] font-medium">
                                                    {t(r.key)}
                                                </p>
                                                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[rgb(var(--w-fg-3))]">
                                                    <MapPin size={12} />{' '}
                                                    {r.place}
                                                </p>
                                                <p className="mt-0.5 text-[12px] text-[rgb(var(--w-fg-3))]">
                                                    {r.ref}
                                                </p>
                                            </div>
                                            <span
                                                className="flex items-center gap-1.5 text-[12px]"
                                                style={{
                                                    color: statusColor[
                                                        r.status
                                                    ],
                                                }}
                                            >
                                                <span
                                                    className="h-1.5 w-1.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            statusColor[
                                                                r.status
                                                            ],
                                                    }}
                                                />
                                                {t(`status.${r.status}`)}
                                            </span>
                                        </div>
                                    ))}
                                    <p className="mt-4 flex items-center gap-2 rounded-lg bg-[rgb(var(--w-accent)/0.1)] px-3 py-2.5 text-[12px] text-[rgb(var(--w-fg-2))]">
                                        <Bell size={13} /> {t('w.panelNote')}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* How it works */}
                    <section
                        id="how-it-works"
                        className="scroll-mt-24 border-y border-[rgb(var(--w-line))] bg-[rgb(var(--w-band))] py-20 sm:py-24"
                    >
                        <div className={`${wrap} text-center`}>
                            <Eyebrow>{t('w.process')}</Eyebrow>
                            <h2 className="mt-3 text-[32px] font-bold tracking-tight sm:text-[38px]">
                                {t('w.howTitle')}
                            </h2>
                            <p className="mt-4 text-[15px] leading-7 text-[rgb(var(--w-fg-2))] sm:text-[16px]">
                                {t('w.howSub')}
                            </p>
                            <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
                                {steps.map(({ icon: Icon, color, key }) => (
                                    <div
                                        key={key}
                                        data-reveal
                                        className={`${card} p-6`}
                                    >
                                        <span
                                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                                            style={{
                                                backgroundColor: `${color}33`,
                                                color,
                                            }}
                                        >
                                            <Icon size={18} />
                                        </span>
                                        <h3 className="mt-5 text-[15px] font-semibold">
                                            {t(`${key}t`)}
                                        </h3>
                                        <p className="mt-2 text-[14.5px] leading-relaxed text-[rgb(var(--w-fg-2))]">
                                            {t(`${key}b`)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Categories */}
                    <section className={`${wrap} py-20 text-center sm:py-24`}>
                        <Eyebrow>{t('w.catsKicker')}</Eyebrow>
                        <h2 className="mt-3 text-[30px] font-bold tracking-tight sm:text-[36px]">
                            {t('w.catsTitle')}
                        </h2>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            {categories.map(([label, c]) => (
                                <span
                                    key={label}
                                    className="rounded-full border px-5 py-2.5 text-[13px] font-semibold shadow-sm transition hover:-translate-y-0.5"
                                    style={{
                                        borderColor: `${c}99`,
                                        backgroundColor: `${c}1f`,
                                    }}
                                >
                                    {t(`cat.${label}`)}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Features */}
                    <section
                        id="features"
                        className="scroll-mt-24 border-y border-[rgb(var(--w-line))] bg-[rgb(var(--w-band))] py-20 sm:py-24"
                    >
                        <div className={wrap}>
                            <Eyebrow>{t('w.featKicker')}</Eyebrow>
                            <h2 className="mt-3 text-[32px] font-bold tracking-tight sm:text-[38px]">
                                {t('w.featTitle')}
                            </h2>
                            <p className="mt-4 text-[15px] leading-7 text-[rgb(var(--w-fg-2))] sm:text-[16px]">
                                {t('w.featSub')}
                            </p>
                            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {features.map(({ icon: Icon, key }) => (
                                    <div
                                        key={key}
                                        data-reveal
                                        className={`${card} p-6`}
                                    >
                                        <Icon size={18} color="#0197F6" />
                                        <h3 className="mt-4 text-[15px] font-semibold">
                                            {t(`${key}t`)}
                                        </h3>
                                        <p className="mt-2 text-[14.5px] leading-relaxed text-[rgb(var(--w-fg-2))]">
                                            {t(`${key}b`)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Announcements */}
                    <section
                        id="announcements"
                        className={`${wrap} scroll-mt-24 py-20 sm:py-24`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0197F6]/20 text-[#0197F6]">
                                <Megaphone size={18} />
                            </span>
                            <div>
                                <Eyebrow>{t('w.annKicker')}</Eyebrow>
                                <h2 className="text-[26px] font-semibold">
                                    {t('w.annTitle')}
                                </h2>
                            </div>
                        </div>
                        {announcements.length === 0 ? (
                            <p
                                className={`${card} mt-8 p-6 text-[14px] text-[rgb(var(--w-fg-2))]`}
                            >
                                {t('w.annEmpty')}
                            </p>
                        ) : (
                            <div className="mt-8 grid gap-5 md:grid-cols-2">
                                {announcements.map((n) => {
                                    const shown = localizeAnnouncement(
                                        n,
                                        locale,
                                    );

                                    return (
                                        <div
                                            key={n.id}
                                            data-reveal
                                            className={`${card} border-l-2 border-l-[#D7263D] p-6`}
                                        >
                                            <h3 className="text-[15px] font-semibold">
                                                {shown.title}
                                            </h3>
                                            <p className="mt-2 text-[14.5px] whitespace-pre-line text-[rgb(var(--w-fg-2))]">
                                                {shown.body}
                                            </p>
                                            {shown.lang !== locale && (
                                                <p className="mt-3 text-[12px] text-[rgb(var(--w-accent)/1)] italic">
                                                    {t('w.annFallback')}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Call to action band */}
                    <section className="bg-gradient-to-br from-[#02182B] via-[#063a5b] to-[#0197F6] py-20 text-center shadow-inner sm:py-24">
                        <div data-reveal className={wrap}>
                            <h2 className="text-[30px] font-semibold text-white">
                                {t('w.ctaTitle')}
                            </h2>
                            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/80 sm:text-[16px]">
                                {t('w.ctaBody')}
                            </p>
                            <Link
                                href={register()}
                                className="mt-8 inline-block rounded-xl bg-white px-6 py-3.5 text-[14px] font-bold text-[#02182B] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#e6f4f9]"
                            >
                                {t('w.ctaBtn')}
                            </Link>
                        </div>
                    </section>
                </main>

                <footer className="border-t border-[rgb(var(--w-line))] py-6">
                    <div
                        className={`${wrap} flex flex-wrap justify-between gap-2 text-[12px] text-[rgb(var(--w-fg-3))]`}
                    >
                        <span>{t('w.footer1')}</span>
                        <span>{t('w.footer2')}</span>
                        <span className="w-full pt-2 sm:w-auto sm:pt-0">
                            © {new Date().getFullYear()} San Sotero — Report
                            Concerns. All rights reserved.
                        </span>
                    </div>
                </footer>
            </div>
        </>
    );
}

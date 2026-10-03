import { Head, Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Bell, CheckCircle2, Clock, FileText, MapPin, Megaphone, Building2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import LanguageSwitcher from '@/components/language-switcher';
import ThemeToggle from '@/components/theme-toggle';
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
const statusColor: Record<Status, string> = { Pending: '#D7263D', 'In Progress': '#0197F6', Resolved: '#448FA3' };

type Notice = { id: number; title: string; body: string; translations: Partial<Record<Locale, { title?: string; body?: string }>> | null };

const recent: { ref: string; key: string; place: string; status: Status }[] = [
    { ref: '#0142', key: 'w.s1', place: 'Purok 3, Sitio Mabuhay', status: 'In Progress' },
    { ref: '#0141', key: 'w.s2', place: 'Purok 7', status: 'Pending' },
    { ref: '#0139', key: 'w.s3', place: 'Purok 2, Main St.', status: 'Resolved' },
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

const categories: [string, string][] = [['Infrastructure', '#0197F6'], ['Sanitation', '#448FA3'], ['Peace and Order', '#D7263D'], ['Others', '#68C5DB']];

const card = 'rounded-xl border border-[rgb(var(--w-accent)/0.15)] bg-[#0197F6]/[0.05]';
const wrap = 'mx-auto max-w-5xl px-6';
const primaryBtn = 'rounded-lg bg-[#D7263D] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#D7263D]/90';

/** Small uppercase label above each section heading. */
const Eyebrow = ({ children }: { children: string }) => (
    <p className="text-[12px] font-semibold tracking-wider text-[rgb(var(--w-accent)/1)] uppercase">{children}</p>
);

export default function Welcome({ announcements }: { announcements: Notice[] }) {
    const { auth, barangay } = usePage().props as unknown as { auth: { user?: unknown }; barangay: { name: string | null; caption: string | null; banner_url: string | null } };
    const { t, locale } = useLocale();
    const [photoFailed, setPhotoFailed] = useState(false);
    const place = barangay.name || BRAND.place;

    return (
        <>
            <Head title={t('w.footer1')} />
            <div className="w-theme min-h-screen scroll-smooth bg-[rgb(var(--w-bg))] text-[rgb(var(--w-fg))]">
                <PaletteStripe />

                {/* Header */}
                <header className="sticky top-0 z-10 border-b border-[rgb(var(--w-accent)/0.15)] bg-[rgb(var(--w-bg)/0.95)] backdrop-blur">
                    <div className={`${wrap} flex items-center justify-between py-3`}>
                        <Wordmark />
                        <nav className="hidden items-center gap-6 text-[13px] text-[rgb(var(--w-fg)/0.75)] md:flex">
                            <a href="#how-it-works" className="hover:text-white">{t('w.nav.how')}</a>
                            <a href="#features" className="hover:text-white">{t('w.nav.features')}</a>
                            <a href="#announcements" className="hover:text-white">{t('w.nav.ann')}</a>
                        </nav>
                        <div className="flex items-center gap-3 text-[13px] sm:gap-4">
                            <LanguageSwitcher tone="landing" />
                            <ThemeToggle tone="landing" />
                            {auth.user ? (
                                <Link href={dashboard()} className="hover:text-white">{t('w.dashboard')}</Link>
                            ) : (
                                <>
                                    <Link href={login()} className="text-[rgb(var(--w-fg)/0.75)] hover:text-white">{t('w.login')}</Link>
                                    {/* @chisel-registration */}
                                    <Link href={register()} className="rounded-lg bg-[#D7263D] px-4 py-2 font-medium text-white hover:bg-[#D7263D]/90">{t('w.register')}</Link>
                                    {/* @end-chisel-registration */}
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero: the barangay photo sits BEHIND the headline as a soft overlay (it fades into the page at the bottom).
                    The photo is the admin's upload from Settings → Barangay, or the bundled San Sotero photo. */}
                <div className="relative isolate overflow-hidden">
                    <div aria-hidden className="absolute inset-0 -z-10">
                        {barangay.banner_url && !photoFailed && (
                            <img src={barangay.banner_url} alt="" onError={() => setPhotoFailed(true)} className="size-full scale-105 object-cover object-[center_45%]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--w-bg)/0.97)] via-[rgb(var(--w-bg)/0.84)] to-[rgb(var(--w-bg)/0.6)]" />
                        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[rgb(var(--w-bg))] to-transparent" />
                    </div>
                    {barangay.banner_url && !photoFailed && (
                        <p className="absolute right-4 bottom-4 z-10 hidden items-center gap-1.5 rounded-full border border-[rgb(var(--w-accent)/0.3)] bg-[rgb(var(--w-bg)/0.7)] px-3 py-1 text-[12px] backdrop-blur sm:flex">
                            <MapPin size={13} className="text-[rgb(var(--w-accent))]" /> {place}
                        </p>
                    )}
                <section className={`${wrap} grid items-center gap-12 py-20 lg:grid-cols-2`}>
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#0197F6]/15 px-3 py-1 text-[12px] text-[rgb(var(--w-accent)/1)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0197F6]" /> {t('w.badge')}
                        </span>
                        <h1 className="mt-6 text-[44px] leading-[1.1] font-semibold lg:text-[54px]">
                            {t('w.h1a')} <span className="text-[#0197F6]">{t('w.h1b')}</span> {t('w.h1c')}
                        </h1>
                        <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[rgb(var(--w-fg)/0.7)]">
                            {t('w.lead')}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={register()} className={primaryBtn}>{t('w.cta')}</Link>
                            <a href="#how-it-works" className="rounded-lg border border-[rgb(var(--w-accent)/0.3)] px-5 py-2.5 text-[14px] hover:bg-[rgb(var(--w-accent)/0.1)]">{t('w.learn')}</a>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-6 text-[12px] text-[rgb(var(--w-fg)/0.6)]">
                            <span className="flex items-center gap-2"><CheckCircle2 size={14} color="#448FA3" /> {t('w.trust1')}</span>
                            <span className="flex items-center gap-2"><ShieldCheck size={14} color="#0197F6" /> {t('w.trust2')}</span>
                            <span className="flex items-center gap-2"><Clock size={14} color="#D7263D" /> {t('w.trust3')}</span>
                        </div>
                    </div>

                    {/* Recent complaints panel */}
                    <div className="rounded-2xl border border-[rgb(var(--w-accent)/0.2)] bg-[#0197F6]/[0.06] p-3">
                        <div className="rounded-xl bg-[rgb(var(--w-bg)/1)] p-6">
                            <div className="flex items-start justify-between border-b border-[rgb(var(--w-accent)/0.15)] pb-4">
                                <div>
                                    <p className="text-[11px] text-[rgb(var(--w-fg)/0.5)]">{t('w.panelKicker')}</p>
                                    <h2 className="text-[16px] font-semibold">{t('w.panelTitle')}</h2>
                                </div>
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0197F6]/20 text-[#0197F6]"><FileText size={16} /></span>
                            </div>
                            {recent.map((r) => (
                                <div key={r.ref} className="flex items-start justify-between border-b border-[rgb(var(--w-accent)/0.1)] py-4">
                                    <div>
                                        <p className="text-[14px] font-medium">{t(r.key)}</p>
                                        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[rgb(var(--w-fg)/0.55)]"><MapPin size={12} /> {r.place}</p>
                                        <p className="mt-0.5 text-[11px] text-[rgb(var(--w-fg)/0.4)]">{r.ref}</p>
                                    </div>
                                    <span className="flex items-center gap-1.5 text-[12px]" style={{ color: statusColor[r.status] }}>
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor[r.status] }} />
                                        {t(`status.${r.status}`)}
                                    </span>
                                </div>
                            ))}
                            <p className="mt-4 flex items-center gap-2 rounded-lg bg-[rgb(var(--w-accent)/0.1)] px-3 py-2.5 text-[12px] text-[rgb(var(--w-fg)/0.6)]">
                                <Bell size={13} /> {t('w.panelNote')}
                            </p>
                        </div>
                    </div>
                </section>
                </div>

                {/* How it works */}
                <section id="how-it-works" className="scroll-mt-16 bg-[#0197F6]/[0.04] py-20">
                    <div className={`${wrap} text-center`}>
                        <Eyebrow>{t('w.process')}</Eyebrow>
                        <h2 className="mt-2 text-[30px] font-semibold">{t('w.howTitle')}</h2>
                        <p className="mt-3 text-[15px] text-[rgb(var(--w-fg)/0.6)]">{t('w.howSub')}</p>
                        <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
                            {steps.map(({ icon: Icon, color, key }) => (
                                <div key={key} className={`${card} p-6`}>
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}33`, color }}><Icon size={18} /></span>
                                    <h3 className="mt-5 text-[15px] font-semibold">{t(`${key}t`)}</h3>
                                    <p className="mt-2 text-[13.5px] leading-relaxed text-[rgb(var(--w-fg)/0.6)]">{t(`${key}b`)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Categories */}
                <section className={`${wrap} py-16 text-center`}>
                    <Eyebrow>{t('w.catsKicker')}</Eyebrow>
                    <h2 className="mt-2 text-[26px] font-semibold">{t('w.catsTitle')}</h2>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {categories.map(([label, c]) => (
                            <span key={label} className="rounded-full border px-5 py-2 text-[13px]" style={{ borderColor: `${c}99`, backgroundColor: `${c}1f` }}>{t(`cat.${label}`)}</span>
                        ))}
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="scroll-mt-16 bg-[#0197F6]/[0.04] py-20">
                    <div className={wrap}>
                        <Eyebrow>{t('w.featKicker')}</Eyebrow>
                        <h2 className="mt-2 text-[30px] font-semibold">{t('w.featTitle')}</h2>
                        <p className="mt-3 text-[15px] text-[rgb(var(--w-fg)/0.6)]">{t('w.featSub')}</p>
                        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {features.map(({ icon: Icon, key }) => (
                                <div key={key} className={`${card} p-6`}>
                                    <Icon size={18} color="#0197F6" />
                                    <h3 className="mt-4 text-[15px] font-semibold">{t(`${key}t`)}</h3>
                                    <p className="mt-2 text-[13.5px] leading-relaxed text-[rgb(var(--w-fg)/0.6)]">{t(`${key}b`)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Announcements */}
                <section id="announcements" className={`${wrap} scroll-mt-16 py-20`}>
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0197F6]/20 text-[#0197F6]"><Megaphone size={18} /></span>
                        <div><Eyebrow>{t('w.annKicker')}</Eyebrow><h2 className="text-[26px] font-semibold">{t('w.annTitle')}</h2></div>
                    </div>
                    {announcements.length === 0 ? (
                        <p className={`${card} mt-8 p-6 text-[14px] text-[rgb(var(--w-fg)/0.6)]`}>{t('w.annEmpty')}</p>
                    ) : (
                        <div className="mt-8 grid gap-5 md:grid-cols-2">
                            {announcements.map((n) => {
                                const shown = localizeAnnouncement(n, locale);

                                return (
                                    <div key={n.id} className={`${card} border-l-2 border-l-[#D7263D] p-6`}>
                                        <h3 className="text-[15px] font-semibold">{shown.title}</h3>
                                        <p className="mt-2 text-[13.5px] whitespace-pre-line text-[rgb(var(--w-fg)/0.6)]">{shown.body}</p>
                                        {shown.lang !== locale && <p className="mt-3 text-[11px] text-[rgb(var(--w-accent)/1)] italic">{t('w.annFallback')}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Call to action band */}
                <section className="bg-[#0197F6] py-16 text-center">
                    <div className={wrap}>
                        <h2 className="text-[30px] font-semibold text-white">{t('w.ctaTitle')}</h2>
                        <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#02182B]">
                            {t('w.ctaBody')}
                        </p>
                        <Link href={register()} className="mt-7 inline-block rounded-lg bg-white px-6 py-3 text-[14px] font-semibold text-[#02182B] hover:bg-[#68C5DB]">
                            {t('w.ctaBtn')}
                        </Link>
                    </div>
                </section>

                <footer className="border-t border-[rgb(var(--w-accent)/0.15)] py-6">
                    <div className={`${wrap} flex flex-wrap justify-between gap-2 text-[12px] text-[rgb(var(--w-fg)/0.55)]`}>
                        <span>{t('w.footer1')}</span>
                        <span>{t('w.footer2')}</span>
                    </div>
                </footer>
            </div>
        </>
    );
}

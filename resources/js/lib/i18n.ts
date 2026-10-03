import * as common from '@/lang/common';
import * as composer from '@/lang/composer';
import * as post from '@/lang/post';
import * as shell from '@/lang/shell';
import * as welcome from '@/lang/welcome';

/** Supported languages. The same list is validated on the server (PreferenceController::LOCALES). */
export const LOCALES = ['en', 'tl', 'ceb', 'war'] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language is written in its OWN name, so a person can find it even if the page is in a language they can't read. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', tl: 'Tagalog', ceb: 'Bisaya', war: 'Waray' };

/** Used for dates. Cebuano and Waray have no reliable browser locale data, so they share the Filipino one. */
export const DATE_LOCALE: Record<Locale, string> = { en: 'en-PH', tl: 'fil-PH', ceb: 'fil-PH', war: 'fil-PH' };

const dictionaries: Record<Locale, Record<string, string>> = {
    en: { ...common.en, ...welcome.en, ...shell.en, ...composer.en, ...post.en },
    tl: { ...common.tl, ...welcome.tl, ...shell.tl, ...composer.tl, ...post.tl },
    ceb: { ...common.ceb, ...welcome.ceb, ...shell.ceb, ...composer.ceb, ...post.ceb },
    war: { ...common.war, ...welcome.war, ...shell.war, ...composer.war, ...post.war },
};

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

/**
 * Look up a phrase and fill {placeholders}. Falls back to English, then to the key itself,
 * so a missing translation shows readable text instead of crashing.
 * SECURITY: the result is only ever rendered as a React text node (auto-escaped); `vars` are plain strings/numbers.
 */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
    const text = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;

    return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? '')) : text;
}

/** "5 min ago" in the reader's language. `ts` is a unix timestamp in seconds (from the server). */
export function timeAgo(ts: number, locale: Locale): string {
    const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));

    if (s < 60) return translate(locale, 'time.now');
    if (s < 3600) return translate(locale, 'time.min', { n: Math.floor(s / 60) });
    if (s < 86400) return translate(locale, 'time.hour', { n: Math.floor(s / 3600) });
    if (s < 7 * 86400) return translate(locale, 'time.day', { n: Math.floor(s / 86400) });

    return new Date(ts * 1000).toLocaleDateString(DATE_LOCALE[locale], { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Pick an announcement's title/body in the reader's language, mirroring Announcement::localized() on the server.
 * Order: reader's language -> English -> Tagalog -> Bisaya -> the base columns. `lang` says which one was used.
 */
export function localizeAnnouncement(
    a: { title: string; body: string; translations?: Partial<Record<Locale, { title?: string; body?: string }>> | null },
    locale: Locale,
): { title: string; body: string; lang: Locale } {
    const all = a.translations ?? { en: { title: a.title, body: a.body } };

    for (const lang of [locale, ...LOCALES]) {
        const hit = all[lang];
        if (hit?.title && hit?.body) return { title: hit.title, body: hit.body, lang };
    }

    return { title: a.title, body: a.body, lang: 'en' };
}

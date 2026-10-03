import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { isLocale, translate } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/**
 * The reader's language.
 *  - Remembered in this browser (localStorage) so guests keep it on the Welcome page.
 *  - If the person is logged in it is ALSO saved on their account (PATCH /preferences), so it follows them to other devices.
 *  - Priority: this browser's choice -> the account's saved language -> English.
 * Same pattern as use-appearance.tsx: a tiny external store so every component re-renders at once.
 */
const KEY = 'locale';
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => (
    listeners.add(cb),
    () => void listeners.delete(cb)
);

const readStored = (): Locale | null => {
    try {
        const v = localStorage.getItem(KEY);

        return isLocale(v) ? v : null;
    } catch {
        return null; // private mode / storage blocked: just don't remember
    }
};

export function useLocale() {
    const stored = useSyncExternalStore(subscribe, readStored, () => null);
    const user = (
        usePage().props.auth as { user?: { locale?: string | null } | null }
    ).user;
    const locale: Locale =
        stored ?? (isLocale(user?.locale) ? user.locale : 'en');

    useEffect(() => {
        document.documentElement.lang = locale; // screen readers pick the right voice (en, tl, ceb, war are all valid codes)
    }, [locale]);

    const setLocale = (next: Locale) => {
        try {
            localStorage.setItem(KEY, next);
        } catch {
            /* ignore */
        }

        listeners.forEach((l) => l());

        if (user) {
            // Validated against a fixed list on the server; CSRF token is added by Inertia automatically.
            router.patch(
                '/preferences',
                { locale: next },
                { preserveScroll: true, preserveState: true, only: ['auth'] },
            );
        }
    };

    const t = useCallback(
        (key: string, vars?: Record<string, string | number>) =>
            translate(locale, key, vars),
        [locale],
    );

    return { locale, setLocale, t };
}

import { useSyncExternalStore } from 'react';

/**
 * Appearance preferences beyond Light / Dark (accent colour, density, text size, corners, contrast, motion).
 * They are saved in THIS browser (localStorage) and written to <html> as data-* attributes, which the CSS in
 * resources/css/app.css ("Theme customisation") reads. The same attributes are applied by the inline script in
 * resources/views/app.blade.php before the first paint, so there is no flash of the default theme.
 * Light / Dark / System is unchanged and stays in hooks/use-appearance.tsx.
 *
 * SECURITY: display only. Every value is checked against a fixed list before it is used, so a tampered
 * localStorage entry can never inject anything into the page.
 */
export const ACCENTS = ['blue', 'gold', 'teal', 'crimson', 'slate'] as const;
export const DENSITIES = ['comfortable', 'compact'] as const;
export const CORNERS = ['rounded', 'soft', 'sharp'] as const;
export const TEXT_SIZES = ['sm', 'md', 'lg'] as const;

export type Accent = (typeof ACCENTS)[number];
export type Density = (typeof DENSITIES)[number];
export type Corners = (typeof CORNERS)[number];
export type TextSize = (typeof TEXT_SIZES)[number];
export type ThemePrefs = {
    accent: Accent;
    density: Density;
    corners: Corners;
    text: TextSize;
    contrast: boolean;
    reduceMotion: boolean;
};

export const DEFAULT_PREFS: ThemePrefs = {
    accent: 'blue',
    density: 'comfortable',
    corners: 'rounded',
    text: 'md',
    contrast: false,
    reduceMotion: false,
};

const KEY = 'themePrefs';
const pick = <T extends string>(list: readonly T[], v: unknown, d: T): T =>
    list.includes(v as T) ? (v as T) : d;

export function sanitize(raw: unknown): ThemePrefs {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<
        string,
        unknown
    >;

    return {
        accent: pick(ACCENTS, o.accent, DEFAULT_PREFS.accent),
        density: pick(DENSITIES, o.density, DEFAULT_PREFS.density),
        corners: pick(CORNERS, o.corners, DEFAULT_PREFS.corners),
        text: pick(TEXT_SIZES, o.text, DEFAULT_PREFS.text),
        contrast: o.contrast === true,
        reduceMotion: o.reduceMotion === true,
    };
}

export function loadPrefs(): ThemePrefs {
    try {
        return sanitize(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
    } catch {
        return DEFAULT_PREFS; // private mode / blocked storage: just use the defaults
    }
}

export function applyPrefs(p: ThemePrefs): void {
    if (typeof document === 'undefined') {
        return;
    }

    const el = document.documentElement;
    const set = (name: string, value: string | null) =>
        value === null
            ? el.removeAttribute(name)
            : el.setAttribute(name, value);

    set('data-accent', p.accent === 'blue' ? null : p.accent);
    set('data-density', p.density === 'compact' ? 'compact' : null);
    set('data-corners', p.corners === 'rounded' ? null : p.corners);
    set('data-text', p.text === 'md' ? null : p.text);
    set('data-contrast', p.contrast ? 'high' : null);
    set('data-motion', p.reduceMotion ? 'reduce' : null);
}

const listeners = new Set<() => void>();
let current: ThemePrefs = DEFAULT_PREFS;
let loaded = false;

const ensure = () => {
    if (!loaded && typeof window !== 'undefined') {
        current = loadPrefs();
        loaded = true;
    }

    return current;
};

export function savePrefs(next: ThemePrefs): void {
    current = sanitize(next);
    loaded = true;

    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
        /* ignore: the choice still applies for this visit */
    }

    applyPrefs(current);
    listeners.forEach((l) => l());
}

export function initializeThemePrefs(): void {
    applyPrefs(ensure());
}

export function useThemePrefs(): ThemePrefs {
    return useSyncExternalStore(
        (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
        ensure,
        () => DEFAULT_PREFS,
    );
}

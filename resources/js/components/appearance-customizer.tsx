import { Check, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import {
    applyPrefs,
    DEFAULT_PREFS,
    savePrefs,
    useThemePrefs,
} from '@/lib/theme-prefs';
import type {
    Accent,
    Corners,
    Density,
    TextSize,
    ThemePrefs,
} from '@/lib/theme-prefs';
import { cn } from '@/lib/utils';

const ACCENT_CARDS: {
    value: Accent;
    name: string;
    note: string;
    gradient: string;
}[] = [
    {
        value: 'blue',
        name: 'Barangay Blue',
        note: 'Default',
        gradient: 'linear-gradient(135deg, #0197F6, #02182B)',
    },
    {
        value: 'gold',
        name: 'Navy & Gold',
        note: 'Formal',
        gradient: 'linear-gradient(135deg, #d9a514, #1b2a41)',
    },
    {
        value: 'teal',
        name: 'Ocean Teal',
        note: 'Calm',
        gradient: 'linear-gradient(135deg, #14b8a6, #02182B)',
    },
    {
        value: 'crimson',
        name: 'Crimson',
        note: 'Bold',
        gradient: 'linear-gradient(135deg, #e23049, #3a0d17)',
    },
    {
        value: 'slate',
        name: 'Slate',
        note: 'Neutral',
        gradient: 'linear-gradient(135deg, #94a3b8, #1e293b)',
    },
];

const seg =
    'inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1';

const segBtn = (selected: boolean) =>
    cn(
        'flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected
            ? 'bg-brand text-white shadow-sm'
            : 'text-muted-foreground hover:bg-background hover:text-foreground',
    );

function Group({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold">{title}</legend>
            {children}
        </fieldset>
    );
}

export default function AppearanceCustomizer() {
    const saved = useThemePrefs();
    const { appearance, updateAppearance } = useAppearance();

    const [draft, setDraft] = useState<ThemePrefs>(saved);
    const [justSaved, setJustSaved] = useState(false);

    const savedPrefsRef = useRef(saved);

    useEffect(() => {
        savedPrefsRef.current = saved;
    }, [saved]);

    useEffect(() => {
        applyPrefs(draft);
    }, [draft]);

    useEffect(
        () => () => {
            applyPrefs(savedPrefsRef.current);
        },
        [],
    );

    const set = <K extends keyof ThemePrefs>(key: K, value: ThemePrefs[K]) => {
        setJustSaved(false);
        setDraft((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

    const modes: {
        value: Appearance;
        icon: LucideIcon;
        label: string;
    }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <div className="space-y-7">
            <Group title="Mode">
                <div className={seg} aria-label="Mode">
                    {modes.map(({ value, icon: Icon, label }) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={appearance === value}
                            onClick={() => updateAppearance(value)}
                            className={segBtn(appearance === value)}
                        >
                            <Icon size={15} aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            </Group>

            <Group title="Accent theme">
                <div
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                    aria-label="Accent theme"
                >
                    {ACCENT_CARDS.map((accent) => {
                        const selected = draft.accent === accent.value;

                        return (
                            <button
                                key={accent.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => set('accent', accent.value)}
                                className={cn(
                                    'group rounded-2xl border bg-card p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                    selected
                                        ? 'border-brand ring-brand/30 ring-2'
                                        : 'hover:border-brand/50 border-border',
                                )}
                            >
                                <span
                                    className="relative block h-12 rounded-xl"
                                    style={{
                                        background: accent.gradient,
                                    }}
                                    aria-hidden="true"
                                >
                                    {selected && (
                                        <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-white text-[#02182B] shadow">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                </span>

                                <span className="mt-2 block text-sm font-semibold">
                                    {accent.name}
                                </span>

                                <span className="block text-xs text-muted-foreground">
                                    {accent.note}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Group>

            <div className="grid gap-7 sm:grid-cols-2">
                <Group title="Density">
                    <div className={seg} aria-label="Density">
                        {(['comfortable', 'compact'] as Density[]).map(
                            (density) => {
                                const selected = draft.density === density;

                                return (
                                    <button
                                        key={density}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => set('density', density)}
                                        className={segBtn(selected)}
                                    >
                                        {density === 'comfortable'
                                            ? 'Comfortable'
                                            : 'Compact'}
                                    </button>
                                );
                            },
                        )}
                    </div>
                </Group>

                <Group title="Text size">
                    <div className={seg} aria-label="Text size">
                        {(
                            [
                                ['sm', 'A−', 'Smaller text'],
                                ['md', 'A', 'Normal text'],
                                ['lg', 'A+', 'Larger text'],
                            ] as [TextSize, string, string][]
                        ).map(([value, label, ariaLabel]) => {
                            const selected = draft.text === value;

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    aria-label={ariaLabel}
                                    aria-pressed={selected}
                                    onClick={() => set('text', value)}
                                    className={segBtn(selected)}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </Group>
            </div>

            <Group title="Corners">
                <div className={seg} aria-label="Corners">
                    {(['rounded', 'soft', 'sharp'] as Corners[]).map(
                        (corner) => {
                            const selected = draft.corners === corner;

                            return (
                                <button
                                    key={corner}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => set('corners', corner)}
                                    className={segBtn(selected)}
                                >
                                    {corner[0].toUpperCase() + corner.slice(1)}
                                </button>
                            );
                        },
                    )}
                </div>
            </Group>

            <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                        <p className="text-sm font-medium">Reduce motion</p>
                        <p className="text-xs text-muted-foreground">
                            Turn off animations and transitions.
                        </p>
                    </div>

                    <Switch
                        label="Reduce motion"
                        checked={draft.reduceMotion}
                        onChange={(value) => set('reduceMotion', value)}
                    />
                </div>

                <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                        <p className="text-sm font-medium">High contrast</p>
                        <p className="text-xs text-muted-foreground">
                            Stronger borders and text for easier reading.
                        </p>
                    </div>

                    <Switch
                        label="High contrast"
                        checked={draft.contrast}
                        onChange={(value) => set('contrast', value)}
                    />
                </div>
            </div>

            <Group title="Preview">
                <div className="ss-card rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">Pending complaints</p>

                        <span className="bg-brand/15 text-brand-ink dark:text-brand-soft rounded-full px-2.5 py-0.5 text-xs font-medium">
                            In progress
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                        This is how buttons, badges and cards will look.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="bg-brand inline-flex min-h-9 items-center rounded-lg px-4 text-sm font-medium text-white shadow-sm">
                            Primary button
                        </span>

                        <span className="inline-flex min-h-9 items-center rounded-lg border border-border px-4 text-sm font-medium">
                            Secondary
                        </span>
                    </div>
                </div>
            </Group>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    disabled={!dirty}
                    onClick={() => {
                        savePrefs(draft);
                        setJustSaved(true);
                    }}
                    className="bg-brand hover:bg-brand-strong inline-flex min-h-10 items-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Save appearance
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setJustSaved(false);
                        setDraft(DEFAULT_PREFS);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <RotateCcw size={14} aria-hidden="true" />
                    Reset to default
                </button>

                <span
                    role="status"
                    className="text-brand-ink dark:text-brand-soft text-sm"
                >
                    {justSaved ? 'Saved on this device.' : ''}
                </span>
            </div>
        </div>
    );
}

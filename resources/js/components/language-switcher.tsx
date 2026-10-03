import { Globe } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { isLocale, LOCALE_NAMES, LOCALES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * English / Tagalog / Bisaya picker. A native <select> on purpose: it is keyboard- and screen-reader-friendly
 * and opens the OS picker on phones. `tone="landing"` is for the Welcome page, which has its own theme-aware palette (--w-* variables).
 */
export default function LanguageSwitcher({ tone = 'app', className }: { tone?: 'app' | 'landing'; className?: string }) {
    const { locale, setLocale, t } = useLocale();

    return (
        <label className={cn('relative inline-flex items-center', className)}>
            <span className="sr-only">{t('lang.label')}</span>
            <Globe size={15} aria-hidden className={cn('pointer-events-none absolute left-2.5', tone === 'landing' ? 'text-[rgb(var(--w-accent))]' : 'text-muted-foreground')} />
            <select
                value={locale}
                onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
                className={cn(
                    'cursor-pointer appearance-none rounded-lg border py-1.5 pr-3 pl-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]',
                    tone === 'landing' ? 'border-[rgb(var(--w-accent)/0.3)] bg-[rgb(var(--w-bg))] text-[rgb(var(--w-fg))] hover:bg-[rgb(var(--w-accent)/0.1)]' : 'border-input bg-background text-foreground hover:bg-muted',
                )}
            >
                {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
            </select>
        </label>
    );
}

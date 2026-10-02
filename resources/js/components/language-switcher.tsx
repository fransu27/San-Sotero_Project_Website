import { Globe } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { isLocale, LOCALE_NAMES, LOCALES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * English / Tagalog / Bisaya picker. A native <select> on purpose: it is keyboard- and screen-reader-friendly
 * and opens the OS picker on phones. `tone="dark"` is for the Welcome page, which has its own fixed navy palette.
 */
export default function LanguageSwitcher({
    tone = 'app',
    className,
}: {
    tone?: 'app' | 'dark';
    className?: string;
}) {
    const { locale, setLocale, t } = useLocale();

    return (
        <label className={cn('relative inline-flex items-center', className)}>
            <span className="sr-only">{t('lang.label')}</span>
            <Globe
                size={15}
                aria-hidden
                className={cn(
                    'pointer-events-none absolute left-2.5',
                    tone === 'dark'
                        ? 'text-[#68C5DB]'
                        : 'text-muted-foreground',
                )}
            />
            <select
                value={locale}
                onChange={(e) =>
                    isLocale(e.target.value) && setLocale(e.target.value)
                }
                className={cn(
                    'cursor-pointer appearance-none rounded-lg border py-1.5 pr-3 pl-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]',
                    tone === 'dark'
                        ? 'border-[#68C5DB]/30 bg-[#02182B] text-[#F1F8FB] hover:bg-[#68C5DB]/10'
                        : 'border-input bg-background text-foreground hover:bg-muted',
                )}
            >
                {LOCALES.map((l) => (
                    <option key={l} value={l}>
                        {LOCALE_NAMES[l]}
                    </option>
                ))}
            </select>
        </label>
    );
}

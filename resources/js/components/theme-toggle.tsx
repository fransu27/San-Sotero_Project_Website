import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

/**
 * One-tap Dark / Light switch for the top bar. It uses the app's existing appearance store, which already
 * REMEMBERS the choice (localStorage + an `appearance` cookie that the server reads so the first paint has no flash).
 * "System" is still available on Settings → Appearance; tapping this button simply picks the opposite of what you see now.
 */
export default function ThemeToggle({
    tone = 'app',
}: {
    tone?: 'app' | 'landing';
}) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const { t } = useLocale();
    const dark = resolvedAppearance === 'dark';
    const label = t(dark ? 'theme.toLight' : 'theme.toDark');

    return (
        <button
            type="button"
            onClick={() => updateAppearance(dark ? 'light' : 'dark')}
            aria-label={label}
            title={label}
            className={cn(
                'rounded-full p-2 outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]',
                tone === 'landing'
                    ? 'text-[rgb(var(--w-fg)/0.75)] hover:bg-[rgb(var(--w-accent)/0.15)] hover:text-[rgb(var(--w-fg))]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}

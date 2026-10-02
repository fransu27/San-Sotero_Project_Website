import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { useLocale } from '@/hooks/use-locale';

/**
 * One-tap Dark / Light switch for the top bar. It uses the app's existing appearance store, which already
 * REMEMBERS the choice (localStorage + an `appearance` cookie that the server reads so the first paint has no flash).
 * "System" is still available on Settings → Appearance; tapping this button simply picks the opposite of what you see now.
 */
export default function ThemeToggle() {
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
            className="rounded-full p-2 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#0197F6]"
        >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}

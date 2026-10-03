import { cn } from '@/lib/utils';

/**
 * Accessible on/off switch (role="switch"). A real <button>, so it works with keyboard (Space / Enter) and screen readers.
 * Controlled: the parent owns `checked`. `label` is read aloud by assistive tech.
 */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
            className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0197F6] focus-visible:ring-offset-2 disabled:opacity-50',
                checked ? 'bg-[#0197F6]' : 'bg-muted-foreground/30')}>
            <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
        </button>
    );
}

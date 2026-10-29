import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            position="bottom-right"
            expand={false}
            closeButton
            toastOptions={{
                classNames: {
                    toast: 'rounded-2xl border shadow-xl backdrop-blur-xl',
                    title: 'text-sm font-semibold tracking-tight',
                    description: 'text-xs leading-relaxed text-muted-foreground',
                    actionButton: 'rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground',
                    cancelButton: 'rounded-lg border border-border px-3 py-1.5 text-xs font-medium',
                    success: 'border-emerald-500/25',
                    error: 'border-destructive/30',
                    warning: 'border-amber-500/30',
                    info: 'border-primary/25',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };

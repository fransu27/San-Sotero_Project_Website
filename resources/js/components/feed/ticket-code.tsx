import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

/**
 * A ticket code with a Copy button. Used on the "Report submitted" card and on every My Submissions row.
 * The code is plain text from the server and is rendered by React (auto-escaped). Copying uses the browser clipboard
 * only; if the browser blocks it, the code is still on screen to select by hand.
 */
export default function TicketCode({
    code,
    large = false,
}: {
    code: string | null;
    large?: boolean;
}) {
    const { t } = useLocale();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const id = window.setTimeout(() => setCopied(false), 1800);

        return () => window.clearTimeout(id);
    }, [copied]);

    if (!code) {
        return (
            <span className="text-xs text-muted-foreground">
                {t('sub.noTicket')}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5">
            <span
                aria-label={`${t('sub.ticket')} ${code}`}
                className={cn(
                    'rounded-md bg-muted px-2 py-1 font-mono font-semibold tracking-wide text-foreground',
                    large ? 'px-3 py-1.5 text-base' : 'text-xs',
                )}
            >
                {code}
            </span>
            <button
                type="button"
                onClick={() => {
                    void navigator.clipboard
                        ?.writeText(code)
                        .then(() => setCopied(true))
                        .catch(() => undefined);
                }}
                aria-label={t('sub.copy')}
                title={t('sub.copy')}
                className="inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#0197F6]"
            >
                {copied ? (
                    <Check size={14} className="text-[#448FA3]" />
                ) : (
                    <Copy size={14} />
                )}
                <span
                    aria-live="polite"
                    className={copied ? 'text-xs' : 'sr-only'}
                >
                    {copied ? t('sub.copied') : ''}
                </span>
            </button>
        </span>
    );
}

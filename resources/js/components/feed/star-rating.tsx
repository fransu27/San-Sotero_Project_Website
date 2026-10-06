import { router } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

/**
 * Community satisfaction: 1-5 stars, shown on posts the barangay has closed (Resolved or Rejected).
 * Everyone who can see the post gives one rating; click another star to change it, click your star again to clear it.
 * The server decides who may rate (ComplaintPolicy::interact + status check), this is only the control.
 */
export function StarRating({
    id,
    avg,
    count,
    mine,
    closedAs,
}: {
    id: number;
    avg: number | null;
    count: number;
    mine: number | null;
    closedAs: 'Resolved' | 'Rejected';
}) {
    const { t } = useLocale();
    const [hover, setHover] = useState(0);
    const shown = hover || mine || 0;

    const rate = (n: number) =>
        router.post(
            `/complaints/${id}/rate`,
            { rating: n },
            { preserveScroll: true },
        );

    return (
        <div className="border-t border-border bg-muted/40 px-5 py-3">
            <p className="text-sm font-medium">
                {closedAs === 'Resolved'
                    ? t('rate.askResolved')
                    : t('rate.askRejected')}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div
                    className="flex items-center"
                    role="radiogroup"
                    aria-label={t('rate.group')}
                    onMouseLeave={() => setHover(0)}
                >
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={mine === n}
                            aria-label={`${t('rate.star', { n })}: ${t(`rate.${n}`)}`}
                            onMouseEnter={() => setHover(n)}
                            onFocus={() => setHover(n)}
                            onBlur={() => setHover(0)}
                            onClick={() => rate(n)}
                            className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]"
                        >
                            <Star
                                size={24}
                                className={cn(
                                    'transition-colors',
                                    n <= shown
                                        ? 'fill-[#E0A100] text-[#E0A100]'
                                        : 'text-muted-foreground/50',
                                )}
                            />
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    {shown > 0 && (
                        <span className="mr-2 font-medium text-foreground">
                            {t(`rate.${shown}`)}
                        </span>
                    )}
                    {count > 0 && avg !== null ? (
                        <>
                            <span className="font-semibold text-foreground tabular-nums">
                                {avg.toFixed(1)}
                            </span>{' '}
                            / 5 ·{' '}
                            {count === 1
                                ? t('rate.one')
                                : t('rate.many', { n: count })}
                        </>
                    ) : (
                        t('rate.none')
                    )}
                </p>
            </div>
        </div>
    );
}

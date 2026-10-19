import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "Search reports" box. It only appears on the Newsfeed (left rail on desktop, top of the page on phones).
 *
 * It is a plain GET form to /newsfeed?q=…; the SERVER validates the text and only searches posts the person may
 * already see, so nothing is filtered by trusting React. The other active filters ride along as hidden fields,
 * so searching keeps the chosen statuses, categories and sort.
 */
export default function FeedSearch({
    q,
    placeholder,
    hidden,
    className,
}: {
    q: string;
    placeholder: string;
    hidden: { name: string; value: string }[];
    className?: string;
}) {
    return (
        <form
            action="/newsfeed"
            method="get"
            role="search"
            className={cn('relative min-w-0', className)}
        >
            <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            />
            {hidden.map((h) => (
                <input
                    key={h.name}
                    type="hidden"
                    name={h.name}
                    value={h.value}
                />
            ))}
            <input
                name="q"
                defaultValue={q}
                maxLength={100}
                placeholder={placeholder}
                aria-label={placeholder}
                className="w-full rounded-full border border-border bg-[#F0F2F5] py-2.5 pr-4 pl-10 text-sm transition-shadow outline-none focus:ring-2 focus:ring-[#0197F6]/40 dark:bg-muted"
            />
        </form>
    );
}

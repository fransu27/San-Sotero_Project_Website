import { router } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import PostCard from '@/components/feed/post-card';
import type { Complaint, Status } from '@/components/feed/post-card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';

/**
 * Pop-out window for one report, opened from the assistant chat's "Open report" button.
 * It shows the same post card as the Newsfeed, so the person can like / dislike and comment right here.
 *
 * The post is fetched from /assistant/reports/{id}; the server runs the `view` policy and applies the usual
 * privacy rules (anonymous author, no ticket code), so this only draws what it is sent. It reloads itself after
 * every action the person takes (and every 10 s), so a new like or comment shows up without closing the window.
 */
type Payload = {
    complaint: Complaint;
    isAdmin: boolean;
    categories: string[];
    statuses: Status[];
};

export default function ReportPopout({
    id,
    onClose,
}: {
    id: number | null;
    onClose: () => void;
}) {
    const [data, setData] = useState<Payload | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (id === null) {
            return;
        }

        try {
            const response = await fetch(`/assistant/reports/${id}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(String(response.status));
            }

            setData((await response.json()) as Payload);
            setError(null);
        } catch {
            setError('This report is not available to you any more.');
        }
    }, [id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- start from a clean slate for each opened report
        setData(null);
        setError(null);

        if (id === null) {
            return;
        }

        void load();
        const timer = window.setInterval(() => void load(), 10000);
        // Like / comment / edit go through Inertia; when one finishes, fetch the fresh post.
        const stop = router.on('finish', () => void load());

        return () => {
            window.clearInterval(timer);
            stop();
        };
    }, [id, load]);

    return (
        <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                aria-describedby="report-popout-desc"
                className="max-h-[92vh] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-2xl border-0 bg-transparent p-0 shadow-none sm:max-w-2xl [&>button]:top-3 [&>button]:right-3 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-card [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow"
            >
                <DialogTitle className="sr-only">
                    {data?.complaint.title ?? 'Report'}
                </DialogTitle>
                <DialogDescription id="report-popout-desc" className="sr-only">
                    Report details, reactions and comments
                </DialogDescription>

                {data ? (
                    <PostCard
                        c={data.complaint}
                        isAdmin={data.isAdmin}
                        statuses={data.statuses}
                        categories={data.categories}
                        allowStatusEdit={false}
                    />
                ) : (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
                        {error ?? (
                            <>
                                <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                />
                                Loading report…
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

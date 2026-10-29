import { Head, router } from '@inertiajs/react';
import { Bell, CheckCheck, Circle, Inbox } from 'lucide-react';

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    created_at: string | null;
    read_at: string | null;
};
type Paginator = {
    data: NotificationItem[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

function formatDate(value: string | null): string {
    if (!value) {
        return 'Date unavailable';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : date.toLocaleString();
}

export default function NotificationsPage({
    notifications,
    unreadCount,
}: {
    notifications: Paginator;
    unreadCount: number;
}) {
    const markAllRead = () =>
        router.patch('/notifications/read-all', {}, { preserveScroll: true });
    const markRead = (id: string) =>
        router.patch(
            `/notifications/${encodeURIComponent(id)}/read`,
            {},
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Notifications" />
            <div className="mx-auto w-full max-w-[900px] space-y-4 pb-8">
                <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                            <Bell size={21} />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Notifications
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Updates about your reports and account.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCheck size={16} /> Mark all as read
                    </button>
                </header>

                <section
                    aria-label="Your notifications"
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                    {notifications.data.length === 0 ? (
                        <div className="flex flex-col items-center px-5 py-14 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Inbox size={23} />
                            </span>
                            <h2 className="mt-3 font-semibold">
                                You're all caught up
                            </h2>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                New account and moderation updates will appear
                                here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.data.map((item) => (
                                <article
                                    key={item.id}
                                    className={`flex items-start gap-3 px-4 py-4 sm:px-5 ${item.read_at ? 'bg-card' : 'bg-sky-50/70 dark:bg-sky-950/20'}`}
                                >
                                    <span
                                        className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-full ${item.read_at ? 'bg-muted text-muted-foreground' : 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200'}`}
                                    >
                                        <Bell size={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold">
                                                {item.title}
                                            </h2>
                                            {!item.read_at && (
                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-900 dark:text-sky-200">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                                            {item.message}
                                        </p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {formatDate(item.created_at)}
                                        </p>
                                    </div>
                                    {!item.read_at && (
                                        <button
                                            type="button"
                                            onClick={() => markRead(item.id)}
                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                                            aria-label={`Mark ${item.title} as read`}
                                        >
                                            <Circle size={11} /> Read
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                    {(notifications.prev_page_url ||
                        notifications.next_page_url) && (
                        <nav
                            aria-label="Notification pages"
                            className="flex items-center justify-between border-t border-border px-4 py-3 text-sm"
                        >
                            <button
                                type="button"
                                disabled={!notifications.prev_page_url}
                                onClick={() =>
                                    notifications.prev_page_url &&
                                    router.visit(notifications.prev_page_url)
                                }
                                className="rounded-lg border border-border px-3 py-2 disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="text-muted-foreground">
                                Page {notifications.current_page} of{' '}
                                {notifications.last_page}
                            </span>
                            <button
                                type="button"
                                disabled={!notifications.next_page_url}
                                onClick={() =>
                                    notifications.next_page_url &&
                                    router.visit(notifications.next_page_url)
                                }
                                className="rounded-lg border border-border px-3 py-2 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </nav>
                    )}
                </section>
            </div>
        </>
    );
}

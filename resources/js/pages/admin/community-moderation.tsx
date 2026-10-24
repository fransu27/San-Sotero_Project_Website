
import { Head, Link, router } from '@inertiajs/react';
import { Activity, Ban, Flag, ShieldAlert, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar_path: string | null;
    restricted_at: string | null;
    banned_at: string | null;
    last_seen_at: string | null;
    created_at: string;
};

type Report = {
    id: number;
    reason: string;
    details: string | null;
    created_at: string;
    user: { id: number; name: string; email: string };
    complaint: {
        id: number;
        title: string;
        user_id: number;
        approval_status: string;
        visibility: string;
        removed_at: string | null;
    };
};

type Page<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
};

type Props = {
    reports: Page<Report>;
    users: Page<UserRow>;
    metrics: {
        open_reports: number;
        visitors_today: number;
        online_users: number;
    };
    threshold: number;
};

const reasonLabel: Record<string, string> = {
    misinformation: 'Misinformation',
    inappropriate_content: 'Inappropriate content',
    spam: 'Spam',
    harassment: 'Harassment',
    false_complaint: 'False complaint',
};

export default function CommunityModeration({
    reports,
    users,
    metrics,
    threshold,
}: Props) {
    const [reasons, setReasons] = useState<Record<number, string>>({});
    const [error, setError] = useState('');
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        const initialUpdate = window.setTimeout(() => {
            setNow(Date.now());
        }, 0);

        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 60_000);

        return () => {
            window.clearTimeout(initialUpdate);
            window.clearInterval(interval);
        };
    }, []);

    function act(url: string, userId: number) {
        const reason = reasons[userId]?.trim() ?? '';

        if (reason.length < 5) {
            setError(
                'Enter a reason of at least 5 characters before applying this action.',
            );

            return;
        }

        setError('');

        router.patch(
            url,
            { reason },
            {
                preserveScroll: true,
                onError: () =>
                    setError(
                        'The action could not be completed. Check the reason and try again.',
                    ),
            },
        );
    }

    return (
        <>
            <Head title="Community moderation" />

            <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
                <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ShieldAlert size={16} />
                            Administrator tools
                        </p>

                        <h1 className="text-2xl font-bold">
                            Community moderation
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Review resident reports, apply account actions,
                            and monitor community activity.
                        </p>
                    </div>

                    <Link
                        href="/admin/moderation"
                        className="rounded-lg border px-3 py-2 text-sm"
                    >
                        Submission approval queue
                    </Link>
                </header>

                <section className="grid gap-3 sm:grid-cols-3">
                    {[
                        {
                            label: 'Open reports',
                            value: metrics.open_reports,
                            icon: Flag,
                        },
                        {
                            label: 'Online users',
                            value: metrics.online_users,
                            icon: Users,
                        },
                        {
                            label: 'Recorded visits today',
                            value: metrics.visitors_today,
                            icon: Activity,
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <item.icon size={16} />
                                {item.label}
                            </div>

                            <div className="mt-2 text-3xl font-semibold tabular-nums">
                                {item.value}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="rounded-xl border bg-card">
                    <div className="border-b p-4">
                        <h2 className="font-semibold">Reported posts</h2>

                        <p className="text-sm text-muted-foreground">
                            An approved post is automatically placed on hold
                            at {threshold} distinct open reports.
                        </p>
                    </div>

                    <div className="divide-y">
                        {reports.data.length ? (
                            reports.data.map((report) => (
                                <article
                                    key={report.id}
                                    className="space-y-2 p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <Link
                                                href={`/community/reports/${report.complaint.id}`}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {report.complaint.title ||
                                                    `Complaint #${report.complaint.id}`}
                                            </Link>

                                            <p className="text-xs text-muted-foreground">
                                                Complaint #
                                                {report.complaint.id} ·
                                                reported by {report.user.name} ·{' '}
                                                {new Date(
                                                    report.created_at,
                                                ).toLocaleString()}
                                            </p>
                                        </div>

                                        <span className="rounded-full border px-2 py-1 text-xs">
                                            {reasonLabel[report.reason] ??
                                                report.reason}
                                        </span>
                                    </div>

                                    {report.details && (
                                        <p className="text-sm">
                                            {report.details}
                                        </p>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Post owner ID: {report.complaint.user_id}{' '}
                                        · approval:{' '}
                                        {report.complaint.approval_status} ·
                                        visibility:{' '}
                                        {report.complaint.visibility}
                                    </p>
                                </article>
                            ))
                        ) : (
                            <p className="p-5 text-sm text-muted-foreground">
                                No open reports.
                            </p>
                        )}
                    </div>

                    <nav className="flex flex-wrap gap-2 border-t p-3">
                        {reports.links.map((link) => (
                            <button
                                key={link.label}
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.visit(link.url, {
                                        preserveScroll: true,
                                    })
                                }
                                className={`rounded border px-3 py-1 text-sm disabled:opacity-40 ${
                                    link.active ? 'bg-muted font-semibold' : ''
                                }`}
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ))}
                    </nav>
                </section>

                <section className="rounded-xl border bg-card">
                    <div className="border-b p-4">
                        <h2 className="font-semibold">Resident accounts</h2>

                        <p className="text-sm text-muted-foreground">
                            Online means activity within the last five minutes.
                            Use the reason field before restricting or banning
                            an account.
                        </p>
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="px-4 pt-3 text-sm text-destructive"
                        >
                            {error}
                        </p>
                    )}

                    <div className="divide-y">
                        {users.data.map((user) => {
                            const online =
                                now !== null &&
                                !!user.last_seen_at &&
                                now -
                                    new Date(user.last_seen_at).getTime() <
                                    5 * 60 * 1000;

                            return (
                                <article
                                    key={user.id}
                                    className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 font-medium">
                                            {user.name}

                                            <span
                                                className={`inline-block h-2 w-2 rounded-full ${
                                                    online
                                                        ? 'bg-emerald-500'
                                                        : 'bg-muted-foreground/40'
                                                }`}
                                                title={
                                                    online ? 'Active' : 'Offline'
                                                }
                                            />
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            {user.email}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {user.banned_at
                                                ? `Banned ${new Date(user.banned_at).toLocaleDateString()}`
                                                : user.restricted_at
                                                  ? 'Profile restricted'
                                                  : online
                                                    ? 'Active now'
                                                    : 'Offline'}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <input
                                            value={reasons[user.id] ?? ''}
                                            onChange={(event) =>
                                                setReasons((previous) => ({
                                                    ...previous,
                                                    [user.id]:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="Reason (required, min 5 characters)"
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                disabled={!!user.banned_at}
                                                onClick={() =>
                                                    act(
                                                        `/admin/users/${user.id}/restrict`,
                                                        user.id,
                                                    )
                                                }
                                                className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
                                            >
                                                Restrict profile
                                            </button>

                                            <button
                                                disabled={!!user.banned_at}
                                                onClick={() =>
                                                    act(
                                                        `/admin/users/${user.id}/ban`,
                                                        user.id,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive disabled:opacity-40"
                                            >
                                                <Ban size={14} />
                                                Ban account
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <nav className="flex flex-wrap gap-2 border-t p-3">
                        {users.links.map((link) => (
                            <button
                                key={link.label}
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.visit(link.url, {
                                        preserveScroll: true,
                                    })
                                }
                                className={`rounded border px-3 py-1 text-sm disabled:opacity-40 ${
                                    link.active ? 'bg-muted font-semibold' : ''
                                }`}
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ))}
                    </nav>
                </section>
            </main>
        </>
    );
}

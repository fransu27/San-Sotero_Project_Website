import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    LockKeyhole,
    ShieldCheck,
    UserRound,
    Crown,
    UserCog,
} from 'lucide-react';
type Resident = {
    id: number;
    name: string;
    avatar: string | null;
    private: boolean;
    status: string;
    expiresAt: string | null;
    lastSeenAt: string | null;
    role: string;
    primaryAdmin: boolean;
};
export default function Residents({
    residents,
    canManageAdmins,
}: {
    residents: Resident[];
    canManageAdmins: boolean;
}) {
    return (
        <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-7">
            <Head title="Resident directory" />
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <Link
                        href="/dashboard"
                        className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <ArrowLeft size={16} /> Back to dashboard
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Resident directory
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Browse accounts, inspect profiles, open moderation
                        tools, and manage staff roles when authorized.
                    </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1.5 text-sm">
                    {residents.length} residents shown
                </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {residents.map((r) => (
                    <article
                        key={r.id}
                        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                                {r.avatar ? (
                                    <img
                                        src={r.avatar}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <UserRound />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="truncate font-semibold">
                                    {r.name}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {r.role === 'admin'
                                        ? r.primaryAdmin
                                            ? 'Primary administrator'
                                            : 'Administrator'
                                        : 'Resident'}{' '}
                                    ·{' '}
                                    {r.lastSeenAt
                                        ? `Last seen ${new Date(r.lastSeenAt).toLocaleString()}`
                                        : 'No activity recorded'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : r.status === 'restricted' ? 'bg-amber-500/10 text-amber-700' : 'bg-red-500/10 text-red-700'}`}
                            >
                                {r.status}
                            </span>
                            {r.private && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                                    <LockKeyhole size={12} /> Private
                                </span>
                            )}
                        </div>
                        {r.expiresAt && r.status === 'restricted' && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Restriction expires{' '}
                                {new Date(r.expiresAt).toLocaleString()}
                            </p>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {r.role !== 'admin' ? (
                                <button
                                    onClick={() =>
                                        router.visit(`/residents/${r.id}`)
                                    }
                                    className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                                >
                                    View profile
                                </button>
                            ) : (
                                <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2.5 text-xs text-muted-foreground">
                                    {r.primaryAdmin ? (
                                        <>
                                            <Crown size={14} /> Protected owner
                                        </>
                                    ) : (
                                        <>
                                            <UserCog size={14} /> Staff account
                                        </>
                                    )}
                                </span>
                            )}
                            <button
                                onClick={() =>
                                    router.visit(
                                        `/admin/moderation?view=users&user_id=${r.id}`,
                                    )
                                }
                                className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                            >
                                <ShieldCheck size={15} /> Moderate
                            </button>
                        </div>
                        {canManageAdmins && !r.primaryAdmin && (
                            <button
                                onClick={() => {
                                    const next =
                                        r.role === 'admin'
                                            ? 'resident'
                                            : 'admin';

                                    if (
                                        window.confirm(
                                            `${next === 'admin' ? 'Assign administrator access to' : 'Remove administrator access from'} ${r.name}?`,
                                        )
                                    ) {
                                        router.patch(
                                            `/admin/residents/${r.id}/role`,
                                            { role: next },
                                            { preserveScroll: true },
                                        );
                                    }
                                }}
                                className="mt-2 w-full rounded-xl border border-sky-700/30 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50 dark:text-sky-200 dark:hover:bg-sky-950"
                            >
                                {r.role === 'admin'
                                    ? 'Remove administrator role'
                                    : 'Assign administrator role'}
                            </button>
                        )}
                    </article>
                ))}
            </div>
            {residents.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    No resident accounts found.
                </p>
            )}
        </div>
    );
}

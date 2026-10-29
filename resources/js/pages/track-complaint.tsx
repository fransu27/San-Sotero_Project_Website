import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    FileSearch,
    LockKeyhole,
} from 'lucide-react';
import type { FormEvent } from 'react';

type EventItem = {
    type: string;
    status: string | null;
    created_at: string | null;
};
type Result = {
    ticket_code: string;
    status: string;
    submitted_at: string | null;
    updated_at: string | null;
    events: EventItem[];
} | null;
export default function TrackComplaint({ result }: { result: Result }) {
    const { data, setData, post, processing, errors } = useForm({
        ticket_code: '',
        pin: '',
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/track-complaint', { preserveScroll: true });
    };
    const inputClass =
        'w-full rounded-xl border border-border bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-sky-500';
    const date = (value: string | null) =>
        value ? new Date(value).toLocaleString() : '—';

    return (
        <>
            <Head title="Track a complaint" />
            <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-14">
                <div className="mx-auto max-w-xl space-y-5">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <ArrowLeft size={16} /> San Sotero home
                    </Link>
                    <header className="rounded-2xl border border-border bg-card p-5 sm:p-7">
                        <div className="mb-4 inline-flex rounded-xl bg-sky-500/10 p-3 text-sky-600">
                            <FileSearch size={26} />
                        </div>
                        <p className="text-xs font-semibold tracking-widest text-sky-600 uppercase">
                            Complaint follow-up
                        </p>
                        <h1 className="mt-1 text-2xl font-bold">
                            Track your concern
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Enter the reference and six-digit PIN printed on
                            your receipt. You do not need a user account or
                            smartphone app.
                        </p>
                    </header>
                    <form
                        onSubmit={submit}
                        className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
                    >
                        <label className="block space-y-1.5 text-sm font-medium">
                            Tracking reference
                            <input
                                id="tracking-reference"
                                aria-invalid={Boolean(errors.ticket_code)}
                                aria-describedby={
                                    errors.ticket_code
                                        ? 'tracking-reference-error'
                                        : undefined
                                }
                                required
                                autoComplete="off"
                                className={inputClass}
                                placeholder="SS-2610-ABC234"
                                value={data.ticket_code}
                                onChange={(e) =>
                                    setData(
                                        'ticket_code',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                            />
                            {errors.ticket_code && (
                                <span
                                    id="tracking-reference-error"
                                    role="alert"
                                    className="text-red-600"
                                >
                                    {errors.ticket_code}
                                </span>
                            )}
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium">
                            Private 6-digit PIN
                            <input
                                id="tracking-pin"
                                aria-invalid={Boolean(errors.pin)}
                                aria-describedby={
                                    errors.pin
                                        ? 'tracking-pin-error'
                                        : undefined
                                }
                                required
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                autoComplete="off"
                                className={inputClass}
                                placeholder="••••••"
                                value={data.pin}
                                onChange={(e) =>
                                    setData(
                                        'pin',
                                        e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 6),
                                    )
                                }
                            />
                            {errors.pin && (
                                <span
                                    id="tracking-pin-error"
                                    role="alert"
                                    className="text-red-600"
                                >
                                    {errors.pin}
                                </span>
                            )}
                        </label>
                        <button
                            disabled={processing}
                            className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                            {processing ? 'Checking…' : 'Check status'}
                        </button>
                        <p className="flex items-start gap-2 text-xs text-muted-foreground">
                            <LockKeyhole
                                size={15}
                                className="mt-0.5 shrink-0"
                            />
                            Keep your PIN private. The page intentionally does
                            not show the complaint description, reporter
                            details, location, or attachments.
                        </p>
                    </form>
                    {result && (
                        <section
                            className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
                            aria-live="polite"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Reference
                                    </p>
                                    <p className="font-mono text-lg font-bold">
                                        {result.ticket_code}
                                    </p>
                                </div>
                                <span className="rounded-full border px-3 py-1 text-sm font-semibold">
                                    {result.status}
                                </span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Received
                                    </p>
                                    <p className="mt-1 text-sm">
                                        {date(result.submitted_at)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-muted/50 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Last updated
                                    </p>
                                    <p className="mt-1 text-sm">
                                        {date(result.updated_at)}
                                    </p>
                                </div>
                            </div>
                            <h2 className="font-semibold">Progress history</h2>
                            {result.events.length ? (
                                <ol className="space-y-3">
                                    {result.events.map((event, index) => (
                                        <li
                                            key={`${event.type}-${event.created_at}-${index}`}
                                            className="flex gap-3"
                                        >
                                            <div className="mt-0.5 text-sky-600">
                                                {event.status === 'Resolved' ? (
                                                    <CheckCircle2 size={18} />
                                                ) : (
                                                    <Clock3 size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {event.status ||
                                                        event.type.replaceAll(
                                                            '_',
                                                            ' ',
                                                        )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {date(event.created_at)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No status updates have been recorded yet.
                                </p>
                            )}
                        </section>
                    )}
                    <p className="text-center text-xs text-muted-foreground">
                        You may also visit the Barangay Hall and ask staff to
                        check the reference for you.
                    </p>
                </div>
            </main>
        </>
    );
}

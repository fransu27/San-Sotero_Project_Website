import { Head, Link } from '@inertiajs/react';
import { Mail, ShieldAlert, UserRoundX } from 'lucide-react';
export default function Contact({ supportEmail }: { supportEmail: string }) {
    return (
        <main className="min-h-screen bg-[#F0F2F5] px-4 py-10 text-[#02182B] dark:bg-background dark:text-foreground">
            <Head title="Contact and Support" />
            <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
                <Link href="/" className="text-sm text-sky-700 underline">
                    ← San Sotero home
                </Link>
                <p className="mt-6 text-xs font-bold tracking-[.18em] text-sky-700 uppercase">
                    San Sotero · Help desk
                </p>
                <h1 className="mt-2 text-3xl font-bold">Contact and Support</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Use this contact for account help, privacy requests, or to
                    report abusive content. Do not email passwords or complaint
                    tracking PINs.
                </p>
                <a
                    href={`mailto:${supportEmail}`}
                    className="mt-6 flex items-center gap-3 rounded-2xl border border-sky-700/20 bg-sky-500/5 p-4"
                >
                    <span className="rounded-xl bg-sky-600 p-3 text-white">
                        <Mail size={22} />
                    </span>
                    <span>
                        <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Support email
                        </span>
                        <span className="mt-1 block text-lg font-bold break-all text-sky-800 dark:text-sky-200">
                            {supportEmail}
                        </span>
                    </span>
                </a>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <section className="rounded-2xl border border-border p-4">
                        <UserRoundX size={20} className="text-sky-700" />
                        <h2 className="mt-3 font-semibold">
                            Data access or deletion
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Include your account email and describe the data
                            request. Staff may ask you to verify your identity;
                            some official records may need to be retained.
                        </p>
                    </section>
                    <section className="rounded-2xl border border-border p-4">
                        <ShieldAlert size={20} className="text-sky-700" />
                        <h2 className="mt-3 font-semibold">
                            Abusive content or safety issue
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Include the post or profile link, a short
                            explanation, and any urgent context. Avoid
                            forwarding unrelated personal data.
                        </p>
                    </section>
                </div>
                <p className="mt-6 rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-900 dark:text-amber-200">
                    Configuration notice: the fallback address may be a
                    placeholder. The site operator must set SUPPORT_EMAIL in the
                    server environment to a monitored mailbox before launch.
                </p>
                <div className="mt-6 flex gap-4 text-sm">
                    <Link href="/terms" className="text-sky-700 underline">
                        Terms of Service
                    </Link>
                    <Link
                        href="/privacy-policy"
                        className="text-sky-700 underline"
                    >
                        Privacy Policy
                    </Link>
                </div>
            </article>
        </main>
    );
}

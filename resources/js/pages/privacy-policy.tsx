import { Head, Link } from '@inertiajs/react';
export default function PrivacyPolicy({
    supportEmail,
}: {
    supportEmail: string;
}) {
    return (
        <main className="min-h-screen bg-[#F0F2F5] px-4 py-10 text-[#02182B] dark:bg-background dark:text-foreground">
            <Head title="Privacy Policy" />
            <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
                <Link href="/" className="text-sm text-sky-700 underline">
                    ← San Sotero home
                </Link>
                <p className="mt-6 text-xs font-bold tracking-[.18em] text-sky-700 uppercase">
                    San Sotero · Legal
                </p>
                <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
                <p className="mt-3 text-sm text-muted-foreground">
                    Effective date: October 24, 2026 · This template must be
                    checked against actual deployment, retention, and legal
                    requirements before launch.
                </p>
                <div className="mt-8 space-y-6 text-sm leading-7">
                    <section>
                        <h2 className="text-lg font-semibold">
                            1. Information we collect
                        </h2>
                        <p>
                            Depending on how you use the service, information
                            may include your name, email address, mobile number,
                            date of birth, account credentials (stored as a
                            password hash), profile photo and privacy
                            preferences, report descriptions, incident
                            location/date, uploaded images and documents,
                            reactions, comments, moderation records, appeal
                            messages, and basic activity timestamps. Walk-in
                            reports may also include contact details supplied to
                            staff.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            2. Why information is used
                        </h2>
                        <p>
                            Information is used to create and secure accounts,
                            verify email addresses, receive and track community
                            reports, route reports to authorized staff, moderate
                            content, prevent abuse, respond to appeals and
                            support requests, and maintain operational and audit
                            records.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            3. Visibility and access
                        </h2>
                        <p>
                            Residents can access their own submissions.
                            Authorized administrators can access information
                            needed for official moderation and report handling.
                            Publicly visible content may be viewed by visitors.
                            Private profiles and private submissions are subject
                            to access controls. Do not assume that anything you
                            intentionally publish publicly is confidential.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            4. Sharing and service providers
                        </h2>
                        <p>
                            Information should only be shared with authorized
                            personnel and service providers required to operate,
                            secure, or support the service, or where disclosure
                            is legally required. The site operator must update
                            this notice if analytics, email delivery, cloud
                            storage, or other third-party services are enabled.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            5. Retention and deletion
                        </h2>
                        <p>
                            Records may be retained for official handling,
                            security, audit, dispute resolution, or legal
                            obligations. You may request access, correction, or
                            deletion by contacting support. A request is not
                            automatically granted if retention is required;
                            staff may need to verify your identity and explain
                            the outcome.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            6. Security and cookies
                        </h2>
                        <p>
                            The application uses authentication, server-side
                            access checks, and security controls to protect
                            records. No online service can guarantee absolute
                            security. Session and security cookies may be used
                            to keep you signed in and protect requests.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">
                            7. Your choices and contact
                        </h2>
                        <p>
                            Keep your account information accurate, choose an
                            appropriate profile visibility setting, and never
                            share your password or tracking PIN. For privacy
                            requests, abusive-content reports, or questions,
                            email{' '}
                            <a
                                className="font-semibold text-sky-700 underline"
                                href={`mailto:${supportEmail}`}
                            >
                                {supportEmail}
                            </a>
                            .
                        </p>
                    </section>
                    <section>
                        <h2 className="text-lg font-semibold">8. Updates</h2>
                        <p>
                            This policy may be updated when the service changes.
                            The effective date at the top indicates the current
                            published version. The site operator should maintain
                            version history and ensure this policy accurately
                            describes the live deployment.
                        </p>
                    </section>
                </div>
                <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
                    Configure SUPPORT_EMAIL in the server environment; the
                    current fallback is a placeholder until changed.
                </p>
            </article>
        </main>
    );
}

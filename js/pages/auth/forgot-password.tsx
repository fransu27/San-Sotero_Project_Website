// Components
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            {status && (
                <div className="mb-4 text-center rounded-xl border border-[#448FA3]/25 bg-[#448FA3]/10 p-3.5 text-sm font-medium text-chart-3">
                    {status}
                </div>
            )}

            <div className="space-y-6">
                <Form {...email.form()} className="auth-form">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                    autoComplete="email"
                                    autoFocus
                                    placeholder="email@example.com"
                                />

                                <InputError id="email-error" message={errors.email} />
                            </div>

                            <div className="my-6 flex items-center justify-start">
                                <Button
                                    className="h-11 w-full rounded-xl bg-[#0197F6] font-semibold text-white shadow-lg shadow-[#0197F6]/20 hover:bg-[#087fd0]"
                                    disabled={processing}
                                    data-test="email-password-reset-link-button"
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    )}
                                    Email password reset link
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>Or, return to</span>
                    <TextLink href={login()}>log in</TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link',
};

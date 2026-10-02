import { Form, Head } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import PasswordStrength, {
    checkPassword,
} from '@/components/password-strength';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = { passwordRules: string };

/**
 * Registration page (rendered by Fortify::registerView). Collects: full name, date of birth,
 * mobile number, email, password.
 *
 * SECURITY NOTES
 *  - Posts to Fortify's POST /register with an automatic CSRF token.
 *  - Everything here (date limits, phone pattern, password checklist) is for convenience only.
 *    The real rules run in App\Actions\Fortify\CreateNewUser (server), so they can't be skipped.
 *  - The button stays disabled until the password meets every rule and both passwords match.
 *  - disableWhileProcessing blocks double-submits; resetOnSuccess clears the password fields.
 *  - The eye button (PasswordInput) lets you check what you typed; it only changes the input type.
 */
const today = new Date().toISOString().slice(0, 10);

export default function Register({ passwordRules }: Props) {
    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const { meetsAll, matches } = checkPassword(pw, confirm);

    return (
        <>
            <Head title="Create account" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full name</Label>
                            <Input
                                id="name"
                                name="name"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="name"
                                placeholder="Juan Dela Cruz"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="birthdate">Date of birth</Label>
                                <Input
                                    id="birthdate"
                                    name="birthdate"
                                    type="date"
                                    required
                                    tabIndex={2}
                                    min="1900-01-02"
                                    max={today}
                                    autoComplete="bday"
                                    className="[color-scheme:dark]"
                                />
                                <InputError message={errors.birthdate} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Mobile number</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    required
                                    tabIndex={3}
                                    autoComplete="tel"
                                    placeholder="09171234567"
                                    maxLength={16}
                                    pattern="(09[0-9]{9}|\+639[0-9]{9})"
                                    title="Example: 09171234567"
                                />
                                <InputError message={errors.phone} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                tabIndex={4}
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="email@example.com"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={5}
                                autoComplete="new-password"
                                placeholder="Create a password"
                                passwordrules={passwordRules}
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                            />
                            <PasswordStrength password={pw} />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirm password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                tabIndex={6}
                                autoComplete="new-password"
                                placeholder="Type it again"
                                passwordrules={passwordRules}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                            {confirm.length > 0 && (
                                <p
                                    className={`flex items-center gap-1.5 text-xs ${matches ? 'text-[#68C5DB]' : 'text-[#D7263D]'}`}
                                >
                                    {matches ? (
                                        <>
                                            <Check size={13} /> Passwords match
                                        </>
                                    ) : (
                                        'Passwords do not match yet'
                                    )}
                                </p>
                            )}
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            tabIndex={7}
                            disabled={!meetsAll || !matches || processing}
                            data-test="register-user-button"
                        >
                            {processing && <Spinner />} Create account
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={8}>
                                Log in
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create your account',
    description:
        'Register once as a resident of San Sotero. Every report you file stays tied to your name.',
};

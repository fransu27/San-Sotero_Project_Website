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
const adultBirthdateLimit = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setFullYear(date.getFullYear() - 18);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const latestEligibleBirthdate = adultBirthdateLimit();

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
                className="auth-form flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full name</Label>
                            <Input
                                id="name"
                                name="name"
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? 'name-error' : undefined}
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="name"
                                placeholder="Juan Dela Cruz"
                            />
                            <InputError id="name-error" message={errors.name} />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="birthdate">Date of birth</Label>
                                <Input
                                    id="birthdate"
                                    name="birthdate"
                                    aria-invalid={Boolean(errors.birthdate)}
                                    aria-describedby={errors.birthdate ? 'birthdate-help birthdate-error' : 'birthdate-help'}
                                    type="date"
                                    required
                                    tabIndex={2}
                                    min="1900-01-02"
                                    max={latestEligibleBirthdate}
                                    autoComplete="bday"
                                    className="[color-scheme:light] dark:[color-scheme:dark]"
                                />
                                <p id="birthdate-help" className="text-xs text-muted-foreground">
                                    You must be at least 18 years old to register.
                                </p>
                                <InputError id="birthdate-error" message={errors.birthdate} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Mobile number</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    aria-invalid={Boolean(errors.phone)}
                                    aria-describedby={errors.phone ? 'phone-error' : undefined}
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
                                <InputError id="phone-error" message={errors.phone} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                                type="email"
                                required
                                tabIndex={4}
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="email@example.com"
                            />
                            <InputError id="email-error" message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                required
                                tabIndex={5}
                                autoComplete="new-password"
                                placeholder="Create a password"
                                passwordrules={passwordRules}
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                            />
                            <PasswordStrength password={pw} />
                            <InputError id="password-error" message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirm password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                aria-invalid={Boolean(errors.password_confirmation)}
                                aria-describedby={errors.password_confirmation ? 'password_confirmation-error' : undefined}
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
                                id="password_confirmation-error"
                                message={errors.password_confirmation}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full rounded-xl bg-[#0197F6] font-semibold shadow-lg shadow-[#0197F6]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#087fd0]"
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
        'Register once as a resident of Santotero. Every report you file stays tied to your name.',
};

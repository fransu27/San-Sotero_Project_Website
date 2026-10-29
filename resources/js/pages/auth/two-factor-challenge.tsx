import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        toggleText: string;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: 'Recovery code',
                description:
                    'Please confirm access to your account by entering one of your emergency recovery codes.',
                toggleText: 'login using an authentication code',
            };
        }

        return {
            title: 'Authentication code',
            description:
                'Enter the authentication code provided by your authenticator application.',
            toggleText: 'login using a recovery code',
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Two-factor authentication" />

            <div className="space-y-6">
                <Form
                    {...store.form()}
                    className="space-y-4"
                    resetOnError
                    resetOnSuccess={!showRecoveryInput}
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            {showRecoveryInput ? (
                                <>
                                    <Input
                                        className="auth-form h-12 text-center font-mono tracking-widest"
                                        id="recovery-code"
                                        name="recovery_code"
                                        type="text"
                                        aria-invalid={Boolean(
                                            errors.recovery_code,
                                        )}
                                        aria-describedby={
                                            errors.recovery_code
                                                ? 'recovery-code-error'
                                                : undefined
                                        }
                                        placeholder="Enter recovery code"
                                        autoFocus={showRecoveryInput}
                                        required
                                    />
                                    <InputError
                                        id="recovery-code-error"
                                        message={errors.recovery_code}
                                    />
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-3 text-center">
                                    <div className="flex w-full items-center justify-center">
                                        <InputOTP
                                            maxLength={OTP_MAX_LENGTH}
                                            value={code}
                                            onChange={(value) => setCode(value)}
                                            disabled={processing}
                                            aria-label="Authentication code"
                                            aria-invalid={Boolean(errors.code)}
                                            aria-describedby={
                                                errors.code
                                                    ? 'auth-code-error'
                                                    : undefined
                                            }
                                            pattern={REGEXP_ONLY_DIGITS}
                                            autoFocus
                                        >
                                            <InputOTPGroup>
                                                {Array.from(
                                                    { length: OTP_MAX_LENGTH },
                                                    (_, index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                        />
                                                    ),
                                                )}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    <input
                                        type="hidden"
                                        name="code"
                                        value={code}
                                    />
                                    <InputError
                                        id="auth-code-error"
                                        message={errors.code}
                                    />
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="h-11 w-full rounded-xl bg-[#0197F6] font-semibold text-white shadow-lg shadow-[#0197F6]/20 hover:bg-[#087fd0]"
                                disabled={processing}
                            >
                                Continue
                            </Button>

                            <div className="text-center text-sm text-muted-foreground">
                                <span>or you can </span>
                                <button
                                    type="button"
                                    className="cursor-pointer text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                    onClick={() =>
                                        toggleRecoveryMode(clearErrors)
                                    }
                                >
                                    {authConfigContent.toggleText}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

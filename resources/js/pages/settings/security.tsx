import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import { edit } from '@/routes/security';

type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const { t } = useLocale();
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title={t('page.securitySettings')} />

            <h1 className="sr-only">{t('page.securitySettings')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('security.updatePassword')}
                    description={t('security.desc')}
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">
                                    {t('security.current')}
                                </Label>

                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    aria-invalid={Boolean(
                                        errors.current_password,
                                    )}
                                    aria-describedby={
                                        errors.current_password
                                            ? 'current-password-error'
                                            : undefined
                                    }
                                    className="mt-1 block w-full"
                                    autoComplete="current-password"
                                    placeholder={t('security.current')}
                                />

                                <InputError
                                    id="current-password-error"
                                    message={errors.current_password}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    {t('security.new')}
                                </Label>

                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password
                                            ? 'new-password-error'
                                            : undefined
                                    }
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder={t('security.new')}
                                    passwordrules={props.passwordRules}
                                />

                                <InputError
                                    id="new-password-error"
                                    message={errors.password}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    {t('security.confirm')}
                                </Label>

                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    aria-invalid={Boolean(
                                        errors.password_confirmation,
                                    )}
                                    aria-describedby={
                                        errors.password_confirmation
                                            ? 'password-confirmation-error'
                                            : undefined
                                    }
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder={t('security.confirm')}
                                    passwordrules={props.passwordRules}
                                />

                                <InputError
                                    id="password-confirmation-error"
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    {t('profile.save')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />

            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};

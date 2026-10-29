import { Form, Head, router, usePage } from '@inertiajs/react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
/* @end-chisel-email-verification */
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AvatarUploader from '@/components/avatar-uploader';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';
/* @chisel-email-verification */
/* @end-chisel-email-verification */

type PageProps = {
    auth: Auth;
};

export default function Profile(
    /* @chisel-email-verification */
    {
        mustVerifyEmail,
        status,
        phone,
        birthdate,
        avatarUrl,
        avatarLocked,
        avatarLockedUntil,
        avatarLockedReason,
        profileVisibility,
    }: {
        mustVerifyEmail: boolean;
        status?: string;
        phone: string | null;
        birthdate: string | null;
        avatarUrl: string | null;
        avatarLocked?: boolean;
        avatarLockedUntil?: string | null;
        avatarLockedReason?: string | null;
        profileVisibility: 'public' | 'private';
    },
    /* @end-chisel-email-verification */
) {
    const { t } = useLocale();
    const { auth, errors } = usePage<
        PageProps & { errors: Record<string, string> }
    >().props;

    return (
        <>
            <Head title={t('page.profileSettings')} />

            <h1 className="sr-only">{t('page.profileSettings')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('profile.title')}
                    description={t('profile.desc')}
                />

                <AvatarUploader
                    name={auth.user.name}
                    url={avatarUrl}
                    staff={auth.user.role === 'admin'}
                    error={errors.avatar}
                    locked={avatarLocked}
                    lockedUntil={avatarLockedUntil}
                    lockedReason={avatarLockedReason}
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('profile.name')}
                                </Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name ? 'name-error' : undefined
                                    }
                                    autoComplete="name"
                                    placeholder={t('profile.fullName')}
                                />

                                <InputError
                                    className="mt-2"
                                    id="name-error"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    {t('profile.email')}
                                </Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                    autoComplete="username"
                                    placeholder="Email address"
                                />

                                <InputError
                                    className="mt-2"
                                    id="email-error"
                                    message={errors.email}
                                />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="birthdate">
                                        {t('profile.birthdate')}
                                    </Label>
                                    <Input
                                        id="birthdate"
                                        name="birthdate"
                                        type="date"
                                        required
                                        aria-invalid={Boolean(errors.birthdate)}
                                        aria-describedby={
                                            errors.birthdate
                                                ? 'birthdate-error'
                                                : undefined
                                        }
                                        min="1900-01-02"
                                        max={new Date()
                                            .toISOString()
                                            .slice(0, 10)}
                                        defaultValue={birthdate ?? ''}
                                        autoComplete="bday"
                                        className="block [color-scheme:dark]"
                                    />
                                    <InputError
                                        id="birthdate-error"
                                        message={errors.birthdate}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone">
                                        {t('profile.mobile')}
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        required
                                        aria-invalid={Boolean(errors.phone)}
                                        aria-describedby={
                                            errors.phone
                                                ? 'phone-error'
                                                : undefined
                                        }
                                        defaultValue={phone ?? ''}
                                        autoComplete="tel"
                                        placeholder="09171234567"
                                        maxLength={16}
                                        pattern="(09[0-9]{9}|\+639[0-9]{9})"
                                        title="Example: 09171234567"
                                    />
                                    <InputError
                                        id="phone-error"
                                        message={errors.phone}
                                    />
                                </div>
                            </div>

                            {/* @chisel-email-verification */}
                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-4 text-sm text-muted-foreground">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to re-send the
                                                verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been
                                                sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}
                            {/* @end-chisel-email-verification */}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    {t('profile.save')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
                <section className="space-y-3 rounded-2xl border border-border p-4 sm:p-5">
                    <div>
                        <h2 className="font-semibold">
                            {t('profile.privacy')}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('profile.privacyDesc')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
                        <div>
                            <p className="text-sm font-medium">
                                {profileVisibility === 'private'
                                    ? t('profile.private')
                                    : t('profile.public')}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {profileVisibility === 'private'
                                    ? t('profile.privateDesc')
                                    : t('profile.publicDesc')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                router.patch(
                                    '/settings/profile/privacy',
                                    {
                                        profile_visibility:
                                            profileVisibility === 'private'
                                                ? 'public'
                                                : 'private',
                                    },
                                    { preserveScroll: true },
                                )
                            }
                            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                        >
                            {profileVisibility === 'private'
                                ? t('profile.makePublic')
                                : t('profile.makePrivate')}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t('profile.anonymousNote')}
                    </p>
                </section>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};

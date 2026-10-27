import { router } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/feed/avatar';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';

const MAX_MB = 2;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Profile picture control for Settings → Profile. Pick a photo, see it instantly, upload it; change or remove it any time.
 * The checks here (type, size) are only for a quick friendly message; the server validates again (AvatarUpdateRequest).
 */
export default function AvatarUploader({
    name,
    url,
    staff,
    error,
    locked = false,
    lockedUntil = null,
    lockedReason = null,
}: {
    name: string;
    url: string | null;
    staff: boolean;
    error?: string;
    /** Profile-picture restriction: the picture shows the anonymous placeholder and cannot be changed. */
    locked?: boolean;
    lockedUntil?: string | null;
    lockedReason?: string | null;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const pick = (f: File | undefined) => {
        setLocalError(null);

        if (!f) {
            return;
        }

        if (!TYPES.includes(f.type)) {
            setLocalError('Use a JPG, PNG or WebP picture.');

            return;
        }

        if (f.size > MAX_MB * 1024 * 1024) {
            setLocalError(`The picture must be ${MAX_MB} MB or smaller.`);

            return;
        }

        if (preview) {
            URL.revokeObjectURL(preview);
        }

        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const reset = () => {
        if (preview) {
            URL.revokeObjectURL(preview);
        }

        setPreview(null);
        setFile(null);

        if (input.current) {
            input.current.value = '';
        }
    };

    const upload = () => {
        if (!file) {
            return;
        }

        router.post(
            '/settings/profile/avatar',
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: reset,
            },
        );
    };

    const remove = () => {
        router.delete('/settings/profile/avatar', {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
        });
    };

    if (locked) {
        return (
            <div className="flex flex-wrap items-center gap-5">
                <Avatar name={name} src={url} staff={staff} size={88} />
                <div className="max-w-md space-y-1 text-sm" role="status">
                    <p className="font-semibold">Profile picture restricted</p>
                    <p className="text-xs text-muted-foreground">
                        Your picture shows the anonymous placeholder and can't be changed
                        {lockedUntil
                            ? ` until ${new Date(lockedUntil).toLocaleString()}`
                            : ' until an administrator lifts the restriction'}
                        . You can still post, comment and react as usual.
                        {lockedReason ? ` Reason: ${lockedReason}` : ''}
                    </p>
                    <InputError message={error} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-5">
            <Avatar name={name} src={preview ?? url} staff={staff} size={88} />
            <div className="space-y-2">
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    id="avatar-file"
                    onChange={(e) => pick(e.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-2">
                    {file ? (
                        <>
                            <Button
                                type="button"
                                onClick={upload}
                                disabled={busy}
                                data-test="upload-avatar-button"
                            >
                                {busy ? 'Uploading…' : 'Save picture'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={reset}
                                disabled={busy}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => input.current?.click()}
                                disabled={busy}
                            >
                                <Camera size={16} />{' '}
                                {url ? 'Change picture' : 'Upload picture'}
                            </Button>
                            {url && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={remove}
                                    disabled={busy}
                                    className="text-[#D7263D]"
                                >
                                    <Trash2 size={16} /> Remove
                                </Button>
                            )}
                        </>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP · up to {MAX_MB} MB. Other residents see
                    this so they know who is who (not on anonymous posts).
                </p>
                <InputError message={localError ?? error} />
            </div>
        </div>
    );
}

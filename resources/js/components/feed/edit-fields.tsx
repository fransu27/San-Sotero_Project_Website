import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/** Shared bits for the inline "edit post" forms (posts and announcements). */
export const fieldClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[#0197F6] focus:ring-2 focus:ring-[#0197F6]/30';
const MAX_MB = 4;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Photo picker for edit forms: shows the current photo (or the newly chosen one), lets the person
 * replace it or remove it. The browser check is just for a quick message; the server re-validates.
 */
export function PhotoEditor({ currentUrl, file, removed, onFile, onRemove, error }: {
    currentUrl: string | null; file: File | null; removed: boolean;
    onFile: (f: File | null) => void; onRemove: (v: boolean) => void; error?: string;
}) {
    const [localError, setLocalError] = useState<string | null>(null);
    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const shown = preview ?? (removed ? null : currentUrl);

    const pick = (f?: File) => {
        if (!f) return;
        if (!TYPES.includes(f.type)) return setLocalError('Please choose a JPG, PNG or WebP photo.');
        if (f.size > MAX_MB * 1024 * 1024) return setLocalError(`That photo is over ${MAX_MB} MB. Choose a smaller one.`);
        setLocalError(null);
        onRemove(false);
        onFile(f);
    };

    return (
        <div className="space-y-2">
            {shown && (
                <div className="relative overflow-hidden rounded-lg border border-border">
                    <img src={shown} alt="Post photo" className="max-h-60 w-full object-cover" />
                    <button type="button" aria-label="Remove photo" onClick={() => { onFile(null); onRemove(true); }}
                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"><X size={16} /></button>
                </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[#0197F6] hover:bg-muted focus-within:ring-2 focus-within:ring-[#0197F6]">
                <ImagePlus size={17} /> {shown ? 'Change photo' : 'Add photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {(localError || error) && <p className="text-xs text-[#D7263D]">{localError || error}</p>}
        </div>
    );
}

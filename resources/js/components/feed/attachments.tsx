import { Download, Eye, FileText, Paperclip, X } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Files attached to a post or an announcement (PDF, Word, Excel, PowerPoint).
 *
 *  - <AttachmentList>   : read-only rows  [icon] filename · size            [Preview] [Download]
 *                         "Preview" opens the PDF in a window without leaving the page; Word/Excel/PowerPoint
 *                         files cannot be previewed by a browser, so they only get "Download".
 *  - <AttachmentPicker> : the file chooser used by the composer and the edit forms (add / remove files).
 *
 * SECURITY: these only DRAW links. /attachments/{id} (AttachmentController) decides who may open a file and
 * forces anything that is not a real PDF to download instead of displaying.
 */
export type Attachment = {
    id: number;
    name: string;
    size: number;
    is_pdf: boolean;
    url: string;
    download_url: string;
};

export const MAX_FILES = 5;
export const MAX_FILE_MB = 10;
export const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
const FILE_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

export const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

const extColor: Record<string, string> = {
    pdf: '#D7263D',
    doc: '#0197F6',
    docx: '#0197F6',
    xls: '#2E8B57',
    xlsx: '#2E8B57',
    ppt: '#D9822B',
    pptx: '#D9822B',
};

function FileBadge({ name }: { name: string }) {
    const ext = extOf(name);
    const color = extColor[ext] ?? '#448FA3';

    return (
        <span
            className="relative flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}1f`, color }}
            aria-hidden
        >
            <FileText size={20} />
            <span
                className="absolute -right-1 -bottom-1 rounded px-1 text-[9px] leading-4 font-bold text-white uppercase"
                style={{ backgroundColor: color }}
            >
                {ext.slice(0, 4) || 'file'}
            </span>
        </span>
    );
}

const rowBtn =
    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0197F6]';

/** The read-only list shown on a post, with Preview + Download on the right of each file. */
export function AttachmentList({
    files,
    className,
}: {
    files: Attachment[];
    className?: string;
}) {
    const [open, setOpen] = useState<Attachment | null>(null);

    if (!files || files.length === 0) {
        return null;
    }

    return (
        <div className={cn('space-y-2', className)}>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Paperclip size={13} /> Attached files ({files.length})
            </p>
            <ul className="space-y-2">
                {files.map((f) => (
                    <li
                        key={f.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5 sm:flex-nowrap"
                    >
                        <FileBadge name={f.name} />
                        <div className="min-w-0 flex-1 basis-40">
                            <p
                                className="truncate text-sm font-medium"
                                title={f.name}
                            >
                                {f.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatSize(f.size)}
                                {!f.is_pdf && ' · download to open'}
                            </p>
                        </div>
                        <div className="ml-auto flex shrink-0 gap-2">
                            {f.is_pdf && (
                                <button
                                    type="button"
                                    onClick={() => setOpen(f)}
                                    aria-label={`Preview ${f.name}`}
                                    className={cn(
                                        rowBtn,
                                        'border-[#0197F6] bg-[#0197F6] text-white hover:bg-[#0680d1]',
                                    )}
                                >
                                    <Eye size={15} /> Preview
                                </button>
                            )}
                            <a
                                href={f.download_url}
                                download={f.name}
                                aria-label={`Download ${f.name}`}
                                title="Download"
                                className={cn(
                                    rowBtn,
                                    'border-border bg-card hover:bg-muted',
                                )}
                            >
                                <Download size={15} />
                                <span className="hidden sm:inline">
                                    Download
                                </span>
                            </a>
                        </div>
                    </li>
                ))}
            </ul>

            <Dialog
                open={open !== null}
                onOpenChange={(v) => !v && setOpen(null)}
            >
                <DialogContent className="flex h-[88vh] max-w-[calc(100%-1rem)] flex-col gap-3 p-4 sm:max-w-4xl">
                    <div className="flex items-center gap-3 pr-8">
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="truncate text-base">
                                {open?.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                PDF preview
                            </DialogDescription>
                        </div>
                        {open && (
                            <a
                                href={open.download_url}
                                download={open.name}
                                className={cn(
                                    rowBtn,
                                    'shrink-0 border-border bg-card hover:bg-muted',
                                )}
                            >
                                <Download size={15} /> Download
                            </a>
                        )}
                    </div>
                    {open && (
                        <iframe
                            key={open.id}
                            src={open.url}
                            title={`Preview of ${open.name}`}
                            className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
                        />
                    )}
                    {open && (
                        <p className="text-center text-xs text-muted-foreground">
                            Preview not showing on your phone?{' '}
                            <a
                                href={open.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0777bd] underline dark:text-[#4cb9f8]"
                            >
                                Open it in a new tab
                            </a>
                            .
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * File chooser for forms. `existing` are files already saved on the post (edit forms): ticking the X marks them
 * for removal (sent as remove_files[]). New picks are kept in `files` until the form is saved.
 * The checks here are only for quick, friendly messages; the server validates type, size and count again.
 */
export function AttachmentPicker({
    files,
    onFiles,
    existing = [],
    removedIds = [],
    onRemoveExisting,
    error,
}: {
    files: File[];
    onFiles: (files: File[]) => void;
    existing?: Attachment[];
    removedIds?: number[];
    onRemoveExisting?: (ids: number[]) => void;
    error?: string;
}) {
    const [localError, setLocalError] = useState<string | null>(null);
    const keptExisting = existing.filter((e) => !removedIds.includes(e.id));
    const total = keptExisting.length + files.length;

    const pick = (list: FileList | null) => {
        if (!list || list.length === 0) {
            return;
        }

        const next = [...files];
        let problem: string | null = null;

        for (const f of Array.from(list)) {
            if (!FILE_EXT.includes(extOf(f.name))) {
                problem = `“${f.name}” is not allowed. Use PDF, Word, Excel or PowerPoint.`;
            } else if (f.size > MAX_FILE_MB * 1024 * 1024) {
                problem = `“${f.name}” is over ${MAX_FILE_MB} MB.`;
            } else if (keptExisting.length + next.length >= MAX_FILES) {
                problem = `You can attach up to ${MAX_FILES} files.`;
            } else {
                next.push(f);
            }
        }

        setLocalError(problem);
        onFiles(next);
    };

    const rows = [
        ...keptExisting.map((e) => ({
            key: `e${e.id}`,
            name: e.name,
            size: e.size,
            remove: () => onRemoveExisting?.([...removedIds, e.id]),
        })),
        ...files.map((f, i) => ({
            key: `n${i}${f.name}`,
            name: f.name,
            size: f.size,
            remove: () => onFiles(files.filter((_, idx) => idx !== i)),
        })),
    ];

    return (
        <div className="space-y-2">
            {rows.length > 0 && (
                <ul className="space-y-2">
                    {rows.map((r) => (
                        <li
                            key={r.key}
                            className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2"
                        >
                            <FileBadge name={r.name} />
                            <div className="min-w-0 flex-1">
                                <p
                                    className="truncate text-sm font-medium"
                                    title={r.name}
                                >
                                    {r.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatSize(r.size)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={r.remove}
                                aria-label={`Remove ${r.name}`}
                                className="rounded-full p-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#0197F6]"
                            >
                                <X size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <label
                className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[#0777bd] focus-within:ring-2 focus-within:ring-[#0197F6] hover:bg-muted dark:text-[#4cb9f8]',
                    total >= MAX_FILES && 'pointer-events-none opacity-50',
                )}
            >
                <Paperclip size={17} /> Attach files (PDF, Word, Excel…)
                <input
                    type="file"
                    multiple
                    accept={FILE_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                        pick(e.target.files);
                        e.target.value = '';
                    }}
                />
            </label>
            <p className="text-xs text-muted-foreground">
                Up to {MAX_FILES} files, {MAX_FILE_MB} MB each.
            </p>
            {(localError || error) && (
                <p role="alert" className="text-xs text-[#D7263D]">
                    {localError || error}
                </p>
            )}
        </div>
    );
}

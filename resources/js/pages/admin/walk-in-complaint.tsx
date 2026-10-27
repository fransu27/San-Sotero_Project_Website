import { Head, Link, usePage, router } from '@inertiajs/react';
import {
    ArrowLeft,
    FileText,
    Printer,
    ShieldCheck,
    Upload,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

type Receipt = { ticket_code: string; pin: string; reporter_name: string };
type Props = { categories: string[] };

export default function WalkInComplaint({ categories }: Props) {
    const { flash } = usePage().props as unknown as {
        flash?: { walk_in_receipt?: Receipt };
    };
    const receipt = flash?.walk_in_receipt;
    const printReceipt = () => {
        if (!receipt) return;
        const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
        const printWindow = window.open('', '_blank', 'width=820,height=900');
        if (!printWindow) { window.alert('Your browser blocked the receipt print tab. Allow pop-ups for this site, then choose Print receipt again.'); return; }
        printWindow.document.open();
        printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>San Sotero Walk-In Complaint Receipt</title><style>@page{size:A4 portrait;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12pt}header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:16px}header img{width:58px;height:58px;object-fit:contain}h1{font-size:20pt;margin:3px 0 5px}p{line-height:1.5;margin:8px 0}.muted{font-size:9pt;color:#444}.field{border:1px solid #555;border-radius:6px;padding:14px;margin-top:14px}.label{font-size:9pt;text-transform:uppercase;letter-spacing:.08em;color:#333}.value{font-size:20pt;font-weight:bold;font-family:monospace;overflow-wrap:anywhere}.columns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:70px;font-size:9pt}.line{border-top:1px solid #555;padding-top:7px}</style></head><body><header><img src="${window.location.origin}/images/logo.png" alt=""><div><p class="muted">SAN SOTERO · BARANGAY OFFICE</p><h1>Walk-In Complaint Receipt</h1><p class="muted">Issued ${escapeHtml(new Date().toLocaleString())}</p></div></header><p><strong>Resident / complainant:</strong> ${escapeHtml(receipt.reporter_name)}</p><p>This receipt confirms that the barangay desk recorded a walk-in concern. Keep the tracking reference and private PIN to check status updates.</p><div class="columns"><section class="field"><p class="label">Tracking reference</p><p class="value">${escapeHtml(receipt.ticket_code)}</p></section><section class="field"><p class="label">Private tracking PIN</p><p class="value">${escapeHtml(receipt.pin)}</p></section></div><div class="columns"><section class="field"><strong>Next step</strong><p>Open ${escapeHtml(window.location.origin)}/track-complaint and enter the reference and PIN to check updates.</p></section><section class="field"><strong>Privacy reminder</strong><p>Keep the PIN confidential. Barangay staff will use the submitted details for official handling.</p></section></div><div class="signatures"><div class="line">Resident / complainant signature</div><div class="line">Receiving officer signature</div></div></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        // The receipt opens as a clean, separate print document. Browsers can then print it or save it as a PDF.
        window.setTimeout(() => { if (!printWindow.closed) printWindow.print(); }, 350);
    };
    const [form, setForm] = useState({
        reporter_name: '',
        reporter_contact: '',
        title: '',
        description: '',
        location: '',
        category: 'Infrastructure',
        custom_category: '',
        incident_date: new Date().toISOString().slice(0, 10),
    });
    const [image, setImage] = useState<File | null>(null);
    const [files, setFiles] = useState<FileList | null>(null);
    const [fileError, setFileError] = useState('');
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const update = (key: keyof typeof form, value: string) =>
        setForm((current) => ({ ...current, [key]: value }));
    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));

        if (image) {
            data.append('image', image);
        }

        if (files) {
            Array.from(files).forEach((file) => data.append('files[]', file));
        }

        router.post('/admin/walk-in-complaints', data, {
            forceFormData: true,
            onError: (next) => setErrors(next as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    };
    const inputClass =
        'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

    return (
        <>
            <Head title="Walk-In Complaint" />
            <div className="walk-in-complaint-page mx-auto max-w-3xl space-y-5 pb-10">
                <Link
                    href="/admin/moderation"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={16} /> Back to moderation
                </Link>
                <header>
                    <p className="text-xs font-semibold tracking-widest text-sky-600 uppercase">
                        Assisted reporting
                    </p>
                    <h1 className="mt-1 text-2xl font-bold">
                        Walk-In Complaint
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Use this form when a resident visits the Barangay Hall
                        and cannot submit online. Read the complaint back to the
                        resident before saving.
                    </p>
                </header>
                {receipt && (
                    <section
                        className="walk-in-print-area rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-5"
                        aria-live="polite"
                    >
                        <div className="receipt-brand flex items-center gap-3 border-b border-border pb-4">
                            <img src="/images/logo.png" alt="San Sotero logo" className="size-12 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <div><p className="text-xs font-bold uppercase tracking-[.16em]">San Sotero · Barangay Office</p><h2 className="mt-1 text-lg font-bold">Walk-In Complaint Receipt</h2><p className="text-xs text-muted-foreground">Official tracking copy · Issued {new Date().toLocaleString()}</p></div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 font-semibold print:hidden">
                            <ShieldCheck className="text-emerald-600" />{' '}
                            Complaint recorded — print or copy this receipt
                        </div>
                        <p className="mt-4 text-sm"><span className="font-semibold">Resident / complainant:</span> {receipt.reporter_name}</p>
                        <p className="mt-1 text-sm">This receipt confirms that the barangay desk recorded a walk-in concern. Keep the reference and PIN for private status checks.</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-background p-3">
                                <p className="text-xs text-muted-foreground">
                                    Tracking reference
                                </p>
                                <p className="font-mono text-lg font-bold">
                                    {receipt.ticket_code}
                                </p>
                            </div>
                            <div className="rounded-xl bg-background p-3">
                                <p className="text-xs text-muted-foreground">
                                    Private tracking PIN
                                </p>
                                <p className="font-mono text-lg font-bold">
                                    {receipt.pin}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 print:grid-cols-2"><div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold uppercase tracking-wide">Next step</p><p className="mt-1 text-sm">Visit the San Sotero tracking page and enter the reference number and PIN to check updates.</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold uppercase tracking-wide">Privacy reminder</p><p className="mt-1 text-sm">Keep the PIN confidential. Barangay staff will use the submitted details for official handling of the concern.</p></div></div>
                        <div className="mt-8 grid grid-cols-2 gap-8 text-xs"><div className="border-t border-slate-500 pt-2">Resident / complainant signature</div><div className="border-t border-slate-500 pt-2">Receiving officer signature</div></div>
                        <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                            <button
                                onClick={printReceipt}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                            >
                                <Printer size={16} /> Print receipt
                            </button>
                            <button
                                onClick={() =>
                                    navigator.clipboard?.writeText(
                                        `San Sotero complaint receipt\nReference: ${receipt.ticket_code}\nPIN: ${receipt.pin}\nTrack at: ${window.location.origin}/track-complaint`,
                                    )
                                }
                                className="rounded-lg border px-3 py-2 text-sm"
                            >
                                Copy receipt details
                            </button>
                        </div>
                    </section>
                )}
                <form
                    onSubmit={submit}
                    className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
                >
                    {Object.keys(errors).length > 0 && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300"
                        >
                            <p className="font-semibold">
                                Please review the following fields:
                            </p>
                            <ul className="mt-1 list-inside list-disc space-y-1">
                                {fileError && <p role="alert" className="text-sm text-red-600">{fileError}</p>}
                        {(image || (files && files.length > 0)) && <div className="grid gap-3 sm:grid-cols-2">{image && <div className="rounded-xl border p-3"><p className="mb-2 text-sm font-medium">Photo preview</p><img src={URL.createObjectURL(image)} alt="Selected complaint evidence preview" className="max-h-64 w-full rounded-lg object-contain" /></div>}{files && Array.from(files).map((file, i) => <div key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-xl border p-3 text-sm"><FileText size={22} className="shrink-0 text-sky-700"/><div className="min-w-0"><p className="break-all font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || 'Document'}</p>{file.type === 'application/pdf' && <a href={URL.createObjectURL(file)} target="_blank" rel="noreferrer" className="text-sky-700 underline">Preview PDF</a>}</div></div>)}</div>}
                        {Object.entries(errors).map(([key, message]) => (
                                    <li key={key}>{message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <section className="space-y-3">
                        <h2 className="font-semibold">Resident information</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1 text-sm">
                                <span>Resident name *</span>
                                <input
                                    id="reporter-name"
                                    aria-invalid={Boolean(errors.reporter_name)}
                                    aria-describedby={
                                        errors.reporter_name
                                            ? 'reporter-name-error'
                                            : undefined
                                    }
                                    required
                                    maxLength={120}
                                    className={inputClass}
                                    value={form.reporter_name}
                                    onChange={(e) =>
                                        update('reporter_name', e.target.value)
                                    }
                                />
                                {errors.reporter_name && (
                                    <small id="reporter-name-error" role="alert" className="text-red-600">
                                        {errors.reporter_name}
                                    </small>
                                )}
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>Contact number (optional)</span>
                                <input
                                    id="reporter-contact"
                                    aria-invalid={Boolean(errors.reporter_contact)}
                                    aria-describedby={
                                        errors.reporter_contact
                                            ? 'reporter-contact-error'
                                            : undefined
                                    }
                                    maxLength={80}
                                    className={inputClass}
                                    value={form.reporter_contact}
                                    onChange={(e) =>
                                        update(
                                            'reporter_contact',
                                            e.target.value,
                                        )
                                    }
                                />
                                {errors.reporter_contact && (
                                    <small id="reporter-contact-error" role="alert" className="text-red-600">
                                        {errors.reporter_contact}
                                    </small>
                                )}
                            </label>
                        </div>
                    </section>
                    <section className="space-y-3">
                        <h2 className="font-semibold">Concern details</h2>
                        <label className="block space-y-1 text-sm">
                            <span>Concern title *</span>
                            <input
                                id="concern-title"
                                aria-invalid={Boolean(errors.title)}
                                aria-describedby={
                                    errors.title ? 'concern-title-error' : undefined
                                }
                                required
                                maxLength={150}
                                className={inputClass}
                                value={form.title}
                                onChange={(e) =>
                                    update('title', e.target.value)
                                }
                            />
                            {errors.title && (
                                <small id="concern-title-error" role="alert" className="text-red-600">
                                    {errors.title}
                                </small>
                            )}
                        </label>
                        <label className="block space-y-1 text-sm">
                            <span>Description *</span>
                            <textarea
                                id="concern-description"
                                aria-invalid={Boolean(errors.description)}
                                aria-describedby={
                                    errors.description
                                        ? 'concern-description-error'
                                        : undefined
                                }
                                required
                                maxLength={3000}
                                rows={5}
                                className={inputClass}
                                value={form.description}
                                onChange={(e) =>
                                    update('description', e.target.value)
                                }
                            />
                            {errors.description && (
                                <small id="concern-description-error" role="alert" className="text-red-600">
                                    {errors.description}
                                </small>
                            )}
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1 text-sm">
                                <span>Location / purok *</span>
                                <input
                                    id="concern-location"
                                    aria-invalid={Boolean(errors.location)}
                                    aria-describedby={
                                        errors.location
                                            ? 'concern-location-error'
                                            : undefined
                                    }
                                    required
                                    maxLength={150}
                                    className={inputClass}
                                    value={form.location}
                                    onChange={(e) =>
                                        update('location', e.target.value)
                                    }
                                />
                                {errors.location && (
                                    <small id="concern-location-error" role="alert" className="text-red-600">
                                        {errors.location}
                                    </small>
                                )}
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>Category *</span>
                                <select
                                    className={inputClass}
                                    value={form.category}
                                    onChange={(e) =>
                                        update('category', e.target.value)
                                    }
                                >
                                    {categories.map((category) => (
                                        <option key={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        {form.category === 'Others' && (
                            <label className="block space-y-1 text-sm">
                                <span>Specify category *</span>
                                <input
                                    required
                                    minLength={2}
                                    maxLength={60}
                                    className={inputClass}
                                    value={form.custom_category}
                                    onChange={(e) =>
                                        update(
                                            'custom_category',
                                            e.target.value,
                                        )
                                    }
                                />
                            </label>
                        )}
                        <label className="block space-y-1 text-sm">
                            <span>Date of incident *</span>
                            <input
                                type="date"
                                required
                                max={new Date().toISOString().slice(0, 10)}
                                className={inputClass}
                                value={form.incident_date}
                                onChange={(e) =>
                                    update('incident_date', e.target.value)
                                }
                            />
                        </label>
                    </section>
                    <section className="space-y-3">
                        <h2 className="font-semibold">
                            Supporting evidence (optional)
                        </h2>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-sm">
                            <Upload size={18} />
                            <span className="min-w-0 flex-1">
                                {image
                                    ? `${image.name} · ${(image.size / 1024 / 1024).toFixed(2)} MB`
                                    : 'Attach one photo (JPG, PNG, WebP; up to 4 MB)'}
                            </span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="max-w-40 text-xs"
                                onChange={(e) => {
                                    const selected = e.target.files?.[0] ?? null;
                                    if (selected && selected.size > 4 * 1024 * 1024) { setFileError('Photo exceeds the 4 MB limit.'); e.target.value = ''; setImage(null); return; }
                                    const docsSize = files ? Array.from(files).reduce((sum, f) => sum + f.size, 0) : 0;
                                    if (selected && selected.size + docsSize > 10 * 1024 * 1024) { setFileError('All selected evidence, including the photo, must stay within 10 MB total.'); e.target.value = ''; setImage(null); return; }
                                    setFileError(''); setImage(selected);
                                }}
                            />
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-sm">
                            <FileText size={18} />
                            <span className="min-w-0 flex-1">
                                {files?.length
                                    ? `${files.length} document(s): ${Array.from(files).map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`).join(', ')}`
                                    : 'Attach up to 5 documents (PDF, DOC, DOCX, ODT, TXT; 10 MB combined evidence limit)'}
                            </span>
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.odt,.txt"
                                className="max-w-40 text-xs"
                                onChange={(e) => { const selected = e.target.files; const total = selected ? Array.from(selected).reduce((sum, f) => sum + f.size, 0) : 0; const tooLarge = selected && Array.from(selected).some(f => f.size > 10 * 1024 * 1024); const combined = total + (image?.size ?? 0); if (tooLarge || (selected && selected.length > 5) || combined > 10 * 1024 * 1024) { setFileError(tooLarge ? 'Each document must be 10 MB or smaller.' : (selected && selected.length > 5) ? 'Select no more than five documents.' : 'All selected evidence, including the photo, must stay within 10 MB total.'); e.target.value = ''; setFiles(null); return; } setFileError(''); setFiles(selected); }}
                            />
                        </label>
                        {fileError && <p role="alert" className="text-sm text-red-600">{fileError}</p>}
                        {(image || (files && files.length > 0)) && <div className="grid gap-3 sm:grid-cols-2">{image && <div className="rounded-xl border p-3"><p className="mb-2 text-sm font-medium">Photo preview</p><img src={URL.createObjectURL(image)} alt="Selected complaint evidence preview" className="max-h-64 w-full rounded-lg object-contain" /></div>}{files && Array.from(files).map((file, i) => <div key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-xl border p-3 text-sm"><FileText size={22} className="shrink-0 text-sky-700"/><div className="min-w-0"><p className="break-all font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || 'Document'}</p>{file.type === 'application/pdf' && <a href={URL.createObjectURL(file)} target="_blank" rel="noreferrer" className="text-sky-700 underline">Preview PDF</a>}</div></div>)}</div>}
                        {Object.entries(errors)
                            .filter(
                                ([key]) =>
                                    key.startsWith('files') || key === 'image',
                            )
                            .map(([key, value]) => (
                                <p key={key} role="alert" className="text-sm text-red-600">
                                    {value}
                                </p>
                            ))}
                    </section>
                    <aside className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                        This intake is private by default. Do not promise a
                        resolution date. Give the resident their tracking
                        reference and PIN, and do not write the PIN in public
                        notes.
                    </aside>
                    <button
                        disabled={busy}
                        className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                    >
                        {busy
                            ? 'Saving complaint…'
                            : 'Record Walk-In Complaint'}
                    </button>
                </form>
            </div>
        </>
    );
}

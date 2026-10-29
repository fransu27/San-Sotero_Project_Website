import { router } from '@inertiajs/react';
import { Flag } from 'lucide-react';
import { useState } from 'react';

const reasons = [
    ['Misinformation', 'Misinformation'],
    ['Harassment or hate', 'Harassment or hate'],
    ['Inappropriate content', 'Inappropriate content'],
    ['Spam or scam', 'Spam or scam'],
    ['Privacy concern', 'Privacy concern'],
    ['Other', 'Other'],
] as const;

/** Add to the action row of an approved, public Complaint card. The server remains authoritative. */
export function ModerationActions({
    complaintId,
    canReport = true,
}: {
    complaintId: number;
    canReport?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<(typeof reasons)[number][0]>(
        'Inappropriate content',
    );
    const [details, setDetails] = useState('');
    const [message, setMessage] = useState('');

    function submitReport() {
        router.post(
            `/complaints/${complaintId}/report`,
            { reason, details: details.trim() || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpen(false);
                    setDetails('');
                    setMessage('Report submitted for review');
                },
                onError: () =>
                    setMessage(
                        'Unable to submit report. You may already have reported this post.',
                    ),
            },
        );
    }

    if (!canReport) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {canReport && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                    <Flag size={15} /> Report
                </button>
            )}
            {message && (
                <span role="status" className="text-xs text-muted-foreground">
                    {message}
                </span>
            )}
            {open && (
                <div className="basis-full space-y-3 rounded-lg border p-3">
                    <label
                        className="block text-sm font-medium"
                        htmlFor={`report-reason-${complaintId}`}
                    >
                        Why are you reporting this post?
                    </label>
                    <select
                        id={`report-reason-${complaintId}`}
                        value={reason}
                        onChange={(e) =>
                            setReason(e.target.value as typeof reason)
                        }
                        className="w-full rounded-md border bg-background p-2 text-sm"
                    >
                        {reasons.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        maxLength={1000}
                        rows={3}
                        placeholder="Optional details (max 1000 characters)"
                        className="w-full rounded-md border bg-background p-2 text-sm"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={submitReport}
                            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                        >
                            Submit report
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-md border px-3 py-2 text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

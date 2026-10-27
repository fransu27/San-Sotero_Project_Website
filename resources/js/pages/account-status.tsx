import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Clock3, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

type Props = { status: 'restricted' | 'banned' | string; reason: string; expiresAt: string | null };
export default function AccountStatus({ status, reason, expiresAt }: Props) {
    const [message, setMessage] = useState('');
    const [processing, setProcessing] = useState(false);
    const banned = status === 'banned';
    const submit = () => {
        setProcessing(true);
        router.post('/account-status/appeal', { appeal_type: 'account', message }, { onFinish: () => setProcessing(false), preserveScroll: true });
    };
    return <div className="min-h-screen bg-background px-4 py-12 text-foreground"><Head title={banned ? 'Account banned' : 'Account restricted'} /><main className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-9"><div className={`mb-5 flex size-14 items-center justify-center rounded-2xl ${banned ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'}`}>{banned ? <ShieldAlert size={28}/> : <Clock3 size={28}/>}</div><p className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">Account notice</p><h1 className="mt-2 text-3xl font-bold">{banned ? 'Your account has been banned' : 'Your account is temporarily restricted'}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">You cannot create posts or interact with community content while this action is active. You cannot bypass this restriction by navigating to another page.</p><div className="mt-6 rounded-xl border border-border bg-muted/40 p-4"><p className="text-sm font-semibold">Reason provided by the administrator</p><p className="mt-1 text-sm">{reason}</p>{expiresAt && !banned && <p className="mt-3 text-xs text-muted-foreground">Restriction expires: {new Date(expiresAt).toLocaleString()}</p>}</div><section className="mt-7"><h2 className="text-lg font-semibold">Appeal this decision</h2><p className="mt-1 text-sm text-muted-foreground">Explain why you believe this action should be reviewed. An administrator will review your appeal.</p><textarea value={message} onChange={e=>setMessage(e.target.value)} minLength={20} maxLength={2000} rows={5} className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="Write your appeal (at least 20 characters)…"/><button disabled={processing || message.trim().length < 20} onClick={submit} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{processing ? 'Submitting…' : 'Submit appeal'}</button><button onClick={()=>router.post('/logout')} className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-medium">Log out</button></section></main></div>;
}

import {
    ChevronRight,
    MessageCircle,
    Send,
    X,
    Bot,
    LoaderCircle,
} from 'lucide-react';
import { useState } from 'react';
import ReportPopout from '@/components/feed/report-popout';

/** A report the assistant lists. `ticket_code` is only ever sent for the person's own reports (and to admins). */
type ReportItem = {
    id: number;
    title: string;
    category: string;
    status: string;
    ticket_code: string | null;
};
type Message = {
    role: 'assistant' | 'user';
    text: string;
    items?: ReportItem[];
};
export default function AssistantChat() {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [openReport, setOpenReport] = useState<number | null>(null); // report shown in the pop-out
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            text: 'Hi! I can help you check today’s updates, your reports, and ticket progress. Try “What was posted today?” or enter your ticket code.',
        },
    ]);
    async function send(text = draft) {
        const message = text.trim();

        if (!message || busy) {
            return;
        }

        setMessages((old) => [...old, { role: 'user', text: message }]);
        setDraft('');
        setBusy(true);

        try {
            const token = document.querySelector<HTMLMetaElement>(
                'meta[name="csrf-token"]',
            )?.content;
            const response = await fetch('/assistant/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: JSON.stringify({ message }),
                credentials: 'same-origin',
            });
            const data = await response.json();
            setMessages((old) => [
                ...old,
                {
                    role: 'assistant',
                    text: response.ok
                        ? (data.answer ?? 'Sorry, I could not find an answer.')
                        : (data.message ??
                          'I could not process that request. Please try again.'),
                    items: response.ok ? data.items : undefined,
                },
            ]);
        } catch {
            setMessages((old) => [
                ...old,
                {
                    role: 'assistant',
                    text: 'I could not connect just now. Please try again.',
                },
            ]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed right-4 bottom-4 z-40">
            <ReportPopout id={openReport} onClose={() => setOpenReport(null)} />
            {open && (
                <section
                    className="chat-panel-enter mb-3 flex h-[min(70vh,520px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                    aria-label="San Sotero assistant"
                >
                    <header className="flex items-center justify-between bg-[#06263A] px-4 py-3 text-white">
                        <div className="flex items-center gap-2">
                            <Bot size={20} />
                            <div>
                                <p className="text-sm font-semibold">
                                    San Sotero Assistant
                                </p>
                                <p className="text-[11px] text-white/70">
                                    Report and update help
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close assistant"
                            className="rounded-lg p-1.5 hover:bg-white/10"
                        >
                            <X size={18} />
                        </button>
                    </header>
                    <div
                        className="flex-1 space-y-3 overflow-y-auto p-3"
                        aria-live="polite"
                    >
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`chat-msg-enter ${m.items?.length ? 'w-[90%]' : ''} max-w-[90%] rounded-xl px-3 py-2 text-sm leading-5 whitespace-pre-wrap ${m.role === 'user' ? 'ml-auto bg-[#0197F6] text-white' : 'mr-auto bg-muted text-foreground'}`}
                            >
                                {m.text.split('\n').map((line, li) => (
                                    <span key={li} className="block">
                                        {line}
                                    </span>
                                ))}
                                {m.items && m.items.length > 0 && (
                                    <ul className="mt-2 space-y-1.5">
                                        {m.items.map((r) => (
                                            <li key={r.id}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setOpenReport(r.id)
                                                    }
                                                    aria-label={`Open report: ${r.title}`}
                                                    className="chat-report-row group flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left hover:border-[#0197F6]/60"
                                                >
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-semibold">
                                                            {r.title}
                                                        </span>
                                                        <span className="block truncate text-[11px] text-muted-foreground">
                                                            {r.category} ·{' '}
                                                            {r.status}
                                                            {r.ticket_code &&
                                                                ` · ${r.ticket_code}`}
                                                        </span>
                                                    </span>
                                                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-[#0670b3] dark:text-[#5cc0fa]">
                                                        Open report
                                                        <ChevronRight
                                                            size={14}
                                                            className="transition-transform duration-300 group-hover:translate-x-1"
                                                        />
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                        {busy && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />{' '}
                                Checking report information…
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                        {[
                            'What was posted today?',
                            'Latest reports',
                            'Best reports',
                            'Hot reports',
                            'Show my reports',
                            'Waiting for approval',
                        ].map((q) => (
                            <button
                                key={q}
                                onClick={() => send(q)}
                                disabled={busy}
                                className="rounded-full border border-border px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                    <form
                        className="flex gap-2 border-t border-border p-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void send();
                        }}
                    >
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={500}
                            placeholder="Ask about a ticket or update…"
                            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                        <button
                            aria-label="Send message"
                            disabled={busy || !draft.trim()}
                            className="rounded-lg bg-[#0197F6] px-3 text-white disabled:opacity-50"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </section>
            )}
            <button
                onClick={() => setOpen(!open)}
                aria-label={
                    open ? 'Close chat assistant' : 'Open chat assistant'
                }
                className="chat-fab ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0197F6] text-white shadow-xl"
            >
                <MessageCircle size={24} />
            </button>
        </div>
    );
}

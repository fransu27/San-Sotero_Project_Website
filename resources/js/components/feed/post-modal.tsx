import { router } from '@inertiajs/react';
import { Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/feed/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/use-locale';

/**
 * Facebook-style pop-out for a post: the post itself on top, its comments underneath and the comment box pinned
 * to the bottom. Used by both complaint posts and announcements, so the two behave the same.
 *
 * The caller passes the post content (`children`) and the comments; this component only DRAWS them and calls
 * `onSend` when someone posts a comment. The server still checks who may comment and throttles it.
 * Comment text is rendered by React (auto-escaped), never as HTML.
 */
export type ModalComment = {
    id: number;
    body: string;
    author: string | null;
    avatar: string | null;
    staff: boolean;
    mine?: boolean;
    delete_url?: string;
};

export default function PostModal({
    open,
    onOpenChange,
    title,
    children,
    comments,
    canComment = true,
    onSend,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Heading of the pop-out, e.g. "Maria's post". */
    title: string;
    children: ReactNode;
    comments: ModalComment[];
    canComment?: boolean;
    /** Return a promise-like "done" by calling `done()` once the comment was saved so the box can clear. */
    onSend: (body: string, done: () => void) => void;
}) {
    const { t } = useLocale();
    const [body, setBody] = useState('');
    const scroller = useRef<HTMLDivElement>(null);
    const lastCount = useRef(comments.length);

    // A new comment (yours or someone else's, arriving through the 15 s refresh) scrolls the thread to the end.
    useEffect(() => {
        if (open && comments.length > lastCount.current) {
            scroller.current?.scrollTo({
                top: scroller.current.scrollHeight,
                behavior: 'smooth',
            });
        }

        lastCount.current = comments.length;
    }, [comments.length, open]);

    const send = () => {
        const text = body.trim();

        if (text) {
            onSend(text, () => setBody(''));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
                aria-describedby="post-modal-desc"
            >
                <div className="border-b border-border px-5 py-3.5 text-center">
                    <DialogTitle className="truncate px-8 text-base leading-6">
                        {title}
                    </DialogTitle>
                    <DialogDescription id="post-modal-desc" className="sr-only">
                        {t('post.comment')}
                    </DialogDescription>
                </div>

                <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
                    {children}

                    <div className="space-y-3 border-t border-border px-4 py-4">
                        {comments.length === 0 && (
                            <p className="py-2 text-center text-sm text-muted-foreground">
                                {t('post.comment')}: 0
                            </p>
                        )}
                        {comments.map((m) => (
                            <div key={m.id} className="flex gap-2">
                                <Avatar
                                    name={m.author ?? t('post.anon')}
                                    src={m.avatar}
                                    anonymous={m.author === null}
                                    staff={m.staff}
                                    size={32}
                                />
                                <div className="min-w-0 rounded-2xl bg-[#F0F2F5] px-3 py-1.5 text-[13px] leading-5 dark:bg-muted">
                                    <span className="font-semibold">
                                        {m.author ?? t('post.anon')}
                                    </span>
                                    {m.staff && (
                                        <span className="ml-1 rounded bg-[#0197F6] px-1.5 py-0.5 text-[10px] text-white">
                                            {t('post.barangay')}
                                        </span>
                                    )}
                                    <div className="flex items-start gap-2">
                                        <p className="min-w-0 flex-1 break-words whitespace-pre-line">
                                            {m.body}
                                        </p>
                                        {m.mine && (
                                            <button
                                                type="button"
                                                aria-label="Delete my comment"
                                                title="Delete comment"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            'Delete this comment?',
                                                        )
                                                    ) {
                                                        router.delete(
                                                            m.delete_url ??
                                                                `/comments/${m.id}`,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        );
                                                    }
                                                }}
                                                className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {canComment && (
                    <div className="flex gap-2 border-t border-border bg-card px-4 py-3">
                        <input
                            value={body}
                            maxLength={1000}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && send()}
                            placeholder={t('post.writeComment')}
                            aria-label={t('post.writeComment')}
                            className="w-full rounded-full bg-[#F0F2F5] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0197F6]/40 dark:bg-muted"
                        />
                        <button
                            type="button"
                            onClick={send}
                            disabled={!body.trim()}
                            aria-label={t('post.sendComment')}
                            className="rounded-full bg-[#0197F6] p-2.5 text-white disabled:opacity-50"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

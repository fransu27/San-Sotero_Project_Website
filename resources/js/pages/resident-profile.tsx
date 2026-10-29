import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    LockKeyhole,
    ShieldCheck,
    UserRound,
    ZoomIn,
    ThumbsUp,
    MessageCircle,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
type Comment = {
    id: number;
    name: string;
    body: string;
    created_at: string | null;
};
type Post = {
    id: number;
    title: string;
    description: string;
    category: string;
    location: string;
    status: string;
    approval_status: string;
    created_at: string | null;
    image_url: string | null;
    visibility: string;
    removed: boolean;
    reactions: number;
    comments_count: number;
    comments: Comment[];
};
type Props = {
    profile: {
        id: number;
        name: string;
        avatar: string | null;
        private: boolean;
        anonymous: boolean;
        isOwner: boolean;
        isAdminViewer: boolean;
        isAuthenticated: boolean;
        posts: Post[];
    };
};
export default function ResidentProfile({ profile }: Props) {
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    const [commentText, setCommentText] = useState<Record<number, string>>({});
    const react = (id: number) =>
        router.post(
            `/complaints/${id}/react`,
            { type: 'satisfied' },
            { preserveScroll: true },
        );
    const comment = (id: number) => {
        const body = (commentText[id] || '').trim();

        if (!body) {
            return;
        }

        router.post(
            `/complaints/${id}/comments`,
            { body },
            {
                preserveScroll: true,
                onSuccess: () => setCommentText((v) => ({ ...v, [id]: '' })),
            },
        );
    };
    const remove = (id: number) => {
        const reason = window.prompt(
            'Reason for removing this post (at least 5 characters):',
        );

        if (reason && reason.trim().length >= 5) {
            router.patch(
                `/complaints/${id}/remove`,
                { reason: reason.trim() },
                { preserveScroll: true },
            );
        }
    };
    const moderate = (id: number, status: string) =>
        router.patch(
            `/complaints/${id}/status`,
            { status },
            { preserveScroll: true },
        );

    return (
        <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-7">
            <Head title={`${profile.name} · Resident profile`} />
            <Link
                href={profile.isAdminViewer ? '/admin/residents' : '/newsfeed'}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft size={16} /> Back
            </Link>
            <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="h-28 bg-gradient-to-r from-[#0197F6]/20 via-[#68C5DB]/15 to-transparent" />
                <div className="-mt-12 flex flex-wrap items-end gap-4 px-5 pb-5 sm:px-7">
                    <div className="flex size-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-card bg-muted text-2xl font-bold">
                        {profile.avatar ? (
                            <img
                                src={profile.avatar}
                                alt=""
                                className="size-full object-cover"
                            />
                        ) : (
                            <UserRound />
                        )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                        <h1 className="text-2xl font-bold">{profile.name}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Resident profile · {profile.posts.length}{' '}
                            {profile.posts.length === 1 ? 'post' : 'posts'}
                        </p>
                    </div>
                    {profile.private && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                            <LockKeyhole size={13} /> Private
                        </span>
                    )}
                    {profile.isAdminViewer && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                            <ShieldCheck size={13} /> Admin view
                        </span>
                    )}
                </div>
            </section>
            <section className="space-y-3">
                <div>
                    <h2 className="text-lg font-semibold">Posts</h2>
                    <p className="text-sm text-muted-foreground">
                        Only posts your account is authorized to see are shown.
                        Administrator controls are available only to authorized
                        staff.
                    </p>
                </div>
                {profile.posts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                        <p className="font-medium">No posts to show</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            This resident has no posts visible to your account.
                        </p>
                    </div>
                ) : (
                    profile.posts.map((post) => (
                        <article
                            key={post.id}
                            className={`overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 ${post.removed ? 'border-red-500/40' : ''}`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold">
                                        {post.title}
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {post.category} · {post.location} ·{' '}
                                        {post.created_at
                                            ? new Date(
                                                  post.created_at,
                                              ).toLocaleString()
                                            : 'Date unavailable'}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs ${post.removed ? 'bg-red-500/10 text-red-700' : 'bg-muted'}`}
                                >
                                    {post.removed ? 'Removed' : post.status}
                                </span>
                            </div>
                            {post.image_url && (
                                <div className="group relative mt-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZoomImage(post.image_url)
                                        }
                                        aria-label="Zoom post image"
                                        className="relative block w-full cursor-zoom-in overflow-hidden rounded-xl bg-muted"
                                    >
                                        <img
                                            src={post.image_url}
                                            alt="Attached to this post"
                                            className="max-h-[28rem] w-full object-contain"
                                        />
                                        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-lg bg-black/70 px-3 py-2 text-xs font-semibold text-white">
                                            <ZoomIn size={15} /> View / zoom
                                        </span>
                                    </button>
                                </div>
                            )}
                            {post.removed && (
                                <p className="mt-3 rounded-lg bg-red-500/5 p-3 text-sm text-red-700">
                                    This post has been removed from public view.
                                </p>
                            )}
                            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">
                                {post.description}
                            </p>
                            {(profile.isOwner || profile.isAdminViewer) &&
                                post.visibility === 'private' && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Private post · visible only to the owner
                                        and administrators.
                                    </p>
                                )}
                            {profile.isAuthenticated && (
                                <>
                                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                                        <button
                                            type="button"
                                            onClick={() => react(post.id)}
                                            disabled={
                                                post.removed ||
                                                post.approval_status !==
                                                    'approved'
                                            }
                                            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40"
                                        >
                                            <ThumbsUp size={16} /> Like / react{' '}
                                            <span className="text-muted-foreground">
                                                {post.reactions}
                                            </span>
                                        </button>
                                        <span className="inline-flex items-center gap-2 px-2 text-sm text-muted-foreground">
                                            <MessageCircle size={16} />{' '}
                                            {post.comments_count} comments
                                        </span>
                                    </div>
                                    {post.comments.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {post.comments.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="rounded-xl bg-muted/50 p-3 text-sm"
                                                >
                                                    <p className="font-semibold">
                                                        {c.name}
                                                    </p>
                                                    <p className="mt-1 whitespace-pre-wrap">
                                                        {c.body}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!post.removed && (
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                aria-label="Write a comment"
                                                value={
                                                    commentText[post.id] || ''
                                                }
                                                onChange={(e) =>
                                                    setCommentText((v) => ({
                                                        ...v,
                                                        [post.id]:
                                                            e.target.value,
                                                    }))
                                                }
                                                maxLength={1000}
                                                placeholder="Write a comment…"
                                                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => comment(post.id)}
                                                disabled={
                                                    !(
                                                        commentText[post.id] ||
                                                        ''
                                                    ).trim()
                                                }
                                                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                                            >
                                                Comment
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                            {profile.isAdminViewer && (
                                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-sky-500/5 p-3">
                                    <span className="text-xs font-bold tracking-wide text-sky-800 uppercase dark:text-sky-200">
                                        Admin moderation
                                    </span>
                                    {!post.removed &&
                                        post.approval_status === 'approved' && (
                                            <select
                                                aria-label="Change post status"
                                                value={post.status}
                                                onChange={(e) =>
                                                    moderate(
                                                        post.id,
                                                        e.target.value,
                                                    )
                                                }
                                                className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                                            >
                                                <option>Pending</option>
                                                <option>Under Review</option>
                                                <option>In Progress</option>
                                                <option>Resolved</option>
                                            </select>
                                        )}
                                    {!post.removed ? (
                                        <button
                                            type="button"
                                            onClick={() => remove(post.id)}
                                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                                        >
                                            <Trash2 size={15} /> Remove post
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.patch(
                                                    `/complaints/${post.id}/restore`,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
                                        >
                                            Restore post
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.visit(
                                                `/admin/moderation?view=users&user_id=${profile.id}`,
                                            )
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
                                    >
                                        <ShieldCheck size={15} /> Moderate
                                        account
                                    </button>
                                </div>
                            )}
                        </article>
                    ))
                )}
            </section>
            {zoomImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Post image preview"
                    onClick={() => setZoomImage(null)}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                >
                    <button
                        type="button"
                        onClick={() => setZoomImage(null)}
                        aria-label="Close image preview"
                        className="absolute top-4 right-4 rounded-full bg-white/15 p-3 text-white"
                    >
                        <X size={22} />
                    </button>
                    <img
                        src={zoomImage}
                        alt="Zoomed post attachment"
                        onClick={(e) => e.stopPropagation()}
                        className="max-h-[90vh] max-w-[95vw] object-contain"
                    />
                </div>
            )}
        </div>
    );
}

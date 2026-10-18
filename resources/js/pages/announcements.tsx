import { Head } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';
import AnnouncementCard from '@/components/feed/announcement-card';
import type { Notice } from '@/components/feed/announcement-card';

type Props = { isAdmin: boolean; announcements: Notice[] };

export default function AnnouncementsPage({ isAdmin, announcements }: Props) {
    const sorted = [...announcements].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.ts - a.ts,
    );

    return (
        <>
            <Head title="Announcements" />
            <div className="announcements-page page-enter mx-auto w-full max-w-[760px] space-y-4 pb-8">
                <header className="rounded-2xl border border-[#0197F6]/20 bg-gradient-to-r from-[#0197F6]/10 via-card to-[#68C5DB]/10 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-[#0197F6]/12 p-3 text-[#0197F6]">
                            <Megaphone size={24} />
                        </span>
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-[#0197F6] uppercase">
                                Barangay updates
                            </p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                                Announcements
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                Official updates and notices from the barangay,
                                with pinned announcements shown first.
                            </p>
                        </div>
                    </div>
                </header>
                {sorted.length ? (
                    sorted.map((announcement) => (
                        <AnnouncementCard
                            key={announcement.id}
                            a={announcement}
                            isAdmin={isAdmin}
                        />
                    ))
                ) : (
                    <div className="rounded-2xl border border-border bg-card p-10 text-center">
                        <Megaphone
                            className="mx-auto mb-3 text-muted-foreground"
                            size={28}
                        />
                        <h2 className="font-semibold">No announcements yet</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            New barangay announcements will appear here.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

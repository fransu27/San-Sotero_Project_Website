import { useCallback, useEffect, useState } from 'react';

/**
 * "New since you last looked" markers for the Community reports widget on the Newsfeed.
 *
 * The server sends the ids of the newest posts in every status (other people's only). This hook remembers, in this
 * browser, which ids the person has already looked at. A post is "new" until the person opens that status
 * (clicks its icon in the left panel); after that it is marked seen and the number disappears. A brand-new post
 * brings the number back, because its id is not in the remembered list.
 *
 * Browser storage is only a convenience: if it is blocked, everything still works (the markers just reset on reload).
 */
type SeenMap = Record<string, number[]>;

const KEEP = 300; // remembered ids per status (keeps the stored list small)

const read = (key: string): SeenMap => {
    try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;

        return parsed && typeof parsed === 'object' ? (parsed as SeenMap) : {};
    } catch {
        return {};
    }
};

const write = (key: string, value: SeenMap) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* storage unavailable: markers simply reset next visit */
    }
};

export function useFeedSeen(
    userId: number | string,
    statusIds: Record<string, number[]> | undefined,
    activeStatuses: string | string[] | null,
) {
    const key = `ss:feed-seen:v1:${userId}`;
    const [seen, setSeen] = useState<SeenMap>(() =>
        typeof window === 'undefined' ? {} : read(key),
    );

    // Looking at a status (its filter is open) marks everything currently in it as seen, including posts that
    // arrive while the person is watching it.
    const active = Array.isArray(activeStatuses)
        ? activeStatuses.join(',')
        : (activeStatuses ?? '');

    useEffect(() => {
        const open = active ? active.split(',') : [];

        if (open.length === 0) {
            return;
        }

        setSeen((prev) => {
            let changed = false;
            const next = { ...prev };

            open.forEach((status) => {
                const ids = statusIds?.[status] ?? [];
                const known = new Set(prev[status] ?? []);

                if (ids.every((id) => known.has(id))) {
                    return;
                }

                next[status] = [...new Set([...known, ...ids])].slice(-KEEP);
                changed = true;
            });

            if (!changed) {
                return prev;
            }

            write(key, next);

            return next;
        });
    }, [active, statusIds, key]);

    const unseen = useCallback(
        (status: string): number => {
            const known = new Set(seen[status] ?? []);

            return (statusIds?.[status] ?? []).filter((id) => !known.has(id))
                .length;
        },
        [seen, statusIds],
    );

    return { unseen };
}

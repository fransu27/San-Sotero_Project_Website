import { useCallback, useEffect, useMemo, useState } from 'react';

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

const KEEP = 300;

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
    const [seen] = useState<SeenMap>(() =>
        typeof window === 'undefined' ? {} : read(key),
    );

    const active = Array.isArray(activeStatuses)
        ? activeStatuses.join(',')
        : (activeStatuses ?? '');

    // Derive the currently seen ids during rendering instead of setting state inside an effect.
    const effectiveSeen = useMemo(() => {
        const next = { ...seen };
        const open = active ? active.split(',') : [];

        open.forEach((status) => {
            const ids = statusIds?.[status] ?? [];
            const known = new Set(seen[status] ?? []);

            if (ids.every((id) => known.has(id))) {
                return;
            }

            next[status] = [...new Set([...known, ...ids])].slice(-KEEP);
        });

        return next;
    }, [seen, active, statusIds]);

    // Persist ids for open statuses without updating React state inside the effect.
    useEffect(() => {
        if (active) {
            write(key, effectiveSeen);
        }
    }, [active, key, effectiveSeen]);

    const unseen = useCallback(
        (status: string): number => {
            const known = new Set(effectiveSeen[status] ?? []);

            return (statusIds?.[status] ?? []).filter((id) => !known.has(id))
                .length;
        },
        [effectiveSeen, statusIds],
    );

    return { unseen };
}

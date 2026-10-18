/**
 * Newsfeed filter links.
 *
 * The status list (left rail), the category list (right widget), the search box and the New/Best/Hot sort all
 * work TOGETHER: each link keeps the other active filters and only changes its own one.
 * Status and category are MULTI-select: clicking a filter adds it to the selection, clicking it again removes
 * just that one (e.g. Pending + Under Review + Peace and Order + Sanitation can all be on at once).
 * In the URL a selection is a comma-separated list: /newsfeed?status=Pending,Under%20Review&category=Sanitation
 *
 * SECURITY: this only builds a URL. The server (DashboardController::newsfeed) re-validates every value
 * against fixed lists, so a hand-edited URL cannot widen what a resident is allowed to see.
 */
export type FilterValue = string | string[] | null | undefined;

export type FeedFilters = {
    q?: string | null;
    category?: FilterValue;
    status?: FilterValue;
    sort?: string | null;
};

/** One value, a list, or nothing -> always a clean array (also understands "a,b" from an old/hand-typed URL). */
export function asList(value: FilterValue): string[] {
    const raw = Array.isArray(value) ? value : value ? [value] : [];

    return [
        ...new Set(
            raw
                .flatMap((v) => String(v).split(','))
                .map((v) => v.trim())
                .filter(Boolean),
        ),
    ];
}

export function feedHref(
    current: FeedFilters,
    patch: Partial<FeedFilters>,
    { toggle = false }: { toggle?: boolean } = {},
): string {
    const lists = {
        category: asList(current.category),
        status: asList(current.status),
    };
    let q = current.q;
    let sort = current.sort;

    if ('q' in patch) {
        q = patch.q;
    }

    if ('sort' in patch) {
        sort = patch.sort;
    }

    (['category', 'status'] as const).forEach((key) => {
        if (!(key in patch)) {
            return;
        }

        const picked = asList(patch[key]);

        if (picked.length === 0) {
            lists[key] = [];
        } else if (toggle) {
            // add the ones that are off, remove the ones that are already on
            const next = new Set(lists[key]);
            picked.forEach((v) => (next.has(v) ? next.delete(v) : next.add(v)));
            lists[key] = [...next];
        } else {
            lists[key] = picked;
        }
    });

    const params = new URLSearchParams();

    if (q) {
        params.set('q', q);
    }

    if (lists.category.length) {
        params.set('category', lists.category.join(','));
    }

    if (lists.status.length) {
        params.set('status', lists.status.join(','));
    }

    // "new" is the default sort, so it is left out of the URL.
    if (sort && sort !== 'new') {
        params.set('sort', sort);
    }

    const query = params.toString();

    return query ? `/newsfeed?${query}` : '/newsfeed';
}

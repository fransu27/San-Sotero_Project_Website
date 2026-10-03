/**
 * Shared words used on every page (language/theme labels, statuses, categories, relative time).
 * `en` is the source of truth: `tl` and `ceb` are typed as Record<keyof en, string>, so TypeScript
 * REFUSES to compile if a translation is missing. Backend values (status / category names) stay English
 * in the database; the UI looks them up as `status.<name>` / `cat.<name>`.
 */
export const en = {
    'lang.label': 'Language',
    'theme.toLight': 'Switch to light mode',
    'theme.toDark': 'Switch to dark mode',

    'status.Pending': 'Pending',
    'status.Under Review': 'Under Review',
    'status.In Progress': 'In Progress',
    'status.Resolved': 'Resolved',
    'status.Rejected': 'Rejected',
    'status.Approval': 'Awaiting approval',
    'status.ApprovalAdmin': 'Approval queue',
    'status.Removed': 'Removed',

    'cat.Infrastructure': 'Infrastructure',
    'cat.Sanitation': 'Sanitation',
    'cat.Peace and Order': 'Peace and Order',
    'cat.Others': 'Others',

    'time.now': 'just now',
    'time.min': '{n} min ago',
    'time.hour': '{n} h ago',
    'time.day': '{n} d ago',
} as const;

export const tl: Record<keyof typeof en, string> = {
    'lang.label': 'Wika',
    'theme.toLight': 'Lumipat sa light mode',
    'theme.toDark': 'Lumipat sa dark mode',

    'status.Pending': 'Nakabinbin',
    'status.Under Review': 'Sinusuri',
    'status.In Progress': 'Isinasagawa',
    'status.Resolved': 'Nalutas',
    'status.Rejected': 'Tinanggihan',
    'status.Approval': 'Naghihintay ng pag-apruba',
    'status.ApprovalAdmin': 'Pila ng pag-apruba',
    'status.Removed': 'Inalis',

    'cat.Infrastructure': 'Imprastraktura',
    'cat.Sanitation': 'Kalinisan',
    'cat.Peace and Order': 'Kapayapaan at Kaayusan',
    'cat.Others': 'Iba pa',

    'time.now': 'ngayon lang',
    'time.min': '{n} min ang nakalipas',
    'time.hour': '{n} oras ang nakalipas',
    'time.day': '{n} araw ang nakalipas',
};

export const ceb: Record<keyof typeof en, string> = {
    'lang.label': 'Pinulongan',
    'theme.toLight': 'Balhin sa light mode',
    'theme.toDark': 'Balhin sa dark mode',

    'status.Pending': 'Naghulat',
    'status.Under Review': 'Gisusi',
    'status.In Progress': 'Nagpadayon',
    'status.Resolved': 'Nasulbad',
    'status.Rejected': 'Gisalikway',
    'status.Approval': 'Naghulat og aprobar',
    'status.ApprovalAdmin': 'Pila sa pag-aprobar',
    'status.Removed': 'Gikuha',

    'cat.Infrastructure': 'Imprastraktura',
    'cat.Sanitation': 'Kalimpyo',
    'cat.Peace and Order': 'Kalinaw ug Kahusay',
    'cat.Others': 'Uban pa',

    'time.now': 'karon lang',
    'time.min': '{n} min ang milabay',
    'time.hour': '{n} oras ang milabay',
    'time.day': '{n} adlaw ang milabay',
};

export const war: Record<keyof typeof en, string> = {
    'lang.label': 'Pinulongan',
    'theme.toLight': 'Balyo ngadto ha light mode',
    'theme.toDark': 'Balyo ngadto ha dark mode',

    'status.Pending': 'Naghuhulat',
    'status.Under Review': 'Ginsusi',
    'status.In Progress': 'Nagpapadayon',
    'status.Resolved': 'Nasulbad',
    'status.Rejected': 'Ginsalikway',
    'status.Approval': 'Naghuhulat hin pag-aprubar',
    'status.ApprovalAdmin': 'Pila ha pag-aprubar',
    'status.Removed': 'Gintanggal',

    'cat.Infrastructure': 'Imprastraktura',
    'cat.Sanitation': 'Kaharo',
    'cat.Peace and Order': 'Kamurayaw ngan Kahusay',
    'cat.Others': 'Iba pa',

    'time.now': 'yana la',
    'time.min': '{n} min nga naglabay',
    'time.hour': '{n} oras nga naglabay',
    'time.day': '{n} adlaw nga naglabay',
};

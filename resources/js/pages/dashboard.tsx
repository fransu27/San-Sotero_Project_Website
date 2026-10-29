import { Head, router, usePoll } from '@inertiajs/react';
import {
    Activity,
    CalendarDays,
    ClipboardList,
    CheckCircle2,
    Clock3,
    FileText,
    ShieldAlert,
    UserX,
    TrendingUp,
    X,
    ChevronRight,
    MapPin,
    Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocale } from '@/hooks/use-locale';

type Stats = {
    total: number;
    awaiting: number;
    approved: number;
    rejected: number;
    in_progress: number;
    resolved: number;
};
type Bucket = {
    key: string;
    label: string;
    start: number;
    end: number;
    total: number;
};
type Report = {
    id: number;
    ticket_code: string | null;
    title: string;
    description: string;
    category: string;
    location: string;
    status: string;
    approval: string;
    ts: number | null;
    created_at: string | null;
};
type Period = 'day' | 'week' | 'month' | 'year';
type Props = {
    isAdmin: boolean;
    dashboardSection: 'website' | null;
    analytics: Record<Period, Stats>;
    statusCounts: Record<string, number>;
    series: Record<Period, Bucket[]>;
    reports: Report[];
    siteMetrics: {
        residentPresence: {
            id: number;
            name: string;
            avatar: string | null;
            anonymous: boolean;
            private: boolean;
            lastSeenAt: string | null;
            online: boolean;
        }[];
        pageViews: number;
        uniqueVisitors: number;
        visitorsToday: number;
        onlineUsers: number;
        recentlyActiveUsers: number;
        offlineUsers: number;
        registeredUsers: number;
        pendingComplaints: number;
        pendingPostReports: number;
        autoHeldComplaints: number;
        restrictedAccounts: number;
        bannedAccounts: number;
    } | null;
};
const periods: { key: Period; label: string; detail: string }[] = [
    {
        key: 'day',
        label: 'dashboard.day',
        detail: 'dashboard.period.dayDetail',
    },
    {
        key: 'week',
        label: 'dashboard.week',
        detail: 'dashboard.period.weekDetail',
    },
    {
        key: 'month',
        label: 'dashboard.month',
        detail: 'dashboard.period.monthDetail',
    },
    {
        key: 'year',
        label: 'dashboard.year',
        detail: 'dashboard.period.yearDetail',
    },
];

const periodBounds = (period: Period): [number, number] => {
    const now = new Date();
    const start = new Date(now);

    if (period === 'day') {
        start.setHours(0, 0, 0, 0);
    }

    if (period === 'week') {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    }

    if (period === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    }

    if (period === 'year') {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
    }

    const end = new Date(start);

    if (period === 'day') {
        end.setDate(end.getDate() + 1);
    }

    if (period === 'week') {
        end.setDate(end.getDate() + 7);
    }

    if (period === 'month') {
        end.setMonth(end.getMonth() + 1);
    }

    if (period === 'year') {
        end.setFullYear(end.getFullYear() + 1);
    }

    return [
        Math.floor(start.getTime() / 1000),
        Math.floor(end.getTime() / 1000),
    ];
};

export default function Dashboard({
    isAdmin,
    dashboardSection,
    analytics,
    statusCounts,
    series,
    reports,
    siteMetrics,
}: Props) {
    const { t } = useLocale();
    usePoll(30000, { only: ['siteMetrics'] });
    const [period, setPeriod] = useState<Period>('week');
    const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [preview, setPreview] = useState<Report | null>(null);
    const [nextStatus, setNextStatus] = useState('Under Review');
    const [statusNote, setStatusNote] = useState('');
    const [actionError, setActionError] = useState('');
    const [showAllMetrics, setShowAllMetrics] = useState(false);
    const [processing, setProcessing] = useState(false);
    const openPreview = (report: Report) => {
        setPreview(report);
        setNextStatus(report.status);
        setStatusNote('');
        setActionError('');
    };
    const stats = analytics[period];
    const chartPoints = series[period] ?? [];
    const maxTrend = Math.max(1, ...chartPoints.map((x) => x.total));
    const statusRows = [
        {
            label: 'Waiting approval',
            value: stats.awaiting,
            color: '#E0A100',
            filter: 'approval',
        },
        {
            label: 'Approved',
            value: stats.approved,
            color: '#0197F6',
            filter: 'Approved',
        },
        {
            label: 'In progress',
            value: stats.in_progress,
            color: '#448FA3',
            filter: 'In Progress',
        },
        {
            label: 'Resolved',
            value: stats.resolved,
            color: '#2A9D8F',
            filter: 'Resolved',
        },
        {
            label: 'Rejected',
            value: stats.rejected,
            color: '#D7263D',
            filter: 'Rejected',
        },
    ];
    const visibleReports = useMemo(
        () =>
            reports.filter((report) => {
                const [periodStart, periodEnd] = periodBounds(period);

                if (
                    typeof report.ts !== 'number' ||
                    report.ts < periodStart ||
                    report.ts >= periodEnd
                ) {
                    return false;
                }

                if (
                    selectedBucket &&
                    !(
                        typeof report.ts === 'number' &&
                        report.ts >= selectedBucket.start &&
                        report.ts < selectedBucket.end
                    )
                ) {
                    return false;
                }

                if (selectedStatus === 'approval') {
                    return (
                        report.approval === 'pending' ||
                        report.approval === 'Pending'
                    );
                }

                if (selectedStatus === 'Approved') {
                    return (
                        report.approval === 'approved' &&
                        !['Rejected'].includes(report.status)
                    );
                }

                if (selectedStatus) {
                    return (
                        report.status.toLowerCase() ===
                        selectedStatus.toLowerCase()
                    );
                }

                return true;
            }),
        [reports, selectedBucket, selectedStatus, period],
    );
    const clearFilters = () => {
        setSelectedBucket(null);
        setSelectedStatus(null);
    };
    const chooseBucket = (bucket: Bucket) => {
        setSelectedBucket(bucket);
        setSelectedStatus(null);
    };

    return (
        <>
            <Head title={t('page.dashboard')} />
            <div className="dashboard-page mx-auto w-full max-w-[1320px] space-y-3 pb-6">
                <div className="dashboard-heading relative flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl border border-[#0197F6]/15 bg-gradient-to-r from-[#0197F6]/[0.09] via-card to-[#68C5DB]/[0.10] p-3 sm:p-4">
                    <div>
                        <p className="text-sm font-semibold tracking-[0.16em] text-[#0197F6] uppercase">
                            {isAdmin
                                ? t('dashboard.admin')
                                : t('dashboard.activity')}
                        </p>
                        <h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">
                            {dashboardSection === 'website'
                                ? t('dashboard.websiteOverview')
                                : t('dashboard.overview')}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {dashboardSection === 'website'
                                ? t('dashboard.websiteDesc')
                                : isAdmin
                                  ? t('dashboard.adminDesc')
                                  : t('dashboard.residentDesc')}
                        </p>
                        {dashboardSection && (
                            <button
                                type="button"
                                onClick={() => router.visit('/dashboard')}
                                className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                            >
                                {t('dashboard.back')}
                            </button>
                        )}
                    </div>
                </div>
                {isAdmin && siteMetrics && (
                    <div className="min-w-0 space-y-3">
                        {(!dashboardSection ||
                            dashboardSection === 'website') && (
                            <section
                                id="website-analytics"
                                className="min-w-0 space-y-3 rounded-2xl border border-border/80 bg-card/35 p-3 sm:p-4"
                                aria-label="Website activity overview"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-base font-semibold">
                                            {t('dashboard.websiteOverview')}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            {t('dashboard.snapshot')}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowAllMetrics(
                                                    (value) => !value,
                                                )
                                            }
                                            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-[#0197F6] hover:bg-[#0197F6]/5"
                                        >
                                            {showAllMetrics
                                                ? t('dashboard.showLess')
                                                : t('dashboard.viewMetrics')}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {[
                                        {
                                            label: t(
                                                'dashboard.pendingComplaints',
                                            ),
                                            value: siteMetrics.pendingComplaints,
                                            detail: t(
                                                'dashboard.awaitingReview',
                                            ),
                                            icon: ClipboardList,
                                            href: '/admin/moderation?view=queue',
                                        },
                                        {
                                            label: t('dashboard.reportedPosts'),
                                            value: siteMetrics.pendingPostReports,
                                            detail: t('dashboard.flags'),
                                            icon: ShieldAlert,
                                            href: '/admin/moderation?view=posts',
                                        },
                                        {
                                            label: t('dashboard.usersOnline'),
                                            value: siteMetrics.onlineUsers,
                                            detail: t('dashboard.onlineWindow'),
                                            icon: Activity,
                                            href: '#user-activity',
                                        },
                                        {
                                            label: t(
                                                'dashboard.restrictedBanned',
                                            ),
                                            value:
                                                siteMetrics.restrictedAccounts +
                                                siteMetrics.bannedAccounts,
                                            detail: `${siteMetrics.restrictedAccounts} restricted · ${siteMetrics.bannedAccounts} banned`,
                                            icon: UserX,
                                            href: '/admin/moderation?view=users',
                                        },
                                    ].map((metric) => (
                                        <button
                                            key={metric.label}
                                            type="button"
                                            onClick={() =>
                                                metric.href.startsWith('#')
                                                    ? document
                                                          .getElementById(
                                                              metric.href.slice(
                                                                  1,
                                                              ),
                                                          )
                                                          ?.scrollIntoView({
                                                              behavior:
                                                                  'smooth',
                                                              block: 'start',
                                                          })
                                                    : router.visit(metric.href)
                                            }
                                            className="rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-[#0197F6]/60 hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                <span>{metric.label}</span>
                                                <metric.icon
                                                    size={16}
                                                    className="shrink-0"
                                                />
                                            </div>
                                            <p className="mt-1 text-xl font-bold tabular-nums">
                                                {metric.value.toLocaleString()}
                                            </p>
                                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                                {metric.detail}
                                            </p>
                                            <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#0197F6]">
                                                Open <ChevronRight size={13} />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {showAllMetrics && (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                                        {[
                                            [
                                                t('dashboard.pageViews'),
                                                siteMetrics.pageViews,
                                                t('dashboard.recordedVisits'),
                                            ],
                                            [
                                                t('dashboard.uniqueVisitors'),
                                                siteMetrics.uniqueVisitors,
                                                t('dashboard.distinctSessions'),
                                            ],
                                            [
                                                t('dashboard.visitorsToday'),
                                                siteMetrics.visitorsToday,
                                                t('dashboard.sinceMidnight'),
                                            ],
                                            [
                                                t('dashboard.residentAccounts'),
                                                siteMetrics.registeredUsers,
                                                t(
                                                    'dashboard.registeredNonAdmin',
                                                ),
                                            ],
                                            [
                                                t('dashboard.recentlyActive'),
                                                siteMetrics.recentlyActiveUsers,
                                                t('dashboard.last24h'),
                                            ],
                                            [
                                                t('dashboard.usersOffline'),
                                                siteMetrics.offlineUsers,
                                                t('dashboard.outsideWindow'),
                                            ],
                                            [
                                                t('dashboard.autoHeld'),
                                                siteMetrics.autoHeldComplaints,
                                                t('dashboard.returnedReview'),
                                            ],
                                            [
                                                t(
                                                    'dashboard.restrictedAccounts',
                                                ),
                                                siteMetrics.restrictedAccounts,
                                                t('dashboard.tempRestrictions'),
                                            ],
                                            [
                                                t('dashboard.bannedAccounts'),
                                                siteMetrics.bannedAccounts,
                                                t('dashboard.currentlyBanned'),
                                            ],
                                        ].map(([label, value, detail]) => (
                                            <article
                                                key={String(label)}
                                                className="rounded-xl border border-border/80 bg-card/70 p-3"
                                            >
                                                <p className="text-xs text-muted-foreground">
                                                    {label}
                                                </p>
                                                <p className="mt-1 text-xl font-bold tabular-nums">
                                                    {Number(
                                                        value,
                                                    ).toLocaleString()}
                                                </p>
                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                    {detail}
                                                </p>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                        {!dashboardSection && (
                            <section
                                id="user-activity"
                                className="min-w-0 scroll-mt-24 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4"
                                aria-label="Resident online and offline status"
                            >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-base font-semibold">
                                            {t('dashboard.residentActivity')}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            {t(
                                                'dashboard.residentActivityDesc',
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.visit('/admin/residents')
                                            }
                                            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-[#0197F6] hover:bg-[#0197F6]/5"
                                        >
                                            {t('dashboard.viewResidents')}
                                        </button>
                                        <div className="flex gap-2 text-xs">
                                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                                                {siteMetrics.onlineUsers} online
                                            </span>
                                            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                                                {siteMetrics.offlineUsers}{' '}
                                                offline
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {siteMetrics.residentPresence.map(
                                        (resident) => (
                                            <div
                                                key={resident.id}
                                                className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-3"
                                            >
                                                <span
                                                    title={
                                                        resident.online
                                                            ? 'Online'
                                                            : 'Offline'
                                                    }
                                                    className={`size-2 shrink-0 rounded-full ${resident.online ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                                />
                                                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                                                    {resident.avatar ? (
                                                        <img
                                                            src={
                                                                resident.avatar
                                                            }
                                                            alt=""
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        resident.name.slice(
                                                            0,
                                                            1,
                                                        )
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm leading-tight font-medium">
                                                        {resident.name}
                                                    </p>
                                                    <p
                                                        className={`truncate text-[11px] leading-tight ${resident.online ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}
                                                    >
                                                        {resident.online
                                                            ? t(
                                                                  'dashboard.onlineNow',
                                                              )
                                                            : resident.lastSeenAt
                                                              ? t(
                                                                    'dashboard.lastSeen',
                                                                    {
                                                                        date: new Date(
                                                                            resident.lastSeenAt,
                                                                        ).toLocaleString(
                                                                            [],
                                                                            {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: 'numeric',
                                                                                minute: '2-digit',
                                                                            },
                                                                        ),
                                                                    },
                                                                )
                                                              : t(
                                                                    'dashboard.noActivity',
                                                                )}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                    {siteMetrics.residentPresence.length ===
                                        0 && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('dashboard.noResidents')}
                                        </p>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                )}
                {!dashboardSection && (
                    <section
                        aria-label="Report time range"
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5"
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-foreground">
                                    {t('dashboard.range')}
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('dashboard.rangeDesc')}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                                <span className="text-sm font-medium text-muted-foreground">
                                    {t('dashboard.timeRange')}
                                </span>
                                <div
                                    className="flex flex-wrap justify-start gap-1 rounded-xl border border-border bg-muted/40 p-1 sm:justify-end"
                                    role="group"
                                    aria-label="Choose report time range"
                                >
                                    {periods.map((p) => (
                                        <button
                                            key={p.key}
                                            type="button"
                                            aria-pressed={period === p.key}
                                            onClick={() => {
                                                setPeriod(p.key);
                                                clearFilters();
                                            }}
                                            className={`min-w-14 rounded-lg px-3 py-2 text-sm font-semibold transition ${period === p.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
                                        >
                                            {t(p.label)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {t(
                                periods.find((p) => p.key === period)?.detail ??
                                    'dashboard.period.weekDetail',
                            )}
                        </p>
                    </section>
                )}

                {!dashboardSection && (
                    <>
                        <section
                            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                            aria-label="Report summary"
                        >
                            <button
                                onClick={() => {
                                    clearFilters();
                                    document
                                        .getElementById('report-list')
                                        ?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'start',
                                        });
                                }}
                                className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-[#0197F6] hover:shadow-md"
                            >
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{t('dashboard.totalReports')}</span>
                                    <FileText size={18} />
                                </div>
                                <p className="mt-3 text-4xl font-semibold">
                                    {stats.total}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t(
                                        periods.find((p) => p.key === period)
                                            ?.detail ??
                                            'dashboard.period.weekDetail',
                                    )}
                                </p>
                                <span className="mt-3 flex items-center gap-1 text-xs text-[#0197F6]">
                                    {t('dashboard.viewReportList')}{' '}
                                    <ChevronRight size={14} />
                                </span>
                            </button>
                            {[
                                {
                                    label: 'Waiting approval',
                                    value: stats.awaiting,
                                    icon: Clock3,
                                    filter: 'approval',
                                },
                                {
                                    label: 'In progress',
                                    value: stats.in_progress,
                                    icon: TrendingUp,
                                    filter: 'In Progress',
                                },
                                {
                                    label: 'Resolved',
                                    value: stats.resolved,
                                    icon: CheckCircle2,
                                    filter: 'Resolved',
                                },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        setSelectedBucket(null);
                                        setSelectedStatus(item.filter);
                                        document
                                            .getElementById('report-list')
                                            ?.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'start',
                                            });
                                    }}
                                    className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-[#0197F6] hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span>{item.label}</span>
                                        <item.icon size={18} />
                                    </div>
                                    <p className="mt-3 text-4xl font-semibold">
                                        {item.value}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t(
                                            periods.find(
                                                (p) => p.key === period,
                                            )?.detail ??
                                                'dashboard.period.weekDetail',
                                        )}
                                    </p>
                                    <span className="mt-3 flex items-center gap-1 text-xs text-[#0197F6]">
                                        {t('dashboard.previewReports')}{' '}
                                        <ChevronRight size={14} />
                                    </span>
                                </button>
                            ))}
                        </section>
                        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Submission activity
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {
                                                periods.find(
                                                    (p) => p.key === period,
                                                )?.detail
                                            }
                                            . Select any bar to inspect the
                                            reports for that period.
                                        </p>
                                    </div>
                                    <TrendingUp
                                        size={18}
                                        className="text-muted-foreground"
                                    />
                                </div>
                                {period === 'day' ? (
                                    <div className="mt-5 space-y-4">
                                        {[
                                            {
                                                title: 'AM · 00:00–11:00',
                                                points: chartPoints.slice(
                                                    0,
                                                    12,
                                                ),
                                            },
                                            {
                                                title: 'PM · 12:00–23:00',
                                                points: chartPoints.slice(
                                                    12,
                                                    24,
                                                ),
                                            },
                                        ].map((group) => (
                                            <div key={group.title}>
                                                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                    {group.title}
                                                </h3>
                                                <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                                                    {group.points.map(
                                                        (point) => (
                                                            <button
                                                                key={point.key}
                                                                onClick={() =>
                                                                    chooseBucket(
                                                                        point,
                                                                    )
                                                                }
                                                                aria-label={`View reports for ${point.label}, ${point.total} reports`}
                                                                aria-pressed={
                                                                    selectedBucket?.key ===
                                                                    point.key
                                                                }
                                                                title={`${point.label}: ${point.total} reports · click to view`}
                                                                className={`flex min-h-24 min-w-0 flex-col items-center justify-end gap-1 rounded-lg border border-border px-1 pt-2 pb-2 transition hover:bg-muted/60 ${selectedBucket?.key === point.key ? 'border-[#0197F6] bg-[#0197F6]/10' : 'bg-background/40'}`}
                                                            >
                                                                <span className="text-xs font-semibold">
                                                                    {
                                                                        point.total
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`w-full max-w-5 rounded-t-sm ${selectedBucket?.key === point.key ? 'bg-[#D7263D]' : 'bg-[#0197F6]'}`}
                                                                    style={{
                                                                        height: `${Math.max(4, (point.total / maxTrend) * 46)}px`,
                                                                    }}
                                                                />
                                                                <span className="text-[10px] leading-tight font-medium">
                                                                    {
                                                                        point.label
                                                                    }
                                                                </span>
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : period === 'month' ? (
                                    <div className="mt-5 space-y-4">
                                        {[
                                            {
                                                title: 'Days 1–16',
                                                points: chartPoints.slice(
                                                    0,
                                                    16,
                                                ),
                                            },
                                            {
                                                title: `Days 17–${chartPoints.length}`,
                                                points: chartPoints.slice(16),
                                            },
                                        ].map((group) => (
                                            <div key={group.title}>
                                                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                    {group.title}
                                                </h3>
                                                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                                                    {group.points.map(
                                                        (point) => (
                                                            <button
                                                                key={point.key}
                                                                onClick={() =>
                                                                    chooseBucket(
                                                                        point,
                                                                    )
                                                                }
                                                                aria-label={`View reports for ${point.label}, ${point.total} reports`}
                                                                aria-pressed={
                                                                    selectedBucket?.key ===
                                                                    point.key
                                                                }
                                                                title={`${point.label}: ${point.total} reports · click to view`}
                                                                className={`flex min-h-24 min-w-0 flex-col items-center justify-end gap-1 rounded-lg border border-border px-2 pt-2 pb-2 transition hover:bg-muted/60 ${selectedBucket?.key === point.key ? 'border-[#0197F6] bg-[#0197F6]/10' : 'bg-background/40'}`}
                                                            >
                                                                <span className="text-sm font-semibold">
                                                                    {
                                                                        point.total
                                                                    }
                                                                </span>
                                                                <div
                                                                    className={`w-full max-w-8 rounded-t-sm ${selectedBucket?.key === point.key ? 'bg-[#D7263D]' : 'bg-[#0197F6]'}`}
                                                                    style={{
                                                                        height: `${Math.max(4, (point.total / maxTrend) * 46)}px`,
                                                                    }}
                                                                />
                                                                <span className="text-xs leading-tight font-medium">
                                                                    {
                                                                        point.label
                                                                    }
                                                                </span>
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        className="mt-6 grid items-end gap-2 border-b border-border pb-2"
                                        style={{
                                            gridTemplateColumns: `repeat(${chartPoints.length}, minmax(0, 1fr))`,
                                        }}
                                    >
                                        {chartPoints.map((point) => (
                                            <button
                                                key={point.key}
                                                onClick={() =>
                                                    chooseBucket(point)
                                                }
                                                aria-label={`View reports for ${point.label}, ${point.total} reports`}
                                                aria-pressed={
                                                    selectedBucket?.key ===
                                                    point.key
                                                }
                                                title={`${point.label}: ${point.total} reports · click to view`}
                                                className={`group flex min-w-0 flex-col items-center justify-end gap-1 rounded-t-md px-1 pt-2 transition hover:bg-muted/60 ${selectedBucket?.key === point.key ? 'bg-[#0197F6]/10 ring-1 ring-[#0197F6]' : ''}`}
                                            >
                                                <span className="text-xs font-semibold">
                                                    {point.total}
                                                </span>
                                                <div
                                                    className={`w-full max-w-8 rounded-t-sm ${selectedBucket?.key === point.key ? 'bg-[#D7263D]' : 'bg-[#0197F6]'}`}
                                                    style={{
                                                        height: `${Math.max(3, (point.total / maxTrend) * 110)}px`,
                                                    }}
                                                />
                                                <span
                                                    className={`text-[10px] leading-tight sm:text-xs ${selectedBucket?.key === point.key ? 'font-bold text-[#0197F6]' : 'text-muted-foreground'}`}
                                                >
                                                    {point.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <p className="mt-3 text-xs text-muted-foreground">
                                    {period === 'day'
                                        ? 'Hours use 24-hour time (00:00–23:00).'
                                        : period === 'month'
                                          ? `Showing days 1–${chartPoints.length} for the current month.`
                                          : period === 'year'
                                            ? 'Showing all months from January through December.'
                                            : 'Select a day of the week to view its reports.'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Status breakdown
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Select a status to preview matching reports.
                                </p>
                                <div className="mt-5 space-y-4">
                                    {statusRows.map((row) => (
                                        <button
                                            key={row.label}
                                            onClick={() => {
                                                setSelectedBucket(null);
                                                setSelectedStatus(row.filter);
                                            }}
                                            className={`block w-full rounded-lg p-2 text-left transition hover:bg-muted/60 ${selectedStatus === row.filter ? 'bg-muted ring-1 ring-[#0197F6]' : ''}`}
                                        >
                                            <div className="mb-1.5 flex justify-between gap-3 text-sm">
                                                <span>{row.label}</span>
                                                <strong>{row.value}</strong>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${stats.total ? (row.value / stats.total) * 100 : 0}%`,
                                                        backgroundColor:
                                                            row.color,
                                                    }}
                                                />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Activity
                                    size={18}
                                    className="text-[#0197F6]"
                                />
                                <h2 className="text-lg font-semibold">
                                    Current report status
                                </h2>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {isAdmin
                                    ? 'All report statuses across the barangay.'
                                    : 'Your reports only. Other residents’ private reports are never included.'}
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {[
                                    [
                                        'Pending',
                                        statusCounts.Pending ?? 0,
                                        '#D7263D',
                                    ],
                                    [
                                        'Under Review',
                                        statusCounts['Under Review'] ?? 0,
                                        '#68C5DB',
                                    ],
                                    [
                                        'In Progress',
                                        statusCounts['In Progress'] ?? 0,
                                        '#0197F6',
                                    ],
                                    [
                                        'Resolved',
                                        statusCounts.Resolved ?? 0,
                                        '#448FA3',
                                    ],
                                    [
                                        'Rejected',
                                        statusCounts.Rejected ?? 0,
                                        '#9B2D5C',
                                    ],
                                ].map(([label, value, color]) => (
                                    <button
                                        onClick={() => {
                                            setSelectedBucket(null);
                                            setSelectedStatus(String(label));
                                            document
                                                .getElementById('report-list')
                                                ?.scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'start',
                                                });
                                        }}
                                        key={String(label)}
                                        className="rounded-xl bg-muted/60 p-3 text-left transition hover:ring-1 hover:ring-[#0197F6]"
                                    >
                                        <span className="block text-xs text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="mt-1 block text-2xl font-semibold">
                                            {value}
                                        </span>
                                        <span
                                            className="mt-2 block h-1 rounded-full"
                                            style={{
                                                backgroundColor: String(color),
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </section>
                        <section
                            id="report-list"
                            className="scroll-mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Report list & preview
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedBucket
                                            ? `Reports submitted during ${selectedBucket.label}.`
                                            : selectedStatus
                                              ? `Reports matching: ${selectedStatus === 'approval' ? 'Waiting approval' : selectedStatus}.`
                                              : `Reports submitted during the selected ${period} (${visibleReports.length} shown).`}{' '}
                                        Select a report to preview its details.
                                    </p>
                                </div>
                                {(selectedBucket || selectedStatus) && (
                                    <button
                                        onClick={clearFilters}
                                        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                            <div className="mt-4 space-y-2">
                                {visibleReports.length ? (
                                    visibleReports.map((report) => (
                                        <button
                                            key={report.id}
                                            onClick={() => openPreview(report)}
                                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition hover:border-[#0197F6] hover:bg-muted/40"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold">
                                                    {report.title}
                                                </p>
                                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                                    {report.ticket_code
                                                        ? `${report.ticket_code} · `
                                                        : ''}
                                                    {report.category} ·{' '}
                                                    {report.created_at ??
                                                        'Date unavailable'}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <span className="block text-xs font-medium">
                                                    {report.status}
                                                </span>
                                                <span className="mt-1 block text-xs text-muted-foreground">
                                                    {report.approval}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                                        No reports match this selection.
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
            {preview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="report-preview-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setPreview(null);
                        }
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-[#0197F6] uppercase">
                                    Report preview
                                </p>
                                <h2
                                    id="report-preview-title"
                                    className="mt-1 text-xl font-bold"
                                >
                                    {preview.title}
                                </h2>
                            </div>
                            <button
                                onClick={() => setPreview(null)}
                                aria-label="Close report preview"
                                className="rounded-lg p-2 hover:bg-muted"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-muted px-3 py-1">
                                {preview.status}
                            </span>
                            <span className="rounded-full bg-muted px-3 py-1">
                                {preview.approval}
                            </span>
                            {preview.ticket_code && (
                                <span className="rounded-full bg-muted px-3 py-1">
                                    {preview.ticket_code}
                                </span>
                            )}
                        </div>
                        <p className="mt-4 text-sm leading-6 whitespace-pre-wrap">
                            {preview.description || 'No description provided.'}
                        </p>
                        <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                            <div className="flex items-start gap-2 text-sm">
                                <Tag
                                    size={16}
                                    className="mt-0.5 text-muted-foreground"
                                />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Category
                                    </p>
                                    <p>{preview.category}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <MapPin
                                    size={16}
                                    className="mt-0.5 text-muted-foreground"
                                />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Location
                                    </p>
                                    <p>{preview.location || 'Not specified'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <CalendarDays
                                    size={16}
                                    className="mt-0.5 text-muted-foreground"
                                />
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Submitted
                                    </p>
                                    <p>
                                        {preview.created_at ??
                                            'Date unavailable'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="mt-5 border-t border-border pt-4">
                                <h3 className="font-semibold">
                                    Administrator actions
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Approve this report or update its workflow
                                    status without leaving the dashboard.
                                </p>
                                {actionError && (
                                    <p
                                        role="alert"
                                        className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600"
                                    >
                                        {actionError}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {preview.approval.toLowerCase() ===
                                        'pending' && (
                                        <button
                                            disabled={processing}
                                            onClick={() => {
                                                setProcessing(true);
                                                setActionError('');
                                                router.patch(
                                                    `/complaints/${preview.id}/approve`,
                                                    {},
                                                    {
                                                        preserveScroll: true,
                                                        onError: (errors) =>
                                                            setActionError(
                                                                Object.values(
                                                                    errors,
                                                                ).join(' '),
                                                            ),
                                                        onFinish: () =>
                                                            setProcessing(
                                                                false,
                                                            ),
                                                        onSuccess: () =>
                                                            setPreview(null),
                                                    },
                                                );
                                            }}
                                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                        >
                                            {processing
                                                ? 'Processing…'
                                                : 'Approve report'}
                                        </button>
                                    )}
                                    <label className="flex items-center gap-2 text-sm">
                                        Status
                                        <select
                                            value={nextStatus}
                                            onChange={(e) =>
                                                setNextStatus(e.target.value)
                                            }
                                            className="rounded-lg border border-input bg-card px-3 py-2 text-foreground"
                                            disabled={
                                                preview.approval.toLowerCase() !==
                                                'approved'
                                            }
                                        >
                                            {[
                                                'Pending',
                                                'Under Review',
                                                'In Progress',
                                                'Resolved',
                                                'Rejected',
                                            ].map((status) => (
                                                <option
                                                    key={status}
                                                    value={status}
                                                >
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <input
                                        value={statusNote}
                                        onChange={(e) =>
                                            setStatusNote(e.target.value)
                                        }
                                        placeholder={
                                            nextStatus === 'Rejected'
                                                ? 'Required rejection reason (min 5 chars)'
                                                : 'Optional staff note'
                                        }
                                        className="min-w-48 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                                    />{' '}
                                    <button
                                        disabled={
                                            processing ||
                                            preview.approval.toLowerCase() !==
                                                'approved' ||
                                            nextStatus === preview.status ||
                                            (nextStatus === 'Rejected' &&
                                                statusNote.trim().length < 5)
                                        }
                                        onClick={() => {
                                            setProcessing(true);
                                            setActionError('');
                                            router.patch(
                                                `/complaints/${preview.id}/status`,
                                                {
                                                    status: nextStatus,
                                                    note:
                                                        statusNote.trim() ||
                                                        undefined,
                                                },
                                                {
                                                    preserveScroll: true,
                                                    onError: (errors) =>
                                                        setActionError(
                                                            Object.values(
                                                                errors,
                                                            ).join(' '),
                                                        ),
                                                    onFinish: () =>
                                                        setProcessing(false),
                                                    onSuccess: () =>
                                                        setPreview(null),
                                                },
                                            );
                                        }}
                                        className="rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {processing ? 'Saving…' : 'Save status'}
                                    </button>
                                </div>
                                {preview.approval.toLowerCase() !==
                                    'approved' && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Approve the report before changing its
                                        status.
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setPreview(null)}
                                className="rounded-lg bg-[#0197F6] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                            >
                                Close preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

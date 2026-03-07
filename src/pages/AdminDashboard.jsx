import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { renderAvatar } from '../utils/avatarHelper'
import { Users, UserCheck, UserX, MapPin, ClipboardList, TrendingUp, RefreshCw } from 'lucide-react'

function StatSkeleton() {
    return (
        <div className="stat-card" style={{ gap: '1rem' }}>
            <div className="skeleton skeleton-avatar" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-title" style={{ width: '50%', marginBottom: 8 }} />
                <div className="skeleton skeleton-text" style={{ width: '70%' }} />
            </div>
        </div>
    )
}

function TableSkeleton() {
    return (
        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
        </div>
    )
}

export function AdminDashboard() {
    const { showToast, t } = useApp()
    const [stats, setStats] = useState(null)
    const [todayRecords, setTodayRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const today = new Date().toISOString().split('T')[0]

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        try {
            const [s, att] = await Promise.all([
                client.get('/admin/attendance/stats'),
                client.get(`/admin/attendance?date=${today}`),
            ])
            setStats(s.data)
            setTodayRecords(att.data)
        } catch {
            showToast('Failed to load dashboard.', 'error')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const rate = stats?.total_employees > 0
        ? Math.round((stats.present_today / stats.total_employees) * 100)
        : 0

    const statItems = [
        { Icon: Users,     val: stats?.total_employees ?? 0, label: t('stat.total_employees'), color: 'rgba(249,115,22,0.12)', tc: 'var(--brand-primary)', delay: 'anim-delay-1' },
        { Icon: UserCheck, val: stats?.present_today ?? 0,   label: t('stat.present_today'),   color: 'rgba(34,197,94,0.12)',  tc: 'var(--success)',       delay: 'anim-delay-2' },
        { Icon: UserX,     val: stats?.absent_today ?? 0,    label: t('stat.absent_today'),    color: 'rgba(239,68,68,0.12)', tc: 'var(--danger)',        delay: 'anim-delay-3' },
        { Icon: MapPin,    val: stats?.active_sites ?? 0,    label: t('stat.active_sites'),    color: 'rgba(59,130,246,0.12)', tc: 'var(--info)',          delay: 'anim-delay-4' },
    ]

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 1000 }}>

                {/* Header */}
                <div className="anim-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem', fontWeight: 700 }}>
                            {t('misc.admin_panel')}
                        </p>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                            {t('page.dashboard')}
                        </h1>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="btn btn-ghost"
                        style={{ gap: '0.4rem', fontSize: '0.8rem' }}
                    >
                        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
                        {t('action.refresh') || 'Refresh'}
                    </button>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
                    {loading
                        ? [...Array(4)].map((_, i) => <StatSkeleton key={i} />)
                        : statItems.map((s, i) => (
                            <div key={i} className={`stat-card anim-in ${s.delay}`}>
                                <div className="stat-icon" style={{ background: s.color }}>
                                    <s.Icon size={20} color={s.tc} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value" style={{ color: s.tc }}>{s.val}</div>
                                    <div className="stat-label">{s.label}</div>
                                </div>
                            </div>
                        ))
                    }
                </div>

                {/* Attendance Rate Bar */}
                <div className="section-card anim-in anim-delay-5" style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={16} color="var(--success)" />
                            <span className="section-title">{t('section.today_attendance')} {t('misc.rate')}</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: rate >= 70 ? 'var(--success)' : rate >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                            {loading ? '—' : `${rate}%`}
                        </span>
                    </div>
                    {loading ? (
                        <div className="skeleton" style={{ height: 10, borderRadius: 100 }} />
                    ) : (
                        <div className="progress-bar">
                            <div className="progress-fill" style={{
                                width: `${rate}%`,
                                background: rate >= 70
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : rate >= 40
                                        ? 'linear-gradient(90deg, #f97316, #fb923c)'
                                        : 'linear-gradient(90deg, #ef4444, #f87171)',
                            }} />
                        </div>
                    )}
                    {!loading && (
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                            {[
                                { label: t('stat.present_today'), val: stats?.present_today, color: 'var(--success)' },
                                { label: t('stat.absent_today'), val: stats?.absent_today, color: 'var(--danger)' },
                                { label: t('stat.total_employees'), val: stats?.total_employees, color: 'var(--text-muted)' },
                            ].map((m, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</div>
                                    <div style={{ fontWeight: 700, color: m.color, fontSize: '0.95rem' }}>{m.val}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Today Attendance Table */}
                <div className="section-card anim-in" style={{ padding: 0 }}>
                    <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ClipboardList size={16} color="var(--brand-primary)" />
                            <h3 className="section-title" style={{ margin: 0 }}>{t('section.today_attendance')}</h3>
                        </div>
                        <span className="badge badge-info">{loading ? '…' : todayRecords.length} {t('label.records')}</span>
                    </div>

                    {loading ? (
                        <TableSkeleton />
                    ) : todayRecords.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><ClipboardList size={32} /></div>
                            <p style={{ fontWeight: 500 }}>No check-ins yet today.</p>
                        </div>
                    ) : (
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{t('col.employee')}</th>
                                        <th>{t('col.department')}</th>
                                        <th>{t('col.site')}</th>
                                        <th>{t('col.time')}</th>
                                        <th>{t('col.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayRecords.map(rec => (
                                        <tr key={rec.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    {renderAvatar(rec.avatar)}
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{rec.employee_name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.employee_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>{rec.department || '—'}</td>
                                            <td>{rec.site_name || '—'}</td>
                                            <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>{rec.time}</td>
                                            <td>
                                                <span className={`badge ${rec.status === 'manual' ? 'badge-warning' : 'badge-success'}`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format, subDays, isToday, startOfMonth, eachDayOfInterval } from 'date-fns'
import { renderAvatar } from '../utils/avatarHelper'
import {
    CheckCircle2, AlertCircle, MapPin, Building2,
    TrendingUp, Calendar, Clock, FileText, Camera, ChevronRight
} from 'lucide-react'
import { Translate } from '../utils/translateHelper'
import { requestNotificationPermission } from '../utils/pushNotification'
import './UserDashboard.css'

const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    if (import.meta.env.PROD) return 'https://metro-attendance.onrender.com/api'
    return `${window.location.protocol}//${window.location.hostname}:4000/api`
}
const API_BASE_CORE = getApiBase()
const API_BASE = API_BASE_CORE.endsWith('/api') ? API_BASE_CORE.slice(0, -4) : API_BASE_CORE

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Morning'
    if (h < 17) return 'Afternoon'
    return 'Evening'
}

const DashboardSkeleton = () => (
    <div className="page-content" style={{ maxWidth: 800 }}>
        {/* Hero skeleton */}
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem' }} />
        {/* Stats row skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
        {/* Week skeleton */}
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }} />
        {/* Table skeleton */}
        <div className="section-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div className="skeleton" style={{ width: '40%', height: 20, marginBottom: 8, borderRadius: 4 }} />
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, opacity: 1 - i * 0.2 }} />)}
        </div>
    </div>
)

export function UserDashboard() {
    const { currentUser, showToast, t } = useApp()
    const [dashboard, setDashboard] = useState(null)
    const [recentAtt, setRecentAtt] = useState([])
    const [loading, setLoading] = useState(true)
    const [now, setNow] = useState(new Date())

    // Live clock — update every minute
    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), 60000)
        requestNotificationPermission(currentUser.id)
        return () => clearInterval(tick)
    }, [currentUser.id])

    const fetchData = useCallback(async () => {
        try {
            const [d, a] = await Promise.all([
                client.get('/employee/dashboard'),
                client.get('/employee/attendance?days=30'),
            ])
            setDashboard(d.data)
            setRecentAtt(Array.isArray(a.data) ? a.data : [])
        } catch {
            showToast('Failed to load dashboard.', 'error')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => {
        fetchData()
        const iv = setInterval(fetchData, 60000)
        return () => clearInterval(iv)
    }, [fetchData])

    const todayRecord = dashboard?.todayAttendance?.id ? dashboard.todayAttendance : null
    const assignedSites = Array.isArray(dashboard?.assignedSites) ? dashboard.assignedSites : []
    const marked = !!todayRecord
    const activeSites = assignedSites.filter(s => s.status === 'active')

    // Attendance date set
    const attDates = new Set(recentAtt.map(r => r.date))

    // Last 7 days streak
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i)
        const localStr = format(d, 'yyyy-MM-dd')
        return { d, iso: localStr, present: attDates.has(localStr), today: isToday(d) }
    })


    const todayPhoto = todayRecord?.photo_url
        ? (todayRecord.photo_url.startsWith('http') ? todayRecord.photo_url : `${API_BASE}${todayRecord.photo_url}`)
        : null

    if (loading) {
        return (
            <div className="page-shell page-enter">
                <DashboardSkeleton />
            </div>
        )
    }

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 840 }}>

                {/* ── Hero Card — Today Status ── */}
                <div className={`attendance-hero anim-in ${marked ? 'hero-marked' : 'hero-unmarked'}`}>
                    {/* Top row: avatar + greeting + clock */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flexShrink: 0 }}>{renderAvatar(currentUser.avatar, '2.5rem')}</div>
                            <div>
                                <p className="greeting-sub">Good {getGreeting()},</p>
                                <h2 className="greeting-name" style={{ fontSize: '1.1rem' }}>
                                    <Translate text={currentUser.name} />
                                </h2>
                                <p style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.1rem' }}>
                                    <Translate text={currentUser.department || 'Employee'} /> · {currentUser.id}
                                </p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="clock-time" style={{ fontSize: '1.3rem' }}>{format(now, 'hh:mm a')}</div>
                            <div className="clock-date">{format(now, 'EEE, dd MMM')}</div>
                        </div>
                    </div>

                    {/* Status row */}
                    <div className="status-row">
                        <div className={`status-ring-wrap`} style={{ flexShrink: 0 }}>
                            <div className={`status-ring ${marked ? 'checked_in' : 'not_marked'}`}>
                                <div className="status-ring-inner">
                                    {marked
                                        ? <CheckCircle2 size={32} color="var(--success)" />
                                        : <AlertCircle size={32} color="var(--danger)" />}
                                    <span className="status-text">{marked ? 'Reported' : 'Pending'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="status-text-content">
                            <div className="status-headline">
                                {marked ? t('misc.attendance_marked') || 'Attendance Marked' : t('misc.report_not_submitted') || 'Report Pending'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {marked && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', opacity: 0.85 }}>
                                        <Clock size={12} />
                                        <span>Reported at {todayRecord.time}</span>
                                    </div>
                                )}
                                {todayRecord?.site_name && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', opacity: 0.75 }}>
                                        <MapPin size={12} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                            <Translate text={todayRecord.site_name} />
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {todayPhoto && (
                            <div className="status-photo">
                                <img src={todayPhoto} alt="Today's report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>

                    {/* CTA */}
                    {!marked && activeSites.length > 0 && (
                        <Link
                            to="/report"
                            className="btn checkin-btn"
                            style={{ textDecoration: 'none', marginTop: '1rem', width: '100%', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', fontWeight: 700, backdropFilter: 'blur(8px)' }}
                        >
                            <Camera size={16} /> {t('action.report_from_site')}
                        </Link>
                    )}
                    {marked && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.75, textAlign: 'center' }}>
                            {t('misc.done_for_today')}
                        </div>
                    )}
                </div>

                {/* ── Quick Stats ── */}
                <div className="anim-in anim-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '0.5rem' }}>
                    {[
                        { Icon: Calendar, label: t('stat.present_month') || 'Present', value: dashboard?.presentThisMonth ?? recentAtt.length, color: 'var(--success)', bg: 'rgba(34,197,94,0.12)' },
                        { Icon: FileText, label: t('stat.reports_filed') || 'Reports', value: dashboard?.reportsThisMonth ?? '—', color: 'var(--info)', bg: 'rgba(59,130,246,0.12)' },
                        { Icon: Building2, label: t('stat.sites_assigned') || 'Sites', value: assignedSites.length, color: 'var(--brand-primary)', bg: 'rgba(249,115,22,0.12)' },
                    ].map(({ Icon, label, value, color, bg }) => (
                        <div key={label} className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.2rem', padding: '0.65rem 0.25rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={15} color={color} />
                            </div>
                            <div className="stat-value" style={{ fontSize: '1.2rem', color }}>{value}</div>
                            <div className="stat-label" style={{ fontSize: '0.6rem', opacity: 0.8 }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* ── This Week Streak ── */}
                <div className="section-card anim-in anim-delay-2">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', padding: '0.25rem 0' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>This Week</h3>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {last7.filter(d => d.present).length}/7 days
                        </span>
                    </div>
                    <div className="week-grid">
                        {last7.map(({ d, iso, present, today }) => (
                            <div key={iso} className={`week-day ${present ? 'present' : 'absent'} ${today ? 'today' : ''}`}>
                                <span className="week-label">{format(d, 'EEE')}</span>
                                <div className="week-dot">{present ? '✓' : format(d, 'd')}</div>
                                <span className="week-num">{format(d, 'd')}</span>
                            </div>
                        ))}
                    </div>
                </div>


                {/* ── Assigned Sites ── */}
                <div className="section-card anim-in anim-delay-3">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>{t('nav.update_progress') || 'Update Progress'}</h3>
                        <span className="badge badge-info">{assignedSites.length}</span>
                    </div>
                    {assignedSites.length === 0 ? (
                        <div className="empty-state" style={{ padding: '1.25rem 0' }}>
                            <div className="empty-icon"><MapPin size={28} /></div>
                            <p>{t('empty.no_sites_assigned')}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {assignedSites.map(site => (
                                <div key={site.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    background: 'var(--glass-bg)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: site.status === 'active' ? '3px solid var(--success)' : '3px solid var(--border)',
                                    transition: 'var(--transition)',
                                }}>
                                    <Building2 size={18} color={site.status === 'active' ? 'var(--success)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                            <Translate text={site.site_name} />
                                        </div>
                                        {site.client_name && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', fontWeight: 500, marginTop: 2 }}>
                                                <Translate text={site.client_name} />
                                            </div>
                                        )}
                                        {site.location_name && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <MapPin size={10} /> <Translate text={site.location_name} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                                        <span className={`badge ${site.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                            {site.status === 'active' ? t('status.active') : t('status.closed')}
                                        </span>
                                        {site.status === 'active' && (
                                            <Link to="/report" style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.7rem', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 700 }}>
                                                Report <ChevronRight size={12} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Recent Attendance ── */}
                {recentAtt.length > 0 && (
                    <div className="section-card anim-in anim-delay-4" style={{ padding: 0 }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>{t('section.report_history')}</h3>
                            <Link to="/history" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.78rem', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 700 }}>
                                View All <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{t('col.date')}</th>
                                        <th>{t('col.site')}</th>
                                        <th>{t('col.time')}</th>
                                        <th>{t('col.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentAtt.slice(0, 7).map(r => (
                                        <tr key={r.id}>
                                            <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                {format(new Date(r.date + 'T00:00:00'), 'dd MMM yyyy')}
                                            </td>
                                            <td><Translate text={r.site_name || '—'} /></td>
                                            <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.time}</td>
                                            <td>
                                                <span className={`badge ${r.status === 'manual' ? 'badge-warning' : 'badge-success'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

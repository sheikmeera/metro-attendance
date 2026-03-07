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
import './UserDashboard.css'

const API_BASE = import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:4000`

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Morning'
    if (h < 17) return 'Afternoon'
    return 'Evening'
}

function DashboardSkeleton() {
    return (
        <div className="page-content" style={{ maxWidth: 680 }}>
            {/* Hero skeleton */}
            <div className="skeleton skeleton-card" style={{ height: 160, borderRadius: 'var(--radius-xl)' }} />
            {/* Stats row skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ height: 80 }} />)}
            </div>
            {/* Week skeleton */}
            <div className="skeleton skeleton-card" style={{ height: 100 }} />
            {/* Table skeleton */}
            <div className="section-card" style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div className="skeleton skeleton-title" style={{ width: '40%', marginBottom: 8 }} />
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 0.07}s` }} />)}
            </div>
        </div>
    )
}

export function UserDashboard() {
    const { currentUser, showToast, t } = useApp()
    const [dashboard, setDashboard] = useState(null)
    const [recentAtt, setRecentAtt] = useState([])
    const [loading, setLoading] = useState(true)
    const [now, setNow] = useState(new Date())

    // Live clock — update every minute
    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(tick)
    }, [])

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

    // Monthly calendar
    const monthStart = startOfMonth(now)
    const monthDays = eachDayOfInterval({ start: monthStart, end: now })
    const presentDays = monthDays.filter(d => attDates.has(format(d, 'yyyy-MM-dd'))).length
    const totalWorkDays = monthDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length
    const attendanceRate = totalWorkDays > 0 ? Math.round((presentDays / totalWorkDays) * 100) : 0

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
            <div className="page-content" style={{ maxWidth: 680 }}>

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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', opacity: 0.85 }}>
                                    <TrendingUp size={12} />
                                    <span style={{ fontWeight: 600 }}>{attendanceRate}% {format(now, 'MMMM')}</span>
                                </div>
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
                <div className="anim-in anim-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                        { Icon: Calendar, label: t('stat.present_month') || 'Present (30d)', value: dashboard?.presentThisMonth ?? recentAtt.length, color: 'var(--success)', bg: 'rgba(34,197,94,0.12)' },
                        { Icon: FileText, label: t('stat.reports_filed') || 'Reports Filed', value: dashboard?.reportsThisMonth ?? '—', color: 'var(--info)', bg: 'rgba(59,130,246,0.12)' },
                        { Icon: Building2, label: t('stat.sites_assigned') || 'Sites', value: assignedSites.length, color: 'var(--brand-primary)', bg: 'rgba(249,115,22,0.12)' },
                    ].map(({ Icon, label, value, color, bg }) => (
                        <div key={label} className="stat-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.35rem', padding: '0.875rem 0.5rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={17} color={color} />
                            </div>
                            <div className="stat-value" style={{ fontSize: '1.35rem', color }}>{value}</div>
                            <div className="stat-label" style={{ fontSize: '0.67rem' }}>{label}</div>
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

                {/* ── Monthly Attendance ── */}
                <div className="section-card anim-in anim-delay-3">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>{format(now, 'MMMM')} Attendance</h3>
                        <span style={{
                            fontWeight: 800, fontSize: '1rem',
                            color: attendanceRate >= 75 ? 'var(--success)' : attendanceRate >= 50 ? 'var(--warning)' : 'var(--danger)'
                        }}>
                            {attendanceRate}%
                        </span>
                    </div>
                    <div className="progress-bar" style={{ marginBottom: '0.75rem' }}>
                        <div className="progress-fill" style={{
                            width: `${attendanceRate}%`,
                            background: attendanceRate >= 75
                                ? 'linear-gradient(90deg, #10b981, #34d399)'
                                : attendanceRate >= 50
                                    ? 'linear-gradient(90deg, #f59e0b, #fcd34d)'
                                    : 'linear-gradient(90deg, #ef4444, #fca5a5)',
                        }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {monthDays.map(d => {
                            const localStr = format(d, 'yyyy-MM-dd')
                            const present = attDates.has(localStr)
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6
                            const isTod = isToday(d)
                            return (
                                <div
                                    key={localStr}
                                    title={`${format(d, 'dd MMM')}${present ? ' — Present' : isWeekend ? ' — Weekend' : ' — Absent'}`}
                                    style={{
                                        width: 22, height: 22, borderRadius: 4,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.6rem', fontWeight: 600,
                                        background: present ? 'var(--success-bg)' : isWeekend ? 'transparent' : 'var(--danger-bg)',
                                        color: present ? 'var(--success)' : isWeekend ? 'var(--text-muted)' : 'var(--danger)',
                                        border: isTod ? '1.5px solid var(--brand-primary)' : '1px solid transparent',
                                        opacity: isWeekend ? 0.4 : 1,
                                    }}
                                >
                                    {format(d, 'd')}
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.65rem', fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success-bg)', border: '1px solid var(--success-border)' }} /> Present
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }} /> Absent
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, border: '1.5px solid var(--brand-primary)' }} /> Today
                        </span>
                    </div>
                </div>

                {/* ── Assigned Sites ── */}
                <div className="section-card anim-in anim-delay-4">
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
                    <div className="section-card anim-in anim-delay-5" style={{ padding: 0 }}>
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

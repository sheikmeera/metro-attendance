import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format } from 'date-fns'
import { Calendar, ClipboardList, MapPin, Clock, Filter } from 'lucide-react'
import { Translate } from '../utils/translateHelper'

const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    if (import.meta.env.PROD) return 'https://metro-attendance.onrender.com/api'
    return `${window.location.protocol}//${window.location.hostname}:4000/api`
}
const API_BASE_CORE = getApiBase()
const API_BASE = API_BASE_CORE.endsWith('/api') ? API_BASE_CORE.slice(0, -4) : API_BASE_CORE

function HistorySkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem' }}>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
        </div>
    )
}

export function UserHistory() {
    const { showToast, t } = useApp()
    const [records, setRecords] = useState([])
    const [days, setDays] = useState(30)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        client.get(`/employee/attendance?days=${days}`)
            .then(res => setRecords(Array.isArray(res.data) ? res.data : []))
            .catch(() => showToast('Failed to load history.', 'error'))
            .finally(() => setLoading(false))
    }, [days])

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 700 }}>

                {/* Header */}
                <div className="anim-in" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem', fontWeight: 700 }}>
                            {t('misc.employee')}
                        </p>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                            {t('page.my_history')}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Filter size={14} color="var(--text-muted)" />
                        <select
                            className="input"
                            style={{ width: 'auto', minWidth: 130, padding: '0.5rem 2rem 0.5rem 0.75rem' }}
                            value={days}
                            onChange={e => setDays(Number(e.target.value))}
                        >
                            <option value={7}>{t('label.last_7_days')}</option>
                            <option value={30}>{t('label.last_30_days')}</option>
                            <option value={90}>{t('label.last_90_days')}</option>
                        </select>
                    </div>
                </div>

                {/* Stats */}
                <div className="anim-in anim-delay-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>
                            <Calendar size={18} color="var(--success)" />
                        </div>
                        <div className="stat-info">
                            <div className="stat-value" style={{ color: 'var(--success)' }}>{loading ? '…' : records.length}</div>
                            <div className="stat-label">{t('stat.days_present')}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>
                            <ClipboardList size={18} color="var(--info)" />
                        </div>
                        <div className="stat-info">
                            <div className="stat-value" style={{ color: 'var(--info)' }}>{loading ? '…' : records.length}</div>
                            <div className="stat-label">{t('stat.reports_filed')}</div>
                        </div>
                    </div>
                </div>

                {/* Records */}
                <div className="section-card anim-in anim-delay-2" style={{ padding: 0 }}>
                    <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>{t('section.attendance_log')}</h3>
                        <span className="badge badge-info">{loading ? '…' : records.length} {t('label.records')}</span>
                    </div>

                    {loading ? (
                        <HistorySkeleton />
                    ) : records.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><ClipboardList size={32} /></div>
                            <p>{t('empty.no_history')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="table-scroll hide-mobile">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>{t('col.date')}</th>
                                            <th>{t('col.day')}</th>
                                            <th>{t('col.time')}</th>
                                            <th>{t('col.site')}</th>
                                            <th>{t('col.status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map(rec => (
                                            <tr key={rec.id}>
                                                <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                    {format(new Date(rec.date + 'T00:00:00'), 'dd MMM yyyy')}
                                                </td>
                                                <td style={{ color: 'var(--text-muted)' }}>
                                                    {format(new Date(rec.date + 'T00:00:00'), 'EEEE')}
                                                </td>
                                                <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{rec.time}</td>
                                                <td><Translate text={rec.site_name || '—'} /></td>
                                                <td>
                                                    <span className={`badge ${rec.status === 'manual' ? 'badge-warning' : 'badge-success'}`}>
                                                        {rec.status === 'manual' ? t('status.manual') : t('status.present')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile card list */}
                            <div className="hide-desktop" style={{ display: 'flex', flexDirection: 'column' }}>
                                {records.map((rec, i) => (
                                    <div
                                        key={rec.id}
                                        className="anim-in"
                                        style={{
                                            animationDelay: `${i * 0.04}s`,
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.75rem',
                                            padding: '1rem',
                                            borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}
                                    >
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 10,
                                            background: rec.status === 'manual' ? 'var(--warning-bg)' : 'var(--success-bg)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                            border: `1px solid ${rec.status === 'manual' ? 'rgba(249,115,22,0.3)' : 'var(--success-border)'}`,
                                        }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: rec.status === 'manual' ? 'var(--warning)' : 'var(--success)', lineHeight: 1 }}>
                                                {format(new Date(rec.date + 'T00:00:00'), 'd')}
                                            </span>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: rec.status === 'manual' ? 'var(--warning)' : 'var(--success)', textTransform: 'uppercase' }}>
                                                {format(new Date(rec.date + 'T00:00:00'), 'MMM')}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                                {format(new Date(rec.date + 'T00:00:00'), 'EEEE, dd MMM')}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 3, flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    <Clock size={10} style={{ flexShrink: 0 }} /> <span>{rec.time}</span>
                                                </span>
                                                {rec.site_name && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                                        <MapPin size={10} style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Translate text={rec.site_name} /></span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`badge ${rec.status === 'manual' ? 'badge-warning' : 'badge-success'}`} style={{ flexShrink: 0 }}>
                                            {rec.status === 'manual' ? t('status.manual') : t('status.present')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}

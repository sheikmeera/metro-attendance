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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.5rem' }}>
            <div className="skeleton" style={{ width: '30%', height: 20, marginBottom: 8, borderRadius: 4 }} />
            {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, opacity: 1 - i * 0.15 }} />
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

    const [selectedRecord, setSelectedRecord] = useState(null)

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
                            style={{ width: 'auto', minWidth: 100, padding: '0.4rem 1.75rem 0.4rem 0.5rem', fontSize: '0.8rem' }}
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
                <div className="anim-in anim-delay-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
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
                <div className="section-card anim-in anim-delay-2" style={{ padding: 0, marginTop: '1.25rem', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                    <div style={{ padding: '0.5rem 0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 className="section-title" style={{ margin: 0, fontSize: '1rem' }}>{t('section.attendance_log')}</h3>
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
                            {/* Desktop table (Hidden on < 640px) */}
                            <div className="hide-mobile" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
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

                            {/* Mobile Card Layout (Visible on < 640px) */}
                            <div className="hide-desktop" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                                {records.map((rec, i) => (
                                    <div
                                        key={rec.id}
                                        className="mobile-slide-in"
                                        onClick={() => setSelectedRecord(rec)}
                                        style={{
                                            animationDelay: `${i * 0.05}s`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.875rem',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 8,
                                            background: rec.status === 'manual' ? 'var(--warning-bg)' : 'var(--success-bg)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                            border: `1px solid ${rec.status === 'manual' ? 'var(--warning-border)' : 'var(--success-border)'}`,
                                        }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: rec.status === 'manual' ? 'var(--warning)' : 'var(--success)', lineHeight: 1 }}>
                                                {format(new Date(rec.date + 'T00:00:00'), 'd')}
                                            </span>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: rec.status === 'manual' ? 'var(--warning)' : 'var(--success)', textTransform: 'uppercase' }}>
                                                {format(new Date(rec.date + 'T00:00:00'), 'MMM')}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                <Translate text={rec.site_name || 'General Attendance'} />
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 2 }}>
                                                <span>{format(new Date(rec.date + 'T00:00:00'), 'EEEE')}</span>
                                                <span>•</span>
                                                <span>{rec.time}</span>
                                            </div>
                                        </div>
                                        <span className={`badge ${rec.status === 'manual' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                                            {rec.status === 'manual' ? t('status.manual') : 'PR'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Detail Modal */}
                {selectedRecord && (
                    <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
                        <div className="modal-box mobile-slide-in" onClick={e => e.stopPropagation()} style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Attendance Detail</h2>
                                <button onClick={() => setSelectedRecord(null)} className="btn-ghost" style={{ padding: '0.4rem', borderRadius: '50%' }}>×</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{
                                        width: 50, height: 50, borderRadius: 12,
                                        background: selectedRecord.status === 'manual' ? 'var(--warning-bg)' : 'var(--success-bg)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        border: `1px solid ${selectedRecord.status === 'manual' ? 'var(--warning-border)' : 'var(--success-border)'}`,
                                    }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: selectedRecord.status === 'manual' ? 'var(--warning)' : 'var(--success)', lineHeight: 1 }}>
                                            {format(new Date(selectedRecord.date + 'T00:00:00'), 'd')}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: selectedRecord.status === 'manual' ? 'var(--warning)' : 'var(--success)', textTransform: 'uppercase' }}>
                                            {format(new Date(selectedRecord.date + 'T00:00:00'), 'MMM')}
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{format(new Date(selectedRecord.date + 'T00:00:00'), 'EEEE, dd MMMM yyyy')}</div>
                                        <div style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{selectedRecord.time}</div>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Site Assignment</label>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                        <Translate text={selectedRecord.site_name || 'N/A'} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label>Report Status</label>
                                        <div>
                                            <span className={`badge ${selectedRecord.status === 'manual' ? 'badge-warning' : 'badge-success'}`}>
                                                {selectedRecord.status === 'manual' ? t('status.manual') : 'Present'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Sync ID</label>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>#{selectedRecord.id?.slice(-8)}</div>
                                    </div>
                                </div>

                                {selectedRecord.notes && (
                                    <div className="input-group">
                                        <label>Report Notes</label>
                                        <p style={{ fontSize: '0.875rem', margin: 0 }}>{selectedRecord.notes}</p>
                                    </div>
                                )}

                                <button onClick={() => setSelectedRecord(null)} className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

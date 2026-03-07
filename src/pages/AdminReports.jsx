import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format } from 'date-fns'
import { renderAvatar } from '../utils/avatarHelper'
import { MapPin, Camera, X } from 'lucide-react'
import { Translate } from '../utils/translateHelper'

const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    if (import.meta.env.PROD) return 'https://metro-attendance.onrender.com/api'
    return `${window.location.protocol}//${window.location.hostname}:4000/api`
}
const API_BASE_CORE = getApiBase()
const API_BASE = API_BASE_CORE.endsWith('/api') ? API_BASE_CORE.slice(0, -4) : API_BASE_CORE

export function AdminReports() {
    const { showToast, t } = useApp()
    const [reports, setReports] = useState([])
    const [employees, setEmployees] = useState([])
    const [sites, setSites] = useState([])
    const [filterEmp, setFilterEmp] = useState('')
    const [filterSite, setFilterSite] = useState('')
    const [filterDate, setFilterDate] = useState('')

    useEffect(() => {
        Promise.all([
            client.get('/admin/reports'),
            client.get('/admin/employees'),
            client.get('/admin/sites'),
        ]).then(([r, e, s]) => {
            setReports(r.data)
            setEmployees(e.data)
            setSites(s.data)
        }).catch(() => showToast('Failed to load reports.', 'error'))
    }, [])

    const filtered = useMemo(() => reports.filter(r => {
        if (filterEmp && r.employee_id !== filterEmp) return false
        if (filterSite && String(r.site_id) !== filterSite) return false
        if (filterDate && !r.report_time.startsWith(filterDate)) return false
        return true
    }), [reports, filterEmp, filterSite, filterDate])

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 1100 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.25rem', fontWeight: 600 }}>{t('misc.admin_panel')}</p>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{t('page.reports')}</h1>
                    </div>
                    <span className="badge badge-info">{filtered.length} {t('label.records')}</span>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ flex: '1 1 160px' }}><label>{t('col.employee')}</label>
                        <select className="input" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                            <option value="">{t('label.all_employees')}</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 160px' }}><label>{t('col.site')}</label>
                        <select className="input" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
                            <option value="">{t('label.all_sites')}</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.site_name}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 140px' }}><label>{t('label.date')}</label>
                        <input type="date" className="input" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                    </div>
                    {(filterEmp || filterSite || filterDate) && (
                        <div style={{ alignSelf: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => { setFilterEmp(''); setFilterSite(''); setFilterDate('') }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <X size={14} /> {t('action.clear')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Reports Table */}
                <div className="section-card" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon"><Camera size={28} /></div><p>{t('empty.no_reports')}</p></div>
                    ) : (
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead><tr><th>{t('col.employee')}</th><th>{t('col.site')}</th><th>{t('col.date')} & {t('col.time')}</th><th>GPS</th><th>{t('col.notes')}</th><th>{t('misc.photo')}</th><th style={{ textAlign: 'right' }}>{t('label.actions')}</th></tr></thead>
                                <tbody>
                                    {filtered.map(rep => (
                                        <tr key={rep.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {renderAvatar(rep.avatar)}
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}><Translate text={rep.employee_name} /></div>
                                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{rep.employee_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><Translate text={rep.site_name || '—'} /></td>
                                            <td style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                                                {rep.report_time ? format(new Date(rep.report_time), 'dd MMM, hh:mm aa') : '—'}
                                            </td>
                                            <td>
                                                {rep.latitude ? (
                                                    <a href={`https://maps.google.com/?q=${rep.latitude},${rep.longitude}`}
                                                        target="_blank" rel="noreferrer"
                                                        style={{ color: 'var(--info)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <MapPin size={12} /> {t('misc.view_map')}
                                                    </a>
                                                ) : '—'}
                                            </td>
                                            <td style={{ maxWidth: 200, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rep.notes || '—'}</td>
                                            <td>
                                                {rep.photo_url ? (
                                                    <a href={rep.photo_url.startsWith('http') ? rep.photo_url : `${API_BASE}${rep.photo_url}`} target="_blank" rel="noreferrer">
                                                        <img src={rep.photo_url.startsWith('http') ? rep.photo_url : `${API_BASE}${rep.photo_url}`} alt="Report"
                                                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                                                    </a>
                                                ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{t('misc.no_photo')}</span>}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn-ghost"
                                                    onClick={() => {
                                                        if (window.confirm('Reset this report? The employee will be able to report again for this site today.')) {
                                                            const dateStr = rep.report_time.split('T')[0]
                                                            client.delete(`/admin/attendance/reset?employee_id=${rep.employee_id}&date=${dateStr}&site_id=${rep.site_id}`)
                                                                .then(() => {
                                                                    showToast('Reporting reset successfully.', 'success')
                                                                    setReports(reports.filter(r => r.id !== rep.id))
                                                                })
                                                                .catch(() => showToast('Failed to reset report.', 'error'))
                                                        }
                                                    }}
                                                    style={{ padding: '4px 8px', color: 'var(--danger)' }}
                                                    title="Reset Report"
                                                >
                                                    <X size={14} />
                                                </button>
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

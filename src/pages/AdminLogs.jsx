import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format } from 'date-fns'
import { FileText, Download, X, Trash2, Eye, Image as ImageIcon, MapPin, Clock, User, CheckCircle2 } from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'
import { Translate } from '../utils/translateHelper'

const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    if (import.meta.env.PROD) return 'https://metro-attendance.onrender.com/api'
    return `${window.location.protocol}//${window.location.hostname}:4000/api`
}
const API_BASE_CORE = getApiBase()
const API_BASE = API_BASE_CORE.endsWith('/api') ? API_BASE_CORE.slice(0, -4) : API_BASE_CORE

export function AdminLogs() {
    const { showToast, t, language } = useApp()
    const [reports, setReports] = useState([])
    const [employees, setEmployees] = useState([])
    const [sites, setSites] = useState([])
    const [filterDate, setFilterDate] = useState('')
    const [filterEmp, setFilterEmp] = useState('')
    const [filterSite, setFilterSite] = useState('')
    const [detailRec, setDetailRec] = useState(null) // popup detail record

    const load = () => {
        Promise.all([
            client.get('/admin/reports'),
            client.get('/admin/employees'),
            client.get('/admin/sites')
        ]).then(([r, e, s]) => {
            setReports(r.data)
            setEmployees(e.data)
            setSites(s.data)
        }).catch(() => showToast('Failed to load records.', 'error'))
    }

    const handleDelete = async (rec) => {
        showToast(
            `Delete report for ${rec.employee_name} on ${rec.date}?`,
            'info',
            {
                onConfirm: async () => {
                    try {
                        await client.delete(`/admin/report/${rec.id || rec._id}`);
                        showToast('Report deleted successfully.', 'success');
                        setDetailRec(null);
                        load();
                    } catch (err) {
                        showToast(err.response?.data?.error || 'Failed to delete report.', 'error');
                    }
                },
                onCancel: () => showToast(null)
            }
        )
    }

    useEffect(() => { load() }, [])

    // Parse timestamp to local Date cleanly
    const parseReportTime = (ts) => {
        if (!ts) return null
        return new Date(ts)
    }

    const filtered = useMemo(() => reports.filter(r => {
        if (filterDate) {
            const d = parseReportTime(r.report_time)
            if (!d || format(d, 'yyyy-MM-dd') !== filterDate) return false
        }
        if (filterEmp && r.employee_id !== filterEmp) return false
        if (filterSite && r.site_id !== filterSite) return false
        return true
    }), [reports, filterDate, filterEmp, filterSite])

    // Build PDF URL based on active filters
    const downloadPDF = async () => {
        const token = localStorage.getItem('metro_token')
        const date = filterDate || new Date().toISOString().split('T')[0]
        let url

        if (filterEmp) {
            // Employee PDF
            url = `${API_BASE}/api/admin/logs/employee?employee_id=${filterEmp}&lang=${language}`
            if (filterDate) url += `&date=${filterDate}`
        } else if (filterSite) {
            // Site PDF
            url = `${API_BASE}/api/admin/logs/site?site_id=${filterSite}&date=${date}&lang=${language}`
        } else {
            // Daily PDF for the selected date
            url = `${API_BASE}/api/admin/logs/daily?date=${date}&lang=${language}`
        }

        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) { showToast('PDF generation failed.', 'error'); return }
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = filterEmp
                ? `metro_employee_${filterEmp}${filterDate ? '_' + filterDate : ''}.pdf`
                : filterSite
                    ? `metro_site_${filterSite}_${date}.pdf`
                    : `metro_daily_${date}.pdf`
            a.click()
            URL.revokeObjectURL(blobUrl)
        } catch { showToast('PDF download failed.', 'error') }
    }

    const exportCSV = () => {
        const rows = [
            ['Employee ID', 'Name', 'Department', 'Date', 'Time', 'Site', 'Notes'],
            ...filtered.map(r => {
                const d = parseReportTime(r.report_time)
                return [
                    r.employee_id, r.employee_name, r.department || '',
                    d ? format(d, 'yyyy-MM-dd') : '',
                    d ? format(d, 'HH:mm') : '',
                    r.site_name || '', r.notes || ''
                ].join(',')
            })
        ].join('\n')
        const blob = new Blob([rows], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'metro_attendance.csv'
        a.click()
    }

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 1200 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.03em', margin: '0 0 0.25rem', fontWeight: 600 }}>{t('misc.admin_panel')}</p>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{t('page.attendance')}</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <FileText size={15} /> {t('action.daily_pdf')}
                        </button>
                        <button className="btn btn-primary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Download size={15} /> {t('action.csv')}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ flex: '1 1 160px' }}>
                        <label>{t('label.date')}</label>
                        <input type="date" className="input" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                    </div>
                    <div className="input-group" style={{ flex: '1 1 200px' }}>
                        <label>{t('label.employee')}</label>
                        <select className="input" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                            <option value="">{t('label.all_employees')}</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 200px' }}>
                        <label>{t('nav.sites')}</label>
                        <select className="input" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
                            <option value="">All Sites</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.site_name}</option>)}
                        </select>
                    </div>
                    {(filterDate || filterEmp || filterSite) && (
                        <div style={{ alignSelf: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => { setFilterDate(''); setFilterEmp(''); setFilterSite('') }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <X size={14} /> {t('action.clear')}
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-info">{filtered.length} {t('label.records')}</span>
                </div>

                {/* Table / Cards */}
                <div className="section-card" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><FileText size={28} /></div>
                            <p>{t('empty.no_records')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="table-scroll hide-mobile">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>{t('col.employee')}</th>
                                            <th>{t('col.department')}</th>
                                            <th>{t('col.date')}</th>
                                            <th>{t('col.site')}</th>
                                            <th>Photo</th>
                                            <th>{t('col.notes')}</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(rec => {
                                            const dt = parseReportTime(rec.report_time)
                                            return (
                                                <tr key={rec.id} style={{ cursor: 'pointer' }} onClick={() => setDetailRec(rec)}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{ flexShrink: 0 }}>{renderAvatar(rec.avatar, '2rem')}</span>
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}><Translate text={rec.employee_name} /></div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rec.employee_id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><Translate text={rec.department || '—'} /></td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                            {dt ? format(dt, 'dd MMM yyyy') : '—'}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {dt ? format(dt, 'HH:mm') : '—'}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem' }}><Translate text={rec.site_name || '—'} /></td>
                                                    <td>
                                                        {rec.photo_url ? (
                                                            <div className="img-preview-thumb" onClick={(e) => { e.stopPropagation(); window.open(rec.photo_url.startsWith('http') ? rec.photo_url : `${API_BASE}${rec.photo_url}`, '_blank') }}>
                                                                <img
                                                                    src={rec.photo_url.startsWith('http') ? rec.photo_url : `${API_BASE}${rec.photo_url}`}
                                                                    alt="Capture"
                                                                    style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border)' }}
                                                                />
                                                            </div>
                                                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>No Photo</span>}
                                                    </td>
                                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.notes}>
                                                        {rec.notes || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-ghost btn-sm" style={{ padding: '0.3rem' }} title="View Details" onClick={(e) => { e.stopPropagation(); setDetailRec(rec) }}>
                                                                <Eye size={14} color="var(--brand-primary)" />
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm" style={{ padding: '0.3rem' }} title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(rec) }}>
                                                                <Trash2 size={14} color="var(--danger)" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile card list */}
                            <div className="hide-desktop" style={{ display: 'flex', flexDirection: 'column' }}>
                                {filtered.map(rec => {
                                    const dt = parseReportTime(rec.report_time)
                                    const photo = rec.photo_url ? (rec.photo_url.startsWith('http') ? rec.photo_url : `${API_BASE}${rec.photo_url}`) : null

                                    return (
                                        <div key={rec.id} onClick={() => setDetailRec(rec)} style={{
                                            padding: '1rem',
                                            borderBottom: '1px solid var(--border)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem',
                                            cursor: 'pointer'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {renderAvatar(rec.avatar, '2.5rem')}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                        <Translate text={rec.employee_name} />
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                        {rec.employee_id} · <Translate text={rec.department || ''} />
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                        {dt ? format(dt, 'dd MMM') : '—'}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        {dt ? format(dt, 'HH:mm') : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                                {photo && (
                                                    <img
                                                        src={photo}
                                                        alt="Capture"
                                                        onClick={(e) => { e.stopPropagation(); window.open(photo, '_blank') }}
                                                        style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
                                                    />
                                                )}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    {rec.site_name && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                                                            <MapPin size={12} /> <Translate text={rec.site_name} />
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {rec.notes || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No notes</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); setDetailRec(rec) }}>
                                                    <Eye size={13} style={{ marginRight: 4 }} /> View
                                                </button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); handleDelete(rec) }}>
                                                    <Trash2 size={13} style={{ marginRight: 4 }} /> {t('action.delete') || 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Detail Popup Modal (portalled to body) ── */}
                {detailRec && createPortal((() => {
                    const dt = parseReportTime(detailRec.report_time)
                    const photo = detailRec.photo_url ? (detailRec.photo_url.startsWith('http') ? detailRec.photo_url : `${API_BASE}${detailRec.photo_url}`) : null
                    return (
                        <div className="modal-overlay" onClick={() => setDetailRec(null)} style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                        }}>
                            <div onClick={e => e.stopPropagation()} style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
                                width: '100%', maxWidth: 520, maxHeight: '90dvh', overflowY: 'auto',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.22s ease'
                            }}>
                                {/* Header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Report Details</h3>
                                    <button onClick={() => setDetailRec(null)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                        padding: '0.25rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}><X size={18} /></button>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* Employee info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {renderAvatar(detailRec.avatar, '3rem')}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                <Translate text={detailRec.employee_name} />
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                {detailRec.employee_id} · <Translate text={detailRec.department || '—'} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div style={{ background: 'var(--glass-bg)', borderRadius: 10, padding: '0.75rem', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                                                <Clock size={11} /> Date & Time
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                {dt ? format(dt, 'dd MMM yyyy') : '—'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {dt ? format(dt, 'hh:mm a') : '—'}
                                            </div>
                                        </div>
                                        <div style={{ background: 'var(--glass-bg)', borderRadius: 10, padding: '0.75rem', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                                                <MapPin size={11} /> Site
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>
                                                <Translate text={detailRec.site_name || '—'} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Verified status */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle2 size={15} color={detailRec.verified ? 'var(--success, #22c55e)' : 'var(--text-muted)'} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: detailRec.verified ? 'var(--success, #22c55e)' : 'var(--text-muted)' }}>
                                            {detailRec.verified ? 'Verified' : 'Not Verified'}
                                        </span>
                                    </div>

                                    {/* GPS coordinates */}
                                    {(detailRec.latitude && detailRec.longitude) && (
                                        <div style={{ background: 'var(--glass-bg)', borderRadius: 10, padding: '0.75rem', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                                                📍 GPS Location
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                                {detailRec.latitude.toFixed(6)}, {detailRec.longitude.toFixed(6)}
                                            </div>
                                            <a
                                                href={`https://www.google.com/maps?q=${detailRec.latitude},${detailRec.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', marginTop: '0.3rem', display: 'inline-block' }}
                                            >
                                                Open in Google Maps ↗
                                            </a>
                                        </div>
                                    )}

                                    {/* Photo */}
                                    {photo && (
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                                📸 Captured Photo
                                            </div>
                                            <img
                                                src={photo}
                                                alt="Report capture"
                                                onClick={() => window.open(photo, '_blank')}
                                                style={{
                                                    width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 10,
                                                    border: '1px solid var(--border)', cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                                            📝 Notes
                                        </div>
                                        <div style={{
                                            fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                                            background: 'var(--glass-bg)', borderRadius: 8, padding: '0.75rem',
                                            border: '1px solid var(--border)', minHeight: 40
                                        }}>
                                            {detailRec.notes || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No notes provided</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer actions */}
                                <div style={{
                                    display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
                                    padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)'
                                }}>
                                    <button className="btn btn-ghost" onClick={() => setDetailRec(null)} style={{ fontSize: '0.8rem' }}>
                                        Close
                                    </button>
                                    <button className="btn" onClick={() => handleDelete(detailRec)} style={{
                                        fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                        border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.35rem'
                                    }}>
                                        <Trash2 size={13} /> Delete Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })(), document.body)}
            </div>
        </div>
    )
}

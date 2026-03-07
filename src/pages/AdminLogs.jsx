import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format } from 'date-fns'
import { FileText, Download, X } from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'
import { Translate } from '../utils/translateHelper'

const API_BASE = import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:4000`

export function AdminLogs() {
    const { showToast, t, language } = useApp()
    const [reports, setReports] = useState([])
    const [employees, setEmployees] = useState([])
    const [sites, setSites] = useState([])
    const [filterDate, setFilterDate] = useState('')
    const [filterEmp, setFilterEmp] = useState('')
    const [filterSite, setFilterSite] = useState('')

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
                                            <th>{t('col.time')}</th>
                                            <th>{t('col.site')}</th>
                                            <th>{t('col.notes')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(rec => {
                                            const dt = parseReportTime(rec.report_time)
                                            return (
                                                <tr key={rec.id}>
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
                                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                        {dt ? format(dt, 'dd MMM yyyy') : '—'}
                                                    </td>
                                                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                        {dt ? format(dt, 'HH:mm') : '—'}
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem' }}><Translate text={rec.site_name || '—'} /></td>
                                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.notes}>
                                                        {rec.notes || '—'}
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
                                    return (
                                        <div key={rec.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.875rem 1rem',
                                            borderBottom: '1px solid var(--border)',
                                        }}>
                                            {renderAvatar(rec.avatar, '2.2rem')}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                                    <Translate text={rec.employee_name} />
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {rec.employee_id} · <Translate text={rec.department || ''} />
                                                </div>
                                                {rec.site_name && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', marginTop: 2, fontWeight: 500 }}>
                                                        <Translate text={rec.site_name} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {dt ? format(dt, 'dd MMM') : '—'}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    {dt ? format(dt, 'HH:mm') : ''}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

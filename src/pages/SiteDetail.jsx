import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format } from 'date-fns'
import {
    ArrowLeft, MapPin, User, Briefcase, Calendar, CheckCircle,
    XCircle, FileText, Users, ClipboardList, Lock, Download
} from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'
import { Translate } from '../utils/translateHelper'

const API_BASE = import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:4000`

export function SiteDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { showToast, language } = useApp()

    const [site, setSite] = useState(null)
    const [attendance, setAttendance] = useState([])
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        try {
            const [sRes, aRes, rRes] = await Promise.all([
                client.get(`/admin/sites/${id}`),
                client.get(`/admin/attendance?site_id=${id}`),
                client.get(`/admin/reports?site_id=${id}`),
            ])
            setSite(sRes.data)
            setAttendance(aRes.data)
            setReports(rRes.data)
        } catch {
            showToast('Failed to load site details.', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [id])

    const handleClose = async () => {
        if (!confirm('Close this site? Employees will no longer be able to report to it.')) return
        try {
            await client.put(`/admin/site/${id}/close`)
            showToast('Site closed.', 'success')
            load()
        } catch { showToast('Failed to close site.', 'error') }
    }

    const downloadPDF = async () => {
        const token = localStorage.getItem('metro_token')
        const url = `${API_BASE}/api/admin/logs/site?site_id=${id}&lang=${language}`
        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) { showToast('PDF generation failed.', 'error'); return }
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = `metro_site_${id}_log.pdf`
            a.click()
            URL.revokeObjectURL(blobUrl)
        } catch { showToast('PDF download failed.', 'error') }
    }

    if (loading) return (
        <div className="page-shell"><div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
        </div></div>
    )

    if (!site) return (
        <div className="page-shell"><div className="page-content">
            <p style={{ color: 'var(--danger)' }}>Site not found.</p>
        </div></div>
    )

    const isActive = site.status === 'active'
    const today = new Date().toISOString().split('T')[0]
    const todayAtt = attendance.filter(a => a.date === today)

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 960 }}>

                {/* Back */}
                <button onClick={() => navigate('/sites')} className="btn btn-ghost" style={{ width: 'fit-content', gap: '0.4rem', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                    <ArrowLeft size={15} /> Back to Sites
                </button>

                {/* Site Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {isActive ? <CheckCircle size={11} /> : <Lock size={11} />} {site.status}
                            </span>
                        </div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}><Translate text={site.site_name} /></h1>
                        <div style={{ display: 'flex', flex: 'wrap', gap: '1rem', marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {site.client_name && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={13} /> <Translate text={site.client_name} /></span>}
                            {site.location_name && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> <Translate text={site.location_name} /></span>}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={13} /> Created {site.created_at ? format(new Date(site.created_at), 'dd MMM yyyy') : '—'}</span>
                        </div>
                        {site.work_details && <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}><Translate text={site.work_details} /></p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={downloadPDF} style={{ gap: '0.4rem', display: 'flex', alignItems: 'center', fontSize: '0.82rem' }}>
                            <Download size={15} /> Download PDF
                        </button>
                        {isActive && (
                            <button className="btn btn-danger" onClick={handleClose} style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                                <Lock size={15} /> Close Site
                            </button>
                        )}
                        {!isActive && site.completed_at && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <XCircle size={13} />
                                Closed {format(new Date(site.completed_at), 'dd MMM yyyy')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Assigned Employees (Always Available) */}
                {site.employees?.length > 0 && (
                    <div className="section-card" style={{ padding: 0 }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h3 className="section-title" style={{ margin: 0 }}>Assigned Employees</h3>
                        </div>
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Department</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {site.employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    {renderAvatar(emp.avatar)}
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}><Translate text={emp.name} /></div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><Translate text={emp.department || '—'} /></td>
                                            <td><span className="badge badge-info">{emp.role === 'admin' ? 'Admin' : 'Employee'}</span></td>
                                            <td><span className="badge badge-success">Assigned</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── ACTIVE: Dashboard ── */}
                {isActive && (
                    <>
                        {/* Quick stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            {[
                                { icon: Users, val: site.employees?.length ?? 0, label: 'Assigned', color: 'rgba(245,158,11,0.12)' },
                                { icon: CheckCircle, val: todayAtt.length, label: 'Present Today', color: 'var(--success-bg)', tc: 'var(--success)' },
                                { icon: ClipboardList, val: attendance.length, label: 'Total Records', color: 'var(--info-bg)', tc: 'var(--info)' },
                                { icon: FileText, val: reports.length, label: 'Reports Filed', color: 'var(--warning-bg)' },
                            ].map(({ icon: Icon, val, label, color, tc }, i) => (
                                <div key={i} className="stat-card">
                                    <div className="stat-icon" style={{ background: color }}><Icon size={18} color={tc} /></div>
                                    <div className="stat-info"><div className="stat-value" style={tc ? { color: tc } : {}}>{val}</div><div className="stat-label">{label}</div></div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Attendance */}
                        <div className="section-card" style={{ padding: 0 }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="section-title" style={{ margin: 0 }}>Recent Attendance</h3>
                                <span className="badge badge-info">{attendance.length} records</span>
                            </div>
                            {attendance.length === 0 ? (
                                <div className="empty-state"><div className="empty-icon"><ClipboardList size={28} /></div><p>No attendance yet.</p></div>
                            ) : (
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead><tr><th>Employee</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {attendance.slice(0, 20).map(r => (
                                                <tr key={r.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {renderAvatar(r.avatar, '1.1rem')}
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}><Translate text={r.employee_name} /></div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.employee_id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{format(new Date(r.date), 'dd MMM yyyy')}</td>
                                                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.time}</td>
                                                    <td><span className={`badge ${r.status === 'manual' ? 'badge-warning' : 'badge-success'}`}>{r.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── CLOSED: Read-only logs ── */}
                {!isActive && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            {[
                                { icon: Users, val: site.employees?.length ?? 0, label: 'Employees' },
                                { icon: ClipboardList, val: attendance.length, label: 'Attendance Records' },
                                { icon: FileText, val: reports.length, label: 'Reports Filed' },
                            ].map(({ icon: Icon, val, label }, i) => (
                                <div key={i} className="stat-card">
                                    <div className="stat-icon"><Icon size={18} /></div>
                                    <div className="stat-info"><div className="stat-value">{val}</div><div className="stat-label">{label}</div></div>
                                </div>
                            ))}
                        </div>

                        <div className="section-card" style={{ padding: 0 }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                                <h3 className="section-title" style={{ margin: 0 }}>Full Attendance Log (Read-only)</h3>
                            </div>
                            {attendance.length === 0 ? (
                                <div className="empty-state"><div className="empty-icon"><ClipboardList size={28} /></div><p>No records for this site.</p></div>
                            ) : (
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead><tr><th>Employee</th><th>Date</th><th>Time</th><th>Photo</th><th>Notes</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {attendance.map(r => (
                                                <tr key={r.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {renderAvatar(r.avatar, '1.1rem')}
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}><Translate text={r.employee_name} /></div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.employee_id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{format(new Date(r.date), 'dd MMM yyyy')}</td>
                                                    <td>{r.time}</td>
                                                    <td>{r.photo_url ? <a href={r.photo_url.startsWith('http') ? r.photo_url : `${API_BASE}${r.photo_url}`} target="_blank" rel="noreferrer"><img src={r.photo_url.startsWith('http') ? r.photo_url : `${API_BASE}${r.photo_url}`} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5 }} alt="report" /></a> : '—'}</td>
                                                    <td style={{ maxWidth: 180, fontSize: '0.78rem', color: 'var(--text-muted)' }}><Translate text={r.notes || '—'} /></td>
                                                    <td><span className={`badge ${r.status === 'manual' ? 'badge-warning' : 'badge-success'}`}>{r.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div >
    )
}

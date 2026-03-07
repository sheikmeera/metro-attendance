import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format } from 'date-fns'
import {
    ArrowLeft, Briefcase, Phone, Mail, Calendar,
    MapPin, Edit3, X, Save, UserX, UserCheck, Clock,
    Shield, Activity, Building2, ChevronRight,
    FileText, Camera, MessageSquare
} from 'lucide-react'
import { Translate } from '../utils/translateHelper'

const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    if (import.meta.env.PROD) return 'https://metro-attendance.onrender.com/api'
    return `${window.location.protocol}//${window.location.hostname}:4000/api`
}
const API_BASE_CORE = getApiBase()
const BASE_URL = API_BASE_CORE.endsWith('/api') ? API_BASE_CORE.slice(0, -4) : API_BASE_CORE
const API_BASE = API_BASE_CORE

const CSS = `
    .ed { display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem 0; width: 100%; max-width: 900px; margin: 0 auto; }
    .ed-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    .ed-profile { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; position: relative; box-shadow: var(--shadow-card); }
    .ed-cover { height: 140px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); position: relative; }
    .ed-avatar-anchor { position: absolute; top: 90px; left: 2.5rem; z-index: 10; }
    .ed-avatar-frame { width: 100px; height: 100px; border-radius: var(--radius-lg); background: var(--bg-surface); padding: 4px; border: 1px solid var(--border); box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
    .ed-avatar-inner { width: 100%; height: 100%; border-radius: calc(var(--radius-lg) - 4px); overflow: hidden; background: var(--bg-base); display: flex; align-items: center; justify-content: center; }
    .ed-avatar-status { position: absolute; bottom: -2px; right: -2px; width: 24px; height: 24px; border-radius: 50%; border: 4px solid var(--bg-surface); background: var(--success); z-index: 2; }
    .ed-avatar-status.inactive { background: var(--danger); }
    .ed-profile-body { padding: 50px 2rem 2rem; display: grid; grid-template-columns: 1fr auto; gap: 2rem; align-items: flex-start; }
    .ed-info-main { display: flex; flex-direction: column; gap: 0.5rem; }
    .ed-name { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.03em; margin: 0; color: var(--text-primary); }
    .ed-meta-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.25rem; }
    .ed-chip { display: flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
    .ed-chip b { color: var(--brand-primary); font-family: monospace; font-size: 0.8rem; }
    .ed-contact-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; }
    .ed-contact-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--text-muted); }
    .ed-profile-actions { display: flex; gap: 0.75rem; padding-top: 0.5rem; }
    .ed-stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); border-top: 1px solid var(--border); background: rgba(255, 255, 255, 0.015); }
    .ed-stat-cell { padding: 1.25rem; text-align: center; border-right: 1px solid var(--border); }
    .ed-stat-cell:last-child { border-right: none; }
    .ed-stat-val { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); display: block; line-height: 1; }
    .ed-stat-lbl { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.4rem; font-weight: 700; }
    .ed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; width: 100%; }
    .ed-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; box-shadow: var(--shadow-card); }
    .ed-card-head { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.02); }
    .ed-card-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; }
    .ed-att-row { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border); }
    .ed-date-chip { width: 42px; height: 42px; background: var(--glass-bg); border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .ed-site-row { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border); }
    .ed-report-row { display: flex; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
    .ed-report-thumb { width: 54px; height: 54px; border-radius: 8px; object-fit: cover; background: var(--bg-surface); border: 1px solid var(--border); flex-shrink: 0; }
    @media (max-width: 950px) { .ed-grid { grid-template-columns: 1fr; } }
    @media (max-width: 768px) {
        .ed { padding: 0.5rem 1rem; }
        .ed-profile-body { grid-template-columns: 1fr; padding: 60px 1.5rem 1.5rem; gap: 1.5rem; }
        .ed-profile-actions { width: 100%; justify-content: flex-start; }
        .ed-stats-strip { grid-template-columns: 1fr 1fr; }
        .ed-stat-cell:nth-child(even) { border-right: none; }
        .ed-stat-cell:nth-child(n+3) { border-top: 1px solid var(--border); }
    }
`;

export function AdminEmployeeDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { showToast } = useApp()

    const [emp, setEmp] = useState(null)
    const [attendance, setAttendance] = useState([])
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [showEditModal, setShowEditModal] = useState(false)
    const [departments, setDepartments] = useState([])
    const [form, setForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState(null)

    const load = async () => {
        try {
            const [eRes, aRes, dRes, rRes] = await Promise.all([
                client.get(`/admin/employees/${id}`),
                client.get(`/admin/attendance?employee_id=${id}`),
                client.get('/admin/departments'),
                client.get(`/admin/reports?employee_id=${id}`),
            ])
            setEmp(eRes.data)
            setAttendance(aRes.data)
            setDepartments(dRes.data)
            setReports(rRes.data)
            setForm(eRes.data)
        } catch {
            showToast('Failed to load employee details.', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [id])

    const openEdit = () => { setForm({ ...emp, pin: '' }); setAvatarPreview(null); setShowEditModal(true) }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const formData = new FormData()
            formData.append('name', form.name || '')
            formData.append('phone', form.phone || '')
            formData.append('email', form.email || '')
            formData.append('department', form.department || '')
            if (form.pin) formData.append('pin', form.pin)
            const avatarInput = document.getElementById('modal-avatar-upload')
            if (avatarInput?.files[0]) formData.append('avatar', avatarInput.files[0])
            await client.put(`/admin/employee/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            showToast('Employee updated successfully.', 'success')
            setShowEditModal(false)
            load()
        } catch (err) {
            showToast(err.response?.data?.error || 'Update failed.', 'error')
        }
        setSaving(false)
    }

    const handleToggleStatus = async () => {
        try {
            if (emp.status === 'active') {
                await client.delete(`/admin/employee/${id}`)
                showToast('Employee deactivated.', 'success')
            } else {
                await client.post(`/admin/employee/${id}/activate`)
                showToast('Employee activated.', 'success')
            }
            load()
        } catch { showToast('Action failed.', 'error') }
    }

    const renderAvatar = (avatar, size) => {
        const fill = size === '100%'
        const base = fill
            ? { width: '100%', height: '100%', display: 'block' }
            : { width: size, height: size, borderRadius: '50%', display: 'block' }

        if (avatar?.startsWith?.('http')) {
            return <img src={avatar} alt="Avatar" style={{ ...base, objectFit: 'cover' }} />
        }

        if (avatar?.includes?.('uploads')) {
            const path = avatar.startsWith('/') ? avatar : `/${avatar}`
            return <img src={`${BASE_URL}${path}`} alt="Avatar" style={{ ...base, objectFit: 'cover' }} />
        }

        return (
            <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fill ? '3rem' : `calc(${size} * 0.38)`, background: 'linear-gradient(135deg,rgba(245,158,11,.18),rgba(245,158,11,.04))' }}>
                {avatar || '👤'}
            </div>
        )
    }

    if (loading) return (
        <div className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div style={{ textAlign: 'center' }}>
                <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3, display: 'block', margin: '0 auto .75rem' }} />
                <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Loading employee...</span>
            </div>
        </div>
    )

    if (!emp) return (
        <div className="page-shell"><div className="page-content">
            <p style={{ color: 'var(--danger)' }}>Employee not found.</p>
        </div></div>
    )

    const isActive = emp.status === 'active'
    const uniqueDays = [...new Set(attendance.map(r => r.date))]
    const totalPresent = uniqueDays.length
    // Average attendance could be calculated against total working days, 
    // but for now 100% just shows they are active.
    const attendancePct = attendance.length > 0 ? 100 : 0

    const uniqueSites = Object.values(
        attendance.reduce((acc, r) => {
            if (r.site_id && !acc[r.site_id]) acc[r.site_id] = { id: r.site_id, name: r.site_name, count: 0 }
            if (r.site_id) acc[r.site_id].count++
            return acc
        }, {})
    )

    const coverBg = isActive
        ? 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)'
        : 'linear-gradient(135deg,#180a0a 0%,#2a1010 100%)'

    return (
        <div className="page-shell page-enter">
            <style>{CSS}</style>
            <div className="page-content ed">

                {/* ══ BREADCRUMB BAR ══ */}
                <div className="ed-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        <button onClick={() => navigate('/employees')} className="btn btn-ghost"
                            style={{ gap: '.35rem', fontSize: '.8rem', padding: '.4rem .85rem', borderRadius: 100 }}>
                            <ArrowLeft size={13} /><span className="ed-btn-lbl">Employees</span>
                        </button>
                        <ChevronRight size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Translate text={emp.name} />
                        </span>
                    </div>
                </div>

                {/* ══ PROFILE HERO ══ */}
                <div className="ed-profile">
                    <div className="ed-cover" style={{ background: coverBg }} />

                    <div className="ed-avatar-anchor">
                        <div className="ed-avatar-frame">
                            <div className="ed-avatar-inner">
                                {renderAvatar(emp.avatar, '100%')}
                            </div>
                            <div className={`ed-avatar-status ${isActive ? 'active' : 'inactive'}`} />
                        </div>
                    </div>

                    <div className="ed-profile-body">
                        <div className="ed-info-main">
                            <h1 className="ed-name"><Translate text={emp.name} /></h1>
                            <div className="ed-meta-row">
                                <span className="ed-chip">ID: <b>{emp.id}</b></span>
                                {emp.department && (
                                    <span className="ed-chip"><Briefcase size={12} /><Translate text={emp.department} /></span>
                                )}
                                <span className="ed-chip"><Shield size={12} />{emp.role || 'Employee'}</span>
                                {emp.created_at && (
                                    <span className="ed-chip"><Calendar size={12} />Joined {format(new Date(emp.created_at), 'dd MMM yyyy')}</span>
                                )}
                            </div>
                            <div className="ed-contact-row">
                                {emp.phone && (
                                    <div className="ed-contact-item"><Phone size={14} />{emp.phone}</div>
                                )}
                                {emp.email && (
                                    <div className="ed-contact-item"><Mail size={14} />{emp.email}</div>
                                )}
                            </div>
                        </div>

                        <div className="ed-profile-actions">
                            <button className="btn btn-primary" onClick={openEdit} style={{ gap: '.5rem' }}>
                                <Edit3 size={15} /> Edit
                            </button>
                            <button className={`btn ${isActive ? 'btn-ghost' : 'btn-success'}`} onClick={handleToggleStatus} style={{ gap: '.5rem' }}>
                                {isActive ? <><UserX size={15} /> Deactivate</> : <><UserCheck size={15} /> Activate</>}
                            </button>
                        </div>
                    </div>

                    <div className="ed-stats-strip">
                        <div className="ed-stat-cell">
                            <span className="ed-stat-val">{attendance.length}</span>
                            <span className="ed-stat-lbl">Check-ins</span>
                        </div>
                        <div className="ed-stat-cell">
                            <span className="ed-stat-val">{totalPresent}</span>
                            <span className="ed-stat-lbl">Days Present</span>
                        </div>
                        <div className="ed-stat-cell">
                            <span className="ed-stat-val">{uniqueSites.length}</span>
                            <span className="ed-stat-lbl">Sites</span>
                        </div>
                        <div className="ed-stat-cell">
                            <span className="ed-stat-val">{reports.length}</span>
                            <span className="ed-stat-lbl">Reports</span>
                        </div>
                        <div className="ed-stat-cell">
                            <span className="ed-stat-val">{attendancePct}%</span>
                            <span className="ed-stat-lbl">Attendance</span>
                        </div>
                    </div>
                </div>

                {/* ══ CONTENT GRID ══ */}
                <div className="ed-grid">

                    {/* Sites Card */}
                    <div className="ed-card">
                        <div className="ed-card-head">
                            <span className="ed-card-title"><Building2 size={14} /> Sites Attended</span>
                        </div>
                        {uniqueSites.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No sites attended.</div>
                        ) : (
                            uniqueSites.map((site, i) => (
                                <div key={i} className="ed-site-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Building2 size={16} style={{ opacity: 0.6 }} />
                                        <span style={{ fontWeight: 600 }}><Translate text={site.name} /></span>
                                    </div>
                                    <span className="badge badge-info">{site.count} visits</span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Attendance Card */}
                    <div className="ed-card">
                        <div className="ed-card-head">
                            <span className="ed-card-title"><Activity size={14} /> Recent Check-ins</span>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {attendance.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</div>
                            ) : (
                                attendance.slice(0, 20).map((r, i) => (
                                    <div key={i} className="ed-att-row">
                                        <div className="ed-date-chip">
                                            <span style={{ fontSize: '1rem', fontWeight: 800 }}>{format(new Date(r.date), 'dd')}</span>
                                            <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>{format(new Date(r.date), 'MMM')}</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}><Translate text={r.site_name} /></div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>
                                                <Clock size={10} /> {r.time}
                                            </div>
                                        </div>
                                        {r.latitude && (
                                            <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer"
                                                style={{ color: 'var(--brand-primary)', opacity: 0.8 }}>
                                                <MapPin size={16} />
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ REPORTING LOGS ══ */}
                <div className="ed-card">
                    <div className="ed-card-head">
                        <span className="ed-card-title"><FileText size={14} /> Reporting History</span>
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {reports.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}> no reports filed.</div>
                        ) : (
                            reports.map((r, i) => (
                                <div key={i} className="ed-report-row">
                                    <div className="ed-report-thumb">
                                        {r.photo_url ? (
                                            <img src={r.photo_url.startsWith('http') ? r.photo_url : `${BASE_URL}${r.photo_url.startsWith('/') ? r.photo_url : `/${r.photo_url}`}`}
                                                alt="Report"
                                                onError={e => e.target.style.display = 'none'} />
                                        ) : (
                                            <Camera size={20} style={{ opacity: 0.2 }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700 }}><Translate text={r.site_name} /></div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>#{r.id.slice(-6)}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
                                            <span>{format(new Date(r.report_time), 'dd MMM yyyy, HH:mm')}</span>
                                            {r.latitude && (
                                                <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer"
                                                    style={{ color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    <MapPin size={10} /> GPS
                                                </a>
                                            )}
                                        </div>
                                        {r.notes && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-surface)', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
                                                <Translate text={r.notes} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* ══ EDIT MODAL ══ */}
            {showEditModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Employee</h2>
                            <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSave} style={{ padding: '1.5rem' }}>
                            {/* Avatar Upload */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ position: 'relative' }}>
                                    {avatarPreview
                                        ? <img src={avatarPreview} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                                        : renderAvatar(emp.avatar, '80px')
                                    }
                                    <label htmlFor="modal-avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--brand-primary)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-card)' }}>
                                        <Edit3 size={12} color="#000" />
                                        <input id="modal-avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) setAvatarPreview(URL.createObjectURL(f)) }} />
                                    </label>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click to change profile picture</div>
                            </div>

                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <label>Full Name</label>
                                <input className="input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label>Phone</label>
                                    <input className="input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Email</label>
                                    <input className="input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group" style={{ margin: '1rem 0' }}>
                                <label>Department</label>
                                <select className="input" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} required>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>

                            <div className="input-group" style={{ marginBottom: '2rem' }}>
                                <label>Security PIN (Leave blank to keep current)</label>
                                <input className="input" type="password" value={form.pin || ''} onChange={e => setForm({ ...form, pin: e.target.value })} maxLength={6} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 120 }}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

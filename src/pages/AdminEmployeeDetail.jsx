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

const API_BASE = import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:4000`

const CSS = `
        .ed { display: flex; flex - direction: column; gap: 1.25rem; }

/* ── Top bar ── */
.ed - topbar { display: flex; align - items: center; justify - content: space - between; gap: .75rem; flex - wrap: wrap; }
.ed - btn - lbl { }

/* ── Profile hero ── */
.ed - profile {
    position: relative;
    border - radius: var(--radius - xl);
    border: 1px solid var(--border);
    background: var(--glass - bg);
    backdrop - filter: blur(20px);
    overflow: hidden;
}
.ed - cover {
    height: 180px;
    position: relative;
    overflow: hidden;
}
.ed - cover - dots {
    position: absolute; inset: 0;
    background - image: radial - gradient(rgba(255, 255, 255, .045) 1px, transparent 1px);
    background - size: 22px 22px;
}
.ed - cover - glow {
    position: absolute; bottom: -30px; right: 80px;
    width: 280px; height: 140px;
    filter: blur(60px); border - radius: 50 %;
}
.ed - cover - glow2 {
    position: absolute; top: -10px; left: 40px;
    width: 160px; height: 80px;
    filter: blur(50px); border - radius: 50 %;
    opacity: .5;
}

/* Avatar: absolute, straddles cover-bottom edge */
.ed - avatar - anchor {
    position: absolute;
    top: calc(180px - 65px);
    left: 2.5rem;
    z - index: 10;
}

/* Framed Squircle Avatar */
.ed - avatar - frame {
    position: relative;
    width: 130px;
    height: 130px;
    background: var(--bg - surface);
    padding: 6px;
    border - radius: 32px; /* Squircle-like */
    border: 1px solid var(--border);
    box - shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    align - items: center;
    justify - content: center;
    overflow: visible;
}

.ed - avatar - inner {
    width: 100 %;
    height: 100 %;
    border - radius: 26px;
    overflow: hidden;
    background: var(--glass - bg);
    display: flex;
    align - items: center;
    justify - content: center;
}

.ed - avatar - status {
    position: absolute;
    bottom: 5px;
    right: 5px;
    width: 28px;
    height: 28px;
    border - radius: 50 %;
    border: 4px solid var(--bg - surface);
    z - index: 2;
    background: var(--success);
    box - shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.ed - avatar - status.inactive {
    background: var(--danger);
}

/* Action buttons: absolute, just below cover on right */
.ed - profile - actions {
    position: absolute;
    top: calc(180px + 10px);
    right: 2rem;
    display: flex;
    gap: .5rem;
    z - index: 10;
}

/* Profile info: in normal flow; padding-top clears avatar overhang */
.ed - profile - body {
    padding: 72px 2rem 1.25rem;  /* 60px avatar overhang + 12px gap */
}

/* Name row */
.ed - name - row { display: flex; align - items: center; gap: .7rem; flex - wrap: wrap; margin: 0 0 .4rem; }
.ed - name { font - size: 1.85rem; font - weight: 800; letter - spacing: -.045em; line - height: 1.1; }

/* Meta chips row */
.ed - meta - row { display: flex; align - items: center; gap: .5rem; flex - wrap: wrap; margin - bottom: .6rem; }
.ed - chip {
    display: inline - flex; align - items: center; gap: .3rem;
    font - size: .75rem; font - weight: 600;
    color: var(--text - secondary);
    background: var(--glass - bg);
    border: 1px solid var(--glass - border);
    padding: .25rem .65rem; border - radius: 100px;
}
.ed - chip.brand { color: var(--brand - primary); background: rgba(245, 158, 11, .08); border - color: rgba(245, 158, 11, .18); }

/* Contact pills */
.ed - contact - row { display: flex; gap: .5rem; flex - wrap: wrap; margin - bottom: .5rem; }
.ed - contact - pill {
    display: inline - flex; align - items: center; gap: .35rem;
    font - size: .75rem; font - weight: 500; color: var(--text - muted);
    background: var(--glass - bg); border: 1px solid var(--glass - border);
    padding: .3rem .75rem; border - radius: 100px;
}

/* Stats strip at bottom of hero */
.ed - stats - strip {
    display: flex;
    border - top: 1px solid var(--border);
    margin: 0 0;
}
.ed - stat - cell {
    flex: 1; text - align: center;
    padding: .875rem .5rem;
    border - right: 1px solid var(--border);
}
.ed - stat - cell: last - child { border - right: none; }
.ed - stat - val { font - size: 1.5rem; font - weight: 800; letter - spacing: -.04em; line - height: 1; color: var(--text - primary); }
.ed - stat - lbl { font - size: .6rem; font - weight: 600; color: var(--text - muted); text - transform: uppercase; letter - spacing: .07em; margin - top: .2rem; }

/* ── Content grid ── */
/* ── Content grid ── */
.ed - grid { display: flex; flex - direction: column; gap: 1.5rem; width: 100 %; }

/* ── Cards ── */
.ed - card { background: var(--glass - bg); border: 1px solid var(--glass - border); border - radius: var(--radius - lg); backdrop - filter: blur(16px); overflow: hidden; }
.ed - card - head { display: flex; align - items: center; justify - content: space - between; padding: .875rem 1.25rem; border - bottom: 1px solid var(--border); }
.ed - card - title { display: flex; align - items: center; gap: .4rem; font - size: .7rem; font - weight: 700; text - transform: uppercase; letter - spacing: .09em; color: var(--text - muted); }

/* ── Attendance rows ── */
.ed - att - row { display: flex; align - items: center; gap: 1rem; padding: .8rem 1.25rem; transition:background .15s; }
.ed - att - row:hover { background: rgba(255, 255, 255, .025); }
.ed - att - row +.ed - att - row { border - top: 1px solid var(--border); }
.ed - date - chip { flex - shrink: 0; width: 44px; text - align: center; padding: .4rem .25rem; background: rgba(245, 158, 11, .06); border: 1px solid rgba(245, 158, 11, .14); border - radius: 9px; }

/* ── Sites ── */
.ed - sites - list { display: flex; flex - direction: column; }
.ed - site - row { display: flex; align - items: center; justify - content: space - between; padding: .7rem 1.25rem; border - top: 1px solid var(--border); gap: .75rem; }

/* ── Report rows ── */
.ed - report - row { display: flex; gap: 1rem; padding: .875rem 1.25rem; border - top: 1px solid var(--border); }
.ed - report - thumb { width: 60px; height: 60px; flex - shrink: 0; border - radius: 10px; object - fit: cover; background: var(--glass - bg); border: 1px solid var(--border); display: flex; align - items: center; justify - content: center; overflow: hidden; }

/* ── Mobile ── */
@media(max - width: 767px) {
    .ed - cover { height: 110px; }
    .ed - avatar - anchor { top: calc(110px - 60px); left: 1.1rem; }
    .ed - profile - actions { top: calc(110px + 8px); right: 1.1rem; }
    .ed - profile - body { padding: 72px 1.1rem 1rem; }
    .ed - name { font - size: 1.4rem; }
    .ed - btn - lbl { display: none; }
    .ed - stats - strip { flex - wrap: wrap; }
    .ed - stat - cell { min - width: 50 %; border - bottom: 1px solid var(--border); }
    .ed - stat - cell: nth - child(2n) { border - right: none; }
    .ed - grid { grid - template - columns: 1fr; }
    .ed - att - row { padding: .7rem 1rem; gap: .75rem; }
    .ed - report - row { padding: .75rem 1rem; }
    .ed - report - thumb { width: 48px; height: 48px; }
    .ed - card - head { padding: .75rem 1rem; }
}
`

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
                client.get(`/ admin / employees / ${id} `),
                client.get(`/ admin / attendance ? employee_id = ${id} `),
                client.get('/admin/departments'),
                client.get(`/ admin / reports ? employee_id = ${id} `),
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
            await client.put(`/ admin / employee / ${id} `, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
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
                await client.delete(`/ admin / employee / ${id} `)
                showToast('Employee deactivated.', 'success')
            } else {
                await client.post(`/ admin / employee / ${id}/activate`)
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

        if (avatar?.startsWith?.('/uploads')) {
            const baseUrl = API_BASE.replace('/api', '')
            return <img src={`${baseUrl}${avatar}`} alt="Avatar" style={{ ...base, objectFit: 'cover' }} />
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
    const totalPresent = attendance.filter(r => r.status !== 'absent').length
    const attendancePct = attendance.length > 0 ? Math.round((totalPresent / attendance.length) * 100) : 0

    const uniqueSites = Object.values(
        attendance.reduce((acc, r) => {
            if (r.site_id && !acc[r.site_id]) acc[r.site_id] = { id: r.site_id, name: r.site_name, count: 0 }
            if (r.site_id) acc[r.site_id].count++
            return acc
        }, {})
    )

    const coverBg = isActive
        ? 'linear-gradient(135deg,#071828 0%,#0e2340 40%,#1a3a5c 70%,rgba(245,158,11,.15) 100%)'
        : 'linear-gradient(135deg,#180a0a 0%,#2a1010 50%,rgba(239,68,68,.1) 100%)'

    const glowColor = isActive ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'

    return (
        <div className="page-shell page-enter">
            <style>{CSS}</style>
            <div className="page-content ed" style={{ maxWidth: 850 }}>

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

                    {/* Cover strip */}
                    <div className="ed-cover" style={{ background: coverBg }}>
                        <div className="ed-cover-dots" />
                        <div className="ed-cover-glow" style={{ background: glowColor }} />
                        <div className="ed-cover-glow2" style={{ background: glowColor }} />
                    </div>

                    {/* Avatar: absolute, straddles cover boundary */}
                    <div className="ed-avatar-anchor">
                        <div className="ed-avatar-frame">
                            <div className="ed-avatar-inner">
                                {renderAvatar(emp.avatar, '100%')}
                            </div>
                            <div className={`ed-avatar-status ${isActive ? 'active' : 'inactive'}`} />
                        </div>
                    </div>

                    {/* Action buttons: absolute, below cover on right */}
                    <div className="ed-profile-actions">
                        <button className="btn btn-primary" onClick={openEdit}
                            style={{ gap: '.4rem', padding: '.5rem 1.1rem', fontSize: '.82rem' }}>
                            <Edit3 size={14} /><span className="ed-btn-lbl">Edit</span>
                        </button>
                        <button className={`btn ${isActive ? 'btn-ghost' : 'btn-success'}`}
                            onClick={handleToggleStatus}
                            style={{ gap: '.4rem', padding: '.5rem .9rem', fontSize: '.82rem' }}>
                            {isActive ? <><UserX size={14} /><span className="ed-btn-lbl">Deactivate</span></> : <><UserCheck size={14} /><span className="ed-btn-lbl">Activate</span></>}
                        </button>
                    </div>

                    {/* Profile body: padding-top clears the avatar's lower half */}
                    <div className="ed-profile-body">
                        <div className="ed-name-row">
                            <span className="ed-name"><Translate text={emp.name} /></span>
                            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 700, fontSize: '.65rem' }}>
                                {isActive ? '● Active' : '● Inactive'}
                            </span>
                        </div>
                        <div className="ed-meta-row">
                            <span className="ed-chip brand">
                                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{emp.id}</span>
                            </span>
                            {emp.department && (
                                <span className="ed-chip"><Briefcase size={11} /><Translate text={emp.department} /></span>
                            )}
                            <span className="ed-chip"><Shield size={11} />{emp.role || 'Employee'}</span>
                            {emp.created_at && (
                                <span className="ed-chip"><Calendar size={11} />Joined {format(new Date(emp.created_at), 'dd MMM yyyy')}</span>
                            )}
                        </div>
                        {(emp.phone || emp.email) && (
                            <div className="ed-contact-row">
                                {emp.phone && (
                                    <span className="ed-contact-pill"><Phone size={12} color="var(--brand-primary)" />{emp.phone}</span>
                                )}
                                {emp.email && (
                                    <span className="ed-contact-pill"><Mail size={12} color="var(--brand-primary)" />{emp.email}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats strip */}
                    <div className="ed-stats-strip">
                        {[
                            { val: attendance.length, lbl: 'Check-ins' },
                            { val: totalPresent, lbl: 'Days Present' },
                            { val: uniqueSites.length, lbl: 'Sites Visited' },
                            { val: reports.length, lbl: 'Reports Filed' },
                            { val: `${attendancePct}%`, lbl: 'Attendance Rate' },
                        ].map((s, i) => (
                            <div key={i} className="ed-stat-cell">
                                <div className="ed-stat-val">{s.val}</div>
                                <div className="ed-stat-lbl">{s.lbl}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ══ CONTENT GRID: Sites + Attendance ══ */}
                <div className="ed-grid">

                    {/* ── Sites Attended ── */}
                    <div className="ed-card">
                        <div className="ed-card-head">
                            <span className="ed-card-title"><Building2 size={13} color="var(--brand-primary)" />Sites Attended</span>
                            <span className="badge badge-info" style={{ fontSize: '.6rem' }}>{uniqueSites.length} sites</span>
                        </div>
                        {uniqueSites.length === 0 ? (
                            <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                                <div style={{ fontSize: '2rem', opacity: .2, marginBottom: '.5rem' }}>🏗️</div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>No sites attended yet.</p>
                            </div>
                        ) : (
                            <div className="ed-sites-list">
                                {uniqueSites.map((site, i) => (
                                    <div key={i} className="ed-site-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', minWidth: 0, flex: 1 }}>
                                            <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Building2 size={14} color="var(--brand-primary)" />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <Translate text={site.name || 'Unknown Site'} />
                                                </div>
                                            </div>
                                        </div>
                                        <span className="badge badge-info" style={{ fontSize: '.6rem', flexShrink: 0 }}>
                                            {site.count} visit{site.count !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Attendance History ── */}
                    <div className="ed-card">
                        <div className="ed-card-head">
                            <span className="ed-card-title"><Activity size={13} color="var(--brand-primary)" />Attendance History</span>
                            <span className="badge badge-info" style={{ fontSize: '.62rem' }}>{attendance.length} records</span>
                        </div>

                        {attendance.length > 0 && (
                            <div style={{ padding: '.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,.01)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.38rem' }}>
                                    <span style={{ fontSize: '.64rem', color: 'var(--text-muted)' }}>{totalPresent} of {attendance.length} days present</span>
                                    <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--success)' }}>{attendancePct}%</span>
                                </div>
                                <div style={{ height: 4, borderRadius: 100, background: 'var(--border)', overflow: 'hidden' }}>
                                    <div style={{ width: `${attendancePct}%`, height: '100%', background: 'var(--success)', borderRadius: 100, transition: 'width .9s ease' }} />
                                </div>
                            </div>
                        )}

                        {attendance.length === 0 ? (
                            <div className="empty-state" style={{ padding: '3.5rem 1rem' }}>
                                <div style={{ fontSize: '2.2rem', opacity: .2, marginBottom: '.5rem' }}>📅</div>
                                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No attendance recorded yet.</p>
                            </div>
                        ) : (
                            <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                                {attendance.slice(0, 40).map((r, idx) => (
                                    <div key={r.id} className="ed-att-row" style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                                        <div className="ed-date-chip">
                                            <div style={{ fontSize: '.9rem', fontWeight: 800, lineHeight: 1, color: 'var(--brand-primary)' }}>
                                                {format(new Date(r.date), 'dd')}
                                            </div>
                                            <div style={{ fontSize: '.5rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '.1rem' }}>
                                                {format(new Date(r.date), 'MMM yy')}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <Translate text={r.site_name || 'Unknown Site'} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.12rem' }}>
                                                <Clock size={11} color="var(--text-muted)" />
                                                <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.time}</span>
                                            </div>
                                        </div>
                                        {r.latitude ? (
                                            <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer"
                                                style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--info-bg)', color: 'var(--info)', borderRadius: 7, border: '1px solid var(--info-border)' }}>
                                                <MapPin size={12} />
                                            </a>
                                        ) : (
                                            <div style={{ width: 28, opacity: .12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MapPin size={12} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {attendance.length > 40 && (
                                    <div style={{ padding: '.8rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Showing 40 of {attendance.length} records</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══ REPORTING LOGS (full width) ══ */}
                <div className="ed-card">
                    <div className="ed-card-head">
                        <span className="ed-card-title"><FileText size={13} color="var(--brand-primary)" />Reporting Logs</span>
                        <span className="badge badge-warning" style={{ fontSize: '.62rem' }}>{reports.length} reports</span>
                    </div>
                    {reports.length === 0 ? (
                        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                            <div style={{ fontSize: '2rem', opacity: .2, marginBottom: '.5rem' }}>📋</div>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No reports submitted yet.</p>
                        </div>
                    ) : (
                        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                            {reports.slice(0, 30).map((r, idx) => (
                                <div key={r.id} className="ed-report-row" style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                                    {/* Thumbnail */}
                                    <div className="ed-report-thumb">
                                        {r.photo_url
                                            ? <img src={r.photo_url.startsWith('http') ? r.photo_url : `${API_BASE}${r.photo_url}`} alt="Report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                                            : <Camera size={20} color="var(--text-muted)" style={{ opacity: .3 }} />
                                        }
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.3rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--text-primary)' }}>
                                                <Translate text={r.site_name || 'Unknown Site'} />
                                            </span>
                                            <code style={{ fontSize: '.65rem', color: 'var(--text-muted)', background: 'var(--glass-bg)', padding: '.1rem .4rem', borderRadius: 4, border: '1px solid var(--border)' }}>
                                                #{r.id}
                                            </code>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.65rem', alignItems: 'center', marginBottom: r.notes ? '.4rem' : 0 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
                                                <Clock size={11} />{format(new Date(r.report_time), 'dd MMM yyyy, HH:mm')}
                                            </span>
                                            {r.latitude && (
                                                <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.72rem', color: 'var(--info)', textDecoration: 'none' }}>
                                                    <MapPin size={11} />View GPS
                                                </a>
                                            )}
                                        </div>
                                        {r.notes && (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.35rem', padding: '.4rem .6rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                <MessageSquare size={11} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                                                <span style={{ fontSize: '.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}><Translate text={r.notes} /></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {reports.length > 30 && (
                                <div style={{ padding: '.8rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Showing 30 of {reports.length} reports</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* ══ EDIT MODAL ══ */}
            {showEditModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto', animation: 'slideUp .25s ease', boxShadow: '0 28px 72px rgba(0,0,0,.55)' }}>

                        <div style={{ padding: '1.35rem 1.75rem 1.1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-.03em' }}>Edit Employee</h2>
                                <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>
                                    {emp.name} · <code style={{ fontSize: '.7rem', color: 'var(--brand-primary)' }}>{emp.id}</code>
                                </p>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: '.3rem .55rem' }}>
                                <X size={15} />
                            </button>
                        </div>

                        {/* Avatar upload */}
                        <div style={{ padding: '1.25rem 1.75rem .875rem', display: 'flex', alignItems: 'center', gap: '1.1rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{ padding: 3, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', boxShadow: '0 0 0 3px var(--bg-surface)' }}>
                                    {avatarPreview
                                        ? <img src={avatarPreview} alt="Preview" style={{ width: '4rem', height: '4rem', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                        : renderAvatar(emp.avatar, '4rem')
                                    }
                                </div>
                                <label htmlFor="modal-avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--brand-primary)', color: '#000', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--bg-surface)' }}>
                                    <Edit3 size={10} />
                                    <input id="modal-avatar-upload" type="file" accept="image/*" style={{ display: 'none' }}
                                        onChange={e => { const f = e.target.files[0]; if (f) setAvatarPreview(URL.createObjectURL(f)) }} />
                                </label>
                            </div>
                            <div>
                                <p style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Profile Photo</p>
                                <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>Click pencil icon to change</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} style={{ padding: '1.1rem 1.75rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
                            <div className="input-group">
                                <label>Full Name *</label>
                                <input className="input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Enter full name" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.875rem' }}>
                                <div className="input-group">
                                    <label>Phone</label>
                                    <input className="input" type="tel" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876500001" />
                                </div>
                                <div className="input-group">
                                    <label>Email</label>
                                    <input className="input" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@metro.com" />
                                </div>
                                <div className="input-group">
                                    <label>Department *</label>
                                    <select className="input" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} required>
                                        <option value="">Select department</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Security PIN</label>
                                    <input className="input" type="password" placeholder="Blank = keep current" value={form.pin || ''} onChange={e => setForm({ ...form, pin: e.target.value })} maxLength={6} inputMode="numeric" />
                                </div>
                            </div>
                            <div style={{ height: 1, background: 'var(--border)' }} />
                            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: '.4rem', minWidth: 128 }}>
                                    {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : <><Save size={14} /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

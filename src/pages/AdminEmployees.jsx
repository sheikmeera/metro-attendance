import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { format } from 'date-fns'
import { Users, UserCheck, UserX, Plus, X, Briefcase, Edit3, Search } from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'
import { Translate } from '../utils/translateHelper'

export function AdminEmployees() {
    const navigate = useNavigate()
    const { showToast, t } = useApp()

    const [employees, setEmployees] = useState([])
    const [departments, setDepartments] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ name: '', phone: '', email: '', pin: '', department: '' })
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [filterDept, setFilterDept] = useState('')
    const [filterStatus, setFilterStatus] = useState('')

    const load = () => Promise.all([
        client.get('/admin/employees').then(r => setEmployees(r.data.filter(e => e.role === 'employee'))),
        client.get('/admin/departments').then(r => setDepartments(r.data)),
    ])

    useEffect(() => { load() }, [])

    const filtered = useMemo(() => employees.filter(e => {
        const query = searchQuery.toLowerCase()
        const matchesSearch = !searchQuery ||
            e.name.toLowerCase().includes(query) ||
            e.id.toLowerCase().includes(query) ||
            (e.phone && e.phone.includes(searchQuery))
        const matchesDept = !filterDept || e.department === filterDept
        const matchesStatus = !filterStatus || e.status === filterStatus
        return matchesSearch && matchesDept && matchesStatus
    }), [employees, searchQuery, filterDept, filterStatus])


    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!form.name || !form.pin || !form.department) { setError('Name, PIN and department are required.'); return }
        if (form.pin.length < 4) { setError('PIN must be at least 4 digits.'); return }
        setSaving(true)
        try {
            const formData = new FormData()
            Object.keys(form).forEach(key => {
                if (form[key]) formData.append(key, form[key])
            })
            if (e.target.avatar.files[0]) {
                formData.append('avatar', e.target.avatar.files[0])
            }

            const res = await client.post('/admin/employee', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            showToast(`Employee created! ID: ${res.data.id}`, 'success')
            setForm({ name: '', phone: '', email: '', pin: '', department: '' })
            setShowModal(false)
            load()
        } catch (err) { setError(err.response?.data?.error || 'Failed.') }
        setSaving(false)
    }

    const handleToggle = async (emp) => {
        try {
            if (emp.status === 'active') {
                await client.delete(`/admin/employee/${emp.id}`)
                showToast(`${emp.name} deactivated.`, 'success')
            } else {
                await client.post(`/admin/employee/${emp.id}/activate`)
                showToast(`${emp.name} activated.`, 'success')
            }
            load()
        } catch { showToast('Action failed.', 'error') }
    }

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 980 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.25rem', fontWeight: 600 }}>{t('misc.admin_panel')}</p>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{t('page.employees')}</h1>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setShowModal(true); setError('') }} style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                        <Plus size={16} /> {t('action.add_employee')}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {[
                        { icon: UserCheck, val: employees.filter(e => e.status === 'active').length, label: t('status.active'), color: 'var(--success-bg)', tc: 'var(--success)' },
                        { icon: UserX, val: employees.filter(e => e.status !== 'active').length, label: t('status.inactive'), color: 'var(--danger-bg)', tc: 'var(--danger)' },
                    ].map(({ icon: Icon, val, label, color, tc }, i) => (
                        <div key={i} className="stat-card" style={{ flex: '1 1 140px' }}>
                            <div className="stat-icon" style={{ background: color }}><Icon size={18} color={tc} /></div>
                            <div className="stat-info"><div className="stat-value" style={{ color: tc }}>{val}</div><div className="stat-label">{label}</div></div>
                        </div>
                    ))}
                </div>

                {/* Search & Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <div className="input-group" style={{ flex: '1 1 300px', marginBottom: 0 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input"
                                style={{ paddingLeft: '2.6rem' }}
                                placeholder={t('label.search')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                        <select className="input" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                            <option value="">{t('form.select_department')}</option>
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '0 1 150px', marginBottom: 0 }}>
                        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">{t('label.filter_status')}</option>
                            <option value="active">{t('status.active')}</option>
                            <option value="inactive">{t('status.inactive')}</option>
                        </select>
                    </div>
                    {(searchQuery || filterDept || filterStatus) && (
                        <button className="btn btn-ghost" onClick={() => { setSearchQuery(''); setFilterDept(''); setFilterStatus('') }} style={{ padding: '0 1rem' }}>
                            {t('action.clear')}
                        </button>
                    )}
                </div>

                <div className="section-card" style={{ padding: 0 }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>{t('section.all_employees')}</h3>
                        <span className="badge badge-info">{filtered.length} {t('label.records')}</span>
                    </div>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><Users size={28} /></div>
                            <p>{(searchQuery || filterDept || filterStatus) ? t('empty.no_records') : 'No employees yet.'}</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="table-scroll hide-mobile">
                                <table className="data-table">
                                    <thead><tr><th>{t('col.employee')}</th><th>{t('col.department')}</th><th>{t('col.id')}</th><th>{t('col.phone')}</th><th>{t('col.joined')}</th><th>{t('col.status')}</th><th>{t('col.actions')}</th></tr></thead>
                                    <tbody>
                                        {filtered.map(emp => (
                                            <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/employees/${emp.id}`)}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        {renderAvatar(emp.avatar)}
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.875rem' }}><Translate text={emp.name} /></div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.email || '—'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}><Briefcase size={12} /><Translate text={emp.department || '—'} /></span></td>
                                                <td><code style={{ background: 'var(--glass-bg)', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.8rem', border: '1px solid var(--border)' }}>{emp.id}</code></td>
                                                <td style={{ fontSize: '0.82rem' }}>{emp.phone || '—'}</td>
                                                <td style={{ fontSize: '0.82rem' }}>{emp.created_at ? format(new Date(emp.created_at), 'dd MMM yyyy') : '—'}</td>
                                                <td><span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{emp.status}</span></td>
                                                <td style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', gap: '0.25rem', display: 'flex', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp.id}`) }}>
                                                        <Edit3 size={13} /> {t('action.edit')}
                                                    </button>
                                                    <button className={`btn ${emp.status === 'active' ? 'btn-ghost' : 'btn-success'}`}
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.25rem', display: 'flex', alignItems: 'center' }}
                                                        onClick={(e) => { e.stopPropagation(); handleToggle(emp) }}>
                                                        {emp.status === 'active' ? <><UserX size={13} /> {t('action.deactivate')}</> : <><UserCheck size={13} /> {t('action.activate')}</>}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile card list */}
                            <div className="hide-desktop" style={{ display: 'flex', flexDirection: 'column' }}>
                                {filtered.map(emp => (
                                    <div
                                        key={emp.id}
                                        onClick={() => navigate(`/employees/${emp.id}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.875rem 1rem',
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {renderAvatar(emp.avatar)}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                                <Translate text={emp.name} />
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                {emp.id} · <Translate text={emp.department || '—'} />
                                            </div>
                                            {emp.phone && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{emp.phone}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                                            <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{emp.status}</span>
                                            <button
                                                className={`btn ${emp.status === 'active' ? 'btn-ghost' : 'btn-success'}`}
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem', gap: '0.2rem' }}
                                                onClick={(e) => { e.stopPropagation(); handleToggle(emp) }}
                                            >
                                                {emp.status === 'active' ? <UserX size={11} /> : <UserCheck size={11} />}
                                                {emp.status === 'active' ? t('action.deactivate') : t('action.activate')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('action.add_employee')}</h2>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t('misc.id_autogenerated')}</p>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <div className="input-group"><label>{t('form.profile_pic')}</label><input className="input" type="file" name="avatar" accept="image/*" /></div>
                            <div className="input-group"><label>{t('form.full_name')}</label><input className="input" placeholder="Rajan Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                            <div className="input-group"><label>{t('form.phone')}</label><input className="input" type="tel" placeholder="9876500001" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                            <div className="input-group"><label>{t('form.email')}</label><input className="input" type="email" placeholder="name@metro.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                            <div className="input-group"><label>{t('form.pin')}</label><input className="input" type="password" placeholder="Create PIN" maxLength={6} inputMode="numeric" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} /></div>
                            <div className="input-group">
                                <label>{t('form.department')}</label>
                                <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                                    <option value="">{t('form.select_department')}</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                            {error && <div style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem', fontSize: '0.82rem' }}>⚠️ {error}</div>}
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('action.cancel')}</button>
                                <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                                    {saving ? <span className="spinner" /> : <><Plus size={15} /> {t('action.add_employee')}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import {
    MapPin, Users, Pencil, Lock, PlusCircle, X, Check,
    Building2, Plus, Trash2, Search
} from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'
import { Translate } from '../utils/translateHelper'

export function AdminSites() {
    const { showToast, t } = useApp()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('sites')

    // ── Sites state ──────────────────────────────────────────
    const [sites, setSites] = useState([])
    const [employees, setEmployees] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editSite, setEditSite] = useState(null)
    const [showAssignModal, setShowAssignModal] = useState(null)
    const [selectedEmps, setSelectedEmps] = useState(new Set())
    const [form, setForm] = useState({ site_name: '', location_name: '', client_name: '', work_details: '' })
    const [saving, setSaving] = useState(false)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('')

    const filteredSites = useMemo(() => sites.filter(s => {
        const query = searchQuery.toLowerCase()
        const matchesSearch = !searchQuery ||
            s.site_name.toLowerCase().includes(query) ||
            (s.client_name && s.client_name.toLowerCase().includes(query)) ||
            (s.location_name && s.location_name.toLowerCase().includes(query))
        const matchesStatus = !filterStatus || s.status === filterStatus
        return matchesSearch && matchesStatus
    }), [sites, searchQuery, filterStatus])

    // ── Departments state ─────────────────────────────────────
    const [departments, setDepartments] = useState([])
    const [newDeptName, setNewDeptName] = useState('')
    const [addingDept, setAddingDept] = useState(false)
    const [deletingDept, setDeletingDept] = useState(null)

    const loadSites = async () => {
        const [s, e] = await Promise.all([client.get('/admin/sites'), client.get('/admin/employees')])
        setSites(s.data.sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1)))
        setEmployees(e.data.filter(e => e.status === 'active'))
    }
    const loadDepts = () => client.get('/admin/departments').then(r => setDepartments(r.data))

    useEffect(() => {
        loadSites()
        loadDepts()
    }, [])

    // ── Sites handlers ────────────────────────────────────────
    const openCreate = () => {
        setEditSite(null)
        setForm({ site_name: '', location_name: '', client_name: '', work_details: '' })
        setShowModal(true)
    }

    const openEdit = (site) => {
        setEditSite(site)
        setForm({ site_name: site.site_name, location_name: site.location_name || '', client_name: site.client_name || '', work_details: site.work_details || '' })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.site_name) return showToast(t('form.site_name') + ' required.', 'error')
        setSaving(true)
        try {
            if (editSite) {
                await client.put(`/admin/site/${editSite.id}`, form)
                showToast(t('action.save_changes') + '!', 'success')
            } else {
                await client.post('/admin/site', form)
                showToast(t('action.create') + '!', 'success')
            }
            setShowModal(false)
            loadSites()
        } catch (err) { showToast(err.response?.data?.error || 'Failed.', 'error') }
        setSaving(false)
    }

    const handleClose = async (id) => {
        if (!confirm(t('action.close_site') + '?')) return
        try { await client.put(`/admin/site/${id}/close`); showToast('Site closed.', 'success'); loadSites() }
        catch { showToast('Failed.', 'error') }
    }

    const openAssign = async (site) => {
        setShowAssignModal(site)
        try {
            const res = await client.get(`/admin/sites/${site.id}`)
            setSelectedEmps(new Set((res.data.employees || []).map(e => e.id)))
        } catch { setSelectedEmps(new Set()) }
    }

    const toggleEmp = (id) => {
        setSelectedEmps(prev => {
            const s = new Set(prev)
            s.has(id) ? s.delete(id) : s.add(id)
            return s
        })
    }

    const saveAssignments = async () => {
        try {
            const res = await client.get(`/admin/sites/${showAssignModal.id}`)
            const currentIds = new Set((res.data.employees || []).map(e => e.id))
            for (const eid of selectedEmps) {
                if (!currentIds.has(eid)) await client.post('/admin/site/assign', { site_id: showAssignModal.id, employee_id: eid }).catch(() => { })
            }
            for (const eid of currentIds) {
                if (!selectedEmps.has(eid)) await client.delete(`/admin/site/${showAssignModal.id}/unassign/${eid}`).catch(() => { })
            }
            showToast(t('misc.save_assignments') + '!', 'success')
            setShowAssignModal(null)
            loadSites()
        } catch { showToast('Failed to save assignments.', 'error') }
    }

    // ── Departments handlers ──────────────────────────────────
    const handleAddDept = async (e) => {
        e.preventDefault()
        if (!newDeptName.trim()) return
        setAddingDept(true)
        try {
            await client.post('/admin/department', { name: newDeptName.trim() })
            showToast('Department added!', 'success')
            setNewDeptName('')
            loadDepts()
        } catch (err) { showToast(err.response?.data?.error || 'Failed.', 'error') }
        setAddingDept(false)
    }

    const handleDeleteDept = async (id, name) => {
        if (!confirm(`Delete department "${name}"?`)) return
        setDeletingDept(id)
        try {
            await client.delete(`/admin/department/${id}`)
            showToast('Deleted.', 'success')
            loadDepts()
        } catch (err) { showToast(err.response?.data?.error || 'Failed.', 'error') }
        setDeletingDept(null)
    }

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 1040 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.25rem', fontWeight: 600 }}>{t('misc.admin')}</p>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{t('page.sites')}</h1>
                    </div>
                    {activeTab === 'sites' && (
                        <button className="btn btn-primary" onClick={openCreate} style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                            <PlusCircle size={16} /> {t('action.create_site')}
                        </button>
                    )}
                </div>

                {/* Tab toggle */}
                <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.25rem', width: 'max-content' }}>
                    <button
                        onClick={() => setActiveTab('sites')}
                        style={{
                            padding: '0.45rem 1.1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font)',
                            background: activeTab === 'sites' ? 'var(--brand-primary)' : 'transparent',
                            color: activeTab === 'sites' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.15s',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} /> {t('tab.sites')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('departments')}
                        style={{
                            padding: '0.45rem 1.1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.82rem', fontFamily: 'var(--font)',
                            background: activeTab === 'departments' ? 'var(--brand-primary)' : 'transparent',
                            color: activeTab === 'departments' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.15s',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Building2 size={14} /> {t('tab.departments')}</span>
                    </button>
                </div>

                {/* ── Sites Tab ── */}
                {activeTab === 'sites' && (
                    <>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <div className="input-group" style={{ flex: '1 1 300px', marginBottom: 0 }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        className="input"
                                        style={{ paddingLeft: '2.6rem' }}
                                        placeholder="Search Site, Client or Location..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="input-group" style={{ flex: '0 1 150px', marginBottom: 0 }}>
                                <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    <option value="">{t('label.filter_status')}</option>
                                    <option value="active">{t('status.active')}</option>
                                    <option value="closed">{t('status.closed')}</option>
                                </select>
                            </div>
                            {(searchQuery || filterStatus) && (
                                <button className="btn btn-ghost" onClick={() => { setSearchQuery(''); setFilterStatus('') }} style={{ padding: '0 1rem' }}>
                                    {t('action.clear')}
                                </button>
                            )}
                        </div>

                        <div className="section-card" style={{ padding: 0 }}>
                            <div className="table-scroll">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>{t('col.site_name')}</th>
                                            <th>{t('col.client_location')}</th>
                                            <th>{t('col.work_details')}</th>
                                            <th>{t('col.assigned')}</th>
                                            <th>{t('col.status')}</th>
                                            <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSites.length === 0 ? (
                                            <tr>
                                                <td colSpan="6">
                                                    <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                                                        <div className="empty-icon"><MapPin size={32} /></div>
                                                        <p>{(searchQuery || filterStatus) ? t('empty.no_records') : t('empty.no_sites')}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredSites.map(site => (
                                            <tr key={site.id}
                                                onClick={(e) => { if (!e.target.closest('button') && !e.target.closest('a')) navigate(`/sites/${site.id}`) }}
                                                style={{ cursor: 'pointer' }}>
                                                <td>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <Building2 size={15} color="var(--brand-primary)" /> <Translate text={site.site_name} />
                                                    </div>
                                                </td>
                                                <td>
                                                    {site.client_name && <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={12} /> <Translate text={site.client_name} /></div>}
                                                    {site.location_name && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}><MapPin size={12} /> <Translate text={site.location_name} /></div>}
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={site.work_details}>
                                                        <Translate text={site.work_details || '—'} />
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: 'max-content' }}><Users size={11} /> {site.employee_count}</span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${site.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{site.status === 'active' ? t('status.active') : t('status.closed')}</span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                        {site.status === 'active' && (
                                                            <>
                                                                <button className="btn btn-ghost" title={t('action.edit_site')} style={{ padding: '0.4rem 0.6rem' }} onClick={() => openEdit(site)}><Pencil size={14} /></button>
                                                                <button className="btn btn-ghost" title={t('action.assign_employees')} style={{ padding: '0.4rem 0.6rem' }} onClick={() => openAssign(site)}><Users size={14} /></button>
                                                                <button className="btn btn-danger" title={t('action.close_site')} style={{ padding: '0.4rem 0.6rem' }} onClick={() => handleClose(site.id)}><Lock size={14} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Departments Tab ── */}
                {activeTab === 'departments' && (
                    <>
                        <form onSubmit={handleAddDept} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>{t('form.department_name')}</label>
                                <input className="input" value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                                    placeholder="e.g. Electrical, Civil, PEB..." />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={addingDept || !newDeptName.trim()}
                                style={{ height: 42, gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                                <Plus size={16} /> {t('action.add')}
                            </button>
                        </form>

                        <div className="section-card" style={{ padding: 0 }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="section-title" style={{ margin: 0 }}>{t('section.all_departments')}</h3>
                                <span className="badge badge-info">{departments.length} {t('label.total')}</span>
                            </div>
                            {departments.length === 0 ? (
                                <div className="empty-state"><div className="empty-icon"><Building2 size={32} /></div><p>{t('empty.no_departments')}</p></div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {departments.map((dept, i) => (
                                        <div key={dept.id} style={{
                                            display: 'flex', alignItems: 'center', padding: '0.9rem 1.5rem', gap: '0.875rem',
                                            borderBottom: i < departments.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}>
                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(249,115,22,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Building2 size={16} color="var(--brand-primary)" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}><Translate text={dept.name} /></div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                                                    <Users size={11} /> {dept.employee_count} {dept.employee_count !== 1 ? t('label.employees') : t('misc.employee')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteDept(dept.id, dept.name)}
                                                disabled={deletingDept === dept.id}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                                                title={t('action.delete')}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── Create / Edit Site Modal ── */}
                {showModal && (
                    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                        <div className="modal-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editSite ? t('action.edit_site') : t('action.create_site')}</h2>
                                <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setShowModal(false)}><X size={16} /></button>
                            </div>
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                <div className="input-group"><label>{t('form.site_name')}</label><input className="input" value={form.site_name} onChange={e => f('site_name', e.target.value)} placeholder="e.g. Metro Site A" /></div>
                                <div className="input-group"><label>{t('form.location')}</label><input className="input" value={form.location_name} onChange={e => f('location_name', e.target.value)} placeholder="e.g. Anna Nagar, Chennai" /></div>
                                <div className="input-group"><label>{t('form.client_name')}</label><input className="input" value={form.client_name} onChange={e => f('client_name', e.target.value)} placeholder="e.g. Metro Builders Pvt Ltd" /></div>
                                <div className="input-group"><label>{t('form.work_details')}</label><textarea className="input" rows={3} style={{ resize: 'vertical' }} value={form.work_details} onChange={e => f('work_details', e.target.value)} placeholder="Describe the scope of work…" /></div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('action.cancel')}</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                                        {saving ? <span className="spinner" /> : <><Check size={15} /> {editSite ? t('action.save_changes') : t('action.create')}</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Multi-Assign Employees Modal ── */}
                {showAssignModal && (
                    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssignModal(null)}>
                        <div className="modal-box" style={{ maxWidth: 460 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{showAssignModal.site_name}</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t('misc.select_assign')}</p>
                                </div>
                                <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setShowAssignModal(null)}><X size={16} /></button>
                            </div>

                            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                                {employees.map(emp => {
                                    const checked = selectedEmps.has(emp.id)
                                    return (
                                        <label key={emp.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.65rem 0.875rem',
                                            border: `1px solid ${checked ? 'var(--brand-primary)' : 'var(--border)'}`,
                                            background: checked ? 'rgba(249,115,22,0.08)' : 'var(--glass-bg)',
                                            borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)',
                                        }}>
                                            <input type="checkbox" checked={checked} onChange={() => toggleEmp(emp.id)} style={{ accentColor: 'var(--brand-primary)', width: 16, height: 16 }} />
                                            {renderAvatar(emp.avatar)}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}><Translate text={emp.name} /></div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.id} · <Translate text={emp.department} /></div>
                                            </div>
                                            {checked && <Check size={15} color="var(--brand-primary)" />}
                                        </label>
                                    )
                                })}
                                {employees.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>{t('empty.no_employees')}</p>}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowAssignModal(null)}>{t('action.cancel')}</button>
                                <button className="btn btn-primary" onClick={saveAssignments} style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                                    <Check size={15} /> {t('misc.save_assignments')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

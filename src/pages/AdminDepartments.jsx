import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { Building2, Plus, Trash2, Users } from 'lucide-react'

export function AdminDepartments() {
    const { showToast } = useApp()
    const [departments, setDepartments] = useState([])
    const [newName, setNewName] = useState('')
    const [adding, setAdding] = useState(false)
    const [deleting, setDeleting] = useState(null)

    const load = () => client.get('/admin/departments').then(r => setDepartments(r.data))
    useEffect(() => { load() }, [])

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!newName.trim()) return
        setAdding(true)
        try {
            await client.post('/admin/department', { name: newName.trim() })
            showToast('Department added!', 'success')
            setNewName('')
            load()
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to add.', 'error')
        }
        setAdding(false)
    }

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete department "${name}"?`)) return
        setDeleting(id)
        try {
            await client.delete(`/admin/department/${id}`)
            showToast('Deleted.', 'success')
            load()
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete.', 'error')
        }
        setDeleting(null)
    }

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 680 }}>
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem', fontWeight: 600 }}>Admin Panel</p>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Departments</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Manage departments used across employees.</p>
                </div>

                {/* Add Department */}
                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>New Department Name</label>
                        <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
                            placeholder="e.g. Electrical, Civil, PEB..." />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}
                        style={{ height: 42, gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                        <Plus size={16} /> Add
                    </button>
                </form>

                {/* Department List */}
                <div className="section-card" style={{ padding: 0 }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>All Departments</h3>
                        <span className="badge badge-info">{departments.length} total</span>
                    </div>
                    {departments.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon"><Building2 size={32} /></div><p>No departments yet.</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {departments.map((dept, i) => (
                                <div key={dept.id} style={{
                                    display: 'flex', alignItems: 'center', padding: '0.9rem 1.5rem', gap: '0.875rem',
                                    borderBottom: i < departments.length - 1 ? '1px solid var(--border)' : 'none',
                                    transition: 'background 0.15s',
                                }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Building2 size={16} color="var(--brand-primary)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{dept.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                                            <Users size={11} /> {dept.employee_count} employee{dept.employee_count !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(dept.id, dept.name)}
                                        disabled={deleting === dept.id}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                                        title="Delete department">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

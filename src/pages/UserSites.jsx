import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { MapPin, Building2, Activity, Camera, Briefcase } from 'lucide-react'
import { Translate } from '../utils/translateHelper'
import './UserSites.css'

export function UserSites() {
    const { showToast, t } = useApp()
    const [assignedSites, setAssignedSites] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        client.get('/employee/dashboard')
            .then(r => {
                setAssignedSites(Array.isArray(r.data.assignedSites) ? r.data.assignedSites : [])
            })
            .catch(() => showToast('Failed to load sites for progress update.', 'error'))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 1040 }}>

                {/* ── Premium Hero Header ── */}
                <div className="pg-header anim-in">
                    <div className="pg-header-icon">
                        <Activity size={32} strokeWidth={2.5} />
                    </div>
                    <h1 className="pg-title">{t('nav.update_progress') || 'Update Progress'}</h1>
                    <p className="pg-subtitle">
                        Select an active site below to log your daily attendance or submit project updates directly from the field.
                    </p>
                </div>

                {/* ── Main Content Area ── */}
                <div className="anim-in anim-delay-1">
                    {loading ? (
                        <div className="loading-grid">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="skeleton skeleton-card" style={{ height: 260, borderRadius: 'var(--radius-xl)' }} />
                            ))}
                        </div>
                    ) : assignedSites.length === 0 ? (
                        <div className="empty-state" style={{ padding: '4rem 1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
                            <div className="empty-icon"><MapPin size={36} /></div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--text-primary)' }}>No Associated Sites</h3>
                            <p style={{ color: 'var(--text-muted)' }}>{t('empty.no_sites_assigned') || 'You have not been assigned to any sites yet.'}</p>
                        </div>
                    ) : (
                        <div className="sites-grid">
                            {assignedSites.map((site, i) => {
                                const isActive = site.status === 'active'
                                return (
                                    <div key={site.id} className={`site-card anim-in ${isActive ? 'active' : 'closed'}`} style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div className="sc-header">
                                            <div className="sc-icon">
                                                <Building2 size={24} strokeWidth={2.2} />
                                            </div>
                                            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', fontWeight: 700, border: 'none' }}>
                                                {isActive ? (t('status.active') || 'Active') : (t('status.closed') || 'Closed')}
                                            </span>
                                        </div>

                                        <div className="sc-body">
                                            <div className="sc-client">
                                                <Briefcase size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                                                <Translate text={site.client_name || 'Metro Internal'} />
                                            </div>
                                            <h3 className="sc-title" title={site.site_name}>
                                                <Translate text={site.site_name} />
                                            </h3>
                                            <div className="sc-meta">
                                                {site.location_name ? (
                                                    <>
                                                        <MapPin size={14} className="sc-meta-icon" />
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            <Translate text={site.location_name} />
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Location pending</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="sc-footer">
                                            {isActive ? (
                                                <Link to="/report" className="sc-btn sc-btn-primary">
                                                    <Camera size={16} /> Select Site
                                                </Link>
                                            ) : (
                                                <button disabled className="sc-btn sc-btn-disabled">
                                                    Site Closed
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Extra padding on mobile to clear the bottom nav bar */}
                <div style={{ height: '6rem' }} className="hide-desktop" />

            </div>
        </div>
    )
}

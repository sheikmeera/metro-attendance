import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Camera, ClipboardList, Settings, Building2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import './BottomNav.css'

export function BottomNav() {
    const location = useLocation()
    const { t } = useApp()
    const path = location.pathname

    return (
        <nav className="bottom-nav" role="navigation" aria-label="Bottom navigation">
            <Link to="/" className={`bn-item${path === '/' ? ' active' : ''}`}>
                <span className="bn-icon-wrap">
                    <LayoutDashboard size={20} />
                </span>
                <span>{t('nav.dashboard') || 'Dashboard'}</span>
            </Link>

            <Link to="/history" className={`bn-item${path === '/history' ? ' active' : ''}`}>
                <span className="bn-icon-wrap">
                    <ClipboardList size={20} />
                </span>
                <span>{t('nav.history')?.replace('My ', '') || 'History'}</span>
            </Link>

            <Link to="/report" className={`bn-center-btn${path === '/report' ? ' active' : ''}`}>
                <div className="bn-fab">
                    <Camera size={20} color="#fff" />
                </div>
                <span className="bn-fab-label">{t('nav.report_site') || 'Report'}</span>
            </Link>

            <Link to="/sites" className={`bn-item${path === '/sites' ? ' active' : ''}`}>
                <span className="bn-icon-wrap">
                    <Building2 size={20} />
                </span>
                <span>Progress</span>
            </Link>

            <Link to="/settings" className={`bn-item${path === '/settings' ? ' active' : ''}`}>
                <span className="bn-icon-wrap">
                    <Settings size={20} />
                </span>
                <span>{t('nav.settings') || 'Settings'}</span>
            </Link>
        </nav>
    )
}

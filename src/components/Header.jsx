import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import {
    LayoutDashboard, Briefcase, Users, ClipboardList, FileText,
    MapPin, Building2, LogOut, Menu, X, Zap, ChevronRight, Settings
} from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'
import './Header.css'

const adminLinks = [
    { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/attendance', icon: ClipboardList, labelKey: 'nav.attendance' },
    { to: '/sites', icon: MapPin, labelKey: 'nav.sites' },
    { to: '/reports', icon: FileText, labelKey: 'nav.reports' },
    { to: '/employees', icon: Users, labelKey: 'nav.employees' },
    { to: '/departments', icon: Building2, labelKey: 'nav.departments' },
    { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
]
const empLinks = [
    { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/report', icon: MapPin, labelKey: 'nav.report_site' },
    { to: '/history', icon: ClipboardList, labelKey: 'nav.history' },
    { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

export function Header() {
    const { currentUser, logout } = useApp()
    const { t } = useTranslation()
    const location = useLocation()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)

    if (!currentUser) return null
    const links = currentUser.role === 'admin' ? adminLinks : empLinks

    return (
        <header className="header">
            <div className="header-inner">
                {/* Brand */}
                <Link to="/" className="header-brand" onClick={() => setOpen(false)}>
                    <div className="header-logo-wrap" style={{ padding: '4px' }}>
                        <img src="/logo_v3_amber.png" alt="Metro Electricals" className="header-logo" />
                    </div>
                    <div className="header-brand-text">
                        <span className="header-company">{t('app.title')}</span>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="header-nav">
                    {links.map(({ to, icon: Icon, labelKey }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`nav-link ${location.pathname === to ? 'active' : ''}`}
                        >
                            <Icon size={15} />
                            {t(labelKey)}
                        </Link>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="header-right">
                    <div className="header-user">
                        <span className="user-avatar">{renderAvatar(currentUser.avatar, '1.6rem')}</span>
                        <span className="user-name">{currentUser.name}</span>
                    </div>
                    <button className="btn-logout" onClick={() => { logout(); navigate('/') }} title="Logout">
                        <LogOut size={16} />
                    </button>
                    <button className="hamburger" onClick={() => setOpen(!open)}>
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile nav */}
            {open && (
                <nav className="mobile-nav">
                    {links.map(({ to, icon: Icon, labelKey }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`mobile-link ${location.pathname === to ? 'active' : ''}`}
                            onClick={() => setOpen(false)}
                        >
                            <Icon size={16} />
                            {t(labelKey)}
                            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                        </Link>
                    ))}
                    <button className="mobile-logout" onClick={() => { logout(); navigate('/'); setOpen(false) }}>
                        <LogOut size={16} /> {t('nav.logout')}
                    </button>
                </nav>
            )}
        </header>
    )
}

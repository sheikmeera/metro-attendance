import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
    LayoutDashboard, ClipboardList, MapPin, FileText,
    Users, LogOut, Menu, X, Sun, Moon, ChevronDown,
    ChevronLeft, ChevronRight
} from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'
import './Sidebar.css'

const adminLinks = [
    { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/attendance', icon: ClipboardList, labelKey: 'nav.attendance' },
    { to: '/sites', icon: MapPin, labelKey: 'nav.sites' },
    { to: '/employees', icon: Users, labelKey: 'nav.employees' },
]
const empLinks = [
    { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/report', icon: MapPin, labelKey: 'nav.report_site' },
    { to: '/history', icon: ClipboardList, labelKey: 'nav.history' },
]

const LANGS = [
    { id: 'en', flag: '🇬🇧', label: 'English' },
    { id: 'ta', flag: '🇮🇳', label: 'Tamil' },
    { id: 'hi', flag: '🇮🇳', label: 'Hindi' },
]

export function Sidebar() {
    const { currentUser, logout, theme, setTheme, language, setLanguage, sidebarCollapsed, setSidebarCollapsed, t } = useApp()
    const location = useLocation()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)

    if (!currentUser) return null

    const links = currentUser.role === 'admin' ? adminLinks : empLinks

    const handleLogout = () => {
        logout()
        navigate('/')
        setMobileOpen(false)
    }

    const close = () => setMobileOpen(false)

    const toggleCollapse = () => {
        setSidebarCollapsed(!sidebarCollapsed)
        if (userMenuOpen) setUserMenuOpen(false)
    }

    return (
        <>
            {/* Mobile Topbar (Admins only, as employees have BottomNav) */}
            {currentUser.role === 'admin' && (
                <div className="mobile-topbar">
                    <button className="sb-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                        <Menu size={20} />
                    </button>
                    <div className="mobile-brand" style={{ gap: '0.75rem' }}>
                        <img src="/logo_v3_amber.png" alt="Metro" className="mobile-logo" style={{ padding: '2px' }} />
                        <span className="mobile-title">Metro Electricals</span>
                    </div>
                    {/* Empty div for symmetry if needed, or user avatar */}
                    <div style={{ width: 40 }} />
                </div>
            )}

            {/* Overlay */}
            {mobileOpen && <div className="sb-overlay" onClick={close} />}

            {/* Sidebar */}
            <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>

                {/* Brand */}
                <div className="sb-brand">
                    <div className="sb-logo-wrap" style={{ padding: '4px' }}>
                        <img src="/logo_v3_amber.png" alt="Metro" className="sb-logo" />
                    </div>
                    {!sidebarCollapsed && (
                        <div className="sb-brand-text">
                            <span className="sb-company">Metro Electricals</span>
                            <span className="sb-role-tag">{currentUser.role === 'admin' ? 'Admin Portal' : 'Employee'}</span>
                        </div>
                    )}
                    {/* Collapse toggle — icon only, in brand area */}
                    <button
                        className="sb-collapse-btn-brand"
                        onClick={toggleCollapse}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                    <button className="sb-close-btn" onClick={close}><X size={15} /></button>
                </div>

                {/* Nav */}
                <nav className="sb-nav">
                    {links.map(({ to, icon: Icon, labelKey }) => {
                        const active = location.pathname === to
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={`sb-link${active ? ' active' : ''}`}
                                onClick={close}
                                title={sidebarCollapsed ? t(labelKey) : undefined}
                            >
                                <span className="sb-link-icon"><Icon size={17} /></span>
                                {!sidebarCollapsed && <span className="sb-link-label">{t(labelKey)}</span>}
                                {!sidebarCollapsed && active && <span className="sb-active-dot" />}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="sb-footer">
                    {/* User panel */}
                    {userMenuOpen && !sidebarCollapsed && (
                        <div className="sb-user-panel">
                            <p className="sb-panel-label">Appearance</p>
                            <div className="sb-theme-row">
                                <button
                                    className={`sb-theme-btn${theme === 'dark' ? ' active' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon size={12} /> Dark
                                </button>
                                <button
                                    className={`sb-theme-btn${theme === 'light' ? ' active' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun size={12} /> Light
                                </button>
                            </div>
                            <p className="sb-panel-label" style={{ marginTop: '0.4rem' }}>Language</p>
                            <select
                                className="sb-lang-select"
                                value={language}
                                onChange={e => setLanguage(e.target.value)}
                            >
                                {LANGS.map(l => (
                                    <option key={l.id} value={l.id}>{l.flag} {l.label}</option>
                                ))}
                            </select>
                            <button className="sb-logout-btn" onClick={handleLogout}>
                                <LogOut size={13} /> Logout
                            </button>
                        </div>
                    )}

                    {/* Collapsed: just logout icon */}
                    {sidebarCollapsed && (
                        <button className="sb-logout-icon-btn" onClick={handleLogout} title="Logout">
                            <LogOut size={16} />
                        </button>
                    )}

                    {/* User trigger */}
                    {!sidebarCollapsed && (
                        <button
                            className={`sb-user-btn${userMenuOpen ? ' open' : ''}`}
                            onClick={() => setUserMenuOpen(o => !o)}
                        >
                            <span className="sb-avatar">{renderAvatar(currentUser.avatar, '2rem')}</span>
                            <div className="sb-user-info">
                                <div className="sb-user-name">{currentUser.name}</div>
                                <div className="sb-user-dept">{currentUser.department || currentUser.role}</div>
                            </div>
                            <ChevronDown size={13} className={`sb-chevron${userMenuOpen ? ' up' : ''}`} />
                        </button>
                    )}
                </div>
            </aside>
        </>
    )
}

import { useApp } from '../context/AppContext'
import { Sun, Moon, Globe, Check, LogOut } from 'lucide-react'
import { renderAvatar } from '../utils/avatarHelper'

export function Settings() {
    const { theme, setTheme, language, setLanguage, t, currentUser, logout } = useApp()

    const themes = [
        {
            id: 'dark',
            icon: Moon,
            label: t('settings.dark'),
            preview: { bg: '#0a0a0a', card: '#1a1a1a', accent: '#f97316' },
        },
        {
            id: 'light',
            icon: Sun,
            label: t('settings.light'),
            preview: { bg: '#f1f5f9', card: '#ffffff', accent: '#f97316' },
        },
    ]

    const langs = [
        { id: 'en', label: t('settings.english'), native: 'English',  flag: '🇬🇧' },
        { id: 'ta', label: t('settings.tamil'),   native: 'தமிழ்',    flag: '🇮🇳' },
        { id: 'hi', label: t('settings.hindi'),   native: 'हिन्दी',   flag: '🇮🇳' },
    ]

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 600 }}>

                {/* Header */}
                <div className="anim-in">
                    <p style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem', fontWeight: 700 }}>
                        Preferences
                    </p>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                        {t('settings.title')}
                    </h1>
                </div>

                {/* Profile card */}
                <div className="section-card anim-in anim-delay-1" style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {renderAvatar(currentUser?.avatar, '3rem')}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{currentUser?.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {currentUser?.id} · {currentUser?.role === 'admin' ? t('misc.admin') : t('misc.employee')}
                            </div>
                            {currentUser?.department && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', marginTop: 2, fontWeight: 600 }}>
                                    {currentUser.department}
                                </div>
                            )}
                        </div>
                        <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.78rem', gap: '0.35rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', flexShrink: 0 }}
                            onClick={logout}
                        >
                            <LogOut size={14} /> {t('nav.logout')}
                        </button>
                    </div>
                </div>

                {/* Theme */}
                <div className="section-card anim-in anim-delay-2">
                    <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sun size={15} color="var(--brand-primary)" />
                        <h3 className="section-title" style={{ margin: 0 }}>{t('settings.appearance')}</h3>
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                        {themes.map(({ id, icon: Icon, label, preview }) => (
                            <button
                                key={id}
                                onClick={() => setTheme(id)}
                                style={{
                                    border: `2px solid ${theme === id ? 'var(--brand-primary)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-lg)',
                                    background: theme === id ? 'rgba(249,115,22,0.05)' : 'none',
                                    cursor: 'pointer',
                                    padding: '0.875rem',
                                    transition: 'var(--transition)',
                                }}
                            >
                                {/* Mini UI preview */}
                                <div style={{
                                    height: 64, borderRadius: 8, background: preview.bg,
                                    marginBottom: '0.75rem', padding: '0.5rem',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ height: 10, width: '65%', background: preview.card, borderRadius: 3, marginBottom: 5, opacity: 0.9 }} />
                                    <div style={{ height: 8, width: '45%', background: preview.card, borderRadius: 3, marginBottom: 8, opacity: 0.6 }} />
                                    <div style={{ height: 16, width: '50%', background: preview.accent, borderRadius: 5, opacity: 0.9 }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: theme === id ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                                        <Icon size={14} /> {label}
                                    </div>
                                    {theme === id && (
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Check size={11} color="#fff" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Language */}
                <div className="section-card anim-in anim-delay-3">
                    <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={15} color="var(--brand-primary)" />
                        <h3 className="section-title" style={{ margin: 0 }}>{t('settings.language')}</h3>
                    </div>
                    <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {langs.map(({ id, label, native, flag }) => (
                            <button
                                key={id}
                                onClick={() => setLanguage(id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.875rem',
                                    padding: '0.875rem 1rem',
                                    border: `1.5px solid ${language === id ? 'var(--brand-primary)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    background: language === id ? 'rgba(249,115,22,0.06)' : 'var(--glass-bg)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)',
                                    width: '100%',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{flag}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: language === id ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                                        {label}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{native}</div>
                                </div>
                                {language === id && (
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Check size={12} color="#fff" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="anim-in anim-delay-4" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', paddingBottom: '0.5rem' }}>
                    Metro Electricals Attendance System · v1.0
                </div>

            </div>
        </div>
    )
}

import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { User, Lock, Eye, EyeOff, AlertTriangle, Camera, MapPin, ClipboardList } from 'lucide-react'
import './LoginPage.css'

export function LoginPage() {
    const { login, showToast, t, theme } = useApp()
    const [empId, setEmpId] = useState('')
    const [pin, setPin] = useState('')
    const [showPin, setShowPin] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!empId.trim() || !pin.trim()) {
            setError('Please enter your Employee ID and PIN.')
            return
        }
        setLoading(true)
        await new Promise(r => setTimeout(r, 600)) // brief UX delay
        const result = await login(empId.trim().toUpperCase(), pin.trim())
        setLoading(false)
        if (!result.success) {
            setError(result.error)
            showToast(result.error, 'error')
        }
    }

    return (
        <div className="login-page">
            {/* ── Desktop brand panel ── */}
            <div className="login-brand-panel">
                <div className="lbp-logo-wrap">
                    <img src={theme === 'dark' ? "/logo_v3_amber.png" : "/logo_v3_light.png"} alt="Metro Electricals" className="lbp-logo" />
                </div>
                <h1 className="lbp-title">{t('app.title')}</h1>
                <p className="lbp-subtitle">{t('app.subtitle')}</p>

                <div className="lbp-features">
                    {[
                        { icon: Camera, text: 'Photo-verified field attendance' },
                        { icon: MapPin, text: 'GPS-tagged site reporting' },
                        { icon: ClipboardList, text: 'Instant PDF logs & analytics' },
                    ].map(({ icon: Icon, text }) => (
                        <div key={text} className="lbp-feature">
                            <div className="lbp-feature-icon"><Icon size={15} color="rgba(255,255,255,0.9)" /></div>
                            {text}
                        </div>
                    ))}
                </div>

                <p className="lbp-footer">{t('auth.footer')}</p>
            </div>

            {/* ── Form panel ── */}
            <div className="login-form-panel">
                <div className="login-container">
                    {/* Mobile-only brand */}
                    <div className="login-brand-mobile">
                        <div className="login-logo-wrap">
                            <img src={theme === 'dark' ? "/logo_v3_amber.png" : "/logo_v3_light.png"} alt="Metro Electricals" className="login-logo-img" />
                        </div>
                        <h1 className="login-title">{t('app.title')}</h1>
                        <p className="login-subtitle">{t('app.subtitle')}</p>
                    </div>

                    {/* Card */}
                    <div className="login-card anim-in">
                        <h2 className="login-card-title">{t('auth.welcome')}</h2>
                        <p className="login-card-sub">{t('auth.instructions')}</p>

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="input-group">
                                <label htmlFor="empId">{t('auth.emp_id')}</label>
                                <div className="input-with-icon">
                                    <span className="input-icon"><User size={15} /></span>
                                    <input
                                        id="empId"
                                        type="text"
                                        className="input"
                                        placeholder="Enter ID, Email or Phone"
                                        value={empId}
                                        onChange={e => setEmpId(e.target.value)}
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="pin">{t('auth.pin')}</label>
                                <div className="input-with-icon">
                                    <span className="input-icon"><Lock size={15} /></span>
                                    <input
                                        id="pin"
                                        type={showPin ? 'text' : 'password'}
                                        className="input"
                                        placeholder="4-digit PIN or password"
                                        value={pin}
                                        onChange={e => setPin(e.target.value)}
                                        maxLength={20}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="pin-toggle"
                                        onClick={() => setShowPin(!showPin)}
                                    >
                                        {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="login-error">
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary login-btn"
                                disabled={loading}
                            >
                                {loading ? <span className="spinner" /> : <>{t('auth.signin')}</>}
                            </button>
                        </form>


                    </div>

                    <p className="login-footer">{t('auth.footer')}</p>
                </div>
            </div>
        </div>
    )
}

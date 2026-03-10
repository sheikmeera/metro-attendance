import { useEffect, useState } from 'react'
import './SplashScreen.css'

export function SplashScreen() {
    const { theme } = useApp()
    return (
        <div className="splash-screen">
            <div className="splash-content">
                <div className="splash-logo-wrap">
                    <img
                        src={theme === 'dark' ? "/logo_v3_amber.png" : "/logo_v3_light.png"}
                        alt="Metro Electricals"
                        className="splash-logo"
                    />
                </div>
                <div className="splash-text">
                    <h1 className="splash-title">METRO</h1>
                    <p className="splash-subtitle">Electricals & Engineering</p>
                </div>
                <div className="splash-loader">
                    <div className="loader-bar" />
                </div>
            </div>
        </div>
    )
}

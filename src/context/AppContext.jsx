import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import client from '../api/client'
import { translations } from '../translations'

const AppContext = createContext(null)

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('metro_user')) } catch { return null }
    })
    const [toast, setToast] = useState(null)

    // ── Settings (Theme & Language) ───────────────────────────
    const [theme, setThemeState] = useState(() => {
        const user = JSON.parse(localStorage.getItem('metro_user'))
        return localStorage.getItem(user ? `metro_theme_${user.id}` : 'metro_theme') || 'dark'
    })
    const { i18n, t } = useTranslation()
    const [language, setLanguageState] = useState(() => {
        const user = JSON.parse(localStorage.getItem('metro_user'))
        return localStorage.getItem(user ? `metro_lang_${user.id}` : 'metro_lang') || 'en'
    })

    // Sync settings when currentUser changes (e.g. login/logout)
    useEffect(() => {
        const tKey = currentUser ? `metro_theme_${currentUser.id}` : 'metro_theme'
        const lKey = currentUser ? `metro_lang_${currentUser.id}` : 'metro_lang'
        const newTheme = localStorage.getItem(tKey) || 'dark'
        const newLang = localStorage.getItem(lKey) || 'en'

        setThemeState(newTheme)
        setLanguageState(newLang)
        i18n.changeLanguage(newLang)
    }, [currentUser, i18n])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const setTheme = useCallback((newTheme) => {
        const key = currentUser ? `metro_theme_${currentUser.id}` : 'metro_theme'
        localStorage.setItem(key, newTheme)
        setThemeState(newTheme)
    }, [currentUser])

    const setLanguage = useCallback((newLang) => {
        const key = currentUser ? `metro_lang_${currentUser.id}` : 'metro_lang'
        localStorage.setItem(key, newLang)
        setLanguageState(newLang)
        i18n.changeLanguage(newLang)
    }, [i18n, currentUser])

    // ── Sidebar collapsed state ────────────────────────────────
    const [sidebarCollapsed, setSidebarCollapsedState] = useState(() =>
        localStorage.getItem('sb-collapsed') === 'true'
    )
    const setSidebarCollapsed = useCallback((val) => {
        localStorage.setItem('sb-collapsed', val)
        setSidebarCollapsedState(val)
    }, [])

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type, id: Date.now() })
        setTimeout(() => setToast(null), 3200)
    }, [])

    // ── Auth ──────────────────────────────────────────────────
    const login = useCallback(async (identifier, password) => {
        try {
            const res = await client.post('/login', { identifier, password })
            const { token, user } = res.data
            localStorage.setItem('metro_token', token)
            localStorage.setItem('metro_user', JSON.stringify(user))
            setCurrentUser(user)
            return { success: true, user }
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed. Please try again.'
            return { success: false, error: msg }
        }
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('metro_token')
        localStorage.removeItem('metro_user')
        setCurrentUser(null)
    }, [])

    return (
        <AppContext.Provider value={{
            currentUser, toast, login, logout, showToast,
            theme, setTheme, language, setLanguage,
            sidebarCollapsed, setSidebarCollapsed,
            t
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used within AppProvider')
    return ctx
}

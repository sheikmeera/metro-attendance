/**
 * Shared avatar rendering utility.
 * Uses dynamic hostname so images work on both localhost and LAN (mobile).
 */
const apiBase = () => {
    // If VITE_API_URL is set (e.g. to https://app.onrender.com/api), 
    // we use it for both API and local image assets.
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '')

    // In production, if VITE_API_URL is missing, we use the Render URL specifically for the Metro project
    if (import.meta.env.PROD) return 'https://metro-attendance.onrender.com'

    return `${window.location.protocol}//${window.location.hostname}:4000`
}

export function renderAvatar(avatar, size = '1.2rem') {
    if (!avatar) return <span style={{ fontSize: size }}>👤</span>

    // Remote URLs (Cloudinary)
    if (avatar.startsWith?.('http')) {
        return (
            <img
                src={avatar}
                alt="Avatar"
                style={{ width: `calc(${size} * 1.5)`, height: `calc(${size} * 1.5)`, borderRadius: '50%', objectFit: 'cover' }}
            />
        )
    }

    // Local uploads fallback
    if (avatar.includes?.('uploads')) {
        const path = avatar.startsWith('/') ? avatar : `/${avatar}`
        return (
            <img
                src={`${apiBase()}${path}`}
                alt="Avatar"
                style={{ width: `calc(${size} * 1.5)`, height: `calc(${size} * 1.5)`, borderRadius: '50%', objectFit: 'cover' }}
            />
        )
    }

    return <span style={{ fontSize: size }}>{avatar}</span>
}

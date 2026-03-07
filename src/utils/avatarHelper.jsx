/**
 * Shared avatar rendering utility.
 * Uses dynamic hostname so images work on both localhost and LAN (mobile).
 */
const apiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    if (import.meta.env.PROD) return window.location.origin
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

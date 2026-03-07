export function Toast({ message, type = 'info' }) {
    if (!message) return null
    return (
        <div className="toast-container">
            <div className={`toast toast-${type}`}>
                {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {message}
            </div>
        </div>
    )
}

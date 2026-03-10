export function Toast({ message, type = 'info', onConfirm, onCancel }) {
    if (!message) return null

    return (
        <div className="toast-container">
            <div className={`toast toast-${type} ${onConfirm ? 'toast-confirm' : ''}`}>
                <div className="toast-content">
                    {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {message}
                </div>
                {onConfirm && (
                    <div className="toast-actions" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                background: 'var(--brand-primary)',
                                border: 'none',
                                color: '#000',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

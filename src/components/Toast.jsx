import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export function Toast({ message, type = 'info', onConfirm, onCancel }) {
    if (!message) return null

    const Icon = type === 'success' ? CheckCircle2 :
        type === 'error' ? AlertCircle :
            type === 'warning' ? AlertTriangle : Info

    return (
        <div className="toast-container">
            <div className={`toast toast-${type} ${onConfirm ? 'toast-confirm' : ''}`}>
                <div className="toast-content">
                    <span className="toast-icon"><Icon size={18} /></span>
                    <span>{message}</span>
                </div>
                {onConfirm && (
                    <div className="toast-actions">
                        <button className="toast-btn toast-btn-cancel" onClick={onCancel}>
                            Cancel
                        </button>
                        <button className="toast-btn toast-btn-confirm" onClick={onConfirm}>
                            Confirm
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

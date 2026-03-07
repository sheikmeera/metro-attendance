import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                background: 'var(--bg-deep)',
            }}>
                <div style={{
                    maxWidth: 440,
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '2.5rem',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(239,68,68,0.12)',
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'var(--danger-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                    }}>
                        <AlertTriangle size={28} color="var(--danger)" />
                    </div>
                    <h2 style={{ fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        {this.state.error?.message || 'An unexpected error occurred. Please refresh to continue.'}
                    </p>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', gap: '0.5rem' }}
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw size={15} /> Reload App
                    </button>
                </div>
            </div>
        )
    }
}

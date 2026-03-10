import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { Building2, MapPin, User, Camera } from 'lucide-react'
import './UserReport.css'

const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    if (import.meta.env.PROD) return 'https://metro-attendance.onrender.com/api'
    return `${window.location.protocol}//${window.location.hostname}:4000/api`
}
const API_BASE = getApiBase()
const API_BASE_ROOT = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE

/**
 * UserReport — 2-step flow:
 * Step 1: Select assigned site
 * Step 2: Live camera view → Capture button → GPS geotag overlaid on image → Submit
 */
export function UserReport() {
    const { showToast, t } = useApp()
    const navigate = useNavigate()

    const [sites, setSites] = useState([])
    const [step, setStep] = useState(1)          // 1 = site select, 2 = camera
    const [selectedSite, setSelectedSite] = useState(null)
    const [capturedImage, setCapturedImage] = useState(null)  // base64 blob
    const [capturedBlob, setCapturedBlob] = useState(null)
    const [gpsCoords, setGpsCoords] = useState(null)
    const [gpsStatus, setGpsStatus] = useState('idle')
    const [notes, setNotes] = useState('')
    const [cameraActive, setCameraActive] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    const [devices, setDevices] = useState([])
    const [activeDeviceId, setActiveDeviceId] = useState(null)

    useEffect(() => {
        client.get('/employee/sites')
            .then(res => setSites(res.data.filter(s => s.status === 'active')))
            .catch(() => showToast('Could not load sites.', 'error'))

        // Fetch available cameras
        navigator.mediaDevices.enumerateDevices().then(items => {
            const videoInputs = items.filter(i => i.kind === 'videoinput')
            setDevices(videoInputs)
        })

        return () => stopCamera()
    }, [])

    // ── Camera Control ──────────────────────────────────────────

    const startCamera = async (deviceId = null) => {
        try {
            if (streamRef.current) stopCamera()

            // Refresh device list to ensure labels are available after permission grant
            const items = await navigator.mediaDevices.enumerateDevices()
            const videoInputs = items.filter(i => i.kind === 'videoinput')
            setDevices(videoInputs)

            const constraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                    : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                // Ensure playsInline is set for iOS
                videoRef.current.setAttribute('playsinline', true)
                videoRef.current.play().catch(e => console.error("Play failed:", e))
            }

            // Update active device ID
            if (stream.getVideoTracks().length > 0) {
                const settings = stream.getVideoTracks()[0].getSettings()
                setActiveDeviceId(settings.deviceId || deviceId)
            }

            setCameraActive(true)
        } catch (err) {
            console.error('Camera Error:', err)
            showToast('Camera access failed. Check permissions.', 'error')
        }
    }

    const switchCamera = async () => {
        if (devices.length < 2) {
            // Try to refresh devices if list is small
            const items = await navigator.mediaDevices.enumerateDevices()
            const videoInputs = items.filter(i => i.kind === 'videoinput')
            setDevices(videoInputs)
            if (videoInputs.length < 2) return showToast('No other cameras found', 'info')
        }

        const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId)
        const nextIndex = (currentIndex + 1) % devices.length
        const nextDevice = devices[nextIndex]
        startCamera(nextDevice.deviceId)
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setCameraActive(false)
    }

    const capturePhoto = async () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        // Use video dimensions or defaults
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 960
        const ctx = canvas.getContext('2d', { alpha: false })

        // Wait a frame to ensure video is ready
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const W = canvas.width, H = canvas.height
        const now = new Date()
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        const siteName = selectedSite?.site_name || ''
        const clientName = selectedSite?.client_name || ''

        // Fetch OSM map tile
        let mapImg = null
        if (gpsCoords) {
            mapImg = await new Promise((resolve) => {
                const img = new window.Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => resolve(img)
                img.onerror = () => resolve(null)
                img.src = `${API_BASE}/map-tile?lat=${gpsCoords.lat}&lng=${gpsCoords.lng}&zoom=15`
            }).catch(() => null)
        }

        const stripH = Math.round(H * 0.12)
        const mapW = mapImg ? Math.round(stripH * 1.5) : 0

        // Premium Overlay
        ctx.fillStyle = 'rgba(0,0,0,0.85)'
        ctx.fillRect(0, H - stripH, W, stripH)

        // Orange accent side
        ctx.fillStyle = '#f97316'
        ctx.fillRect(0, H - stripH, 8, stripH)

        if (mapImg) {
            const mx = W - mapW - 20, my = H - stripH + 10, mh = stripH - 20
            ctx.save()
            // Rounded map
            ctx.beginPath()
            ctx.roundRect(mx, my, mapW, mh, 12)
            ctx.clip()
            ctx.drawImage(mapImg, mx, my, mapW, mh)
            ctx.restore()

            // Pin
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(mx + mapW / 2, my + mh / 2, 8, 0, Math.PI * 2); ctx.fill()
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke()
        }

        // Text details
        const fontSize = Math.round(H * 0.02)
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${fontSize + 4}px Arial`
        ctx.fillText('METRO ELECTRICALS', 30, H - stripH + fontSize + 15)

        ctx.font = `${fontSize}px Arial`
        ctx.fillStyle = '#f97316'
        ctx.fillText(`${dateStr} | ${timeStr}`, 30, H - stripH + fontSize * 2 + 25)

        ctx.fillStyle = '#e2e8f0'
        ctx.fillText(`📍 ${siteName} ${clientName ? '| ' + clientName : ''}`, 30, H - stripH + fontSize * 3 + 35)

        if (gpsCoords) {
            ctx.fillStyle = '#22c55e'
            ctx.font = `bold ${fontSize - 2}px Arial`
            ctx.fillText(`✓ GPS VERIFIED (${gpsCoords.lat.toFixed(6)}, ${gpsCoords.lng.toFixed(6)})`, 30, H - stripH + fontSize * 4 + 42)
        }

        canvas.toBlob(blob => {
            setCapturedBlob(blob)
            setCapturedImage(canvas.toDataURL('image/jpeg', 0.95))
            stopCamera()
        }, 'image/jpeg', 0.95)
    }

    const retakePhoto = () => {
        setCapturedImage(null)
        setCapturedBlob(null)
        startCamera()
    }

    const closeCamera = () => {
        stopCamera()
        setStep(1)
    }

    // ── GPS ─────────────────────────────────────────────────────

    const getGPS = () => {
        setGpsStatus('getting')
        navigator.geolocation.getCurrentPosition(
            pos => {
                setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) })
                setGpsStatus('got')
            },
            () => { setGpsStatus('error'); showToast('GPS unavailable — photo will be submitted without location.', 'error') },
            { enableHighAccuracy: true, timeout: 12000 }
        )
    }

    // ── Step transition ──────────────────────────────────────────

    const goToStep2 = (site) => {
        setSelectedSite(site)
        setStep(2)
        // Kick off GPS + camera at the same time
        getGPS()
        setTimeout(() => startCamera(), 300)
    }

    // ── Submit ───────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!capturedBlob) return showToast('Please capture a photo first.', 'error')
        setSubmitting(true)

        const formData = new FormData()
        formData.append('site_id', selectedSite.id)
        formData.append('notes', notes)
        if (gpsCoords) {
            formData.append('latitude', gpsCoords.lat)
            formData.append('longitude', gpsCoords.lng)
        }
        formData.append('photo', capturedBlob, `report_${Date.now()}.jpg`)

        try {
            await client.post('/employee/report', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            showToast('Report submitted! Attendance marked ✓', 'success')
            navigate('/')
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to submit report.', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Render ───────────────────────────────────────────────────

    return (
        <div className="page-shell page-enter">
            <div className="page-content" style={{ maxWidth: 560, paddingBottom: '2rem' }}>

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div className={`step-pill ${step >= 1 ? 'active' : ''}`}>{t('step.select_site')}</div>
                    <div style={{ flex: 1, height: 2, background: step >= 2 ? 'var(--brand-primary)' : 'var(--border)', transition: 'background 0.3s', borderRadius: 2 }} />
                    <div className={`step-pill ${step >= 2 ? 'active' : ''}`}>{t('step.capture')}</div>
                </div>

                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
                    {step === 1 ? t('page.select_site') : t('page.capture_photo')}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                    {step === 1 ? t('label.choose_site') : `${t('label.reporting_from')} ${selectedSite?.site_name}`}
                </p>

                {step === 1 ? (
                    <>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                            {t('page.select_site')}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            {t('label.choose_site')}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {sites.length === 0 && (
                                <div className="empty-state"><p>{t('empty.no_sites_active')}</p></div>
                            )}
                            {sites.map(site => (
                                <button key={site.id} className="site-option" onClick={() => goToStep2(site)}>
                                    <Building2 size={20} color="var(--brand-primary)" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{site.site_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{site.location_name}</div>
                                    </div>
                                    <span style={{ color: 'var(--text-muted)' }}>›</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="pwa-ready">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.1rem' }}>{selectedSite?.site_name}</h2>
                            <button className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={closeCamera}>Change Site</button>
                        </div>

                        {!capturedImage ? (
                            <div className="inline-camera-container anim-in">
                                <div className="inline-camera-preview-wrap">
                                    <video ref={videoRef} autoPlay playsInline muted className="inline-video" />

                                    {gpsCoords && (
                                        <div className="gps-badge-overlay-inline">
                                            <MapPin size={10} color="#f97316" />
                                            <span>{gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}</span>
                                        </div>
                                    )}

                                    <div className="camera-actions-inline">
                                        <button className="btn-camera-flip" onClick={switchCamera} title="Switch Camera">
                                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M23 4v6h-6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1.5 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="camera-footer-inline">
                                    <button className="btn-capture-inline" onClick={capturePhoto}>
                                        <Camera size={24} />
                                        <span>Capture Site Photo</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="anim-in">
                                <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '16/9' }}>
                                    <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                                    <div className="input-group">
                                        <label>Additional Notes</label>
                                        <textarea className="input" placeholder="Any work updates or issues..." value={notes}
                                            onChange={e => setNotes(e.target.value)} rows={3} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={retakePhoto}>Retake</button>
                                        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitting}>
                                            {submitting ? <span className="spinner" /> : 'Submit Report'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    )
}

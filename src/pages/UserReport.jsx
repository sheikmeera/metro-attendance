import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import { Building2, MapPin, User, Camera } from 'lucide-react'
import './UserReport.css'

const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    if (import.meta.env.PROD) return window.location.origin
    return `${window.location.protocol}//${window.location.hostname}:4000`
}
const API_BASE = getApiBase()

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

    useEffect(() => {
        client.get('/employee/sites')
            .then(res => setSites(res.data.filter(s => s.status === 'active')))
            .catch(() => showToast('Could not load sites.', 'error'))
        return () => stopCamera()
    }, [])

    // ── Camera Control ──────────────────────────────────────────

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
            setCameraActive(true)
        } catch {
            showToast('Camera access denied. Please allow camera permissions.', 'error')
        }
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

        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const W = canvas.width, H = canvas.height
        const now = new Date()
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        const siteName = selectedSite?.site_name || ''
        const clientName = selectedSite?.client_name || ''

        // Fetch OSM map tile from our backend proxy (no CORS issues)
        let mapImg = null
        if (gpsCoords) {
            mapImg = await new Promise((resolve) => {
                const img = new window.Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => resolve(img)
                img.onerror = () => resolve(null)
                img.src = `${API_BASE}/api/map-tile?lat=${gpsCoords.lat}&lng=${gpsCoords.lng}&zoom=15`
            }).catch(() => null)
        }

        // GPS strip dimensions
        const stripH = gpsCoords ? 110 : 64
        const mapW = mapImg ? Math.round(stripH * 1.45) : 0

        // Dark strip background
        ctx.fillStyle = 'rgba(0,0,0,0.82)'
        ctx.fillRect(0, H - stripH, W, stripH)

        // Amber left accent
        ctx.fillStyle = '#f59e0b'
        ctx.fillRect(0, H - stripH, 4, stripH)

        // ── Map mini-preview (right side) ─────────────────────
        if (mapImg) {
            const mx = W - mapW - 8, my = H - stripH + 6, mh = stripH - 12, mr = 6
            ctx.save()
            ctx.beginPath()
            ctx.moveTo(mx + mr, my)
            ctx.lineTo(mx + mapW - mr, my); ctx.quadraticCurveTo(mx + mapW, my, mx + mapW, my + mr)
            ctx.lineTo(mx + mapW, my + mh - mr); ctx.quadraticCurveTo(mx + mapW, my + mh, mx + mapW - mr, my + mh)
            ctx.lineTo(mx + mr, my + mh); ctx.quadraticCurveTo(mx, my + mh, mx, my + mh - mr)
            ctx.lineTo(mx, my + mr); ctx.quadraticCurveTo(mx, my, mx + mr, my)
            ctx.closePath(); ctx.clip()
            ctx.drawImage(mapImg, mx, my, mapW, mh)
            ctx.restore()

            // Red pin dot at center of map
            const px = mx + mapW / 2, py = my + mh / 2
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill()
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()

            // Subtle border
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mapW, mh)
        }

        // ── Text overlay ──────────────────────────────────────
        const textMaxW = W - 24 - (mapW > 0 ? mapW + 16 : 0)
        ctx.fillStyle = '#f59e0b'
        ctx.font = `bold ${Math.round(W * 0.014)}px Arial`
        ctx.fillText('METRO ELECTRICALS', 14, H - stripH + 22)

        ctx.fillStyle = '#ffffff'
        ctx.font = `${Math.round(W * 0.012)}px Arial`
        ctx.textAlign = 'right'
        ctx.fillText(`${dateStr}  ${timeStr}`, W - (mapW > 0 ? mapW + 16 : 12), H - stripH + 22)
        ctx.textAlign = 'left'

        ctx.fillStyle = '#e2e8f0'
        ctx.font = `${Math.round(W * 0.011)}px Arial`
        const siteLabel = `📍 ${siteName}${clientName ? '  ·  ' + clientName : ''}`
        ctx.fillText(siteLabel.length > 65 ? siteLabel.slice(0, 63) + '…' : siteLabel, 14, H - stripH + 44)

        if (gpsCoords) {
            ctx.fillStyle = '#94a3b8'
            ctx.font = `${Math.round(W * 0.01)}px Arial`
            ctx.fillText(`LAT ${gpsCoords.lat.toFixed(6)}°  LNG ${gpsCoords.lng.toFixed(6)}°   ±${gpsCoords.accuracy}m`, 14, H - stripH + 64)
            ctx.fillStyle = '#10b981'
            ctx.font = `bold ${Math.round(W * 0.0095)}px Arial`
            ctx.fillText('✓ GPS VERIFIED', 14, H - stripH + 84)
            ctx.fillStyle = '#475569'
            ctx.font = `${Math.round(W * 0.0085)}px Arial`
            ctx.fillText(`openstreetmap.org/#map=17/${gpsCoords.lat.toFixed(5)}/${gpsCoords.lng.toFixed(5)}`, 14, H - stripH + 102)
        } else {
            ctx.fillStyle = '#ef4444'
            ctx.font = `bold ${Math.round(W * 0.01)}px Arial`
            ctx.fillText('⚠ GPS UNAVAILABLE', 14, H - stripH + 54)
        }

        canvas.toBlob(blob => {
            setCapturedBlob(blob)
            setCapturedImage(canvas.toDataURL('image/jpeg', 0.92))
            stopCamera()
        }, 'image/jpeg', 0.92)
    }

    const retakePhoto = () => {
        setCapturedImage(null)
        setCapturedBlob(null)
        startCamera()
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

                {/* ── STEP 1: Site Selection ── */}
                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {sites.length === 0 && (
                            <div className="empty-state"><div className="empty-icon"><MapPin size={28} /></div><p>{t('empty.no_sites_active')}</p></div>
                        )}
                        {sites.map(site => (
                            <button key={site.id} className="site-option" onClick={() => goToStep2(site)} style={{ textAlign: 'left', width: '100%', border: 'none', cursor: 'pointer' }}>
                                <Building2 size={20} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{site.site_name}</div>
                                    {site.client_name && <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 500, marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} /> {site.client_name}</div>}
                                    {site.location_name && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {site.location_name}</div>}
                                </div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>›</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── STEP 2: Camera Capture ── */}
                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* Camera view / captured preview */}
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                            {!capturedImage ? (
                                <>
                                    <video ref={videoRef} autoPlay playsInline muted
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
                                    />
                                    {!cameraActive && (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem', color: '#fff', minHeight: 220 }}>
                                            <Camera size={40} color="#94a3b8" />
                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{t('misc.starting_camera')}</span>
                                        </div>
                                    )}
                                    {/* GPS badge overlay */}
                                    {gpsCoords && (
                                        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.65)', color: '#f59e0b', borderRadius: 8, padding: '0.3rem 0.65rem', fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <MapPin size={11} /> {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)} <span style={{ color: '#94a3b8' }}>±{gpsCoords.accuracy}m</span>
                                        </div>
                                    )}
                                    {/* Live OSM map pip — top-right corner */}
                                    {gpsCoords && (
                                        <div style={{
                                            position: 'absolute', top: 10, right: 10,
                                            width: 130, height: 100,
                                            borderRadius: 8, overflow: 'hidden',
                                            border: '2px solid rgba(245,158,11,0.7)',
                                            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                                            background: '#cdd3dc',
                                        }}>
                                            <img
                                                src={`${API_BASE}/api/map-tile?lat=${gpsCoords.lat}&lng=${gpsCoords.lng}&zoom=15`}
                                                alt="Location map"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                            {/* Red pin dot */}
                                            <div style={{
                                                position: 'absolute', top: '50%', left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: 12, height: 12, borderRadius: '50%',
                                                background: '#ef4444',
                                                border: '2px solid #fff',
                                                boxShadow: '0 0 4px rgba(0,0,0,0.6)',
                                            }} />
                                            <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontSize: '0.55rem', color: '#374151', background: 'rgba(255,255,255,0.8)' }}>
                                                © OpenStreetMap
                                            </div>
                                        </div>
                                    )}
                                    {gpsStatus === 'getting' && (
                                        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', color: '#94a3b8', borderRadius: 8, padding: '0.4rem 0.7rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.4rem', backdropFilter: 'blur(4px)' }}>
                                            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> {t('misc.getting_gps')}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            {/* hidden canvas for capture */}
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>

                        {/* Action buttons */}
                        {!capturedImage ? (
                            <button className="btn btn-primary" onClick={capturePhoto} disabled={!cameraActive}
                                style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Camera size={16} /> {t('action.capture_photo')}
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={retakePhoto}>{t('action.retake')}</button>
                            </div>
                        )}

                        {/* Notes */}
                        {capturedImage && (
                            <>
                                <div className="input-group">
                                    <label>{t('form.notes')}</label>
                                    <textarea className="input" placeholder={t('misc.notes_placeholder')} value={notes}
                                        onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
                                </div>

                                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
                                    style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem' }}>
                                    {submitting ? <span className="spinner" /> : t('action.submit_report')}
                                </button>
                            </>
                        )}

                        <button className="btn btn-ghost" style={{ width: '100%' }}
                            onClick={() => { stopCamera(); setCapturedImage(null); setCapturedBlob(null); setStep(1) }}>
                            {t('action.change_site')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

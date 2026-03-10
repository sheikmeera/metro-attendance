import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.jsx'
import './index.css'
import './i18n'

import { registerSW } from 'virtual:pwa-register'

// Force-clear old service workers and caches so new deployments reflect immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.update() // tell SW to check for updates now
    })
  })
  // Wipe old caches on load so stale assets don't persist
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('workbox') || name.includes('precache')) {
          caches.delete(name)
        }
      })
    })
  }
}

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

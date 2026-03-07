/**
 * src/api/client.js
 * Axios instance pre-configured with base URL and JWT interceptor.
 */
import axios from 'axios'

const isProd = import.meta.env.PROD
const API_BASE = import.meta.env.VITE_API_URL ||
    (isProd ? `${window.location.origin}/api` : `${window.location.protocol}//${window.location.hostname}:4000/api`)

const client = axios.create({ baseURL: API_BASE })

// Attach JWT token to every request automatically
client.interceptors.request.use(config => {
    const token = localStorage.getItem('metro_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// On 401, clear token and reload to login
client.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401 && !err.config.url.endsWith('/login')) {
            localStorage.removeItem('metro_token')
            localStorage.removeItem('metro_user')
            window.location.reload()
        }
        return Promise.reject(err)
    }
)

export default client

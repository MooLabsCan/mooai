// Simple auth service to check session and redirect to login if not authenticated
// API endpoint (relative path allows proxying or same-origin hosting)
const apiUrl = '/api/check_session.php'

const getSessionData = async (payload = {}) => {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    // Some PHP endpoints return 200 with text; attempt JSON but fallback
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      return { ok: response.ok, raw: text }
    }
  } catch (error) {
    console.error('Session check failed:', error)
    return null
  }
}

const loginRedirect = () => {
  const hostname = window.location.hostname
  const url = hostname === 'localhost'
    ? 'http://localhost/mapmoo/login.php?site=mooai'
    : 'https://liap.ca/login.php?site=mooai'
  window.location.href = url
}

const ensureLoggedIn = async () => {
  // Auth is optional: do not redirect. Simply return session data if available, otherwise null.
  const data = await getSessionData()
  const isLoggedIn = !!(data && (data.ok || data.success || data.loggedIn) && (data.user || data.session || data.username))
  return isLoggedIn ? data : null
}

export const authService = {
  getSessionData,
  loginRedirect,
  ensureLoggedIn,
}

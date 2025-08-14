// Simple auth service to check session and redirect to login if not authenticated
// API endpoint (relative path allows proxying or same-origin hosting)
const apiUrl = 'https://liap.ca/api/check_session.php'
//const apiUrl = '/api/check_session.php'

// Lightweight module-local state (avoids hard dependency on app-level globals)
const authState = { og: null }

// Extract token from URL (?au=...) or localStorage and persist it.
// Also captures optional origin (?og=...) into a local state variable.
const storeInitialToken = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const urlToken = urlParams.get('au')
  const origin = urlParams.get('og')

  if (urlToken) {
    localStorage.setItem('authToken', urlToken)
    if (origin) authState.og = origin

    // If desired, we could also clean the URL here without reload.
    // Left commented to avoid surprising navigation.
    // urlParams.delete('au')
    // urlParams.delete('og')
    // const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
    // window.history.replaceState({}, '', newUrl)

    return urlToken
  }

  return localStorage.getItem('authToken')
}

const getSessionData = async (payload = {}) => {
  try {
    // Ensure a token is provided to the backend. Pull from payload or stored value.
    const providedToken = payload && payload.token
    const normalizedProvided = typeof providedToken === 'string' ? providedToken.trim() : providedToken
    const storedToken = storeInitialToken()
    const token = normalizedProvided || storedToken

    // If no valid token is available, do NOT call the API.
    if (!token || token === '' || token === 'null' || token === 'undefined') {
      return { ok: false, status: 'unauthenticated', error: 'No auth token available', received_token: null, no_api_call: true }
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, token })
    })

    // Some PHP endpoints return 200 with text; attempt JSON but fallback
    const text = await response.text()

    let parsed = null
    try { parsed = JSON.parse(text) } catch {}

    if (!parsed) {
      // Could not parse JSON — return a conservative unauthenticated shape but include raw for debugging
      return { ok: false, status: 'unauthenticated', user: null, received_token: token, raw: text }
    }

    // If the backend explicitly reports an invalid token, clear it and report failure
    if (parsed.status === 'invalid_token' || (typeof parsed.message === 'string' && parsed.message.toLowerCase().includes('authentication failed'))) {
      try { localStorage.removeItem('authToken') } catch {}
      return {
        ...parsed,
        ok: false,
        status: 'invalid_token',
        user: null,
        received_token: token,
      }
    }

    // Determine authentication status from common flags
    const hasAuthFlag = !!(parsed.status === 'authenticated' || parsed.ok || parsed.success || parsed.loggedIn)
    const status = hasAuthFlag ? 'authenticated' : 'unauthenticated'

    // Build user object
    const userFromParsed = parsed.user || parsed.session || null
    const fallbackUser = {
      username: parsed.username || null,
      lang: (parsed.lang || (userFromParsed && userFromParsed.lang)) || null,
      email: parsed.email || null,
    }
    const user = userFromParsed || fallbackUser

    // Merge normalized shape with original fields to preserve compatibility
    return {
      ...parsed,
      ok: hasAuthFlag ? true : (parsed.ok === true),
      status,
      user,
      received_token: token,
    }
  } catch (error) {
    console.error('Session check failed:', error)
    return { ok: false, status: 'unauthenticated', error: String(error), received_token: null }
  }
}

// Handle the authentication process using the token-aware getSessionData.
// To keep this module decoupled from app-specific globals (router, stores, etc.),
// this function accepts an options object with optional hooks and utilities.
// Example:
//   handleAuthentication({
//     token,
//     onAuthenticated: (session) => {},
//     onFailed: (reason) => {},
//     router, route, // optional vue-router instances
//     userDetails,    // optional service with fetchUser(username,email) and fetchDates(username)
//     calculateStreak,// optional function that uses available dates to compute streak
//     setGlobalState, // optional function to update global state atomically
//     loadingRef,     // optional ref-like object with { value }
//   })
const handleAuthentication = async (options = {}) => {
  const {
    token,
    onAuthenticated,
    onFailed,
    router,
    route,
    userDetails,
    calculateStreak,
    setGlobalState,
    loadingRef,
  } = options

  try {
    if (loadingRef && typeof loadingRef === 'object') loadingRef.value = true

    const session = await getSessionData({ token })

    if (session && (session.status === 'authenticated' || session.ok || session.success)) {
      const user = session.user || session.session || { username: session.username, email: session.email }

      // Parallel fetches if helpers are provided
      let userData = null
      let datesData = null
      if (user && user.username && userDetails && userDetails.fetchUser && userDetails.fetchDates) {
        try {
          [userData, datesData] = await Promise.all([
            userDetails.fetchUser(user.username, user.email),
            userDetails.fetchDates(user.username)
          ])
        } catch (e) {
          // Non-fatal: continue without auxiliary data
          console.warn('User details fetch failed:', e)
        }
      }

      // Update global state if a setter is provided
      if (typeof setGlobalState === 'function') {
        setGlobalState({
          logged: true,
          une: user?.username,
          lang: user?.lang,
          email: user?.email,
          practiceStreak,
        })
      }

      // Route away from login if necessary
      if (router && route && route.path === '/login' && router.push) {
        try { await router.push('/') } catch {}
      }

      if (typeof onAuthenticated === 'function') onAuthenticated(session)
      return { session, userData, datesData, practiceStreak }
    } else {
      const reason = session && session.status ? session.status : 'unauthenticated'
      if (typeof onFailed === 'function') onFailed(reason)
      // Optional: redirect to login if provided
      if (router && router.push) {
        try { await router.push('/login') } catch {}
      }
      return null
    }
  } catch (error) {
    console.error('Authentication failed:', error)
    if (typeof onFailed === 'function') onFailed(error)
    loginRedirect();
    return null
  } finally {
    if (loadingRef && typeof loadingRef === 'object') loadingRef.value = false
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
  // Attempt to obtain token and session; redirect only if not authenticated.
  const data = await getSessionData()
  const isLoggedIn = !!(data && (data.ok || data.success || data.loggedIn) && (data.user || data.session || data.username))
  if (isLoggedIn) {
    return data
  } else loginRedirect()
}

export const authService = {
  storeInitialToken,
  getSessionData,
  handleAuthentication,
  loginRedirect,
  ensureLoggedIn,
}

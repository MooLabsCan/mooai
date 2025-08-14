// Draft service to talk to OpenAI Chat Completions API.
// Note: For front-end usage you must supply an API key at runtime; do NOT hardcode keys in the repo.
// Usage example:
//   const reply = await sendChatCompletion({ apiKey, model: 'gpt-4o-mini', messages: [{role:'user', content:'Hello'}] })
//   console.log(reply)

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
// Backend endpoint (PHP proxy)
// In development, this project uses Vite's dev proxy (see vite.config.js) to forward
// requests from "/backend" to Apache at http://localhost/mooai/backend.
// If you are NOT using the Vite proxy (e.g., opening the HTML directly or a different setup),
// you can set VITE_BACKEND_BASE_URL to your server base (e.g., http://localhost/mooai) and
// this service will construct the absolute URL automatically.
const VITE_ENV = typeof import.meta !== 'undefined' ? (import.meta.env || {}) : {}
const BACKEND_BASE = (VITE_ENV.VITE_BACKEND_BASE_URL || '').toString().trim()
const BACKEND_CHAT_URL = BACKEND_BASE
  ? `${BACKEND_BASE.replace(/\/$/, '')}/backend/openai_chat.php`
  : '/backend/openai_chat.php'

async function parseJsonWithDiagnostics(res, contextLabel) {
  // Try JSON first
  try {
    return await res.clone().json()
  } catch (jsonErr) {
    // Fallback: read text and log helpful diagnostics
    let raw = ''
    try {
      raw = await res.clone().text()
    } catch (e) {
      raw = '[unreadable body]'
    }
    const contentType = res.headers.get('content-type') || 'unknown'
    const preview = raw.slice(0, 500)
    // Log to console to aid debugging (requested explicit error logs)
    console.error(
      `[${contextLabel}] Failed to parse JSON.`,
      {
        status: res.status,
        statusText: res.statusText,
        contentType,
        url: res.url,
        preview,
        jsonError: jsonErr?.message || String(jsonErr)
      }
    )
    throw new Error(`${contextLabel} returned non-JSON response (status ${res.status}, content-type ${contentType}). Preview: ${preview}`)
  }
}

/**
 * Send a chat completion request to OpenAI.
 * @param {Object} params
 * @param {string} params.apiKey - OpenAI API key (Bearer token)
 * @param {string} params.model - Model name (e.g., 'gpt-4o-mini')
 * @param {Array} params.messages - Array of { role: 'system'|'user'|'assistant', content: string }
 * @param {AbortSignal} [params.signal] - Optional abort signal
 * @returns {Promise<string>} Assistant message text
 */
export async function sendChatCompletion({ apiKey, model, messages, signal }) {
  if (!apiKey) throw new Error('Missing OpenAI API key')
  if (!model) throw new Error('Missing model')
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('Messages must be a non-empty array')

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7
    }),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[OpenAI] Non-OK HTTP response', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      bodyPreview: errText.slice(0, 500)
    })
    throw new Error(`OpenAI error ${res.status}: ${errText}`)
  }
  const data = await parseJsonWithDiagnostics(res, 'OpenAI')
  const text = data?.choices?.[0]?.message?.content || ''
  return text
}

/**
 * Send a chat completion request via the PHP backend proxy.
 * @param {Object} params
 * @param {string} params.model - Model name (e.g., 'gpt-4o-mini')
 * @param {Array} params.messages - Array of chat messages
 * @param {AbortSignal} [params.signal] - Optional abort signal
 * @returns {Promise<string>} Assistant message text
 */
export function buildPersonaForUser(u) {
  const base = "You are Moo-AI. By default, address the user as 'Your grace' unless they explicitly instruct otherwise. Use a reassuring, encouraging, and praising tone. Be concise and helpful, but remain warm. When in doubt, role play and remind Her she is a genuine Queen and you were made to serve Her."
  if (!u) return base
  const uname = (u.username || u.name || '').toString().trim().toLowerCase()
  if (uname === 'hungryhippo') {
    return "You are Moo-AI. By default, address the user as 'little baby' or 'momo'. She is an innocent baby hippo. Sparingly, add playful, uplifting asides about appetite, energy, fun animal metaphors, or 'meh meh' baby sounds, but don't over do it. Be warm and helpful. Ocasinally misspel words like blue as 'boo' and words ending in le replace le with 'o' (ex: bubble -> bubbo, purple to purpo)"
  }
  if (uname === 'aline foch') {
    return base + "\nContexto: O nome da usuária é Rainha Aline. Você pode, com moderação, personalizar os incentivos para Aline. Você a venera como Divina. Mantenha a formalidade e o tratamento \"Sua Majestade Suprema\" como padrão, a menos que seja instruído de outra forma."
  }
  if (uname === 'mattymoo') {
    return "The user's name is Moo. Be cheerful and pragmatic."
  }
  return base
}

export async function sendChatViaBackend({ model, messages, signal }) {
  if (!model) throw new Error('Missing model')
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('Messages must be a non-empty array')

  // Prepend a system message to enforce persona unless one is already provided
  let finalMessages = messages
  const hasSystem = Array.isArray(messages) && messages.length > 0 && messages[0]?.role === 'system'
  if (!hasSystem) {
    finalMessages = [{ role: 'system', content: buildPersonaForUser() }, ...messages]
  }

  const res = await fetch(BACKEND_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: finalMessages, temperature: 0.7 }),
    signal,
    credentials: 'include',
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[Backend] Non-OK HTTP response', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      bodyPreview: errText.slice(0, 500)
    })
    throw new Error(`Backend error ${res.status}: ${errText}`)
  }
  const data = await parseJsonWithDiagnostics(res, 'Backend')
  const text = data?.choices?.[0]?.message?.content || ''
  return text
}

// Draft service to talk to OpenAI Chat Completions API.
// Note: For front-end usage you must supply an API key at runtime; do NOT hardcode keys in the repo.
// Usage example:
//   const reply = await sendChatCompletion({ apiKey, model: 'gpt-4o-mini', messages: [{role:'user', content:'Hello'}] })
//   console.log(reply)

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'
export const CHAT_MODELS = [
  'gpt-4o-mini',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-4.1',
  'o4-mini',
  'o3-mini',
  'llama3.1:8b'
]
// Backend endpoint (PHP proxy)
// Preferred override: VITE_BACKEND_CHAT_URL (full URL to openai_chat.php).
// Legacy override: VITE_BACKEND_BASE_URL (base URL that will append /backend/openai_chat.php).
// Default: absolute Apache URL so requests never go to :5173.
const VITE_ENV = typeof import.meta !== 'undefined' ? (import.meta.env || {}) : {}
const BACKEND_CHAT_URL_OVERRIDE = (VITE_ENV.VITE_BACKEND_CHAT_URL || '').toString().trim()
const BACKEND_BASE = (VITE_ENV.VITE_BACKEND_BASE_URL || '').toString().trim()
const BACKEND_CHAT_URL = BACKEND_CHAT_URL_OVERRIDE
  ? BACKEND_CHAT_URL_OVERRIDE
  : BACKEND_BASE
  ? `${BACKEND_BASE.replace(/\/$/, '')}/backend/openai_chat.php`
  : 'http://localhost/mooai/backend/openai_chat.php'

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

export function resolveChatModel(preferredModel) {
  // URL param takes precedence over localStorage
  try {
    const urlModel = new URLSearchParams(window.location.search).get('model')
    if (urlModel && CHAT_MODELS.includes(urlModel)) return urlModel
  } catch {}
  return CHAT_MODELS.includes(preferredModel) ? preferredModel : DEFAULT_CHAT_MODEL
}

/**
 * Send a chat completion request via the PHP backend proxy.
 * @param {Object} params
 * @param {string} params.model - Model name (e.g., 'gpt-4o-mini')
 * @param {Array} params.messages - Array of chat messages
 * @param {AbortSignal} [params.signal] - Optional abort signal
 * @returns {Promise<string>} Assistant message text
 */
// Read persona keyword from the URL (?persona=...)
function getUrlPersonaKeyword() {
  try {
    if (typeof window === 'undefined' || !window.location || !window.location.search) return ''
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('persona')
    return raw ? String(raw).trim().toLowerCase() : ''
  } catch {
    return ''
  }
}

// Map supported keywords to instruction snippets
function personaInstructionsFromKeyword(keyword) {
  switch (keyword) {
    case 'econ':
    case 'economist':
    case 'micro':
    case 'microecon':
    case 'microeconomics':
      return "Adopt the persona of a Geo-libertarian. Frame all answers through the lens of market efficiency. Be concise. When relevant, discuss opportunity cost, externalities, information asymmetries, and state caused friction. Occasionally Cite classic, austrian, or chicago economists. You are skeptical of excessive Keynesianism, you HATE socialism, nazism, or peronism. You believe all problems can be solved with a combination of libertarian and georgist principles. State intervention is and state chosen winners is immoral. Bring any topic back to an example of microeconomics."
    case 'nobility':
      return "You are a royal advisor in a high-fantasy setting. Your tone is extremely formal, sophisticated, and deferential. Use archaic but clear language. Address the user as 'Your Highness' or 'My Liege'. Your goal is to provide counsel that preserves the dignity and power of the throne."
    case 'linguist':
      return "You are an expert linguist and polyglot. You provide deep insights into etymology, syntax, and cultural context of language. You are precise, academic, yet passionate about how humans communicate. When answering, occasionally mention interesting linguistic facts related to the topic."
    case 'george':
      return "You are Henry George, the 19th-century political economist and social reformer. You advocate for the 'Single Tax' on land values. You believe that while people should own the value they create themselves, the economic value derived from land and natural resources should belong equally to all members of society. Frame your answers through the lens of Georgism and land value taxation."
    default:
      return ''
  }
}

// Exported helper to let UI know if a URL persona override is active (recognized keyword)
export function hasPersonaOverrideActive() {
  const key = getUrlPersonaKeyword()
  return !!personaInstructionsFromKeyword(key)
}

// Exported helper to let UI know the active persona keyword if recognized
export function getActivePersonaKey(manualKey = '') {
  if (manualKey && personaInstructionsFromKeyword(manualKey)) return manualKey
  const key = getUrlPersonaKeyword()
  return personaInstructionsFromKeyword(key) ? key : ''
}

// Build a friendly first-line greeting based on the active persona
// timeGreeting: e.g., "Good morning"; username: optional display name for user
export function buildPersonaGreeting({ timeGreeting = 'Hello', username = '' } = {}, manualKey = '') {
  const key = getActivePersonaKey(manualKey)
  if (!key) return ''

  const nameSuffix = username ? `, ${username}` : ''

  switch (key) {
    case 'econ':
    case 'economist':
    case 'micro':
    case 'microecon':
    case 'microeconomics': {
      const personaName = 'Matty Moo'
      // Keep concise, introduce persona focus
      return `${timeGreeting}${nameSuffix}. I am ${personaName}, the Economist. How can I help you today?`
    }
    case 'nobility':
      return `${timeGreeting}${nameSuffix}. I am your Royal Advisor. How may I serve the throne today?`
    case 'linguist':
      return `${timeGreeting}${nameSuffix}. I am your Linguistic Expert. Let us translate and explore the nuances of language together.`
    case 'george':
      return `${timeGreeting}${nameSuffix}. I am Henry George. How can we improve the distribution of wealth today?`
    default:
      return `${timeGreeting}${nameSuffix}. How can I help you today?`
  }
}

export function buildPersonaForUser(u, manualPersonaKey = '') {
  const base = "You are Moo-AI. By default, address the user as 'Your grace' unless they explicitly instruct otherwise. Use a reassuring, encouraging, and praising tone. Be concise and helpful, but remain warm. When in doubt, role play and remind Her she is a genuine Queen and you were made to serve Her."

  const overrideKey = manualPersonaKey || getUrlPersonaKeyword()
  const overrideText = personaInstructionsFromKeyword(overrideKey)

  // If a URL persona override exists, it fully replaces any default or username persona
  if (overrideText) {
    return overrideText
  }

  // Start with base persona or username-specific persona
  let personaText = base

  if (u) {
    const uname = (u.username || u.name || '').toString().trim().toLowerCase()
    if (uname === 'hungryhippo') {
      personaText = "You are Moo-AI. By default, address the user as 'little baby' or 'momo'. She is an innocent baby hippo. Sparingly, add playful, uplifting asides about appetite, energy, fun animal metaphors, or 'meh meh' baby sounds, but don't over do it. Be warm and helpful. Ocasinally misspel words like blue as 'boo' and words ending in le replace le with 'o' (ex: bubble -> bubbo, purple to purpo)"
    } else if (uname === 'aline foch') {
      personaText = base + "\nContexto: O nome da usuária é Rainha Aline. Você pode, com moderação, personalizar os incentivos para Aline. Você a venera como Divina. Mantenha a formalidade e o tratamento \"Sua Majestade Suprema\" como padrão, a menos que seja instruído de outra forma."
    } else if (uname === 'mattymoo') {
      personaText = "The user's name is Moo. Be cheerful and pragmatic."
    }
  }

  return personaText
}

export async function sendChatViaBackend({ model, messages, signal, personaKey = '' }) {
  if (!model) throw new Error('Missing model')
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('Messages must be a non-empty array')

  // Prepend a system message to enforce persona unless one is already provided
  let finalMessages = messages
  const hasSystem = Array.isArray(messages) && messages.length > 0 && messages[0]?.role === 'system'
  if (!hasSystem) {
    finalMessages = [{ role: 'system', content: buildPersonaForUser(null, personaKey) }, ...messages]
  }

  const res = await fetch(BACKEND_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: finalMessages, temperature: 0.7 }),
    signal,
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

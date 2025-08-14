<script setup>
import { ref, onMounted, nextTick } from 'vue'
import ModelSelect from './ModelSelect.vue'
import { authService } from '../services/authService'
import { sendChatViaBackend } from '../services/chatAI'
import userWomanUrl from '../assets/user-woman.svg'

const models = ['gpt-4o-mini', 'gpt-4.1', 'o4-mini', 'o3-mini', 'llama3.1:8b']
const model = ref(localStorage.getItem('chat.model') || models[0])

const messages = ref([])
// Detect user timezone for time-of-day greeting logic (and potential future use)
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

function getTimeOfDayGreeting(date = new Date()){
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Good night'
}

const input = ref('')
const sending = ref(false)
const chatScrollRef = ref(null)

// Auth/session state
const session = ref(null)
const checkingSession = ref(false)

async function checkSession() {
  try {
    checkingSession.value = true
    const data = await authService.getSessionData()
    // Accept several possible shapes from the backend
    const isLoggedIn = !!(data && (data.ok || data.success || data.loggedIn) && (data.user || data.session || data.username))
    session.value = isLoggedIn ? (data.user || data.session || { username: data.username }) : null
    return session.value
  } finally {
    checkingSession.value = false
  }
}

async function onLoginClick(){
  // Ensure logged in; will redirect if not
  const data = await authService.ensureLoggedIn()
  if (data) {
    // stays on page if authenticated
    session.value = data.user || data.session || { username: data.username }
  }
}

function persistModel(val){
  localStorage.setItem('chat.model', val)
}

function appendMessage(role, content){
  messages.value.push({ id: Date.now() + Math.random(), role, content })
}

async function send(){
  const text = input.value.trim()
  if (!text || sending.value) return
  appendMessage('user', text)
  input.value = ''
  sending.value = true
  await nextTick()
  scrollToBottom()

  // Show a temporary assistant message while contacting backend
  const thinkingId = Date.now() + Math.random()
  messages.value.push({ id: thinkingId, role: 'assistant', content: 'Thinking…' })
  await nextTick(); scrollToBottom()

  try {
    // Send full conversation to backend
    const reply = await sendChatViaBackend({
      model: model.value,
      messages: messages.value.map(m => ({ role: m.role, content: m.content }))
    })
    const idx = messages.value.findIndex(m => m.id === thinkingId)
    if (idx !== -1) messages.value[idx] = { id: thinkingId, role: 'assistant', content: reply || '(no content)' }
  } catch (e) {
    const idx = messages.value.findIndex(m => m.id === thinkingId)
    const msg = e && e.message ? `Error: ${e.message}` : 'Error contacting AI service.'
    if (idx !== -1) messages.value[idx] = { id: thinkingId, role: 'assistant', content: msg }
  } finally {
    sending.value = false
    await nextTick(); scrollToBottom()
  }
}

function onKeydown(e){
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function scrollToBottom(){
  const el = chatScrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

onMounted(() => {
  // Compose dynamic greeting based on local time
  const greeting = getTimeOfDayGreeting()
  appendMessage('assistant', `${greeting}, Your grace. I\'m Moo-AI. How may I serve you today?`)

  scrollToBottom()
  // Try to pre-check session silently
  checkSession().catch(() => {})
})
</script>

<template>
  <div class="chat-shell">
    <header class="topbar">
      <div class="controls">
        <ModelSelect :model="model" :models="models" @update:model="val => { model.value = val; persistModel(val) }" />
        <div class="session">
          <span v-if="session" class="user-chip" title="Logged in">
            <span class="dot"></span>
            {{ session.username || session.name || session.email || 'User' }}
          </span>
          <button v-else class="login-btn" :disabled="checkingSession" @click="onLoginClick">
            <span v-if="!checkingSession">Login</span>
            <span v-else>Checking…</span>
          </button>
        </div>
      </div>
    </header>

    <main class="chat" ref="chatScrollRef">
      <div class="spacer"></div>
      <div v-for="m in messages" :key="m.id" class="msg" :data-role="m.role">
        <div class="avatar" :aria-label="m.role === 'user' ? 'You' : 'AI'" role="img">
          <img v-if="m.role === 'user'" :src="userWomanUrl" alt="User" class="avatar-img" />
          <span v-else class="glow-dot" aria-hidden="true"></span>
        </div>
        <div class="bubble" v-html="m.content.replace(/\n/g,'<br/>')"></div>
      </div>
    </main>

    <footer class="composer">
      <div class="input-wrap">
        <textarea
          v-model="input"
          :disabled="sending"
          placeholder="Type your message..."
          rows="1"
          @keydown="onKeydown"
        ></textarea>
        <button class="send" :disabled="sending || !input.trim()" @click="send" aria-label="Send message">
          <span v-if="!sending">Send</span>
          <span v-else>…</span>
        </button>
      </div>
      <div class="tips">Press Enter to send • Shift+Enter for new line</div>
    </footer>
  </div>
</template>

<style scoped>
/******** Theme ********/
:host, .chat-shell {
  --background: #0b0c10;
  --panel: #111218;
  --muted: #1a1b22;
  --border: #22232b;
  --foreground: #e6e6ea;
  --muted-foreground: #9b9ca5;
  --accent: #6ee7b7;
  --accent-strong: #34d399;
}

.chat-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100dvh;
  background: var(--background);
  color: var(--foreground);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: .75rem 1rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
    , var(--panel);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand { display: flex; align-items: center; gap: .75rem; }
.logo { width: 36px; height: 36px; display: grid; place-items: center; background: var(--muted); border-radius: .6rem; }
.logo .glow-dot.large { width: 14px; height: 14px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px 3px rgba(34,197,94,0.8), 0 0 18px 8px rgba(34,197,94,0.3); display: inline-block; }
.titles h1 { font-size: 1rem; line-height: 1; margin: 0; }
.subtitle { margin: .125rem 0 0; font-size: .8rem; color: var(--muted-foreground); }

.controls { display: flex; align-items: center; gap: .75rem; flex: 1; }
.session { display: flex; align-items: center; margin-left: auto; }
.login-btn {
  padding: .5rem .8rem;
  border-radius: .6rem;
  border: 1px solid var(--border);
  background: #1f2937;
  color: var(--foreground);
}
.login-btn:disabled { opacity: .7; }
.user-chip {
  display: inline-flex; align-items: center; gap: .5rem;
  padding: .35rem .6rem; border-radius: 999px; background: #0f172a; border: 1px solid var(--border);
}
.user-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; }

.chat {
  overflow: auto;
  padding: 1rem;
}
.spacer { height: .5rem; }
.msg { display: grid; grid-template-columns: 36px 1fr; gap: .5rem .75rem; margin-bottom: .75rem; align-items: start; }
.msg .avatar { width: 36px; height: 36px; display: grid; place-items: center; background: var(--muted); border-radius: 50%; font-size: 18px; overflow: hidden; }
.msg .avatar .avatar-img { width: 24px; height: 24px; object-fit: cover; display: block; }
.msg .avatar .glow-dot { width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px 2px rgba(34,197,94,0.7), 0 0 14px 6px rgba(34,197,94,0.25); display: inline-block; }
.msg .bubble { padding: .75rem .9rem; border-radius: .75rem; border: 1px solid var(--border); background: #12131a; }
.msg[data-role="user"] .bubble { background: #0f1320; }
.msg[data-role="assistant"] .bubble { background: #101618; }

.composer {
  padding: .75rem; border-top: 1px solid var(--border); background: linear-gradient(0deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), var(--panel);
}
.input-wrap { display: flex; gap: .5rem; align-items: end; }
textarea {
  flex: 1;
  resize: none;
  max-height: 30vh;
  padding: .75rem .9rem;
  border-radius: .75rem;
  border: 1px solid var(--border);
  background: var(--muted);
  color: var(--foreground);
  line-height: 1.35;
}
textarea::placeholder { color: var(--muted-foreground); }
textarea:disabled { opacity: .7; }

.send {
  padding: .7rem 1rem;
  border-radius: .7rem;
  border: 1px solid var(--border);
  background: var(--accent);
  color: #0a0a0a;
  font-weight: 600;
}
.send[disabled] { opacity: .6; filter: grayscale(30%); }

.tips { margin-top: .5rem; font-size: .8rem; color: var(--muted-foreground); text-align: center; }

/* Desktop tweaks */
@media (min-width: 900px) {
  .chat-shell { max-width: 960px; margin: 0 auto; border: 1px solid var(--border); border-radius: 1rem; }
  .topbar { border-top-left-radius: 1rem; border-top-right-radius: 1rem; }
  .composer { border-bottom-left-radius: 1rem; border-bottom-right-radius: 1rem; }
}
</style>

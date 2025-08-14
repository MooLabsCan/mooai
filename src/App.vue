<script setup>
import { ref, watch, onMounted } from 'vue'
import ChatApp from './components/ChatApp.vue'
import logo from './assets/mooai-logo.svg'

const tabs = ['chat', 'settings']
const activeTab = ref('chat')

const THEME_KEY = 'app.theme'
const theme = ref(localStorage.getItem(THEME_KEY) || 'dark') // 'dark' | 'light' | 'feminine'

function applyThemeClass(t){
  const root = document.documentElement
  root.classList.remove('theme-dark', 'theme-light', 'theme-feminine')
  if (t === 'light') root.classList.add('theme-light')
  else if (t === 'feminine') root.classList.add('theme-feminine')
  else root.classList.add('theme-dark')
}

watch(theme, (t) => {
  localStorage.setItem(THEME_KEY, t)
  applyThemeClass(t)
})

onMounted(() => {
  applyThemeClass(theme.value)
})
</script>

<template>
  <div class="app-shell" :class="['theme-'+theme]">
    <header class="app-topbar">
      <div class="brand">
        <img class="brand-logo" :src="logo" alt="mooAI logo" />
        <span class="brand-name">mooAI</span>
      </div>
      <nav class="tabs" role="tablist">
        <button :aria-selected="activeTab==='chat'" :class="{active: activeTab==='chat'}" @click="activeTab='chat'" role="tab">Chat</button>
        <button :aria-selected="activeTab==='settings'" :class="{active: activeTab==='settings'}" @click="activeTab='settings'" role="tab">Settings</button>
      </nav>
      <div class="right-slot"></div>
    </header>

    <section v-if="activeTab==='chat'" class="tab-panel" role="tabpanel" aria-label="Chat">
      <ChatApp />
    </section>

    <section v-else class="tab-panel settings" role="tabpanel" aria-label="Settings">
      <div class="settings-card">
        <h2>Appearance</h2>
        <p class="hint">Choose your preferred style.</p>
        <div class="theme-options">
          <label class="theme-option">
            <input type="radio" name="theme" value="dark" v-model="theme" />
            <span class="swatch dark"></span>
            <span>Default (Dark)</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="light" v-model="theme" />
            <span class="swatch light"></span>
            <span>Light</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="feminine" v-model="theme" />
            <span class="swatch feminine"></span>
            <span>Elegant</span>
          </label>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Base resets for tabs wrapper to look fine regardless of theme */
.app-topbar { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(6px); display:flex; align-items:center; gap:.5rem; padding: .25rem .5rem; }
.brand { display:flex; align-items:center; gap:.4rem; min-width:0; }
.brand-logo { width:28px; height:28px; border-radius:6px; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
.brand-name { font-weight:700; color: var(--foreground, #eee); letter-spacing:.2px; }
.tabs { display: flex; gap: .5rem; padding: .5rem; justify-content: center; flex:1; }
.tabs button { padding: .5rem .9rem; border-radius: 999px; border: 1px solid var(--border, #222); background: var(--panel, #111); color: var(--foreground, #eee); opacity: .8; }
.tabs button.active { opacity: 1; background: var(--muted, #1a1a1a); }

.tab-panel.settings { min-height: 60vh; display: grid; place-items: start center; padding: 2rem 1rem; }
.settings-card { width: min(680px, 92vw); border: 1px solid var(--border, #222); border-radius: 1rem; padding: 1.25rem; background: var(--panel, #111); color: var(--foreground, #eee); box-shadow: 0 6px 20px rgba(0,0,0,.25); }
.settings-card h2 { margin: 0 0 .25rem; font-size: 1.1rem; }
.settings-card .hint { margin: 0 0 1rem; color: var(--muted-foreground, #aaa); }
.theme-options { display: grid; gap: .75rem; }
.theme-option { display: inline-flex; align-items: center; gap: .6rem; padding: .5rem .6rem; border-radius: .75rem; border: 1px dashed var(--border, #333); background: var(--muted, #181818); }
.theme-option input { accent-color: var(--accent, #6ee7b7); }
.swatch { width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--border, #333); display:inline-block; }
.swatch.dark { background: linear-gradient(135deg, #0b0c10, #1a1b22); }
.swatch.light { background: linear-gradient(135deg, #ffffff, #f0f2f5); }
/* Soft floral gradient with subtle pattern for feminine */
.swatch.feminine { background: linear-gradient(135deg, #fff1f7, #ffe8f1 40%, #f7e8ff); }

/* THEME TOKENS */
:root.theme-dark {
  --background: #0b0c10;
  --panel: #111218;
  --muted: #1a1b22;
  --border: #22232b;
  --foreground: #e6e6ea;
  --muted-foreground: #9b9ca5;
  --accent: #6ee7b7;
  --accent-strong: #34d399;
  --bubble-user: #0f1320;
  --bubble-assistant: #101618;
  --bubble: #12131a;
  --chip-bg: #0f172a;
  --btn-bg: #1f2937;
}

:root.theme-light {
  --background: #fbfbfd;
  --panel: #ffffff;
  --muted: #f3f4f6;
  --border: #e5e7eb;
  --foreground: #0b0c10;
  --muted-foreground: #4b5563;
  --accent: #2563eb;
  --accent-strong: #1d4ed8;
  --bubble-user: #e8f0ff;
  --bubble-assistant: #eefaf3;
  --bubble: #f7f8fa;
  --chip-bg: #eef2f7;
  --btn-bg: #e7eaf0;
  background-color: var(--background);
}

:root.theme-feminine {
  --background: #fff7fb;
  --panel: #fffafe;
  --muted: #fff0f6;
  --border: #ffd6e7;
  --foreground: #402b3a;
  --muted-foreground: #8b6780;
  --accent: #ff77a9;
  --accent-strong: #ff4d94;
  --bubble-user: #ffe6f2;
  --bubble-assistant: #f8f0ff;
  --bubble: #fff0f6;
  --chip-bg: #ffe6f2;
  --btn-bg: #ffeaf4;
  background-image: radial-gradient(20px 20px at 20px 20px, rgba(255,182,193,0.2) 20%, transparent 21%),
                    radial-gradient(24px 24px at 120px 60px, rgba(255,192,203,0.18) 20%, transparent 21%),
                    radial-gradient(18px 18px at 60% 30%, rgba(255,182,193,0.18) 18%, transparent 19%);
  background-color: var(--background);
}

/* OVERRIDES to adapt ChatApp hardcoded colors under themes */
:root.theme-light .chat-shell { background: var(--background); color: var(--foreground); }
:root.theme-feminine .chat-shell { background: var(--background); color: var(--foreground); }

:root.theme-light .msg .bubble { background: var(--bubble); border-color: var(--border); }
:root.theme-light .msg[data-role="user"] .bubble { background: var(--bubble-user); }
:root.theme-light .msg[data-role="assistant"] .bubble { background: var(--bubble-assistant); }

:root.theme-feminine .msg .bubble { background: var(--bubble); border-color: var(--border); }
:root.theme-feminine .msg[data-role="user"] .bubble { background: var(--bubble-user); }
:root.theme-feminine .msg[data-role="assistant"] .bubble { background: var(--bubble-assistant); }

:root.theme-light .login-btn, :root.theme-feminine .login-btn { background: var(--btn-bg); color: var(--foreground); border-color: var(--border); }
:root.theme-light .user-chip, :root.theme-feminine .user-chip { background: var(--chip-bg); border-color: var(--border); color: var(--foreground); }
:root.theme-light textarea, :root.theme-feminine textarea { background: var(--muted); color: var(--foreground); border-color: var(--border); }
:root.theme-light .send { background: var(--accent); color: #0a0a0a; }
:root.theme-feminine .send { background: var(--accent); color: #3a0a1f; }

/* Make body follow theme background gently */
html.theme-dark, html.theme-light, html.theme-feminine { background: var(--background); }
</style>


<style>
/* Corrected theme selectors overriding previous rules */
:root.theme-dark {}
:root.theme-light {}
:root.theme-feminine {}

:root.theme-light .chat-shell { background: var(--background); color: var(--foreground); }
:root.theme-feminine .chat-shell { background: var(--background); color: var(--foreground); }

:root.theme-light .msg .bubble { background: var(--bubble); border-color: var(--border); }
:root.theme-light .msg[data-role="user"] .bubble { background: var(--bubble-user); }
:root.theme-light .msg[data-role="assistant"] .bubble { background: var(--bubble-assistant); }

:root.theme-feminine .msg .bubble { background: var(--bubble); border-color: var(--border); }
:root.theme-feminine .msg[data-role="user"] .bubble { background: var(--bubble-user); }
:root.theme-feminine .msg[data-role="assistant"] .bubble { background: var(--bubble-assistant); }

:root.theme-light .login-btn, :root.theme-feminine .login-btn { background: var(--btn-bg); color: var(--foreground); border-color: var(--border); }
:root.theme-light .user-chip, :root.theme-feminine .user-chip { background: var(--chip-bg); border-color: var(--border); color: var(--foreground); }
:root.theme-light textarea, :root.theme-feminine textarea { background: var(--muted); color: var(--foreground); border-color: var(--border); }
:root.theme-light .send { background: var(--accent); color: #0a0a0a; }
:root.theme-feminine .send { background: var(--accent); color: #3a0a1f; }
</style>


<style>
/* Theme tokens applied via app-shell wrapper for cascade */
.app-shell.theme-light .chat-shell {
  --background: #fbfbfd;
  --panel: #ffffff;
  --muted: #f3f4f6;
  --border: #e5e7eb;
  --foreground: #0b0c10;
  --muted-foreground: #4b5563;
  --accent: #2563eb;
  --accent-strong: #1d4ed8;
  --bubble-user: #e8f0ff;
  --bubble-assistant: #eefaf3;
  --bubble: #f7f8fa;
  --chip-bg: #eef2f7;
  --btn-bg: #e7eaf0;
}
.app-shell.theme-feminine .chat-shell {
  --background: #fff7fb;
  --panel: #fffafe;
  --muted: #fff0f6;
  --border: #ffd6e7;
  --foreground: #402b3a;
  --muted-foreground: #8b6780;
  --accent: #ff77a9;
  --accent-strong: #ff4d94;
  --bubble-user: #ffe6f2;
  --bubble-assistant: #f8f0ff;
  --bubble: #fff0f6;
  --chip-bg: #ffe6f2;
  --btn-bg: #ffeaf4;
}
/* Specific overrides for hardcoded colors */
.app-shell.theme-light .msg .bubble { background: var(--bubble); border-color: var(--border); }
.app-shell.theme-light .msg[data-role="user"] .bubble { background: var(--bubble-user); }
.app-shell.theme-light .msg[data-role="assistant"] .bubble { background: var(--bubble-assistant); }
.app-shell.theme-feminine .msg .bubble { background: var(--bubble); border-color: var(--border); }
.app-shell.theme-feminine .msg[data-role="user"] .bubble { background: var(--bubble-user); }
.app-shell.theme-feminine .msg[data-role="assistant"] .bubble { background: var(--bubble-assistant); }
.app-shell.theme-light .login-btn, .app-shell.theme-feminine .login-btn { background: var(--btn-bg); color: var(--foreground); border-color: var(--border); }
.app-shell.theme-light .user-chip, .app-shell.theme-feminine .user-chip { background: var(--chip-bg); border-color: var(--border); color: var(--foreground); }
.app-shell.theme-light textarea, .app-shell.theme-feminine textarea { background: var(--muted); color: var(--foreground); border-color: var(--border); }
.app-shell.theme-light .send { background: var(--accent); color: #0a0a0a; }
.app-shell.theme-feminine .send { background: var(--accent); color: #3a0a1f; }
/* Soft floral backdrop for feminine theme on the page */
.app-shell.theme-feminine { 
  background-image: radial-gradient(20px 20px at 20px 20px, rgba(255,182,193,0.2) 20%, transparent 21%),
                    radial-gradient(24px 24px at 120px 60px, rgba(255,192,203,0.18) 20%, transparent 21%),
                    radial-gradient(18px 18px at 60% 30%, rgba(255,182,193,0.18) 18%, transparent 19%);
}
</style>

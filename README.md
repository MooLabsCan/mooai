# MooAI

This app uses Vue 3 + Vite on the frontend and a lightweight PHP backend for secure API access.

Backend
- See backend/README.md for setup.
- Provide your OpenAI API key via environment variable OPENAI_API_KEY or backend/.env (not committed).

Frontend and environment variables
- With Vite, only variables prefixed with `VITE_` are exposed to the browser via `import.meta.env`.
- Never put secrets (like `OPENAI_API_KEY`) in frontend `.env` files; they would be publicly visible in the built app.
- Use the PHP backend proxy to keep secrets on the server. You may set public, non‑secret config via Vite vars. Example:
  - Create a root `.env` with: `VITE_BACKEND_BASE_URL=http://localhost/mooai`
  - The app will call `${VITE_BACKEND_BASE_URL}/backend/openai_chat.php` when present, or `/backend/openai_chat.php` with the dev proxy.

Frontend services
- src/services/chatAI.js includes two helpers:
  - sendChatCompletion: calls OpenAI directly when you explicitly pass an API key from the client (not recommended for production).
  - sendChatViaBackend: calls the PHP proxy at /backend/openai_chat.php to keep your key on the server.

FAQ
- Q: Can I access `.env` keys as variables on the frontend without a backend?
  - A: You can only access Vite‑prefixed vars (e.g., `VITE_SOMETHING`) and they are public. You cannot securely access private secrets (like API keys) from the frontend without a backend. Keep secrets on the server and call a server endpoint.

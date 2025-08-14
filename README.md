# MooAI

This app uses Vue 3 + Vite on the frontend and a lightweight PHP backend for secure API access.

Backend
- See backend/README.md for setup.
- Provide your OpenAI API key via environment variable OPENAI_API_KEY or backend/.env (not committed).

Frontend services
- src/services/chatAI.js includes two helpers:
  - sendChatCompletion: calls OpenAI directly when you explicitly pass an API key from the client (not recommended for production).
  - sendChatViaBackend: calls the PHP proxy at /backend/openai_chat.php to keep your key on the server.

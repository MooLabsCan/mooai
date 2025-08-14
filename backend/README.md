Backend (PHP)

This folder contains a simple PHP backend used to keep API keys off the frontend and proxy requests to third-party APIs (e.g., OpenAI).

Setup
1) PHP environment: This project assumes you run via XAMPP at http://localhost/mooai.
2) Secrets: Do NOT commit secrets. Provide your OpenAI key via one of the following:
   - Environment variable OPENAI_API_KEY
   - Or create backend/.env (not committed) with a line: OPENAI_API_KEY=sk-...

Running
- Place this repo under your XAMPP htdocs (C:\xampp\htdocs\mooai) so PHP files are served at http://localhost/mooai/backend.
- Endpoint: POST http://localhost/mooai/backend/openai_chat.php
  Body (JSON):
  {
    "model": "gpt-4o-mini",
    "messages": [ { "role": "user", "content": "Hello" } ],
    "temperature": 0.7
  }

CORS
- By default, this enables CORS for http://localhost:5173 (Vite default). Adjust backend/config.php if your origin differs.

Security notes
- Keep .env out of version control (already ignored).
- Consider restricting allowed origins and adding your own auth if exposing publicly.

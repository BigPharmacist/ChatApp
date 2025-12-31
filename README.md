# Nebius Chat App

Eine Chat-Anwendung mit Nebius AI Studio LLMs und Web-Suche via Brave API.

## Features

- Multi-Model Support (Llama, Qwen, DeepSeek, Gemma, Kimi, GLM)
- Web-Suche via Brave API (Function Calling / Tool Use)
- Chat-Verlauf wird in Supabase gespeichert
- Automatische Titel-Generierung
- Streaming-Antworten

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Datenbank**: Supabase (PostgreSQL)
- **LLM API**: Nebius AI Studio
- **Web-Suche**: Brave Search API

## Installation

### 1. Voraussetzungen

```bash
# Node.js (falls nicht vorhanden)
brew install node

# Supabase CLI
brew install supabase/tap/supabase
```

### 2. Repository klonen

```bash
git clone https://github.com/BigPharmacist/ChatApp.git
cd ChatApp
npm install
```

### 3. API-Keys besorgen

- **Nebius API Key**: [tokenfactory.nebius.com](https://tokenfactory.nebius.com)
- **Brave Search API Key**: [brave.com/search/api](https://brave.com/search/api) (Free: 2000 Queries/Monat)

### 4. Environment-Dateien erstellen

**`.env`** (im Hauptverzeichnis):
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<wird-von-supabase-start-ausgegeben>
```

**`supabase/.env`**:
```env
NEBIUS_API_KEY=<dein-nebius-api-key>
BRAVE_API_KEY=<dein-brave-api-key>
```

### 5. Supabase starten

```bash
supabase start
```

Kopiere den `anon key` aus der Ausgabe in deine `.env` Datei.

### 6. App starten

Du brauchst zwei Terminals:

**Terminal 1 - Edge Functions:**
```bash
supabase functions serve --env-file supabase/.env
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Die App läuft dann unter: http://localhost:5173

## Verfügbare Modelle

| Modell | Tool Use |
|--------|----------|
| Llama 3.3 70B | Ja |
| Qwen3 32B / 235B | Ja |
| DeepSeek V3 | Ja |
| DeepSeek R1 | Ja |
| Gemma 3 27B | Ja |
| Kimi K2 | Ja |
| GLM 4.5 | Ja |

## Web-Suche

Die App nutzt Function Calling um automatisch im Internet zu suchen, wenn der Nutzer nach aktuellen Informationen fragt:

- "Was sind die aktuellen Nachrichten?"
- "Suche im Internet nach..."
- "Wie ist das Wetter in Berlin?"

Bei erfolgreicher Suche wird angezeigt: `🔍 *Websuche durchgeführt*`

## Lizenz

MIT

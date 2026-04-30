# Stones Backend

Thin JavaScript backend for the offline-first task and workspace app.

## Current Scope

- Health check endpoint
- AI task extraction endpoint
- Local fallback extraction when no Gemini API key is configured
- CORS, Helmet, request logging, JSON validation, and basic rate limiting

The frontend should still work offline-first with IndexedDB. This backend exists for capabilities that should not live directly in the browser, especially API-key-protected AI calls and future sync.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Server defaults to `http://localhost:4000`.

## Endpoints

### `GET /api/health`

Returns server status.

### `POST /api/ai/extract-tasks`

Extracts structured tasks from unstructured text.

```json
{
  "text": "Finish assignment tomorrow at 5 PM\nEmail professor",
  "sourceBlockId": "block_123",
  "pageId": "page_123"
}
```

Response:

```json
{
  "provider": "local",
  "tasks": [
    {
      "title": "Finish assignment tomorrow at 5 PM",
      "priority": "medium",
      "dueText": "tomorrow at 5 PM",
      "sourceBlockId": "block_123",
      "pageId": "page_123"
    }
  ]
}
```

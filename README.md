# BreatheAI

Telegram бот — AI-коуч по дыхательным практикам.

## Стек

- TypeScript + Node.js (tsx)
- Grammy (Telegram framework)
- Anthropic Claude API
- Redis (история диалогов)

## Запуск локально

```bash
cp .env.example .env   # заполнить переменные
npm install
npm run bot
```

## Переменные окружения

| Переменная | Описание |
|---|---|
| `ANTHROPIC_API_KEY` | Ключ Anthropic API |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `REDIS_URL` | `redis://localhost:6379` локально |

## Деплой

Платформа: Railway.app
Статус: пока не задеплоен

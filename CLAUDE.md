# BreatheAI — Инструкции для Claude Code

## Проект
Telegram бот — AI-коуч по дыхательным практикам. TypeScript + Grammy + Claude API + Redis.

## Стек
- **Runtime:** Node.js + TypeScript (tsx для запуска)
- **Telegram:** Grammy framework
- **AI:** @anthropic-ai/sdk, модель claude-sonnet-4-6
- **БД:** Redis (история диалогов, уже подключён через ioredis)

## Структура проекта
```
src/
  bot.ts              — точка входа, все Telegram handlers
  history.ts          — Redis: хранение истории диалога per userId
  responses.ts        — матрица состояний: 20+ StateVariant с техниками и ответами
  state-detector.ts   — детект состояния по ключевым словам из текста
  faq.ts              — статические ответы на частые вопросы (без API)
  breathing-session.ts — анимированная сессия дыхания (редактирование сообщения каждую секунду)
  chat.ts             — CLI версия для разработки без Telegram
  hello-claude.ts     — первый пример запроса к Claude API
  streaming.ts        — учебный пример: streaming API Claude (4 паттерна)
```

## Архитектурные решения — ВАЖНО

### Трёхуровневый роутинг сообщений
Текстовые сообщения обрабатываются в порядке:
1. **state-detector** → ключевые слова → статический ответ из матрицы (без API)
2. **faq** → частые вопросы → статический ответ (без API)
3. **Claude API** → fallback если не нашли совпадений

**Почему так:** экономия токенов. Большинство запросов закрываются матрицей без вызова API.
**Не менять** этот порядок без явной просьбы.

### Матрица состояний (responses.ts)
`StateVariant` — центральная структура данных. Содержит id, keywords, техника, параметры дыхания, 2-3 варианта ответа, followUp.
**Не рефакторить** структуру без явной просьбы — на неё завязаны bot.ts, state-detector.ts, breathing-session.ts.

### Анимация дыхания (breathing-session.ts)
Рендерит ASCII-визуализацию в Telegram-сообщении, обновляя его каждую секунду через `editMessageText`.
Поддерживает 3 типа визуализации: pendulum / open / square — в зависимости от паттерна дыхания.
**Не трогать** эту логику — она стабильна и протестирована вручную.

### История диалога (history.ts)
Redis, ключ `history:{userId}`, TTL 7 дней, лимит 20 сообщений.
`userCurrentVariant` — Map в памяти для хранения последней выбранной техники (сбрасывается при рестарте — это нормально).

## Правила разработки

### Язык и стиль
- Весь код на TypeScript со строгой типизацией
- Комментарии на русском языке
- Async/await везде, никаких callbacks
- Явные типы для всех функций (параметры + возвращаемое значение)

### Claude API
- Модель: `claude-sonnet-4-6` (если не указано иное)
- Системный промпт: всегда на русском, краткий, ролевой
- История: хранить per userId через history.ts
- Токены: max_tokens не более 1024 для чат-ответов

### Telegram (Grammy)
- Всегда показывать `typing` action перед ответом Claude
- Обрабатывать ошибки — пользователь должен получить понятное сообщение
- Команды: /start, /help, /reset, /breathe

### Безопасность
- Все секреты только через переменные окружения
- userId из Telegram использовать как ключ для изоляции данных

### Ошибки
```typescript
try {
  const response = await askClaude(userId, message);
  await ctx.reply(response);
} catch (error) {
  await ctx.reply("Произошла ошибка. Попробуй ещё раз.");
  console.error(error);
}
```

## Запуск
```bash
npm run hello      # тест Claude API
npm run streaming  # учебный пример: streaming
npm run chat       # CLI диалог
npm run bot        # Telegram бот
```

## Переменные окружения
```
ANTHROPIC_API_KEY   — обязательно
TELEGRAM_BOT_TOKEN  — обязательно
REDIS_URL           — обязательно (redis://localhost:6379 для локальной разработки)
DATABASE_URL        — не используется (pgvector — план на Фазу 2)
```

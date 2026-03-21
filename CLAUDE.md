# BreatheAI — Инструкции для Claude Code

## Проект
Telegram бот — AI-коуч по дыхательным практикам. TypeScript + Grammy + Claude API + Redis.

## Стек
- **Runtime:** Node.js + TypeScript (tsx для запуска)
- **Telegram:** Grammy framework
- **AI:** @anthropic-ai/sdk, модель claude-sonnet-4-6
- **БД:** Redis (история), PostgreSQL + pgvector (база знаний)
- **Деплой:** Railway.app

## Структура проекта
```
src/
  bot.ts          — точка входа, Telegram handlers
  chat.ts         — CLI версия для разработки
  hello-claude.ts — пример первого запроса
```

## Правила разработки

### Язык и стиль
- Весь код на TypeScript со строгой типизацией
- Комментарии на русском языке (разработчик русскоязычный)
- Async/await везде, никаких callbacks
- Явные типы для всех функций (параметры + возвращаемое значение)

### Claude API
- Модель: `claude-sonnet-4-6` (если не указано иное)
- Системный промпт: всегда на русском, краткий, ролевой
- История: хранить per userId, тип `Array<{role, content}>`
- Токены: max_tokens не более 1024 для чат-ответов

### Telegram (Grammy)
- Всегда показывать `typing` action перед ответом Claude
- Обрабатывать ошибки — пользователь должен получить понятное сообщение
- Команды: /start, /help, /reset минимум
- Inline keyboard для улучшения UX

### Безопасность
- Все секреты только через переменные окружения
- Никаких токенов и ключей в коде или комментариях
- userId из Telegram использовать как ключ для изоляции данных

### Ошибки
```typescript
// Всегда оборачивать Claude вызовы в try/catch
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
npm run hello   # тест Claude API
npm run chat    # CLI диалог
npm run bot     # Telegram бот
```

## Переменные окружения
```
ANTHROPIC_API_KEY   — обязательно
TELEGRAM_BOT_TOKEN  — обязательно
REDIS_URL           — опционально (пока история в памяти)
DATABASE_URL        — опционально (пока без БД)
```

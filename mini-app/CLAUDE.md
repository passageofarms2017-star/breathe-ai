# mini-app — Инструкции для Claude Code

## Что это
Telegram Mini App — визуальный UI для дыхательных сессий BreatheAI.
Открывается внутри Telegram через Menu Button бота.
Деплой: Vercel (https://breathe-ai-mini-app.vercel.app)

## Стек
- Vanilla HTML/CSS/JS — **без фреймворков**, один файл `index.html`
- Telegram Web App SDK (`telegram-web-app.js`) для haptic feedback и темы
- Web Audio API — генерируем звуки без файлов (OSC + GainNode)

## Архитектура: два экрана

```
screen-states  → выбор состояния (сетка 2x5 кнопок)
screen-session → анимированная сессия дыхания
```

Переключение через `showScreen(id)` — display none/block через CSS класс `.active`.

## Матрица состояний (STATES в index.html)

**Дублирует** `responses.ts` из бота — намеренно, нет общего бэкенда.
10 состояний: `anxiety_mild`, `stress_general`, `sleep_cant`, `anger`, `relax_simple`,
`focus`, `overwhelm`, `bedtime`, `feeling_good`, `morning_good`.

Каждый вариант: `{ technique, params: {inhale, hold1, exhale, hold2}, desc }`.

**Важно:** при добавлении состояний в `responses.ts` — обновлять и здесь.

## Анимация дыхания

Один CSS-элемент `.square` — зелёный прямоугольник.
- Вдох: `scale(1.5)`, transition = длительности фазы
- Выдох: `scale(1)`, transition = длительности фазы
- Задержка: transition `0.3s` (не двигается)
- Счётчик секунд внутри квадрата через `setInterval`

**Не менять** логику анимации без явной просьбы — визуально согласована с ботом.

## Правила разработки

- Всё в одном `index.html` — не разбивать на файлы без явной просьбы
- Темизация через CSS-переменные Telegram: `var(--tg-theme-bg-color, fallback)`
- `tg.HapticFeedback.impactOccurred()` для тактильной обратной связи
- Звук через Web Audio API (не через `<audio>` теги)
- Поддерживать работу без Telegram (`tg` может быть undefined)

## Деплой
```bash
# Деплой через Vercel CLI из папки mini-app/
vercel --prod
```
Vercel конфиг: `vercel.json` (статика, нет роутинга).

import Anthropic from "@anthropic-ai/sdk";

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING — получение ответа по частям, не дожидаясь полного завершения
//
// Java-аналогия:
//   Обычный вызов    → Future<String>.get()          — блокируемся до конца
//   Streaming        → InputStream / Flux<String>    — читаем по мере появления
//
// Зачем нужно:
//   - Пользователь видит ответ сразу, не ждёт 5-10 секунд
//   - Можно прервать генерацию на середине
//   - В production это стандарт (ChatGPT, Claude.ai — всё streaming)
// ═══════════════════════════════════════════════════════════════════════════

const client = new Anthropic();

// ─── Пример 1: Базовый streaming ──────────────────────────────────────────
//
// stream.on("text") срабатывает каждый раз когда приходит очередной кусок текста.
// Размер куска непредсказуем: может быть слово, может быть буква, может быть фраза.
//
async function basicStreaming(): Promise<void> {
  console.log("─── Пример 1: Базовый streaming ───────────────────────────");
  console.log("Ответ появляется по мере генерации:\n");

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: "Объясни технику дыхания 4-7-8 в 4 предложениях. Отвечай на русском.",
      },
    ],
  });

  // process.stdout.write — выводит текст БЕЗ перевода строки
  // Отличие от console.log: кусочки склеиваются в одну строку
  stream.on("text", (chunk: string) => {
    process.stdout.write(chunk);
  });

  // Ждём завершения и получаем финальное сообщение для статистики
  const finalMessage = await stream.finalMessage();

  console.log("\n");
  console.log(`Токены: вход=${finalMessage.usage.input_tokens}, выход=${finalMessage.usage.output_tokens}`);
}

// ─── Пример 2: Сбор streaming в строку ────────────────────────────────────
//
// Частый паттерн: стримим для UX, но в конце нужна полная строка
// (например чтобы сохранить в историю или обработать)
//
async function streamToString(): Promise<string> {
  console.log("─── Пример 2: Сбор текста из stream ──────────────────────");

  let fullText = "";

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: "Назови 3 дыхательные техники одним словом каждую, через запятую.",
      },
    ],
  });

  stream.on("text", (chunk: string) => {
    fullText += chunk;          // копим куски в переменную
    process.stdout.write(chunk); // и одновременно показываем в консоли
  });

  await stream.finalMessage();

  console.log("\n");
  console.log(`Собранная строка: "${fullText}"`);
  console.log(`Длина: ${fullText.length} символов`);

  return fullText;
}

// ─── Пример 3: stream.text() — самый короткий способ ─────────────────────
//
// SDK предоставляет удобный итератор — можно использовать for await
// Это аналог Java Stream API: forEach vs for-each loop
//
async function streamWithForAwait(): Promise<void> {
  console.log("─── Пример 3: for await (итератор) ───────────────────────");
  console.log("Тот же результат, более чистый синтаксис:\n");

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: "Напиши одно мотивирующее предложение про осознанное дыхание. На русском.",
      },
    ],
  });

  // for await — итерируем асинхронно по кускам текста
  // Java-аналог: for (String chunk : reactiveStream.toIterable())
  for await (const chunk of stream.text_stream) {
    process.stdout.write(chunk);
  }

  console.log("\n");
}

// ─── Пример 4: Обработка событий жизненного цикла ────────────────────────
//
// stream генерирует не только текст — есть события начала, конца, метаданные.
// Полезно для логирования, аналитики, обработки ошибок.
//
async function streamWithLifecycle(): Promise<void> {
  console.log("─── Пример 4: События жизненного цикла stream ─────────────");

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: "Скажи 'Привет!' и ничего больше.",
      },
    ],
  });

  // message_start — пришли метаданные (id, модель, токены входа)
  stream.on("message", (msg) => {
    console.log(`  [START] id=${msg.id}, модель=${msg.model}`);
    console.log("  Текст: ", { suffix: "" });
  });

  stream.on("text", (chunk: string) => {
    process.stdout.write(chunk);
  });

  // finalMessage — stream завершён, можно читать финальные токены
  const final = await stream.finalMessage();
  console.log(`\n  [END] stop_reason=${final.stop_reason}`);
  console.log(`  Использовано токенов: ${final.usage.input_tokens + final.usage.output_tokens} всего`);
}

// ─── Главная функция ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("═══ STREAMING — получение ответа по частям ════════════════\n");

  await basicStreaming();
  await streamToString();
  await streamWithForAwait();
  await streamWithLifecycle();

  console.log("\n═══ Готово! ════════════════════════════════════════════════");
  console.log("\nКлючевые выводы:");
  console.log("  1. stream.on('text', chunk => ...)  — событийная модель");
  console.log("  2. for await (chunk of stream.text_stream)  — итератор");
  console.log("  3. await stream.finalMessage()  — дождаться конца + статистика");
  console.log("  4. Куски текста непредсказуемы по размеру — склеивай сам");
}

main().catch(console.error);

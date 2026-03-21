import Anthropic from "@anthropic-ai/sdk";

// Это твой первый запрос к Claude API
// Концепции:
// - client: объект для общения с Claude (как DataSource в Spring)
// - model: какую модель используем
// - max_tokens: максимум токенов в ответе (токен ≈ 0.75 слова)
// - messages: история диалога — массив { role, content }
// - role "user" — сообщение от пользователя
// - role "assistant" — ответ от Claude

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function askClaude(question: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: question,
      },
    ],
  });

  // Ответ приходит в виде массива блоков контента
  const content = message.content[0];
  if (content.type === "text") {
    return content.text;
  }
  return "";
}

async function main() {
  console.log("Отправляем запрос к Claude...\n");

  const response = await askClaude(
    "Объясни технику дыхания 'box breathing' (квадратное дыхание) в 3 предложениях. " +
      "Ответь на русском языке."
  );

  console.log("Ответ Claude:");
  console.log("─".repeat(50));
  console.log(response);
  console.log("─".repeat(50));
  console.log("\nПервый запрос к Claude API — выполнен!");
}

main().catch(console.error);

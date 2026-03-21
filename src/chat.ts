import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

// Ключевая концепция: история диалога
// Claude не помнит предыдущие сообщения сам по себе —
// ты каждый раз отправляешь ВСЮ историю с нуля.
// Это и есть "контекстное окно" — массив messages.
//
// Аналогия из Java: представь stateless REST сервис,
// которому каждый раз передаёшь полный контекст через body.

const client = new Anthropic();

// Тип для сообщения в истории
type Message = {
  role: "user" | "assistant";
  content: string;
};

// История диалога — накапливается в памяти
const history: Message[] = [];

// Системный промпт — личность и роль Claude
// Это не входит в history, передаётся отдельно
const SYSTEM_PROMPT = `Ты — AI-коуч по дыхательным практикам BreatheAI.
Ты помогаешь людям управлять своим состоянием через дыхание.
Отвечай кратко и по делу. Говори на русском языке.
Если пользователь описывает своё состояние — предложи подходящую дыхательную технику.`;

async function chat(userMessage: string): Promise<string> {
  // Добавляем сообщение пользователя в историю
  history.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT, // системный промпт — отдельно от messages
    messages: history,     // передаём ВСЮ историю
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Добавляем ответ Claude в историю
  history.push({ role: "assistant", content: assistantMessage });

  return assistantMessage;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("BreatheAI Коуч — введи своё состояние или вопрос");
  console.log("Для выхода: Ctrl+C\n");

  const askQuestion = () => {
    rl.question("Ты: ", async (input) => {
      const userInput = input.trim();
      if (!userInput) {
        askQuestion();
        return;
      }

      const response = await chat(userInput);
      console.log(`\nBreatheAI: ${response}\n`);
      console.log(`[История: ${history.length} сообщений в контексте]\n`);

      askQuestion(); // рекурсивно продолжаем диалог
    });
  };

  askQuestion();
}

main().catch(console.error);

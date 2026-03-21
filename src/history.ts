import Redis from "ioredis";

// Аналогия из Java: это как @Repository — слой доступа к данным
// Redis хранит историю диалога каждого пользователя
// Ключ: "history:{userId}", значение: JSON массив сообщений

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Тип сообщения — такой же как в Claude API
export type Message = {
  role: "user" | "assistant";
  content: string;
};

// Максимум сообщений в истории (контекстное окно не бесконечное)
const MAX_HISTORY_LENGTH = 20;

// Время жизни истории — 7 дней в секундах
const TTL_SECONDS = 7 * 24 * 60 * 60;

export async function getHistory(userId: number): Promise<Message[]> {
  const key = `history:${userId}`;
  const data = await redis.get(key);

  if (!data) return [];

  return JSON.parse(data) as Message[];
}

export async function addMessage(userId: number, message: Message): Promise<void> {
  const key = `history:${userId}`;
  const history = await getHistory(userId);

  history.push(message);

  // Обрезаем историю если стала слишком длинной
  // Оставляем последние MAX_HISTORY_LENGTH сообщений
  const trimmed = history.slice(-MAX_HISTORY_LENGTH);

  // Сохраняем с TTL — история автоматически удалится через 7 дней неактивности
  await redis.setex(key, TTL_SECONDS, JSON.stringify(trimmed));
}

export async function clearHistory(userId: number): Promise<void> {
  await redis.del(`history:${userId}`);
}

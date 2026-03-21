import { VARIANTS, StateVariant } from "./responses";

// Определяет состояние пользователя по ключевым словам в тексте
// Возвращает id варианта с наибольшим числом совпадений, или null
export function detectState(text: string): StateVariant | null {
  const normalized = text.toLowerCase().replace(/[.,!?;:]/g, " ");

  let bestMatch: StateVariant | null = null;
  let bestScore = 0;

  for (const variant of VARIANTS) {
    const score = variant.keywords.filter(kw => normalized.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = variant;
    }
  }

  // Требуем хотя бы одно совпадение
  return bestScore > 0 ? bestMatch : null;
}

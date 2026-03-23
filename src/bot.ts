import Anthropic from "@anthropic-ai/sdk";
import { Bot, Context, InlineKeyboard } from "grammy";
import { getHistory, addMessage, clearHistory } from "./history";
import { startBreathingSession } from "./breathing-session";
import { VARIANTS, findVariant, randomFrom } from "./responses";
import { detectState } from "./state-detector";
import { findFaqAnswer } from "./faq";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const claude = new Anthropic();

const SYSTEM_PROMPT = `Ты — AI-коуч по дыхательным практикам BreatheAI.
Ты помогаешь людям управлять своим состоянием через дыхание.
Отвечай кратко и по делу. Говори на русском языке.
Если пользователь описывает своё состояние — предложи подходящую дыхательную технику.
Используй эмодзи умеренно для лучшего восприятия в мессенджере.`;

// Сохраняем текущий вариант пользователя для /breathe после выбора состояния
const userCurrentVariant = new Map<number, string>();

// Кнопки выбора состояния
function getStateKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("😰 Тревога",          "state:anxiety_mild")
    .text("😤 Стресс",           "state:stress_general")
    .row()
    .text("😴 Не могу уснуть",   "state:sleep_cant")
    .text("😤 Злость",           "state:anger")
    .row()
    .text("😮‍💨 Просто подышать", "state:relax_simple")
    .text("🎯 Концентрация",     "state:focus")
    .row()
    .text("😵 Перегруз",         "state:overwhelm")
    .text("🌙 Перед сном",       "state:bedtime")
    .row()
    .text("😊 Всё хорошо",       "state:feeling_good")
    .text("☀️ Доброе утро",      "state:morning_good");
}

// Кнопка запуска сессии
function getBreathKeyboard(variantId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("▶️ Начать сессию дыхания", `breathe:${variantId}`);
}

// Fallback в Claude если матрица не сработала
async function askClaude(userId: number, userMessage: string): Promise<string> {
  const history = await getHistory(userId);
  await addMessage(userId, { role: "user", content: userMessage });
  const updatedHistory = await getHistory(userId);

  const response = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: updatedHistory,
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";

  await addMessage(userId, { role: "assistant", content: assistantMessage });
  return assistantMessage;
}

// /start
bot.command("start", async (ctx: Context) => {
  await ctx.reply(
    "Привет! Я BreatheAI — твой коуч по дыхательным практикам 🌿\n\n" +
    "Как себя чувствуешь прямо сейчас?",
    { reply_markup: getStateKeyboard() }
  );
});

// /reset
bot.command("reset", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (userId) {
    await clearHistory(userId);
    userCurrentVariant.delete(userId);
  }
  await ctx.reply("История очищена. Начнём сначала 🔄", {
    reply_markup: getStateKeyboard(),
  });
});

// /breathe — запуск последней выбранной техники или дефолтной
bot.command("breathe", async (ctx: Context) => {
  const userId = ctx.from?.id;
  const variantId = userId ? userCurrentVariant.get(userId) : undefined;
  const variant = variantId ? findVariant(variantId) : undefined;

  const params = variant?.breathingParams;
  const followUp = variant?.followUp;
  const label = variant ? `Техника: ${variant.technique}` : "Box Breathing 4-4-4-4";

  await ctx.reply(`Начинаем сессию дыхания 🌿\n${label}\n10 раундов — следи за кружочком...`);
  await startBreathingSession(bot.api, ctx.chat.id, 10, params, followUp);
});

// /help
bot.command("help", async (ctx: Context) => {
  await ctx.reply(
    "Команды:\n" +
    "/start — выбрать состояние\n" +
    "/breathe — запустить сессию дыхания\n" +
    "/reset — очистить историю\n" +
    "/help — эта справка\n\n" +
    "Или просто напиши как себя чувствуешь — я подберу технику."
  );
});

// Нажатие на кнопку состояния → статический ответ из матрицы
bot.callbackQuery(/^state:(.+)$/, async (ctx) => {
  const variantId = ctx.match[1];
  const variant = findVariant(variantId);

  await ctx.answerCallbackQuery();

  if (!variant) {
    await ctx.reply("Не нашёл технику для этого состояния. Попробуй описать словами.");
    return;
  }

  const userId = ctx.from.id;
  userCurrentVariant.set(userId, variant.id);

  const responseText = randomFrom(variant.responses);
  await ctx.reply(
    `${responseText}\n\n*Техника:* ${variant.technique} (${variant.breathingParams.inhale}-${variant.breathingParams.hold1}-${variant.breathingParams.exhale}-${variant.breathingParams.hold2})`,
    {
      parse_mode: "Markdown",
      reply_markup: getBreathKeyboard(variant.id),
    }
  );
});

// Нажатие "Начать сессию" из карточки техники
bot.callbackQuery(/^breathe:(.+)$/, async (ctx) => {
  const variantId = ctx.match[1];
  const variant = findVariant(variantId);

  await ctx.answerCallbackQuery();

  if (!variant) return;

  await ctx.reply(`Начинаем: ${variant.technique} 🌿\n10 раундов — следи за кружочком...`);
  await startBreathingSession(bot.api, ctx.chat.id, 10, variant.breathingParams, variant.followUp);
});

// Свободный текст — сначала матрица, потом Claude
bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  const userMessage = ctx.message.text;

  await ctx.replyWithChatAction("typing");

  // Пробуем определить состояние по ключевым словам
  const variant = detectState(userMessage);

  if (variant) {
    // Нашли совпадение — статический ответ, без API
    userCurrentVariant.set(userId, variant.id);
    const responseText = randomFrom(variant.responses);

    await ctx.reply(
      `${responseText}\n\n*Техника:* ${variant.technique} (${variant.breathingParams.inhale}-${variant.breathingParams.hold1}-${variant.breathingParams.exhale}-${variant.breathingParams.hold2})`,
      {
        parse_mode: "Markdown",
        reply_markup: getBreathKeyboard(variant.id),
      }
    );
    return;
  }

  // Проверяем FAQ — частые вопросы без API
  const faqAnswer = findFaqAnswer(userMessage);
  if (faqAnswer) {
    await ctx.reply(faqAnswer, { parse_mode: "Markdown" });
    return;
  }

  // Не нашли — fallback в Claude
  try {
    const response = await askClaude(userId, userMessage);
    await ctx.reply(response);
  } catch (error) {
    await ctx.reply("Произошла ошибка. Попробуй ещё раз.");
    console.error(error);
  }
});

bot.start();
console.log("BreatheAI запущен. Матрица: 20 состояний, Claude fallback включён.");

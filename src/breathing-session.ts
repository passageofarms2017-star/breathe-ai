import { Api } from "grammy";
import { BreathingParams } from "./responses";

const DEFAULT_PARAMS: BreathingParams = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 };

// ─── Типы визуализации ────────────────────────────────────────────────────────
//
//  pendulum  hold1=0 и hold2=0   →  шарик движется вверх/вниз по вертикали
//  open      hold2=0, hold1>0    →  ∏-форма: три стороны, пропорциональные фазам
//  square    hold1>0, hold2>0    →  квадрат/прямоугольник все 4 стороны
//
type VisualType = "pendulum" | "open" | "square";

function getVisualType(p: BreathingParams): VisualType {
  if (p.hold1 === 0 && p.hold2 === 0) return "pendulum";
  if (p.hold2 === 0) return "open";
  return "square";
}

// ─── Построение пути шарика ───────────────────────────────────────────────────
//
// Каждый элемент — позиция [row, col] в сетке.
// Одна позиция = одна секунда.
//
function buildPath(p: BreathingParams): [number, number][] {
  const type = getVisualType(p);

  if (type === "pendulum") {
    return buildPendulumPath(p);
  }
  if (type === "open") {
    return buildOpenPath(p);
  }
  return buildSquarePath(p);
}

// Маятник: вверх на вдохе, вниз на выдохе
// Сетка: max(inhale, exhale) строк × 1 столбец
function buildPendulumPath(p: BreathingParams): [number, number][] {
  const path: [number, number][] = [];
  // Вдох: от строки inhale до строки 1 (вверх)
  for (let r = p.inhale; r >= 1; r--) path.push([r, 0]);
  // Выдох: от строки 0 до строки exhale-1 (вниз)
  for (let r = 0; r < p.exhale; r++) path.push([r, 0]);
  return path;
}

// ∏-форма: три стороны для паттернов типа 4-7-8-0
// Левая (вдох), верхняя (задержка), правая (выдох)
// Каждая сторона пропорциональна своей длительности
function buildOpenPath(p: BreathingParams): [number, number][] {
  const path: [number, number][] = [];
  const W = p.hold1; // индекс правого столбца

  // Вдох: снизу вверх по левой стороне
  // Начало: строка p.inhale, колонка 0
  for (let r = p.inhale; r >= 1; r--) path.push([r, 0]);

  // Задержка: слева направо по верхней стороне
  // Угол [0,0] — первый шаг задержки
  for (let c = 0; c < p.hold1; c++) path.push([0, c]);

  // Выдох: сверху вниз по правой стороне
  // Угол [0,W] — первый шаг выдоха
  for (let r = 0; r < p.exhale; r++) path.push([r, W]);

  return path;
}

// Квадрат/прямоугольник: все 4 стороны.
// Каждая сторона имеет ровно столько шагов, сколько секунд в фазе.
// При асимметрии (inhale ≠ exhale) позиции интерполируются по сетке —
// шарик прыгает через несколько строк за шаг, но остаётся в синхроне с дыханием.
function buildSquarePath(p: BreathingParams): [number, number][] {
  const path: [number, number][] = [];
  const H = Math.max(p.inhale, p.exhale); // высота сетки
  const W = Math.max(p.hold1, p.hold2);   // ширина сетки

  // Вдох: p.inhale шагов вверх по левой стороне
  for (let i = 0; i < p.inhale; i++) {
    const r = H - Math.round(i * H / p.inhale);
    path.push([r, 0]);
  }
  // Задержка 1: p.hold1 шагов вправо по верхней стороне
  for (let i = 0; i < p.hold1; i++) {
    const c = Math.round(i * W / p.hold1);
    path.push([0, c]);
  }
  // Выдох: p.exhale шагов вниз по правой стороне
  for (let i = 0; i < p.exhale; i++) {
    const r = Math.round(i * H / p.exhale);
    path.push([r, W]);
  }
  // Задержка 2: p.hold2 шагов влево по нижней стороне
  for (let i = 0; i < p.hold2; i++) {
    const c = W - Math.round(i * W / p.hold2);
    path.push([H, c]);
  }

  return path;
}

// Эмодзи-цвет фазы (Telegram не поддерживает цветной текст, используем кружки)
function phaseEmoji(phaseName: string): string {
  if (phaseName.includes("ВДОХ"))  return "🟢";
  if (phaseName.includes("ВЫДОХ")) return "🔵";
  return "⚪"; // ПАУЗА
}

// ─── Рендеринг кадра ──────────────────────────────────────────────────────────

function renderFrame(
  p: BreathingParams,
  path: [number, number][],
  step: number,
  phaseName: string,
  secondsLeft: number,
  round: number,
  totalRounds: number
): string {
  const type = getVisualType(p);
  const [ballRow, ballCol] = path[step % path.length];

  let visual: string;

  if (type === "pendulum") {
    visual = renderPendulum(p, ballRow, secondsLeft);
  } else if (type === "open") {
    visual = renderOpenShape(p, ballRow, ballCol, secondsLeft);
  } else {
    visual = renderSquare(p, ballRow, ballCol, secondsLeft);
  }

  const emoji = phaseEmoji(phaseName);
  return (
    `${emoji} ${phaseName}  —  ${secondsLeft} сек\n` +
    `Раунд ${round} из ${totalRounds}\n\n` +
    `\`\`\`\n${visual}\n\`\`\``
  );
}

// Рендер маятника — вертикальная линия, цифра рядом со средней позицией
function renderPendulum(p: BreathingParams, ballRow: number, secondsLeft: number): string {
  const H = Math.max(p.inhale, p.exhale);
  const midRow = Math.floor(H / 2); // строка для цифры обратного отсчёта
  const lines: string[] = [];

  for (let r = 0; r <= H; r++) {
    const num = r === midRow ? ` ${secondsLeft}` : "  ";
    if (r === ballRow) lines.push(`● ${secondsLeft}`);
    else if (r === 0)        lines.push("·" + num);
    else if (r === p.inhale) lines.push("·" + num);
    else if (r === H)        lines.push("·" + num);
    else                     lines.push("│" + num);
  }
  return lines.join("\n");
}

// Рендер ∏-формы (3 стороны) — для паттернов типа 4-7-8-0
// Цифра обратного отсчёта — в центре верхней половины фигуры
function renderOpenShape(
  p: BreathingParams,
  ballRow: number,
  ballCol: number,
  secondsLeft: number
): string {
  const rows = Math.max(p.inhale, p.exhale); // строки 0..rows
  const cols = p.hold1;                       // столбцы 0..cols

  const grid: string[][] = Array.from({ length: rows + 1 }, () =>
    Array.from({ length: cols + 1 }, () => " ")
  );

  // Верхняя граница (строка 0)
  grid[0][0] = "·";
  grid[0][cols] = "·";
  for (let c = 1; c < cols; c++) grid[0][c] = "─";

  // Левая граница — только до строки inhale
  for (let r = 1; r < p.inhale; r++) grid[r][0] = "│";
  grid[p.inhale][0] = "·"; // нижний конец левой стороны

  // Правая граница — до строки exhale-1
  for (let r = 1; r < p.exhale; r++) grid[r][cols] = "│";
  grid[p.exhale - 1][cols] = "·"; // нижний конец правой стороны (уже угол)

  // Цифра в центре внутренней области (ниже верхней границы, между сторонами)
  const cr = Math.max(1, Math.floor(Math.min(p.inhale, p.exhale) / 2));
  const cc = Math.floor(cols / 2);
  if (grid[cr][cc] === " ") grid[cr][cc] = String(secondsLeft);

  // Шарик поверх всего
  grid[ballRow][ballCol] = "●";

  return grid.map(row => row.join(" ")).join("\n");
}

// Рендер квадрата — для паттернов с 4 фазами
// Цифра обратного отсчёта — в центре фигуры (всегда в пустой interior-ячейке)
function renderSquare(
  p: BreathingParams,
  ballRow: number,
  ballCol: number,
  secondsLeft: number
): string {
  const H = Math.max(p.inhale, p.exhale);
  const W = Math.max(p.hold1, p.hold2);

  const grid: string[][] = Array.from({ length: H + 1 }, () =>
    Array.from({ length: W + 1 }, () => " ")
  );

  // Все 4 стороны
  for (let c = 0; c <= W; c++) {
    grid[0][c] = c === 0 || c === W ? "·" : "─";
    grid[H][c] = c === 0 || c === W ? "·" : "─";
  }
  for (let r = 1; r < H; r++) {
    grid[r][0] = "│";
    grid[r][W] = "│";
  }

  // Цифра в центре (interior-ячейка, не на границе)
  const cr = Math.max(1, Math.floor(H / 2));
  const cc = Math.max(1, Math.floor(W / 2));
  grid[cr][cc] = String(secondsLeft);

  // Шарик поверх всего (если совпадает с цифрой — шарик приоритетнее)
  grid[ballRow][ballCol] = "●";

  return grid.map(row => row.join(" ")).join("\n");
}

// ─── Определение названия и отсчёта текущей фазы ─────────────────────────────

type PhaseInfo = { name: string; secondsLeft: number };

function getPhaseInfo(p: BreathingParams, stepInCycle: number): PhaseInfo {
  const phases = [
    { name: "🫁 ВДОХ",   dur: p.inhale },
    { name: "⏸ ПАУЗА",  dur: p.hold1  },
    { name: "😮‍💨 ВЫДОХ", dur: p.exhale },
    { name: "⏸ ПАУЗА",  dur: p.hold2  },
  ].filter(ph => ph.dur > 0);

  let acc = 0;
  for (const ph of phases) {
    if (stepInCycle < acc + ph.dur) {
      return { name: ph.name, secondsLeft: ph.dur - (stepInCycle - acc) };
    }
    acc += ph.dur;
  }
  return { name: "⏸", secondsLeft: 1 };
}

// ─── Публичная функция запуска сессии ─────────────────────────────────────────

export async function startBreathingSession(
  api: Api,
  chatId: number,
  rounds: number = 3,
  params: BreathingParams = DEFAULT_PARAMS,
  followUpText?: string
): Promise<void> {
  const path = buildPath(params);
  const cycleLen = path.length;
  const totalSteps = rounds * cycleLen;
  let step = 0;

  const { name, secondsLeft } = getPhaseInfo(params, 0);
  const firstFrame = renderFrame(params, path, 0, name, secondsLeft, 1, rounds);

  const msg = await api.sendMessage(chatId, firstFrame, { parse_mode: "Markdown" });
  const messageId = msg.message_id;

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      step++;

      if (step >= totalSteps) {
        clearInterval(interval);
        await api.editMessageText(
          chatId,
          messageId,
          followUpText ?? "✅ Сессия завершена!\n\nКак себя чувствуешь?"
        );
        resolve();
        return;
      }

      const stepInCycle = step % cycleLen;
      const currentRound = Math.floor(step / cycleLen) + 1;
      const { name, secondsLeft } = getPhaseInfo(params, stepInCycle);

      try {
        await api.editMessageText(
          chatId,
          messageId,
          renderFrame(params, path, step, name, secondsLeft, currentRound, rounds),
          { parse_mode: "Markdown" }
        );
      } catch {
        // Telegram игнорирует если сообщение не изменилось
      }
    }, 1000);
  });
}

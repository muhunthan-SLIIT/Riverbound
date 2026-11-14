// Feeding maths: question generation, answer checking and worked solutions.
// F = fish (always 4), C = crates, P = pellets per crate, N = pellets each fish needs, T = C * P.
import { FEED_BATCH_SIZE } from './constants.ts';
import { pick, randomInt, type Rng } from './random.ts';

export const FEEDING_TYPES = [
  'total_food',
  'equal_share',
  'enough_food',
  'leftover',
  'share_remainder',
  'extra_crates',
] as const;
export type FeedingType = (typeof FEEDING_TYPES)[number];

export type FeedingDifficulty = 'easy' | 'medium' | 'hard';

export const TYPES_BY_DIFFICULTY: Record<FeedingDifficulty, readonly FeedingType[]> = {
  easy: ['total_food', 'equal_share'],
  medium: ['total_food', 'equal_share', 'enough_food', 'leftover'],
  hard: ['enough_food', 'leftover', 'share_remainder', 'extra_crates'],
};

export type FeedingParams = { fish: number; crates: number; perCrate: number; needPerFish: number };

export type AnswerKind = 'number' | 'boolean' | 'quotient_remainder';

export type FeedingAnswer =
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'quotient_remainder'; quotient: number; remainder: number };

export type FeedingQuestion = {
  type: FeedingType;
  params: FeedingParams;
  answerKind: AnswerKind;
  text: string;
};

export function answerKindFor(type: FeedingType): AnswerKind {
  if (type === 'enough_food') return 'boolean';
  if (type === 'share_remainder') return 'quotient_remainder';
  return 'number';
}

/** Some question types only make sense for some numbers (for example, exact division). */
export function isValidFor(type: FeedingType, p: FeedingParams): boolean {
  const total = p.crates * p.perCrate;
  const need = p.fish * p.needPerFish;
  switch (type) {
    case 'total_food':
      return true;
    case 'equal_share':
      return total % p.fish === 0;
    case 'enough_food':
      return true;
    case 'leftover':
      return total >= need;
    case 'share_remainder':
      return total % p.fish !== 0; // a remainder question needs a real remainder
    case 'extra_crates':
      return total < need; // only ask when crates are really missing
  }
}

function questionText(type: FeedingType, p: FeedingParams): string {
  const base = `You have ${p.fish} fish and ${p.crates} food crate${p.crates === 1 ? '' : 's'}. Each crate holds ${p.perCrate} pellets.`;
  const need = ` Each fish needs ${p.needPerFish} pellets.`;
  switch (type) {
    case 'total_food':
      return `${base} How many pellets do you have in total?`;
    case 'equal_share':
      return `${base} If you share all pellets equally, how many pellets does each fish get?`;
    case 'enough_food':
      return `${base}${need} Is there enough food for all the fish?`;
    case 'leftover':
      return `${base}${need} How many pellets are left after feeding every fish?`;
    case 'share_remainder':
      return `${base} Share the pellets equally in whole pellets. How many does each fish get, and how many are left over?`;
    case 'extra_crates':
      return `${base}${need} How many more crates do you need so every fish is fed?`;
  }
}

export function makeQuestion(type: FeedingType, params: FeedingParams): FeedingQuestion {
  if (!isValidFor(type, params)) throw new Error(`Parameters are not valid for ${type}`);
  return { type, params, answerKind: answerKindFor(type), text: questionText(type, params) };
}

/** Creates a fresh, always-valid question. Tries random numbers until they fit the chosen type. */
export function generateQuestion(rng: Rng, difficulty: FeedingDifficulty): FeedingQuestion {
  const type = pick(rng, TYPES_BY_DIFFICULTY[difficulty]);
  const small = difficulty === 'easy';
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const params: FeedingParams = {
      fish: FEED_BATCH_SIZE,
      crates: randomInt(rng, 1, small ? 4 : 6),
      perCrate: randomInt(rng, 4, small ? 8 : 12),
      needPerFish: randomInt(rng, 1, 12),
    };
    if (isValidFor(type, params)) return makeQuestion(type, params);
  }
  // Fallback that is valid for every type except remainder/extra-crate checks; keep the type safe.
  return makeQuestion('total_food', { fish: FEED_BATCH_SIZE, crates: 2, perCrate: 12, needPerFish: 6 });
}

export function correctAnswer(q: FeedingQuestion): FeedingAnswer {
  const p = q.params;
  const total = p.crates * p.perCrate;
  const need = p.fish * p.needPerFish;
  switch (q.type) {
    case 'total_food':
      return { kind: 'number', value: total };
    case 'equal_share':
      return { kind: 'number', value: total / p.fish };
    case 'enough_food':
      return { kind: 'boolean', value: total >= need };
    case 'leftover':
      return { kind: 'number', value: total - need };
    case 'share_remainder':
      return { kind: 'quotient_remainder', quotient: Math.floor(total / p.fish), remainder: total % p.fish };
    case 'extra_crates':
      return { kind: 'number', value: Math.ceil(Math.max(0, need - total) / p.perCrate) };
  }
}

/** Checks that an unknown request body is a well-formed answer of the expected kind. */
export function parseFeedingAnswer(kind: AnswerKind, raw: unknown): FeedingAnswer | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10000;
  if (kind === 'number') return isCount(body.value) ? { kind, value: body.value } : null;
  if (kind === 'boolean') return typeof body.value === 'boolean' ? { kind, value: body.value } : null;
  return isCount(body.quotient) && isCount(body.remainder)
    ? { kind, quotient: body.quotient, remainder: body.remainder }
    : null;
}

export function isCorrect(q: FeedingQuestion, answer: FeedingAnswer): boolean {
  const right = correctAnswer(q);
  if (right.kind !== answer.kind) return false;
  if (right.kind === 'quotient_remainder' && answer.kind === 'quotient_remainder') {
    return right.quotient === answer.quotient && right.remainder === answer.remainder;
  }
  if (right.kind === 'number' && answer.kind === 'number') return right.value === answer.value;
  if (right.kind === 'boolean' && answer.kind === 'boolean') return right.value === answer.value;
  return false;
}

/** Step-by-step working shown after a wrong answer. */
export function workedSolution(q: FeedingQuestion): string[] {
  const p = q.params;
  const total = p.crates * p.perCrate;
  const need = p.fish * p.needPerFish;
  const steps = [`Total pellets = ${p.crates} crates × ${p.perCrate} = ${total}.`];
  switch (q.type) {
    case 'total_food':
      break;
    case 'equal_share':
      steps.push(`Each fish gets ${total} ÷ ${p.fish} = ${total / p.fish} pellets.`);
      break;
    case 'enough_food':
      steps.push(`Pellets needed = ${p.fish} fish × ${p.needPerFish} = ${need}.`);
      steps.push(total >= need ? `${total} ≥ ${need}, so yes, there is enough.` : `${total} < ${need}, so no, there is not enough.`);
      break;
    case 'leftover':
      steps.push(`Pellets needed = ${p.fish} × ${p.needPerFish} = ${need}.`);
      steps.push(`Left over = ${total} − ${need} = ${total - need}.`);
      break;
    case 'share_remainder':
      steps.push(`${total} ÷ ${p.fish} = ${Math.floor(total / p.fish)} each, remainder ${total % p.fish}.`);
      break;
    case 'extra_crates': {
      const missing = need - total;
      steps.push(`Pellets needed = ${p.fish} × ${p.needPerFish} = ${need}.`);
      steps.push(`Missing pellets = ${need} − ${total} = ${missing}.`);
      steps.push(`Extra crates = ${missing} ÷ ${p.perCrate}, rounded up = ${Math.ceil(missing / p.perCrate)}.`);
      break;
    }
  }
  return steps;
}

/** Feeding gets harder as the player moves through the regions. */
export function feedingDifficultyFor(regionsCleared: number): FeedingDifficulty {
  if (regionsCleared <= 0) return 'easy';
  if (regionsCleared === 1) return 'medium';
  return 'hard';
}

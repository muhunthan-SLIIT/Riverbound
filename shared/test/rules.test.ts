// Unit tests for the shared game rules. Run with: npm test (or node --test shared/test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDING_TYPES,
  TYPES_BY_DIFFICULTY,
  CATCH_MAX,
  CATCH_MIN,
  isValidCatch,
  rollCatch,
  perfectRate,
  rankLeaderboard,
  SHOP_ITEMS,
  contentFitsRegion,
  correctAnswer,
  createRng,
  generateQuestionFromPuzzle,
  getItemState,
  getRegion,
  isCorrect,
  makeQuestion,
  parseCrossingAnswer,
  parseFeedingAnswer,
  resolveCrossing,
  workedSolution,
  type ItemId,
  BACKUP_WEATHER,
  REGION_IDS,
  WEATHER_MAX_AGE_MS,
  WEATHER_PLACES,
  classifyWeather,
  isValidReading,
  resolveRegionWeather,
} from '../src/index.ts';

test('shop: map must be bought first, then compass', () => {
  assert.deepEqual(getItemState('river_map', [], 30), { status: 'buyable' });
  assert.equal(getItemState('compass', [], 100).status, 'locked');
  assert.equal(getItemState('boat', [], 999).status, 'locked');
  assert.equal(getItemState('compass', ['river_map'], 40).status, 'buyable');
  assert.equal(getItemState('swimming_goggles', ['river_map'], 99).status, 'locked');
  assert.equal(getItemState('swimming_goggles', ['river_map', 'compass'], 30).status, 'buyable');
});

test('shop: owned, prerequisites and shortfall', () => {
  const basics: ItemId[] = ['river_map', 'compass'];
  assert.deepEqual(getItemState('river_map', basics, 0), { status: 'owned' });
  assert.deepEqual(getItemState('compass', ['river_map'], 25), { status: 'need_coins', shortfall: 15 });
});

test('economy example from the spec: two cycles buy map then compass', () => {
  let coins = 0;
  coins += 5 + 4 * 10; // cycle 1
  assert.equal(coins, 45);
  coins -= 30; // map
  assert.equal(coins, 15);
  coins += 45; // cycle 2
  assert.equal(coins, 60);
  coins -= 40; // compass
  assert.equal(coins, 20);
});

test('fishing: tools removed (v2.3); each catch is a random 1-4 fish (v2.4)', () => {
  const ids: string[] = SHOP_ITEMS.map((i) => i.id);
  for (const removed of ['rod_kit', 'improved_reel', 'hook_upgrade', 'net', 'specialized_trap']) {
    assert.equal(ids.includes(removed), false, `${removed} must not be sold`);
  }
  assert.equal(SHOP_ITEMS.length, 7);
  assert.equal(CATCH_MIN, 1);
  assert.equal(CATCH_MAX, 4);
  // Every possible roll is allowed, and all four sizes can happen.
  const rng = createRng(42);
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i += 1) {
    const n = rollCatch((min, max) => min + Math.floor(rng() * (max - min)));
    assert.ok(isValidCatch(n));
    seen.add(n);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4]);
  // A broken random function is caught instead of giving 0 or 5 fish.
  assert.throws(() => rollCatch(() => 5));
  assert.equal(isValidCatch(0), false);
  assert.equal(isValidCatch(2.5), false);
});

test('feeding: spec example F=4, C=2, P=12 equal share is 6', () => {
  const q = makeQuestion('equal_share', { fish: 4, crates: 2, perCrate: 12, needPerFish: 6 });
  assert.deepEqual(correctAnswer(q), { kind: 'number', value: 6 });
  assert.equal(isCorrect(q, { kind: 'number', value: 6 }), true);
  assert.equal(isCorrect(q, { kind: 'number', value: 5 }), false);
  assert.ok(workedSolution(q).length >= 2);
});

test('feeding: invalid parameter combinations are rejected', () => {
  assert.throws(() => makeQuestion('equal_share', { fish: 4, crates: 1, perCrate: 5, needPerFish: 1 }));
  assert.throws(() => makeQuestion('leftover', { fish: 4, crates: 1, perCrate: 4, needPerFish: 5 }));
  assert.throws(() => makeQuestion('extra_crates', { fish: 4, crates: 6, perCrate: 12, needPerFish: 1 }));
});

test('feeding (v2.5): questions built from every possible puzzle are valid whole-number questions', () => {
  // Every fish count 1-12 and chest count 1-12 a Fish API puzzle can give, at every difficulty.
  const rng = createRng(42);
  const seen = new Set<string>();
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    for (let fish = 1; fish <= 12; fish += 1) {
      for (let chests = 1; chests <= 12; chests += 1) {
        for (let k = 0; k < 6; k += 1) {
          const q = generateQuestionFromPuzzle(rng, difficulty, fish, chests);
          seen.add(q.type);
          // The question uses the puzzle's own numbers: the fish you reserve and the chests in the picture.
          assert.equal(q.params.fish, fish);
          assert.equal(q.params.crates, chests);
          assert.ok(q.params.perCrate >= 1 && q.params.perCrate <= 12);
          assert.ok(TYPES_BY_DIFFICULTY[difficulty].includes(q.type) || q.type === 'total_food');
          const answer = correctAnswer(q);
          if (answer.kind === 'number') {
            assert.ok(Number.isInteger(answer.value) && answer.value >= 0, `${q.type} gave ${answer.value}`);
          }
          if (q.type === 'extra_crates') assert.ok(answer.kind === 'number' && answer.value >= 1);
          assert.equal(isCorrect(q, answer), true);
          assert.match(q.text, /food chest/);
        }
      }
    }
  }
  for (const type of FEEDING_TYPES) assert.ok(seen.has(type), `never generated ${type}`);
  assert.throws(() => generateQuestionFromPuzzle(rng, 'easy', 0, 3));
});

test('feeding (v2.5): your example, 7 fish and 3 chests, equal share is always a whole number', () => {
  const rng = createRng(7);
  for (let i = 0; i < 200; i += 1) {
    const q = generateQuestionFromPuzzle(rng, 'easy', 7, 3);
    if (q.type !== 'equal_share') continue;
    // 3 chests x P pellets must divide by 7 fish, so P must be 7 (the only multiple of 7 up to 12).
    assert.equal(q.params.perCrate, 7);
    assert.deepEqual(correctAnswer(q), { kind: 'number', value: 3 });
  }
});

test('feeding: answer parsing rejects bad input', () => {
  assert.deepEqual(parseFeedingAnswer('number', { value: 6 }), { kind: 'number', value: 6 });
  assert.equal(parseFeedingAnswer('number', { value: 6.5 }), null);
  assert.equal(parseFeedingAnswer('number', { value: -1 }), null);
  assert.equal(parseFeedingAnswer('boolean', { value: 'yes' }), null);
  assert.deepEqual(parseFeedingAnswer('quotient_remainder', { quotient: 3, remainder: 1 }), {
    kind: 'quotient_remainder',
    quotient: 3,
    remainder: 1,
  });
});

test('crossing outcomes follow the spec table (F=8, C=4)', () => {
  const base = { fishCount: 8, chestCount: 4, expired: false };
  assert.deepEqual(resolveCrossing({ ...base, fishAnswer: 8, chestAnswer: 4, heartsBefore: 3 }), {
    category: 'perfect', coins: 40, points: 100, heartsAfter: 3, cleared: true, failed: false,
  });
  assert.deepEqual(resolveCrossing({ ...base, fishAnswer: 8, chestAnswer: 1, heartsBefore: 2 }), {
    category: 'partial', coins: 20, points: 50, heartsAfter: 1, cleared: true, failed: false,
  });
  assert.deepEqual(resolveCrossing({ ...base, fishAnswer: 8, chestAnswer: 1, heartsBefore: 1 }), {
    category: 'partial', coins: 0, points: 0, heartsAfter: 0, cleared: false, failed: true,
  });
  assert.deepEqual(resolveCrossing({ ...base, fishAnswer: 1, chestAnswer: 1, heartsBefore: 3 }), {
    category: 'incorrect', coins: 0, points: 0, heartsAfter: 2, cleared: false, failed: false,
  });
  assert.equal(resolveCrossing({ ...base, fishAnswer: 8, chestAnswer: 4, heartsBefore: 3, expired: true }).category, 'timeout');
});

test('crossing answer parsing and region limits', () => {
  assert.deepEqual(parseCrossingAnswer({ fish: 3, chests: 2 }), { fish: 3, chests: 2 });
  assert.equal(parseCrossingAnswer({ fish: 3 }), null);
  assert.equal(parseCrossingAnswer({ fish: 2.5, chests: 1 }), null);
  const shallow = getRegion('shallow_bend');
  assert.equal(contentFitsRegion(shallow, 6, 4), true);
  assert.equal(contentFitsRegion(shallow, 6, 5), false);
  assert.equal(contentFitsRegion(getRegion('rapid_gorge'), 12, 6), true);
  assert.equal(contentFitsRegion(getRegion('rapid_gorge'), 2, 11), false);
});

test('account: register form rules match the server rules', async () => {
  const { validateRegister, validateSignIn } = await import('../src/index.ts');
  const good = { explorerName: 'Alex Morgan', email: 'alex@example.com', password: 'river1234', confirmPassword: 'river1234' };
  assert.deepEqual(validateRegister(good), {});
  const bad = validateRegister({ explorerName: 'A', email: 'not-an-email', password: 'short', confirmPassword: 'other' });
  assert.ok(bad.explorerName && bad.email && bad.password && bad.confirmPassword);
  assert.match(validateRegister({ ...good, password: 'onlyletters', confirmPassword: 'onlyletters' }).password ?? '', /letters and numbers/);
  assert.equal(validateRegister({ ...good, confirmPassword: 'river12345' }).confirmPassword, 'Passwords do not match.');
  assert.deepEqual(validateSignIn({ email: 'alex@example.com', password: 'x' }), {});
  assert.ok(validateSignIn({ email: '', password: '' }).password);
});

test('camp names follow region progress', async () => {
  const { campNameFor } = await import('../src/index.ts');
  assert.equal(campNameFor(0), 'Riverside camp');
  assert.equal(campNameFor(1), 'Shallow Bend camp');
  assert.equal(campNameFor(3), 'Rapid Gorge camp');
  assert.equal(campNameFor(9), 'Rapid Gorge camp');
});

test('objective follows the purchase order and the player stock', async () => {
  const { currentObjective, nextPurchase } = await import('../src/index.ts');
  const base = { coins: 0, ownedItems: [] as never[], regionsCleared: [] as string[], unfedAvailable: 0, unfedReserved: 0, fedAvailable: 0, hearts: 3 };
  const start = currentObjective(base);
  assert.equal(start.title, 'Buy your river map');
  assert.deepEqual(start.lines, ['Catch at least 12 fish, then feed and sell them.', 'Your first map costs 30 coins.']);
  assert.match(currentObjective({ ...base, unfedAvailable: 12 }).lines[0], /start a feeding batch/);
  assert.doesNotMatch(currentObjective({ ...base, unfedAvailable: 11 }).lines[0], /start a feeding batch/);
  assert.match(currentObjective({ ...base, fedAvailable: 4 }).lines[0], /Sell your fed fish/);
  assert.equal(currentObjective({ ...base, coins: 30 }).lines[0], 'You have enough coins.');
  assert.equal(currentObjective({ ...base, ownedItems: ['river_map'] as never[] }).title, 'Buy your compass');
  assert.equal(nextPurchase(['river_map', 'compass'], 0), 'swimming_goggles');
  const kit = ['river_map', 'compass', 'swimming_goggles', 'swimming_outfit'] as never[];
  assert.equal(currentObjective({ ...base, ownedItems: kit }).title, 'Rescue Mira');
  assert.equal(nextPurchase(kit, 1), 'life_jacket');
  assert.equal(currentObjective({ ...base, ownedItems: kit, regionsCleared: ['a', 'b', 'c', 'd'] }).title, 'Escape together');
});

test('route status and missing gear', async () => {
  const { routeStatus, missingGear } = await import('../src/index.ts');
  assert.equal(routeStatus('shallow_bend', []), 'available');
  assert.equal(routeStatus('reed_marsh', []), 'locked');
  assert.equal(routeStatus('shallow_bend', ['shallow_bend']), 'cleared');
  assert.equal(routeStatus('reed_marsh', ['shallow_bend']), 'available');
  assert.deepEqual(missingGear('shallow_bend', ['river_map', 'compass']), ['swimming_goggles', 'swimming_outfit']);
  assert.deepEqual(missingGear('reed_marsh', ['river_map', 'compass', 'swimming_goggles', 'swimming_outfit']), ['life_jacket']);
});

test('leaderboard: higher score first, then whoever finished first', () => {
  const rows = [
    { ownerId: 'a', score: 500, finishedAt: 30 },
    { ownerId: 'b', score: 900, finishedAt: 50 },
    { ownerId: 'c', score: 500, finishedAt: 10 },
  ];
  assert.deepEqual(
    rankLeaderboard(rows).map((r) => [r.rank, r.ownerId]),
    [[1, 'b'], [2, 'c'], [3, 'a']],
  );
});

test('leaderboard: one row per account (its best finished journey)', () => {
  const ranked = rankLeaderboard([
    { ownerId: 'a', score: 1500, finishedAt: 1 },
    { ownerId: 'a', score: 2100, finishedAt: 2 },
    { ownerId: 'b', score: 1800, finishedAt: 3 },
  ]);
  assert.deepEqual(ranked.map((r) => [r.ownerId, r.score]), [['a', 2100], ['b', 1800]]);
});

test('leaderboard: perfect rate is a whole percentage, or null with no answers', () => {
  assert.equal(perfectRate(0, 0), null);
  assert.equal(perfectRate(13, 15), 87);
  assert.equal(perfectRate(15, 15), 100);
});

// ---------------------------------------------------------------- weather (16 Nov 2026)

test('weather: readings are sorted into calm, rain and storm', () => {
  assert.equal(classifyWeather({ weatherCode: 0, rainMm: 0, windKmh: 8, gustKmh: 14 }), 'calm');
  assert.equal(classifyWeather({ weatherCode: 2, rainMm: 0, windKmh: 22, gustKmh: 30 }), 'rain'); // breezy
  assert.equal(classifyWeather({ weatherCode: 61, rainMm: 0.4, windKmh: 10, gustKmh: 18 }), 'rain');
  assert.equal(classifyWeather({ weatherCode: 95, rainMm: 2, windKmh: 15, gustKmh: 25 }), 'storm'); // thunder
  assert.equal(classifyWeather({ weatherCode: 3, rainMm: 0, windKmh: 30, gustKmh: 55 }), 'storm'); // strong gusts
  assert.equal(classifyWeather({ weatherCode: 65, rainMm: 9, windKmh: 12, gustKmh: 20 }), 'storm'); // heavy rain
  for (const kind of ['calm', 'rain', 'storm'] as const) assert.equal(classifyWeather(BACKUP_WEATHER[kind]), kind);
});

test('weather: every region has one real place', () => {
  for (const id of REGION_IDS) assert.equal(WEATHER_PLACES.filter((p) => p.regionId === id).length, 1);
});

test('weather: live weather is used only when it is fresh and fits the level; otherwise a labelled backup', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const calm = { weatherCode: 0, rainMm: 0, windKmh: 6, gustKmh: 10, observedAt: new Date('2026-11-16T11:45:00Z') };

  const easy = resolveRegionWeather('shallow_bend', calm, now);
  assert.equal(easy.source, 'live');
  assert.equal(easy.kind, 'calm');
  assert.equal(easy.place, 'Aswan');
  assert.equal(easy.liveNow, null);
  assert.equal(easy.timerPenaltySeconds, 0);

  // Calm at the storm place: the game uses a backup storm and says what the real place shows.
  const hard = resolveRegionWeather('rapid_gorge', calm, now);
  assert.equal(hard.source, 'backup');
  assert.equal(hard.kind, 'storm');
  assert.equal(hard.condition, 'Thunderstorm');
  assert.match(hard.liveNow ?? '', /Clear sky, wind 6 km\/h/);
  assert.equal(hard.timerPenaltySeconds, 5);

  // Too old or missing: backup, with no "live now" text.
  const old = { ...calm, observedAt: new Date(now.getTime() - WEATHER_MAX_AGE_MS - 1) };
  assert.equal(resolveRegionWeather('shallow_bend', old, now).source, 'backup');
  const none = resolveRegionWeather('reed_marsh', null, now);
  assert.equal(none.source, 'backup');
  assert.equal(none.kind, 'rain');
  assert.equal(none.observedAt, null);
});

test('weather: bad API values are rejected', () => {
  assert.equal(isValidReading({ weatherCode: 61, rainMm: 1.2, windKmh: 10, gustKmh: 20 }), true);
  assert.equal(isValidReading({ weatherCode: 61.5, rainMm: 1, windKmh: 10, gustKmh: 20 }), false);
  assert.equal(isValidReading({ weatherCode: 61, rainMm: -1, windKmh: 10, gustKmh: 20 }), false);
  assert.equal(isValidReading({ weatherCode: 61, rainMm: 1, windKmh: Number.NaN, gustKmh: 20 }), false);
  assert.equal(isValidReading({ weatherCode: 61, rainMm: 1, windKmh: 10 }), false);
});

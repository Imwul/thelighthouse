import test from "node:test";
import assert from "node:assert/strict";
import {
  makeDeck,
  takeCards,
  coin,
  rollDie,
  resolveDuty,
  lightingSuccess,
  seasonDuration,
  weatherSeasonIds,
  closingShuffleCount,
  shuffleForNight,
  createShift,
  normalizeShift,
  validateBackup,
} from "../src/game.js";
import {
  HAPPENINGS,
  MAINTENANCE_TASKS,
  OBSERVATION_CATEGORIES,
} from "../src/constants.js";

const card = (suit, value = "2") => ({
  suit,
  value,
  color: ["하트", "다이아몬드"].includes(suit) ? "적색" : "흑색",
});

test("the deck contains each standard card exactly once, and drawing does not mutate it", () => {
  const deck = makeDeck(() => 0.37);
  const original = JSON.stringify(deck);
  const result = takeCards(deck, 52);
  assert.equal(
    new Set(result.cards.map((item) => `${item.suit}:${item.value}`)).size,
    52,
  );
  assert.equal(result.deck.length, 0);
  assert.equal(result.reshuffled, false);
  assert.equal(JSON.stringify(deck), original);
  for (const suit of ["스페이드", "클럽", "하트", "다이아몬드"]) {
    assert.equal(result.cards.filter((item) => item.suit === suit).length, 13);
    assert.equal(
      result.cards.filter(
        (item) => item.suit === suit && item.color === card(suit).color,
      ).length,
      13,
    );
  }
});

test("exhaustion is disclosed only at the draw that needs a new deck", () => {
  const finalCard = card("하트", "K");
  const last = takeCards([finalCard], 1, () => 0);
  assert.deepEqual(last, { cards: [finalCard], deck: [], reshuffled: false });
  const next = takeCards(last.deck, 1, () => 0);
  assert.equal(next.cards.length, 1);
  assert.equal(next.deck.length, 51);
  assert.equal(next.reshuffled, true);
  const across = takeCards([finalCard], 53, () => 0);
  assert.deepEqual(across.cards[0], finalCard);
  assert.equal(
    new Set(across.cards.slice(1).map((item) => `${item.suit}:${item.value}`))
      .size,
    52,
  );
  assert.equal(across.deck.length, 0);
  assert.equal(across.reshuffled, true);
  assert.deepEqual(takeCards([], 0), {
    cards: [],
    deck: [],
    reshuffled: false,
  });
  assert.throws(() => takeCards([], -1), RangeError);
  assert.throws(() => takeCards([], 0.5), RangeError);
});

test("coin and die cover their bounds without impossible values", () => {
  assert.equal(
    coin(() => 0),
    "heads",
  );
  assert.equal(
    coin(() => 0.5),
    "tails",
  );
  assert.equal(
    rollDie(() => 0),
    1,
  );
  assert.equal(
    rollDie(() => 0.999999),
    6,
  );
  assert.equal(
    rollDie(() => 1),
    6,
  );
  assert.throws(() => rollDie(() => NaN), TypeError);
});

test("the wick lights only when heads and a red card occur in the same attempt", () => {
  for (const suit of ["스페이드", "클럽", "하트", "다이아몬드"]) {
    assert.equal(
      lightingSuccess("heads", card(suit)),
      ["하트", "다이아몬드"].includes(suit),
    );
    assert.equal(lightingSuccess("tails", card(suit)), false);
  }
  assert.equal(lightingSuccess("heads", undefined), false);
});

test("maintenance suits determine four different outcomes while the die selects the task", () => {
  const meanings = {
    스페이드: /예상하지 못한/,
    클럽: /유리하게 흘러가지/,
    하트: /기억/,
    다이아몬드: /유리하게 흘러갑니다/,
  };
  for (const [suit, meaning] of Object.entries(meanings)) {
    for (let die = 1; die <= 6; die += 1) {
      const duty = resolveDuty("maintenance", die, card(suit), "caretaker");
      assert.equal(
        duty.details,
        MAINTENANCE_TASKS.find((item) => item.id === die).title,
      );
      assert.match(duty.outcome, meaning);
      assert.equal(duty.die, die);
      assert.equal(duty.rulePage, 42);
      assert.equal(duty.userLog, "");
    }
  }
});

test("playbook strengths and struggles are narrative prompts, including the caretaker overlap", () => {
  const plain = resolveDuty("maintenance", 3, card("클럽"));
  const caretaker = resolveDuty("maintenance", 3, card("클럽"), "caretaker");
  assert.equal(caretaker.outcome, plain.outcome);
  assert.match(caretaker.characterEffect, /능숙한 부분과 어려운 부분/);
  assert.match(caretaker.characterEffect, /어떤 부분/);
  assert.equal(plain.characterEffect, "");
});

test("observation suits determine distance without adding dangers or invented consequences", () => {
  const distances = {
    스페이드: /아득히 먼/,
    클럽: /바로 바깥/,
    하트: /팔을 뻗으면/,
    다이아몬드: /^머리 위에 있습니다\.$/,
  };
  for (const [suit, meaning] of Object.entries(distances)) {
    const observation = resolveDuty("observation", 4, card(suit));
    assert.equal(
      observation.details,
      OBSERVATION_CATEGORIES.find((item) => item.id === 4).title,
    );
    assert.match(observation.outcome, meaning);
    assert.equal(observation.rulePage, 44);
  }
});

test("all 13 happening values resolve by rank and severity follows actual suit", () => {
  for (const value of [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ]) {
    const red = resolveDuty("happening", null, card("하트", value));
    const black = resolveDuty("happening", null, card("클럽", value));
    assert.equal(red.details, HAPPENINGS[value].title);
    assert.equal(black.details, red.details);
    assert.match(red.outcome, /^지속적인 결과/);
    assert.match(black.outcome, /^작은 결과/);
    assert.equal(red.die, null);
  }
  assert.equal(
    resolveDuty("happening", null, card("하트", "4")).autoAction,
    "relight",
  );
  assert.equal(
    resolveDuty("happening", null, card("하트", "9")).autoAction,
    "time_warp_forward",
  );
  assert.equal(
    resolveDuty("happening", null, card("하트", "K")).autoAction,
    "time_warp_backward",
  );
  assert.equal(
    resolveDuty("happening", null, card("하트", "3")).autoAction,
    null,
  );
  assert.throws(() => resolveDuty("maintenance", 7, card("클럽")), RangeError);
  assert.throws(
    () => resolveDuty("happening", null, card("클럽", "Joker")),
    TypeError,
  );
});

test("all season durations follow their printed formulas, retaining half days", () => {
  assert.equal(seasonDuration(1), 4);
  assert.equal(seasonDuration(4), 3);
  assert.equal(seasonDuration(2, [1]), 1);
  assert.equal(seasonDuration(3, 6), 6);
  assert.equal(seasonDuration(5, [2, 5]), 7);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map((die) => seasonDuration(6, [die])),
    [0.5, 1, 1.5, 2, 2.5, 3],
  );
  assert.throws(() => seasonDuration(5, [2]), RangeError);
  assert.throws(() => seasonDuration(2, [0]), RangeError);
  assert.throws(() => seasonDuration(7), RangeError);
});

test("season suggestions follow weather categories rather than visual or mood resemblance", () => {
  assert.deepEqual(weatherSeasonIds("tired"), [1]);
  assert.deepEqual(weatherSeasonIds("pained"), [2]);
  assert.deepEqual(weatherSeasonIds("happy"), [3, 5]);
  assert.deepEqual(weatherSeasonIds("excited"), [4]);
  assert.deepEqual(weatherSeasonIds("angry"), []);
  assert.deepEqual(weatherSeasonIds("relaxed"), []);
  assert.deepEqual(weatherSeasonIds("sad"), [6]);
  assert.deepEqual(weatherSeasonIds("anxious"), [5]);
  const suggestion = weatherSeasonIds("happy");
  suggestion.push(6);
  assert.deepEqual(weatherSeasonIds("happy"), [3, 5]);
});

test("closing shuffle counts follow quiet, steady, busy and wild nights", () => {
  assert.deepEqual(
    ["quiet", "steady", "busy", "crazy"].map(closingShuffleCount),
    [1, 2, 3, 4],
  );
});

test("closing actually shuffles all 52 cards once per required reflection cycle", () => {
  const orders = new Set();
  for (const [intensity, expectedCount] of [
    ["quiet", 1],
    ["steady", 2],
    ["busy", 3],
    ["crazy", 4],
  ]) {
    let randomCalls = 0;
    const result = shuffleForNight(intensity, () => {
      randomCalls += 1;
      return 0;
    });
    assert.equal(result.count, expectedCount);
    assert.equal(randomCalls, 51 * expectedCount);
    assert.equal(result.deck.length, 52);
    assert.equal(
      new Set(result.deck.map((item) => `${item.suit}:${item.value}`)).size,
      52,
    );
    assert.equal(
      result.deck.filter((item) => item.color === "적색").length,
      26,
    );
    assert.equal(
      result.deck.filter((item) => item.color === "흑색").length,
      26,
    );
    orders.add(JSON.stringify(result.deck));
    assert.deepEqual(shuffleForNight(intensity, () => 0).deck, result.deck);
  }
  assert.equal(
    orders.size,
    4,
    "the previous cycle's deck must be shuffled again rather than just reporting a higher count",
  );
  const first = shuffleForNight("quiet", () => 0);
  first.deck.pop();
  assert.equal(shuffleForNight("quiet", () => 0).deck.length, 52);
});

test("a fresh shift begins with local date and time and zero attempted lights", () => {
  const before = new Date();
  const shift = createShift();
  const after = new Date();
  const localDates = [before, after].map(
    (now) =>
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  );
  assert.ok(localDates.includes(shift.date));
  assert.match(shift.time, /^\d{2}:\d{2}$/);
  assert.equal(shift.phase, 1);
  assert.equal(shift.lightingAttempts, 0);
  assert.equal(shift.pendingDuty, null);
});

test("legacy shift migration preserves all writing, counters, custom data and pending duty", () => {
  const old = {
    phase: 3,
    date: "2021-01-02",
    time: "20:30",
    lightingAttempts: 4,
    lightingDifficulty: "비 때문에 젖은 심지",
    remarks: "수리는 내일 계속",
    duties: [
      { title: "관측", details: "동물", userLog: "작은 생명체를 보았다." },
    ],
    pendingDuty: {
      type: "maintenance",
      details: "금이 간 잔",
      userLog: "아직 수리 중",
    },
    isLampLit: true,
    isClockworkWound: true,
    shuffledCount: 2,
    personalMemo: "다음 밤에 남길 메모",
  };
  const frozenOriginal = JSON.stringify(old);
  const shifted = normalizeShift(old);
  for (const field of [
    "phase",
    "date",
    "time",
    "lightingAttempts",
    "lightingDifficulty",
    "remarks",
    "isLampLit",
    "isClockworkWound",
    "shuffledCount",
    "personalMemo",
  ]) {
    assert.equal(shifted[field], old[field]);
  }
  assert.equal(shifted.pendingDuty.userLog, "아직 수리 중");
  assert.equal(shifted.duties[0].userLog, "작은 생명체를 보았다.");
  assert.equal(JSON.stringify(old), frozenOriginal);
  assert.deepEqual(
    normalizeShift({ duties: ["잃어버려서는 안 되는 오래된 문장"] }).duties[0]
      .userLog,
    "잃어버려서는 안 되는 오래된 문장",
  );
  assert.equal(
    normalizeShift({ phase: 99, duties: null, pendingDuty: "broken" }).phase,
    1,
  );
  assert.equal(normalizeShift(null).phase, 1);
});

test("legacy journal-only backups never supply empty replacement state for other sections", () => {
  const journals = [
    {
      id: "old-1",
      date: "2021-01-02",
      keeperName: "지기",
      dutiesLog: "기록",
      remarks: "끝",
    },
  ];
  const validated = validateBackup(journals);
  assert.deepEqual(validated, { journals });
  assert.equal("keeperProfile" in validated, false);
  assert.equal("persistentInventory" in validated, false);
  assert.equal("shiftState" in validated, false);
});

test("full backup validates pending writing, half-day seasons and partially used decks", () => {
  const shift = createShift();
  shift.pendingDuty = {
    ...resolveDuty("maintenance", 3, card("하트")),
    userLog: "작업을 이어가는 중",
  };
  const backup = {
    version: 2,
    journals: [],
    keeperProfile: {
      playbookId: "caretaker",
      keeperNo: "1234",
      name: "지기",
      apparel: [],
    },
    shiftState: shift,
    persistentInventory: [{ id: "item-1", type: "기록", note: "보관 중" }],
    lightConversations: [
      {
        id: "light-1",
        question: "어디에 있나요?",
        responseType: "긍정",
        words: "가까이, 따뜻함",
      },
    ],
    seasonMarks: { 1: 3 },
    activeSeason: { id: 6, name: "때림", durationLeft: 1.5 },
    pendingSeason: [5],
    seasonEnabled: true,
    deck: makeDeck(() => 0.5).slice(9),
  };
  const validated = validateBackup(backup);
  assert.equal(validated.shiftState.pendingDuty.userLog, "작업을 이어가는 중");
  assert.equal(validated.activeSeason.durationLeft, 1.5);
  assert.equal(validated.deck.length, 43);
  assert.equal(validated.seasonMarks[1], 3);
  assert.equal(validated.seasonMarks[6], 0);
  assert.deepEqual(validateBackup({ journals: [] }), { journals: [] });
});

test("actual App v2 backups round-trip both fresh state and every in-progress tool", () => {
  const fresh = {
    version: 2,
    exportedAt: "2026-10-08T12:00:00.000Z",
    journals: [],
    keeperProfile: {
      playbookId: "self",
      name: "",
      gender: "",
      keeperNo: "1234",
      apparel: [],
    },
    shiftState: createShift(),
    persistentInventory: [],
    lightConversations: [],
    seasonMarks: {},
    activeSeason: null,
    pendingSeason: [],
    seasonEnabled: false,
    deck: makeDeck(() => 0.4),
    beachSearch: null,
    lightDraft: { question: "", response: "", interpretation: "" },
    signHistory: {},
  };
  const freshRestored = validateBackup(JSON.parse(JSON.stringify(fresh)));
  assert.deepEqual(freshRestored.pendingSeason, []);
  assert.equal(freshRestored.beachSearch, null);
  assert.deepEqual(freshRestored.lightDraft, fresh.lightDraft);
  const found = {
    id: "found-1",
    type: "오래된 지도",
    card: card("클럽", "K"),
    source: "알 수 없는 출처",
    condition: "일부가 젖음",
    coin: "tails",
    notes: "희미한 별자리",
    kept: true,
  };
  const current = {
    id: "found-2",
    type: "나침반",
    card: card("다이아몬드", "7"),
    source: "알려진 출처",
    condition: "아직 작동함",
    coin: "heads",
    notes: "북쪽은 어디일까",
  };
  const busy = {
    ...fresh,
    keeperProfile: {
      ...fresh.keeperProfile,
      playbookId: "wonderstruck",
      notes: "누군가를 찾는 중",
      nameChoice: "별에서 온 이름",
    },
    shiftState: {
      ...createShift(),
      phase: 3,
      temp: "12°C",
      winds: "낮은 휘파람",
      sights: "먼 불빛",
      seasonSigns: [3, 5],
      rewinds: 2,
      wickResult: { coin: "heads", card: card("하트", "8"), success: true },
      pendingDuty: {
        ...resolveDuty("maintenance", 4, card("하트")),
        userLog: "문장을 쓰는 중",
      },
    },
    persistentInventory: [
      { ...found, timestamp: "2026-10-08T12:00:00.000Z" },
      {
        id: "legacy-1",
        type: "유리 조각",
        card: "하트 10",
        source: "알려진 곳",
        condition: "온전함",
        note: "잊지 않을 메모",
      },
    ],
    lightConversations: [
      {
        id: "answer-1",
        question: "그곳에는 무엇이 있나요?",
        responseType: "중립",
        words: "고요함, 언젠가",
        code: "HT",
        coinCode: "앞면 + 뒷면",
        timestamp: "2026. 10. 8.",
        interpretation: "기다리라는 뜻일까",
      },
    ],
    activeSeason: {
      id: 6,
      name: "때리는 것들",
      durationLeft: 1.5,
      duration: 1.5,
      dice: [3, 2],
      startedAt: "2026-10-08",
    },
    pendingSeason: [3, 5],
    seasonEnabled: true,
    signHistory: { "2026-10-07": [1], "2026-10-08": [3, 5] },
    beachSearch: {
      total: 3,
      remaining: 2,
      found: [found],
      current,
      hour: 6,
      drawMode: "digital",
      reservedCards: [card("하트", "A")],
    },
    lightDraft: {
      question: "그곳에는 무엇이 있나요?",
      response: "answer-1",
      interpretation: "기다려야겠다",
      code: "HT",
    },
  };
  const restored = validateBackup(JSON.parse(JSON.stringify(busy)));
  assert.deepEqual(restored.pendingSeason, [3, 5]);
  assert.deepEqual(restored.signHistory, busy.signHistory);
  assert.deepEqual(restored.beachSearch, busy.beachSearch);
  assert.deepEqual(restored.lightDraft, busy.lightDraft);
  assert.deepEqual(
    restored.persistentInventory[0],
    busy.persistentInventory[0],
  );
  assert.equal(restored.persistentInventory[1].notes, "잊지 않을 메모");
  assert.deepEqual(restored.shiftState.wickResult, busy.shiftState.wickResult);
  assert.deepEqual(restored.shiftState.seasonSigns, [3, 5]);
  assert.equal(restored.activeSeason.durationLeft, 1.5);
  assert.deepEqual(
    validateBackup(JSON.parse(JSON.stringify(restored))),
    restored,
  );
});

test("reserved beach cards round-trip without being mixed with the shared deck", () => {
  const beachSearch = {
    total: 2,
    remaining: 2,
    found: [],
    current: null,
    hour: 4,
    drawMode: "digital",
    reservedCards: [card("하트", "A"), card("클럽", "K")],
  };
  const backup = {
    journals: [],
    beachSearch,
    deck: makeDeck(() => 0.4).filter(
      (item) =>
        !beachSearch.reservedCards.some(
          (reserved) =>
            reserved.suit === item.suit && reserved.value === item.value,
        ),
    ),
  };
  const restored = validateBackup(JSON.parse(JSON.stringify(backup)));
  assert.deepEqual(restored.beachSearch, beachSearch);
  assert.equal(restored.deck.length, 50);
  assert.deepEqual(
    validateBackup({
      journals: [],
      beachSearch: {
        total: 0,
        remaining: 0,
        found: [],
        current: null,
        hour: 0,
        drawMode: "physical",
        reservedCards: [],
      },
    }).beachSearch.reservedCards,
    [],
  );
  const legacy = { total: 2, remaining: 2, found: [], current: null, hour: 4 };
  assert.deepEqual(
    validateBackup({ journals: [], beachSearch: legacy }).beachSearch,
    legacy,
  );
  for (const changes of [
    { drawMode: "unknown" },
    { reservedCards: {} },
    { reservedCards: [card("하트", "A"), card("하트", "A")] },
    {
      reservedCards: [card("하트", "A"), card("클럽", "K"), card("클럽", "J")],
    },
    { reservedCards: [{ ...card("하트", "A"), color: "흑색" }] },
    { reservedCards: [{ suit: "하트", value: "Joker", color: "적색" }] },
  ]) {
    assert.throws(
      () =>
        validateBackup({
          journals: [],
          beachSearch: { ...beachSearch, ...changes },
        }),
      /기존 자료는 변경되지 않았습니다/,
    );
  }
});

test("partial valid sections receive the defaults their UI requires without changing absent sections", () => {
  const restored = validateBackup({
    journals: [],
    keeperProfile: { name: "지기" },
    lightDraft: { interpretation: "먼 존재" },
  });
  assert.deepEqual(restored.keeperProfile.apparel, []);
  assert.equal(restored.keeperProfile.name, "지기");
  assert.equal(restored.lightDraft.question, "");
  assert.equal(restored.lightDraft.interpretation, "먼 존재");
  assert.equal("beachSearch" in restored, false);
  assert.deepEqual(
    validateBackup({ journals: [], pendingSeason: { id: 5 } }).pendingSeason,
    [5],
  );
});

test("shape-invalid v2 tools and nested rendered values cannot pass import validation", () => {
  const item = {
    id: "find",
    type: "기록",
    card: card("하트"),
    source: "알려진 출처",
    condition: "",
    coin: null,
    notes: "",
  };
  const beach = { total: 1, remaining: 1, found: [], current: item, hour: 2 };
  const malformed = [
    { pendingSeason: [null] },
    { pendingSeason: ["5"] },
    { pendingSeason: [5, 5] },
    { persistentInventory: [{ ...item, notes: {} }] },
    { persistentInventory: [{ ...item, card: { value: "2" } }] },
    { persistentInventory: [{ ...item, coin: "H" }] },
    { keeperProfile: { notes: {} } },
    { keeperProfile: { nameChoice: [] } },
    { lightDraft: null },
    { lightDraft: [] },
    { lightDraft: { question: {} } },
    { lightDraft: { code: "XX" } },
    { beachSearch: {} },
    { beachSearch: { ...beach, found: "oops" } },
    { beachSearch: { ...beach, current: { ...item, type: {} } } },
    { beachSearch: { ...beach, current: { ...item, card: "하트 2" } } },
    { beachSearch: { ...beach, current: { ...item, coin: "maybe" } } },
    { beachSearch: { ...beach, current: { ...item, notes: [] } } },
    { beachSearch: { ...beach, current: { ...item, condition: {} } } },
    { beachSearch: { ...beach, remaining: 2 } },
    { beachSearch: { ...beach, total: 1000 } },
    { beachSearch: { ...beach, hour: 24 } },
    { beachSearch: { ...beach, found: [item] } },
    { beachSearch: { ...beach, total: 0, remaining: 0, hour: 0 } },
    { shiftState: { seasonSigns: {} } },
    { shiftState: { seasonSigns: [7] } },
    { shiftState: { temp: {} } },
    { shiftState: { winds: [] } },
    { shiftState: { sights: {} } },
    { shiftState: { wickResult: "broken" } },
    {
      shiftState: {
        wickResult: { coin: "heads", card: { value: "2" }, success: true },
      },
    },
    {
      shiftState: {
        wickResult: { coin: "maybe", card: card("하트"), success: true },
      },
    },
    {
      shiftState: {
        wickResult: { coin: "heads", card: card("하트"), success: "true" },
      },
    },
    { activeSeason: { id: 6 } },
    { activeSeason: { id: 6, durationLeft: 0.5, dice: [7] } },
  ];
  malformed.forEach((fields) =>
    assert.throws(
      () => validateBackup({ journals: [], ...fields }),
      /기존 자료는 변경되지 않았습니다/,
    ),
  );
});

test("local shift migration protects the newly rendered state fields and keeps writing", () => {
  const migrated = normalizeShift({
    temp: 12,
    winds: "부드러운 바람",
    sights: "먼 빛",
    seasonSigns: { invalid: true },
    wickResult: { coin: "H", card: "하트 2" },
    rewinds: 2,
    pendingDuty: {
      details: "아직 끝내지 못한 일",
      userLog: "잊으면 안 되는 문장",
    },
  });
  assert.equal(migrated.temp, "12");
  assert.equal(migrated.winds, "부드러운 바람");
  assert.equal(migrated.sights, "먼 빛");
  assert.deepEqual(migrated.seasonSigns, []);
  assert.equal(migrated.wickResult, null);
  assert.equal(migrated.rewinds, 2);
  assert.equal(migrated.pendingDuty.userLog, "잊으면 안 되는 문장");
});

test("date-based weather history round-trips and remains absent in journal-only imports", () => {
  const signHistory = { "2026-10-08": [3, 5], "2026-10-09": [6] };
  assert.deepEqual(
    validateBackup({ journals: [], signHistory }).signHistory,
    signHistory,
  );
  assert.equal("signHistory" in validateBackup([{ id: "existing" }]), false);
  for (const bad of [
    null,
    [],
    { "2026-10-08": {} },
    { "2026-10-08": [7] },
    { "2026-10-08": ["5"] },
    { "2026-10-08": [5, 5] },
    { "": [1] },
  ]) {
    assert.throws(
      () => validateBackup({ journals: [], signHistory: bad }),
      /기존 자료는 변경되지 않았습니다/,
    );
  }
});

test("startup section validation rejects malformed local shapes while accepting blank identified journals", () => {
  const sections = [
    ["journals", [{}]],
    ["journals", [{ unknown: "not a journal" }]],
    ["keeperProfile", { notes: {} }],
    ["keeperProfile", { nameChoice: {} }],
    ["keeperProfile", { name: [] }],
    ["keeperProfile", { apparel: [{}] }],
    ["persistentInventory", [{ type: {} }]],
    ["persistentInventory", { invalid: true }],
    ["lightConversations", [{ question: {} }]],
    ["lightConversations", null],
    ["lightDraft", null],
    ["lightDraft", { question: [] }],
    ["beachSearch", { found: "broken" }],
    ["seasonMarks", []],
    ["signHistory", { "2026-10-08": { broken: true } }],
  ];
  for (const [section, value] of sections) {
    assert.throws(
      () => validateBackup({ journals: [], [section]: value }),
      /기존 자료는 변경되지 않았습니다/,
    );
  }
  assert.deepEqual(validateBackup([{ id: "existing" }]).journals, [
    { id: "existing" },
  ]);
  assert.deepEqual(
    validateBackup([{ id: "blank-night", remarks: "" }]).journals,
    [{ id: "blank-night", remarks: "" }],
  );
  assert.deepEqual(
    validateBackup([{ remarks: "이름 없는 오래된 일지" }]).journals,
    [{ remarks: "이름 없는 오래된 일지" }],
  );
});

test("malformed imports are rejected before any state replacement", () => {
  const malformed = [
    null,
    {},
    { journals: "text" },
    [null],
    ["not a journal"],
    { journals: [{ date: {} }] },
    { journals: [{ dutiesRaw: [{ userLog: [] }] }] },
    { journals: [], keeperProfile: { apparel: [2] } },
    { journals: [], shiftState: { duties: [null] } },
    { journals: [], shiftState: { pendingDuty: { userLog: {} } } },
    { journals: [], persistentInventory: [{ type: {} }] },
    { journals: [], lightConversations: [{ words: [] }] },
    { journals: [], seasonMarks: { 1: -1 } },
    { journals: [], seasonMarks: { 1: 6 } },
    { journals: [], activeSeason: { id: 99, durationLeft: 1 } },
    { journals: [], activeSeason: { id: 6, durationLeft: -0.5 } },
    { journals: [], seasonEnabled: "true" },
    { journals: [], deck: [card("하트"), card("하트")] },
    { journals: [], deck: [{ suit: "하트", value: "2", color: "흑색" }] },
    JSON.parse('{"journals":[],"__proto__":{"polluted":true}}'),
  ];
  malformed.forEach((value) =>
    assert.throws(
      () => validateBackup(value),
      /기존 자료는 변경되지 않았습니다/,
    ),
  );
});

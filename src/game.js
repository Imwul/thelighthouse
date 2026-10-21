import {
  HAPPENINGS,
  MAINTENANCE_TASKS,
  OBSERVATION_CATEGORIES,
  PLAYBOOKS,
  SEASONS,
} from "./constants.js";

const SUITS = ["스페이드", "클럽", "하트", "다이아몬드"];
const VALUES = [
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
];
const redSuit = (suit) => suit === "하트" || suit === "다이아몬드";
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isStandardCard = (card) =>
  isObject(card) &&
  SUITS.includes(card.suit) &&
  VALUES.includes(card.value) &&
  card.color === (redSuit(card.suit) ? "적색" : "흑색");
const isCoin = (value) => value === "heads" || value === "tails";
const isSeasonId = (id) => SEASONS.some((season) => season.id === id);
const sample = (random) => {
  const result = Number(random());
  if (!Number.isFinite(result))
    throw new TypeError("무작위 값은 유한한 수여야 합니다.");
  return Math.max(0, Math.min(1 - Number.EPSILON, result));
};

const fullDeck = () =>
  SUITS.flatMap((suit) =>
    VALUES.map((value) => ({
      value,
      suit,
      color: redSuit(suit) ? "적색" : "흑색",
    })),
  );
function shuffled(deck, random) {
  const result = [...deck];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(sample(random) * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** A physical 52-card deck, shuffled with Fisher–Yates rather than replacement draws. */
export function makeDeck(random = Math.random) {
  return shuffled(fullDeck(), random);
}

/** Refill only when the next requested draw encounters an empty deck. */
export function takeCards(deck, count, random = Math.random) {
  if (!Array.isArray(deck)) throw new TypeError("카드 묶음이 필요합니다.");
  if (!Number.isSafeInteger(count) || count < 0)
    throw new RangeError("카드 수는 0 이상의 정수여야 합니다.");
  let remaining = [...deck];
  const cards = [];
  let reshuffled = false;
  for (let index = 0; index < count; index += 1) {
    if (remaining.length === 0) {
      remaining = makeDeck(random);
      reshuffled = true;
    }
    cards.push(remaining.shift());
  }
  return { cards, deck: remaining, reshuffled };
}

export const coin = (random = Math.random) =>
  sample(random) < 0.5 ? "heads" : "tails";
export const rollDie = (random = Math.random) =>
  Math.floor(sample(random) * 6) + 1;

export function lightingSuccess(coinResult, card) {
  return coinResult === "heads" && card?.color === "적색";
}

const maintenanceOutcomes = {
  스페이드: "작업을 마치면 예상하지 못한 일이 일어납니다.",
  클럽: "상황이 당신에게 유리하게 흘러가지 않습니다.",
  하트: "작업하는 동안 어떤 기억이 떠오릅니다.",
  다이아몬드: "상황이 당신에게 유리하게 흘러갑니다.",
};
const observationDistances = {
  스페이드: "아득히 먼 점, 빛의 섬광, 별들 사이의 흐릿한 얼룩으로 보입니다.",
  클럽: "안전한 거리, 등대의 빛이 닿는 범위 바로 바깥에 있습니다.",
  하트: "섬에서 팔을 뻗으면 닿을 만큼 가까이에 있습니다.",
  다이아몬드: "머리 위에 있습니다.",
};

function characterPrompt(playbook, die) {
  const selected =
    typeof playbook === "string"
      ? PLAYBOOKS.find((item) => item.id === playbook)
      : playbook;
  if (!selected) return "";
  const excels = selected.excelTaskIds?.includes(die);
  const struggles = selected.struggleTaskIds?.includes(die);
  if (excels && struggles)
    return `${selected.nameKo}에게 이 일은 능숙한 부분과 어려운 부분이 함께 있습니다. 어떤 부분에 자신이 있고, 어떤 부분에서 어려움을 느끼나요?`;
  if (excels)
    return `${selected.nameKo}가 능숙한 일입니다. 이번 결과에 어떻게 반응하나요?`;
  if (struggles)
    return `${selected.nameKo}가 어려워하는 일입니다. 이번 결과에 어떻게 반응하나요?`;
  return "";
}

/** Printed pp. 42–47. Playbooks change interpretation; they never change a roll. */
export function resolveDuty(type, die, card, playbook) {
  if (
    !card ||
    !SUITS.includes(card.suit) ||
    !VALUES.includes(String(card.value))
  ) {
    throw new TypeError("올바른 표준 카드가 필요합니다.");
  }
  const value = String(card.value);
  const color = redSuit(card.suit) ? "적색" : "흑색";
  const result = {
    type,
    title: "",
    details: "",
    description: "",
    examples: "",
    questions: "",
    outcome: "",
    characterEffect: "",
    cardDrawn: `${card.suit} ${value}`,
    cardColor: color,
    cardValue: value,
    die: null,
    rulePage: null,
    autoAction: null,
    userLog: "",
  };
  if (type === "happening") {
    const event = HAPPENINGS[value];
    const severity =
      color === "적색"
        ? "지속적인 결과: 등대나 섬의 손상, 지기에게 남는 정신적·신체적 영향, 다른 존재의 피해 등."
        : "작은 결과: 잠깐의 방해나 사소한 불편 등.";
    return {
      ...result,
      title: "사건",
      details: event.title,
      description: event.description,
      examples: event.examples,
      questions: event.questions || "",
      outcome: severity,
      severity,
      rulePage: 46,
      autoAction:
        value === "4"
          ? "relight"
          : value === "9"
            ? "time_warp_forward"
            : value === "K"
              ? "time_warp_backward"
              : null,
    };
  }
  if (!Number.isInteger(die) || die < 1 || die > 6)
    throw new RangeError("주사위 눈은 1부터 6까지입니다.");
  if (type === "maintenance") {
    const task = MAINTENANCE_TASKS.find((item) => item.id === die);
    return {
      ...result,
      die,
      title: "유지보수",
      details: task.title,
      description: task.description,
      examples: task.examples,
      questions:
        "어떻게 작업했나요? 결과는 무엇이며 등대는 어떻게 달라졌나요? 어디에서 작업했고, 어려움이 있었다면 그 이유는 무엇인가요?",
      outcome: maintenanceOutcomes[card.suit],
      characterEffect: characterPrompt(playbook, die),
      rulePage: 42,
    };
  }
  if (type === "observation") {
    const observation = OBSERVATION_CATEGORIES.find((item) => item.id === die);
    return {
      ...result,
      die,
      title: "관측",
      details: observation.title,
      description: observation.description,
      examples: observation.examples,
      questions: observation.questions || "",
      outcome: observationDistances[card.suit],
      rulePage: 44,
    };
  }
  throw new TypeError("알 수 없는 밤의 임무입니다.");
}

/** Printed p. 67 says to halve the die; it does not prescribe rounding. */
export function seasonDuration(id, dice = []) {
  const seasonId = Number(id);
  if (seasonId === 1) return 4;
  if (seasonId === 4) return 3;
  if (![2, 3, 5, 6].includes(seasonId))
    throw new RangeError("계절 번호는 1부터 6까지입니다.");
  const rolls = Array.isArray(dice) ? dice : [dice];
  const count = seasonId === 5 ? 2 : 1;
  if (
    rolls.length < count ||
    rolls
      .slice(0, count)
      .some((value) => !Number.isInteger(value) || value < 1 || value > 6)
  ) {
    throw new RangeError(
      `이 계절에는 ${count}개의 6면체 주사위 결과가 필요합니다.`,
    );
  }
  if (seasonId === 5) return rolls[0] + rolls[1];
  if (seasonId === 6) return rolls[0] / 2;
  return rolls[0];
}

/** Suggested matches, never an automatic weather mark or mandatory task. */
export function weatherSeasonIds(mood) {
  const matches = {
    tired: [1],
    pained: [2],
    happy: [3, 5],
    excited: [4],
    angry: [],
    relaxed: [],
    sad: [6],
    anxious: [5],
  };
  return [...(matches[mood] || [])];
}

export function closingShuffleCount(intensity) {
  return { quiet: 1, steady: 2, busy: 3, crazy: 4 }[intensity] || 1;
}

/** Recombine all 52 cards and actually perform the specified number of shuffles (p. 49). */
export function shuffleForNight(intensity, random = Math.random) {
  const count = closingShuffleCount(intensity);
  let deck = fullDeck();
  for (let cycle = 0; cycle < count; cycle += 1) deck = shuffled(deck, random);
  return { deck, count };
}

export function createShift() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return {
    phase: 1,
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    moodId: "",
    weatherTitle: "",
    weatherDesc: "",
    initialObservations: "",
    weatherNotes: "",
    temp: "",
    winds: "",
    sights: "",
    lightingAttempts: 0,
    lightingDifficulty: "",
    isLampLit: false,
    isClockworkWound: false,
    duties: [],
    pendingDuty: null,
    remarks: "",
    lightQuestionAsked: false,
    endingIntensity: "steady",
    shuffledCount: 0,
    seasonSigns: [],
    wickResult: null,
    rewinds: 0,
    lightResponseId: "",
  };
}

const asText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};
const DUTY_TEXT_FIELDS = [
  "type",
  "title",
  "details",
  "description",
  "examples",
  "questions",
  "outcome",
  "characterEffect",
  "cardDrawn",
  "cardColor",
  "cardValue",
  "userLog",
  "severity",
];
const SHIFT_TEXT_FIELDS = [
  "date",
  "time",
  "moodId",
  "weatherTitle",
  "weatherDesc",
  "initialObservations",
  "weatherNotes",
  "temp",
  "winds",
  "sights",
  "lightingDifficulty",
  "remarks",
  "endingIntensity",
  "lightResponseId",
];
function normalizeDuty(duty) {
  if (!isObject(duty))
    return { title: "기존 기록", details: "기록", userLog: asText(duty) };
  const normalized = { ...duty };
  DUTY_TEXT_FIELDS.forEach((field) => {
    if (field in duty) normalized[field] = asText(duty[field]);
  });
  normalized.userLog = asText(duty.userLog);
  normalized.details = asText(duty.details || duty.title);
  return normalized;
}

/** Fill new fields without losing an existing keeper's writing or progress. */
export function normalizeShift(existing) {
  const defaults = createShift();
  if (!isObject(existing)) return defaults;
  const normalized = { ...defaults, ...existing };
  SHIFT_TEXT_FIELDS.forEach((field) => {
    normalized[field] = asText(normalized[field]);
  });
  normalized.date ||= defaults.date;
  normalized.time ||= defaults.time;
  const phase = Number(existing.phase);
  normalized.phase =
    Number.isInteger(phase) && phase >= 1 && phase <= 4 ? phase : 1;
  for (const field of ["lightingAttempts", "shuffledCount", "rewinds"]) {
    normalized[field] = Number.isFinite(Number(normalized[field]))
      ? Math.max(0, Math.trunc(Number(normalized[field])))
      : defaults[field];
  }
  for (const field of ["isLampLit", "isClockworkWound", "lightQuestionAsked"]) {
    normalized[field] =
      normalized[field] === true || normalized[field] === "true";
  }
  normalized.duties = Array.isArray(existing.duties)
    ? existing.duties.map(normalizeDuty)
    : [];
  normalized.pendingDuty = isObject(existing.pendingDuty)
    ? normalizeDuty(existing.pendingDuty)
    : null;
  normalized.seasonSigns = Array.isArray(existing.seasonSigns)
    ? [...new Set(existing.seasonSigns.filter(isSeasonId))]
    : [];
  const wick = existing.wickResult;
  normalized.wickResult =
    isObject(wick) &&
    isCoin(wick.coin) &&
    isStandardCard(wick.card) &&
    typeof wick.success === "boolean"
      ? { ...wick, card: { ...wick.card } }
      : null;
  return normalized;
}

function backupError(section) {
  throw new TypeError(
    `백업의 ${section} 형식이 올바르지 않습니다. 기존 자료는 변경되지 않았습니다.`,
  );
}
function checkStrings(object, fields, section) {
  fields.forEach((field) => {
    if (object[field] !== undefined && typeof object[field] !== "string")
      backupError(`${section}.${field}`);
  });
}
function checkId(value, section) {
  if (
    value !== undefined &&
    typeof value !== "string" &&
    (typeof value !== "number" || !Number.isFinite(value))
  )
    backupError(section);
}
function checkCard(card, section, allowLegacyText = false) {
  if (allowLegacyText && typeof card === "string") return;
  if (!isStandardCard(card)) backupError(section);
}
function checkSeasonIds(ids, section) {
  if (
    !Array.isArray(ids) ||
    ids.some((id) => !isSeasonId(id)) ||
    new Set(ids).size !== ids.length
  )
    backupError(section);
}
function checkDuty(duty, section) {
  if (!isObject(duty)) backupError(section);
  checkStrings(duty, DUTY_TEXT_FIELDS, section);
  checkStrings(duty, ["recordedAt"], section);
  checkId(duty.id, `${section}.id`);
  if (
    duty.autoAction !== undefined &&
    duty.autoAction !== null &&
    typeof duty.autoAction !== "string"
  )
    backupError(section);
  for (const field of ["die", "rulePage"]) {
    if (
      duty[field] !== undefined &&
      duty[field] !== null &&
      !Number.isFinite(duty[field])
    )
      backupError(section);
  }
}
function checkObjects(array, section, inspect) {
  if (!Array.isArray(array)) backupError(section);
  array.forEach((item, index) => {
    if (!isObject(item)) backupError(`${section}[${index}]`);
    inspect(item, `${section}[${index}]`);
  });
}
function checkSeason(season, section) {
  if (season === null) return;
  if (
    !isObject(season) ||
    !SEASONS.some((item) => item.id === Number(season.id))
  )
    backupError(section);
  checkStrings(
    season,
    ["name", "nameKo", "description", "warning", "characteristics", "effects"],
    section,
  );
  // A copied rulebook entry may retain its descriptive duration text.
  if (
    season.duration !== undefined &&
    typeof season.duration !== "string" &&
    (typeof season.duration !== "number" ||
      !Number.isFinite(season.duration) ||
      season.duration < 0)
  )
    backupError(`${section}.duration`);
  for (const field of ["durationLeft", "totalDuration"]) {
    if (
      season[field] !== undefined &&
      (typeof season[field] !== "number" ||
        !Number.isFinite(season[field]) ||
        season[field] < 0)
    )
      backupError(`${section}.${field}`);
  }
  checkStrings(season, ["startedAt"], section);
  if (
    season.dice !== undefined &&
    (!Array.isArray(season.dice) ||
      season.dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6))
  )
    backupError(`${section}.dice`);
}
function checkItem(item, section, legacyCard = true) {
  if (!isObject(item)) backupError(section);
  checkId(item.id, `${section}.id`);
  checkStrings(
    item,
    ["type", "source", "condition", "timestamp", "note", "notes"],
    section,
  );
  if (item.card !== undefined)
    checkCard(item.card, `${section}.card`, legacyCard);
  if (item.coin !== undefined && item.coin !== null && !isCoin(item.coin))
    backupError(`${section}.coin`);
  if (item.kept !== undefined && typeof item.kept !== "boolean")
    backupError(`${section}.kept`);
}
function normalizeItem(item) {
  return {
    ...item,
    type: item.type || "",
    source: item.source || "",
    condition: item.condition || "",
    notes: item.notes ?? item.note ?? "",
  };
}
// Older exports omitted IDs; duplicate IDs also make edits/deletes affect several records.
function identifyRecords(records, prefix) {
  const reserved = new Set(records.map((entry) => String(entry.id ?? "")));
  const used = new Set();
  return records.map((entry, index) => {
    let id = String(entry.id ?? "");
    if (!id.trim() || used.has(id)) {
      let suffix = index + 1;
      do id = `${prefix}-${suffix++}`;
      while (reserved.has(id) || used.has(id));
    }
    used.add(id);
    return { ...entry, id };
  });
}
function checkBeach(search) {
  if (search === null) return;
  if (!isObject(search)) backupError("beachSearch");
  for (const field of ["total", "remaining", "hour"]) {
    if (!Number.isInteger(search[field]) || search[field] < 0)
      backupError(`beachSearch.${field}`);
  }
  if (
    search.hour > 23 ||
    search.total > 12 ||
    search.remaining > search.total ||
    search.total !== Math.ceil(search.hour / 2)
  )
    backupError("beachSearch의 수색 수");
  checkObjects(search.found, "beachSearch.found", (item, section) =>
    checkItem(item, section, false),
  );
  if (search.found.length !== search.total - search.remaining)
    backupError("beachSearch.found의 수");
  if (search.current !== null) {
    checkItem(search.current, "beachSearch.current", false);
    if (!search.remaining || search.current.card === undefined)
      backupError("beachSearch.current");
  }
  if (
    search.drawMode !== undefined &&
    !["digital", "physical"].includes(search.drawMode)
  )
    backupError("beachSearch.drawMode");
  if (search.reservedCards !== undefined) {
    if (
      !Array.isArray(search.reservedCards) ||
      search.reservedCards.length > search.remaining
    )
      backupError("beachSearch.reservedCards");
    const seen = new Set();
    search.reservedCards.forEach((card) => {
      checkCard(card, "beachSearch.reservedCards");
      const key = `${card.suit}:${card.value}`;
      if (seen.has(key)) backupError("beachSearch.reservedCards의 중복 카드");
      seen.add(key);
    });
  }
}
function checkSafeKeys(value) {
  if (value === null || typeof value !== "object") return;
  Object.entries(value).forEach(([key, child]) => {
    if (["__proto__", "constructor", "prototype"].includes(key))
      backupError("데이터 키");
    checkSafeKeys(child);
  });
}

/** Accept old journal-only exports and complete v2 exports; missing sections stay absent. */
export function validateBackup(data) {
  checkSafeKeys(data);
  const backup = Array.isArray(data) ? { journals: data } : data;
  if (!isObject(backup) || !Array.isArray(backup.journals))
    backupError("일지 목록");
  checkObjects(backup.journals, "journals", (journal, section) => {
    checkId(journal.id, `${section}.id`);
    const writtenFields = [
      "date",
      "time",
      "keeperName",
      "weather",
      "dutiesLog",
      "remarks",
      "initialObservations",
    ];
    const hasWriting = writtenFields.some(
      (field) => typeof journal[field] === "string" && journal[field].trim(),
    );
    if (
      journal.id === undefined &&
      !hasWriting &&
      !(Array.isArray(journal.dutiesRaw) && journal.dutiesRaw.length)
    )
      backupError(section);
    checkStrings(
      journal,
      [
        "date",
        "time",
        "keeperNo",
        "keeperName",
        "playbookName",
        "weather",
        "weatherDesc",
        "temp",
        "winds",
        "sights",
        "dutiesLog",
        "remarks",
        "seasonEffect",
        "initialObservations",
        "weatherNotes",
        "lightingDifficulty",
        "endingIntensity",
      ],
      section,
    );
    if (journal.dutiesRaw !== undefined)
      checkObjects(journal.dutiesRaw, `${section}.dutiesRaw`, checkDuty);
    if (
      journal.lampLitAttempts !== undefined &&
      (!Number.isFinite(journal.lampLitAttempts) || journal.lampLitAttempts < 0)
    )
      backupError(`${section}.lampLitAttempts`);
  });
  const validated = {
    ...backup,
    journals: identifyRecords(backup.journals, "journal"),
  };
  if (backup.keeperProfile !== undefined) {
    if (!isObject(backup.keeperProfile)) backupError("keeperProfile");
    checkStrings(
      backup.keeperProfile,
      [
        "playbookId",
        "name",
        "nameChoice",
        "gender",
        "hateFact",
        "careItem",
        "reminder",
        "ownSecret",
        "ritual",
        "proudWord",
        "hideWord",
        "hopeWord",
        "misconceptionWord",
        "keeperNo",
        "notes",
      ],
      "keeperProfile",
    );
    if (
      backup.keeperProfile.apparel !== undefined &&
      (!Array.isArray(backup.keeperProfile.apparel) ||
        backup.keeperProfile.apparel.some((item) => typeof item !== "string"))
    )
      backupError("keeperProfile.apparel");
    validated.keeperProfile = {
      playbookId: "self",
      name: "",
      gender: "",
      keeperNo: "",
      apparel: [],
      ...backup.keeperProfile,
    };
  }
  if (backup.shiftState !== undefined) {
    const shift = backup.shiftState;
    if (!isObject(shift)) backupError("shiftState");
    checkStrings(shift, SHIFT_TEXT_FIELDS, "shiftState");
    if (
      shift.phase !== undefined &&
      (!Number.isInteger(shift.phase) || shift.phase < 1 || shift.phase > 4)
    )
      backupError("shiftState.phase");
    for (const field of ["lightingAttempts", "shuffledCount", "rewinds"]) {
      if (
        shift[field] !== undefined &&
        (!Number.isSafeInteger(shift[field]) || shift[field] < 0)
      )
        backupError(`shiftState.${field}`);
    }
    for (const field of [
      "isLampLit",
      "isClockworkWound",
      "lightQuestionAsked",
    ]) {
      if (shift[field] !== undefined && typeof shift[field] !== "boolean")
        backupError(`shiftState.${field}`);
    }
    if (shift.duties !== undefined)
      checkObjects(shift.duties, "shiftState.duties", checkDuty);
    if (shift.pendingDuty !== undefined && shift.pendingDuty !== null)
      checkDuty(shift.pendingDuty, "shiftState.pendingDuty");
    if (shift.seasonSigns !== undefined)
      checkSeasonIds(shift.seasonSigns, "shiftState.seasonSigns");
    if (shift.wickResult !== undefined && shift.wickResult !== null) {
      if (
        !isObject(shift.wickResult) ||
        !isCoin(shift.wickResult.coin) ||
        typeof shift.wickResult.success !== "boolean"
      )
        backupError("shiftState.wickResult");
      checkCard(shift.wickResult.card, "shiftState.wickResult.card");
    }
    validated.shiftState = normalizeShift(shift);
  }
  if (backup.persistentInventory !== undefined) {
    checkObjects(backup.persistentInventory, "persistentInventory", checkItem);
    validated.persistentInventory = identifyRecords(
      backup.persistentInventory.map(normalizeItem),
      "item",
    );
  }
  if (backup.lightConversations !== undefined) {
    checkObjects(
      backup.lightConversations,
      "lightConversations",
      (item, section) => {
        checkStrings(
          item,
          [
            "timestamp",
            "question",
            "coinCode",
            "responseType",
            "words",
            "interpretation",
            "code",
          ],
          section,
        );
        if (
          item.code !== undefined &&
          !["HH", "HT", "TH", "TT"].includes(item.code)
        )
          backupError(`${section}.code`);
        checkId(item.id, `${section}.id`);
      },
    );
    validated.lightConversations = identifyRecords(
      backup.lightConversations,
      "conversation",
    );
  }
  if (backup.seasonMarks !== undefined) {
    if (!isObject(backup.seasonMarks)) backupError("seasonMarks");
    for (const [id, count] of Object.entries(backup.seasonMarks)) {
      const season = SEASONS.find((item) => item.id === Number(id));
      if (
        !season ||
        !Number.isInteger(count) ||
        count < 0 ||
        count > season.circles
      )
        backupError(`seasonMarks.${id}`);
    }
    validated.seasonMarks = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      ...backup.seasonMarks,
    };
  }
  if (backup.signHistory !== undefined) {
    if (!isObject(backup.signHistory)) backupError("signHistory");
    for (const [date, ids] of Object.entries(backup.signHistory)) {
      if (!date.trim()) backupError("signHistory의 날짜");
      checkSeasonIds(ids, `signHistory.${date}`);
    }
  }
  if (backup.activeSeason !== undefined) {
    checkSeason(backup.activeSeason, "activeSeason");
    if (backup.activeSeason !== null) {
      if (
        !Number.isFinite(backup.activeSeason.durationLeft) ||
        backup.activeSeason.durationLeft <= 0
      )
        backupError("activeSeason.durationLeft");
      validated.activeSeason = {
        ...backup.activeSeason,
        id: Number(backup.activeSeason.id),
      };
    }
  }
  if (backup.pendingSeason !== undefined) {
    const pending = backup.pendingSeason;
    if (pending === null) validated.pendingSeason = [];
    else if (isObject(pending)) {
      checkSeason(pending, "pendingSeason");
      validated.pendingSeason = [Number(pending.id)];
    } else {
      checkSeasonIds(pending, "pendingSeason");
    }
  }
  if (
    backup.seasonEnabled !== undefined &&
    typeof backup.seasonEnabled !== "boolean"
  )
    backupError("seasonEnabled");
  if (backup.deck !== undefined) {
    if (!Array.isArray(backup.deck) || backup.deck.length > 52)
      backupError("deck");
    const seen = new Set();
    backup.deck.forEach((card) => {
      checkCard(card, "deck");
      const key = `${card.suit}:${card.value}`;
      if (seen.has(key)) backupError("deck의 중복 카드");
      seen.add(key);
    });
  }
  if (backup.beachSearch !== undefined) {
    checkBeach(backup.beachSearch);
    if (backup.beachSearch !== null)
      validated.beachSearch = {
        ...backup.beachSearch,
        found: backup.beachSearch.found.map(normalizeItem),
        current:
          backup.beachSearch.current === null
            ? null
            : { coin: null, ...normalizeItem(backup.beachSearch.current) },
      };
  }
  if (backup.lightDraft !== undefined) {
    if (!isObject(backup.lightDraft)) backupError("lightDraft");
    checkStrings(
      backup.lightDraft,
      ["question", "response", "interpretation", "code"],
      "lightDraft",
    );
    if (
      backup.lightDraft.code !== undefined &&
      !["HH", "HT", "TH", "TT"].includes(backup.lightDraft.code)
    )
      backupError("lightDraft.code");
    validated.lightDraft = {
      question: "",
      response: "",
      interpretation: "",
      ...backup.lightDraft,
    };
  }
  return validated;
}

import { useEffect, useRef, useState, useId, cloneElement } from "react";
import {
  BookOpen,
  Moon,
  Sun,
  NotebookPen,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Settings,
  Compass,
  Wrench,
  Sparkles,
  Package,
  Cloud,
  Download,
  Upload,
  Search,
  Waves,
  Radio,
  ChevronRight,
  Trash2,
} from "lucide-react";
import {
  PLAYBOOKS,
  WEATHER_PATTERNS,
  MAINTENANCE_TASKS,
  OBSERVATION_CATEGORIES,
  HAPPENINGS,
  BEACHCOMBING_ITEMS,
  LIGHT_IN_THE_DARK,
  SEASONS,
  PAST_KEEPERS_LOGS,
  GLOSSARY,
} from "./constants";
import {
  makeDeck,
  takeCards,
  coin,
  rollDie,
  resolveDuty,
  lightingSuccess,
  seasonDuration,
  closingShuffleCount,
  shuffleForNight,
  createShift,
  normalizeShift,
  validateBackup,
} from "./game";

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
const SYMBOLS = { 스페이드: "♠", 클럽: "♣", 하트: "♥", 다이아몬드: "♦" };
const DUTIES = [
  {
    id: "observation",
    title: "관측",
    sub: "주변·우주 관측",
    icon: Compass,
    page: "44–45",
  },
  {
    id: "maintenance",
    title: "정비",
    sub: "신체·시설·등대 정비",
    icon: Wrench,
    page: "42–43",
  },
  {
    id: "happening",
    title: "사건",
    sub: "사건과 결과 기록",
    icon: Sparkles,
    page: "46–47",
  },
];
const INTENSITIES = {
  quiet: "고요하고 평온한 밤",
  steady: "꾸준한 밤",
  busy: "바쁜 밤",
  crazy: "거칠고 두려운 밤",
};
const freshProfile = () => ({
  playbookId: "self",
  name: "",
  gender: "",
  keeperNo: String(Math.floor(1000 + Math.random() * 9000)),
  apparel: [],
});
const safeRead = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback();
  } catch {
    return fallback();
  }
};
function useSaved(key, fallback, normalize = (value) => value) {
  const [value, setValue] = useState(() => {
    const original = safeRead(key, fallback);
    try {
      const normalized = normalize(original);
      if (
        JSON.stringify(original) !== JSON.stringify(normalized) &&
        !localStorage.getItem(`${key}_original_backup`)
      )
        localStorage.setItem(
          `${key}_original_backup`,
          JSON.stringify(original),
        );
      return normalized;
    } catch {
      try {
        localStorage.setItem(
          `${key}_unreadable_backup`,
          JSON.stringify(original),
        );
      } catch {
        /* The original key remains intact until a successful save. */
      }
      return fallback();
    }
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          JSON.parse(raw);
        } catch {
          localStorage.setItem(`${key}_unreadable_backup`, raw);
        }
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent("lighthouse-storage-error")),
      );
    }
  }, [key, value]);
  return [value, setValue];
}
const list = (value) => (Array.isArray(value) ? value : []);
const localSection = (section, value) =>
  validateBackup({ journals: [], [section]: value })[section];
const normalizedKeeper = (value) => ({
  ...freshProfile(),
  ...localSection("keeperProfile", value),
  apparel: list(value?.apparel),
});
const cardFrom = (value, suit) => ({
  value,
  suit,
  color: ["하트", "다이아몬드"].includes(suit) ? "적색" : "흑색",
});
const uid = () => crypto.randomUUID();
function Lighthouse({ small = false }) {
  return (
    <svg
      className={small ? "lighthouse-logo" : "lighthouse-art"}
      viewBox="0 0 160 190"
      fill="none"
      aria-hidden="true"
    >
      <path d="M80 25 145 50M80 25 15 50" stroke="currentColor" opacity=".25" />
      <path d="M72 55 60 162h40L88 55Z" fill="currentColor" opacity=".12" />
      <path
        d="M72 55 60 162h40L88 55M64 127h32M68 91h24M56 162h48M52 172h56"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M65 51h30V30H65Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="m61 30 19-14 19 14M59 55h42M80 34v13"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="80" cy="41" r="4" fill="currentColor" />
      <path d="M15 179h130M27 185h106" stroke="currentColor" opacity=".25" />
      <circle cx="129" cy="91" r="1.5" fill="currentColor" />
      <path d="M25 76v8m-4-4h8" stroke="currentColor" opacity=".5" />
    </svg>
  );
}
function ObservatoryScene({ lit }) {
  const id = useId();
  return (
    <svg
      className={`observatory-scene ${lit ? "is-lit" : ""}`}
      viewBox="0 0 560 260"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-tower`}
          x1="322"
          y1="120"
          x2="403"
          y2="210"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#edf4fc" />
          <stop offset=".48" stopColor="#c3d2e8" />
          <stop offset="1" stopColor="#607dab" />
        </linearGradient>
        <linearGradient
          id={`${id}-beam-left`}
          x1="352"
          y1="83"
          x2="0"
          y2="83"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d9dff8" stopOpacity=".32" />
          <stop offset="1" stopColor="#bac9ed" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-beam-right`}
          x1="370"
          y1="83"
          x2="560"
          y2="83"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d9dff8" stopOpacity=".32" />
          <stop offset="1" stopColor="#bac9ed" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-haze`}>
          <stop stopColor="#b4c7e8" stopOpacity=".2" />
          <stop offset="1" stopColor="#b4c7e8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="scene-beams">
        <path d="M353 78 0 10V166L353 91Z" fill={`url(#${id}-beam-left)`} />
        <path d="M371 78 560 27V151L371 91Z" fill={`url(#${id}-beam-right)`} />
      </g>
      <ellipse cx="363" cy="237" rx="108" ry="22" fill={`url(#${id}-haze)`} />
      <g stroke="#cfddf3" strokeWidth=".75" opacity=".32">
        <path d="M54 50V28H86M504 210h26v-22M48 44V22h32M510 216h26v-22" />
        <ellipse cx="363" cy="242" rx="158" ry="14" strokeDasharray="2 9" />
      </g>
      <g fill="#e6edf9">
        <circle cx="102" cy="72" r="1.3" />
        <circle cx="196" cy="37" r="1" />
        <circle cx="249" cy="178" r="1.5" />
        <circle cx="491" cy="146" r="1" />
        <circle cx="531" cy="72" r="1.5" />
        <circle cx="76" cy="209" r="1" />
        <circle cx="420" cy="32" r=".8" />
        <circle cx="456" cy="207" r="1.1" />
        <path d="m151 139 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z" opacity=".8" />
        <path d="m457 75 1-4 1 4 4 1-4 1-1 4-1-4-4-1Z" opacity=".7" />
      </g>
      <path
        d="M479 32a13 13 0 1 0 17 18c-13 5-24-5-17-18Z"
        fill="#b9ccec"
        opacity=".7"
      />
      <path
        d="M343 108 322 230q40 11 80 0L381 108Z"
        fill={`url(#${id}-tower)`}
        stroke="#e1eaf9"
        strokeWidth="1.2"
      />
      <path d="M376 111 392 229" stroke="#536f9b" opacity=".55" />
      <path d="M340 166v-7q0-7 3-7t3 7v6Z" fill="#203d68" />
      <path d="M366 205v-7q0-6 3-6t3 6v8Z" fill="#203d68" />
      <path
        d="M334 106q28 7 56 0v9q-28 8-56 0Z"
        fill="#aec3df"
        stroke="#dae5f6"
      />
      <path d="M340 72h44v33q-22 5-44 0Z" fill="#d8e5f6" stroke="#e8effc" />
      <g stroke="#345583" strokeWidth="1.8">
        <path d="M351 73v33m13-33v34m12-34v33M340 84h44m-44 11h44" />
      </g>
      <path
        d="m333 73 29-33 29 33q-29-4-58 0Z"
        fill="#9cb6db"
        stroke="#e1eafa"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M362 40V26m-4-3 4-10 4 10 10 4-10 3-4 10-4-10-10-3Z"
        stroke="#dce6f8"
        strokeWidth="1.2"
      />
      <path
        d="M329 112V99m66 13V99m-66 7q33 10 66 0"
        stroke="#e4ecf9"
        strokeWidth="1.3"
      />
      <path
        d="M312 237q51 15 102 0"
        stroke="#d5e2f6"
        strokeWidth=".8"
        opacity=".5"
      />
    </svg>
  );
}
function Field({ label, children, hint }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
      })}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
function RuleLink({ page, onClick }) {
  return (
    <button className="rule-link" onClick={onClick}>
      <BookOpen size={14} /> 규칙 p.{page}
    </button>
  );
}
function Sheet({ title, children, close }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      const target = opener?.isConnected
        ? opener
        : document.getElementById("main");
      target?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className="sheet"
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-label={title}
    >
      <div className="sheet-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="패널 닫기" onClick={close}>
          <X size={21} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
function Card({ card, label = "카드" }) {
  return (
    <div className={`draw-token ${card?.color === "적색" ? "red" : ""}`}>
      <small>{label}</small>
      <strong>{card ? `${SYMBOLS[card.suit]} ${card.value}` : "—"}</strong>
      <span>{card?.suit || "아직 뽑지 않음"}</span>
    </div>
  );
}
function ManualDraw({ manual, setManual, dice = true, coins = 0 }) {
  return (
    <div className="manual-draw">
      {dice && (
        <Field label="주사위">
          <select
            value={manual.die}
            onChange={(e) =>
              setManual({ ...manual, die: Number(e.target.value) })
            }
          >
            {[1, 2, 3, 4, 5, 6].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      )}
      {Array.from({ length: coins }, (_, i) => (
        <Field key={i} label={`동전 ${i + 1}`}>
          <select
            value={manual[`coin${i}`]}
            onChange={(e) =>
              setManual({ ...manual, [`coin${i}`]: e.target.value })
            }
          >
            <option value="heads">앞면</option>
            <option value="tails">뒷면</option>
          </select>
        </Field>
      ))}
      {coins < 2 && (
        <>
          <Field label="카드 숫자">
            <select
              value={manual.value}
              onChange={(e) => setManual({ ...manual, value: e.target.value })}
            >
              {VALUES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="카드 무늬">
            <select
              value={manual.suit}
              onChange={(e) => setManual({ ...manual, suit: e.target.value })}
            >
              {SUITS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("tonight");
  const [panel, setPanel] = useState(null);
  const [referenceTopic, setReferenceTopic] = useState("loop");
  const [notice, setNotice] = useState("");
  const [keeper, setKeeper] = useSaved(
    "lighthouse_keeper_profile",
    freshProfile,
    normalizedKeeper,
  );
  const [shift, setShift] = useSaved(
    "lighthouse_current_shift",
    createShift,
    normalizeShift,
  );
  const [journals, setJournals] = useSaved(
    "lighthouse_journals",
    () => [],
    (value) =>
      localSection("journals", value).map((j) => ({
        ...j,
        weather: j.weather || "",
        remarks: j.remarks || "",
        dutiesRaw: list(j.dutiesRaw),
      })),
  );
  const [inventory, setInventory] = useSaved(
    "lighthouse_inventory",
    () => [],
    (value) => localSection("persistentInventory", value),
  );
  const [conversations, setConversations] = useSaved(
    "lighthouse_light_conversations",
    () => [],
    (value) => localSection("lightConversations", value),
  );
  const [marks, setMarks] = useSaved(
    "lighthouse_season_marks",
    () => ({}),
    (value) => localSection("seasonMarks", value),
  );
  const [season, setSeason] = useSaved(
    "lighthouse_active_season",
    () => null,
    (value) => localSection("activeSeason", value),
  );
  const [pendingSeasons, setPendingSeasons] = useSaved(
    "lighthouse_pending_seasons",
    () => [],
    (value) => localSection("pendingSeason", value),
  );
  const [signHistory, setSignHistory] = useSaved(
    "lighthouse_weather_sign_history",
    () => ({}),
    (value) => localSection("signHistory", value),
  );
  const [seasonEnabled, setSeasonEnabled] = useSaved(
    "lighthouse_seasons_enabled",
    () => !!safeRead("lighthouse_active_season", () => null),
  );
  const [deck, setDeck] = useSaved("lighthouse_deck", makeDeck, (value) =>
    localSection("deck", value),
  );
  const [mode, setMode] = useSaved("lighthouse_draw_mode", () => "digital");
  const [dark, setDark] = useSaved("lighthouse_dark", () => false);
  const [beach, setBeach] = useSaved(
    "lighthouse_beach_search",
    () => null,
    (value) => localSection("beachSearch", value),
  );
  const [beachHour, setBeachHour] = useState(String(new Date().getHours()));
  const [lightDraft, setLightDraft] = useSaved(
    "lighthouse_light_draft",
    () => ({ question: "", response: "", interpretation: "" }),
    (value) => localSection("lightDraft", value),
  );
  const [manual, setManual] = useState({
    die: 1,
    value: "A",
    suit: "하트",
    coin0: "heads",
    coin1: "heads",
    die2: 1,
  });
  const [manualDuty, setManualDuty] = useState(null);
  const [search, setSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");
  const [user, setUser] = useState(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloud, setCloud] = useState(null);
  const [openedJournal, setOpenedJournal] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const resultHeading = useRef(null);
  const playbook = PLAYBOOKS.find((p) => p.id === keeper.playbookId);
  const weather = WEATHER_PATTERNS.find((w) => w.id === shift.moodId);
  const duty = shift.pendingDuty;
  const dutyPending = Boolean(duty);
  const step = shift.phase < 3 ? 0 : shift.phase === 3 ? 1 : 2;
  const activeSeason =
    seasonEnabled && season ? SEASONS.find((s) => s.id === season.id) : null;
  const beachMode =
    beach?.drawMode || (Array.isArray(beach?.reservedCards) ? "digital" : mode);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "night" : "paper";
  }, [dark]);
  useEffect(() => {
    if (dutyPending && view === "tonight") resultHeading.current?.focus();
  }, [dutyPending, view]);
  useEffect(() => {
    if (panel !== "settings" || cloud) return;
    let active = true;
    import("./cloud.js")
      .then((module) => {
        if (active) setCloud(module);
      })
      .catch(() => {
        if (active)
          setNotice(
            "계정 연결을 준비하지 못했습니다. 파일 백업을 사용할 수 있습니다.",
          );
      });
    return () => {
      active = false;
    };
  }, [panel, cloud]);
  useEffect(() => {
    if (!cloud?.auth) return;
    return cloud.onAuthStateChanged(cloud.auth, setUser);
  }, [cloud]);
  useEffect(() => {
    const handler = () => setSaveError(true);
    window.addEventListener("lighthouse-storage-error", handler);
    return () =>
      window.removeEventListener("lighthouse-storage-error", handler);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timeout);
  }, [notice]);
  const updateShift = (changes) =>
    setShift((prev) => ({ ...prev, ...changes }));
  const openRules = (topic) => {
    setRuleSearch("");
    setReferenceTopic(topic);
    setPanel("rules");
  };
  const draw = (count = 1) => {
    const result = takeCards(deck, count);
    setDeck(result.deck);
    if (result.reshuffled)
      setNotice("덱을 모두 사용해 버린 카드를 다시 섞었습니다.");
    return result.cards;
  };
  const nextDuty = (type) => {
    if (mode === "physical") {
      setManualDuty(type);
      return;
    }
    const die = type === "happening" ? null : rollDie();
    const card = draw()[0];
    const result = resolveDuty(type, die, card, playbook);
    updateShift({
      pendingDuty: result,
      ...(result.autoAction === "relight"
        ? { isLampLit: false, isClockworkWound: false }
        : {}),
    });
  };
  const applyManualDuty = () => {
    const result = resolveDuty(
      manualDuty,
      manual.die,
      cardFrom(manual.value, manual.suit),
      playbook,
    );
    updateShift({
      pendingDuty: result,
      ...(result.autoAction === "relight"
        ? { isLampLit: false, isClockworkWound: false }
        : {}),
    });
    setManualDuty(null);
  };
  const lightLamp = () => {
    const toss = mode === "physical" ? manual.coin0 : coin();
    const card =
      mode === "physical" ? cardFrom(manual.value, manual.suit) : draw()[0];
    const success = lightingSuccess(toss, card);
    updateShift({
      lightingAttempts: shift.lightingAttempts + 1,
      isLampLit: success,
      wickResult: { coin: toss, card, success },
    });
  };
  const commitDuty = (finish = false) => {
    if (!duty) {
      if (finish)
        updateShift({ phase: 4, isLampLit: false, isClockworkWound: false });
      return;
    }
    const saved = { ...duty, id: uid(), recordedAt: new Date().toISOString() };
    const changes = { duties: [...shift.duties, saved], pendingDuty: null };
    if ((finish && !duty.autoAction) || duty.autoAction === "time_warp_forward")
      Object.assign(changes, {
        phase: 4,
        isLampLit: false,
        isClockworkWound: false,
      });
    else if (duty.autoAction === "relight")
      Object.assign(changes, {
        phase: 2,
        isLampLit: false,
        isClockworkWound: false,
        lightingAttempts: 0,
        wickResult: null,
      });
    else if (duty.autoAction === "time_warp_backward")
      Object.assign(changes, {
        phase: 1,
        isLampLit: false,
        isClockworkWound: false,
        lightingAttempts: 0,
        wickResult: null,
        rewinds: (shift.rewinds || 0) + 1,
      });
    updateShift(changes);
    setManualDuty(null);
    if (duty.autoAction === "time_warp_backward" && !finish)
      setNotice(
        "밤을 다시 시작합니다. 시간 역행 이전의 기록은 일지에 남습니다.",
      );
  };
  const markWeather = (id) => {
    if (
      (signHistory[shift.date] || []).includes(id) ||
      shift.seasonSigns?.includes(id) ||
      season?.id === id ||
      pendingSeasons.includes(id)
    )
      return;
    const info = SEASONS.find((s) => s.id === id);
    const count = Math.min(info.circles, (Number(marks[id]) || 0) + 1);
    setMarks({ ...marks, [id]: count });
    setSignHistory({
      ...signHistory,
      [shift.date]: [...(signHistory[shift.date] || []), id],
    });
    updateShift({ seasonSigns: [...(shift.seasonSigns || []), id] });
    if (count === info.circles) {
      setPendingSeasons((prev) => [...prev, id]);
      setNotice(`${info.nameKo}: 표식이 찼습니다. 다음 날 시작합니다.`);
    }
  };
  const startSeason = (id) => {
    if (season) {
      setNotice("진행 중인 계절이 끝난 뒤 다음 계절을 시작할 수 있습니다.");
      return;
    }
    const dice =
      mode === "physical" ? [manual.die, manual.die2] : [rollDie(), rollDie()];
    const duration = seasonDuration(id, dice);
    const info = SEASONS.find((s) => s.id === id);
    setSeason({
      id,
      name: info.nameKo,
      durationLeft: duration,
      duration,
      dice,
      startedAt: shift.date,
    });
    setPendingSeasons((prev) => prev.filter((s) => s !== id));
    setSeasonEnabled(true);
    setNotice(`${info.nameKo}, ${duration}일 동안 지속됩니다.`);
  };
  const endSeason = () => {
    setMarks((prev) => ({ ...prev, [season.id]: 0 }));
    setSeason(null);
    setNotice("계절이 끝나 해당 표식을 비웠습니다.");
  };
  const saveNight = () => {
    if (!shift.shuffledCount) {
      setNotice("소등한 뒤 밤의 분위기에 맞게 덱을 섞어 주세요.");
      return;
    }
    const entry = {
      id: uid(),
      date: shift.date,
      time: shift.time,
      keeperNo: keeper.keeperNo,
      keeperName: keeper.name || "이름 미입력",
      playbookName: playbook?.nameKo || "나 자신",
      weather: shift.weatherTitle,
      weatherDesc: shift.weatherDesc,
      temp: shift.temp || "",
      winds: shift.winds || "",
      sights: shift.sights || "",
      initialObservations: shift.initialObservations,
      lampLitAttempts: shift.lightingAttempts,
      lightingDifficulty: shift.lightingDifficulty,
      dutiesRaw: shift.duties,
      dutiesLog: shift.duties
        .map((d) => `[${d.details}] ${d.userLog || ""}`)
        .join("\n\n"),
      remarks: shift.remarks,
      seasonEffect: activeSeason?.nameKo || "",
      endingIntensity: shift.endingIntensity,
      shuffledCount: shift.shuffledCount,
      rewinds: shift.rewinds || 0,
    };
    setJournals((prev) => [entry, ...prev]);
    // Days are fictional elapsed time, not the count of sessions. Keep fractional durations exact.
    setShift(createShift());
    setLightDraft({ question: "", response: "", interpretation: "" });
    setOpenedJournal(entry.id);
    setView("journal");
    setNotice("오늘 밤의 기록을 보관했습니다.");
  };
  const shuffleEnding = () => {
    const count = closingShuffleCount(shift.endingIntensity);
    if (mode === "digital")
      setDeck(shuffleForNight(shift.endingIntensity).deck);
    updateShift({
      shuffledCount: count,
      isLampLit: false,
      isClockworkWound: false,
    });
  };
  const reserveBeachCards = (count) => {
    if (deck.length >= count) return draw(count);
    const result = takeCards(makeDeck(), count);
    setDeck(result.deck);
    setNotice("수색할 카드 묶음이 부족해 전체 덱을 다시 섞었습니다.");
    return result.cards;
  };
  const beginBeach = () => {
    const count = Math.ceil(Number(beachHour) / 2);
    setBeach({
      total: count,
      remaining: count,
      found: [],
      current: null,
      hour: Number(beachHour),
      drawMode: mode,
      ...(mode === "digital"
        ? { reservedCards: reserveBeachCards(count) }
        : {}),
    });
  };
  const revealBeach = () => {
    const pile =
      beachMode === "digital"
        ? beach.reservedCards || reserveBeachCards(beach.remaining)
        : null;
    const card =
      beachMode === "physical" ? cardFrom(manual.value, manual.suit) : pile[0];
    setBeach({
      ...beach,
      drawMode: beachMode,
      ...(pile ? { reservedCards: pile.slice(1) } : {}),
      current: {
        id: uid(),
        type: BEACHCOMBING_ITEMS[card.value],
        card,
        source: card.color === "적색" ? "알려진 출처" : "알 수 없는 출처",
        condition: "",
        coin: null,
        notes: "",
      },
    });
  };
  const beachCondition = () => {
    setBeach({
      ...beach,
      current: {
        ...beach.current,
        coin: beachMode === "physical" ? manual.coin0 : coin(),
      },
    });
  };
  const storeBeach = (keep) => {
    const item = beach.current;
    setShift((prev) => ({
      ...prev,
      duties: [
        ...prev.duties,
        {
          id: uid(),
          type: "beach",
          details: item.type,
          cardDrawn: `${item.card.suit} ${item.card.value}`,
          outcome: `${item.source} · ${item.coin === "heads" ? "앞" : "뒷"}면`,
          userLog: [
            item.condition,
            item.notes,
            keep ? "보관했다." : "발견을 기록하고 두고 왔다.",
          ]
            .filter(Boolean)
            .join(" "),
        },
      ],
    }));
    if (keep)
      setInventory((prev) => [
        ...prev,
        { ...item, timestamp: new Date().toISOString() },
      ]);
    setBeach({
      ...beach,
      remaining: beach.remaining - 1,
      current: null,
      found: [...beach.found, { ...item, kept: keep }],
    });
  };
  const askLight = () => {
    if (shift.lightQuestionAsked || !lightDraft.question.trim()) return;
    const c1 = mode === "physical" ? manual.coin0 : coin(),
      c2 = mode === "physical" ? manual.coin1 : coin();
    const code = c1 === c2 ? (c1 === "heads" ? "HH" : "TT") : "HT";
    const answer = {
      id: uid(),
      question: lightDraft.question,
      responseType: LIGHT_IN_THE_DARK[code].type,
      words: LIGHT_IN_THE_DARK[code].words.join(", "),
      code,
      coinCode: `${c1 === "heads" ? "앞면" : "뒷면"} + ${c2 === "heads" ? "앞면" : "뒷면"}`,
      timestamp: new Date().toLocaleString(),
      interpretation: "",
    };
    setConversations((prev) => [answer, ...prev]);
    setLightDraft({ ...lightDraft, response: answer.id, code });
    updateShift({ lightQuestionAsked: true, lightResponseId: answer.id });
  };
  const backupData = () => ({
    version: 2,
    exportedAt: new Date().toISOString(),
    journals,
    keeperProfile: keeper,
    shiftState: shift,
    persistentInventory: inventory,
    lightConversations: conversations,
    seasonMarks: marks,
    activeSeason: season,
    pendingSeason: pendingSeasons,
    seasonEnabled,
    deck,
    beachSearch: beach,
    lightDraft,
    signHistory,
  });
  const downloadData = (data = backupData(), name = "lighthouse-backup") => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const applyBackup = (raw) => {
    const data = validateBackup(raw);
    if (
      !window.confirm(
        "현재 기록을 복원할 파일로 바꿉니다. 먼저 현재 상태를 자동으로 다운로드합니다. 계속할까요?",
      )
    )
      return;
    downloadData();
    setJournals(data.journals);
    if (data.keeperProfile) setKeeper(normalizedKeeper(data.keeperProfile));
    if (data.shiftState) setShift(normalizeShift(data.shiftState));
    if (data.persistentInventory) setInventory(data.persistentInventory);
    if (data.lightConversations) setConversations(data.lightConversations);
    if (data.seasonMarks) setMarks(data.seasonMarks);
    if ("activeSeason" in data) setSeason(data.activeSeason);
    if ("pendingSeason" in data) setPendingSeasons(list(data.pendingSeason));
    if ("seasonEnabled" in data) setSeasonEnabled(data.seasonEnabled);
    if (data.deck) setDeck(data.deck);
    if ("beachSearch" in data) setBeach(data.beachSearch);
    if ("lightDraft" in data) setLightDraft(data.lightDraft);
    if ("signHistory" in data) setSignHistory(data.signHistory);
    setOpenedJournal(null);
    setNotice("백업을 복원했습니다.");
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      applyBackup(JSON.parse(await file.text()));
    } catch (error) {
      setNotice(`복원하지 않았습니다: ${error.message}`);
    }
    event.target.value = "";
  };
  const cloudAction = async (restore) => {
    setCloudBusy(true);
    try {
      const ref = cloud.doc(cloud.db, "thelighthouse_saves", user.uid);
      if (restore) {
        const snap = await cloud.getDoc(ref);
        if (!snap.exists()) throw new Error("저장된 클라우드 백업이 없습니다.");
        const data = snap.data();
        applyBackup(
          data.backup
            ? JSON.parse(data.backup)
            : {
                journals: JSON.parse(data.journals || "[]"),
                persistentInventory: JSON.parse(data.inventory || "[]"),
              },
        );
      } else {
        const data = backupData();
        await cloud.setDoc(
          ref,
          {
            backup: JSON.stringify(data),
            journals: JSON.stringify(journals),
            inventory: JSON.stringify(inventory),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
        setNotice("현재 밤과 모든 기록을 클라우드에 백업했습니다.");
      }
    } catch (error) {
      setNotice(`클라우드 작업 실패: ${error.message}`);
    } finally {
      setCloudBusy(false);
    }
  };
  const login = async () => {
    try {
      if (!cloud?.auth) throw new Error("계정 연결 준비 중");
      await cloud.signInWithPopup(cloud.auth, cloud.googleProvider);
    } catch {
      setNotice(
        "로그인에 실패했습니다. 로컬 저장과 파일 백업은 계속 사용할 수 있습니다.",
      );
    }
  };
  const resultAction =
    duty?.autoAction === "time_warp_forward"
      ? "기록하고 밤 마무리"
      : duty?.autoAction === "time_warp_backward"
        ? "기록을 남기고 밤 다시 시작"
        : duty?.autoAction === "relight"
          ? "기록하고 다시 점등"
          : "기록하고 다음 일 선택";

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        본문으로 바로가기
      </a>
      <header className="app-header">
        <button className="brand" onClick={() => setView("tonight")}>
          <Lighthouse small />
          <span>
            우주 끝의 등대<small>AT THE EDGE OF THE UNIVERSE</small>
          </span>
        </button>
        <div className="header-actions">
          <span className={`save-status ${saveError ? "error" : ""}`}>
            <span />
            {saveError ? "저장 공간 확인 필요" : "이 기기에 자동 저장"}
          </span>
          <button
            className="icon-btn"
            aria-label="보관 및 설정"
            onClick={() => setPanel("settings")}
          >
            <Settings size={21} />
          </button>
        </div>
      </header>
      {saveError && (
        <p className="warning" role="alert">
          브라우저 저장 공간이 부족하거나 저장이 차단되었습니다. 보관 및
          설정에서 파일 백업을 내려받아 주세요.
        </p>
      )}
      <nav className="main-nav" aria-label="주요 메뉴">
        {[
          { id: "tonight", label: "오늘 밤", icon: Moon },
          { id: "journal", label: "일지", icon: NotebookPen },
          { id: "reference", label: "규칙 찾기", icon: BookOpen },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            <Icon size={18} />
            {label}
            {id === "journal" && journals.length > 0 && (
              <span className="count">{journals.length}</span>
            )}
          </button>
        ))}
        <button className="mobile-tools" onClick={() => setPanel("tools")}>
          <Package size={18} />
          도구
        </button>
      </nav>
      <main id="main" tabIndex="-1">
        {view === "tonight" && (
          <>
            <div className="page-heading observatory-heading">
              <div className="heading-copy">
                <p className="eyebrow">
                  KEEPER NO. {keeper.keeperNo} · {keeper.name || "이름 미입력"}
                </p>
                <h1>
                  {shift.phase === 4
                    ? "밤 마무리"
                    : shift.phase === 3
                      ? "임무 진행"
                      : "오늘 밤 기록"}
                </h1>
                <p className="subtitle">
                  날씨 선택 → 점등 → 임무 수행 → 일지 저장
                </p>
                <button
                  className="quiet-btn keeper-link"
                  onClick={() => setPanel("keeper")}
                >
                  {playbook?.nameKo || "나 자신으로 플레이"}
                  <ChevronRight size={16} />
                </button>
              </div>
              <ObservatoryScene lit={shift.isLampLit} />
            </div>
            <div className="desk-grid">
              <section className="play-desk" aria-label="오늘 밤 진행">
                <ol className="progress">
                  {["시작", "임무", "마무리"].map((label, i) => (
                    <li
                      className={
                        step === i ? "current" : step > i ? "done" : ""
                      }
                      key={label}
                      aria-current={step === i ? "step" : undefined}
                    >
                      <span>
                        {step > i ? <Check size={14} /> : `0${i + 1}`}
                      </span>
                      {label}
                    </li>
                  ))}
                </ol>
                {shift.phase === 1 && (
                  <div className="stage">
                    <div className="section-heading">
                      <h2>날짜와 날씨</h2>
                      <RuleLink
                        page="35–37"
                        onClick={() => openRules("beginning")}
                      />
                    </div>
                    <div className="date-fields shift-date-fields">
                      <Field label="날짜">
                        <input
                          type="date"
                          value={shift.date}
                          onChange={(e) =>
                            updateShift({ date: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="시간">
                        <input
                          type="time"
                          value={shift.time}
                          onChange={(e) =>
                            updateShift({ time: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <p className="field-intro">
                      나 또는 캐릭터의 기분으로 날씨를 선택하세요.
                    </p>
                    <div className="weather-grid">
                      {WEATHER_PATTERNS.map((w) => (
                        <button
                          key={w.id}
                          className={`weather-choice ${shift.moodId === w.id ? "selected" : ""}`}
                          aria-pressed={shift.moodId === w.id}
                          onClick={() =>
                            updateShift({
                              moodId: w.id,
                              weatherTitle: w.title,
                              weatherDesc: w.description,
                            })
                          }
                        >
                          <span>{w.mood}</span>
                          <strong>{w.title}</strong>
                          {shift.moodId === w.id && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                    {weather && (
                      <p className="weather-description">
                        {weather.description}
                      </p>
                    )}
                    <div className="weather-notes">
                      <Field label="기온">
                        <input
                          value={shift.temp || ""}
                          onChange={(e) =>
                            updateShift({ temp: e.target.value })
                          }
                          placeholder="예: 12°C"
                        />
                      </Field>
                      <Field label="바람 · 소리">
                        <input
                          value={shift.winds || ""}
                          onChange={(e) =>
                            updateShift({ winds: e.target.value })
                          }
                          placeholder="무엇이 들리나요?"
                        />
                      </Field>
                      <Field label="풍경">
                        <input
                          value={shift.sights || ""}
                          onChange={(e) =>
                            updateShift({ sights: e.target.value })
                          }
                          placeholder="무엇이 보이나요?"
                        />
                      </Field>
                    </div>
                    <Field
                      label="첫 관측 기록"
                      hint="날씨가 하루에 어떤 영향을 주었나요? 기록의 길이는 자유입니다."
                    >
                      <textarea
                        value={shift.initialObservations || ""}
                        onChange={(e) =>
                          updateShift({ initialObservations: e.target.value })
                        }
                        placeholder="관측한 풍경, 날씨의 영향 등을 기록하세요."
                        rows={3}
                      />
                    </Field>
                    <div className="stage-actions">
                      <button
                        className="primary-btn"
                        disabled={
                          !shift.weatherTitle || !shift.date || !shift.time
                        }
                        onClick={() => updateShift({ phase: 2 })}
                      >
                        등불 켜기 <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                )}
                {shift.phase === 2 && (
                  <div className="stage">
                    <div className="section-heading">
                      <h2>
                        {shift.duties.some((d) => d.autoAction === "relight")
                          ? "등불을 다시 켭니다."
                          : "등대의 심장에 불을."}
                      </h2>
                      <RuleLink
                        page="38"
                        onClick={() => openRules("lighting")}
                      />
                    </div>
                    <p>
                      동전과 카드를 함께 뒤집으세요.{" "}
                      <strong>앞면 + 빨간 카드</strong>가 한 번에 나오면 불이
                      붙습니다.
                    </p>
                    {mode === "physical" && !shift.isLampLit && (
                      <ManualDraw
                        manual={manual}
                        setManual={setManual}
                        dice={false}
                        coins={1}
                      />
                    )}
                    <div className="lighting-area">
                      <div className="draw-token">
                        <small>동전</small>
                        <strong>
                          {shift.wickResult
                            ? shift.wickResult.coin === "heads"
                              ? "앞면"
                              : "뒷면"
                            : "—"}
                        </strong>
                        <span>{shift.lightingAttempts}회 시도</span>
                      </div>
                      <span className="token-plus">+</span>
                      <Card card={shift.wickResult?.card} />
                    </div>
                    <p
                      className={`lighting-status ${shift.isLampLit ? "success" : ""}`}
                      aria-live="polite"
                    >
                      {shift.isLampLit
                        ? "불이 붙었습니다. 이제 태엽을 감아 빛을 회전시키세요."
                        : shift.wickResult
                          ? "아직 불이 붙지 않았습니다. 다시 시도하세요."
                          : "동전과 카드를 같은 시도에 뒤집어 점등을 판정합니다."}
                    </p>
                    {!shift.isLampLit && (
                      <button
                        className="primary-btn wide-btn"
                        onClick={lightLamp}
                      >
                        {mode === "physical"
                          ? "점등 결과 적용"
                          : "동전 + 카드 뒤집기"}
                      </button>
                    )}
                    {shift.lightingAttempts > 1 && (
                      <Field label="점등이 어려웠던 이유">
                        <textarea
                          rows={2}
                          value={shift.lightingDifficulty}
                          onChange={(e) =>
                            updateShift({ lightingDifficulty: e.target.value })
                          }
                          placeholder="예: 젖은 심지, 불안정한 장치"
                        />
                      </Field>
                    )}
                    <div className="stage-actions spread">
                      <button
                        className="quiet-btn"
                        onClick={() => updateShift({ phase: 1 })}
                      >
                        <ArrowLeft size={16} />
                        날씨와 기록
                      </button>
                      {shift.isLampLit && (
                        <button
                          className="primary-btn"
                          onClick={() =>
                            updateShift({ isClockworkWound: true, phase: 3 })
                          }
                        >
                          태엽 감고 밤 시작 <ArrowRight size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {shift.phase === 3 && (
                  <div className="stage">
                    {!duty && (
                      <>
                        <div className="section-heading">
                          <h2>임무 선택</h2>
                          <RuleLink
                            page="40–41"
                            onClick={() => openRules("loop")}
                          />
                        </div>
                        <p>
                          관측·정비·사건 중 하나를 선택하세요.
                          <br />
                          기록 후 다음 임무를 선택합니다. 순서와 횟수는
                          자유입니다.
                        </p>
                        <div className="duty-choices">
                          {DUTIES.map(({ id, title, sub, icon: Icon }) => (
                            <button key={id} onClick={() => nextDuty(id)}>
                              <Icon size={25} />
                              <strong>{title}</strong>
                              <span>{sub}</span>
                              <small>
                                {id === "happening"
                                  ? "카드 1장"
                                  : "주사위 → 카드 1장"}
                                <ArrowRight size={14} />
                              </small>
                            </button>
                          ))}
                        </div>
                        <details className="inline-rule">
                          <summary>밤의 분위기로 고르기</summary>
                          <p>
                            관측: 불안함 · 평온함 · 잘 모르겠음
                            <br />
                            정비: 사나움 · 추움 · 무더움 · 이상함
                            <br />
                            사건: 불확실함 · 조용하고 방해받지 않음 · 시끄럽고
                            혼란스러움
                          </p>
                        </details>
                        {manualDuty && (
                          <div className="manual-panel">
                            <h3>
                              {DUTIES.find((d) => d.id === manualDuty).title} —
                              실제 도구의 결과
                            </h3>
                            <ManualDraw
                              manual={manual}
                              setManual={setManual}
                              dice={manualDuty !== "happening"}
                            />
                            <div className="stage-actions">
                              <button
                                className="quiet-btn"
                                onClick={() => setManualDuty(null)}
                              >
                                취소
                              </button>
                              <button
                                className="primary-btn"
                                onClick={applyManualDuty}
                              >
                                판정 적용
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {duty && (
                      <div className="duty-result">
                        <div className="section-heading">
                          <p className="eyebrow">
                            {DUTIES.find((d) => d.id === duty.type)?.title ||
                              duty.type}{" "}
                            {duty.die ? `· 주사위 ${duty.die}` : ""} ·{" "}
                            {duty.cardDrawn}
                          </p>
                          <RuleLink
                            page={duty.rulePage || "42–47"}
                            onClick={() => openRules(duty.type)}
                          />
                        </div>
                        <h2 ref={resultHeading} tabIndex={-1}>
                          {duty.details}
                        </h2>
                        {duty.type !== "maintenance" && (
                          <p>{duty.description}</p>
                        )}
                        <div
                          className={`outcome ${duty.cardColor === "적색" ? "red-outcome" : ""}`}
                        >
                          <strong>{duty.outcome || duty.severity}</strong>
                        </div>
                        {duty.questions && (
                          <p className="writing-prompt">{duty.questions}</p>
                        )}
                        {duty.characterEffect && (
                          <details className="inline-rule">
                            <summary>
                              {playbook?.nameKo || "등대지기"}의 서사 단서
                            </summary>
                            <p>{duty.characterEffect}</p>
                            <small>
                              판정 보정 없이, 반응을 자유롭게 해석합니다.
                            </small>
                          </details>
                        )}
                        <details className="inline-rule">
                          <summary>해석이 막힐 때 — 예시</summary>
                          <p>{duty.examples}</p>
                        </details>
                        {duty.autoAction && (
                          <p className="warning">
                            {duty.autoAction === "relight"
                              ? "등대의 불이 꺼졌습니다. 기록을 남긴 뒤 다시 점등합니다."
                              : duty.autoAction === "time_warp_forward"
                                ? "시간이 앞으로 흐릅니다. 이 기록 뒤에 밤을 일찍 마무리합니다."
                                : "시간이 뒤로 흐릅니다. 기록을 남기고 밤의 시작으로 돌아갑니다."}
                          </p>
                        )}
                        <Field label="임무 기록">
                          <textarea
                            rows={6}
                            value={duty.userLog}
                            onChange={(e) =>
                              updateShift({
                                pendingDuty: {
                                  ...duty,
                                  userLog: e.target.value,
                                },
                              })
                            }
                            placeholder="판정에 따라 일어난 일과 결과를 기록하세요."
                          />
                        </Field>
                        <div className="result-tools">
                          <button
                            className="quiet-btn"
                            onClick={() => setPanel("inventory")}
                          >
                            <Package size={15} />
                            소지품 참고
                          </button>
                          <span>작성 중에도 자동 저장됩니다</span>
                        </div>
                        <button
                          className="primary-btn wide-btn"
                          onClick={() => commitDuty()}
                        >
                          {resultAction}
                          <ArrowRight size={17} />
                        </button>
                      </div>
                    )}
                    {!duty?.autoAction && (
                      <div className="night-close">
                        <span>플레이 종료</span>
                        <button
                          className="quiet-btn"
                          onClick={() => commitDuty(true)}
                        >
                          밤 마무리 <Moon size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {shift.phase === 4 && (
                  <div className="stage">
                    <div className="section-heading">
                      <h2>소등과 일지 저장</h2>
                      <RuleLink
                        page="48–49"
                        onClick={() => openRules("ending")}
                      />
                    </div>
                    <p>밤의 분위기에 맞게 카드를 섞고 일지를 저장하세요.</p>
                    <Field label="오늘 밤의 분위기">
                      <select
                        value={shift.endingIntensity}
                        onChange={(e) =>
                          updateShift({
                            endingIntensity: e.target.value,
                            shuffledCount: 0,
                          })
                        }
                      >
                        {Object.entries(INTENSITIES).map(([id, text]) => (
                          <option key={id} value={id}>
                            {text} · {closingShuffleCount(id)}회 섞기
                          </option>
                        ))}
                      </select>
                    </Field>
                    <button
                      className={`shuffle-btn ${shift.shuffledCount ? "complete" : ""}`}
                      onClick={shuffleEnding}
                    >
                      {shift.shuffledCount ? (
                        <Check size={20} />
                      ) : (
                        <Moon size={20} />
                      )}
                      {shift.shuffledCount
                        ? `소등 · ${shift.shuffledCount}회 셔플 완료`
                        : `소등 · 덱 ${closingShuffleCount(shift.endingIntensity)}회 ${mode === "physical" ? "섞었음 표시" : "섞기"}`}
                    </button>
                    <Field
                      label="마무리 기록"
                      hint="완료·미완료 임무와 남은 상태를 기록합니다. 선택 입력."
                    >
                      <textarea
                        rows={6}
                        value={shift.remarks}
                        onChange={(e) =>
                          updateShift({ remarks: e.target.value })
                        }
                        placeholder="마무리 기록을 입력하세요. 생략할 수 있습니다."
                      />
                    </Field>
                    <div className="stage-actions">
                      <button
                        className="primary-btn"
                        disabled={!shift.shuffledCount}
                        onClick={saveNight}
                      >
                        <NotebookPen size={17} />
                        일지 저장
                      </button>
                    </div>
                  </div>
                )}
              </section>
              <aside className="night-sidebar">
                <div className="night-context">
                  <div className="context-title">
                    <span
                      className={`lamp-dot ${shift.isLampLit ? "lit" : ""}`}
                    />
                    <strong>
                      {shift.isLampLit ? "등불 켜짐" : "등불 꺼짐"}
                    </strong>
                  </div>
                  <p>
                    {shift.date} · {shift.time}
                  </p>
                  <h3>{shift.weatherTitle || "날씨 미선택"}</h3>
                  <p>
                    {[shift.temp, shift.winds, shift.sights]
                      .filter(Boolean)
                      .join(" · ") ||
                      shift.weatherDesc ||
                      "기분으로 밤의 날씨를 골라 주세요."}
                  </p>
                  {activeSeason && (
                    <button
                      className="season-context"
                      onClick={() => setPanel("seasons")}
                    >
                      {activeSeason.nameKo}
                      <span>
                        {season.durationLeft}
                        {season.id === 4 ? "밤" : "일"} 남음
                      </span>
                    </button>
                  )}
                </div>
                <div className="sidebar-tools">
                  <p className="eyebrow">플레이 도구</p>
                  <button onClick={() => setPanel("beach")}>
                    <Waves size={18} />
                    <span>
                      해변 수색<small>발견하고 보관하기</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={() => setPanel("light")}>
                    <Radio size={18} />
                    <span>
                      어둠 속의 빛
                      <small>
                        {shift.lightQuestionAsked
                          ? "오늘의 응답 도착"
                          : "밤마다 한 번의 대화"}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <div className="tool-pair">
                    <button onClick={() => setPanel("inventory")}>
                      <Package size={16} />
                      소지품 {inventory.length}
                    </button>
                    <button onClick={() => setPanel("seasons")}>
                      <Sparkles size={16} />
                      계절 {seasonEnabled ? "사용 중" : "선택"}
                    </button>
                  </div>
                </div>
                <div className="tonight-notes">
                  <div className="section-heading">
                    <h3>오늘의 기록</h3>
                    <span>{shift.duties.length}</span>
                  </div>
                  {shift.duties.length === 0 ? (
                    <p className="muted">기록된 임무가 없습니다.</p>
                  ) : (
                    shift.duties.map((entry, i) => (
                      <details key={entry.id || i}>
                        <summary>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          {entry.details}
                        </summary>
                        <p>{entry.outcome || entry.severity}</p>
                        <textarea
                          aria-label={`기록 ${i + 1} 수정`}
                          rows={3}
                          value={entry.userLog || ""}
                          onChange={(e) =>
                            updateShift({
                              duties: shift.duties.map((d, index) =>
                                index === i
                                  ? { ...d, userLog: e.target.value }
                                  : d,
                              ),
                            })
                          }
                        />
                      </details>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
        {view === "journal" && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">THE LOGBOOK</p>
                <h1>플레이 일지</h1>
                <p className="subtitle">저장한 기록을 검색하고 확인합니다.</p>
              </div>
              <button className="quiet-btn" onClick={() => downloadData()}>
                <Download size={16} />
                전체 백업
              </button>
            </div>
            <div className="search-field">
              <Search size={18} />
              <input
                aria-label="일지 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="기록, 날씨, 등대지기 이름 찾기"
              />
            </div>
            <div className="journal-list">
              {journals
                .filter((j) =>
                  JSON.stringify(j)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((j) => (
                  <article key={j.id} className="journal-entry">
                    <button
                      className="journal-summary"
                      aria-expanded={openedJournal === j.id}
                      onClick={() =>
                        setOpenedJournal(openedJournal === j.id ? null : j.id)
                      }
                    >
                      <span className="journal-date">
                        {j.date || "날짜 없음"}
                        <small>{j.time}</small>
                      </span>
                      <span>
                        <strong>{j.weather || "밤의 기록"}</strong>
                        <small>
                          {j.keeperName} · {j.dutiesRaw?.length || 0}개의 일
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                    {openedJournal === j.id && (
                      <div className="journal-body">
                        <p className="eyebrow">
                          {j.keeperName} · NO. {j.keeperNo} · {j.playbookName}
                        </p>
                        <p>
                          {[j.temp, j.winds, j.sights]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {j.initialObservations && (
                          <p className="journal-prose">
                            {j.initialObservations}
                          </p>
                        )}
                        {j.lightingDifficulty && (
                          <p>점등: {j.lightingDifficulty}</p>
                        )}
                        {j.dutiesRaw?.length ? (
                          j.dutiesRaw.map((d, i) => (
                            <section key={i}>
                              <h3>{d.details}</h3>
                              <small>
                                {d.cardDrawn} · {d.outcome || d.severity}
                              </small>
                              <p className="journal-prose">
                                {d.userLog || "프롬프트만 기록했습니다."}
                              </p>
                            </section>
                          ))
                        ) : (
                          <p className="journal-prose">{j.dutiesLog}</p>
                        )}
                        <section>
                          <h3>마무리 기록</h3>
                          <p className="journal-prose">
                            {j.remarks || "마무리 기록 없음"}
                          </p>
                        </section>
                        <div className="stage-actions spread">
                          <button
                            className="quiet-btn"
                            onClick={() =>
                              downloadData([j], "lighthouse-night")
                            }
                          >
                            <Download size={16} />
                            일지 내려받기
                          </button>
                          <button
                            className="quiet-btn danger"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "이 일지를 삭제할까요? 삭제 전 파일로 보관할 수 있습니다.",
                                )
                              )
                                setJournals((prev) =>
                                  prev.filter((entry) => entry.id !== j.id),
                                );
                            }}
                          >
                            <Trash2 size={15} />
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
            </div>
            {journals.length === 0 && (
              <div className="empty-state">
                <NotebookPen size={34} />
                <h2>저장된 일지가 없습니다.</h2>
                <p>오늘 밤을 마무리하고 일지를 저장하세요.</p>
                <button
                  className="primary-btn"
                  onClick={() => setView("tonight")}
                >
                  오늘 밤 시작 <ArrowRight size={17} />
                </button>
              </div>
            )}
          </>
        )}
        {view === "reference" && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">RULE REFERENCE</p>
                <h1>규칙 찾기</h1>
                <p className="subtitle">
                  Complete Edition의 인쇄 쪽수를 기준으로 정리했습니다.
                </p>
              </div>
            </div>
            <RuleReference
              topic={referenceTopic}
              setTopic={setReferenceTopic}
              search={ruleSearch}
              setSearch={setRuleSearch}
            />
          </>
        )}
      </main>
      <footer>
        원작 Ella Lim · LostWays Club
        <span>솔로 저널링을 위한 개인 플레이 도구</span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button aria-label="알림 닫기" onClick={() => setNotice("")}>
            <X size={17} />
          </button>
        </div>
      )}
      {panel && (
        <Sheet
          key={`${panel}-${panel === "rules" ? referenceTopic : ""}`}
          title={
            {
              keeper: "등대지기",
              settings: "보관 및 설정",
              rules: "규칙 조회",
              inventory: "소지품",
              beach: "해변 수색",
              light: "어둠 속의 빛",
              seasons: "계절",
              tools: "플레이 도구",
            }[panel]
          }
          close={() => setPanel(null)}
        >
          {panel === "tools" && (
            <div className="panel-stack tools-menu">
              {[
                {
                  id: "keeper",
                  label: "등대지기 · 플레이북",
                  icon: NotebookPen,
                },
                { id: "beach", label: "해변 수색", icon: Waves },
                { id: "light", label: "어둠 속의 빛", icon: Radio },
                {
                  id: "inventory",
                  label: `소지품 ${inventory.length}`,
                  icon: Package,
                },
                { id: "seasons", label: "계절 · 선택 확장", icon: Sparkles },
                {
                  id: "settings",
                  label: "판정 도구 · 백업 · 화면",
                  icon: Settings,
                },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className="quiet-btn"
                  onClick={() => setPanel(id)}
                >
                  <Icon size={20} />
                  {label}
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          )}
          {panel === "rules" && (
            <RuleReference
              topic={referenceTopic}
              setTopic={setReferenceTopic}
              search={ruleSearch}
              setSearch={setRuleSearch}
            />
          )}
          {panel === "keeper" && (
            <div className="panel-stack">
              <p>
                나 자신으로 플레이하거나 캐릭터의 시선을 빌리세요. 설정은 언제든
                바꿀 수 있습니다. <span className="muted">p.3, 7–32</span>
              </p>
              <Field label="이름">
                <input
                  value={keeper.name || ""}
                  onChange={(e) =>
                    setKeeper({ ...keeper, name: e.target.value })
                  }
                  placeholder="선택 입력"
                />
              </Field>
              <div className="date-fields">
                <Field label="지기 번호">
                  <input
                    value={keeper.keeperNo}
                    onChange={(e) =>
                      setKeeper({ ...keeper, keeperNo: e.target.value })
                    }
                  />
                </Field>
                <Field label="성별 · 자유 입력">
                  <input
                    value={keeper.gender || ""}
                    onChange={(e) =>
                      setKeeper({ ...keeper, gender: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="플레이북">
                <select
                  value={keeper.playbookId}
                  onChange={(e) =>
                    setKeeper({ ...keeper, playbookId: e.target.value })
                  }
                >
                  <option value="self">나 자신 · 플레이북 없이</option>
                  {PLAYBOOKS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameKo}
                    </option>
                  ))}
                </select>
              </Field>
              {playbook && (
                <>
                  <p>{playbook.description}</p>
                  <details className="inline-rule" open>
                    <summary>강점과 어려움 · 서사 단서</summary>
                    <p>{playbook.excels}</p>
                    <p>{playbook.struggles}</p>
                    <small>주사위나 카드 결과를 바꾸지 않습니다.</small>
                  </details>
                  {[
                    ["nameChoice", playbook.nameLabel, playbook.nameChoices],
                    ["hateFact", playbook.hateLabel, playbook.hateFacts],
                    ["careItem", playbook.careLabel, playbook.careChoices],
                    [
                      "reminder",
                      playbook.reminderLabel,
                      playbook.reminderChoices,
                    ],
                    [
                      "ownSecret",
                      playbook.ownSecretLabel,
                      playbook.ownSecretChoices,
                    ],
                    ["ritual", playbook.ritualLabel, playbook.ritualChoices],
                  ]
                    .filter(([, , choices]) => choices?.length)
                    .map(([key, label, choices]) => (
                      <Field key={key} label={label}>
                        <select
                          value={keeper[key] || ""}
                          onChange={(e) =>
                            setKeeper({ ...keeper, [key]: e.target.value })
                          }
                        >
                          <option value="">아직 정하지 않음</option>
                          {choices.map((choice) => (
                            <option key={choice}>{choice}</option>
                          ))}
                        </select>
                      </Field>
                    ))}
                  <details className="inline-rule">
                    <summary>한 문장과 복장</summary>
                    {[
                      ["proudWord", playbook.proudQuestion],
                      ["hideWord", playbook.hideQuestion],
                      ["hopeWord", playbook.hopeQuestion],
                      ["misconceptionWord", playbook.misconceptionQuestion],
                    ]
                      .filter(([, question]) => question)
                      .map(([key, question]) => (
                        <Field key={key} label={question}>
                          <select
                            value={keeper[key] || ""}
                            onChange={(e) =>
                              setKeeper({ ...keeper, [key]: e.target.value })
                            }
                          >
                            <option value="">아직 정하지 않음</option>
                            {playbook.words.map((word) => (
                              <option key={word}>{word}</option>
                            ))}
                          </select>
                        </Field>
                      ))}
                    <div className="clothes">
                      {playbook.clothingChoices.map((clothing) => (
                        <label key={clothing}>
                          <input
                            type="checkbox"
                            checked={keeper.apparel.includes(clothing)}
                            onChange={(e) =>
                              setKeeper({
                                ...keeper,
                                apparel: e.target.checked
                                  ? [...keeper.apparel, clothing]
                                  : keeper.apparel.filter(
                                      (c) => c !== clothing,
                                    ),
                              })
                            }
                          />
                          {clothing}
                        </label>
                      ))}
                    </div>
                  </details>
                </>
              )}
              <Field label="나만의 배경과 변화">
                <textarea
                  rows={4}
                  value={keeper.notes || ""}
                  onChange={(e) =>
                    setKeeper({ ...keeper, notes: e.target.value })
                  }
                  placeholder="등대지기의 설정과 변경 사항을 기록하세요."
                />
              </Field>
              <button className="primary-btn" onClick={() => setPanel(null)}>
                오늘 밤으로 <ArrowRight size={17} />
              </button>
            </div>
          )}
          {panel === "inventory" && (
            <div className="panel-stack">
              <p>
                해변에서 가져온 물건은 어느 밤에든 쓸 수 있습니다. 사용했다고
                반드시 사라지지는 않습니다. <span className="muted">p.52</span>
              </p>
              {inventory.length === 0 && (
                <p className="empty-note">아직 보관한 물건이 없습니다.</p>
              )}
              {inventory.map((item) => (
                <article className="inventory-item" key={item.id}>
                  <h3>{item.type}</h3>
                  <p>
                    {item.source} · {item.condition}
                  </p>
                  {item.notes && <p>{item.notes}</p>}
                  <div className="stage-actions spread">
                    <button
                      className="quiet-btn"
                      disabled={!duty}
                      onClick={() => {
                        updateShift({
                          pendingDuty: {
                            ...duty,
                            userLog: `${duty.userLog}${duty.userLog ? "\n" : ""}${item.type}${item.condition ? ` (${item.condition})` : ""}을 사용했다.`,
                          },
                        });
                        setPanel(null);
                      }}
                    >
                      <NotebookPen size={15} />
                      현재 기록에 사용
                    </button>
                    <button
                      className="quiet-btn danger"
                      onClick={() => {
                        if (window.confirm("이 물건을 보관함에서 버릴까요?"))
                          setInventory((prev) =>
                            prev.filter((i) => i.id !== item.id),
                          );
                      }}
                    >
                      버리기
                    </button>
                  </div>
                </article>
              ))}
              <button className="primary-btn" onClick={() => setPanel("beach")}>
                해변 수색 <Waves size={17} />
              </button>
            </div>
          )}
          {panel === "beach" && (
            <div className="panel-stack">
              <RuleLink page="52–55" onClick={() => openRules("beach")} />
              <p>
                현재 시를 2로 나누고 올림한 수만큼 카드를 엎어 둡니다. 한 장씩
                뒤집어 물건과 출처를, 이어서 동전으로 상태를 해석하세요.
              </p>
              {!beach && (
                <>
                  <Field label="현재 시 · 24시간 표기">
                    <select
                      value={beachHour}
                      onChange={(e) => setBeachHour(e.target.value)}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {h}시 · {Math.ceil(h / 2)}개
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button className="primary-btn" onClick={beginBeach}>
                    수색 시작
                  </button>
                </>
              )}
              {beach && (
                <>
                  <p className="eyebrow">
                    {beach.hour}시 · {beach.total - beach.remaining} /{" "}
                    {beach.total}개 확인
                  </p>
                  {beach.remaining > 0 && !beach.current && (
                    <>
                      {beachMode === "physical" && (
                        <ManualDraw
                          manual={manual}
                          setManual={setManual}
                          dice={false}
                        />
                      )}
                      <button className="primary-btn" onClick={revealBeach}>
                        {beachMode === "physical"
                          ? "다음 카드 적용"
                          : "다음 카드 뒤집기"}
                      </button>
                    </>
                  )}
                  {beach.current && (
                    <>
                      <Card card={beach.current.card} />
                      <h3>{beach.current.type}</h3>
                      <p>{beach.current.source}</p>
                      {!beach.current.coin ? (
                        <>
                          {beachMode === "physical" && (
                            <Field label="상태 동전">
                              <select
                                value={manual.coin0}
                                onChange={(e) =>
                                  setManual({
                                    ...manual,
                                    coin0: e.target.value,
                                  })
                                }
                              >
                                <option value="heads">앞면</option>
                                <option value="tails">뒷면</option>
                              </select>
                            </Field>
                          )}
                          <button
                            className="primary-btn"
                            onClick={beachCondition}
                          >
                            이제 동전 뒤집기
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="outcome">
                            동전:{" "}
                            {beach.current.coin === "heads" ? "앞면" : "뒷면"} —
                            상태의 두 가능성 중 하나로 해석합니다.
                          </p>
                          <Field label="물건 이름">
                            <input
                              value={beach.current.type}
                              onChange={(e) =>
                                setBeach({
                                  ...beach,
                                  current: {
                                    ...beach.current,
                                    type: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                          <Field
                            label="상태 · 자유 해석"
                            hint="작동/고장, 완전/불완전, 살아 있음/죽음, 회수 가능/불가능 등. 원문은 앞·뒷면의 의미를 고정하지 않습니다."
                          >
                            <input
                              value={beach.current.condition}
                              onChange={(e) =>
                                setBeach({
                                  ...beach,
                                  current: {
                                    ...beach.current,
                                    condition: e.target.value,
                                  },
                                })
                              }
                              placeholder="예: 아직 작동하는 낡은 나침반"
                            />
                          </Field>
                          <Field label="발견 기록">
                            <textarea
                              rows={2}
                              value={beach.current.notes}
                              onChange={(e) =>
                                setBeach({
                                  ...beach,
                                  current: {
                                    ...beach.current,
                                    notes: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                          <div className="stage-actions spread">
                            <button
                              className="quiet-btn"
                              onClick={() => storeBeach(false)}
                            >
                              기록만 남기기
                            </button>
                            <button
                              className="primary-btn"
                              onClick={() => storeBeach(true)}
                            >
                              보관하고 다음으로
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {beach.found.map((item) => (
                    <p key={item.id} className="found-item">
                      {item.kept ? "보관" : "기록"} · {item.type} ·{" "}
                      {item.condition}
                    </p>
                  ))}
                  {beach.remaining === 0 && (
                    <button
                      className="quiet-btn"
                      onClick={() => setBeach(null)}
                    >
                      수색을 마치고 새 수색 준비
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {panel === "light" && (
            <div className="panel-stack">
              <RuleLink page="56–57" onClick={() => openRules("light")} />
              <p>
                작은 랜턴으로 질문을 보내세요. <strong>한 밤에 한 번</strong>,
                동전 두 개로 응답을 판정합니다. 질문은 한 밤에 한 번 가능합니다.
              </p>
              {!shift.lightQuestionAsked && (
                <>
                  <Field label="빛에게 물을 질문">
                    <textarea
                      rows={2}
                      value={lightDraft.question}
                      onChange={(e) =>
                        setLightDraft({
                          ...lightDraft,
                          question: e.target.value,
                        })
                      }
                      placeholder="그곳에는 무엇이 보이나요?"
                    />
                  </Field>
                  {mode === "physical" && (
                    <ManualDraw
                      manual={manual}
                      setManual={setManual}
                      dice={false}
                      coins={2}
                    />
                  )}
                  <button
                    className="primary-btn"
                    disabled={!lightDraft.question.trim()}
                    onClick={askLight}
                  >
                    질문 보내고 동전 두 개 뒤집기
                  </button>
                </>
              )}
              {shift.lightQuestionAsked && (
                <>
                  <p className="outcome">
                    오늘의 질문을 사용했습니다. 다음 밤에 다시 질문할 수
                    있습니다.
                  </p>
                  {shift.phase === 1 && !shift.weatherTitle && (
                    <button
                      className="quiet-btn"
                      onClick={() => {
                        updateShift({ lightQuestionAsked: false });
                        setLightDraft({
                          question: "",
                          response: "",
                          interpretation: "",
                        });
                      }}
                    >
                      별도로 플레이 · 다음 밤의 대화 시작
                    </button>
                  )}
                </>
              )}
              {conversations.map((entry, i) => (
                <article className="conversation" key={entry.id}>
                  <small>
                    {entry.timestamp} · {entry.coinCode}
                  </small>
                  <h3>{entry.question}</h3>
                  <p>{entry.responseType}</p>
                  <details className="inline-rule" open={i === 0}>
                    <summary>응답을 해석하는 단어들</summary>
                    <p>{entry.words}</p>
                  </details>
                  <Field label="내가 해석한 응답">
                    <textarea
                      rows={3}
                      value={entry.interpretation || ""}
                      onChange={(e) =>
                        setConversations((prev) =>
                          prev.map((c) =>
                            c.id === entry.id
                              ? { ...c, interpretation: e.target.value }
                              : c,
                          ),
                        )
                      }
                    />
                  </Field>
                  {duty && (
                    <button
                      className="quiet-btn"
                      onClick={() => {
                        updateShift({
                          pendingDuty: {
                            ...duty,
                            userLog: `${duty.userLog}\n빛에게 ${entry.question}라고 물었다. ${entry.interpretation || entry.responseType}`,
                          },
                        });
                        setPanel(null);
                      }}
                    >
                      현재 기록에 담기
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
          {panel === "seasons" && (
            <div className="panel-stack">
              <RuleLink page="59–67" onClick={() => openRules("seasons")} />
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={seasonEnabled}
                  onChange={(e) => setSeasonEnabled(e.target.checked)}
                />
                선택 확장: 계절 사용
              </label>
              <p>
                관련 날씨를 관측할 때 하루에 표식 하나를 채웁니다. 전부 차면{" "}
                <strong>다음 날</strong> 시작합니다. 직접 고르거나 1d6으로 즉시
                시작할 수도 있습니다.
              </p>
              {seasonEnabled && (
                <>
                  {season && (
                    <div className="active-season">
                      <h3>{activeSeason?.nameKo}</h3>
                      <p>
                        {season.durationLeft}
                        {season.id === 4 ? "밤" : "일"} 남음 · 정해진 기간 동안
                        유지합니다.
                      </p>
                      <div className="stage-actions spread">
                        <button
                          className="quiet-btn"
                          onClick={() =>
                            season.durationLeft <= 1
                              ? endSeason()
                              : setSeason({
                                  ...season,
                                  durationLeft: season.durationLeft - 1,
                                })
                          }
                        >
                          {season.id === 4
                            ? "이야기 속 한 밤 경과"
                            : "이야기 속 하루 경과"}
                        </button>
                        {season.durationLeft % 1 !== 0 && (
                          <button
                            className="quiet-btn"
                            onClick={() =>
                              season.durationLeft <= 0.5
                                ? endSeason()
                                : setSeason({
                                    ...season,
                                    durationLeft: season.durationLeft - 0.5,
                                  })
                            }
                          >
                            반나절 경과
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {mode === "physical" && (
                    <div className="date-fields">
                      <Field label="지속 기간 주사위 1">
                        <select
                          value={manual.die}
                          onChange={(e) =>
                            setManual({
                              ...manual,
                              die: Number(e.target.value),
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="지속 기간 주사위 2">
                        <select
                          value={manual.die2}
                          onChange={(e) =>
                            setManual({
                              ...manual,
                              die2: Number(e.target.value),
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}
                  <button
                    className="quiet-btn"
                    disabled={!!season}
                    onClick={() =>
                      startSeason(mode === "physical" ? manual.die : rollDie())
                    }
                  >
                    1d6으로 계절 즉시 시작
                  </button>
                  {SEASONS.map((s) => (
                    <article className="season-item" key={s.id}>
                      <div className="section-heading">
                        <h3>
                          {s.id}. {s.nameKo}
                        </h3>
                        <span
                          className="season-marks"
                          aria-label={`${Math.min(s.circles, Number(marks[s.id]) || 0)} / ${s.circles} 표식`}
                        >
                          {Array.from({ length: s.circles }, (_, i) => (
                            <i
                              className={i < marks[s.id] ? "filled" : ""}
                              key={i}
                            />
                          ))}
                        </span>
                      </div>
                      <p>
                        {s.triggerWeather} · {s.duration}
                      </p>
                      {pendingSeasons.includes(s.id) && (
                        <p className="warning">
                          모든 표식이 찼습니다. 다음 날이 되면 시작하세요.
                        </p>
                      )}
                      <details className="inline-rule">
                        <summary>징후 · 영향 · 주의할 것</summary>
                        <p>{s.description}</p>
                        <p>전조: {s.warning}</p>
                        <p>특징: {s.characteristics}</p>
                        <p>영향: {s.effects}</p>
                      </details>
                      <div className="stage-actions spread">
                        <button
                          className="quiet-btn"
                          disabled={
                            (signHistory[shift.date] || []).includes(s.id) ||
                            shift.seasonSigns?.includes(s.id) ||
                            season?.id === s.id ||
                            pendingSeasons.includes(s.id)
                          }
                          onClick={() => markWeather(s.id)}
                        >
                          {(signHistory[shift.date] || []).includes(s.id) ||
                          shift.seasonSigns?.includes(s.id)
                            ? "오늘 표식 기록됨"
                            : "관련 날씨 관측 +1"}
                        </button>
                        <button
                          className="quiet-btn"
                          disabled={!!season}
                          onClick={() => startSeason(s.id)}
                        >
                          {pendingSeasons.includes(s.id)
                            ? "다음 날 계절 시작"
                            : "직접 골라 즉시 시작"}
                        </button>
                      </div>
                    </article>
                  ))}
                </>
              )}
            </div>
          )}
          {panel === "settings" && (
            <div className="panel-stack">
              <div className="section-heading">
                <h3>플레이 도구</h3>
                <button className="quiet-btn" onClick={() => setDark(!dark)}>
                  {dark ? <Sun size={17} /> : <Moon size={17} />}
                  {dark ? "종이 화면" : "밤 화면"}
                </button>
              </div>
              <div className="segmented" aria-label="판정 도구 선택">
                <button
                  className={mode === "digital" ? "selected" : ""}
                  onClick={() => setMode("digital")}
                >
                  앱에서 뽑기
                </button>
                <button
                  className={mode === "physical" ? "selected" : ""}
                  onClick={() => setMode("physical")}
                >
                  실제 도구 결과 입력
                </button>
              </div>
              <p className="muted">
                디지털 덱 {deck.length} / 52장 남음. 사용한 카드는 덱에서
                빠지며, 밤을 마칠 때 다시 섞습니다. 덱이 소진되면 재셔플을
                알려드립니다.
              </p>
              <hr />
              <h3>파일로 모든 기록 보관</h3>
              <p>
                작성 중인 밤, 캐릭터, 일지, 소지품, 대화와 계절까지 함께
                백업합니다. 기존 일지 JSON도 가져올 수 있습니다.
              </p>
              <button className="primary-btn" onClick={() => downloadData()}>
                <Download size={17} />
                전체 백업 내려받기
              </button>
              <label className="file-btn">
                <Upload size={17} />
                백업 가져오기
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={importFile}
                />
              </label>
              <hr />
              <h3>
                <Cloud size={18} />
                클라우드 백업
              </h3>
              {user ? (
                <>
                  <p>{user.displayName || user.email}</p>
                  <div className="date-fields">
                    <button
                      className="quiet-btn"
                      disabled={cloudBusy}
                      onClick={() => cloudAction(false)}
                    >
                      클라우드에 올리기
                    </button>
                    <button
                      className="quiet-btn"
                      disabled={cloudBusy}
                      onClick={() => cloudAction(true)}
                    >
                      클라우드에서 복원
                    </button>
                  </div>
                  <button
                    className="quiet-btn"
                    onClick={() =>
                      cloud
                        .signOut(cloud.auth)
                        .catch(() => setNotice("로그아웃에 실패했습니다."))
                    }
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <p>로그인 없이 이 기기에서 플레이할 수 있습니다.</p>
                  <button
                    className="quiet-btn"
                    disabled={!cloud}
                    onClick={login}
                  >
                    Google 계정 연결
                  </button>
                </>
              )}
              <p className="muted">
                클라우드 복원은 직접 실행합니다. 작성 중인 기록을 자동으로
                덮어쓰지 않습니다.
              </p>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}

const TOPICS = [
  {
    id: "loop",
    label: "플레이 순서",
    page: "5, 40–41",
    keywords: "순서 임무 선택 반복",
  },
  {
    id: "beginning",
    label: "날씨와 첫 기록",
    page: "35–37",
    keywords: "감정 기온 바람 소리 관측 시작",
  },
  {
    id: "lighting",
    label: "점등",
    page: "38",
    keywords: "동전 카드 앞면 빨간 태엽 불 재점등",
  },
  {
    id: "maintenance",
    label: "정비",
    page: "42–43",
    keywords: "수리 유지보수 주사위 문양",
  },
  {
    id: "observation",
    label: "관측",
    page: "44–45",
    keywords: "거리 우주 동물 함선 하늘",
  },
  {
    id: "happening",
    label: "사건",
    page: "46–47",
    keywords: "시간 역행 도약 9 K 소등 4 심각 결과",
  },
  {
    id: "ending",
    label: "마무리",
    page: "48–49",
    keywords: "종료 셔플 소등 성찰",
  },
  {
    id: "beach",
    label: "해변 수색",
    page: "52–55",
    keywords: "미니게임 물건 출처 상태 동전 수색",
  },
  {
    id: "light",
    label: "어둠 속의 빛",
    page: "56–57",
    keywords: "미니게임 교신 질문 응답 동전",
  },
  {
    id: "seasons",
    label: "계절",
    page: "59–67",
    keywords: "확장 표식 징후 지속 기간 날씨",
  },
  {
    id: "glossary",
    label: "용어",
    page: "84 + Logbook",
    keywords: "glitter backwash wrecker 단위 바람",
  },
  {
    id: "inspiration",
    label: "선대의 일지",
    page: "70–82",
    keywords: "예시 영감 기록 선대",
  },
];
function RuleReference({ topic, setTopic, search, setSearch }) {
  const filtered = TOPICS.filter((t) =>
    `${t.label} ${t.keywords}`.toLowerCase().includes(search.toLowerCase()),
  );
  const visible = search ? filtered : TOPICS.filter((t) => t.id === topic);
  return (
    <div className="reference">
      <div className="search-field">
        <Search size={18} />
        <input
          aria-label="규칙 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="점등, 거리, 시간 역행…"
        />
      </div>
      <div className="rule-topics">
        {TOPICS.map((t) => (
          <button
            className={topic === t.id && !search ? "selected" : ""}
            key={t.id}
            onClick={() => {
              setTopic(t.id);
              setSearch("");
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="empty-note">
          찾는 규칙이 없습니다. 위의 주제로 찾아보세요.
        </p>
      )}
      {visible.map((t) => (
        <section className="rule-section" key={t.id}>
          <div className="section-heading">
            <h2>{t.label}</h2>
            <span className="page-ref">p.{t.page}</span>
          </div>
          {t.id === "loop" && (
            <>
              <ol className="rule-steps">
                <li>
                  <strong>시작은 한 번</strong>
                  <p>
                    날짜·시간 → 감정으로 날씨 선택과 기록 → 점등 → 태엽 감기.
                  </p>
                </li>
                <li>
                  <strong>밤의 일은 자유롭게 반복</strong>
                  <p>
                    관측·정비·사건 선택 → 도구로 판정 → 해석하고 기록 → 다시
                    선택.
                  </p>
                </li>
                <li>
                  <strong>만족할 때 마무리</strong>
                  <p>
                    소등 → 밤의 분위기에 따라 1–4회 덱 섞기 → 마지막 소감 →
                    로그북 보관.
                  </p>
                </li>
              </ol>
              <p>
                정해진 임무 수나 승패는 없습니다. 자신 또는 캐릭터의 시점으로
                짧게든 길게든 기록합니다.
              </p>
              <div className="reference-table">
                <p>
                  <strong>관측</strong>불안함 · 평온함 · 잘 모르겠음
                </p>
                <p>
                  <strong>정비</strong>사나움 · 추움 · 무더움 · 이상함
                </p>
                <p>
                  <strong>사건</strong>불확실함 · 조용하고 방해받지 않음 ·
                  시끄럽고 혼란스러움
                </p>
              </div>
            </>
          )}
          {t.id === "beginning" && (
            <>
              <p>
                나 또는 캐릭터의 현재 감정으로 날씨를 선택합니다. 기온, 풍경,
                소리와 그 날씨가 하루에 미친 영향을 자유롭게 적습니다.
              </p>
              {WEATHER_PATTERNS.map((w) => (
                <div className="reference-row" key={w.id}>
                  <strong>{w.mood}</strong>
                  <p>{w.description}</p>
                </div>
              ))}
            </>
          )}
          {t.id === "lighting" && (
            <>
              <p>
                <strong>동전 앞면 + 빨간 카드가 동시에 나와야 성공.</strong>{" "}
                실패하면 두 도구를 다시 뒤집습니다. 어렵게 켰다면 그 이유를 한
                문장으로 적습니다.
              </p>
              <p>
                불이 붙으면 태엽 장치를 감아 빛을 회전시킵니다. 사건으로 등불이
                꺼지면 같은 절차로 다시 켭니다.
              </p>
            </>
          )}
          {t.id === "maintenance" && (
            <>
              <p>
                1. 주사위로 무엇을 돌볼지 → 2. 카드 무늬로 일이 어떻게
                진행되는지 → 3. 과정과 변화, 어려움을 기록.
              </p>
              {MAINTENANCE_TASKS.map((d) => (
                <div className="reference-row" key={d.id}>
                  <strong>
                    {d.id}. {d.title}
                  </strong>
                  <p>{d.examples}</p>
                </div>
              ))}
              <div className="reference-table">
                <p>
                  <strong>♠ 스페이드</strong>완료할 때 예상치 못한 일
                </p>
                <p>
                  <strong>♣ 클럽</strong>일이 유리하게 풀리지 않음
                </p>
                <p>
                  <strong>♥ 하트</strong>일을 하며 기억이 떠오름
                </p>
                <p>
                  <strong>♦ 다이아몬드</strong>일이 유리하게 풀림
                </p>
              </div>
              <p>
                플레이북의 강점과 어려움은 서사 단서입니다. 판정 결과를
                수정하거나 성공·실패를 추가하지 않습니다.
              </p>
            </>
          )}
          {t.id === "observation" && (
            <>
              <p>
                1. 주사위로 대상 → 2. 카드 무늬로 거리 → 3. 관측과 느낌을 기록.
              </p>
              {OBSERVATION_CATEGORIES.map((d) => (
                <div className="reference-row" key={d.id}>
                  <strong>
                    {d.id}. {d.title}
                  </strong>
                  <p>{d.examples}</p>
                </div>
              ))}
              <div className="reference-table">
                <p>
                  <strong>♠ 스페이드</strong>멀리 있는 작은 점, 섬광, 얼룩
                </p>
                <p>
                  <strong>♣ 클럽</strong>안전한 거리, 등대 빛 바로 바깥
                </p>
                <p>
                  <strong>♥ 하트</strong>섬에서 팔을 뻗으면 닿을 거리
                </p>
                <p>
                  <strong>♦ 다이아몬드</strong>머리 위
                </p>
              </div>
            </>
          )}
          {t.id === "happening" && (
            <>
              <p>
                카드 한 장. <strong>숫자는 사건</strong>,{" "}
                <strong>색은 결과의 크기</strong>입니다.
              </p>
              <p>빨강: 오래 남는 결과. 검정: 작은 중단이나 불편.</p>
              {Object.entries(HAPPENINGS).map(([value, event]) => (
                <div className="reference-row" key={value}>
                  <strong>
                    {value}. {event.title}
                  </strong>
                  <p>{event.description}</p>
                </div>
              ))}
            </>
          )}
          {t.id === "ending" && (
            <>
              <p>
                플레이를 종료할 때 소등합니다. 밤의 분위기에 맞게 덱을 섞습니다.
              </p>
              <div className="reference-table">
                {Object.entries(INTENSITIES).map(([id, text]) => (
                  <p key={id}>
                    <strong>{closingShuffleCount(id)}회</strong>
                    {text}
                  </p>
                ))}
              </div>
              <p>
                지금의 기분, 해낸 것, 해결한 것, 미완의 것, 기억에 남을 것을
                적고 로그북을 제자리에 둡니다.
              </p>
            </>
          )}
          {t.id === "beach" && (
            <>
              <p>
                현재 시 ÷ 2, 나누어떨어지지 않으면 올림. 그 수만큼 카드를 엎어
                놓고 한 장씩 확인합니다.
              </p>
              <p>
                카드 숫자 → 물건 종류. 빨강 → 알려진 출처. 검정 → 알려지지 않은
                출처. 이어서 동전 → 작동/고장, 완전/불완전, 생존/죽음 등 상태의
                두 가능성. 앞·뒷면의 고정 의미는 없습니다.
              </p>
              <p>
                발견을 기록하고 필요한 것을 보관한 뒤 다음 카드로 갑니다. 보관한
                물건은 다음 세션에도 사용할 수 있습니다.
              </p>
              {Object.entries(BEACHCOMBING_ITEMS).map(([value, text]) => (
                <div className="reference-row" key={value}>
                  <strong>{value}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </>
          )}
          {t.id === "light" && (
            <>
              <p>
                질문을 보내고 동전 두 개로 응답을 해석합니다. 한 밤에 응답은 한
                번. 여러 밤에 걸쳐 빛의 정체를 알아갑니다.
              </p>
              {Object.entries(LIGHT_IN_THE_DARK).map(([code, result]) => (
                <div className="reference-row" key={code}>
                  <strong>
                    {code === "HH"
                      ? "앞면 + 앞면"
                      : code === "TT"
                        ? "뒷면 + 뒷면"
                        : "앞면 + 뒷면 (순서 무관)"}
                  </strong>
                  <p>{result.words.join(", ")}</p>
                </div>
              ))}
            </>
          )}
          {t.id === "seasons" && (
            <>
              <p>
                선택 확장입니다. 관련 날씨를 관측하며 표식을 채우면 다음 날
                시작하고, 끝날 때 표식을 비웁니다. 날씨를 살피며 직접 고르거나
                1d6으로 즉시 시작할 수도 있습니다. 지정된 기간을 유지합니다.
              </p>
              {SEASONS.map((s) => (
                <div className="reference-row" key={s.id}>
                  <strong>
                    {s.id}. {s.nameKo}
                  </strong>
                  <p>
                    {s.triggerWeather} · {s.circles}표식 · {s.duration}
                  </p>
                  <p>{s.description}</p>
                </div>
              ))}
              <p className="muted">
                이 도구는 이야기 속 하루/반나절을 직접 기록합니다. 타격의 계절은
                원문대로 1d6 ÷ 2를 사용하며, 원문에 반올림 규정은 없습니다.
              </p>
            </>
          )}
          {t.id === "glossary" && (
            <>
              {Object.entries(GLOSSARY).map(([term, meaning]) => (
                <div className="reference-row" key={term}>
                  <strong>{term}</strong>
                  <p>{meaning}</p>
                </div>
              ))}
            </>
          )}
          {t.id === "inspiration" && (
            <>
              <p className="muted">
                선대 일지의 상황을 한국어로 요약했습니다. 원문 인용이 아닙니다.
              </p>
              {PAST_KEEPERS_LOGS.map((entry, i) => (
                <div className="reference-row" key={i}>
                  <strong>{entry.keeper}</strong>
                  <p>{entry.content}</p>
                </div>
              ))}
            </>
          )}
        </section>
      ))}
    </div>
  );
}

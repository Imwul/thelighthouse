/* Run against a dev/preview server: LIGHTHOUSE_URL=http://127.0.0.1:5173 npm run test:browser */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const base = process.env.LIGHTHOUSE_URL || "http://127.0.0.1:5173";
const output = process.env.LIGHTHOUSE_SCREENSHOTS || "/tmp/lighthouse-browser";
const standard = {
  phase: 3,
  date: "2026-10-08",
  time: "22:00",
  moodId: "happy",
  weatherTitle: "차갑고 맑은 밤",
  weatherDesc: "맑은 밤",
  isLampLit: true,
  isClockworkWound: true,
  lightingAttempts: 2,
  lightingDifficulty: "젖은 심지",
  duties: [],
  remarks: "",
};
const readShift = (p) =>
  p.evaluate(() =>
    JSON.parse(localStorage.getItem("lighthouse_current_shift")),
  );
const close = (p) =>
  p.getByRole("button", { name: "패널 닫기", exact: true }).click();
const press = (p, name) =>
  p
    .getByRole(
      "button",
      name === "일지" ? { name: /^일지(?:\s*\d+)?$/ } : { name, exact: true },
    )
    .click();
async function seed(p, data) {
  await p.evaluate((entries) => {
    window.name = "lighthouseSeed:" + JSON.stringify(entries);
  }, data);
  await p.reload();
  await p.getByRole("button", { name: "오늘 밤", exact: true }).waitFor();
}
async function pendingEvent(p, value) {
  await p
    .getByRole("button", { name: /^사건우주|^사건일어나는|^사건/ })
    .click();
  await p.getByLabel("카드 숫자", { exact: true }).selectOption(value);
  await press(p, "판정 적용");
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.LIGHTHOUSE_CHROMIUM
      ? { executablePath: process.env.LIGHTHOUSE_CHROMIUM }
      : {}),
  });
  await fs.mkdir(output, { recursive: true });
  const failures = [],
    pageErrors = [],
    results = [];
  async function run(name, task) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
    });
    await context.addInitScript(() => {
      if (window.name.startsWith("lighthouseSeed:")) {
        const entries = JSON.parse(window.name.slice(15));
        localStorage.clear();
        for (const [key, value] of Object.entries(entries))
          localStorage.setItem(
            key,
            typeof value === "string" ? value : JSON.stringify(value),
          );
        window.name = "";
      }
    });
    const p = await context.newPage();
    p.setDefaultTimeout(8000);
    p.on("pageerror", (e) => pageErrors.push(`${name}: ${e.message}`));
    await p.goto(base, { waitUntil: "domcontentloaded" });
    await p.locator("main h1").waitFor();
    try {
      await task(p);
      results.push(name);
      console.log(`PASS ${name}`);
    } catch (error) {
      failures.push(`${name}: ${error.stack}`);
      console.error(`FAIL ${name}: ${error.message}`);
      await p.screenshot({
        path: path.join(output, `failure-${results.length}.png`),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  }
  await run(
    "complete session, separate winding, draft reload, edits and empty ending",
    async (p) => {
      await seed(p, {});
      assert.match((await readShift(p)).date, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal((await readShift(p)).lightingAttempts, 0);
      await p.getByRole("button", { name: /행복함.*차갑고 맑은 밤/ }).click();
      await p.getByLabel("기온", { exact: true }).fill("12°C");
      await p
        .getByLabel("바람 · 소리", { exact: true })
        .fill("창문에 부딪히는 별가루");
      await p.getByLabel("첫 관측 기록").fill("오늘은 마음이 가볍다.");
      await press(p, "등불 켜기");
      await press(p, "보관 및 설정");
      await press(p, "실제 도구 결과 입력");
      await close(p);
      await p.getByLabel("동전 1", { exact: true }).selectOption("tails");
      await press(p, "점등 결과 적용");
      assert.equal((await readShift(p)).isLampLit, false);
      await p.getByLabel("동전 1", { exact: true }).selectOption("heads");
      await press(p, "점등 결과 적용");
      assert.equal((await readShift(p)).isLampLit, true);
      assert.equal((await readShift(p)).isClockworkWound, false);
      await p
        .getByLabel("점등이 어려웠던 이유", { exact: true })
        .fill("젖은 심지였다.");
      await press(p, "태엽 감고 밤 시작");
      assert.equal((await readShift(p)).isClockworkWound, true);
      await p.getByRole("button", { name: /^관측.*우주/ }).click();
      await p.getByLabel("주사위", { exact: true }).selectOption("3");
      await p
        .getByLabel("카드 무늬", { exact: true })
        .selectOption("다이아몬드");
      await press(p, "판정 적용");
      await p.getByLabel("임무 기록").fill("머리 위로 밝은 고리가 지나갔다.");
      await p.reload();
      assert.equal(
        (await readShift(p)).pendingDuty.userLog,
        "머리 위로 밝은 고리가 지나갔다.",
      );
      await p.getByRole("button", { name: /규칙 p.44/ }).click();
      assert.match(await p.getByRole("dialog").innerText(), /머리 위/);
      await close(p);
      await p.screenshot({
        path: path.join(output, "play-desktop.png"),
        fullPage: true,
      });
      await press(p, "기록하고 다음 일 선택");
      assert.equal((await readShift(p)).duties.length, 1);
      await p.getByRole("button", { name: /^정비.*등대/ }).click();
      await press(p, "판정 적용");
      await press(p, "기록하고 다음 일 선택");
      assert.equal((await readShift(p)).duties.length, 2);
      await press(p, "밤 마무리");
      assert.equal((await readShift(p)).isLampLit, false);
      await p
        .getByLabel("오늘 밤의 분위기", { exact: true })
        .selectOption("quiet");
      await press(p, "소등 · 덱 1회 섞었음 표시");
      await press(p, "일지 저장");
      const journals = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("lighthouse_journals")),
      );
      assert.equal(journals.length, 1);
      assert.equal(journals[0].temp, "12°C");
      assert.equal(journals[0].initialObservations, "오늘은 마음이 가볍다.");
      assert.equal(journals[0].lightingDifficulty, "젖은 심지였다.");
      assert.equal(journals[0].remarks, "");
      assert.equal(journals[0].shuffledCount, 1);
    },
  );
  await run(
    "events 4, 9, K preserve records and enforce their procedure",
    async (p) => {
      for (const value of ["4", "9", "K"]) {
        await seed(p, {
          lighthouse_current_shift: {
            ...standard,
            duties: [
              {
                id: "old",
                type: "observation",
                details: "이전 관측",
                userLog: "지워지면 안 된다.",
              },
            ],
          },
          lighthouse_draw_mode: '"physical"',
        });
        await pendingEvent(p, value);
        if (value === "4") assert.equal((await readShift(p)).isLampLit, false);
        assert.equal(
          await p
            .getByRole("button", { name: "밤 마무리", exact: true })
            .count(),
          0,
        );
        await press(
          p,
          value === "4"
            ? "기록하고 다시 점등"
            : value === "9"
              ? "기록하고 밤 마무리"
              : "기록을 남기고 밤 다시 시작",
        );
        const s = await readShift(p);
        assert.equal(s.phase, value === "4" ? 2 : value === "9" ? 4 : 1);
        assert.equal(s.duties.length, 2);
        assert.equal(s.duties[0].userLog, "지워지면 안 된다.");
        assert.equal(s.pendingDuty, null);
      }
    },
  );
  await run("digital deck and all closing shuffle intensities", async (p) => {
    await seed(p, { lighthouse_current_shift: standard });
    const before = await p.evaluate(
      () => JSON.parse(localStorage.getItem("lighthouse_deck")).length,
    );
    await p.getByRole("button", { name: /^관측.*우주/ }).click();
    assert.equal(
      await p.evaluate(
        () => JSON.parse(localStorage.getItem("lighthouse_deck")).length,
      ),
      before - 1,
    );
    await press(p, "기록하고 다음 일 선택");
    await press(p, "밤 마무리");
    for (const [id, n] of [
      ["quiet", 1],
      ["steady", 2],
      ["busy", 3],
      ["crazy", 4],
    ]) {
      await p.getByLabel("오늘 밤의 분위기", { exact: true }).selectOption(id);
      await press(p, `소등 · 덱 ${n}회 섞기`);
      assert.equal((await readShift(p)).shuffledCount, n);
      assert.equal(
        await p.evaluate(
          () => JSON.parse(localStorage.getItem("lighthouse_deck")).length,
        ),
        52,
      );
    }
  });
  await run(
    "sequential beach card/coin, retained finds and reusable inventory",
    async (p) => {
      await seed(p, {
        lighthouse_current_shift: standard,
        lighthouse_draw_mode: '"physical"',
      });
      await p.getByRole("button", { name: /해변 수색.*발견/ }).click();
      await p
        .getByLabel("현재 시 · 24시간 표기", { exact: true })
        .selectOption("3");
      await press(p, "수색 시작");
      await p.getByLabel("카드 숫자", { exact: true }).selectOption("7");
      await press(p, "다음 카드 적용");
      assert.equal(await p.getByLabel("상태 · 자유 해석").count(), 0);
      await press(p, "이제 동전 뒤집기");
      await p.getByLabel("물건 이름", { exact: true }).fill("낡은 나침반");
      await p.getByLabel("상태 · 자유 해석").fill("아직 작동함");
      await press(p, "보관하고 다음으로");
      await press(p, "다음 카드 적용");
      await press(p, "이제 동전 뒤집기");
      await press(p, "기록만 남기기");
      const inv = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("lighthouse_inventory")),
      );
      assert.equal(inv.length, 1);
      assert.equal(inv[0].type, "낡은 나침반");
      assert.equal((await readShift(p)).duties.length, 2);
      await press(p, "수색을 마치고 새 수색 준비");
      assert.equal((await readShift(p)).duties.length, 2);
      await close(p);
      await p.getByRole("button", { name: /^정비.*등대/ }).click();
      await press(p, "판정 적용");
      await press(p, "소지품 참고");
      await press(p, "현재 기록에 사용");
      assert.match((await readShift(p)).pendingDuty.userLog, /낡은 나침반/);
      assert.equal(
        await p.evaluate(
          () => JSON.parse(localStorage.getItem("lighthouse_inventory")).length,
        ),
        1,
      );
    },
  );
  await run(
    "digital beach reserves a unique face-down packet across other draws, shuffles and reloads",
    async (p) => {
      await seed(p, {
        lighthouse_current_shift: standard,
        lighthouse_deck: [{ value: "A", suit: "하트", color: "적색" }],
      });
      await p.getByRole("button", { name: /해변 수색.*발견/ }).click();
      await p
        .getByLabel("현재 시 · 24시간 표기", { exact: true })
        .selectOption("3");
      await press(p, "수색 시작");
      const search = () =>
        p.evaluate(() =>
          JSON.parse(localStorage.getItem("lighthouse_beach_search")),
        );
      const deckSize = () =>
        p.evaluate(
          () => JSON.parse(localStorage.getItem("lighthouse_deck")).length,
        );
      const packet = (await search()).reservedCards;
      assert.equal(packet.length, 2);
      assert.equal(await deckSize(), 50);
      assert.notDeepEqual(packet[0], packet[1]);
      await press(p, "다음 카드 뒤집기");
      assert.deepEqual((await search()).current.card, packet[0]);
      await press(p, "이제 동전 뒤집기");
      await press(p, "기록만 남기기");
      await close(p);
      await p.getByRole("button", { name: /^관측.*우주/ }).click();
      await press(p, "기록하고 다음 일 선택");
      assert.equal(await deckSize(), 49);
      await press(p, "밤 마무리");
      await press(p, "소등 · 덱 2회 섞기");
      await press(p, "보관 및 설정");
      await press(p, "실제 도구 결과 입력");
      await close(p);
      await p.getByRole("button", { name: /해변 수색.*발견/ }).click();
      assert.deepEqual((await search()).reservedCards, [packet[1]]);
      await press(p, "다음 카드 뒤집기");
      assert.deepEqual((await search()).current.card, packet[1]);
      assert.equal(await deckSize(), 52);
      await p.reload();
      assert.deepEqual((await search()).current.card, packet[1]);
      assert.deepEqual((await search()).reservedCards, []);
    },
  );
  await run(
    "light answers once a night with full vocabulary and saved interpretation",
    async (p) => {
      await seed(p, {
        lighthouse_current_shift: standard,
        lighthouse_draw_mode: '"physical"',
      });
      await p.getByRole("button", { name: /어둠 속의 빛.*밤마다/ }).click();
      await p
        .getByLabel("빛에게 물을 질문", { exact: true })
        .fill("그곳은 어디인가요?");
      await press(p, "질문 보내고 동전 두 개 뒤집기");
      assert.equal((await readShift(p)).lightQuestionAsked, true);
      assert.equal(
        await p
          .getByRole("button", {
            name: "질문 보내고 동전 두 개 뒤집기",
            exact: true,
          })
          .count(),
        0,
      );
      await p
        .getByLabel("내가 해석한 응답", { exact: true })
        .fill("따뜻한 곳에서 기다리는 듯하다.");
      await close(p);
      await p.reload();
      await p.getByRole("button", { name: /어둠 속의 빛.*오늘의/ }).click();
      assert.equal(
        await p.getByLabel("내가 해석한 응답", { exact: true }).inputValue(),
        "따뜻한 곳에서 기다리는 듯하다.",
      );
      const entries = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("lighthouse_light_conversations")),
      );
      assert.ok(entries[0].words.split(",").length > 20);
    },
  );
  await run(
    "optional seasons, once per fictional date, next-day queue and half-day duration",
    async (p) => {
      await seed(p, {
        lighthouse_current_shift: standard,
        lighthouse_draw_mode: '"physical"',
        lighthouse_season_marks: { 1: 4 },
        lighthouse_seasons_enabled: true,
      });
      await p.getByRole("button", { name: /^계절/ }).click();
      const storm = p
        .locator(".season-item")
        .filter({ has: p.getByRole("heading", { name: /^1\./ }) });
      await storm
        .getByRole("button", { name: "관련 날씨 관측 +1", exact: true })
        .click();
      assert.equal(
        await p.evaluate(() =>
          JSON.parse(localStorage.getItem("lighthouse_active_season")),
        ),
        null,
      );
      assert.deepEqual(
        await p.evaluate(() =>
          JSON.parse(localStorage.getItem("lighthouse_pending_seasons")),
        ),
        [1],
      );
      assert.equal(
        await storm
          .getByRole("button", { name: "오늘 표식 기록됨", exact: true })
          .isDisabled(),
        true,
      );
      await storm
        .getByRole("button", { name: "다음 날 계절 시작", exact: true })
        .click();
      assert.equal(
        await p.evaluate(
          () =>
            JSON.parse(localStorage.getItem("lighthouse_active_season"))
              .durationLeft,
        ),
        4,
      );
      for (let i = 0; i < 4; i++) await press(p, "이야기 속 하루 경과");
      assert.equal(
        await p.evaluate(
          () => JSON.parse(localStorage.getItem("lighthouse_season_marks"))[1],
        ),
        0,
      );
      await p
        .getByLabel("지속 기간 주사위 1", { exact: true })
        .selectOption("3");
      const striking = p
        .locator(".season-item")
        .filter({ has: p.getByRole("heading", { name: /^6\./ }) });
      await striking
        .getByRole("button", { name: "직접 골라 즉시 시작", exact: true })
        .click();
      assert.equal(
        await p.evaluate(
          () =>
            JSON.parse(localStorage.getItem("lighthouse_active_season"))
              .durationLeft,
        ),
        1.5,
      );
      await press(p, "반나절 경과");
      assert.equal(
        await p.evaluate(
          () =>
            JSON.parse(localStorage.getItem("lighthouse_active_season"))
              .durationLeft,
        ),
        1,
      );
      await press(p, "이야기 속 하루 경과");
      const warm = p
        .locator(".season-item")
        .filter({ has: p.getByRole("heading", { name: /^4\./ }) });
      await warm
        .getByRole("button", { name: "직접 골라 즉시 시작", exact: true })
        .click();
      assert.match(await p.getByRole("dialog").innerText(), /3밤 남음/);
      for (let n = 0; n < 3; n++) await press(p, "이야기 속 한 밤 경과");
      assert.equal(
        await p.evaluate(() =>
          JSON.parse(localStorage.getItem("lighthouse_active_season")),
        ),
        null,
      );
    },
  );
  await run(
    "complete backup round-trip, malformed refusal and legacy imports",
    async (p) => {
      await seed(p, {
        lighthouse_current_shift: standard,
        lighthouse_inventory: [
          {
            id: "item",
            type: "도구",
            card: { value: "7", suit: "하트", color: "적색" },
            source: "알려진 출처",
            condition: "작동",
            notes: "오래된 도구",
          },
        ],
      });
      await press(p, "보관 및 설정");
      const downloadEvent = p.waitForEvent("download");
      await press(p, "전체 백업 내려받기");
      const download = await downloadEvent;
      const data = JSON.parse(await fs.readFile(await download.path(), "utf8"));
      const { validateBackup } = await import("../src/game.js");
      assert.equal(validateBackup(data).persistentInventory.length, 1);
      p.on("dialog", (dialog) => dialog.accept());
      await p.locator("input[type=file]").setInputFiles({
        name: "backup.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(data)),
      });
      assert.equal((await readShift(p)).phase, 3);
      const before = await p.evaluate(() =>
        localStorage.getItem("lighthouse_current_shift"),
      );
      await p.locator("input[type=file]").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ journals: [], lightDraft: null })),
      });
      assert.equal(
        await p.evaluate(() =>
          localStorage.getItem("lighthouse_current_shift"),
        ),
        before,
      );
      await p.locator("input[type=file]").setInputFiles({
        name: "legacy.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify([
            { id: "legacy", weather: "옛 밤", remarks: "이어지는 기억" },
          ]),
        ),
      });
      assert.equal((await readShift(p)).phase, 3);
      await close(p);
      await press(p, "일지");
      assert.match(await p.locator("main").innerText(), /옛 밤/);
      await press(p, "보관 및 설정");
      await p.locator("input[type=file]").setInputFiles({
        name: "partial.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            journals: [],
            keeperProfile: { name: "복원한 지기" },
          }),
        ),
      });
      await close(p);
      await press(p, "오늘 밤");
      await p
        .getByRole("button", { name: "나 자신으로 플레이", exact: true })
        .click();
      await close(p);
    },
  );
  await run(
    "responsive layouts, rule links after search, dialog keyboard and night theme",
    async (p) => {
      await seed(p, {
        lighthouse_current_shift: standard,
        lighthouse_draw_mode: '"physical"',
      });
      await press(p, "규칙 찾기");
      await p
        .getByRole("textbox", { name: "규칙 검색", exact: true })
        .fill("점등");
      await press(p, "오늘 밤");
      await p.getByRole("button", { name: /^정비.*등대/ }).click();
      await press(p, "판정 적용");
      await p.getByRole("button", { name: /규칙 p.42/ }).click();
      assert.match(await p.getByRole("dialog").innerText(), /p.42–43/);
      assert.equal(
        await p
          .getByRole("textbox", { name: "규칙 검색", exact: true })
          .inputValue(),
        "",
      );
      await p.keyboard.press("Escape");
      assert.equal(await p.getByRole("dialog").count(), 0);
      assert.match(
        await p.evaluate(() => document.activeElement.textContent),
        /규칙 p.42/,
      );
      for (const width of [320, 390, 768, 1440, 3440]) {
        await p.setViewportSize({ width, height: 900 });
        const measure = await p.evaluate(() => ({
          w: innerWidth,
          s: document.documentElement.scrollWidth,
        }));
        assert.equal(measure.w, measure.s, `viewport ${width}`);
        if (width === 3440) {
          const bounds = await p.locator(".play-desk").boundingBox();
          assert.ok(
            bounds.width <= 1000,
            "ultrawide writing area stays readable",
          );
          assert.ok(bounds.x > 800, "ultrawide workspace stays centered");
        }
        await p.screenshot({
          path: path.join(output, `play-${width}.png`),
          fullPage: true,
        });
        if (width < 480) {
          await press(p, "도구");
          await p
            .getByRole("dialog")
            .getByRole("button", { name: "소지품 0", exact: true })
            .click();
          await p.keyboard.press("Escape");
        }
      }
      await press(p, "보관 및 설정");
      await press(p, "밤 화면");
      await close(p);
      await p.screenshot({
        path: path.join(output, "play-night.png"),
        fullPage: true,
      });
      assert.equal(
        await p.evaluate(() => document.documentElement.dataset.theme),
        "night",
      );
    },
  );
  await run(
    "corrupt local state recovers without losing raw backups",
    async (p) => {
      await seed(p, {
        lighthouse_keeper_profile: "{broken",
        lighthouse_beach_search: { found: "oops" },
        lighthouse_light_draft: null,
        lighthouse_inventory: [{ type: { oops: true } }],
        lighthouse_current_shift: {
          ...standard,
          pendingDuty: {
            type: "observation",
            details: "우주",
            userLog: "복원할 문장",
          },
        },
      });
      assert.equal((await readShift(p)).pendingDuty.userLog, "복원할 문장");
      await press(p, "보관 및 설정");
      await close(p);
      await p.getByRole("button", { name: /해변 수색.*발견/ }).click();
      await close(p);
      assert.ok(
        await p.evaluate(() =>
          localStorage.getItem("lighthouse_keeper_profile_unreadable_backup"),
        ),
      );
      assert.ok(
        await p.evaluate(() =>
          localStorage.getItem("lighthouse_beach_search_unreadable_backup"),
        ),
      );
    },
  );
  await browser.close();
  assert.equal(
    pageErrors.length,
    0,
    `Browser errors:\n${pageErrors.join("\n")}`,
  );
  if (failures.length) throw new Error(failures.join("\n\n"));
  console.log(
    `\n${results.length} browser scenarios passed. Screenshots: ${output}`,
  );
})();

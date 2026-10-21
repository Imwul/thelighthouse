/* Visual/state audit of a running production preview, with isolated disposable data. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const output = process.env.LIGHTHOUSE_SCREENSHOTS || "/tmp/lighthouse-quality";
const base = process.env.LIGHTHOUSE_URL || "http://127.0.0.1:5173";
const long = "항해일지와별빛의기억".repeat(16);
const shift = { phase: 3, date: "2026-10-21", time: "22:00", moodId: "happy", weatherTitle: "차갑고 맑은 밤", isLampLit: true, isClockworkWound: true, duties: [] };
const dataset = {
  lighthouse_current_shift: shift,
  lighthouse_journals: Array.from({ length: 3 }, (_, i) => ({ id: `night-${i}`, date: `2026-10-${21-i}`, time: "22:00", weather: i ? "빛과 파도가 교차한 밤" : long, keeperName: "먼 항로의 등대지기", initialObservations: "서쪽 수평선에 빛이 고였다.\n".repeat(20), dutiesRaw: [{ details: long, userLog: "별빛을 기다리며 쓴 기록.\n".repeat(25) }], remarks: "다음 밤에도 같은 빛이 보일까?" })),
  lighthouse_inventory: [{ id: "compass", type: long, condition: "작동함", notes: long }],
  lighthouse_light_conversations: [{ id: "answer", question: long, words: "기억, 바람, 따뜻함", interpretation: long }],
  lighthouse_seasons_enabled: true,
};
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.LIGHTHOUSE_CHROMIUM ? { executablePath: process.env.LIGHTHOUSE_CHROMIUM } : {}) });
  const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
  await context.addInitScript(() => {
    if (window.name.startsWith("quality:")) {
      const entries = JSON.parse(window.name.slice(8));
      localStorage.clear();
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, JSON.stringify(value));
      window.name = "";
    }
  });
  const p = await context.newPage();
  p.setDefaultTimeout(8000);
  const errors = [], checks = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const press = (name) => p.getByRole("button", { name, exact: true }).click();
  const close = () => press("패널 닫기");
  async function seed(entries) {
    await p.evaluate((value) => { window.name = "quality:" + JSON.stringify(value); }, entries);
    await p.reload();
    await p.locator("main h1").waitFor();
  }
  async function inspect(label, screenshot = false) {
    const measure = await p.evaluate(() => {
      const sheet = document.querySelector(".sheet-body");
      const visible = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
      const scope = sheet || document.querySelector("main");
      const unnamed = [...scope.querySelectorAll("button")].filter((el) => visible(el) && !el.textContent.trim() && !el.getAttribute("aria-label")).length;
      const unlabelled = [...scope.querySelectorAll("input,select,textarea")].filter((el) => visible(el) && !el.labels?.length && !el.getAttribute("aria-label")).length;
      return { viewport: innerWidth, page: document.documentElement.scrollWidth, sheet: sheet ? [sheet.clientWidth, sheet.scrollWidth] : null, unnamed, unlabelled };
    });
    assert.ok(measure.page <= measure.viewport + 1, `${label}: page overflow ${JSON.stringify(measure)}`);
    if (measure.sheet) assert.ok(measure.sheet[1] <= measure.sheet[0] + 1, `${label}: sheet overflow ${JSON.stringify(measure)}`);
    assert.equal(measure.unnamed, 0, `${label}: unnamed buttons`);
    assert.equal(measure.unlabelled, 0, `${label}: unlabelled fields`);
    checks.push({ label, ...measure });
    if (screenshot) await p.screenshot({ path: path.join(output, `${label}.jpg`), fullPage: true, quality: 80 });
  }
  try {
    await p.goto(base, { waitUntil: "domcontentloaded" });
    for (const width of [320, 390, 768, 1440, 3440]) {
      await p.setViewportSize({ width, height: 900 });
      for (const dark of [false, true]) {
        const tag = `${width}-${dark ? "night" : "paper"}`;
        await seed({ ...dataset, lighthouse_dark: dark });
        await inspect(`${tag}-duties`, true);
        await p.getByRole("button", { name: /^일지(?:\s*\d+)?$/ }).click();
        await inspect(`${tag}-journal`, true);
        assert.ok((await p.locator(".journal-summary").first().boundingBox()).height < 200, "long titles keep the archive scannable");
        await p.locator(".journal-summary").first().click();
        await inspect(`${tag}-long-journal`, width === 320 || width === 1440);
        await p.getByLabel("일지 검색", { exact: true }).fill("없는기록");
        await inspect(`${tag}-empty-search`);
        await press("규칙 찾기");
        const topics = await p.locator(".rule-topics button").allTextContents();
        for (const topic of topics) {
          await p.locator(".rule-topics").getByRole("button", { name: topic, exact: true }).click();
          await inspect(`${tag}-rule-${topic}`);
        }
        await p.locator(".rule-topics").getByRole("button", { name: "플레이 순서", exact: true }).click();
        await inspect(`${tag}-reference`, true);
        await press("오늘 밤");
        for (const [panel, name] of [["keeper", /나 자신으로 플레이/], ["beach", /^해변 수색/], ["light", /^어둠 속의 빛/], ["inventory", /^소지품/], ["seasons", /^계절/]]) {
          if (width <= 760) {
            await press("도구");
            await p.getByRole("dialog").getByRole("button", { name: panel === "keeper" ? "등대지기 · 플레이북" : name }).click();
          } else await p.getByRole("button", { name }).click();
          await inspect(`${tag}-${panel}`, width === 320 || width === 1440);
          await close();
        }
        await press("보관 및 설정");
        await inspect(`${tag}-settings`);
        // Native dialog traps keyboard focus, then returns it to the opener.
        for (let i = 0; i < 12; i++) {
          await p.keyboard.press("Tab");
          assert.ok(await p.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest("dialog")), "focus stays in modal");
        }
        await p.keyboard.press("Escape");
        assert.equal(await p.getByRole("dialog").count(), 0);
        assert.equal(await p.evaluate(() => document.activeElement.getAttribute("aria-label")), "보관 및 설정");
        for (const phase of [1, 2, 4]) {
          await seed({ ...dataset, lighthouse_dark: dark, lighthouse_current_shift: { ...shift, phase, isLampLit: false } });
          await inspect(`${tag}-phase-${phase}`, true);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${checks.length} page/panel/state checks, 5 widths, 2 themes; no runtime errors.`);
  } catch (error) {
    errors.push(error.stack);
    await p.screenshot({ path: path.join(output, "failure.jpg"), fullPage: true });
    throw error;
  } finally {
    await fs.writeFile(path.join(output, "results.json"), JSON.stringify({ checks, errors }, null, 2));
    await browser.close();
  }
})();

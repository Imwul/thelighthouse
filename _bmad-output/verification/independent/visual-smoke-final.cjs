const { chromium } = require('/Users/imwul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const game = await import('/Users/imwul/Library/Mobile Documents/com~apple~CloudDocs/thelighthouse-apo/src/game.js');
const browser=await chromium.launch({headless:true});
const out=[];
for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shift={...game.createShift(),phase:3,date:'2026-10-08',time:'22:30',moodId:'happy',weatherTitle:'차갑고 맑은 밤',weatherDesc:'차갑고 맑은 밤. 눈 같은 것이 주변에 내립니다.',temp:'12°C',winds:'멀리서 들리는 낮은 바람',sights:'눈처럼 내리는 우주 먼지',isLampLit:true,isClockworkWound:true,pendingDuty:{...game.resolveDuty('maintenance',3,{suit:'클럽',value:'7',color:'흑색'},'caretaker'),userLog:'차가 식었다. 다친 생명체를 위해 자리를 비웠던 것이다. 계단에 앉아 잠시 쉬며 손을 녹인다.'}};
 await page.addInitScript(({shift})=>{localStorage.setItem('lighthouse_current_shift',JSON.stringify(shift));localStorage.setItem('lighthouse_keeper_profile',JSON.stringify({playbookId:'caretaker',name:'별빛',gender:'',keeperNo:'1234',apparel:[]}));},{shift});
 await page.goto('http://127.0.0.1:5299',{waitUntil:'networkidle'});await page.waitForSelector('main');await page.waitForTimeout(750);
 out.push({width,initialState:await page.evaluate(()=>({scrollY,active:document.activeElement.tagName,activeText:document.activeElement.textContent.trim(),visibleNav:[...document.querySelectorAll('.main-nav button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.textContent.trim())}))});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`/tmp/lighthouse-review/final-pending-${width}.png`,fullPage:true});
 out.push({width,pageOverflow:await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth})),mainNav:await page.locator('.main-nav button').allTextContents(),errors:[...errors]});
 const tools=page.locator('.main-nav button').filter({hasText:'도구'});
 if(await tools.isVisible())await tools.click();else await page.getByRole('button',{name:'해변 수색'}).first().click();
 await page.waitForSelector('dialog[open]');
 const tabInside=[];for(let t=0;t<6;t++){await page.keyboard.press('Tab');tabInside.push(await page.evaluate(()=>!!document.activeElement.closest('dialog')));}out.push({width,tabInside,toolSheet:await page.locator('dialog').getAttribute('aria-label'),dialogOverflow:await page.locator('dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth})),focusAtOpen:await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim())});
 await page.screenshot({path:`/tmp/lighthouse-review/final-tools-${width}.png`});
 await page.keyboard.press('Escape');await page.waitForSelector('dialog',{state:'detached'});
 out.push({width,focusAfterEscape:await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim(),aria:document.activeElement?.getAttribute('aria-label')})),errors:[...errors]});
 await page.getByRole('button',{name:'보관 및 설정',exact:true}).click();await page.waitForSelector('dialog[open]');
 await page.getByRole('button',{name:'밤 화면',exact:true}).click();await page.keyboard.press('Escape');
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`/tmp/lighthouse-review/final-dark-${width}.png`,fullPage:true});
 out.push({width,darkTheme:await page.evaluate(()=>document.documentElement.dataset.theme),errors:[...errors]});
 await context.close();
}
require('fs').writeFileSync('/tmp/lighthouse-review/final-ui-results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

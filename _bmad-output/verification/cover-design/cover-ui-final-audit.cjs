const fs=require('fs');
const {chromium}=require('/Users/imwul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const outputDir='/tmp/lighthouse-review/cover-ui-final';fs.mkdirSync(outputDir,{recursive:true});
async function metrics(page,scope='body'){
 return page.evaluate(scope=>{
  const parent=document.querySelector(scope)||document.body;
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const color=value=>{const can=document.createElement('canvas');can.width=can.height=1;const ctx=can.getContext('2d');ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((n,i)=>i===3?n/255:n);};
  const over=(fg,bg)=>[0,1,2].map(i=>fg[i]*fg[3]+bg[i]*(1-fg[3]));
  const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
  const samples=[...parent.querySelectorAll('.field > label,.stage p,.subtitle,.eyebrow,.quiet-btn,.primary-btn,.main-nav button,.journal-prose,.rule-section p,.sheet-body p,.field small')].filter(visible).filter(e=>e.textContent.trim()).map(el=>{
   let bg=[255,255,255];let gradients=[];const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);
   for(const p of chain){const s=getComputedStyle(p);bg=over(color(s.backgroundColor),bg);if(s.backgroundImage!=='none')gradients.push(p.className||p.tagName);}
   const s=getComputedStyle(el);return {selector:el.className||el.tagName,text:el.textContent.trim().slice(0,75),fg:s.color,bg:bg.map(Math.round),ratio:Number(ratio(over(color(s.color),bg),bg).toFixed(2)),font:s.fontSize,gradients};
  });
  const clipped=[...parent.querySelectorAll('h1,h2,h3,p,span,small,label,button,summary')].filter(visible).filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+2).map(e=>({selector:e.className||e.tagName,text:e.textContent.trim().slice(0,70),client:e.clientWidth,scroll:e.scrollWidth}));
  const selected=['.app-shell','.play-desk','.stage','.journal-body','.journal-prose','.reference','.rule-section','.heading-copy','.observatory-scene'];
  const widths=Object.fromEntries(selected.map(sel=>{const el=document.querySelector(sel);return [sel,el&&visible(el)?Number(el.getBoundingClientRect().width.toFixed(1)):null]}));
  return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,scopeWidth:parent.clientWidth,scopeScrollWidth:parent.scrollWidth,theme:document.documentElement.dataset.theme,clipped,contrastBelow45:samples.filter(s=>s.ratio<4.5),contrastMin:Math.min(...samples.map(s=>s.ratio)),contrastSamples:samples,widths,decorations:[...document.querySelectorAll('.observatory-scene')].map(e=>({pointerEvents:getComputedStyle(e).pointerEvents,ariaHidden:e.getAttribute('aria-hidden')})),backgroundPointerEvents:getComputedStyle(document.body,'::before').pointerEvents,focus:{tag:document.activeElement.tagName,text:document.activeElement.textContent.trim().slice(0,70)}};
 },scope);
}
(async()=>{
 const game=await import('/Users/imwul/Library/Mobile Documents/com~apple~CloudDocs/thelighthouse-apo/src/game.js');
 const browser=await chromium.launch({headless:true});const results=[];
 const duty={...game.resolveDuty('maintenance',3,{suit:'클럽',value:'7',color:'흑색'},'caretaker'),userLog:'계단의 틈에 물이 고여 있었다. 물을 닦고 다친 작은 생명체가 쉴 공간을 정리했다. 렌즈와 태엽 장치는 정상적으로 작동한다.'};
 const journal={id:'qa-night',date:'2026-10-08',time:'22:30',keeperNo:'1234',keeperName:'별빛',playbookName:'관리자',weather:'차갑고 맑은 밤',temp:'12°C',winds:'낮은 바람 소리',sights:'눈처럼 내리는 우주 먼지',initialObservations:'맑은 밤하늘을 관측했다. 가까운 빛 뒤로 작은 생명체가 지나갔다.',dutiesRaw:[duty],dutiesLog:duty.userLog,remarks:'계단 정비를 마쳤다. 내일 손잡이를 확인할 예정이다.'};
 for(const width of [320,390,768,1440,3440])for(const theme of ['paper','night']){
  const context=await browser.newContext({viewport:{width,height:width===3440?1440:900},deviceScaleFactor:1});
  const errors=[];
  async function makePage(pending=false){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const shift={...game.createShift(),date:'2026-10-08',time:'22:30',...(pending?{phase:3,moodId:'happy',weatherTitle:'차갑고 맑은 밤',temp:'12°C',winds:'낮은 바람 소리',sights:'눈처럼 내리는 우주 먼지',isLampLit:true,isClockworkWound:true,pendingDuty:duty}:{} )};await page.addInitScript(({shift,journal,dark})=>{localStorage.setItem('lighthouse_current_shift',JSON.stringify(shift));localStorage.setItem('lighthouse_keeper_profile',JSON.stringify({playbookId:'caretaker',name:'별빛',gender:'',keeperNo:'1234',apparel:[]}));localStorage.setItem('lighthouse_journals',JSON.stringify([journal]));localStorage.setItem('lighthouse_dark',JSON.stringify(dark));},{shift,journal,dark:theme==='night'});await page.goto('http://127.0.0.1:5299',{waitUntil:'networkidle'});await page.waitForSelector('main');await page.waitForTimeout(200);return page;}
  const page=await makePage();
  async function snap(name,scope='body',fullPage=true){const m=await metrics(page,scope);results.push({width,theme,screen:name,...m,errors:[...errors]});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${outputDir}/${width}-${theme}-${name}.png`,fullPage});}
  await snap('initial');
  await page.locator('.main-nav button').nth(1).click();await page.locator('.journal-summary').first().click();await snap('journal');
  await page.locator('.main-nav button').nth(2).click();await snap('rules');
  await page.locator('.main-nav button').nth(0).click();const ruleOpener=page.locator('.play-desk .rule-link').first();await ruleOpener.click();await page.waitForSelector('dialog[open]');await snap('rules-drawer','dialog',false);await page.keyboard.press('Escape');results.push({width,theme,screen:'rules-escape',focus:await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent.trim()}))});
  await page.getByRole('button',{name:'보관 및 설정',exact:true}).click();await page.waitForSelector('dialog[open]');await snap('settings-drawer','dialog',false);await page.keyboard.press('Escape');results.push({width,theme,screen:'settings-escape',focus:await page.evaluate(()=>({tag:document.activeElement.tagName,aria:document.activeElement.getAttribute('aria-label')}))});
  const pending=await makePage(true);results.push({width,theme,screen:'pending',...await metrics(pending),errors:[...errors]});await pending.evaluate(()=>scrollTo(0,0));await pending.screenshot({path:`${outputDir}/${width}-${theme}-pending.png`,fullPage:true});
  console.log(JSON.stringify({width,theme,errors,overflows:results.filter(r=>r.width===width&&r.theme===theme&&(r.pageWidth>width||r.scopeScrollWidth>r.scopeWidth+2)).map(r=>r.screen),lowContrast:results.filter(r=>r.width===width&&r.theme===theme&&r.contrastBelow45?.length).map(r=>({screen:r.screen,samples:r.contrastBelow45})),clipped:results.filter(r=>r.width===width&&r.theme===theme&&r.clipped?.length).map(r=>({screen:r.screen,items:r.clipped}))}));
  await context.close();
 }
 fs.writeFileSync(`${outputDir}/results.json`,JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

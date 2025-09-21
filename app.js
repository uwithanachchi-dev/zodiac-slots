/********* symbols & helpers *********/
const SYMBOLS = ["♈","♊","♋","♍","♎","♐","♓","♌","🜚"]; // last is JACKPOT
const JACKPOT = "🜚";
const reels = [...document.querySelectorAll(".reel")];
const strips = reels.map(r => r.querySelector(".strip"));
const minus = document.getElementById("minus");
const plus  = document.getElementById("plus");
const spinBtn = document.getElementById("spinBtn");
const betLabel = document.getElementById("betLabel");
const resultEl = document.getElementById("result");
const overlay = document.getElementById("jackpotOverlay");

let MIN_BET = 10, MAX_BET = 200, bet = MIN_BET;
let previewHoldTimer = null;

function randSym(){ return SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]; }
function setBet(v){ bet = Math.max(MIN_BET, Math.min(MAX_BET, v)); betLabel.textContent = `Bet: ${bet}`; }
minus.addEventListener("click", ()=> setBet(bet-10));
plus .addEventListener("click", ()=> setBet(bet+10));
setBet(bet);

/********* build reel strips *********/
function fillStrip(strip){
  strip.innerHTML = "";
  // 10 visible cells + one wrap cell for smoother motion
  for (let i=0;i<11;i++){
    const d = document.createElement("div");
    d.className = "symbol";
    d.textContent = randSym();
    strip.appendChild(d);
  }
}
strips.forEach(fillStrip);

/********* audio: WebAudio tones *********/
let audioCtx;
function ensureAudio(){ if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function beep(freq=440, dur=120, type="sine", vol=0.06){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.08); o.stop(audioCtx.currentTime+0.09); }, dur);
}
function spinSwoosh(){ beep(220,140,"sawtooth",0.04); setTimeout(()=>beep(300,140,"triangle",0.035),90); }
function reelTick(){ beep(820,60,"square",0.03); }
function winJingle(){ [660,880,990].forEach((f,i)=> setTimeout(()=>beep(f,160,"triangle",0.05), i*120)); }
function jackpotFanfare(){
  [440,660,880,1175].forEach((f,i)=> setTimeout(()=>beep(f,220,"sawtooth",0.06), i*140));
  setTimeout(()=>[987,784,659,523].forEach((f,i)=> setTimeout(()=>beep(f,200,"square",0.05), i*100)), 600);
}

/********* JACKPOT overlay control *********/
function showJackpotOverlay(){
  overlay.classList.remove("hidden");
  overlay.classList.add("show");
  jackpotFanfare();
  setTimeout(()=> overlay.classList.add("hidden"), 1800);
  setTimeout(()=> overlay.classList.remove("show"), 2000);
}

// long-press the SPIN button (1.5s) to preview the burst any time
spinBtn.addEventListener("pointerdown", ()=>{
  previewHoldTimer = setTimeout(showJackpotOverlay, 1500);
});
["pointerup","pointerleave","click"].forEach(evt=>{
  spinBtn.addEventListener(evt, ()=> { if(previewHoldTimer){clearTimeout(previewHoldTimer); previewHoldTimer=null;} }, true);
});

/********* spin animation *********/
function currentVisibleSymbols(){
  return strips.map(strip=>{
    // read the middle visible cell (approx)
    const mid = strip.children[5]; // 0..10
    return mid.textContent;
  });
}

async function animateSpin(){
  resultEl.textContent = "Spinning…";
  spinSwoosh();

  // add lots of randoms to each strip to scroll through
  strips.forEach(strip=>{
    for(let i=0;i<14;i++){
      const d=document.createElement("div"); d.className="symbol"; d.textContent=randSym();
      strip.appendChild(d);
    }
  });

  const heights = reels.map(r => r.clientHeight);
  const durations = [900, 1150, 1400]; // staggered ease-out
  const start = performance.now();
  let lastTick = 0;

  reels.forEach(r => { r.classList.add("spin"); r.classList.remove("stop"); });

  return new Promise(resolve=>{
    function frame(now){
      const t = now - start;
      let allDone = true;
      strips.forEach((strip, i) => {
        const d = durations[i];
        const p = Math.min(1, t/d);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - p, 3);
        const dist = -eased * (strip.scrollHeight - heights[i]); // translate to near end
        strip.style.transform = `translateY(${dist}px)`;
        if (t < d) allDone = false;
      });

      // ticking sound ~ every 120ms during spin
      if (t - lastTick > 120 && t < Math.max(...durations)) { reelTick(); lastTick = t; }

      if (!allDone) requestAnimationFrame(frame);
      else {
        reels.forEach(r => { r.classList.remove("spin"); r.classList.add("stop"); });
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

spinBtn.addEventListener("click", async () => {
  spinBtn.disabled = true;
  // reset strips before spin so the “middle” is fresh
  strips.forEach(fillStrip);

  await animateSpin();

  // Visual-only win detection (client side)
  const vis = currentVisibleSymbols();
  if (vis.every(v => v === JACKPOT)) {
    showJackpotOverlay();
    resultEl.textContent = "✨ JACKPOT visual!";
  } else if (vis[0] === vis[1] && vis[1] === vis[2]) {
    winJingle();
    resultEl.textContent = "Nice! Triple match (visual).";
  } else {
    resultEl.textContent = "Better luck next time (visual).";
  }

  // Tell the bot to do the official spin & payout
  Telegram.WebApp.sendData(JSON.stringify({ action: "spin", bet }));
  spinBtn.disabled = false;
});

// init
Telegram.WebApp.ready();
reels.forEach(r => r.classList.add("stop"));

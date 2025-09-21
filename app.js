const symbols = ["♈","♊","♋","♍","♎","♐","♓","♌","🜚"];
const reels = [document.getElementById("reel1"), document.getElementById("reel2"), document.getElementById("reel3")];
const resultEl = document.getElementById("result");
const spinBtn = document.getElementById("spinBtn");
const minus = document.getElementById("minus");
const plus = document.getElementById("plus");
const betLabel = document.getElementById("betLabel");

let MIN_BET = 10, MAX_BET = 200, bet = MIN_BET;

function randomSymbol() { return symbols[Math.floor(Math.random()*symbols.length)]; }
function setBet(v){ bet = Math.min(MAX_BET, Math.max(MIN_BET, v)); betLabel.textContent = `Bet: ${bet}`; }
setBet(bet);

minus.addEventListener("click", ()=> setBet(bet-10));
plus.addEventListener("click", ()=> setBet(bet+10));

async function animateSpin() {
  resultEl.textContent = "Spinning…";
  let frames = 24;
  let delay = 50;
  for (let i=0; i<frames; i++){
    reels.forEach(r => r.textContent = randomSymbol());
    await new Promise(r => setTimeout(r, delay));
    delay += 20;
  }
}

spinBtn.addEventListener("click", async () => {
  spinBtn.disabled = true;
  await animateSpin();
  const payload = { action: "spin", bet };
  Telegram.WebApp.sendData(JSON.stringify(payload));
  resultEl.textContent = "Result sent to bot. Check chat.";
  spinBtn.disabled = false;
});

reels.forEach(r => r.textContent = randomSymbol());
Telegram.WebApp.ready();

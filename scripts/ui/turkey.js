/* Thanksgiving 2026: a turkey under a paraglider wing flies across once, on the first visit of the day (Pacific
   time) on each device. Tap anywhere or wait ~4 s and it's gone. Nothing is sent anywhere. */
(function () {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  if (day !== "2026-11-26" || /[?&](embed|admin)\b/.test(location.search)) return;
  const KEY = "turkey-2026";
  try { if (localStorage.getItem(KEY)) return; localStorage.setItem(KEY, "1"); } catch (e) { /* no storage: show it anyway */ }
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = `
#tky{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(255,248,236,.88);
  backdrop-filter:blur(2px);opacity:0;transition:opacity .35s;cursor:pointer;font-family:inherit}
#tky.on{opacity:1}
#tky .msg{position:absolute;left:0;right:0;bottom:16%;text-align:center;color:#7a3e12;padding:0 16px}
#tky .msg b{display:block;font-size:1.6rem;font-weight:800;letter-spacing:.01em}
#tky .msg span{display:block;margin-top:6px;font-size:.95rem;color:#8a5a2b}
#tky .msg small{display:block;margin-top:14px;font-size:.75rem;color:#b08a62}
#tky svg{position:absolute;top:18%;width:min(62vw,300px);height:auto;left:50%;transform:translateX(-50%)}
#tky .fly{animation:tkyfly 3.6s ease-in-out forwards}
#tky .bob{animation:tkybob .9s ease-in-out infinite alternate;transform-origin:150px 60px}
#tky .legs{animation:tkykick .35s ease-in-out infinite alternate;transform-origin:150px 205px}
@keyframes tkyfly{0%{transform:translate(-120vw,10vh) rotate(-8deg)}45%{transform:translate(-50%,0) rotate(3deg)}
  70%{transform:translate(-50%,-2vh) rotate(-2deg)}100%{transform:translate(-50%,0) rotate(0)}}
@keyframes tkybob{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
@keyframes tkykick{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}`;
  const svg = `<svg viewBox="0 0 300 300" class="${still ? "" : "fly"}" aria-hidden="true"><g class="${still ? "" : "bob"}">
  <!-- wing -->
  <path d="M30 70 Q150 -5 270 70 Q150 40 30 70Z" fill="#e8742a"/><path d="M30 70 Q150 40 270 70" fill="none" stroke="#b9551a" stroke-width="3"/>
  <path d="M75 52 Q90 46 105 44 M195 44 Q210 46 225 52" stroke="#f4a261" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- lines -->
  <path d="M40 70 L135 175 M95 55 L140 175 M205 55 L160 175 M260 70 L165 175" stroke="#7a5a3a" stroke-width="1.4"/>
  <!-- tail fan -->
  <g transform="translate(150 200)">
    <path d="M0 0 L-62 -48 A70 70 0 0 1 -30 -66Z" fill="#c0392b"/><path d="M0 0 L-30 -66 A70 70 0 0 1 0 -72Z" fill="#e67e22"/>
    <path d="M0 0 L0 -72 A70 70 0 0 1 30 -66Z" fill="#f1c40f"/><path d="M0 0 L30 -66 A70 70 0 0 1 62 -48Z" fill="#d35400"/>
  </g>
  <!-- body and harness -->
  <ellipse cx="150" cy="205" rx="34" ry="30" fill="#8b5a2b"/>
  <rect x="122" y="196" width="56" height="12" rx="6" fill="#2f5d8a"/>
  <!-- head -->
  <circle cx="150" cy="166" r="17" fill="#a0693a"/>
  <path d="M150 168 L161 172 L150 176Z" fill="#f39c12"/>
  <path d="M152 176 q4 10 -2 14 q-5 -6 2 -14Z" fill="#d63031"/>
  <circle cx="145" cy="162" r="3.2" fill="#fff"/><circle cx="146" cy="162" r="1.6" fill="#222"/>
  <circle cx="156" cy="162" r="3.2" fill="#fff"/><circle cx="157" cy="162" r="1.6" fill="#222"/>
  <!-- helmet -->
  <path d="M133 160 Q150 136 167 160Z" fill="#2f7fcf"/>
  <!-- legs -->
  <g class="${still ? "" : "legs"}"><path d="M140 232 l-6 18 M160 232 l6 18" stroke="#e1a22b" stroke-width="4" stroke-linecap="round"/>
  <path d="M128 252 h12 M160 252 h12" stroke="#e1a22b" stroke-width="3" stroke-linecap="round"/></g>
  </g></svg>`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const el = document.createElement("div"); el.id = "tky"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Happy Thanksgiving");
  el.innerHTML = svg + `<div class="msg"><b>Happy Thanksgiving!</b><span>Santa Ana today: the only thing launching is dinner.</span><small>tap to continue</small></div>`;
  const go = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 400); };
  el.addEventListener("click", go);
  const show = () => { document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on")); setTimeout(go, still ? 3000 : 4800); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", show) : show();
})();

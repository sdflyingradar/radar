/* "Install app": a button in the footer (hidden once the radar runs as an installed app) that opens a short sheet
   with the steps for this phone. Where the browser can install by itself (Chrome / Edge on Android and computers)
   the sheet has a one-tap Install button, so it still works after someone dismissed the browser's own pop-up. */
(function () {
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const inApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|GSA\/|; wv\)/.test(ua);   // link opened inside another app
  const mac = /Macintosh/.test(ua) && !iOS, safari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|FxiOS|Firefox/.test(ua);
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", () => { deferred = null; const b = document.getElementById("installBtn"); if (b) b.hidden = true; });

  /* small pictures of the buttons people have to find */
  const SHARE = `<svg viewBox="0 0 20 24" class="ini"><path d="M10 2v13M5.5 6.5 10 2l4.5 4.5M6 10H3.5v11.5h13V10H14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ADD = `<svg viewBox="0 0 24 24" class="ini"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const DOTS = `<svg viewBox="0 0 24 24" class="ini"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>`;

  const STEPS = {
    ios: ["iPhone / iPad", [
      `Open this page in <b>Safari</b> (or Chrome).`,
      `Tap the <b>Share</b> button ${SHARE} at the bottom of the screen (on iPad: top right; in Chrome: in the address bar).`,
      `Scroll down and tap <b>Add to Home Screen</b> ${ADD}. If you don't see it, tap <b>Edit Actions</b> at the bottom of that list and add it.`,
      `Tap <b>Add</b>. The radar is now on your home screen.`]],
    android: ["Android", [
      `Open this page in <b>Chrome</b> (Samsung Internet and Firefox work too).`,
      `Tap the menu ${DOTS} at the top right (Samsung: ☰ at the bottom).`,
      `Tap <b>Add to Home screen</b> or <b>Install app</b>, then <b>Install</b>.`,
      `The radar is now on your home screen and in your app list.`]],
    desktop: ["Computer", [
      mac && safari ? `In Safari: <b>File › Add to Dock</b>.` : `In Chrome or Edge: click the install icon at the right end of the address bar, or menu ${DOTS} › <b>Cast, save and share › Install page as app</b>.`,
      `Firefox can't install apps: add a bookmark instead.`]],
  };
  const mine = iOS ? "ios" : android ? "android" : "desktop";

  function open() {
    let d = document.getElementById("installDlg");
    if (!d) { d = document.createElement("dialog"); d.id = "installDlg"; document.body.appendChild(d); d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); }
    const list = (k) => `<ol class="ins">${STEPS[k][1].map((s) => `<li>${s}</li>`).join("")}</ol>`;
    const others = Object.keys(STEPS).filter((k) => k !== mine);
    d.innerHTML = `<div class="inw">
      <div class="inh"><img src="icon-192.png" alt="" width="40" height="40"><div><h3>Put the radar on your home screen</h3><small>Opens full screen like an app, one tap away. Free, nothing to download from a store.</small></div><button class="inx" aria-label="Close">✕</button></div>
      ${inApp ? `<p class="inn">You opened the link inside another app. Open it in ${iOS ? "Safari" : "Chrome"} first: tap ${iOS ? "the compass or ⋯" : DOTS} and choose <b>Open in ${iOS ? "Safari" : "browser"}</b>.</p>` : ""}
      ${deferred ? `<button class="ingo" id="installGo">Install</button>` : ""}
      <h4>${deferred ? "Or by hand" : STEPS[mine][0]}</h4>${list(mine)}
      ${others.map((k) => `<details class="ino"><summary>${STEPS[k][0]}</summary>${list(k)}</details>`).join("")}
    </div>`;
    d.querySelector(".inx").onclick = () => d.close();
    const go = d.querySelector("#installGo");
    if (go) go.onclick = async () => { const p = deferred; deferred = null; d.close(); p.prompt(); try { await p.userChoice; } catch (e) {} };
    d.showModal();
  }

  function add() {
    if (standalone()) return;
    const foot = document.querySelector("footer");
    if (!foot || document.getElementById("installBtn")) return;
    const b = document.createElement("button");
    b.type = "button"; b.id = "installBtn"; b.textContent = "Install app"; b.title = "Put the radar on your home screen";
    b.onclick = open;
    foot.insertBefore(b, foot.firstChild);
  }
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("[data-install]")) { e.preventDefault(); open(); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();

  const css = document.createElement("style");
  css.textContent = `#installBtn{font:inherit;font-size:.8rem;border:1px solid #2b7fd8;color:#2b7fd8;background:#fff;border-radius:999px;padding:3px 12px;cursor:pointer}
  #installDlg{border:none;border-radius:16px;padding:0;max-width:min(400px,94vw);width:100%;max-height:88vh;box-shadow:0 12px 40px rgba(16,24,40,.22)}
  #installDlg::backdrop{background:rgba(16,24,40,.35);backdrop-filter:blur(2px)}
  .inw{padding:14px 16px 14px;font-size:.88rem;color:#1f2328;line-height:1.4}
  .inh{display:flex;gap:10px;align-items:flex-start} .inh img{border-radius:9px;flex:none} .inh div{flex:1} .inh h3{margin:0 0 2px;font-size:1rem;font-family:inherit;font-weight:650} .inh small{color:#667085}
  .inx{border:0;background:#f2f4f7;border-radius:50%;width:28px;height:28px;flex:none;cursor:pointer;color:#475467} .inx:focus{outline:none}
  .ingo{display:block;width:100%;margin:12px 0 2px;border:0;border-radius:10px;background:#2b7fd8;color:#fff;font:inherit;font-weight:600;padding:10px;cursor:pointer}
  .inw h4{margin:12px 0 4px;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#667085}
  .ins{margin:0;padding-left:1.3em} .ins li{margin:4px 0}
  .ini{width:1.15em;height:1.15em;vertical-align:-.22em;color:#2b7fd8}
  .inn{background:#fff6e5;border-radius:10px;padding:8px 10px;margin:10px 0 0}
  .ino{margin-top:6px;border-top:1px solid #eef0f3;padding-top:6px} .ino summary{cursor:pointer;color:#667085;font-size:.82rem}`;
  document.head.appendChild(css);
})();

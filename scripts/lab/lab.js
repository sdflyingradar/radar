/* LAB bar: which scores the lab shows (lab rules from the 'lab' branch, or live), and what the lab changes */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const bar = document.createElement("div");
  bar.id = "labbar";
  bar.innerHTML = "<b>LAB</b><span>same as live</span>";
  document.body.appendChild(bar);
  const get = (u) => fetch(`${u}?t=${Date.now()}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const live = /[?&]live/.test(location.search);
  Promise.all([get("data/lab/forecast.json"), get("data/forecast.json")]).then(([L, F]) => {
    if (!L) return;
    const sp = bar.querySelector("span");
    const t = (L.lab && L.lab.rescored) ? new Date(L.lab.rescored).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    /* every site/day where the lab score moves by a quarter point or more */
    const ch = [];
    (L.days || []).forEach((d) => {
      const f = (F && F.days || []).find((x) => x.date === d.date);
      if (!f) return;
      Object.entries(d.sites || {}).forEach(([k, c]) => {
        const o = f.sites && f.sites[k];
        if (c && o && c.rating != null && o.rating != null && Math.abs(c.rating - o.rating) >= 0.25) ch.push([d.date, k, o.rating, c.rating]);
      });
    });
    sp.textContent = live ? "showing live" : `lab rules · ${ch.length} change${ch.length === 1 ? "" : "s"}`;
    const sw = document.createElement("a");
    sw.href = live ? "lab.html" : "lab.html?live"; sw.textContent = live ? "lab ›" : "live ›";
    const cb = document.createElement("button"); cb.textContent = "what changed"; cb.type = "button";
    bar.append(cb, sw);
    cb.onclick = () => {
      let dl = document.getElementById("labDlg");
      if (!dl) { dl = document.createElement("dialog"); dl.id = "labDlg"; document.body.appendChild(dl); dl.addEventListener("click", (e) => { if (e.target === dl) dl.close(); }); }
      const wd = (s) => new Date(s + "T12:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
      dl.innerHTML = `<div class="lbw"><h3>Lab vs live</h3><p>${esc((L.lab && L.lab.note) || "lab rules")}${t ? ` · scored ${esc(t)}` : ""}</p>
        ${ch.length ? `<table>${ch.map(([d, k, o, n]) => `<tr><td>${esc(wd(d))}</td><td>${esc(k)}</td><td>${f1(o)} → <b>${f1(n)}</b></td><td class="${n > o ? "up" : "dn"}">${n > o ? "+" : "−"}${f1(Math.abs(n - o))}</td></tr>`).join("")}</table>` : "<p>No score moves by a quarter point or more.</p>"}
        <button type="button" class="lbx">Close</button></div>`;
      dl.querySelector(".lbx").onclick = () => dl.close();
      dl.showModal();
    };
  });
})();

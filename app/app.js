// 傍聴席の人狼（仮称）— 画面の切り替えと仮データの描画。
// 見た目だけの試作品: 判定・保存・通信は行わない。

"use strict";

const SCREENS = ["title", "prepare", "day", "vote", "night", "result"];
const NIGHT_SCREENS = ["title", "night"]; // インク（暗）のテーマ

const $ = (sel, root) => (root || document).querySelector(sel);
const agentById = (id) => AGENTS.find((a) => a.id === id);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

/* ---- 確信度＝インクの濃度（この製品だけの印） ---- */

function confClass(c) {
  if (c >= 0.8) return "conf-high";
  if (c >= 0.6) return "conf-mid";
  return "conf-low";
}

/* ---- 速記ログの1行 ---- */

function renderEntry(item, opts) {
  const compact = opts && opts.compact;
  const isHuman = item.s === "human";
  const entry = el("div", "entry" + (isHuman ? " entry-human" : "") + (compact ? " entry-compact" : ""));

  const seal = el("span", "seal seal-sm" + (isHuman ? " seal-human" : ""));
  seal.setAttribute("aria-hidden", "true");
  seal.textContent = isHuman ? HUMAN.seal : (agentById(item.s) || {}).seal || "・";
  entry.appendChild(seal);

  const body = el("div");
  const head = el("div", "entry-head");

  const name = el("span", "entry-name");
  name.textContent = isHuman ? HUMAN.name + "（" + HUMAN.seat + "）" : (agentById(item.s) || {}).name || "不明";
  head.appendChild(name);

  const meta = el("span", "entry-meta");
  if (isHuman) {
    meta.textContent = "差し挟み";
  } else if (item.day) {
    meta.textContent = item.day + "・応答 " + item.r.toFixed(1) + "秒・確信 " + item.c.toFixed(2);
  } else {
    meta.textContent = "応答 " + item.r.toFixed(1) + "秒・確信 " + item.c.toFixed(2);
  }
  head.appendChild(meta);
  body.appendChild(head);

  const text = el("p", "entry-text " + (isHuman ? "" : confClass(item.c)));
  text.textContent = item.t;
  body.appendChild(text);

  entry.appendChild(body);
  return entry;
}

/* ---- 各画面の描画 ---- */

function renderPreview() {
  const list = $("#preview-list");
  if (!list) return;
  [TRANSCRIPT[6], TRANSCRIPT[10], TRANSCRIPT[11]].forEach((item) => {
    list.appendChild(renderEntry(item, { compact: true }));
  });
}

function renderSpine() {
  const list = $("#spine-list");
  if (!list) return;
  AGENTS.forEach((a) => {
    const item = el("div", "spine-item");
    const seal = el("span", "seal seal-sm");
    seal.setAttribute("aria-hidden", "true");
    seal.textContent = a.seal;
    const name = el("span", "spine-name", a.name);
    item.appendChild(seal);
    item.appendChild(name);
    list.appendChild(item);
  });
}

function renderRoster() {
  const list = $("#roster-list");
  if (!list) return;
  AGENTS.forEach((a) => {
    const li = el("li");
    const seal = el("span", "seal");
    seal.setAttribute("aria-hidden", "true");
    seal.textContent = a.seal;
    const body = el("div");
    const nameRow = el("div");
    const name = el("span", "roster-name", a.name);
    const kana = el("span", "roster-kana", a.kana);
    nameRow.appendChild(name);
    nameRow.appendChild(kana);
    const persona = el("p", "roster-persona", a.persona);
    body.appendChild(nameRow);
    body.appendChild(persona);
    li.appendChild(seal);
    li.appendChild(body);
    list.appendChild(li);
  });
}

function renderRolesPlan() {
  const list = $("#roles-list");
  if (!list) return;
  ROLES_PLAN.forEach(([role, count]) => {
    const li = el("li");
    li.appendChild(el("span", null, role));
    li.appendChild(el("span", "mono", "×" + count));
    list.appendChild(li);
  });
}

function statementCounts() {
  const counts = {};
  TRANSCRIPT.forEach((item) => {
    counts[item.s] = (counts[item.s] || 0) + 1;
  });
  return counts;
}

function renderAttend() {
  const list = $("#attend-list");
  if (!list) return;
  const counts = statementCounts();
  AGENTS.forEach((a) => {
    const li = el("li");
    const seal = el("span", "seal seal-sm");
    seal.setAttribute("aria-hidden", "true");
    seal.textContent = a.seal;
    li.appendChild(el("span", "attend-name", a.name));
    li.appendChild(el("span", "mono", "発言 " + (counts[a.id] || 0)));
    li.insertBefore(seal, li.firstChild);
    list.appendChild(li);
  });
  const humanCount = counts.human || 0;
  if (humanCount > 0) {
    const li = el("li");
    const seal = el("span", "seal seal-sm seal-human");
    seal.setAttribute("aria-hidden", "true");
    seal.textContent = HUMAN.seal;
    li.appendChild(seal);
    li.appendChild(el("span", "attend-name", HUMAN.seat));
    li.appendChild(el("span", "mono", "発言 " + humanCount));
    list.appendChild(li);
  }
}

function updateDayCount() {
  const node = $("#day-count");
  if (node) node.textContent = String(TRANSCRIPT.length);
}

function renderTranscript() {
  const list = $("#transcript-list");
  if (!list) return;
  TRANSCRIPT.forEach((item) => list.appendChild(renderEntry(item)));
  updateDayCount();
}

function renderVote() {
  const meta = $("#vote-meta");
  if (meta) meta.textContent = VOTE.meta;

  const abstain = $("#vote-abstain");
  if (abstain) abstain.textContent = VOTE.abstain;

  const list = $("#tally-list");
  if (list) {
    VOTE.tally.forEach((row) => {
      const target = agentById(row.c);
      if (!target) return;
      const li = el("li");

      const seal = el("span", "seal");
      seal.setAttribute("aria-hidden", "true");
      seal.textContent = target.seal;

      const body = el("div");
      const nameRow = el("div");
      nameRow.appendChild(el("span", "tally-name", target.name));
      nameRow.appendChild(el("span", "tally-kana", target.kana));
      const voters = el("div", "tally-voters");
      row.votes.forEach((vid) => {
        const voter = agentById(vid);
        if (!voter) return;
        const stamp = el("span", "stamp", voter.seal);
        stamp.setAttribute("aria-label", voter.name + "の1票");
        stamp.setAttribute("title", voter.name);
        voters.appendChild(stamp);
      });
      body.appendChild(nameRow);
      body.appendChild(voters);

      const count = el("span", "tally-count mono", row.votes.length + "票");

      li.appendChild(seal);
      li.appendChild(body);
      li.appendChild(count);
      list.appendChild(li);
    });
  }

  const line = $("#verdict-line");
  if (line) line.textContent = VOTE.verdict.line;
  const note = $("#verdict-note");
  if (note) note.textContent = VOTE.verdict.note;
  const open = $("#verdict-open");
  if (open) open.textContent = VOTE.verdict.open;
}

function renderPick() {
  const list = $("#pick-list");
  if (!list) return;
  const now = $("#pick-now");
  AGENTS.forEach((a) => {
    const li = el("li");
    const btn = el("button");
    btn.type = "button";
    btn.dataset.pick = a.id;
    btn.setAttribute("aria-pressed", "false");
    const seal = el("span", "seal seal-sm");
    seal.setAttribute("aria-hidden", "true");
    seal.textContent = a.seal;
    btn.appendChild(seal);
    btn.appendChild(el("span", null, a.name));
    btn.addEventListener("click", () => {
      list.querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      if (now) now.textContent = "あなたの推し: " + a.name + "（参考・票には数えない）";
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderNight() {
  const meta = $("#night-meta");
  if (meta) meta.textContent = NIGHT.meta;
  const note = $("#night-note");
  if (note) note.textContent = NIGHT.note;

  const list = $("#night-list");
  if (!list) return;
  NIGHT.rows.forEach((row) => {
    const li = el("li");
    li.appendChild(el("span", "ledger-time", row.time));
    li.appendChild(el("span", "ledger-role", row.role));
    const text = el("p", "ledger-text");
    row.t.split(/(\{\{[^}]*\}\})/).forEach((part) => {
      if (!part) return;
      if (part.startsWith("{{") && part.endsWith("}}")) {
        const span = el("span", "redact");
        span.setAttribute("aria-hidden", "true");
        span.textContent = part.slice(2, -2);
        text.appendChild(span);
      } else {
        text.appendChild(document.createTextNode(part));
      }
    });
    li.appendChild(text);
    list.appendChild(li);
  });

  const attend = $("#night-attend");
  if (attend) {
    NIGHT.attend.forEach((row) => {
      const a = agentById(row.id);
      if (!a) return;
      const li = el("li");
      if (row.status !== "生存") li.className = "is-dead";
      const seal = el("span", "seal seal-sm");
      seal.setAttribute("aria-hidden", "true");
      seal.textContent = a.seal;
      li.appendChild(seal);
      li.appendChild(el("span", "attend-name", a.name));
      li.appendChild(el("span", "mono", row.status));
      attend.appendChild(li);
    });
  }
  const attendNote = $("#night-attend-note");
  if (attendNote) attendNote.textContent = NIGHT.attendNote;
  const until = $("#night-until");
  if (until) until.textContent = NIGHT.until;
  const closed = $("#night-closed");
  if (closed) closed.textContent = NIGHT.closedAt;
}

function renderResult() {
  const line = $("#result-line");
  if (line) line.textContent = RESULT.winner;
  const sub = $("#result-sub");
  if (sub) sub.textContent = RESULT.line;

  const figures = $("#figures-list");
  if (figures) {
    RESULT.figures.forEach(([label, value]) => {
      const li = el("li");
      li.appendChild(el("span", "figures-label", label));
      li.appendChild(el("span", "figures-value mono", value));
      figures.appendChild(li);
    });
  }

  const reveal = $("#reveal-list");
  if (reveal) {
    RESULT.roles.forEach((row) => {
      const a = agentById(row.id);
      if (!a) return;
      const li = el("li");

      const seal = el("span", "seal" + (row.team === "w" ? " seal-wolf" : ""));
      seal.setAttribute("aria-hidden", "true");
      seal.textContent = a.seal;

      const nameRow = el("div");
      nameRow.appendChild(el("span", "reveal-name", a.name));
      nameRow.appendChild(el("span", "reveal-kana", a.kana));

      const team = el("span", "reveal-team");
      const dot = el("span", "dot " + (row.team === "w" ? "dot-w" : "dot-v"));
      team.appendChild(dot);
      team.appendChild(el("span", null, row.team === "w" ? "人狼陣営" : "村人陣営"));

      const role = el("span", "reveal-role", row.role);

      const status = el("span", "reveal-status");
      if (row.status === "生存") {
        const okDot = el("span", "dot-ok");
        status.appendChild(okDot);
      }
      status.appendChild(el("span", null, row.status));

      li.appendChild(seal);
      li.appendChild(nameRow);
      li.appendChild(team);
      li.appendChild(role);
      li.appendChild(status);
      reveal.appendChild(li);
    });
  }

  const epilogue = $("#epilogue");
  if (epilogue) epilogue.textContent = RESULT.epilogue;

  const quotes = $("#quotes-list");
  if (quotes) {
    RESULT.quotes.forEach((item) => quotes.appendChild(renderEntry(item)));
  }
}

/* ---- 傍聴席からの差し挟み（見た目だけ） ---- */

function setupInterject() {
  const send = $("#interject-send");
  const input = $("#interject-text");
  const list = $("#transcript-list");
  if (!send || !input || !list) return;

  send.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    const item = { s: "human", t: text };
    TRANSCRIPT.push(item);
    const node = renderEntry(item);
    list.appendChild(node);
    input.value = "";
    updateDayCount();
    node.scrollIntoView({ block: "nearest" });
  });
}

/* ---- 画面の切り替え（ハッシュ＋data-goto） ---- */

function currentScreen() {
  const hash = decodeURIComponent(location.hash).replace("#", "");
  return SCREENS.indexOf(hash) >= 0 ? hash : "title";
}

function show(name) {
  document.querySelectorAll(".screen").forEach((section) => {
    const isActive = section.dataset.screen === name;
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });
  document.body.dataset.theme = NIGHT_SCREENS.indexOf(name) >= 0 ? "night" : "paper";
  document.querySelectorAll(".nav-link").forEach((link) => {
    if (link.dataset.goto === name) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setupNav() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-goto]");
    if (!target) return;
    const name = target.dataset.goto;
    if (SCREENS.indexOf(name) < 0) return;
    if (currentScreen() === name) {
      event.preventDefault();
      return;
    }
    location.hash = name;
  });
  window.addEventListener("hashchange", () => show(currentScreen()));
}

/* ---- 起動 ---- */

function init() {
  renderPreview();
  renderSpine();
  renderRoster();
  renderRolesPlan();
  renderTranscript();
  renderAttend();
  renderVote();
  renderPick();
  renderNight();
  renderResult();
  setupInterject();
  setupNav();
  show(currentScreen());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

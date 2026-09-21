/*!
 * Almoghani.Net — زر الدردشة العائم
‎ * ملف واحد بدون مكتبات. يعمل داخل Shadow DOM فلا يتعارض مع تنسيقات الموقع.
 *
‎ * الإضافة في الموقع (قبل </body>):
 * <script src="/almoghani-chat-widget.js" defer
 *   data-endpoint="https://YOUR-WORKER.workers.dev"
 *   data-side="left"
 *   data-whatsapp="966557073007"></script>
 *
‎ * الخيارات:
 *   data-endpoint  رابط الخادم الوسيط (مطلوب)
 *   data-side      left | right   (الافتراضي left)
 *   data-whatsapp  رقم واتساب يظهر عند حدوث خطأ
 *   data-title     عنوان النافذة
 *   data-offset    مسافة إضافية من أسفل الشاشة بالبكسل (إن كان في الموقع أزرار عائمة أخرى)
 */
(function () {
  "use strict";

  var script =
    document.currentScript ||
    document.querySelector("script[data-endpoint]");
  var ds = (script && script.dataset) || {};
  var cfg = {
    endpoint: ds.endpoint || "",
    side: ds.side === "right" ? "right" : "left",
    whatsapp: ds.whatsapp || "966557073007",
    title: ds.title || "مساعد المغني",
    offset: parseInt(ds.offset || "0", 10) || 0,
  };

  if (!cfg.endpoint) {
    console.error("[chat-widget] أضف data-endpoint برابط الخادم الوسيط.");
    return;
  }

  var STORE_KEY = "almoghani_chat_v1";
  var MAX_HISTORY = 12;
  var GREETING =
‎    "أهلاً بك في موقع المغني. اسألني عن الأعمال والخدمات، أو اطلب مساعدة في فكرتك.";
  var QUICK = [
‎    "ما الخدمات التي تقدمها؟",
‎    "أريد تصميم موقع",
‎    "كيف أتواصل معك؟",
  ];

‎  // خط عربي (اختياري: إن تعذر التحميل يُستخدم خط النظام)
  try {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  } catch (e) {}

  var CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .wrap {
    --g: #00612f; --g-deep: #0a3d26; --gold: #c8a24a;
    --ink: #12241b; --mist: #eef3ef; --line: #d5e0d8;
    position: fixed; z-index: 2147483000;
    bottom: calc(20px + ${cfg.offset}px + env(safe-area-inset-bottom, 0px));
    ${cfg.side}: 20px;
    font-family: "IBM Plex Sans Arabic", Tahoma, system-ui, sans-serif;
    color: var(--ink); direction: rtl; line-height: 1.6;
  }
  button { font: inherit; cursor: pointer; }
  :focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }

  .launcher {
    display: flex; align-items: center; gap: 10px;
    background: var(--g); color: #fff; border: 0;
    border-radius: 999px; padding: 13px 20px 13px 18px;
    font-size: 15px; font-weight: 500;
    box-shadow: 0 0 0 2px var(--gold), 0 8px 24px rgba(0, 60, 30, .35);
    transition: transform .15s ease;
  }
  .launcher:hover { transform: translateY(-2px); }
  .launcher svg { width: 22px; height: 22px; fill: currentColor; }

  .panel {
    position: absolute; bottom: 0; ${cfg.side}: 0;
    width: 380px; height: min(620px, calc(100dvh - 40px));
    display: flex; flex-direction: column; overflow: hidden;
    background: var(--mist); border-radius: 20px;
    box-shadow: 0 0 0 1px var(--line), 0 24px 60px rgba(10, 61, 38, .28);
    transform-origin: bottom ${cfg.side};
  }
  .panel[hidden] { display: none; }
  .panel.enter { animation: pop .22s ease-out; }
  @keyframes pop { from { opacity: 0; transform: translateY(12px) scale(.96); } }

  header {
    position: relative; display: flex; align-items: center; gap: 12px;
    padding: 16px 18px; background: var(--g-deep); color: #fff;
    border-bottom: 3px solid var(--gold);
  }
  header::before {
    content: ""; position: absolute; inset: 0; opacity: .09; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1'%3E%3Crect x='8' y='8' width='16' height='16'/%3E%3Crect x='8' y='8' width='16' height='16' transform='rotate(45 16 16)'/%3E%3C/g%3E%3C/svg%3E");
  }
  header > * { position: relative; }
  .titles { flex: 1; min-width: 0; }
  .titles strong { display: block; font-size: 16px; font-weight: 700; }
  .titles span { font-size: 12.5px; opacity: .8; }
  .close {
    width: 36px; height: 36px; border-radius: 50%; border: 0;
    background: rgba(255,255,255,.12); color: #fff; font-size: 20px; line-height: 1;
  }
  .close:hover { background: rgba(255,255,255,.22); }

  .msgs {
    flex: 1; overflow-y: auto; padding: 16px 14px 8px;
    display: flex; flex-direction: column; gap: 10px;
    overscroll-behavior: contain;
  }
  .m {
    max-width: 86%; padding: 10px 14px; font-size: 15px;
    overflow-wrap: anywhere; white-space: normal;
  }
  .m a { color: inherit; text-decoration: underline; }
  .m.bot {
    align-self: flex-end; background: #fff; border: 1px solid var(--line);
    border-radius: 16px 16px 16px 4px;
  }
  .m.me {
    align-self: flex-start; background: var(--g); color: #fff;
    border-radius: 16px 16px 4px 16px;
  }
  .m.err { border-color: #c0392b; }
  .typing { display: flex; gap: 5px; padding: 14px 16px; }
  .typing i {
    width: 7px; height: 7px; border-radius: 50%; background: var(--g);
    opacity: .35; animation: blink 1.1s infinite;
  }
  .typing i:nth-child(2) { animation-delay: .18s; }
  .typing i:nth-child(3) { animation-delay: .36s; }
  @keyframes blink { 50% { opacity: 1; } }

  .chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 14px 8px; }
  .chips[hidden] { display: none; }
  .chips button {
    background: #fff; color: var(--g-deep); border: 1px solid var(--g);
    border-radius: 999px; padding: 6px 14px; font-size: 13.5px;
  }
  .chips button:hover { background: var(--g); color: #fff; }

  form {
    display: flex; align-items: flex-end; gap: 8px;
    padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    background: #fff; border-top: 1px solid var(--line);
  }
  textarea {
    flex: 1; resize: none; max-height: 110px; min-height: 42px;
    border: 1px solid var(--line); border-radius: 14px; padding: 10px 14px;
    font: inherit; font-size: 16px; color: var(--ink); background: var(--mist);
    direction: rtl;
  }
  textarea:focus { outline: none; border-color: var(--g); box-shadow: 0 0 0 3px rgba(0, 97, 47, .18); }
  .send {
    width: 44px; height: 44px; flex: none; border: 0; border-radius: 50%;
    background: var(--g); color: #fff; display: grid; place-items: center;
  }
  .send:disabled { background: #9db3a5; cursor: not-allowed; }
  .send svg { width: 20px; height: 20px; fill: currentColor; transform: scaleX(-1); }
  .foot { text-align: center; font-size: 11.5px; color: #5d6f64; padding: 0 0 8px; background: #fff; }

  @media (max-width: 520px) {
    .panel {
      position: fixed; inset: 0; width: auto; height: 100dvh; border-radius: 0;
    }
    header { padding-top: calc(16px + env(safe-area-inset-top, 0px)); }
    .wrap.open .launcher { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .panel.enter, .typing i, .launcher { animation: none; transition: none; }
  }`;

  var host = document.createElement("div");
  host.id = "almoghani-chat-host";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>" + CSS + "</style>" +
    '<div class="wrap">' +
      '<div class="panel" role="dialog" aria-label="' + cfg.title + '" hidden>' +
        "<header>" +
          '<div class="titles"><strong></strong><span>يجيب فوراً، ويحيلك للتواصل المباشر عند الحاجة</span></div>' +
          '<button class="close" type="button" aria-label="إغلاق">&times;</button>' +
        "</header>" +
        '<div class="msgs" role="log" aria-live="polite"></div>' +
        '<div class="chips"></div>' +
        '<form autocomplete="off">' +
          '<textarea rows="1" maxlength="1000" placeholder="اكتب سؤالك هنا" aria-label="رسالتك"></textarea>' +
          '<button class="send" type="submit" aria-label="إرسال">' +
            '<svg viewBox="0 0 24 24"><path d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12.6 2-12.6 2z"/></svg>' +
          "</button>" +
        "</form>" +
        '<div class="foot">مدعوم بالذكاء الاصطناعي، وقد يخطئ أحياناً</div>' +
      "</div>" +
      '<button class="launcher" type="button" aria-label="فتح المساعد الذكي">' +
        '<svg viewBox="0 0 24 24"><path d="M4 4h16a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 17H9.5L5 21v-4H4a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4 4z"/></svg>' +
        "<span>اسأل المساعد</span>" +
      "</button>" +
    "</div>";

  var $ = function (s) { return root.querySelector(s); };
  var wrap = $(".wrap"), panel = $(".panel"), launcher = $(".launcher");
  var msgs = $(".msgs"), chips = $(".chips"), form = $("form");
  var input = $("textarea"), sendBtn = $(".send");
  $(".titles strong").textContent = cfg.title;

  var history = [];
  var busy = false;

  function esc(t) {
    return t.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
‎  // تنسيق بسيط وآمن: **غامق** + روابط + قوائم + أسطر
  function fmt(t) {
    var s = esc(t);
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/^\s*[-•*]\s+/gm, "• ");
    s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)،؛])/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return s.replace(/\n/g, "<br>");
  }

  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch (e) {}
  }
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }

  function addMsg(role, text, isErr) {
    var d = document.createElement("div");
    d.className = "m " + (role === "user" ? "me" : "bot") + (isErr ? " err" : "");
    d.innerHTML = fmt(text);
    msgs.appendChild(d);
    scroll();
    return d;
  }

  function setBusy(b) {
    busy = b;
    sendBtn.disabled = b;
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    chips.hidden = true;
    addMsg("user", text);
    history.push({ role: "user", content: text });
    input.value = "";
    input.style.height = "auto";
    setBusy(true);

    var typing = document.createElement("div");
    typing.className = "m bot typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(typing);
    scroll();

    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 30000);
    try {
      var res = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
        signal: ctl.signal,
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.reply) throw new Error(data.error || "http " + res.status);
      typing.remove();
      addMsg("assistant", data.reply);
      history.push({ role: "assistant", content: data.reply });
      save();
    } catch (e) {
      typing.remove();
      addMsg(
        "assistant",
‎        "تعذر الوصول إلى المساعد الآن. أعد المحاولة بعد قليل، أو راسلني مباشرة على واتساب: https://wa.me/" + cfg.whatsapp,
        true
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  function open() {
    panel.hidden = false;
    panel.classList.remove("enter");
    void panel.offsetWidth;
    panel.classList.add("enter");
    wrap.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    scroll();
    if (window.matchMedia("(pointer: fine)").matches) input.focus();
  }
  function close() {
    panel.hidden = true;
    wrap.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", open);
  $(".close").addEventListener("click", close);
  root.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) close();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(input.value);
    }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 110) + "px";
  });

‎  // الرسائل السريعة
  QUICK.forEach(function (q) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = q;
    b.addEventListener("click", function () { send(q); });
    chips.appendChild(b);
  });

‎  // استرجاع المحادثة داخل نفس الجلسة
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
    if (Array.isArray(saved)) history = saved;
  } catch (e) {}

  addMsg("assistant", GREETING);
  if (history.length) {
    chips.hidden = true;
    history.forEach(function (m) { addMsg(m.role, m.content); });
  }

  function mount() { document.body.appendChild(host); }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();

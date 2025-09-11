<script>
// kel-chat-widget.js
(function () {
  /* ---------- tiny helpers ---------- */
  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  /* ---------- styles ---------- */
  function css() {
    return `
.kel-fab{
  position:fixed;right:16px;bottom:16px;z-index:99999;
  background:#06b6d4;color:#000;border-radius:999px;
  padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.35);
  cursor:pointer;font-weight:700
}
.kel-panel{
  position:fixed;right:16px;bottom:84px;width:360px;max-width:92vw;
  background:rgba(0,0,0,.85);backdrop-filter:saturate(120%) blur(8px);
  border:1px solid rgba(255,255,255,.12);border-radius:16px;z-index:99999;color:#e6eefc
}
.kel-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;font-weight:700}
.kel-body{max-height:60vh;overflow:auto;padding:8px 12px}
.kel-msg{
  background:rgba(255,255,255,.06);margin:6px 0;padding:8px 10px;border-radius:10px;
  font-size:14px;line-height:1.45
}
.kel-msg.user{margin-left:auto;background:rgba(255,255,255,.12)}
.kel-srcs{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.kel-chip{
  font-size:12px;background:#06b6d4;color:#000;padding:4px 10px;border-radius:999px;
  font-weight:700;text-decoration:none;display:inline-block
}
.kel-chip:hover{background:#0ea5e9}
.kel-input{
  display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.08);padding:8px 12px
}
.kel-input input{
  flex:1;border:none;background:rgba(255,255,255,.06);color:#e6eefc;border-radius:8px;padding:8px;
  font-size:14px;outline:none
}
.kel-input button{
  background:#06b6d4;color:#000;border:none;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer
}

/* Spinner (animated dots) */
.kel-spinner{display:inline-flex;align-items:center;gap:6px}
.kel-dot{
  width:6px;height:6px;border-radius:50%;background:#cbd5e1;opacity:.6;
  animation:kel-bounce 1.2s infinite ease-in-out
}
.kel-dot:nth-child(2){animation-delay:0.15s}
.kel-dot:nth-child(3){animation-delay:0.3s}
@keyframes kel-bounce{
  0%,80%,100%{transform:translateY(0);opacity:.5}
  40%{transform:translateY(-5px);opacity:1}
}
`; }

  /* ---------- panel template ---------- */
  function panelHTML() {
    return `
      <style>${css()}</style>
      <div class="kel-head">
        <div>Chat with Kel’s AI</div>
        <button id="kel-close" aria-label="Close"
          style="background:none;border:none;color:#e6eefc;font-size:16px;cursor:pointer">✕</button>
      </div>
      <div id="kel-body" class="kel-body"></div>
      <form id="kel-form" class="kel-input">
        <input id="kel-input" placeholder="Ask about projects, PM, DJing…" />
        <button type="submit">Send</button>
      </form>`;
  }

  /* ---------- message bubble ---------- */
  function renderMsg(text, role, sources) {
    const wrap = el("div", "kel-msg " + (role === "user" ? "user" : ""));
    if (text) wrap.textContent = text;

    if (Array.isArray(sources) && sources.length) {
      const srcs = el("div", "kel-srcs");
      sources.forEach((s) => {
        const a = el("a", "kel-chip");
        a.textContent = s.title || "Source";
        if (s.url) { a.href = s.url; a.target = "_blank"; rel="noopener"; }
        srcs.appendChild(a);
      });
      wrap.appendChild(srcs);
    }
    return wrap;
  }

  /* ---------- main entry ---------- */
  function init({ api, starters = [] } = {}) {
    if (!api) { console.warn("KelChat: missing `api` URL"); }

    const fab = el("button", "kel-fab");
    fab.textContent = "Chat";
    const panel = el("div", "kel-panel");
    panel.style.display = "none";
    panel.innerHTML = panelHTML();

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    const body  = panel.querySelector("#kel-body");
    const form  = panel.querySelector("#kel-form");
    const input = panel.querySelector("#kel-input");
    const close = panel.querySelector("#kel-close");

    // Welcome
    body.appendChild(
      renderMsg("Hey! I’m Kel’s AI assistant. Ask about projects, product philosophy, or side ventures.", "assistant")
    );

    // Starter chips
    if (starters.length) {
      const chips = el("div");
      chips.style.padding = "0 12px 8px";
      starters.forEach((s) => {
        const b = el("button");
        b.type = "button";
        b.textContent = s;
        b.style.cssText =
          "margin:4px 6px 0 0;font-size:12px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#e6eefc;cursor:pointer";
        b.onclick = () => {
          input.value = s;
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        };
        chips.appendChild(b);
      });
      body.appendChild(chips);
    }

    // Open/close
    fab.onclick   = () => { panel.style.display = "block"; input.focus(); };
    close.onclick = () => { panel.style.display = "none"; };

    // Submit + spinner
    form.onsubmit = (e) => {
      e.preventDefault();
      const text = (input.value || "").trim();
      if (!text) return;

      // Echo user message
      body.appendChild(renderMsg(text, "user"));
      input.value = "";
      body.scrollTop = body.scrollHeight;

      // Add spinner as a temporary assistant message
      const loader = renderMsg("", "assistant");
      loader.id = "kel-loader";
      const spin = document.createElement("div");
      spin.className = "kel-spinner";
      spin.setAttribute("aria-live", "polite");
      spin.innerHTML = `
        <span class="kel-dot"></span>
        <span class="kel-dot"></span>
        <span class="kel-dot"></span>`;
      loader.appendChild(spin);
      body.appendChild(loader);
      body.scrollTop = body.scrollHeight;

      fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
      })
        .then((r) => r.json())
        .then((j) => {
          const l = document.getElementById("kel-loader");
          if (l) l.remove();
          body.appendChild(
            renderMsg(
              j && j.content ? j.content : "Sorry, something went wrong.",
              "assistant",
              (j && j.sources) || []
            )
          );
          body.scrollTop = body.scrollHeight;
        })
        .catch(() => {
          const l = document.getElementById("kel-loader");
          if (l) l.remove();
          body.appendChild(renderMsg("Hmm, something went wrong. Try again?", "assistant"));
        });
    };
  }

  /* expose */
  window.KelChat = { init };
})();
</script>

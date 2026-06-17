import { DEFAULT_WS_PORT } from "@livemcp/shared";

const portEl = document.getElementById("port") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;
const dotEl = document.getElementById("dot") as HTMLDivElement;
const connectBtn = document.getElementById("connect") as HTMLButtonElement;
const disconnectBtn = document.getElementById("disconnect") as HTMLButtonElement;
const logEl = document.getElementById("log") as HTMLDivElement;
const clearLogBtn = document.getElementById("clearLog") as HTMLButtonElement;
const totalCallsEl = document.getElementById("totalCalls") as HTMLDivElement;
const okCallsEl = document.getElementById("okCalls") as HTMLDivElement;
const errCallsEl = document.getElementById("errCalls") as HTMLDivElement;

type LogEntry = {
  action: string;
  ok: boolean;
  error?: string;
  ms: number;
  ts: number;
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function renderLog(entries: LogEntry[]): void {
  if (entries.length === 0) {
    logEl.innerHTML = `<div class="log-empty">No calls yet</div>`;
    totalCallsEl.textContent = "0";
    okCallsEl.textContent = "0";
    errCallsEl.textContent = "0";
    return;
  }
  const ok = entries.filter((e) => e.ok).length;
  const err = entries.length - ok;
  totalCallsEl.textContent = String(entries.length);
  okCallsEl.textContent = String(ok);
  errCallsEl.textContent = String(err);

  const html = entries
    .slice()
    .reverse()
    .map((e) => {
      const icon = e.ok
        ? `<div class="log-icon ok">&#10003;</div>`
        : `<div class="log-icon err">&#10007;</div>`;
      const errLine = e.error ? `<div class="log-error">${esc(e.error)}</div>` : "";
      return `<div class="log-entry">${icon}<div class="log-body"><div class="log-action">${esc(e.action)}</div><div class="log-meta">${timeAgo(e.ts)} &middot; ${e.ms}ms</div>${errLine}</div></div>`;
    })
    .join("");
  logEl.innerHTML = html;
}

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

async function refresh(): Promise<void> {
  const store = await chrome.storage.local.get([
    "wsPort",
    "bridgeConnected",
    "bridgeLastError",
    "bridgeUserWantsConnect",
    "toolLog",
  ]);
  portEl.value = String(typeof store.wsPort === "number" ? store.wsPort : DEFAULT_WS_PORT);

  dotEl.className = "dot";
  if (store.bridgeConnected) {
    dotEl.classList.add("connected");
    statusEl.textContent = "Connected";
  } else if (store.bridgeUserWantsConnect) {
    dotEl.classList.add("connecting");
    statusEl.textContent = store.bridgeLastError
      ? `Reconnecting… ${store.bridgeLastError}`
      : "Connecting…";
  } else {
    dotEl.classList.add("idle");
    statusEl.textContent = store.bridgeLastError
      ? `Idle — ${store.bridgeLastError}`
      : "Idle";
  }
  connectBtn.disabled = Boolean(store.bridgeConnected || store.bridgeUserWantsConnect);
  disconnectBtn.disabled = !store.bridgeUserWantsConnect && !store.bridgeConnected;

  renderLog(Array.isArray(store.toolLog) ? store.toolLog : []);
}

portEl.addEventListener("change", async () => {
  const n = Number(portEl.value);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    await refresh();
    return;
  }
  await chrome.storage.local.set({ wsPort: n });
});

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  await chrome.runtime.sendMessage({ type: "bridgeConnect" });
  await refresh();
});

disconnectBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "bridgeDisconnect" });
  await refresh();
});

clearLogBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ toolLog: [] });
  await refresh();
});

void refresh();
chrome.storage.onChanged.addListener((_, area) => {
  if (area === "local") void refresh();
});

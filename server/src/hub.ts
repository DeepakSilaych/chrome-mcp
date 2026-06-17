import { createServer as createNetServer } from "node:net";
import { existsSync, unlinkSync } from "node:fs";
import type { Socket } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import type { BridgeRequest, BridgeResponse } from "@livemcp/shared";
import { isBridgeResponse, DEFAULT_WS_PORT } from "@livemcp/shared";

export const HUB_SOCK = process.env.LIVEMCP_HUB_SOCK ?? "/tmp/livemcp-hub.sock";
const basePort = Number(process.env.LIVEMCP_PORT ?? DEFAULT_WS_PORT) || DEFAULT_WS_PORT;

// session → hub (Unix socket, newline-delimited JSON)
type IpcRegister   = { type: "register";   sessionId: string };
type IpcUnregister = { type: "unregister"; sessionId: string };
type IpcRequest    = { type: "request";    sessionId: string; id: string; action: string; params?: Record<string, unknown> };
type IpcMessage    = IpcRegister | IpcUnregister | IpcRequest;

// hub → session
type IpcRegistered = { type: "registered"; sessionId: string };
type IpcStatus     = { type: "status";     connected: boolean };
type IpcResponse   = { type: "response";   id: string; result?: unknown; error?: string };

let extensionWs: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | undefined;
const sessions = new Map<string, Socket>(); // sessionId → IPC socket
const pending  = new Map<string, string>(); // requestId → sessionId

function sendToSession(sessionId: string, msg: IpcRegistered | IpcStatus | IpcResponse): void {
  const sock = sessions.get(sessionId);
  if (sock && !sock.destroyed) sock.write(JSON.stringify(msg) + "\n");
}

function broadcastStatus(): void {
  const connected = extensionWs !== null && extensionWs.readyState === WebSocket.OPEN;
  for (const sessionId of sessions.keys()) {
    sendToSession(sessionId, { type: "status", connected });
  }
}

// ── Layer 1: WebSocket server for Chrome extension ────────────────────────────

let activeWss: WebSocketServer | null = null;

function startWss(port: number): void {
  const wss = new WebSocketServer({ host: "127.0.0.1", port });

  wss.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      wss.close();
      process.stderr.write(`[livemcp-hub] Port ${port} busy, trying ${port + 1}...\n`);
      startWss(port + 1);
      return;
    }
    process.stderr.write(`[livemcp-hub] WebSocket error: ${err.message}\n`);
    process.exit(1);
  });

  wss.once("listening", () => {
    activeWss = wss;
    if (port !== basePort) {
      process.stderr.write(`\n⚠️  Port ${basePort} was busy — hub bound to port ${port}.\n`);
      process.stderr.write(`   Open the extension popup → change port to ${port} → reconnect.\n\n`);
    }
    process.stderr.write(`[livemcp-hub] IPC socket : ${HUB_SOCK}\n`);
    process.stderr.write(`[livemcp-hub] WebSocket  : ws://127.0.0.1:${port}\n`);
    process.stderr.write("[livemcp-hub] Ready — waiting for extension and sessions\n");
  });

  wss.on("connection", (ws) => {
    if (extensionWs?.readyState === WebSocket.OPEN) extensionWs.close();
    if (pingTimer) clearInterval(pingTimer);

    extensionWs = ws;
    process.stderr.write("[livemcp-hub] Chrome extension connected\n");
    broadcastStatus();

    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 25_000);

    ws.on("message", (raw) => {
      let parsed: unknown;
      try { parsed = JSON.parse(raw.toString()); } catch { return; }
      if (parsed && typeof parsed === "object" && "keepalive" in (parsed as Record<string, unknown>)) return;
      if (!isBridgeResponse(parsed)) return;

      const res = parsed as BridgeResponse;
      const sessionId = pending.get(res.id);
      if (!sessionId) return;
      pending.delete(res.id);
      sendToSession(sessionId, { type: "response", id: res.id, result: res.result, error: res.error });
    });

    const onClose = () => {
      if (extensionWs !== ws) return;
      extensionWs = null;
      if (pingTimer) { clearInterval(pingTimer); pingTimer = undefined; }
      process.stderr.write("[livemcp-hub] Chrome extension disconnected\n");
      broadcastStatus();
    };
    ws.on("close", onClose);
    ws.on("error", onClose);
  });
}

// ── Layer 3: Unix socket IPC server for MCP sessions ─────────────────────────

if (existsSync(HUB_SOCK)) {
  try { unlinkSync(HUB_SOCK); } catch {}
}

const ipcServer = createNetServer((sock) => {
  let buf = "";

  sock.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let msg: IpcMessage;
      try { msg = JSON.parse(line) as IpcMessage; } catch { continue; }

      if (msg.type === "register") {
        sessions.set(msg.sessionId, sock);
        sendToSession(msg.sessionId, { type: "registered", sessionId: msg.sessionId });
        sendToSession(msg.sessionId, { type: "status", connected: extensionWs?.readyState === WebSocket.OPEN });
        process.stderr.write(`[livemcp-hub] Session registered: ${msg.sessionId} (${sessions.size} active)\n`);

      } else if (msg.type === "unregister") {
        sessions.delete(msg.sessionId);
        process.stderr.write(`[livemcp-hub] Session unregistered: ${msg.sessionId} (${sessions.size} active)\n`);

      } else if (msg.type === "request") {
        if (!extensionWs || extensionWs.readyState !== WebSocket.OPEN) {
          sendToSession(msg.sessionId, { type: "response", id: msg.id, error: "Chrome extension not connected to hub" });
          return;
        }
        pending.set(msg.id, msg.sessionId);
        const req: BridgeRequest = { id: msg.id, action: msg.action as BridgeRequest["action"], params: msg.params };
        extensionWs.send(JSON.stringify(req));
      }
    }
  });

  sock.on("close", () => {
    for (const [sessionId, s] of sessions) {
      if (s === sock) {
        sessions.delete(sessionId);
        process.stderr.write(`[livemcp-hub] Session disconnected: ${sessionId} (${sessions.size} active)\n`);
      }
    }
  });

  sock.on("error", () => {});
});

ipcServer.listen(HUB_SOCK);

const shutdown = () => {
  ipcServer.close();
  activeWss?.close();
  try { unlinkSync(HUB_SOCK); } catch {}
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);

startWss(basePort);

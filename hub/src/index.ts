#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import type { BridgeRequest, BridgeResponse } from "@livemcp/shared";
import { isBridgeResponse, isBridgeRequest, DEFAULT_WS_PORT } from "@livemcp/shared";

const port = Number(process.env.LIVEMCP_PORT ?? DEFAULT_WS_PORT) || DEFAULT_WS_PORT;

process.stderr.write(`[livemcp-hub] Starting on ws://127.0.0.1:${port}\n`);

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  sessionId: string;
};

const pending = new Map<string, Pending>();
let extensionWs: WebSocket | null = null;
const sessions = new Map<string, WebSocket>();

const wss = new WebSocketServer({ host: "127.0.0.1", port });

wss.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    process.stderr.write(
      `[livemcp-hub] Port ${port} already in use. Kill the other process or set LIVEMCP_PORT.\n`,
    );
    process.exit(1);
  }
  process.stderr.write(`[livemcp-hub] WebSocket error: ${err.message}\n`);
});

wss.on("connection", (ws) => {
  // First message identifies the peer as "extension" or "session:<id>"
  ws.once("message", (raw) => {
    let hello: { type: string; id?: string };
    try {
      hello = JSON.parse(raw.toString());
    } catch {
      ws.close();
      return;
    }

    if (hello.type === "extension") {
      if (extensionWs && extensionWs.readyState === WebSocket.OPEN) {
        extensionWs.close();
      }
      extensionWs = ws;
      process.stderr.write("[livemcp-hub] Extension connected\n");

      ws.on("message", (data) => {
        let res: unknown;
        try { res = JSON.parse(data.toString()); } catch { return; }
        if (!isBridgeResponse(res)) return;
        const bridgeRes = res as BridgeResponse;
        const slot = pending.get(bridgeRes.id);
        if (!slot) return;
        clearTimeout(slot.timer);
        pending.delete(bridgeRes.id);
        const sessionWs = sessions.get(slot.sessionId);
        if (sessionWs?.readyState === WebSocket.OPEN) {
          sessionWs.send(JSON.stringify(bridgeRes));
        }
      });

      ws.on("close", () => {
        extensionWs = null;
        process.stderr.write("[livemcp-hub] Extension disconnected\n");
      });

    } else if (hello.type === "session") {
      const sessionId = hello.id ?? randomUUID();
      sessions.set(sessionId, ws);
      process.stderr.write(`[livemcp-hub] MCP session connected: ${sessionId}\n`);

      ws.on("message", (data) => {
        let req: unknown;
        try { req = JSON.parse(data.toString()); } catch { return; }
        if (!isBridgeRequest(req)) return;
        const bridgeReq = req as BridgeRequest;
        if (!extensionWs || extensionWs.readyState !== WebSocket.OPEN) {
          const errRes: BridgeResponse = { id: bridgeReq.id, error: "Browser extension not connected to hub" };
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(errRes));
          return;
        }
        const timer = setTimeout(() => {
          pending.delete(bridgeReq.id);
          const errRes: BridgeResponse = { id: bridgeReq.id, error: "Hub request timed out" };
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(errRes));
        }, 30_000);
        pending.set(bridgeReq.id, { resolve: () => {}, reject: () => {}, timer, sessionId });
        extensionWs.send(JSON.stringify(bridgeReq));
      });

      ws.on("close", () => {
        sessions.delete(sessionId);
        process.stderr.write(`[livemcp-hub] MCP session disconnected: ${sessionId}\n`);
      });
    } else {
      ws.close();
    }
  });
});

process.stderr.write(`[livemcp-hub] Ready — waiting for extension and MCP sessions\n`);

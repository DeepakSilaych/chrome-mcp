#!/usr/bin/env node
import WebSocket from "ws";

const port = Number(process.env.LIVEMCP_PORT ?? 17691) || 17691;
const url = `ws://127.0.0.1:${port}`;

const ws = new WebSocket(url);
const t = setTimeout(() => {
  console.error("FAIL: timeout (no TCP/WebSocket accept)");
  process.exit(1);
}, 5000);

ws.on("open", () => {
  clearTimeout(t);
  console.log(`OK: WebSocket server accepted a connection on ${url}`);
  console.log(
    "Note: the bridge allows only one client. If Chrome was connected, this probe may have closed that socket—click Connect again in the extension.",
  );
  ws.close();
  process.exit(0);
});

ws.on("error", (e) => {
  clearTimeout(t);
  console.error("FAIL:", e.message);
  process.exit(1);
});

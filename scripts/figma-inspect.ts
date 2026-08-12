/**
 * One-shot Figma inspector — connects to relay, joins channel, runs commands.
 * Usage: bun run scripts/figma-inspect.ts <channel> <command> [args...]
 *
 * Examples:
 *   bun run scripts/figma-inspect.ts zd5b1ca3 get_node_info 3009:20959 2
 *   bun run scripts/figma-inspect.ts zd5b1ca3 get_selection
 *   bun run scripts/figma-inspect.ts zd5b1ca3 get_document_info
 */
import { WebSocket } from "ws";

const CHANNEL = process.argv[2];
const COMMAND = process.argv[3];
const NODE_ID = process.argv[4];
const DEPTH = process.argv[5] ? parseInt(process.argv[5], 10) : undefined;

if (!CHANNEL || !COMMAND) {
  console.error("Usage: bun run scripts/figma-inspect.ts <channel> <command> [nodeId] [depth]");
  process.exit(1);
}

const ws = new WebSocket("ws://localhost:3055");
const requestId = `inspect_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let joined = false;
let resultReceived = false;

ws.on("open", () => {
  // Join channel
  ws.send(JSON.stringify({
    type: "join",
    channel: CHANNEL,
    sessionId: `inspect_${process.pid}_${Date.now()}`,
  }));
});

ws.on("message", (data: Buffer | string) => {
  const msg = JSON.parse(data.toString());
  if (!joined && msg.type === "system" && msg.message?.result) {
    joined = true;
    console.error(`[joined channel ${CHANNEL}]`);
    // Send command
    const params: any = {};
    if (NODE_ID) params.nodeId = NODE_ID;
    if (DEPTH !== undefined) params.depth = DEPTH;
    ws.send(JSON.stringify({
      type: "message",
      channel: CHANNEL,
      message: { id: requestId, command: COMMAND, params },
    }));
    console.error(`[sent ${COMMAND} ${NODE_ID || ""} depth=${DEPTH ?? "default"}]`);
    return;
  }
  // Look for our response (skip relay's command echo which has same id but no result/error)
  if (msg.message?.id === requestId && (msg.message.result !== undefined || msg.message.error)) {
    resultReceived = true;
    if (msg.message.error) {
      console.error("ERROR:", msg.message.error);
      ws.close();
      process.exit(1);
    }
    console.log(JSON.stringify(msg.message.result, null, 2));
    ws.close();
    process.exit(0);
  }
  // Ignore: echo (sender: "You", has command), progress updates, other channel chatter
});

ws.on("error", (err: Error) => {
  console.error("WS error:", err.message);
  process.exit(1);
});

// Timeout: 60s — plugin exportAsync can take time on large nodes
setTimeout(() => {
  if (!resultReceived) {
    console.error("TIMEOUT: no response from plugin in 60s");
    ws.close();
    process.exit(2);
  }
}, 60000);

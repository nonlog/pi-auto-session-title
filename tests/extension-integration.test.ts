import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import autoSessionTitle from "../extensions/auto-session-title.js";

type Handler = (event: any, ctx: any) => any;

function makeHarness(options?: { response?: unknown; completeError?: Error; deferred?: boolean }) {
  const handlers = new Map<string, Handler[]>();
  const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
  let name: string | undefined;
  let completeCalls = 0;
  let deferredResolve: ((value: unknown) => void) | undefined;

  const pi = {
    on(event: string, handler: Handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    registerCommand(command: string, def: any) {
      commands.set(command, def);
    },
    getSessionName() {
      return name;
    },
    setSessionName(value: string) {
      name = value;
    },
  };

  autoSessionTitle(pi as any);

  const entries: any[] = [];
  let sessionId = "session-a";
  const notifications: Array<[string, string | undefined]> = [];
  const ctx = {
    sessionManager: {
      getSessionId: () => sessionId,
      getEntries: () => entries,
    },
    modelRegistry: {
      find: () => ({ provider: "www", id: "deepseek-v4-flash" }),
      complete: async () => {
        completeCalls++;
        if (options?.completeError) throw options.completeError;
        if (options?.deferred) {
          return await new Promise((resolve) => { deferredResolve = resolve; });
        }
        return options?.response ?? { content: [{ type: "text", text: "修复 Pi 自动标题" }] };
      },
    },
    model: { provider: "www", id: "deepseek-v4-flash" },
    thinkingLevel: "minimal",
    ui: {
      notify(message: string, type?: string) {
        notifications.push([message, type]);
      },
    },
  };

  async function emit(event: string, payload: any = {}) {
    for (const handler of handlers.get(event) ?? []) await handler(payload, ctx);
  }

  return {
    pi,
    ctx,
    entries,
    commands,
    notifications,
    emit,
    get name() { return name; },
    set name(value: string | undefined) { name = value; },
    get completeCalls() { return completeCalls; },
    setSessionId(value: string) { sessionId = value; },
    resolveDeferred(value: unknown) {
      assert.ok(deferredResolve, "expected deferred model request");
      deferredResolve(value);
    },
  };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

process.env.PI_CODING_AGENT_DIR = join(tmpdir(), `pi-auto-title-tests-${process.pid}-missing`);
process.env.PI_AUTO_TITLE_MODEL = "current";
process.env.PI_AUTO_TITLE_RETRIES = "2";
process.env.PI_AUTO_TITLE_DEBUG = "0";

{
  const h = makeHarness({ response: { content: [{ type: "text", text: "修复 Pi 自动标题" }] } });
  await h.emit("session_start", { reason: "new" });
  h.entries.push({ type: "message", message: { role: "user", content: "请帮我修复 Pi 自动标题插件" } });
  await h.emit("before_agent_start", { prompt: "请帮我修复 Pi 自动标题插件" });
  await settle();
  assert.equal(h.name, "修复 Pi 自动标题");
  assert.equal(h.completeCalls, 1);
}

{
  const h = makeHarness({ response: { content: [] } });
  await h.emit("session_start", { reason: "new" });
  h.entries.push({ type: "message", message: { role: "user", content: "请帮我修复 Pi 自动会话标题插件。现在模型返回空标题。" } });
  await h.emit("before_agent_start", { prompt: "请帮我修复 Pi 自动会话标题插件。现在模型返回空标题。" });
  await settle();
  assert.equal(h.name, "修复 Pi 自动会话标题插件");
  assert.equal(h.completeCalls, 2);
}

{
  const h = makeHarness();
  h.name = "手动名称";
  await h.emit("session_start", { reason: "new" });
  h.entries.push({ type: "message", message: { role: "user", content: "修复自动标题" } });
  await h.emit("before_agent_start", { prompt: "修复自动标题" });
  await settle();
  assert.equal(h.name, "手动名称");
  assert.equal(h.completeCalls, 0);
}

{
  const h = makeHarness({ deferred: true });
  await h.emit("session_start", { reason: "new" });
  h.entries.push({ type: "message", message: { role: "user", content: "修复自动标题竞争条件" } });
  await h.emit("before_agent_start", { prompt: "修复自动标题竞争条件" });
  await settle();
  h.name = "用户稍后手动命名";
  h.resolveDeferred({ content: [{ type: "text", text: "模型标题" }] });
  await settle();
  assert.equal(h.name, "用户稍后手动命名");
}

{
  const h = makeHarness({ deferred: true });
  await h.emit("session_start", { reason: "new" });
  h.entries.push({ type: "message", message: { role: "user", content: "修复切换会话时的标题竞争条件" } });
  await h.emit("before_agent_start", { prompt: "修复切换会话时的标题竞争条件" });
  await settle();
  h.setSessionId("session-b");
  await h.emit("session_start", { reason: "new" });
  h.resolveDeferred({ content: [{ type: "text", text: "旧会话模型标题" }] });
  await settle();
  assert.equal(h.name, undefined);
}

{
  const h = makeHarness();
  await h.emit("session_start", { reason: "new" });
  h.entries.push({ type: "message", message: { role: "user", content: "继续" } });
  await h.emit("before_agent_start", { prompt: "继续" });
  await settle();
  assert.equal(h.name, undefined);
  assert.equal(h.completeCalls, 0);

  h.entries.push({ type: "message", message: { role: "user", content: "修复 Pi 自动标题插件" } });
  await h.emit("before_agent_start", { prompt: "修复 Pi 自动标题插件" });
  await settle();
  assert.equal(h.name, "修复 Pi 自动标题");
  assert.equal(h.completeCalls, 1);
}

{
  const h = makeHarness({ response: { content: [{ type: "output_text", text: "重新生成会话标题" }] } });
  h.name = "旧名称";
  await h.emit("session_start", { reason: "resume" });
  h.entries.push({ type: "message", message: { role: "user", content: "实现 Pi 自动会话标题插件" } });
  const retitle = h.commands.get("retitle");
  assert.ok(retitle);
  await retitle.handler("", h.ctx);
  assert.equal(h.name, "重新生成会话标题");
}

process.env.PI_AUTO_TITLE_TIMEOUT_MS = "100";
{
  const h = makeHarness({ deferred: true });
  await h.emit("session_start", { reason: "new" });
  h.entries.push({ type: "message", message: { role: "user", content: "修复标题模型永久挂起问题" } });
  await h.emit("before_agent_start", { prompt: "修复标题模型永久挂起问题" });
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(h.name, "修复标题模型永久挂起问题");
  assert.equal(h.completeCalls, 2);
}
delete process.env.PI_AUTO_TITLE_TIMEOUT_MS;
console.log("extension integration tests passed");



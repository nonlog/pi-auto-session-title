import assert from "node:assert/strict";
import {
  extractAssistantText,
  heuristicTitle,
  isTrivialPrompt,
  messageText,
  parseModelSpec,
  sanitizeTitle,
} from "../src/title-utils.js";

assert.deepEqual(parseModelSpec("www/deepseek-v4-flash:minimal"), {
  useCurrent: false,
  provider: "www",
  id: "deepseek-v4-flash",
  thinking: "minimal",
});
assert.deepEqual(parseModelSpec("current"), { useCurrent: true });
assert.deepEqual(parseModelSpec("bad-model"), { useCurrent: true });

assert.equal(messageText({ role: "user", content: "  修复 Pi 自动标题  " }), "修复 Pi 自动标题");
assert.equal(messageText({ role: "user", content: [{ type: "text", text: "first" }, { type: "text", text: "second" }] }), "first\nsecond");
assert.equal(messageText({ role: "assistant", content: "ignore" }), undefined);

assert.equal(extractAssistantText({ content: [{ type: "text", text: "修复 Pi 自动标题" }] }), "修复 Pi 自动标题");
assert.equal(extractAssistantText({ content: [{ type: "output_text", text: "Pi title parser" }] }), "Pi title parser");
assert.equal(extractAssistantText({ output_text: "Direct title" }), "Direct title");
assert.equal(extractAssistantText({ content: [{ type: "thinking", thinking: "secret reasoning" }] }), "");

assert.equal(sanitizeTitle('标题："修复 Pi 自动标题。"'), "修复 Pi 自动标题");
assert.equal(sanitizeTitle("Title: Fix https://example.com D:\\secret\\file.ts naming"), "Fix naming");
assert.equal(sanitizeTitle(""), "");
assert.equal(sanitizeTitle("读取 Codex 会话 11111111-2222-3333-4444-555555555555 transcript"), "读取 Codex 会话 transcript");

assert.equal(isTrivialPrompt("继续"), true);
assert.equal(isTrivialPrompt("continue"), true);
assert.equal(isTrivialPrompt("修复 Pi 自动会话标题插件"), false);

assert.equal(heuristicTitle("请帮我修复 Pi 自动会话标题插件。现在总是生成空标题。"), "修复 Pi 自动会话标题插件");
assert.equal(heuristicTitle("Please fix D:\\Workspace\\secret\\file.ts session title generation."), "fix session title generation");

console.log("title-utils tests passed");

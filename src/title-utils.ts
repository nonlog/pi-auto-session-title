export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface ParsedModelSpec {
  useCurrent: boolean;
  provider?: string;
  id?: string;
  thinking?: ThinkingLevel;
}

const THINKING_LEVELS = new Set<ThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export function parseModelSpec(raw: string | undefined): ParsedModelSpec {
  const value = raw?.trim();
  if (!value || value === "current" || value === "auto") return { useCurrent: true };

  const slash = value.indexOf("/");
  if (slash <= 0 || slash === value.length - 1) return { useCurrent: true };

  const provider = value.slice(0, slash).trim();
  let id = value.slice(slash + 1).trim();
  if (!provider || !id) return { useCurrent: true };

  let thinking: ThinkingLevel | undefined;
  const colon = id.lastIndexOf(":");
  if (colon > 0) {
    const suffix = id.slice(colon + 1) as ThinkingLevel;
    if (THINKING_LEVELS.has(suffix)) {
      thinking = suffix;
      id = id.slice(0, colon);
    }
  }

  if (!id) return { useCurrent: true };
  return { useCurrent: false, provider, id, thinking };
}

export function messageText(message: unknown): string | undefined {
  if (!message || typeof message !== "object") return undefined;
  const candidate = message as { role?: unknown; content?: unknown };
  if (candidate.role !== "user") return undefined;

  if (typeof candidate.content === "string") {
    const text = candidate.content.trim();
    return text || undefined;
  }
  if (!Array.isArray(candidate.content)) return undefined;

  const parts: string[] = [];
  for (const part of candidate.content) {
    if (!part || typeof part !== "object") continue;
    const item = part as { type?: unknown; text?: unknown; content?: unknown };
    if ((item.type === "text" || item.type === "input_text") && typeof item.text === "string") {
      parts.push(item.text);
    } else if (item.type === "text" && typeof item.content === "string") {
      parts.push(item.content);
    }
  }
  const text = parts.join("\n").trim();
  return text || undefined;
}

export function extractAssistantText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const candidate = response as Record<string, unknown>;

  const direct = [candidate.text, candidate.output_text];
  for (const value of direct) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const content = candidate.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const item = part as Record<string, unknown>;
    const type = typeof item.type === "string" ? item.type : "";
    if (type !== "text" && type !== "output_text" && type !== "input_text") continue;
    if (typeof item.text === "string") parts.push(item.text);
    else if (typeof item.content === "string") parts.push(item.content);
    else if (typeof item.value === "string") parts.push(item.value);
  }
  return parts.join("\n").trim();
}

export function sanitizeTitle(raw: string, maxChars = 64): string {
  const limit = clampInt(maxChars, 64, 24, 96);
  let title = raw.trim();
  if (!title) return "";

  title = title.replace(/^```(?:\w+)?\s*/i, "").replace(/```$/i, "").trim();
  title = title.split(/\r?\n/, 1)[0] ?? title;
  title = title.replace(/^(?:title|session\s*title|conversation\s*title|name|标题|会话标题|名称)\s*[:：]\s*/i, "");
  title = title.replace(/^[`*_#"'“”‘’\s]+|[`*_#"'“”‘’\s]+$/g, "");
  title = title.replace(/https?:\/\/\S+/gi, "");
  title = title.replace(/\b[A-Za-z]:[\\/][^\s"'<>|]+/g, "");
  title = title.replace(/(?:^|\s)\/[\w./~-]{4,}/g, " ");
  title = title.replace(/\b(?:sk|pk|ghp|github_pat|xox[baprs])-?[A-Za-z0-9_-]{12,}\b/gi, "");
  title = title.replace(/\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*\b/gi, "");
  title = title.replace(/\s+/g, " ").trim();
  title = title.replace(/[.。!！?？,，;；:：\-–—]+$/g, "").trim();

  if (title.length > limit) {
    title = title.slice(0, limit).replace(/[\s.。!！?？,，;；:：/\\\-–—]+$/g, "").trim();
  }
  return title;
}

export function isTrivialPrompt(raw: string): boolean {
  const text = raw.trim().replace(/[.!！?？。\s]+$/g, "").trim().toLowerCase();
  if (!text) return true;
  if (text.length > 48) return false;

  return /^(?:继续|继续任务|继续吧|接着|接着来|开始|开始吧|下一步|下一阶段|好的|好|可以|行|嗯|嗯嗯|ok|okay|yes|yep|continue|go|start|next|proceed|do it|keep going)$/.test(text);
}

export function heuristicTitle(source: string, maxChars = 64): string {
  let text = source.trim();
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/https?:\/\/\S+/gi, " ");
  text = text.replace(/\b[A-Za-z]:[\\/][^\s"'<>|]+/g, " ");
  text = text.replace(/(?:^|\s)\/[\w./~-]{4,}/g, " ");
  text = text.replace(/\b(?:sk|pk|ghp|github_pat|xox[baprs])-?[A-Za-z0-9_-]{12,}\b/gi, " ");
  text = text.replace(/^[\s]*(?:请帮我|可以帮我|能不能|麻烦|帮我|请|please\s+|can\s+you\s+|could\s+you\s+)/i, "");
  text = text.replace(/[`*_#]+/g, " ").replace(/\s+/g, " ").trim();

  for (const separator of ["。", "！", "？", ". ", "! ", "? ", "；", "; ", "\n"]) {
    const index = text.indexOf(separator);
    if (index > 0) {
      text = text.slice(0, index);
      break;
    }
  }

  return sanitizeTitle(text, maxChars);
}

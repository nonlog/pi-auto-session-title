declare module "@earendil-works/pi-ai" {
  export interface Model<T = any> {
    provider: string;
    id: string;
  }

  export interface UserMessage {
    role: "user";
    content: string | Array<Record<string, unknown>>;
    timestamp: number;
  }
}

declare module "@earendil-works/pi-coding-agent" {
  import type { Model } from "@earendil-works/pi-ai";

  export interface SessionEntry {
    type: string;
    message?: unknown;
  }

  export interface SessionManagerView {
    getSessionId(): string;
    getEntries(): SessionEntry[];
  }

  export interface ModelRegistryView {
    find(provider: string, modelId: string): Model<any> | undefined;
    complete(model: Model<any>, context: unknown, options?: unknown): Promise<unknown>;
  }

  export interface ExtensionUIContext {
    notify(message: string, type?: "info" | "warning" | "error"): void;
  }

  export interface ExtensionContext {
    sessionManager: SessionManagerView;
    modelRegistry: ModelRegistryView;
    model: Model<any> | undefined;
    thinkingLevel?: string;
    ui: ExtensionUIContext;
  }

  export interface ExtensionAPI {
    on(event: string, handler: (event: any, ctx: ExtensionContext) => void | Promise<void>): void;
    registerCommand(name: string, options: {
      description?: string;
      handler: (args: string, ctx: ExtensionContext) => Promise<void>;
    }): void;
    getSessionName(): string | undefined;
    setSessionName(name: string): void;
  }
}

import type { TranslateRequest, TranslateResponse } from "./types.js";
import { initializeSettings } from "./settings.js";

function fillPromptTemplate(
  template: string,
  sourceLang: string,
  sourceCode: string,
  targetLang: string,
  targetCode: string,
  text: string,
): string {
  return template
    .replaceAll("{SOURCE_LANG}", sourceLang)
    .replaceAll("{SOURCE_CODE}", sourceCode)
    .replaceAll("{TARGET_LANG}", targetLang)
    .replaceAll("{TARGET_CODE}", targetCode)
    .replaceAll("{TEXT}", text);
}

function getOpenAIEndpoint(apiUrl: string): string {
  let base = apiUrl.trim().replace(/\/+$/, "");
  if (!base.endsWith("/v1")) {
    base += "/v1";
  }
  return `${base}/chat/completions`;
}

type SSEEvent =
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | null;

function parseSSELine(line: string): SSEEvent {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("data:")) {
    return null;
  }

  const data = trimmed.slice(5).trim();
  if (data === "[DONE]") {
    return { type: "done" };
  }

  let parsed: {
    choices?: Array<{
      delta?: { content?: string };
      finish_reason?: string | null;
    }>;
    error?: { message?: string };
  };
  try {
    parsed = JSON.parse(data) as typeof parsed;
  } catch {
    return { type: "error", message: `Invalid SSE data from API: ${data}` };
  }

  if (parsed.error?.message) {
    return { type: "error", message: parsed.error.message };
  }

  const content = parsed.choices?.[0]?.delta?.content;
  if (typeof content === "string" && content.length > 0) {
    return { type: "chunk", text: content };
  }

  if (parsed.choices?.[0]?.finish_reason) {
    return { type: "done" };
  }

  return null;
}

async function streamTranslate(
  apiUrl: string,
  apiKey: string,
  modelName: string,
  prompt: string,
  port: chrome.runtime.Port,
  signal: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(getOpenAIEndpoint(apiUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API returned ${response.status}${body ? `: ${body}` : ""}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) {
        throw new DOMException("Translation aborted", "AbortError");
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) {
          continue;
        }

        if (event.type === "error") {
          throw new Error(event.message);
        }

        port.postMessage(event as TranslateResponse);

        if (event.type === "done") {
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const doneResponse: TranslateResponse = { type: "done" };
  port.postMessage(doneResponse);
}

async function handleTranslateRequest(
  request: TranslateRequest,
  port: chrome.runtime.Port,
  signal: AbortSignal,
): Promise<void> {
  const prompt = fillPromptTemplate(
    request.promptTemplate,
    request.sourceLang,
    request.sourceCode,
    request.targetLang,
    request.targetCode,
    request.text,
  );

  await streamTranslate(request.apiUrl, request.apiKey, request.modelName, prompt, port, signal);
}

function createContextMenu(): void {
  chrome.contextMenus.create(
    {
      id: "tora-translate-selection",
      title: "選択したテキストを翻訳",
      contexts: ["selection"],
      enabled: false,
    },
    () => {
      if (chrome.runtime.lastError) {
        // Menu may already exist.
      }
    },
  );
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    void initializeSettings();
  }

  createContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "tora-translate-selection" || !tab?.id) {
    return;
  }

  if (!info.selectionText || info.selectionText.trim().length < 2) {
    return;
  }

  void chrome.tabs.sendMessage(tab.id, { type: "context-menu-translate" }).catch(() => {
    // Tab may not have the content script loaded; ignore.
  });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "tora-translate") {
    return;
  }

  const abortController = new AbortController();

  const messageListener = (message: unknown) => {
    const request = message as TranslateRequest;
    if (request.type !== "translate") {
      return;
    }

    void handleTranslateRequest(request, port, abortController.signal).catch((error: unknown) => {
      if (abortController.signal.aborted) {
        return;
      }

      let messageText: string;
      if (error instanceof TypeError) {
        messageText = "API サーバーに接続できません。URL/ポート/モデル名を確認してください";
      } else if (error instanceof Error) {
        messageText = error.message;
      } else {
        messageText = String(error);
      }

      const errorResponse: TranslateResponse = { type: "error", message: messageText };
      try {
        port.postMessage(errorResponse);
      } catch {
        // Port may be disconnected.
      }
    });
  };

  port.onMessage.addListener(messageListener);

  port.onDisconnect.addListener(() => {
    abortController.abort();
  });
});

function updateContextMenuEnabled(enabled: boolean): void {
  chrome.contextMenus.update("tora-translate-selection", { enabled }, () => {
    if (chrome.runtime.lastError) {
      // Menu may not exist yet.
    }
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message &&
    typeof message === "object" &&
    (message as { type?: string }).type === "selection-state"
  ) {
    const payload = message as { type: "selection-state"; valid: boolean };
    updateContextMenuEnabled(payload.valid);
    sendResponse();
    return false;
  }
  return false;
});

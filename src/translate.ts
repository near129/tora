import type { TranslateRequest, TranslateResponse } from "./types.js";
import { getLanguageName, toDisplayCode } from "./constants.js";
import { loadSettings } from "./settings.js";
import {
  currentSelection,
  isTranslating,
  translatePort,
  setIsTranslating,
  setTranslatePort,
  setShowSpeedPanel,
  setTranslateStartTime,
} from "./state.js";
import { showAndPositionPanel } from "./positioning.js";
import {
  hidePanel,
  clearSpeed,
  updateSpeedDisplay,
  clearPanelActions,
  addPanelActions,
  setPanelContentClass,
  clearPanelContent,
  appendPanelContent,
  removePanelTranslatingClass,
} from "./ui.js";

export function closePanel(): void {
  hidePanel();
  abortTranslation();
  clearSpeed();
}

export function abortTranslation(): void {
  if (translatePort) {
    translatePort.disconnect();
    setTranslatePort(null);
  }
  setIsTranslating(false);
}

export function onPortMessage(message: unknown): void {
  const response = message as TranslateResponse;

  if (response.type === "chunk") {
    appendPanelContent(response.text);
    updateSpeedDisplay();
  } else if (response.type === "done") {
    removePanelTranslatingClass();
    setIsTranslating(false);
    setTranslatePort(null);
    updateSpeedDisplay();
  } else if (response.type === "error") {
    removePanelTranslatingClass();
    setIsTranslating(false);
    clearSpeed();
    addPanelActions(response.message, onIconClick, () => {
      void chrome.runtime.openOptionsPage();
    });
    setTranslatePort(null);
  }
}

export async function onIconClick(): Promise<void> {
  if (!currentSelection) {
    return;
  }

  if (isTranslating) {
    abortTranslation();
  }

  const settings = await loadSettings();
  const targetLang = getLanguageName(settings.targetLang);
  const targetCode = toDisplayCode(settings.targetLang);
  setShowSpeedPanel(settings.showSpeed);

  showAndPositionPanel();

  setPanelContentClass("tora-panel-content tora-translating");
  clearPanelContent();
  clearPanelActions();
  clearSpeed();

  setIsTranslating(true);
  setTranslateStartTime(performance.now());

  const request: TranslateRequest = {
    type: "translate",
    text: currentSelection.text,
    sourceLang: currentSelection.sourceLang,
    sourceCode: toDisplayCode(currentSelection.sourceCode),
    targetLang,
    targetCode,
    promptTemplate: settings.promptTemplate,
    apiUrl: settings.apiUrl,
    apiKey: settings.apiKey,
    modelName: settings.modelName,
  };

  const port = chrome.runtime.connect({ name: "tora-translate" });
  setTranslatePort(port);
  port.onMessage.addListener(onPortMessage);
  port.onDisconnect.addListener(() => {
    setIsTranslating(false);
    setTranslatePort(null);
  });
  port.postMessage(request);
}

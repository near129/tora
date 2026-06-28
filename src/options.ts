import type { Settings } from "./types.js";
import { LANGUAGES } from "./constants.js";
import { loadSettings, saveSettings } from "./settings.js";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element not found: ${id}`);
  }
  return element as T;
}

const apiUrlInput = getElement<HTMLInputElement>("api-url");
const apiKeyInput = getElement<HTMLInputElement>("api-key");
const modelNameInput = getElement<HTMLInputElement>("model-name");
const targetLangSelect = getElement<HTMLSelectElement>("target-lang");
const sourceLangSelect = getElement<HTMLSelectElement>("source-lang");
const promptTemplateInput = getElement<HTMLTextAreaElement>("prompt-template");
const showSpeedInput = getElement<HTMLInputElement>("show-speed");
const statusEl = getElement<HTMLElement>("status");

const apiUrlError = getElement<HTMLElement>("api-url-error");
const modelNameError = getElement<HTMLElement>("model-name-error");
const promptTemplateError = getElement<HTMLElement>("prompt-template-error");

function populateLanguageSelects(): void {
  const targetFragment = document.createDocumentFragment();
  for (const lang of LANGUAGES) {
    targetFragment.appendChild(new Option(lang.name, lang.code));
  }
  targetLangSelect.appendChild(targetFragment);

  const sourceFragment = document.createDocumentFragment();
  sourceFragment.appendChild(new Option("自動検出", "auto"));
  for (const lang of LANGUAGES) {
    sourceFragment.appendChild(new Option(lang.name, lang.code));
  }
  sourceLangSelect.appendChild(sourceFragment);
}

function showStatus(message: string, isError: boolean): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
  statusEl.classList.add("show");
  window.setTimeout(() => {
    statusEl.classList.remove("show");
  }, 2000);
}

function validate(): boolean {
  let valid = true;

  if (!apiUrlInput.value.trim()) {
    apiUrlError.style.display = "block";
    valid = false;
  } else {
    apiUrlError.style.display = "none";
  }

  if (!modelNameInput.value.trim()) {
    modelNameError.style.display = "block";
    valid = false;
  } else {
    modelNameError.style.display = "none";
  }

  if (!promptTemplateInput.value.includes("{TEXT}")) {
    promptTemplateError.style.display = "block";
    valid = false;
  } else {
    promptTemplateError.style.display = "none";
  }

  return valid;
}

async function saveOptions(): Promise<void> {
  if (!validate()) {
    showStatus("入力内容を確認してください", true);
    return;
  }

  const settings: Settings = {
    apiUrl: apiUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    modelName: modelNameInput.value.trim(),
    targetLang: targetLangSelect.value,
    sourceLang: sourceLangSelect.value,
    promptTemplate: promptTemplateInput.value,
    showSpeed: showSpeedInput.checked,
  };

  try {
    await saveSettings(settings);
    showStatus("保存しました", false);
  } catch (error) {
    showStatus("保存に失敗しました", true);
    console.error(error);
  }
}

async function loadOptions(): Promise<void> {
  const settings = await loadSettings();
  apiUrlInput.value = settings.apiUrl;
  apiKeyInput.value = settings.apiKey;
  modelNameInput.value = settings.modelName;
  targetLangSelect.value = settings.targetLang;
  sourceLangSelect.value = settings.sourceLang;
  promptTemplateInput.value = settings.promptTemplate;
  showSpeedInput.checked = settings.showSpeed;
}

function init(): void {
  populateLanguageSelects();
  void loadOptions();

  const inputs: Array<{ el: HTMLElement; event: keyof HTMLElementEventMap }> = [
    { el: apiUrlInput, event: "input" },
    { el: apiKeyInput, event: "input" },
    { el: modelNameInput, event: "input" },
    { el: targetLangSelect, event: "change" },
    { el: sourceLangSelect, event: "change" },
    { el: promptTemplateInput, event: "input" },
    { el: showSpeedInput, event: "change" },
  ];

  for (const { el, event } of inputs) {
    el.addEventListener(event, () => {
      void saveOptions();
    });
  }
}

init();

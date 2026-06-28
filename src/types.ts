export type IsoCode = string;

export interface Language {
  code: IsoCode;
  name: string;
}

export interface Settings {
  apiUrl: string;
  apiKey: string;
  modelName: string;
  targetLang: IsoCode;
  sourceLang: IsoCode;
  promptTemplate: string;
  showSpeed: boolean;
}

export interface TranslateRequest {
  type: "translate";
  text: string;
  sourceLang: string;
  sourceCode: string;
  targetLang: string;
  targetCode: string;
  promptTemplate: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
}

export interface SelectionState {
  text: string;
  rect: DOMRect;
  sourceLang: string;
  sourceCode: string;
  pointerX?: number;
  pointerY?: number;
  iconEdge?: "top" | "bottom";
}

export type TranslateResponse =
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

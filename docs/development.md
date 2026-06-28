# tora 開発詳細

本ドキュメントでは、コードを詳しく読まないと分からない開発に関する詳細を記録します。設計方針については [DESIGN.md](../DESIGN.md) を参照してください。

## 1. 開発環境とコマンド

| コマンド       | 用途                               |
| -------------- | ---------------------------------- |
| `pnpm install` | 依存インストール                   |
| `pnpm dev`     | `esbuild` の watch モード          |
| `pnpm build`   | Chrome 用ビルド                    |
| `pnpm lint`    | `oxlint` による静的解析            |
| `pnpm check`   | `tsc --noEmit` による型チェック    |
| `pnpm fmt`     | `oxfmt --write` によるフォーマット |
| `pnpm package` | Chrome 用 ZIP 生成                 |

## 2. ビルドシステム

ビルドは `scripts/build.ts`（Node.js ネイティブ TypeScript 実行）で行います。

### 2.1 エントリポイント

```ts
const ENTRY_POINTS = ["src/background.ts", "src/content.ts", "src/options.ts"];
```

### 2.2 ビルド設定

| 設定                         | 値                        | 理由                                                           |
| ---------------------------- | ------------------------- | -------------------------------------------------------------- |
| `format`                     | `iife`                    | 各スクリプトを独立した単一ファイルとして Chrome に読み込ませる |
| `target`                     | `esnext`                  | 最新の Chrome で動作するため                                   |
| `loader: { ".svg": "text" }` | SVG を文字列として import | アイコン SVG を Shadow DOM 内に埋め込むため                    |

### 2.3 ビルド産物

- `dist/background.js`
- `dist/content.js`
- `dist/options.js`
- `dist/options.html`
- `dist/manifest.json`
- `dist/assets/`

`manifest.json` の `version` は `package.json` の `version` から同期されます。

## 3. モジュール依存関係

```text
content.ts
├── ui.ts
├── positioning.ts
├── translate.ts
├── events.ts
│   ├── state.ts
│   ├── positioning.ts
│   ├── ui.ts
│   ├── selection.ts
│   └── translate.ts
├── selection.ts
│   ├── constants.ts
│   ├── settings.ts
│   ├── state.ts
│   ├── positioning.ts
│   ├── ui.ts
│   └── translate.ts
└── translate.ts
    ├── types.ts
    ├── constants.ts
    ├── settings.ts
    ├── state.ts
    ├── positioning.ts
    └── ui.ts

background.ts
├── types.ts
└── settings.ts

options.ts
├── types.ts
├── constants.ts
└── settings.ts
```

## 4. イベントフロー

### 4.1 通常の選択 → 翻訳フロー

1. ユーザーがテキストを選択
2. `selectionchange` → `closePanel()` / `updateSelectionState({ showIcon: false })`
3. `pointerup` / `keyup` → `updateSelectionState({ showIcon: true })`
4. `selection.ts` で選択の有効性と言語を判定
5. 有効なら `positioning.ts` でアイコン位置を計算し表示
6. アイコンクリック → `translate.ts` の `onIconClick()`
7. パネルを表示し、Background へ Port 接続
8. Background が API を `fetch` し、SSE チャンクを Content Script へ配信
9. `chunk` / `done` / `error` を受信して UI を更新

### 4.2 コンテキストメニュー経由のフロー

1. ユーザーが右クリック
2. Background の `contextMenus.onClicked` が発火
3. Content Script へ `context-menu-translate` メッセージを送信
4. `events.ts` の `onContextMenuTranslate()` が選択状態を確認後、翻訳を開始

## 5. 選択検知の詳細

### 5.1 無視する選択

以下の場合はアイコンを表示しません。

- 選択テキストの `trim().length < 2`
- `<input>` / `<textarea>` / `[contenteditable]` 内
- `<iframe>` 内（`window.self !== window.top`）
- Shadow DOM 内（`container.getRootNode() !== document`）

### 5.2 スクロール・リサイズ時の挙動

`syncSelectionFromViewport()` で選択範囲が画面外に出たかを確認し、出ていればアイコンとパネルを隠します。アイコン表示中に選択範囲が小さくなりすぎた場合も非表示にします。

## 6. アイコン・パネルの配置算法

### 6.1 アイコンのエッジ決定

`pointerup` イベントからポインター位置を取得できた場合：

1. ポインターから選択範囲上端までの距離 `distTop` と下端までの距離 `distBottom` を比較
2. 距離がほぼ同じ（差 0.5px 未満）の場合は、空きスペースが大きい方を採用
3. 距離が異なる場合は、近い方のエッジを採用
4. 採用したエッジに十分な空きがなければ反対側へ fallback
5. 両方に空きがなければ、空きが大きい方を採用

ポインター位置が取得できない場合（キーボード選択など）は、選択範囲の右下に配置します。

### 6.2 パネルの開く方向

アイコンを基準に上下左右の空きを計算し、最も空きが大きい方向へ開きます。空きが同程度の場合は **下 → 右 → 上 → 左** の優先順位です。どの方向にも収まらない場合はビューポート内に clamp します。

### 6.3 手動配置の保持

ユーザーがパネルをドラッグまたはリサイズすると、`hasManuallyPositionedPanel` が `true` になり、以降の翻訳で自動配置が行われなくなります。リサイズの検知には `ResizeObserver` を使用しています。

## 7. 翻訳ライフサイクル

### 7.1 開始

```ts
const port = chrome.runtime.connect({ name: "tora-translate" });
port.postMessage(request);
```

### 7.2 中断

- パネルを閉じる
- 新しい選択を開始する
- `Esc` キーを押す
- 同じ選択でアイコンを再度クリック

いずれも `translatePort.disconnect()` により Background の `AbortController.abort()` が呼ばれ、`fetch` がキャンセルされます。

### 7.3 SSE パース

Background 内で `response.body.getReader()` によりストリームを読み、`data:` 行を解析します。`[DONE]` または `finish_reason` のある chunk で完了と判定します。

## 8. 言語処理

### 8.1 自動検出

`chrome.i18n.detectLanguage(text, callback)` を使用します。`isReliable === true` かつ、検出結果が `LANGUAGES` に含まれる言語の場合のみ採用します。

### 8.2 言語名マッピング

プロンプト内の言語名は `PROMPT_LANGUAGE_NAME_MAP` で英語名に変換します。これは TranslateGemma の公式チャットテンプレートが使用する英語名と一致させるためです。

### 8.3 表示用言語コード

`toDisplayCode()` で `zh` のみ `zh-Hans` にマッピングし、それ以外は ISO 639-1 のままです。

## 9. 設定の読み書き

### 9.1 保存先

`chrome.storage.local` を使用。`settings.ts` で抽象化しています。

### 9.2 初回インストール時

`background.ts` の `onInstalled` リスナーで `initializeSettings()` を呼び出し、未設定のキーにデフォルト値を設定します。既存の設定は上書きしません。

### 9.3 オプション画面

入力変更時に `saveSettings()` を呼び出します。検証は以下を確認：

- API URL が空でない
- モデル名が空でない
- プロンプトテンプレートに `{TEXT}` が含まれる

## 10. エラーハンドリング

### 10.1 エラー種別の判定

Background では `fetch` の失敗を `TypeError` として検知し、「API サーバーに接続できません」とします。これは Chrome 拡張内で `navigator.onLine` より信頼性が高い簡易判定です。

### 10.2 UI 表示

エラー時はパネル内容をエラー表示に切り替え、再試行ボタンと設定ボタンを表示します。

## 11. 注意点・落とし穴

### 11.1 Content Script が未注入のタブ

Background から `chrome.tabs.sendMessage()` した際、Content Script が読み込まれていないタブではエラーになります。コンテキストメニューでは `.catch(() => {})` で無視しています。

### 11.2 Service Worker のライフサイクル

Service Worker はアイドル時に停止する可能性があるため、`onStartup` でもコンテキストメニューを再作成しています。

### 11.3 Shadow DOM 内のイベント

アイコンやパネル内のクリックイベントは `stopPropagation()` で伝播を停止し、ホストページのイベントリスナーに影響を与えないようにしています。

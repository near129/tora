# tora

OpenAI 互換 API（Ollama など）+ TranslateGemma を使ったブラウザ翻訳拡張機能です。
Web ページ上でテキストを選択すると、フローティングアイコンが表示されます。アイコンをクリックすると、OpenAI 互換 API 経由で翻訳結果をストリーミング表示します。

## 要件

- Chrome
- OpenAI 互換 API（ローカルで動作。Ollama、LM Studio など）
- TranslateGemma モデル

## インストール

1. [GitHub Releases](https://github.com/near129/tora/releases) から `tora-chrome-vX.Y.Z.zip` をダウンロードします。
2. ZIP を展開します。
3. Chrome をデベロッパーモードにします（`chrome://extensions/` → 「デベロッパーモード」）。
4. 「パッケージ化されていない拡張機能を読み込む」から展開したフォルダを選択します。

## Ollama セットアップ例

TranslateGemma モデルを pull します。

```bash
ollama pull translategemma
```

Chrome から Ollama にアクセスするため、CORS 設定が必要な場合があります。環境変数で origins を指定してください。

```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

Ollama は `http://localhost:11434/v1/chat/completions` で OpenAI 互換 API を提供します。

## 使い方

1. Web ページで翻訳したいテキストを選択します。
2. 選択範囲の近くに表示されるアイコンをクリックします。
3. 翻訳パネルに結果がストリーミング表示されます。
4. 閉じるボタンまたは `Esc` キーでパネルを閉じます。

ツールバーの拡張機能アイコンをクリックすると、設定画面が開きます。

## オプション

- **API URL**: OpenAI 互換 API のベース URL。デフォルトは `http://localhost:11434`
- **API キー**: 認証が必要な場合に設定。ローカルサーバーでは空欄でも構いません
- **モデル名**: デフォルトは `translategemma:latest`
- **対象言語**: 翻訳後の言語（デフォルトは日本語）
- **元言語**: 自動検出または手動指定
- **プロンプトテンプレート**: TranslateGemma 公式形式をデフォルトとし、カスタマイズ可能
- **翻訳スピードを表示**: 翻訳パネルに処理時間・文字数・文字/秒を表示する（デフォルトはオフ）

設定は入力変更時に自動保存されます。

## 開発

```bash
pnpm install
pnpm dev      # esbuild watch
pnpm build    # Chrome 用ビルド
pnpm lint
pnpm check    # tsc --noEmit
pnpm fmt      # oxfmt --write
pnpm package  # Chrome 用 ZIP 生成
```

## 注意事項

- 言語自動検出が失敗した場合、元言語を Unknown として翻訳を実行します。精度が必要な場合は、オプション画面で元言語を手動で指定してください。
- API サーバーへの CORS 設定が必要な場合があります（Ollama の場合は `OLLAMA_ORIGINS` など）。
- LM Studio、mlx-lm、llama-server などで TranslateGemma を使う場合、モデル同梱のチャットテンプレートと互換性がないことがあります。詳細は [`docs/translategemma-compatibility.md`](docs/translategemma-compatibility.md) を参照してください。
- 配布は GitHub Releases の ZIP のみ行い、Chrome Web Store 等には公開しません。

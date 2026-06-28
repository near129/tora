# TranslateGemma 実行環境におけるチャットテンプレートの互換性

## 概要

[TranslateGemma](https://huggingface.co/google/translategemma-4b-it) は Google が公開した翻訳特化の Gemma ベースモデルです。
このモデルは通常の対話モデルとは異なり、`messages` の `content` に**言語コードや入力タイプを含む特殊な構造**を要求します。
そのため、Hugging Face 公式モデルや [mlx-community](https://huggingface.co/mlx-community/translategemma-4b-it-4bit)、各種 GGUF 変換モデルでは、
この特殊な `content` に対応するための専用チャットテンプレート（`chat_template.jinja`）が同梱されています。

しかし、ローカル推論ツール（LM Studio、mlx-lm、llama-server など）の多くは、
この特殊な `content` を解釈・提供できないため、同梱のチャットテンプレートをそのまま使うと**テンプレートエラーが発生します**。

本拡張機能（`tora`）では、クライアント側で翻訳用プロンプトを自前で構築し、OpenAI 互換 API の `messages` として送信します。
そのため、Ollama と同様に、サーバー側のチャットテンプレートを経由せずに動作させることができます。

## TranslateGemma の特殊な `content` 構造

公式のチャットテンプレートでは、ユーザーからの入力は以下のような構造であることを期待しています。

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "source_lang_code": "en",
      "target_lang_code": "ja",
      "text": "Hello, world."
    }
  ]
}
```

テンプレートは `content[0].source_lang_code` や `content[0].target_lang_code` から言語名を引き、
内部で翻訳用システムプロンプトを組み立てます。

実際のテンプレートは以下で公開されています。

- [mlx-community/translategemma-4b-it-4bit/chat_template.jinja](https://huggingface.co/mlx-community/translategemma-4b-it-4bit/blob/main/chat_template.jinja)

## 各実行環境の動作

| ツール                   | チャットテンプレートの扱い                     | TranslateGemma 同梱テンプレートとの互換性 | 備考                                                  |
| ------------------------ | ---------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| **Ollama**               | テンプレートを使用せず、独自のプロンプトを構築 | 問題なし                                  | `ollama.com/library/translategemma` の Modelfile 通り |
| **LM Studio**            | モデルのチャットテンプレートを適用             | **エラーが出る**                          | `source_lang_code` 等の変数を提供しない               |
| **mlx-lm**               | モデルのチャットテンプレートを適用             | **エラーが出る**                          | 同上                                                  |
| **llama-server**（推定） | モデルのチャットテンプレートを適用             | **エラーが出る**                          | 同上                                                  |

### エラーが発生する理由

LM Studio、mlx-lm、llama-server などは、リクエストの `messages` に対してモデル同梱の `chat_template.jinja` を Jinja2 でレンダリングします。
TranslateGemma のテンプレートは `source_lang_code` / `target_lang_code` / `text` などの変数を参照していますが、
これらのツールは OpenAI 互換 API リクエストをそのまま `messages` として扱い、
上記の特殊な変数をテンプレートに注入しないため、変数未定義でレンダリングに失敗します。

## 本拡張機能での対処

本拡張機能では、以下のように **チャットテンプレートをサーバー側に任せず、クライアント側で完成したプロンプト文字列を `content` として送信**します。

```json
{
  "model": "translategemma:latest",
  "messages": [
    {
      "role": "user",
      "content": "You are a professional English (en) to Japanese (ja) translator. ...\n\n\nHello, world."
    }
  ],
  "stream": true
}
```

これは [Ollama の `translategemma` Modelfile](https://ollama.com/library/translategemma) と同じ方針です。
Ollama もサーバー側のチャットテンプレートではなく、独自に規定された翻訳プロンプトを生成しています。

拡張機能の設定画面では、このプロンプトの骨格を「プロンプトテンプレート」としてカスタマイズできます。

また、言語名は chat_template.jinja と同じ英語名（`Japanese`、`English`、`Chinese` など）を使用します。
言語自動検出が失敗した場合は `Unknown (unknown)` として翻訳を実行します。

## チャットテンプレートを手動で指定する場合の回避策

LM Studio などでチャットテンプレートを手動指定できる場合、
公式テンプレートの言語依存部分を取り除き、通常の文字列 `content` に対応するテンプレートを使うと動作します。

以下のテンプレートは動作確認済みの例です。

```jinja
{{ bos_token }}
{%- if (messages[0]['role'] != 'user') -%}
    {{ raise_exception("Conversations must start with a user prompt.") }}
{%- endif -%}
{%- for message in messages -%}
    {%- if (message['role'] == 'user') != (loop.index0 % 2 == 0) -%}
        {{ raise_exception("Conversation roles must alternate user/assistant/user/assistant/...") }}
    {%- endif -%}
    {%- if (message['role'] == 'assistant') -%}
        {%- if message['content'] is none or message['content'] is not string -%}
            {{ raise_exception("Assistant role must provide content as a string") }}
        {%- endif -%}
        {{ '<start_of_turn>model\n'}}
        {{ message["content"] | trim }}
    {%- elif (message['role'] == 'user') -%}
        {{ '<start_of_turn>user\n'}}
        {{ message["content"] | trim }}
    {%- else -%}
        {{ raise_exception("Conversations must only contain user or assistant roles.") }}
    {%- endif -%}
    {{ '<end_of_turn>\n' }}
{%- endfor -%}
{%- if add_generation_prompt -%}
    {{'<start_of_turn>model\n'}}
{%- endif -%}
```

このテンプレートでは `content` を単なる文字列として扱い、Gemma 形式のターン区切り（`<start_of_turn>` / `<end_of_turn>`）のみを付与します。
翻訳用のシステムプロンプトはクライアント側（本拡張機能）で既に含まれているため、サーバー側で追加する必要はありません。

## 推奨事項

- **本拡張機能を使う場合**: 設定画面の「プロンプトテンプレート」を TranslateGemma 公式形式のまま利用してください。サーバー側のチャットテンプレートは無視され、正常に動作します。
- **LM Studio / mlx-lm / llama-server で直接使用する場合**: モデル同梱のチャットテンプレートではエラーになるため、上記の簡易テンプレートに手動で置き換えるか、ツール側でチャットテンプレートの適用を無効にしてください。
- **Ollama を使う場合**: 特別な設定は不要です。`ollama pull translategemma` 後、`translategemma:latest` をモデル名として指定してください。

## 関連リンク

- [google/translategemma-4b-it](https://huggingface.co/google/translategemma-4b-it)
- [mlx-community/translategemma-4b-it-4bit](https://huggingface.co/mlx-community/translategemma-4b-it-4bit)
- [ollama.com/library/translategemma](https://ollama.com/library/translategemma)

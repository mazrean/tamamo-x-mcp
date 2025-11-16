# tamamo-x-mcp

設定された MCP サーバーのツールを役割ごとにまとめてサブ AI エージェント化し、再構築したツールとして提供する MCP サーバーです。

# 要件

## サブエージェント

プロジェクトおよび MCP サーバーのツールの情報を LLM に渡し、 役割ごとにサブ AI エージェント化します。

ツールは以下を満たすようにグルーピングされます。

- (must) プロジェクトの内容を基に必要なグループが作成されている
  - Agent.md や CLAUDE.md の内容を参考にする
- (must) 特定の役割を果たすことができるまとまりになっている
- (must) 互いに補完しあう関係にある
- (must) グループ内のツール数が多すぎず、少なすぎない
  - 5 ~ 20 個程度
- (must) グループの数は多すぎない
  - 3 ~ 10 個程度
- (optional) グループごとに適切な名前がつけられている

## 設定

各設定は`tamamo-x.config.json` という名前でプロジェクトルートに保存されます。
設定内にはサブ AI エージェントを構築する MCP サーバーの情報を `.mcp.json` 形式で含める必要があります。

## サブコマンド

- `tamamo-x-mcp init`
  - プロジェクトルートに `tamamo-x.config.json` を生成
- `tamamo-x-mcp build`
  - サブ AI エージェントを構築
- `tamamo-x-mcp mcp`
  - MCP サーバーを起動

## 利用可能な LLM API

以下はサブエージェントで LLM API として利用可能にしてください。

- Anthropic Claude
- OpenAI
- Gemini
- Vercel AI
- AWS Bedrock
- OpenRouter

また、Anthropic Claude は Claude Code、 OpenAI は Codex、 Gemini は Gemini CLI の認証情報を接続に利用できるようにしてください。
各種認証情報は　`tamamo-x.config.json` には含めないようにして。

## 配布方法

以下の 2 つの方法で配布できるようにしてください。

- Deno Standalone バイナリ
- npm パッケージ
  - npx で実行可能にする

# コーディング規約

- タスクを完了とする前には以下を確認してください。
  - Lint エラーがない
  - ユニットテストが正常に動作
- t-wada の TDD で開発する

# 使用技術

言語: TypeScript
エージェントフレームワーク: Mastra

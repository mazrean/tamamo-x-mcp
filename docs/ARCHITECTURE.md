# 実装詳細

## アーキテクチャ概要

tamamo-x-mcp は、複数の既存 MCP サーバーを統合し、単一のインターフェースで提供する TypeScript 製の MCP サーバーです。

## コンポーネント

### 1. 設定管理 (src/config/)

- **types.ts**: MCP サーバー設定の型定義
- **loader.ts**: .mcp.json からの設定読み込み
  - Deno と Node.js 両方のファイルシステム API に対応
  - エラーハンドリングとバリデーション

### 2. サブエージェント (src/agents/)

各 MCP サーバーをラップし、独立したエージェントとして管理します。

- **sub-agent.ts**: 個別の MCP サーバーをラップするエージェント
  - MCP クライアントの初期化と管理
  - ツールの取得と実行
  - エラーハンドリング

- **manager.ts**: 複数のサブエージェントを統合管理
  - エージェントの登録と初期化
  - ツール名のプレフィックス管理
  - リクエストのルーティング

### 3. MCP 通信 (src/mcp/)

- **types.ts**: MCP プロトコルの型定義
- **client.ts**: 既存 MCP サーバーとの通信クライアント
  - stdio ベースの JSON-RPC 2.0 通信
  - Deno/Node.js クロスランタイム対応
  - リクエスト/レスポンス管理

- **server.ts**: 統合 MCP サーバー実装
  - 標準入出力でのリクエスト受信
  - ツール登録と実行
  - JSON-RPC 2.0 プロトコル対応

### 4. ユーティリティ (src/utils/)

- **logger.ts**: 構造化ログ出力
- **errors.ts**: カスタムエラー型
- **runtime.ts**: クロスランタイム互換性

## データフロー

クライアント → MCP Server → Agent Manager → Sub-Agent → 既存 MCP Server

## クロスランタイム対応

Deno と Node.js の両方で動作するように実装しています。

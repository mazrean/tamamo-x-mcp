# tamamo-x-mcp

既存MCPサーバーを役割別サブエージェント化し統合提供するTypeScript製MCPサーバー。

## 技術構成
- **言語**: TypeScript
- **ランタイム**: Deno(メイン) + Node.js互換
- **フレームワーク**: 独自実装（サブエージェント管理）
- **配布**: Deno standalone binary + npm/npx

## アーキテクチャ
- プロジェクト設定から既存MCPサーバーを動的読込
- サブエージェント構成で各MCPサーバーを管理
- サブエージェント→既存MCPサーバー呼出し
- 標準入出力ベースの通信

## 構造
```
src/
├── agents/   # サブエージェント（各MCPサーバーをラップ）
├── mcp/      # MCPサーバー実装（統合サーバー）
├── config/   # 設定管理（.mcp.json読み込み）
└── utils/    # ユーティリティ（ロガー、エラーハンドリング、ランタイム検出）
```

## 使い方

### Denoで実行
```bash
# mise経由でDenoをインストール
mise install

# 開発モードで実行
deno task dev

# スタンドアロンバイナリとしてビルド
deno task build
./dist/tamamo-x-mcp
```

### Node.jsで実行
```bash
# 依存関係をインストール
npm install

# 開発モードで実行
npm run dev

# ビルド
npm run build
node dist/index.js
```

## 設定

`.mcp.json`ファイルで既存MCPサーバーを設定します：

```json
{
  "mcpServers": {
    "serena": {
      "type": "stdio",
      "command": "serena",
      "args": ["start-mcp-server", "--context", "ide-assistant"],
      "env": {}
    },
    "gopls": {
      "type": "stdio",
      "command": "gopls",
      "args": ["mcp"],
      "env": {}
    }
  }
}
```

## 実装方針
- Cross-runtime互換性重視（Deno/Node.js両対応）
- 型安全優先
- エラーハンドリング徹底

## 機能

### サブエージェント管理
- 各MCPサーバーを独立したサブエージェントとして管理
- 動的なツール登録と呼び出し
- エラー処理とログ記録

### MCPプロトコル対応
- JSON-RPC 2.0ベースの通信
- stdio方式のMCPサーバー対応
- ツールの列挙と実行

### 型安全性
- TypeScriptによる完全な型定義
- 実行時型チェック
- エラーの適切な伝播

### クロスランタイム対応
- Denoとnode.jsの両方で動作
- ランタイム自動検出
- プラットフォーム固有APIの抽象化

## 開発

### フォーマット（Deno）
```bash
deno fmt
```

### リント（Deno）
```bash
deno lint
```

### 型チェック（Deno）
```bash
deno check src/**/*.ts
```

### フォーマット（Node.js）
```bash
npm run format
```

### リント（Node.js）
```bash
npm run lint
```

## ライセンス
MIT

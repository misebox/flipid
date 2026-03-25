# CLAUDE.md

## Commands
- `bun run build` — ESM + CJS デュアルビルド
- `bun run test` — vitest (カバレッジ付き)
- `bun run test:watch` — vitest watch モード

## Versioning
semantic-release が自動管理する。package.json の version を手動で変更しない。

## Architecture
- `src/transformer.ts` — XOR + shuffle によるバッファ変換の低レベル実装
- `src/flipid.ts` — 公開API。transformer を使って encode/decode を提供
- `src/errors.ts` — エラークラス定義
- `src/utils.ts` — signed/unsigned 変換ユーティリティ
- 外部依存は `bufferbase`（エンコーディング）のみ

## Notes
- 暗号ライブラリではない。Math.sin() ベースの PRNG を使用している
- deprecated alias (`FlipIDGenerator`, 旧エラー名) がまだ残っている

// 合言葉そのものはコードに書かない（このリポジトリは公開のため）。
// 各自が入力した文字列がそのままFirestoreのパスになる（trips/{合言葉}/items）。
// 実際の値は 合言葉.txt（Git管理外）と、Firestoreのルールに書いてある。

/** localStorageのキー */
export const STORAGE_KEYS = {
  code: 'tokushima-ikoka:code',
  me: 'tokushima-ikoka:me',
  theme: 'tokushima-ikoka:theme',
} as const

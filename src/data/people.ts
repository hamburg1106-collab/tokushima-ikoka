import type { CSSProperties } from 'react'
import type { Person, PersonId } from '../types'

/**
 * 行程表の6列と同じ順番。
 * hueは人を見分けるための色相で、隣同士がまぎれないよう離してある。
 * 色はあくまで補助で、名前は必ず併記する（色だけで判別させない）。
 */
export const PEOPLE: Person[] = [
  { id: 'riki', name: '力', canLogin: true, hue: 212 }, // 青
  { id: 'asa', name: '麻', canLogin: true, hue: 340 }, // 桃
  { id: 'toshi', name: '敏', canLogin: true, hue: 145 }, // 緑
  { id: 'ri', name: '理', canLogin: true, hue: 272 }, // 紫
  { id: 'shu', name: '柊', canLogin: false, hue: 32 }, // 橙・2歳・スマホなし
  { id: 'isamu', name: '勇', canLogin: true, hue: 190 }, // 水
]

/**
 * 色相だけをCSSへ渡す。明るさ・鮮やかさはテーマ側の変数で決まるので、
 * ライト／ダークのどちらでも読める色になる。
 */
export const personStyle = (id: PersonId): CSSProperties =>
  ({ '--person-h': String(PEOPLE.find((p) => p.id === id)?.hue ?? 0) }) as CSSProperties

export const ALL_IDS: PersonId[] = PEOPLE.map((p) => p.id)

/** 勇は10/30朝に合流するので、10/29は5人 */
export const WITHOUT_ISAMU: PersonId[] = ALL_IDS.filter((id) => id !== 'isamu')

export const personName = (id: PersonId): string =>
  PEOPLE.find((p) => p.id === id)?.name ?? id

export const LOGINABLE = PEOPLE.filter((p) => p.canLogin)

/** 幹事（このアプリの作者）。「初期状態に戻す」など管理操作はこの人にだけ出す */
export const OWNER_ID: PersonId = 'toshi'

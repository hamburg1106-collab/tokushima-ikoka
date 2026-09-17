import type { ShopCandidate, ShopSlotId } from '../types'

/**
 * 候補をぶら下げる枠。行程表で「店未定」になっている食事の予定と対応する。
 * idは itinerary.ts の TimelineItem.id と同じにしてある。
 */
export const SHOP_SLOTS: { id: ShopSlotId; label: string; hint: string }[] = [
  {
    id: 'd1-lunch',
    label: '10/29（木）昼食',
    hint: '11:45 レンタカー受取 →（ここ）→ 15:00 阿波踊り会館',
  },
  {
    id: 'd1-dinner',
    label: '10/29（木）夕食',
    hint: '18:00 ホテルルートイン徳島空港（松茂）チェックイン後',
  },
]

/**
 * たたき台の候補（NotebookLMで調べた結果）。持ち物リストと同じく、
 * 空で配らずに数件入れておいてアプリ上で足し引きしてもらう。
 *
 * 木曜定休のため外した有名店：王王軒本店／中華そば田村／和田の屋本店（滝の焼餅）／やまきょう。
 * 10/30が昼=びんび家・夜=美蔵で海鮮なので、10/29は海鮮を避けている。
 */
const SEED: { slot: ShopSlotId; name: string; note: string; tel: string; url?: string }[] = [
  // ── 10/29 昼食（徳島市内）
  {
    slot: 'd1-lunch',
    name: '中華そば いのたに 本店',
    note: '阿波踊り会館まで車2分（520m）／無料P35台／10:30-17:00 売切終了・月曜休／〜1,000円。ベビーカー可。座敷は未確認',
    tel: '088-653-1482',
    url: 'http://www.inotani.jp/',
  },
  {
    slot: 'd1-lunch',
    name: 'ラーメン東大 大道本店',
    note: '会館まで車3-5分／無料P23台／11:00-翌4:00・無休／〜999円。お子様セット650円あり。カウンター18席のみ',
    tel: '088-655-3775',
    url: 'https://ramen-todai.com/',
  },
  {
    slot: 'd1-lunch',
    name: '支那そば 三八 田宮店',
    note: '空港から15-20分・会館まで10-12分／無料P21台／10:30-20:00 売切終了・火曜休／〜1,000円。黄系のあっさり。ミニソフトあり',
    tel: '088-633-8938',
  },
  {
    slot: 'd1-lunch',
    name: '支那そば 可成家 本店',
    note: '会館まで12-15分／無料P10台／11:00-20:00・水曜休／〜999円。濃厚マイルドな進化系',
    tel: '088-631-4158',
  },
  {
    slot: 'd1-lunch',
    name: "O-ba'sh cafe.（ラーメン以外なら）",
    note: '会館まで280m・徒歩4分／専用Pなし（市営新町地下P 徒歩1分）／7:30-17:00・月曜休／1,000-2,000円。ベビーカーOKだが全20席と小さい',
    tel: '088-655-2337',
    url: 'http://www.o-bashcrust.com/cafe.html',
  },
  // ── 10/29 夕食（松茂・徳島市内）
  {
    slot: 'd1-dinner',
    name: '骨付き阿波尾鶏 一鴻 北島店',
    note: 'ホテルから車5-7分／共有P約100台／17:00-23:00・無休／約3,000円。個室・座敷・ベビーチェア・お子様セットあり',
    tel: '088-676-2722',
    url: 'https://www.i-kko.com/%E5%8C%97%E5%B3%B6%E5%BA%97',
  },
  {
    slot: 'd1-dinner',
    name: 'こだわりとんかつ 山かつ 空港店',
    note: 'ホテルから徒歩2分／無料P22台／木曜 17:00-21:30（受付21:00）・水曜＋不定休／1,000-2,000円。座敷・キッズチェア・キッズメニューあり',
    tel: '088-699-8199',
    url: 'https://www.yamanoce.co.jp/yamakatsu/',
  },
  {
    slot: 'd1-dinner',
    name: 'たらいうどん 山のせ 松茂店',
    note: 'ホテルから徒歩2分／無料P71台／平日 17:00-21:00（LO20:30）・水曜休／1,000-1,999円。広い座敷・キッズチェアあり',
    tel: '088-699-2188',
    url: 'https://www.yamanoce.co.jp/yamanose/shop/#shop02',
  },
  {
    slot: 'd1-dinner',
    name: '骨付き阿波尾鶏 一鴻 徳島駅前店',
    note: 'ホテルから車15分／専用Pなし（周辺コインP）／17:00-23:00・無休／3,001-4,000円。個室・座敷あり全100席',
    tel: '088-678-5995',
  },
]

export const INITIAL_SHOPS: ShopCandidate[] = SEED.map((shop, index) => ({
  id: `shop-${index + 1}`,
  slot: shop.slot,
  name: shop.name,
  note: shop.note,
  tel: shop.tel,
  // Firestoreはundefinedを受け付けないので、URLが無い店はフィールドごと載せない
  ...(shop.url ? { url: shop.url } : {}),
  votes: [],
  order: index + 1,
}))

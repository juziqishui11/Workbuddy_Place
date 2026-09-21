// 卡牌术语表（分包页）—— 简中版尚未收录 EX / GX / V 等形态卡，
// 这些卡只能看国际版英文卡面，此页提供常用术语的中英对照，方便读懂卡面。
var GROUPS = [
  {
    title: '对局基本',
    items: [
      ['Pokémon', '宝可梦'],
      ['Basic Pokémon', '基础宝可梦'],
      ['Stage 1 / Stage 2', '1阶 / 2阶进化宝可梦'],
      ['Evolved Pokémon', '进化宝可梦'],
      ['Evolution card', '进化卡'],
      ['Active Pokémon', '战斗宝可梦'],
      ['Benched Pokémon', '备战宝可梦'],
      ['Active Spot', '战斗场'],
      ['Bench', '备战区'],
      ['Defending Pokémon', '受到攻击的宝可梦'],
      ['Attacking Pokémon', '进行攻击的宝可梦'],
      ['Deck', '牌库'],
      ['Hand', '手牌'],
      ['Discard pile', '弃牌区'],
      ['Stadium', '竞技场'],
      ['Prize card', '奖品卡'],
      ['Knocked Out', '昏厥']
    ]
  },
  {
    title: '能量与费用',
    items: [
      ['Energy', '能量'],
      ['Basic Energy', '基本能量'],
      ['Energy card', '能量卡'],
      ['Retreat Cost', '逃跑费用'],
      ['Grass / Fire / Water', '草 / 火 / 水'],
      ['Lightning / Psychic / Fighting', '雷 / 超 / 斗'],
      ['Darkness / Metal / Fairy', '恶 / 钢 / 妖'],
      ['Dragon / Colorless', '龙 / 无色']
    ]
  },
  {
    title: '招式与判定',
    items: [
      ['Attack', '招式'],
      ['Ability', '特性'],
      ['GX attack', 'GX 招式'],
      ['Damage', '伤害'],
      ['Damage counter', '伤害指示物'],
      ['Flip a coin', '抛掷1次硬币'],
      ['heads / tails', '正面 / 反面'],
      ['Heal', '回复'],
      ['Discard', '放于弃牌区'],
      ['Shuffle', '重洗'],
      ['Search your deck', '从牌库中搜索'],
      ['Weakness / Resistance', '弱点 / 抵抗'],
      ['Special Condition', '特殊状态']
    ]
  },
  {
    title: '特殊状态',
    items: [
      ['Asleep', '睡眠'],
      ['Burned', '灼伤'],
      ['Confused', '混乱'],
      ['Paralyzed', '麻痹'],
      ['Poisoned', '中毒']
    ]
  }
];

Page({
  data: { groups: GROUPS }
});

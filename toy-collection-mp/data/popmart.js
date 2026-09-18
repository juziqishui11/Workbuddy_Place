/**
 * 泡泡玛特（POP MART）示例藏品库
 * 说明：官方无免费结构化 API，此处手工精选 3 个经典系列做演示库。
 * 字段与 data/pokemon.js 保持同一 schema，由 utils/source.js 统一加载。
 *
 * schema：
 *   ip      固定 'popmart'
 *   brand   展示名
 *   accent  主色（用于页面主题）
 *   accent2 辅助渐变色
 *   unit    收藏量词
 *   series[]：
 *     id, name, desc
 *     figures[]：id, code, name, sub, rarity(常规|隐藏|大娃|MEGA), emoji, color
 */
module.exports = {
  ip: 'popmart',
  brand: '泡泡玛特',
  accent: '#FF7BAC',
  accent2: '#9B6BFF',
  unit: '娃',
  series: [
    {
      id: 'labubu-macaron',
      name: 'LABUBU 心动马卡龙',
      desc: '搪胶毛绒挂件系列，甜系配色，含 1 款隐藏。',
      figures: [
        { id: 'lm-01', code: '01', name: '松鼠哥', sub: 'Squirrel', rarity: '常规', emoji: '🐿️', color: '#FFD3E0' },
        { id: 'lm-02', code: '02', name: '兔子', sub: 'Rabbit', rarity: '常规', emoji: '🐰', color: '#C9E7FF' },
        { id: 'lm-03', code: '03', name: '小熊', sub: 'Bear', rarity: '常规', emoji: '🐻', color: '#FFE2C2' },
        { id: 'lm-04', code: '04', name: '小猫', sub: 'Cat', rarity: '常规', emoji: '🐱', color: '#D6C9FF' },
        { id: 'lm-05', code: '05', name: '小狗', sub: 'Puppy', rarity: '常规', emoji: '🐶', color: '#C2F0E0' },
        { id: 'lm-06', code: '06', name: '小鸭', sub: 'Duck', rarity: '常规', emoji: '🐤', color: '#FFF1A8' },
        { id: 'lm-h', code: 'H', name: '隐藏款·星之精灵', sub: 'Secret', rarity: '隐藏', emoji: '✨', color: '#FFE08A' }
      ]
    },
    {
      id: 'molly-day',
      name: 'MOLLY 一天系列',
      desc: 'MOLLY 从早到晚的日常，含 1 款隐藏。',
      figures: [
        { id: 'md-01', code: '01', name: '起床气', sub: 'Morning', rarity: '常规', emoji: '😪', color: '#FFD9C2' },
        { id: 'md-02', code: '02', name: '上学去', sub: 'School', rarity: '常规', emoji: '🎒', color: '#C9E7FF' },
        { id: 'md-03', code: '03', name: '下午茶', sub: 'Tea', rarity: '常规', emoji: '🍰', color: '#FFD3E8' },
        { id: 'md-04', code: '04', name: '运动场', sub: 'Sport', rarity: '常规', emoji: '🏀', color: '#C2F0D0' },
        { id: 'md-05', code: '05', name: '看星星', sub: 'Star', rarity: '常规', emoji: '🌟', color: '#D6C9FF' },
        { id: 'md-06', code: '06', name: '晚安', sub: 'Sleep', rarity: '常规', emoji: '🌙', color: '#B9C9FF' },
        { id: 'md-h', code: 'H', name: '隐藏款·生日', sub: 'Secret', rarity: '隐藏', emoji: '🎂', color: '#FFB3C8' }
      ]
    },
    {
      id: 'dimoo-space',
      name: 'DIMOO 太空旅行',
      desc: 'DIMOO 的宇宙漫游，含 1 款隐藏。',
      figures: [
        { id: 'ds-01', code: '01', name: '火箭发射', sub: 'Launch', rarity: '常规', emoji: '🚀', color: '#C9E7FF' },
        { id: 'ds-02', code: '02', name: '月球漫步', sub: 'Moon', rarity: '常规', emoji: '🌕', color: '#EDE9FF' },
        { id: 'ds-03', code: '03', name: '星云', sub: 'Nebula', rarity: '常规', emoji: '🌌', color: '#C9C2FF' },
        { id: 'ds-04', code: '04', name: '流星', sub: 'Meteor', rarity: '常规', emoji: '☄️', color: '#FFE0C2' },
        { id: 'ds-05', code: '05', name: '外星朋友', sub: 'Alien', rarity: '常规', emoji: '👽', color: '#C2F0E0' },
        { id: 'ds-06', code: '06', name: '返航', sub: 'Return', rarity: '常规', emoji: '🛸', color: '#D6C9FF' },
        { id: 'ds-h', code: 'H', name: '隐藏款·黑洞', sub: 'Secret', rarity: '隐藏', emoji: '🕳️', color: '#9B8BFF' }
      ]
    }
  ]
};

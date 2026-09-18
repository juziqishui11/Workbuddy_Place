/**
 * 宝可梦（Pokémon）示例图鉴
 * 说明：示例收录关都地区（Kanto）约 40 只经典宝可梦，类型已校对；
 *      可按此 schema 补全至全国图鉴 1010+ 只。字段与 data/popmart.js 同构。
 *
 * schema：series 仅一组「关都地区」，figures 即宝可梦个体。
 *   rarity：普通 | 传说 | 幻之
 */
module.exports = {
  ip: 'pokemon',
  brand: '宝可梦',
  accent: '#3B7DDD',
  accent2: '#FFCB05',
  unit: '只',
  series: [
    {
      id: 'kanto',
      name: '关都地区 (Kanto)',
      desc: '初代 151 的精选图鉴，类型已校对，可继续补全。',
      figures: [
        { id: 'pk-001', code: '001', name: '妙蛙种子', sub: 'Bulbasaur', rarity: '普通', emoji: '🌱', color: '#A8E6A1', type: '草/毒' },
        { id: 'pk-002', code: '002', name: '妙蛙草', sub: 'Ivysaur', rarity: '普通', emoji: '🌿', color: '#9BE08F', type: '草/毒' },
        { id: 'pk-003', code: '003', name: '妙蛙花', sub: 'Venusaur', rarity: '普通', emoji: '🌻', color: '#8AD67D', type: '草/毒' },
        { id: 'pk-004', code: '004', name: '小火龙', sub: 'Charmander', rarity: '普通', emoji: '🔥', color: '#FFB38A', type: '火' },
        { id: 'pk-005', code: '005', name: '火恐龙', sub: 'Charmeleon', rarity: '普通', emoji: '💥', color: '#FF9E6B', type: '火' },
        { id: 'pk-006', code: '006', name: '喷火龙', sub: 'Charizard', rarity: '普通', emoji: '🐉', color: '#FF8A5C', type: '火/飞行' },
        { id: 'pk-007', code: '007', name: '杰尼龟', sub: 'Squirtle', rarity: '普通', emoji: '💧', color: '#9ED6FF', type: '水' },
        { id: 'pk-008', code: '008', name: '卡咪龟', sub: 'Wartortle', rarity: '普通', emoji: '🌊', color: '#8CCBFF', type: '水' },
        { id: 'pk-009', code: '009', name: '水箭龟', sub: 'Blastoise', rarity: '普通', emoji: '🐢', color: '#7CBEFF', type: '水' },
        { id: 'pk-010', code: '010', name: '绿毛虫', sub: 'Caterpie', rarity: '普通', emoji: '🐛', color: '#C2E89B', type: '虫' },
        { id: 'pk-011', code: '011', name: '铁甲蛹', sub: 'Metapod', rarity: '普通', emoji: '🥚', color: '#B6D98C', type: '虫' },
        { id: 'pk-025', code: '025', name: '皮卡丘', sub: 'Pikachu', rarity: '普通', emoji: '⚡', color: '#FFE15A', type: '电' },
        { id: 'pk-026', code: '026', name: '雷丘', sub: 'Raichu', rarity: '普通', emoji: '🔋', color: '#FFD23F', type: '电' },
        { id: 'pk-035', code: '035', name: '皮皮', sub: 'Clefairy', rarity: '普通', emoji: '🌸', color: '#FFC9E0', type: '妖精' },
        { id: 'pk-039', code: '039', name: '胖丁', sub: 'Jigglypuff', rarity: '普通', emoji: '🎤', color: '#FFD6E8', type: '普通/妖精' },
        { id: 'pk-052', code: '052', name: '喵喵', sub: 'Meowth', rarity: '普通', emoji: '😼', color: '#FFE7A0', type: '普通' },
        { id: 'pk-063', code: '063', name: '凯西', sub: 'Abra', rarity: '普通', emoji: '🔮', color: '#C9B6FF', type: '超能力' },
        { id: 'pk-065', code: '065', name: '胡地', sub: 'Alakazam', rarity: '普通', emoji: '🧠', color: '#B9A6FF', type: '超能力' },
        { id: 'pk-092', code: '092', name: '鬼斯', sub: 'Gastly', rarity: '普通', emoji: '👻', color: '#C9B6E8', type: '幽灵/毒' },
        { id: 'pk-093', code: '093', name: '耿鬼', sub: 'Gengar', rarity: '普通', emoji: '😈', color: '#B9A6D8', type: '幽灵/毒' },
        { id: 'pk-129', code: '129', name: '鲤鱼王', sub: 'Magikarp', rarity: '普通', emoji: '🐟', color: '#FFB0A0', type: '水' },
        { id: 'pk-130', code: '130', name: '暴鲤龙', sub: 'Gyarados', rarity: '普通', emoji: '🌊', color: '#9EC8FF', type: '水/飞行' },
        { id: 'pk-131', code: '131', name: '拉普拉斯', sub: 'Lapras', rarity: '普通', emoji: '🐋', color: '#A8E0E8', type: '水/冰' },
        { id: 'pk-133', code: '133', name: '伊布', sub: 'Eevee', rarity: '普通', emoji: '🦊', color: '#E8D6B8', type: '普通' },
        { id: 'pk-134', code: '134', name: '水伊布', sub: 'Vaporeon', rarity: '普通', emoji: '💧', color: '#9ED6FF', type: '水' },
        { id: 'pk-135', code: '135', name: '雷伊布', sub: 'Jolteon', rarity: '普通', emoji: '⚡', color: '#FFE15A', type: '电' },
        { id: 'pk-136', code: '136', name: '火伊布', sub: 'Flareon', rarity: '普通', emoji: '🔥', color: '#FF9E6B', type: '火' },
        { id: 'pk-143', code: '143', name: '卡比兽', sub: 'Snorlax', rarity: '普通', emoji: '😴', color: '#C9B89A', type: '普通' },
        { id: 'pk-149', code: '149', name: '快龙', sub: 'Dragonite', rarity: '普通', emoji: '🐲', color: '#9EC8FF', type: '龙/飞行' },
        { id: 'pk-144', code: '144', name: '急冻鸟', sub: 'Articuno', rarity: '传说', emoji: '❄️', color: '#A8E0F0', type: '冰/飞行' },
        { id: 'pk-145', code: '145', name: '闪电鸟', sub: 'Zapdos', rarity: '传说', emoji: '🌩️', color: '#FFE15A', type: '电/飞行' },
        { id: 'pk-146', code: '146', name: '火焰鸟', sub: 'Moltres', rarity: '传说', emoji: '🕊️', color: '#FF9E6B', type: '火/飞行' },
        { id: 'pk-150', code: '150', name: '超梦', sub: 'Mewtwo', rarity: '传说', emoji: '🧬', color: '#E0B6FF', type: '超能力' },
        { id: 'pk-151', code: '151', name: '梦幻', sub: 'Mew', rarity: '幻之', emoji: '🌟', color: '#FFD6F0', type: '超能力' }
      ]
    }
  ]
};

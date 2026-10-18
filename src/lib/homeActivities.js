export function getHomeActivityCards() {
  return [
    {
      id: 'memory',
      kind: 'memory',
      title: '色彩记忆',
      hint: '翻开色块，凭记忆找回来',
      wash: '#D8C6E6',
      tiles: ['#C4A3C8', '#E8E0D4', '#C4A3C8', '#8A9B7A'],
    },
    {
      id: 'walk',
      kind: 'walk',
      title: 'Color Walk',
      hint: '出门看见的颜色，收进来',
      wash: '#C9D6C4',
    },
    {
      id: 'vault',
      kind: 'vault',
      title: '收藏',
      hint: '你收下的色卡都在这里',
      wash: '#E4D4C4',
    },
  ];
}

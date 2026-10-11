/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        bricolage: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        /** 标题 / 情感：宋体 */
        zenSerif: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'SimSun', 'serif'],
        /** 标题：汉仪古趣 */
        heytea: ['"HYGuQuW"', '"ZCOOL XiaoWei"', '"Noto Serif SC"', 'serif'],
        /** UI / 正文 / 元数据：黑体 */
        zenSans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        /** 数字 / 英文短注：打字机旁注 */
        zenTypewriter: [
          '"IBM Plex Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
        profileSans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        profileKai: ['"KaiTi"', '"STKaiti"', '"楷体"', '"Noto Serif SC"', 'serif'],
      },
      colors: {
        zen: {
          /** 开场视频同色白底，水滴才能溶进首页 */
          paper: '#FFFFFF',
          /** 略深纸色 — 分隔 / 浅底 */
          sand: '#F4F4F4',
          /** 浅灰 — borders, inactive */
          clay: '#E0D9CE',
          /** 苔岩 — muted text, secondary strokes */
          stone: '#A8A297',
          /** 墨黛 — body copy */
          ink: '#5C5750',
          /** 漆黑 — headings, emphasis */
          coal: '#2C2C2C',
          /** 雾纸 — 半透明叠层基色 */
          mist: '#F7F7F7',
          vermilion: '#BC2026',
          blush: '#F6E6E4',
        },
      },
      boxShadow: {
        zen: '2px 3px 0 rgba(92, 87, 80, 0.04), 0 8px 22px -10px rgba(92, 87, 80, 0.14)',
        'zen-lg': '3px 5px 0 rgba(92, 87, 80, 0.05), 0 14px 36px -12px rgba(92, 87, 80, 0.18)',
      },
      transitionTimingFunction: {
        zen: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

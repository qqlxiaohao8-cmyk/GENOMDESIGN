/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        bricolage: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        /** 标题 / 情感：宋体 */
        zenSerif: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'SimSun', 'serif'],
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
          /** 暖纸底 */
          paper: '#F6F3EC',
          /** 略深纸色 — 分隔 / 浅底 */
          sand: '#EFE9DF',
          /** 浅灰 — borders, inactive */
          clay: '#E0D9CE',
          /** 苔岩 — muted text, secondary strokes */
          stone: '#A8A297',
          /** 墨黛 — body copy */
          ink: '#5C5750',
          /** 漆黑 — headings, emphasis */
          coal: '#2C2C2C',
          /** 雾纸 — 半透明叠层基色 */
          mist: '#F3EFE6',
          vermilion: '#BC2026',
        },
      },
      boxShadow: {
        zen: '0 4px 24px -4px rgba(92, 87, 80, 0.08)',
        'zen-lg': '0 8px 40px -8px rgba(92, 87, 80, 0.12)',
      },
      transitionTimingFunction: {
        zen: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

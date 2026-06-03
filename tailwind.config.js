/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        bricolage: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        /** 全站中文以宋体风格为主：Noto Serif SC + 系统宋体回退 */
        zenSerif: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'SimSun', 'serif'],
        zenSans: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'SimSun', 'serif'],
        profileSans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        profileKai: ['"KaiTi"', '"STKaiti"', '"楷体"', '"Noto Serif SC"', 'serif'],
      },
      colors: {
        zen: {
          paper: '#F9F9F7',
          mist: '#FDFDFD',
          ink: '#1A1A1A',
          vermilion: '#BC2026',
        },
      },
    },
  },
  plugins: [],
};

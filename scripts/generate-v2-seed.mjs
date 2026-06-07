#!/usr/bin/env node
/**
 * 生成 100 张色卡种子（v2） — 涵盖美食、自然、都市、情绪、文化、节气、艺术、材质
 * Usage:
 *   node scripts/generate-v2-seed.mjs                    # 仅生成 SQL + PNG
 *   node scripts/generate-v2-seed.mjs --import-remote    # 写入生产 D1 + R2
 *   node scripts/generate-v2-seed.mjs --import-local     # 写入本地 D1
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { encodeStripePng } from './lib/stripe-png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const OUT_DIR   = path.join(ROOT, 'data', 'seed-palettes', 'v2-100');
const SQL_FILE  = path.join(OUT_DIR, 'import.sql');
const MANIFEST  = path.join(OUT_DIR, 'manifest.json');

const SEED_USER_ID = 'th6enpoWlVBR06fc23WLSCjqeDWNLBub';
const R2_BUCKET    = 'sekong-style-images';

// ── 100 张色卡 ─────────────────────────────────────────────────────────────
const PALETTES = [
  // ── 美食饮品 (1–15) ─────────────────────────────────────────────────────
  {
    no: 1, title: '云南小锅',
    hexes: ['#C0392B', '#E67E22', '#E8D5B7', '#8B6914'],
    themes: ['美食', '暖色', '橙色系'],
  },
  {
    no: 2, title: '手冲单品',
    hexes: ['#3B1F0F', '#6B3A2A', '#A0522D', '#D2A679', '#F5ECD7'],
    themes: ['咖啡', '褐色系', '低饱和'],
  },
  {
    no: 3, title: '抹茶拿铁',
    hexes: ['#5B7A48', '#8FAD6A', '#C8D9A5', '#F2E8C6', '#FFF8F0'],
    themes: ['美食', '绿色系', '浅色'],
  },
  {
    no: 4, title: '杨枝甘露',
    hexes: ['#FFBE3C', '#FFE59A', '#F9C2C2', '#FFFFFF'],
    themes: ['热带水果', '黄色系', '浅色'],
  },
  {
    no: 5, title: '桃花酿',
    hexes: ['#F4B8C1', '#E87F9A', '#F8D7DA', '#FFF0F3'],
    themes: ['美食', '粉色系', '浅色'],
  },
  {
    no: 6, title: '陈皮普洱',
    hexes: ['#4A1E0E', '#7D3A1E', '#C07A2C', '#D4B483', '#F5ECD7'],
    themes: ['咖啡', '褐色系', '暖色'],
  },
  {
    no: 7, title: '龙井',
    hexes: ['#3D6B35', '#7FA35C', '#C8DFA8', '#F5F9EE'],
    themes: ['美食', '绿色系', '浅色'],
  },
  {
    no: 8, title: '盐系面包',
    hexes: ['#F5E6C8', '#E8C99A', '#C49A6C', '#8B6340'],
    themes: ['美食', '褐色系', '暖色'],
  },
  {
    no: 9, title: '芋泥抹茶',
    hexes: ['#7B6EA0', '#A898C8', '#5B7A48', '#C8D9A5'],
    themes: ['美食', '紫色系', '对比'],
  },
  {
    no: 10, title: '酸梅汤',
    hexes: ['#2D1B24', '#7D2B4E', '#B5435A', '#E8A67C'],
    themes: ['美食', '红色系', '暖色'],
  },
  {
    no: 11, title: '黄焖鸡',
    hexes: ['#F5A623', '#C47C1C', '#8B5E2C', '#3D2B1E'],
    themes: ['美食', '橙色系', '暖色'],
  },
  {
    no: 12, title: '麻辣锅底',
    hexes: ['#C0392B', '#8B1A1A', '#E67E22', '#2C1810'],
    themes: ['美食', '红色系', '深色'],
  },
  {
    no: 13, title: '荷叶饭',
    hexes: ['#4A7C59', '#8FAD6A', '#F5ECD7', '#C49A6C'],
    themes: ['美食', '绿色系', '自然'],
  },
  {
    no: 14, title: '玫瑰荔枝',
    hexes: ['#F4B8C1', '#E87F9A', '#FFF0F3', '#F9EAD3'],
    themes: ['美食', '粉色系', '浅色'],
  },
  {
    no: 15, title: '柚见乌龙',
    hexes: ['#E8D07A', '#B5842A', '#6B4226', '#F5F0E8'],
    themes: ['咖啡', '黄色系', '暖色'],
  },

  // ── 自然风景 (16–35) ────────────────────────────────────────────────────
  {
    no: 16, title: '杭州西湖',
    hexes: ['#7BA7A8', '#B3CEC7', '#D8E9E1', '#4A6E6A', '#F5F5F0'],
    themes: ['自然', '青色系', '冷色'],
  },
  {
    no: 17, title: '大理苍山',
    hexes: ['#8B9AB0', '#B5C5D5', '#D8E4EE', '#4A6080', '#F8FBFD'],
    themes: ['自然', '雾感', '冷色'],
  },
  {
    no: 18, title: '敦煌沙漠',
    hexes: ['#D4A055', '#E8C688', '#8B5E2C', '#4A90C4', '#F5E6C4'],
    themes: ['自然', '岩石', '暖色'],
  },
  {
    no: 19, title: '川西雪山',
    hexes: ['#E8F0F8', '#B0C8D8', '#7A9AB8', '#4A6A80', '#2A3A48'],
    themes: ['自然', '蓝色系', '冷色'],
  },
  {
    no: 20, title: '黔东南秋',
    hexes: ['#C04A1E', '#D4781E', '#7A9E54', '#2C4A2C', '#F5D5A0'],
    themes: ['自然', '植物', '暖色'],
  },
  {
    no: 21, title: '稻田水面',
    hexes: ['#A8C080', '#E8D88A', '#C8D8E8', '#8090A8', '#F0EBD8'],
    themes: ['自然', '植物', '低饱和'],
  },
  {
    no: 22, title: '荷塘月色',
    hexes: ['#2C3E50', '#7AA68A', '#E8B4C8', '#F5E8D0', '#9BB8C0'],
    themes: ['自然', '植物', '深色'],
  },
  {
    no: 23, title: '烟雨江南',
    hexes: ['#8A9898', '#B8C8C8', '#6A8468', '#E8ECE8', '#4A5858'],
    themes: ['自然', '雾感', '极简灰'],
  },
  {
    no: 24, title: '云贵高原',
    hexes: ['#3A6040', '#7AB890', '#A8C8B0', '#C080C0', '#E8D8F0'],
    themes: ['自然', '植物', '对比'],
  },
  {
    no: 25, title: '胡杨林',
    hexes: ['#D4A030', '#E8C870', '#8B5E2C', '#4A90C4', '#F5E6C4'],
    themes: ['自然', '植物', '暖色'],
  },
  {
    no: 26, title: '太行山脉',
    hexes: ['#6A7870', '#9AA898', '#4A5840', '#C8C0A8', '#E8E0D0'],
    themes: ['自然', '岩石', '低饱和'],
  },
  {
    no: 27, title: '海边礁石',
    hexes: ['#3A6888', '#6898B0', '#98B8C0', '#C8A888', '#E8D8C8'],
    themes: ['自然', '海洋', '冷色'],
  },
  {
    no: 28, title: '黄土高坡',
    hexes: ['#C87838', '#E8A858', '#4A7888', '#A89060', '#F0D8A8'],
    themes: ['自然', '岩石', '暖色'],
  },
  {
    no: 29, title: '漓江渔火',
    hexes: ['#1A2838', '#E88030', '#4A6870', '#98B0B8', '#F0D090'],
    themes: ['自然', '深色', '对比'],
  },
  {
    no: 30, title: '东北雪野',
    hexes: ['#F0F4F8', '#B8CED8', '#6888A0', '#2A3040', '#C8B898'],
    themes: ['自然', '白色', '冷色'],
  },
  {
    no: 31, title: '秋分时节',
    hexes: ['#D48830', '#E8C870', '#8AB878', '#7890A8', '#F0DCA0'],
    themes: ['自然', '植物', '暖色'],
  },
  {
    no: 32, title: '春分清晨',
    hexes: ['#A8C890', '#D0E8B0', '#F0E8C0', '#B8C8D8', '#F8F4EC'],
    themes: ['自然', '绿色系', '浅色'],
  },
  {
    no: 33, title: '梅雨季节',
    hexes: ['#607888', '#8898A0', '#6A8868', '#D8DCD8', '#E8E8E8'],
    themes: ['自然', '雾感', '极简灰'],
  },
  {
    no: 34, title: '霜降初雪',
    hexes: ['#E8ECEF', '#B0C0CC', '#7888A0', '#4A5868', '#DDD8CC'],
    themes: ['自然', '冷色', '极简灰'],
  },
  {
    no: 35, title: '寒露深秋',
    hexes: ['#A04830', '#C07040', '#5A7040', '#3A3028', '#D0B890'],
    themes: ['自然', '植物', '暖色'],
  },

  // ── 都市生活 (36–50) ────────────────────────────────────────────────────
  {
    no: 36, title: '演唱会',
    hexes: ['#1A0A30', '#6B3A8A', '#C870D8', '#E8A830', '#F0E8F8'],
    themes: ['艺术', '紫色系', '深色'],
  },
  {
    no: 37, title: '胶卷时代',
    hexes: ['#C49A72', '#E8D4A8', '#7A5A42', '#3A2820', '#F8EDD8'],
    themes: ['设计', '褐色系', '暖色'],
  },
  {
    no: 38, title: '夜市串串',
    hexes: ['#C01818', '#E86020', '#3A2010', '#D8A038', '#F8E8C0'],
    themes: ['美食', '红色系', '深色'],
  },
  {
    no: 39, title: '新年庙会',
    hexes: ['#C00808', '#D4A010', '#F0D840', '#1A0808', '#F8E0D0'],
    themes: ['文化', '红色系', '暖色'],
  },
  {
    no: 40, title: '便利店深夜',
    hexes: ['#0A1828', '#2A4A68', '#E8E830', '#E83888', '#F8F8F0'],
    themes: ['设计', '深色', '高饱和'],
  },
  {
    no: 41, title: '雨中骑行',
    hexes: ['#2A3848', '#4A6888', '#788898', '#E8D890', '#C8C8C0'],
    themes: ['情绪', '蓝色系', '低饱和'],
  },
  {
    no: 42, title: '图书馆',
    hexes: ['#C49A68', '#E8D4A8', '#7A8868', '#5A4838', '#F8F4EC'],
    themes: ['设计', '褐色系', '暖色'],
  },
  {
    no: 43, title: '露营夜话',
    hexes: ['#1A2C1A', '#C86820', '#E8A850', '#3A5848', '#F0E0B8'],
    themes: ['自然', '深色', '暖色'],
  },
  {
    no: 44, title: '街头篮球',
    hexes: ['#E86820', '#3A3028', '#D8C8A8', '#1A2030', '#F8D098'],
    themes: ['设计', '橙色系', '对比'],
  },
  {
    no: 45, title: '城郊集市',
    hexes: ['#D4A038', '#7A9858', '#C07840', '#E8E0C8', '#4A5830'],
    themes: ['自然', '植物', '暖色'],
  },
  {
    no: 46, title: '高铁窗外',
    hexes: ['#4A7898', '#98C0C8', '#C8D8A8', '#E8D8A8', '#78A870'],
    themes: ['自然', '冷色', '低饱和'],
  },
  {
    no: 47, title: '美术馆',
    hexes: ['#F8F6F0', '#E0D8C8', '#7A9898', '#C08060', '#3A3028'],
    themes: ['艺术', '极简灰', '低饱和'],
  },
  {
    no: 48, title: '健身镜前',
    hexes: ['#1A1818', '#48A8D8', '#E82828', '#E8E8E8', '#3A3830'],
    themes: ['设计', '深色', '高饱和'],
  },
  {
    no: 49, title: '屋顶花园',
    hexes: ['#5A8A60', '#98C090', '#E8D8B0', '#8898B0', '#F0E8D8'],
    themes: ['自然', '绿色系', '低饱和'],
  },
  {
    no: 50, title: '独立书店',
    hexes: ['#C09060', '#E8D8B8', '#5A7860', '#3A2818', '#F8F0E0'],
    themes: ['设计', '褐色系', '暖色'],
  },

  // ── 情绪心境 (51–65) ────────────────────────────────────────────────────
  {
    no: 51, title: '久别重逢',
    hexes: ['#D4A070', '#E8C898', '#B07850', '#F5ECD7', '#8A6040'],
    themes: ['情绪', '暖色', '低饱和'],
  },
  {
    no: 52, title: '分手前夕',
    hexes: ['#7888A0', '#9AAAC0', '#D0B8B8', '#4A5870', '#E8E0E0'],
    themes: ['情绪', '蓝色系', '低饱和'],
  },
  {
    no: 53, title: '毕业季',
    hexes: ['#E8C830', '#F0E890', '#A8C890', '#8898C8', '#F8F4E0'],
    themes: ['情绪', '黄色系', '浅色'],
  },
  {
    no: 54, title: '深夜发呆',
    hexes: ['#1A2838', '#3A5070', '#D0C8A0', '#9898A8', '#F0ECD8'],
    themes: ['情绪', '深色', '冷色'],
  },
  {
    no: 55, title: '被爱着',
    hexes: ['#F8C8C0', '#E0A8A0', '#F8E8E0', '#E8B890', '#FFF5F0'],
    themes: ['情绪', '粉色系', '浅色'],
  },
  {
    no: 56, title: '压力山大',
    hexes: ['#4A4848', '#7A7890', '#C03030', '#E8D8C8', '#2A2A38'],
    themes: ['情绪', '深色', '对比'],
  },
  {
    no: 57, title: '打翻颜料',
    hexes: ['#E82828', '#E89828', '#28C828', '#2888E8', '#C828E8'],
    themes: ['艺术', '高饱和', '对比'],
  },
  {
    no: 58, title: '初次见面',
    hexes: ['#F4C0C8', '#C8C8D8', '#E8D8C8', '#A0B0C8', '#F8F4F0'],
    themes: ['情绪', '粉色系', '浅色'],
  },
  {
    no: 59, title: '旅行归来',
    hexes: ['#4A6898', '#D4A878', '#E8D8B0', '#7A9870', '#F0EAD8'],
    themes: ['情绪', '蓝色系', '低饱和'],
  },
  {
    no: 60, title: '周五傍晚',
    hexes: ['#E89040', '#F8D080', '#4A6088', '#D0C0A0', '#F8F0E8'],
    themes: ['情绪', '橙色系', '暖色'],
  },
  {
    no: 61, title: '孕育',
    hexes: ['#8AAA80', '#C8D8A8', '#E8D8C8', '#D0C0B0', '#F5EEE8'],
    themes: ['情绪', '植物', '浅色'],
  },
  {
    no: 62, title: '告白失败',
    hexes: ['#6868A0', '#9898C0', '#D0C8D0', '#4A4868', '#E8E4E8'],
    themes: ['情绪', '紫色系', '低饱和'],
  },
  {
    no: 63, title: '一人生日',
    hexes: ['#E8A030', '#F0D080', '#6888B0', '#E8C8C0', '#F8F0E0'],
    themes: ['情绪', '暖色', '对比'],
  },
  {
    no: 64, title: '被误解',
    hexes: ['#5058B0', '#8090C8', '#3A4070', '#E0DDE8', '#C8C0D0'],
    themes: ['情绪', '蓝色系', '冷色'],
  },
  {
    no: 65, title: '久违的拥抱',
    hexes: ['#E8B898', '#D49878', '#F0D8C8', '#C08868', '#F8EEE4'],
    themes: ['情绪', '暖色', '低饱和'],
  },

  // ── 传统文化 (66–75) ────────────────────────────────────────────────────
  {
    no: 66, title: '宋代官窑',
    hexes: ['#89A89E', '#B8CEC8', '#D8E8E0', '#6A8880', '#F0F4F2'],
    themes: ['文化', '青色系', '低饱和'],
  },
  {
    no: 67, title: '唐三彩',
    hexes: ['#C87820', '#5A8838', '#E8DCC8', '#D4A838', '#B84820'],
    themes: ['文化', '橙色系', '对比'],
  },
  {
    no: 68, title: '汉代漆器',
    hexes: ['#C81818', '#1A1008', '#D4A020', '#8A1818', '#E8D098'],
    themes: ['文化', '红色系', '深色'],
  },
  {
    no: 69, title: '青铜器',
    hexes: ['#3A6850', '#6A9870', '#2A4038', '#A8B888', '#C8C098'],
    themes: ['文化', '绿色系', '低饱和'],
  },
  {
    no: 70, title: '敦煌壁画',
    hexes: ['#C07840', '#4A7898', '#D4A858', '#8A6840', '#F0D8A0'],
    themes: ['文化', '暖色', '对比'],
  },
  {
    no: 71, title: '茉莉花茶',
    hexes: ['#F5F2E8', '#C8D4A8', '#F0E8C8', '#A0B078', '#EAE0C8'],
    themes: ['美食', '绿色系', '浅色'],
  },
  {
    no: 72, title: '宣纸水墨',
    hexes: ['#F5F3EE', '#1A1818', '#7A8080', '#B8B0A0', '#D8D0C0'],
    themes: ['文化', '极简灰', '素材'],
  },
  {
    no: 73, title: '苏绣',
    hexes: ['#3A8888', '#E87880', '#F0E8D0', '#D4A038', '#A0B8B8'],
    themes: ['文化', '青色系', '对比'],
  },
  {
    no: 74, title: '青花瓷',
    hexes: ['#1A4878', '#4A78A8', '#A0C0D8', '#F0F4F8', '#2A3858'],
    themes: ['文化', '蓝色系', '冷色'],
  },
  {
    no: 75, title: '云锦',
    hexes: ['#C80808', '#D4A020', '#1A2858', '#A04830', '#F0E0A0'],
    themes: ['文化', '红色系', '对比'],
  },

  // ── 节气时令 (76–85) ────────────────────────────────────────────────────
  {
    no: 76, title: '谷雨',
    hexes: ['#7A9868', '#B8D0A0', '#D8E8D0', '#9AB0B8', '#F0F0EC'],
    themes: ['自然', '绿色系', '浅色'],
  },
  {
    no: 77, title: '夏至',
    hexes: ['#F0D020', '#4888D8', '#F5F0D8', '#2A4888', '#E8C840'],
    themes: ['自然', '黄色系', '高饱和'],
  },
  {
    no: 78, title: '白露',
    hexes: ['#E8EEF0', '#A8C0C8', '#78A880', '#D0E0D8', '#F5F8F5'],
    themes: ['自然', '冷色', '浅色'],
  },
  {
    no: 79, title: '冬至',
    hexes: ['#0A1428', '#1A3050', '#98B0C8', '#4878A8', '#E8E8F0'],
    themes: ['自然', '蓝色系', '深色'],
  },
  {
    no: 80, title: '小雪',
    hexes: ['#E8EDF0', '#C0D0D8', '#8898A8', '#B8C8D0', '#F0F4F6'],
    themes: ['自然', '冷色', '极简灰'],
  },
  {
    no: 81, title: '大暑',
    hexes: ['#E84820', '#F09840', '#F8D868', '#2A3848', '#F5E0C0'],
    themes: ['自然', '红色系', '高饱和'],
  },
  {
    no: 82, title: '立秋',
    hexes: ['#D09840', '#7A9870', '#C8C0A0', '#4A6880', '#F0E8D0'],
    themes: ['自然', '植物', '暖色'],
  },
  {
    no: 83, title: '芒种',
    hexes: ['#E8C840', '#C8A030', '#78A848', '#4888C8', '#F5ECC8'],
    themes: ['自然', '黄色系', '暖色'],
  },
  {
    no: 84, title: '清明',
    hexes: ['#7A9880', '#B0C8B8', '#9898A8', '#D8E0D8', '#F0F2F0'],
    themes: ['自然', '绿色系', '极简灰'],
  },
  {
    no: 85, title: '霜降红柿',
    hexes: ['#E86820', '#C04820', '#F0C888', '#C0C8C0', '#F5F0E8'],
    themes: ['自然', '橙色系', '暖色'],
  },

  // ── 艺术灵感 (86–93) ────────────────────────────────────────────────────
  {
    no: 86, title: '莫奈睡莲',
    hexes: ['#7898B8', '#9ABAA8', '#C8A8C0', '#E8D8D0', '#B0B8A0'],
    themes: ['艺术', '蓝色系', '低饱和'],
  },
  {
    no: 87, title: '梵高麦田',
    hexes: ['#E8C020', '#4870B8', '#78A840', '#D4A020', '#1A2848'],
    themes: ['艺术', '黄色系', '高饱和'],
  },
  {
    no: 88, title: '马蒂斯',
    hexes: ['#E82020', '#E8A808', '#2878C8', '#28A858', '#F8E8D0'],
    themes: ['艺术', '高饱和', '对比'],
  },
  {
    no: 89, title: '草间弥生',
    hexes: ['#C00878', '#F0D808', '#0870C0', '#E8E828', '#F8F8F0'],
    themes: ['艺术', '高饱和', '对比'],
  },
  {
    no: 90, title: '宫崎骏天空',
    hexes: ['#5898C8', '#88C058', '#E8C840', '#D8A068', '#F0E8D0'],
    themes: ['艺术', '蓝色系', '暖色'],
  },
  {
    no: 91, title: '极简黑白',
    hexes: ['#181818', '#3A3838', '#787870', '#C8C8C0', '#E8E8E0'],
    themes: ['设计', '黑色', '极简灰'],
  },
  {
    no: 92, title: '包豪斯',
    hexes: ['#C80808', '#E8C808', '#0848A8', '#1A1818', '#F8F8F0'],
    themes: ['艺术', '高饱和', '对比'],
  },
  {
    no: 93, title: '浮世绘浪',
    hexes: ['#1848A8', '#3878C8', '#F8F8F0', '#2A3870', '#98B8D8'],
    themes: ['文化', '蓝色系', '冷色'],
  },

  // ── 材质质感 (94–100) ───────────────────────────────────────────────────
  {
    no: 94, title: '清水混凝土',
    hexes: ['#A0A098', '#C8C8C0', '#787870', '#E0E0D8', '#4A4840'],
    themes: ['设计', '极简灰', '素材'],
  },
  {
    no: 95, title: '窑变陶瓷',
    hexes: ['#A04830', '#C88048', '#6A8860', '#3A2820', '#E8D0A0'],
    themes: ['文化', '褐色系', '暖色'],
  },
  {
    no: 96, title: '黄铜做旧',
    hexes: ['#B8980A', '#8A7020', '#D0C050', '#4A3810', '#E8D898'],
    themes: ['素材', '黄色系', '低饱和'],
  },
  {
    no: 97, title: '老旧皮革',
    hexes: ['#7A4A28', '#5A3018', '#A07850', '#C8A878', '#E8D0A8'],
    themes: ['素材', '褐色系', '暖色'],
  },
  {
    no: 98, title: '手工麻布',
    hexes: ['#C8B890', '#E8D8B8', '#A09070', '#D8C8A0', '#F0E8D0'],
    themes: ['素材', '低饱和', '浅色'],
  },
  {
    no: 99, title: '磨砂玻璃',
    hexes: ['#D0D8E0', '#E8EEF0', '#A0B0B8', '#F0F4F6', '#B8C8D0'],
    themes: ['设计', '冷色', '浅色'],
  },
  {
    no: 100, title: '水磨石',
    hexes: ['#C8B8A0', '#A09080', '#D08060', '#4A6880', '#E8E0D0'],
    themes: ['素材', '褐色系', '低饱和'],
  },
];

// ── 工具函数 ────────────────────────────────────────────────────────────────
function stableId(no) {
  const h = createHash('sha256').update(`sekong-v2:v1:${no}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

async function loadModules() {
  const tagsUrl = pathToFileURL(path.join(ROOT, 'src/lib/paletteTags.js')).href;
  const { generatePaletteTags } = await import(tagsUrl);
  return { generatePaletteTags };
}

function buildKeywords(themeTags, engineTags) {
  const base = ['color-extract', 'palette', '色海导入'];
  const seen = new Set(base);
  const out = [...base];
  for (const t of [...themeTags, ...engineTags]) {
    const k = String(t).trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function buildRow(palette, { generatePaletteTags }) {
  const id = stableId(palette.no);
  const hexes = palette.hexes.map((h) => h.toUpperCase());
  const engineTags = generatePaletteTags(hexes, {});
  const themeTags = palette.themes || [];
  const keywords = buildKeywords(themeTags, engineTags);
  const colors = hexes.map((hex) => ({ hex, name: '' }));
  const title = palette.title;
  const themeDesc = themeTags.slice(0, 2).join('、');
  const overview = `「${title}」——${themeDesc}气质，可作日常创作的配色参考。`;
  const snapshot = {
    colorCard: true,
    colorCardData: { overview, colors },
    aesthetic: title,
    keywords,
    prompt: overview,
    paletteMeta: {},
    engineTags,
    themeTags,
    sourceType: 'curated_seed_v2',
    seedNo: palette.no,
  };
  const imageKey = `${SEED_USER_ID}/${id}.png`;
  const imageUrl = `/api/v1/media/${imageKey}`;
  return { id, title, hexes, keywords, overview, snapshot, imageUrl, imageKey };
}

function writeSql(rows) {
  const lines = ['PRAGMA foreign_keys = ON;'];
  for (const row of rows) {
    lines.push(`INSERT OR REPLACE INTO styles (
      id, user_id, is_public, image_url, aesthetic, typography, fonts, palette,
      design_logic, keywords, prompt, extraction_snapshot, like_count, created_at
    ) VALUES (
      '${sqlEscape(row.id)}', '${SEED_USER_ID}', 1,
      '${sqlEscape(row.imageUrl)}', '${sqlEscape(row.title)}', NULL, NULL,
      '${sqlEscape(JSON.stringify(row.hexes))}',
      '${sqlEscape(row.overview)}',
      '${sqlEscape(JSON.stringify(row.keywords))}',
      '${sqlEscape(row.overview)}',
      '${sqlEscape(JSON.stringify(row.snapshot))}',
      0, datetime('now')
    );`);
  }
  fs.writeFileSync(SQL_FILE, `${lines.join('\n')}\n`);
}

async function main() {
  const { generatePaletteTags } = await loadModules();
  fs.mkdirSync(path.join(OUT_DIR, 'images'), { recursive: true });

  const rows = PALETTES.map((p) => buildRow(p, { generatePaletteTags }));

  for (const row of rows) {
    const pngPath = path.join(OUT_DIR, 'images', `${row.id}.png`);
    fs.writeFileSync(pngPath, encodeStripePng(row.hexes));
  }

  writeSql(rows);
  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      rows.map((r) => ({
        no: r.snapshot.seedNo,
        id: r.id,
        title: r.title,
        hexes: r.hexes,
        keywords: r.keywords,
      })),
      null,
      2,
    ),
  );

  console.log(`Generated ${rows.length} palettes → ${OUT_DIR}`);
  console.log(`  SQL: ${SQL_FILE}`);

  if (process.argv.includes('--import-remote')) {
    console.log('Uploading PNGs to R2…');
    for (const row of rows) {
      const pngPath = path.join(OUT_DIR, 'images', `${row.id}.png`);
      const r = spawnSync(
        'npx',
        ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${row.imageKey}`,
          `--file=${pngPath}`, '--content-type=image/png', '--remote'],
        { cwd: ROOT, stdio: 'inherit' },
      );
      if (r.status !== 0) process.exit(r.status ?? 1);
    }
    console.log('Importing SQL to remote D1…');
    const d1 = spawnSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'genom-db', '--remote', `--file=${SQL_FILE}`],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (d1.status !== 0) process.exit(d1.status ?? 1);
    console.log('Remote import complete.');
  } else if (process.argv.includes('--import-local')) {
    console.log('Importing SQL to local D1…');
    const d1 = spawnSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'genom-db', '--local', `--file=${SQL_FILE}`],
      { cwd: ROOT, stdio: 'inherit' },
    );
    if (d1.status !== 0) process.exit(d1.status ?? 1);
    console.log('Local import complete.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

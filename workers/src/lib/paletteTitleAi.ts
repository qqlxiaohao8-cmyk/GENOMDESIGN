/** 与前端 palettePoeticTitle.js 保持一致 */
export const PALETTE_TITLE_MAX_LEN = 12;
export const PALETTE_TITLE_MIN_LEN = 2;

const MODEL = '@cf/qwen/qwen1.5-7b-chat-awq';

export type PaletteColorInput = { hex?: string; name?: string };
export type PaletteMetaInput = {
  styleLabel?: string;
  category?: string;
  harmonyMode?: string;
  harmonyId?: string;
  saturationMode?: string;
  lightnessMode?: string;
  mood?: string[];
  beautyGrade?: string;
};

export type GenerateTitleInput = {
  colors: PaletteColorInput[];
  tags?: string[];
  paletteMeta?: PaletteMetaInput;
  excludeTitles?: string[];
  currentTitle?: string;
  colorVibe?: string;
};

const NAMING_SYSTEM_PROMPT = `你是一个专业的色卡命名师。根据给定颜色组合，生成能让用户「见名知色、产生情感与文化共鸣」的色卡名称。

命名必须满足：
1. 看到名字能联想到对应颜色
2. 能触发明确的情感或文化联想
3. 简洁、有美感、易记忆

【三条铁律】
原则1 意象优先：用具体场景/物体/画面，禁止直接描述颜色（不要「深蓝浅蓝」「红配绿」）。必须变成画面（如「午夜海面」）。
原则2 通感唤醒：至少触发一种非视觉感官（味觉、触觉、嗅觉、听觉、温度）。例：焦糖玛奇朵、天鹅绒午后、雨后青苔。
原则3 文化锚点：打开共同文化记忆（诗词、电影、朝代、食物、地名、艺术）。例：只此青绿、花样年华、敦煌。

【六条公式，按颜色特征选一条】
公式1 文化符号+材质：敦煌沙、青花瓷、江南雨。适用国风、传统、雅致。
公式2 时间+地点+光线：凌晨四点的蓝、傍晚厨房的暖光。适用生活、摄影、家居。
公式3 情绪+颜色隐喻：焦虑灰、孤独蓝、浪漫过敏。适用心理、年轻市场。
公式4 动词+名词：揉碎晚霞、打翻的牛奶、熄灭灯火。适用艺术、美妆、情绪。
公式5 感官+食物：海盐焦糖、抹茶拿铁、黑巧。适用餐饮、甜品、香氛。
公式6 作品/典故：布达佩斯大饭店、花样年华、银翼杀手、只此青绿。适用限量、策展。

【颜色特征 → 主题】
低饱和+灰/米/燕麦 → 抽象情绪：钝感力、自洽、松弛感、边界感、温柔叛逆。
高饱和+红/金/黑 → 东方诗意：朱砂、胭脂、敦煌、盛唐、洛神。
绿/棕/灰绿+自然 → 自然意象：晨雾、苔原、深海、极光、雨后青苔。
粉/紫/蓝+梦幻 → 电影文学：布达佩斯、爱乐之城、小王子、花样年华。
棕/奶白/焦糖/抹茶 → 食物感官：海盐焦糖、抹茶拿铁、黑巧、肉桂卷。
灰/蓝/银+冷感 → 都市情绪：加班夜、早高峰、独居、周一焦虑、周五傍晚。
传统色+低明度+暖调 → 东方诗意：竹月、青花、江南烟雨、朱砂痣。
荧光/高对比+赛博 → 都市未来：极光、霓虹、银翼杀手、全息。

【结构】偏正（午夜海面）、动宾（揉碎晚霞）、并列（胭脂扣）、专名（花样年华）、情绪+色（焦虑灰）。

【四不要】
不要编号（色彩1、色卡001）。
不要直白（红配绿、深蓝浅蓝、暖色调）。
不要文化误读（敦煌配赛博荧光；江南烟雨配荧光）。
不要生僻（黼黻、靛颏、蘧蒢）。用青花瓷、竹月、胭脂扣。

【流程】分析颜色 → 匹配主题与情感 → 选一条公式 → 内心生成候选并自检（联想/情感/文化/禁止）→ 输出最终名。
冲突时：文化共鸣>个人创意；情感价值>颜色准确；具体意象>抽象美感；用户理解>文学深度；简洁易记>复杂华丽。

【输出】按流程在内部完成后，只输出一个最终名称。不要书名号，不要解释，不要备选，不要分析过程。2–12字。`;

function normHex(hex: string) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '';
  return `#${s.toUpperCase()}`;
}

function clampTitle(raw: string) {
  return String(raw || '')
    .trim()
    .replace(/^["'「『《【\s]+|["'」』》】\s]+$/g, '')
    .replace(/\s+/g, '')
    .slice(0, PALETTE_TITLE_MAX_LEN);
}

function isValidTitle(t: string) {
  const s = clampTitle(t);
  if (s.length < PALETTE_TITLE_MIN_LEN || s.length > PALETTE_TITLE_MAX_LEN) return false;
  if (!/[\u4e00-\u9fff]/.test(s)) return false;
  if (/^[0-9A-Za-z]+$/.test(s)) return false;
  if (/^(色彩|组合|色卡|色号)\d*$/.test(s)) return false;
  if (/^(红|橙|黄|绿|青|蓝|紫|粉|灰|黑|白)配/.test(s)) return false;
  if (/(深蓝浅蓝|红配绿|暖色调|冷色调)$/.test(s)) return false;
  return true;
}

function extractResponseText(result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const r = result as Record<string, unknown>;
  if (typeof r.response === 'string') return r.response;
  if (typeof r.result === 'string') return r.result;
  const choice = (r.choices as Array<{ message?: { content?: string } }> | undefined)?.[0];
  if (choice?.message?.content) return choice.message.content;
  return '';
}

function hexToHsl(hex: string) {
  const s = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: sat * 100, l: l * 100 };
}

function familyOf(hsl: { h: number; s: number; l: number }) {
  const { h, s, l } = hsl;
  if (l >= 90 && s < 14) return '白';
  if (l <= 14 && s < 22) return '墨';
  if (s < 10) return l > 72 ? '白' : l < 28 ? '墨' : '灰';
  if (h >= 350 || h < 14) return l > 68 && s < 55 ? '粉' : '红';
  if (h < 42) return '橙';
  if (h < 54) return '金';
  if (h < 72) return '黄';
  if (h < 160) return '绿';
  if (h < 195) return '青';
  if (h < 250) return '蓝';
  if (h < 295) return '紫';
  return '粉';
}

function analyzeVibe(colors: PaletteColorInput[]) {
  const stats = colors.map((c) => hexToHsl(normHex(c.hex || ''))).filter(Boolean) as Array<{
    h: number; s: number; l: number;
  }>;
  if (!stats.length) return '';
  const families = [...new Set(stats.map(familyOf))];
  const avgS = stats.reduce((a, c) => a + c.s, 0) / stats.length;
  const avgL = stats.reduce((a, c) => a + c.l, 0) / stats.length;
  const warm = stats.filter((c) => c.h < 70 || c.h > 320).length;
  const sat = avgS > 55 ? '高饱和' : avgS < 26 ? '低饱和灰调' : '中饱和';
  const lit = avgL > 74 ? '高明度' : avgL < 32 ? '低明度' : '中明度';
  const warmth = warm > stats.length / 2 ? '暖调' : '冷调';
  return `主色偏${families.join('、')}，${sat}，${lit}，${warmth}。`;
}

function buildColorLines(colors: PaletteColorInput[]) {
  return colors
    .slice(0, 10)
    .map((c) => {
      const hex = normHex(c.hex || '');
      const name = String(c.name || '').trim();
      if (!hex) return null;
      const hsl = hexToHsl(hex);
      const fam = hsl ? familyOf(hsl) : '';
      return name ? `${hex}（${name}，偏${fam}）` : `${hex}（偏${fam}）`;
    })
    .filter(Boolean)
    .join('、');
}

export function buildPaletteTitlePrompt(input: GenerateTitleInput) {
  const colors = (input.colors || []).filter((c) => normHex(c.hex || ''));
  const tags = (input.tags || []).map((t) => String(t).trim()).filter(Boolean);
  const exclude = [
    ...new Set(
      (input.excludeTitles || [])
        .concat(input.currentTitle ? [input.currentTitle] : [])
        .map((s) => String(s).trim())
        .filter(Boolean),
    ),
  ].slice(0, 40);

  const vibe = String(input.colorVibe || '').trim() || analyzeVibe(colors);

  const userBlock = [
    '【色卡信息】',
    `色块：${buildColorLines(colors) || '（无）'}`,
    vibe ? `气色：${vibe}` : '',
    tags.length ? `标签仅供参考（与颜色不符则忽略）：${tags.join('、')}` : '',
    exclude.length ? `不要重复这些名字：${exclude.join('、')}` : '',
    '',
    '按系统规则完成分析与自检，只输出最终名称。',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    messages: [
      { role: 'system', content: NAMING_SYSTEM_PROMPT },
      { role: 'user', content: userBlock },
    ],
  };
}

export function parseGeneratedTitle(raw: string, excludeTitles: string[] = []) {
  const exclude = new Set(excludeTitles.map((s) => String(s).trim()).filter(Boolean));
  const text = String(raw || '');
  const named = text.match(/名称[:：]\s*[《「『"]?([^\n》」』"]{2,16})/);
  const booked = text.match(/《([^》]{2,16})》/);
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !/^【/.test(l) && !/^(公式|主题|情感|文化|自检|备选)/.test(l)) || '';
  const candidates = [named?.[1], booked?.[1], firstLine].filter(Boolean) as string[];
  for (const rawTitle of candidates) {
    const candidate = clampTitle(String(rawTitle).replace(/^名称[:：]\s*/, ''));
    if (!isValidTitle(candidate)) continue;
    if (exclude.has(candidate)) continue;
    return candidate;
  }
  return null;
}

export async function generatePaletteTitleWithAi(
  ai: Ai,
  input: GenerateTitleInput,
): Promise<string | null> {
  const exclude = (input.excludeTitles || [])
    .concat(input.currentTitle ? [input.currentTitle] : [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  const { messages } = buildPaletteTitlePrompt(input);

  const result = await ai.run(MODEL, {
    messages,
    max_tokens: 48,
    temperature: 0.7,
  });

  const text = extractResponseText(result);
  let title = parseGeneratedTitle(text, exclude);
  if (title) return title;

  const zhRun = text.match(/[\u4e00-\u9fff][^\n]{1,11}/g);
  if (zhRun) {
    for (const chunk of zhRun) {
      title = parseGeneratedTitle(chunk, exclude);
      if (title) return title;
    }
  }

  return null;
}

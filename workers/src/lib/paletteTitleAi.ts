/** 与前端 palettePoeticTitle.js 保持一致 */
export const PALETTE_TITLE_MAX_LEN = 10;
export const PALETTE_TITLE_MIN_LEN = 1;

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
};

const CATEGORY_ZH: Record<string, string> = {
  nature: '自然',
  art: '艺术',
  emotion: '情绪',
  culture: '文化',
  material: '素材',
  design: '设计',
  fashion: '时尚',
  season: '季节',
};

const MOOD_ZH: Record<string, string> = {
  warm: '温暖',
  cool: '清冷',
  crisp: '清冽',
  quiet: '静谧',
  cold: '冷寂',
  refined: '雅致',
  scholarly: '书卷',
  muted: '低饱和',
  vibrant: '鲜活',
  vacation: '度假',
  bright: '明亮',
  relaxed: '松弛',
  playful: '玩趣',
  retro: '复古',
  graphic: '图形',
  clean: '干净',
  sparse: '疏朗',
  calm: '平静',
  luxury: '奢华',
  solid: '沉稳',
  aged: '陈旧',
  heavy: '厚重',
  historic: '历史感',
};

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
  if (/^[0-9]+$/.test(s)) return false;
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

function buildColorLines(colors: PaletteColorInput[]) {
  return colors
    .slice(0, 10)
    .map((c) => {
      const hex = normHex(c.hex || '');
      const name = String(c.name || '').trim();
      if (!hex) return null;
      return name ? `${hex}（${name}）` : hex;
    })
    .filter(Boolean)
    .join('、');
}

function buildMetaLines(meta: PaletteMetaInput = {}) {
  const lines: string[] = [];
  if (meta.styleLabel) lines.push(`风格意象：${meta.styleLabel}`);
  if (meta.category) {
    lines.push(`主题类别：${CATEGORY_ZH[meta.category] || meta.category}`);
  }
  if (meta.harmonyMode || meta.harmonyId) {
    lines.push(`配色关系：${meta.harmonyMode || meta.harmonyId}`);
  }
  if (meta.saturationMode) lines.push(`饱和度气质：${meta.saturationMode}`);
  if (meta.lightnessMode) lines.push(`明度气质：${meta.lightnessMode}`);
  if (Array.isArray(meta.mood) && meta.mood.length) {
    const moodZh = meta.mood.map((m) => MOOD_ZH[m] || m).join('、');
    lines.push(`情绪关键词：${moodZh}`);
  }
  if (meta.beautyGrade) lines.push(`配色美感：${meta.beautyGrade}`);
  return lines.join('\n');
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

  const metaBlock = buildMetaLines(input.paletteMeta);

  const userBlock = [
    '请为以下色卡起一个中文名称。',
    '',
    '【色块】',
    buildColorLines(colors) || '（无）',
    '',
    tags.length ? `【标签】\n${tags.join('、')}` : '',
    metaBlock ? `【气质】\n${metaBlock}` : '',
    exclude.length ? `【勿重复】\n${exclude.join('、')}` : '',
    '',
    '只输出一个名称，不要解释。',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    messages: [
      {
        role: 'system',
        content: [
          '你是「色空」App 的色卡命名师，擅长从配色理解整体情绪、季节感与生活场景。',
          '命名要求：',
          `1. 只输出 1 个中文名称，${PALETTE_TITLE_MIN_LEN}–${PALETTE_TITLE_MAX_LEN} 个汉字；`,
          '2. 名称应概括整组配色的意境与情景（如美食饮品、自然风景、都市日常、情绪心境、香氛茶点等），',
          '   不要直接拼接色名，不要用 hex 或英文；',
          '3. 名称要有画面感与情绪温度，类似「橙香玛德」「谷雨煎茶」「曲院风荷」「大漠孤烟直」；',
          '4. 禁止书名号、引号、标点、序号与任何解释文字。',
        ].join('\n'),
      },
      { role: 'user', content: userBlock },
    ],
  };
}

export function parseGeneratedTitle(raw: string, excludeTitles: string[] = []) {
  const exclude = new Set(excludeTitles.map((s) => String(s).trim()).filter(Boolean));
  const firstLine = String(raw || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean) || '';
  const candidate = clampTitle(firstLine.replace(/^名称[:：]\s*/, ''));
  if (!isValidTitle(candidate)) return null;
  if (exclude.has(candidate)) return null;
  return candidate;
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
    temperature: 0.85,
  });

  const text = extractResponseText(result);
  let title = parseGeneratedTitle(text, exclude);
  if (title) return title;

  // 模型偶尔带多余字，再尝试取前 10 字内的中文片段
  const zhRun = text.match(/[\u4e00-\u9fff]{1,10}/g);
  if (zhRun) {
    for (const chunk of zhRun) {
      title = parseGeneratedTitle(chunk, exclude);
      if (title) return title;
    }
  }

  return null;
}

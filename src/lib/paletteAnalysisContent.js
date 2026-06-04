import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { isDisplayableSeaTag } from './colorSeaTags';
import { generatePaletteTags } from './paletteTags';
import {
  getPoeticColorName,
  getPoeticQuoteForHex,
  uniquePoeticNamesForSwatches,
} from './poeticColorNaming';

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

function firstSentences(text, max = 2) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const parts = raw.split(/[。！？\n]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return raw;
  const joined = parts.slice(0, max).join('。');
  return joined.endsWith('。') ? joined : `${joined}。`;
}

function colorIntro(hex, name) {
  const { zh, zhSource } = getPoeticQuoteForHex(hex);
  if (zh && zhSource) return `「${zh}」— ${zhSource}`;
  if (zh) return `「${zh}」`;
  return `「${name}」与 #${hex.replace(/^#/, '')} 在诗色谱中相近，可作该色的意象参考。`;
}

function deriveMeaning(tags, overview, designLogic) {
  if (designLogic?.trim()) return firstSentences(designLogic, 3);
  if (overview?.trim()) return firstSentences(overview, 2);
  const domain = tags.find((t) => /色系$/.test(t));
  const harmony = tags.find((t) => ['单色阶', '近似色', '互补色', '分裂互补', '三角配色', '四角配色'].includes(t));
  const bits = [];
  if (domain) bits.push(`以${domain}为基调`);
  if (harmony) bits.push(`采用${harmony}关系组织`);
  if (tags.includes('暖色')) bits.push('整体偏暖，像日暮与陶土的温度');
  else if (tags.includes('冷色')) bits.push('整体偏冷，带水面与远山的清冽');
  if (tags.includes('高饱和')) bits.push('色彩鲜明，层次跳跃');
  else if (tags.includes('低饱和') || tags.includes('极简灰')) bits.push('灰度克制，气质沉静');
  if (!bits.length) return '多种色相并置，形成可反复品读的配色叙事。';
  return `${bits.join('，')}，构成这张色卡的核心气质。`;
}

function derivePsychology(tags) {
  const lines = [];
  if (tags.includes('暖色')) lines.push('暖调易唤起亲近、活力与安全感，适合需要「被看见」的场景。');
  if (tags.includes('冷色')) lines.push('冷调常关联专注、秩序与距离感，有助于沉淀情绪、降低视觉噪点。');
  if (tags.includes('浅色')) lines.push('高明度带来轻盈与开放，减轻压迫感。');
  if (tags.includes('深色')) lines.push('深色系强化稳重与神秘，适合需要权威感或夜色的语境。');
  if (tags.includes('高饱和')) lines.push('高饱和刺激注意力，适合强调行动与品牌识别。');
  if (tags.includes('低饱和') || tags.includes('极简灰')) lines.push('低饱和降低情绪振幅，利于长时间阅读与冥想式体验。');
  if (tags.includes('对比')) lines.push('强对比制造张力，适合需要戏剧性与记忆点的视觉。');
  if (!lines.length) lines.push('配色在冷暖与明暗之间取得平衡，观感中性，便于嵌入不同情绪叙事。');
  return lines.slice(0, 3).join('');
}

function deriveUsage(tags) {
  const uses = [];
  if (tags.some((t) => /红|橙|黄|暖/.test(t))) uses.push('节庆海报、餐饮与生活方式品牌');
  if (tags.some((t) => /蓝|青|靛|冷/.test(t))) uses.push('科技产品界面、资讯与知识类视觉');
  if (tags.includes('极简灰') || tags.includes('低饱和')) uses.push('画册、建筑摄影与极简 UI');
  if (tags.includes('高饱和')) uses.push('活动主视觉、短视频封面与潮流周边');
  if (tags.includes('互补色') || tags.includes('分裂互补')) uses.push('插画、潮玩与需要冲击力的主画面');
  uses.push('个人创作参考、PPT 配色与 Moodboard 整理');
  const seen = new Set();
  const unique = [];
  for (const u of uses) {
    if (seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
    if (unique.length >= 4) break;
  }
  return unique.map((u) => `· ${u}`).join('\n');
}

export function resolvePaletteLikeCount(item, exploreFeed = []) {
  if (!item) return 0;
  const direct = Number(item.likeCount);
  if (direct > 0) return direct;
  const sid = item.extractionSnapshot?.sourceStyleId ?? item.extractionSnapshot?.favoritedFrom;
  if (!sid) return 0;
  const source = exploreFeed.find((i) => i.id === sid);
  return Number(source?.likeCount) || 0;
}

/**
 * @param {object} item vault / community style row
 * @param {{ exploreFeed?: object[] }} [opts]
 */
export function buildPaletteAnalysis(item, opts = {}) {
  const cd = itemColorCardData(item);
  if (!cd?.colors?.length) return null;

  const snap = item?.extractionSnapshot;
  const rawColors = cd.colors.slice(0, 10);
  const poeticNames = uniquePoeticNamesForSwatches(rawColors);
  const colors = rawColors.map((c, i) => {
    const hex = normalizeHex(c.hex) || '#888888';
    const name = String(c.name || poeticNames[i] || getPoeticColorName(hex)).trim() || getPoeticColorName(hex);
    return { hex, name, intro: colorIntro(hex, name) };
  });

  const title =
    (item?.aesthetic || snap?.aesthetic || '').trim() ||
    colors[0]?.name ||
    '未命名色卡';

  const overview = (cd.overview || item?.prompt || snap?.prompt || '').trim();
  const designLogic = (item?.designLogic || snap?.designLogic || snap?.design_logic || '').trim();

  let intro = firstSentences(overview, 2);
  if (!intro) {
    const nameList = colors.map((c) => c.name).join('、');
    intro = `以${nameList}等 ${colors.length} 色构成，色相相互衬托，可作日常创作的配色起点。`;
  }

  const hexes = colors.map((c) => c.hex);
  const keywordTags = (item?.keywords || snap?.keywords || [])
    .map((k) => String(k).trim())
    .filter((k) => k && isDisplayableSeaTag(k));
  const engineTags = generatePaletteTags(hexes, snap?.paletteMeta || {});
  const tagSeen = new Set();
  const tags = [];
  for (const t of [...keywordTags, ...engineTags]) {
    if (tagSeen.has(t)) continue;
    tagSeen.add(t);
    tags.push(t);
    if (tags.length >= 10) break;
  }

  return {
    id: item.id,
    title,
    intro,
    colors,
    meaning: deriveMeaning(tags, overview, designLogic),
    psychology: derivePsychology(tags),
    usage: deriveUsage(tags),
    tags,
    likeCount: resolvePaletteLikeCount(item, opts.exploreFeed),
    inVault: true,
  };
}

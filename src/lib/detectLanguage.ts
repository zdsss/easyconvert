export type Language = 'zh' | 'en' | 'ja' | 'unknown';

export function detectLanguage(text: string): Language {
  if (!text || text.trim().length === 0) return 'unknown';

  const total = text.length;

  // Count CJK unified ideographs (Chinese/Japanese kanji)
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // Count hiragana + katakana (Japanese-specific)
  const kanaCount = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  // Count ASCII letters (English)
  const asciiCount = (text.match(/[a-zA-Z]/g) || []).length;

  const cjkRatio = cjkCount / total;
  const kanaRatio = kanaCount / total;

  // Japanese: has kana characters
  if (kanaRatio > 0.02 || (kanaCount > 5 && cjkRatio > 0.05)) return 'ja';
  // Chinese: significant CJK without kana
  if (cjkRatio > 0.1) return 'zh';
  // English: mostly ASCII letters
  if (asciiCount / total > 0.3) return 'en';
  // Fallback: if any CJK present
  if (cjkCount > 10) return 'zh';

  return 'unknown';
}

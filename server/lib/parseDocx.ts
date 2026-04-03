import mammoth from 'mammoth';

/**
 * 服务端 DOCX 文本提取（Buffer 输入替代 File）
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value.trim().length > 0) {
      return result.value;
    }
    throw new Error('mammoth 提取内容为空');
  } catch {
    // mammoth 失败，尝试降级提取
    try {
      return extractTextFallback(buffer);
    } catch (fallbackError) {
      throw new Error(`DOCX文件格式错误或已损坏: ${(fallbackError as Error).message}`);
    }
  }
}

function extractTextFallback(buffer: Buffer): string {
  const bytes = new Uint8Array(buffer);
  let text = '';

  for (let i = 0; i < bytes.length - 1; i++) {
    const b = bytes[i];
    const b2 = bytes[i + 1];

    // 可打印 ASCII
    if (b >= 0x20 && b < 0x7f) {
      text += String.fromCharCode(b);
    }

    // UTF-16LE 中文字符
    if (b2 >= 0x4e && b2 <= 0x9f) {
      const codePoint = b | (b2 << 8);
      if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
        text += String.fromCharCode(codePoint);
        i++;
      }
    }
  }

  text = text.replace(/\s{3,}/g, '\n').trim();

  if (text.length < 50) {
    throw new Error('文件内容无法提取，可能是加密或严重损坏的文件');
  }

  return text;
}

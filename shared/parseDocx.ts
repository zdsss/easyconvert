import mammoth from 'mammoth';

/**
 * 降级提取：直接从原始字节中提取可见文本
 * 适用于伪装成 .docx 的旧版 .doc 文件，或 mammoth 无法处理的格式
 */
export function extractTextFallback(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let text = '';

  for (let i = 0; i < bytes.length - 1; i++) {
    const b = bytes[i];
    const b2 = bytes[i + 1];

    // 可打印 ASCII
    if (b >= 0x20 && b < 0x7f) {
      text += String.fromCharCode(b);
    }

    // UTF-16LE 中文字符（常见于 .doc 内部编码）
    if (b2 >= 0x4e && b2 <= 0x9f) {
      const codePoint = b | (b2 << 8);
      if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
        text += String.fromCharCode(codePoint);
        i++;
      }
    }
  }

  // 清理：去掉连续空白，保留有意义的内容
  text = text.replace(/\s{3,}/g, '\n').trim();

  if (text.length < 50) {
    throw new Error('文件内容无法提取，可能是加密或严重损坏的文件');
  }

  return text;
}

/**
 * 从 ArrayBuffer 解析 DOCX 文本，mammoth 失败时降级到原始字节提取
 */
export async function parseDocxFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (result.value.trim().length > 0) {
      return result.value;
    }
    throw new Error('mammoth 提取内容为空');
  } catch {
    try {
      return extractTextFallback(arrayBuffer);
    } catch (fallbackError) {
      throw new Error(`DOCX文件格式错误或已损坏: ${(fallbackError as Error).message}`);
    }
  }
}

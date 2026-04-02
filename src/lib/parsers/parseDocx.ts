import mammoth from 'mammoth';

async function extractTextFallback(file: File): Promise<string> {
  // 降级：直接读取文件的可见文本内容（适用于伪装成 .docx 的旧版 .doc 文件）
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 提取所有可打印的 ASCII 和中文字符
  let text = '';
  for (let i = 0; i < bytes.length - 1; i++) {
    const b = bytes[i];
    const b2 = bytes[i + 1];

    // 中文 UTF-16LE（.doc 内部编码）
    if (b >= 0x4e && b <= 0x9f && b2 === 0x00) {
      // skip, handled below
    }

    // 可打印 ASCII
    if (b >= 0x20 && b < 0x7f) {
      text += String.fromCharCode(b);
    }

    // UTF-16LE 中文字符（常见于 .doc 内部）
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

export async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (result.value.trim().length > 0) {
      return result.value;
    }
    throw new Error('mammoth 提取内容为空');
  } catch {
    // mammoth 失败，尝试降级提取
    try {
      return await extractTextFallback(file);
    } catch (fallbackError) {
      throw new Error(`DOCX文件格式错误或已损坏: ${(fallbackError as Error).message}`);
    }
  }
}

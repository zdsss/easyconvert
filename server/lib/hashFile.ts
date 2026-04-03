import { createHash } from 'crypto';

/**
 * 计算 Buffer 的 SHA-256 哈希值（Node.js 替代 crypto.subtle）
 */
export function hashFile(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

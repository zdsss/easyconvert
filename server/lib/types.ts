/**
 * 服务端文件输入接口 — 替代浏览器 File API
 */
export interface ServerFileInput {
  buffer: Buffer;
  name: string;
  size: number;
  mimeType: string;
}

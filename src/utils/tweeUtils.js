// 生成唯一ID
export const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : (Math.random() * 16 | 0 & 0x3 | 0x8)).toString(16));

// 确保名称唯一（例如：新片段, 新片段 1, 新片段 2...）
export const unusedName = (name, existing) => {
  if (!existing.includes(name)) return name;
  let suffix = 1;
  while (existing.includes(`${name} ${suffix}`)) { suffix++; }
  return `${name} ${suffix}`;
};

// Twee 标题转义
export const escapeHeader = (v = '') => v.replace(/\\/g, '\\\\').replace(/([[\]{}])/g, '\\$1');
// Twee 内容转义 (防止正文里的 :: 干扰解析)
export const escapeText = (v = '') => v.replace(/^::/gm, '\\::');
// Twee 标题反转义
export const unescapeHeader = (v = '') => v.replace(/\\([[\]{}])/g, '$1').replace(/\\\\/g, '\\');
// Twee 内容反转义
export const unescapeText = (v = '') => v.replace(/^\\:/gm, ':');

// 正则：匹配标题、标签和可能的元数据
export const HEADER_REGEX = /^([^\[\{]+)(?:\s*\[(.*?)\])?(?:\s*\{.*?\})?/;

// 解析标题行
export const parseHeader = (headerLine) => {
  const match = headerLine.match(HEADER_REGEX);
  const name = match ? match[1].trim() : headerLine.trim();
  const tags = match?.[2] ? match[2].split(/\s+/).filter(t => t).map(unescapeHeader) : [];
  return { name: unescapeHeader(name), tags };
};

// 构建标题行
export const buildHeader = (name, tags = []) => {
  const tagStr = tags.length ? ` [${tags.map(escapeHeader).join(' ')}]` : '';
  return `:: ${escapeHeader(name)}${tagStr}`;
};

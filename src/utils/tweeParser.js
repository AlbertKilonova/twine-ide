import { unescapeText, unescapeHeader } from './tweeUtils';

export function parseTwee(text) {
  const sections = text.split(/^::/m);
  const meta = { rawData: {} };
  const items = [];

  sections.forEach(sec => {
    const lines = sec.split(/\r?\n/);
    if (lines.length === 0) return;

    const headerLine = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    if (!headerLine) return;

    if (headerLine === 'StoryTitle') {
      meta.title = unescapeText(content);
    } else if (headerLine === 'StoryData') {
      try {
        meta.rawData = JSON.parse(content);
        meta.ifid = meta.rawData.ifid;
        meta.start = meta.rawData.start;
      } catch (e) {
        console.warn("StoryData解析失败");
      }
    } else {
      const match = headerLine.match(/^([^\[\{]+)(?:\s*\[(.*?)\])?(?:\s*\{.*?\})?/);
      const name = match ? match[1].trim() : headerLine;
      const tags = (match && match[2]) ? match[2].split(/\s+/).filter(t => t).map(unescapeHeader) : [];
      items.push({
        name: unescapeHeader(name),
        tags,
        content: ":: " + headerLine + "\n" + unescapeText(content)
      });
    }
  });

  return { meta, items };
}

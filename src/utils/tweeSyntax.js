import { StreamLanguage, LanguageSupport } from "@codemirror/language";

function createTweeLanguage(format) {
  return StreamLanguage.define({
    name: "twee",
    token(stream) {
      // 这里是咱们之前千辛万苦调好的基础规则，人家都给你好好保留着呢
      if (stream.sol() && stream.match(/^::/)) {
        let fullLine = stream.string.slice(stream.pos);
        let tagIndex = fullLine.search(/\s+\[[^\]\n]+\]$/);
        if (tagIndex !== -1) {
          stream.match(fullLine.slice(0, tagIndex));
          return "header";
        } else {
          stream.skipToEnd();
          return "header";
        }
      }

      if (stream.match(/^(\s+)?\[[^\]\n]+\]$/) && stream.string.startsWith('::')) {
         return "attributeName"; 
      }

      if (stream.match(/^\[img\[[^\]\n]*\]\]/)) return "string";
      if (stream.match(/^\[\[([^\]\n]|\][^\]\n])*\]\]/)) return "link";
      if (stream.match(/^@\{[^}\n]+\}/)) return "string";

      // 接下来是人家专门为你加的格式判断！
      if (format === 'sugarcube') {
        // SugarCube 的宏语法，比如 <<set $gold to 100>>
        if (stream.match(/^<<[^>]+>>/)) {
          return "keyword";
        }
      } else if (format === 'harlowe') {
        // Harlowe 的宏语法，比如 (set: $gold to 100)
        if (stream.match(/^\([^:)]+:/)) {
          return "keyword";
        }
      } else if (format === 'snowman') {
        // Snowman 的模板语法，比如 <% print($gold) %>
        if (stream.match(/^<%[^>]+%>/)) {
          return "keyword";
        }
      }
      
      if (stream.match(/^<\/?/) || stream.match(/^>/)) {
        return null; 
      }

      // 剩下的基础规则
      const start = stream.start;
      const charBefore = start > 0 ? stream.string.charAt(start - 1) : "";
      const twoBefore = start > 1 ? stream.string.slice(start - 2, start) : "";
      if (charBefore === "<" || twoBefore === "</") {
        if (stream.match(/^[a-zA-Z0-9]+/)) {
          return "tagName"; // 只有这里会亮亮哒！
        }
      }

      const char = stream.peek();
      if (char === "$" || char === "_") {
        const pos = stream.pos;
        const prevChar = pos > 0 ? stream.string[pos - 1] : "";
        const isBoundary = stream.sol() || /[^a-zA-Z0-9_\uFF01-\uFF5E\u4E00-\u9FA5]/.test(prevChar);
        if (isBoundary && stream.match(/^[$_][a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+|\[[^\]\n]+\])*(?!\w)/)) {
          return "variableName";
        }
      }

      if (stream.match(/^\s+[a-zA-Z-]+(?==)/)) return "attributeName";
      if (stream.match(/^="[^"]*"/)) return "attributeValue";

      if (stream.eatSpace()) return null;
      stream.next();
      return null;
    }
  });
}

// 导出的时候加上参数，默认给你用 sugarcube 哦
export function twee(format = "twee") {
  return new LanguageSupport(createTweeLanguage(format));
}

import { StreamLanguage, LanguageSupport } from "@codemirror/language";

export const tweeLanguage = StreamLanguage.define({
  name: "twee",
  token(stream) {
    // 1. 优先吃掉空格，防止空格和后面的词粘连喵
    if (stream.eatSpace()) return null;

// 1. 标题行 + 标签的精准连招喵！
    if (stream.sol() && stream.match(/^::/)) {
      // 这一行剩下的所有文字
      let fullLine = stream.string.slice(stream.pos);
      // 寻找标签的位置：必须是 [ 前面有空格，且后面直到行尾是 ]
      let tagIndex = fullLine.search(/\s+\[[^\]\n]+\]$/);

      if (tagIndex !== -1) {
        // 如果找到了位于行尾的标签，我们只吃掉标题那一部分波
        stream.match(fullLine.slice(0, tagIndex));
        return "header";
      } else {
        // 没找到标签，整行都是标题喵
        stream.skipToEnd();
        return "header";
      }
    }

    // 2. 专门捕获紧跟在标题后面的标签喵！
    // 逻辑：如果当前位置前面是标题（::开头且没到行尾），且现在遇到了 [
    if (stream.match(/^(\s+)?\[[^\]\n]+\]$/) && stream.string.startsWith('::')) {
       return "attributeName"; 
    }
        
    // 3. 图片 [img[...]]
    if (stream.match(/^\[img\[[^\]\n]*\]\]/)) return "string";

    // 4. 增强版链接 [[...]]
    if (stream.match(/^\[\[([^\]\n]|\][^\]\n])*\]\]/)) return "link";

    // 5. 静态资源 @{...}
    if (stream.match(/^@\{[^}\n]+\}/)) return "string";

    // 6. 尖括号隐身术喵！（剥离 < 和 >）
    // 如果碰到了 <, </ 或者 >，阿波直接把它吃掉，然后返回 null（不给颜色）
    if (stream.match(/^<\/?/) || stream.match(/^>/)) {
      return null; 
    }

    // 7. 纯正的标签名上色波！
    // 逻辑：现在我们处在一个单词的开头。我们要回头看一眼，前一个字符是不是 < 或 /
    const start = stream.start;
    const charBefore = start > 0 ? stream.string.charAt(start - 1) : "";
    const twoBefore = start > 1 ? stream.string.slice(start - 2, start) : "";
    
    if (charBefore === "<" || twoBefore === "</") {
      // 果然！我是紧跟在括号后面的标签名！
      if (stream.match(/^[a-zA-Z0-9]+/)) {
        return "tagName"; // 只有这里会亮喵！
      }
    }

    // 8. 属性名和属性值
    if (stream.match(/^[a-zA-Z-]+(?==)/)) return "attributeName";
    if (stream.match(/^="[^"]*"/)) return "attributeValue";

    // 9. 变量识别 (保留全角字符防护喵)
    const char = stream.peek();
    if (char === "$" || char === "_") {
      const pos = stream.pos;
      const prevChar = pos > 0 ? stream.string[pos - 1] : "";
      const isBoundary = stream.sol() || /[^a-zA-Z0-9_\uFF01-\uFF5E\u4E00-\u9FA5]/.test(prevChar);
      if (isBoundary && stream.match(/^[$_][a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+|\[[^\]\n]+\])*(?!\w)/)) {
        return "variableName";
      }
    }

    // --- 强制移动保底喵 ---
    stream.next();
    return null;
  }
});

export function twee() {
  return new LanguageSupport(tweeLanguage);
}

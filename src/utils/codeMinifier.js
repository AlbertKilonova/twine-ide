import { minify } from 'terser';

export async function minifyCode(code) {
  if (!code || !code.trim()) return '';

  try {
    const result = await minify(code, {
      compress: { dead_code: true, drop_console: false, passes: 2 },
      format: { comments: false, beautify: false },
      mangle: false
    });
    return result.code || code;
  } catch (e) {
    console.warn('Terser 压缩失败:', e);
    return code;
  }
}

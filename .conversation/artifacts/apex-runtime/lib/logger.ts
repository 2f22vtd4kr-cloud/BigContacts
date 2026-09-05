export const logger = {
  info: (...a: any[]) => console.error("[info]", ...a),
  debug: (...a: any[]) => {},
  warn: (...a: any[]) => console.error("[warn]", ...a),
  error: (...a: any[]) => console.error("[error]", ...a),
};

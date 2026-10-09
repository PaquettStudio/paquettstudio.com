const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ESCAPES[c]);
}

function lookup(ctx, path) {
  const value = path.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), ctx);
  if (value === undefined || value === null) throw new Error(`Missing template key: ${path}`);
  return value;
}

// {{ a.b }} inserts an escaped value, {{{ a.b }}} inserts it raw.
export function renderTemplate(tpl, ctx) {
  return tpl.replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}|\{\{\s*([\w.-]+)\s*\}\}/g, (_, raw, escaped) =>
    raw ? String(lookup(ctx, raw)) : escapeHtml(lookup(ctx, escaped)));
}

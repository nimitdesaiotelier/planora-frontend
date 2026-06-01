import fs from 'fs';

let css = fs.readFileSync('src/App.css', 'utf8');

const lightTheme = `
[data-theme='light'] {
  --bg: #f8fafc;
  --bg2: #ffffff;
  --bg3: #f1f5f9;
  --border: #cbd5e1;
  --accent: #4f46e5;
  --accent2: #4338ca;
  --accent-glow: rgba(79, 70, 229, 0.2);
  --green: #059669;
  --red: #dc2626;
  --yellow: #d97706;
  --text: #0f172a;
  --text2: #334155;
  --text3: #475569;
  --hover-bg: rgba(0, 0, 0, 0.04);
  --modal-overlay: rgba(255, 255, 255, 0.5);
  --nested-child-bg: rgba(0, 0, 0, 0.03);
  --border-alpha: rgba(203, 213, 225, 0.6);
  --shadow-color: rgba(0, 0, 0, 0.08);
  --glass-bg: rgba(255, 255, 255, 0.85);
}

:root {
  --hover-bg: rgba(255, 255, 255, 0.02);
  --modal-overlay: rgba(0, 0, 0, 0.7);
  --nested-child-bg: rgba(255, 255, 255, 0.015);
  --border-alpha: rgba(42, 49, 72, 0.5);
  --shadow-color: rgba(0, 0, 0, 0.22);
  --glass-bg: rgba(22, 27, 39, 0.85);
`;

css = css.replace(/:root\s*\{/, lightTheme + '\n');

css = css.replace(/rgba\(255,\s*255,\s*255,\s*0\.02\)/g, 'var(--hover-bg)');
css = css.replace(/rgba\(255,\s*255,\s*255,\s*0\.015\)/g, 'var(--nested-child-bg)');
css = css.replace(/rgba\(42,\s*49,\s*72,\s*0\.5\)/g, 'var(--border-alpha)');
css = css.replace(/rgba\(0,\s*0,\s*0,\s*0\.7\)/g, 'var(--modal-overlay)');
css = css.replace(/rgba\(0,\s*0,\s*0,\s*0\.22\)/g, 'var(--shadow-color)');

fs.writeFileSync('src/App.css', css);
console.log('App.css updated successfully.');

const fs = require('fs');

let css = fs.readFileSync('src/App.css', 'utf8');

const startIndex = css.indexOf('[data-theme=\'light\']');
const endIndex = css.indexOf('}', css.indexOf('--radius-lg:')) + 1;
const oldTheme = css.substring(startIndex, endIndex);

const correctTheme = `:root {
  --bg: #0f1117;
  --bg2: #161b27;
  --bg3: #1e2535;
  --border: #2a3148;
  --accent: #6c63ff;
  --accent2: #8b83ff;
  --accent-glow: rgba(108, 99, 255, 0.25);
  --green: #22c55e;
  --red: #ef4444;
  --yellow: #f59e0b;
  --text: #e2e8f0;
  --text2: #94a3b8;
  --text3: #64748b;
  --radius: 10px;
  --radius-lg: 16px;
  --hover-bg: rgba(255, 255, 255, 0.02);
  --modal-overlay: rgba(0, 0, 0, 0.7);
  --nested-child-bg: rgba(255, 255, 255, 0.015);
  --border-alpha: rgba(42, 49, 72, 0.5);
  --shadow-color: rgba(0, 0, 0, 0.22);
  --glass-bg: rgba(22, 27, 39, 0.85);
}

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
  --modal-overlay: rgba(255, 255, 255, 0.1);
  --nested-child-bg: rgba(0, 0, 0, 0.03);
  --border-alpha: rgba(203, 213, 225, 0.6);
  --shadow-color: rgba(0, 0, 0, 0.08);
  --glass-bg: rgba(255, 255, 255, 0.85);
}`;

css = css.replace(oldTheme, correctTheme);
fs.writeFileSync('src/App.css', css);
console.log('Fixed CSS theme variables order and duplicate values.');

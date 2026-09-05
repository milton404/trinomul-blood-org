const fs = require('fs');
const files = [
  'components/requests/RequestCard.tsx',
  'components/requests/MyRequests.tsx',
  'app/[locale]/(main)/admin/blood-requests/page.tsx',
  'app/[locale]/(main)/requests/page.tsx',
];
const re = /\bt(?:Map)?\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const keys = new Set();
  let m;
  while ((m = re.exec(s))) keys.add(m[1]);
  console.log('=== ' + f + ' ===');
  console.log([...keys].join('\n'));
}

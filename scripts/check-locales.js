const fs = require('fs');
const path = require('path');

function flatten(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flatten(val, newKey));
    } else {
      acc[newKey] = true;
    }
    return acc;
  }, {});
}

const enPath = path.join(__dirname, '..', 'src', 'locales', 'en', 'translation.json');
const esPath = path.join(__dirname, '..', 'src', 'locales', 'es', 'translation.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

const enKeys = Object.keys(flatten(en));
const esKeys = Object.keys(flatten(es));

const missingInEs = enKeys.filter(k => !esKeys.includes(k));
const extraInEs = esKeys.filter(k => !enKeys.includes(k));

if (missingInEs.length === 0 && extraInEs.length === 0) {
  console.log('Locales match ✅');
  process.exit(0);
}

if (missingInEs.length) {
  console.log('Keys missing in es:', missingInEs.join('\n'));
}
if (extraInEs.length) {
  console.log('Extra keys in es:', extraInEs.join('\n'));
}

process.exit(1);

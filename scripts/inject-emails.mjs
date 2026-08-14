import fs from 'fs';

const conf = fs.readFileSync('scripts/out-confirmacion.html', 'utf8');
const rec = fs.readFileSync('scripts/out-recordatorio.html', 'utf8');
const page = fs.readFileSync('scripts/preview-emails.html', 'utf8');

// Guard against a literal "</script" inside the embedded HTML prematurely
// closing this script block.
const esc = (s) => JSON.stringify(s).replace(/<\/script/gi, '<\\/script');

const script = `
<script>
  document.getElementById('frame-confirmacion').srcdoc = ${esc(conf)};
  document.getElementById('frame-recordatorio').srcdoc = ${esc(rec)};
</script>
`;

const out = page + script;
fs.writeFileSync('scripts/preview-emails.html', out);
console.log('injected', conf.length, rec.length);

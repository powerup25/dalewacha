/* Compartido entre la app (index.html) y la página creadora (crear.html). */

const $ = id => document.getElementById(id);
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pl = (n, uno, varios) => n === 1 ? uno : varios;
const lista = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
const minus = t => t.charAt(0).toLowerCase() + t.slice(1);

const EMOJIS = ['🐳','🐷','🦦','🐸','🦊','🐼','🐨','🐯','🦁','🐮','🐵','🐙','🦄','🐝','🦋','🐢','🦩','🐧','🐰','🐻','🦥','🐬','🌵','🌻','🍓','🍑','🥑','🍋','🔥','⚡','🌈','⭐','💪','👑','🍷','🧉'];
const TEMAS = [
  ['agua', 'Verde agua', '#A8E4DA'], ['lila', 'Lila', '#CDBDFB'], ['rosa', 'Rosa', '#F6B8CB'],
  ['durazno', 'Durazno', '#FFCDA3'], ['pistacho', 'Pistacho', '#CBE6A6'],
];

/* ── API: POST sin headers para evitar el preflight de CORS con Apps Script ── */
async function llamar(accion, token, ...args){
  if (!window.PACTO || !PACTO.API || PACTO.API.includes('PEGAR_ACA')) throw new Error('Falta configurar la URL de la API en config.js.');
  let r;
  try {
    r = await fetch(PACTO.API, { method: 'POST', body: JSON.stringify({ accion, token, args }) });
  } catch(e){ throw new Error('No hay conexión. Revisá internet y probá de nuevo.'); }
  let j;
  try { j = await r.json(); } catch(e){ throw new Error('El servidor respondió algo raro. Probá de nuevo en un rato.'); }
  if (!j.ok) throw new Error(j.error || 'Algo falló.');
  return j.data;
}

/* ── Tema y apariencia ── */
function aplicarTema(tema, apariencia){
  const r = document.documentElement;
  r.dataset.tema = tema || 'agua';
  if (apariencia === 'light' || apariencia === 'dark') r.dataset.theme = apariencia; else delete r.dataset.theme;
}

/* ── Fechas ── */
const DIAS = ['dom','lun','mar','mié','jue','vie','sáb'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const aFecha = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const aKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const sumar = (k, n) => { const d = aFecha(k); d.setDate(d.getDate() + n); return aKey(d); };
const corta = k => { const d = aFecha(k); return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`; };
const larga = k => { const d = aFecha(k); return `${d.getDate()} de ${MESES[d.getMonth()]}`; };

/* ── Avisos ── */
let tToast;
function toast(t){
  const el = $('toast'); if (!el) return;
  el.textContent = t; el.classList.add('ver');
  clearTimeout(tToast); tToast = setTimeout(() => el.classList.remove('ver'), 3200);
}

/* ── Links personales ── */
function urlPersonal(token){
  const base = location.href.split('?')[0].split('#')[0].replace(/crear\.html$/, '').replace(/index\.html$/, '');
  return base + '?t=' + token;
}
async function copiar(texto){
  try { await navigator.clipboard.writeText(texto); toast('Link copiado ✓'); }
  catch(e){ prompt('Copiá el link:', texto); }
}
async function compartir(nombre, url, grupo){
  const texto = `${nombre}, este es tu link para ${grupo}. Guardalo, es solo tuyo:`;
  if (navigator.share){
    try { await navigator.share({ title: grupo, text: texto, url }); return; } catch(e){ if (e && e.name === 'AbortError') return; }
  }
  copiar(url);
}

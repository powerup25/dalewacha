/* Página creadora: quien tiene el link (con la clave) arma un grupo y recibe los links de cada persona. */

const vista = $('vista');
const MAX = 12;
let clave = '', cantidad = 3, miEmoji = EMOJIS[0], nombresOtras = [];

(function iniciar(){
  const params = new URLSearchParams(location.search);
  try { clave = params.get('k') || localStorage.getItem('pacto-clave-crear') || ''; } catch(e){ clave = params.get('k') || ''; }
  if (params.get('k')) { try { localStorage.setItem('pacto-clave-crear', clave); } catch(e){} history.replaceState(null, '', location.pathname); }
  formulario();
})();

function formulario(){
  vista.innerHTML = `
    <h1 class="chico">Armá un grupo</h1>
    <p class="sub mt">Elegí cuántas son y cómo quieren jugar. Al final te doy un link para cada una.</p>
    <form id="f" novalidate>
      ${clave ? '' : `<label>Clave para crear grupos<input type="password" name="clave" autocomplete="off"></label>`}
      <label>Nombre del grupo<input type="text" name="nombre" maxlength="40" placeholder="Ej: Dale wacha activá"></label>

      <h2>Vos</h2>
      <label>Tu apodo<input type="text" name="yo" maxlength="24" placeholder="Ej: Rola"></label>
      <p class="leyenda" style="margin-top:14px">Tu emoji</p>
      <div class="emojis" id="mis-emojis">${EMOJIS.map(e => `<label class="chip"><input type="radio" name="emoji" value="${e}"${e === miEmoji ? ' checked' : ''}><span>${e}</span></label>`).join('')}</div>
      <p class="ayuda">Vas a ser una más del grupo y además la admin.</p>

      <h2>Las demás</h2>
      <label>¿Cuántas son en total, con vos?
        <select name="cantidad" id="cantidad">${Array.from({ length: MAX - 1 }, (_, i) => i + 2).map(n => `<option value="${n}"${n === cantidad ? ' selected' : ''}>${n}</option>`).join('')}</select>
      </label>
      <div id="otras"></div>
      <p class="ayuda">Si no sabés el nombre, dejalo vacío: cada una lo cambia después desde su perfil.</p>

      <h2>Cómo juegan</h2>
      <fieldset>
        <legend class="leyenda">Modo</legend>
        <div class="chips">
          <label class="chip"><input type="radio" name="modo" value="prendas" checked><span>🎲 Con prendas</span></label>
          <label class="chip"><input type="radio" name="modo" value="light"><span>🌿 Light</span></label>
        </div>
        <p class="ayuda">Light: sin prendas, pero con estrellas y premios. Lo podés cambiar cuando quieras.</p>
      </fieldset>
      <div class="fila">
        <label>Actividades por semana<select name="meta">${[1,2,3,4,5,6,7].map(n => `<option${n === 3 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Minutos mínimos<input type="number" name="minutos" min="5" max="180" step="5" value="30" inputmode="numeric"></label>
      </div>
      <p class="error" id="err" role="alert"></p>
      <button class="btn" type="submit" id="btn">Crear grupo</button>
    </form>`;
  pintarOtras();
  $('cantidad').addEventListener('change', e => { guardarNombres(); cantidad = Number(e.target.value); pintarOtras(); });
  $('mis-emojis').addEventListener('change', e => { miEmoji = e.target.value; });
  $('f').addEventListener('submit', crear);
}

function guardarNombres(){
  nombresOtras = [...vista.querySelectorAll('input[name="otra"]')].map(i => i.value);
}
function pintarOtras(){
  const n = cantidad - 1;
  $('otras').innerHTML = Array.from({ length: n }, (_, i) =>
    `<label>Persona ${i + 2}<input type="text" name="otra" maxlength="24" value="${E(nombresOtras[i] || '')}" placeholder="Persona ${i + 2}"></label>`).join('');
}

async function crear(e){
  e.preventDefault();
  const f = new FormData($('f'));
  if (f.get('clave') != null) clave = String(f.get('clave')).trim();
  const err = $('err'); err.textContent = '';
  if (!clave) { err.textContent = 'Falta la clave para crear grupos.'; return; }
  const btn = $('btn'); btn.disabled = true; btn.textContent = 'Creando…';
  guardarNombres();
  try {
    const r = await llamar('crearGrupo', '', {
      clave, nombre: f.get('nombre'), meta: f.get('meta'), minutos: f.get('minutos'), modo: f.get('modo'),
      yo: { nombre: f.get('yo'), emoji: f.get('emoji') }, otras: nombresOtras.slice(0, cantidad - 1),
    });
    try { localStorage.setItem('pacto-clave-crear', clave); } catch(x){}
    resultado(r);
  } catch(x){
    err.textContent = x.message;
    if (/clave/i.test(x.message)) { clave = ''; try { localStorage.removeItem('pacto-clave-crear'); } catch(y){} }
    btn.disabled = false; btn.textContent = 'Crear grupo';
  }
}

function resultado(r){
  const mio = r.links.find(l => l.admin);
  vista.innerHTML = `
    <h1 class="chico">¡Listo! 🎉</h1>
    <p class="sub mt">Creaste <b>${E(r.nombre)}</b>. Mandale a cada una su link: es personal y funciona como su llave, así que no lo compartan entre ustedes.</p>
    <a class="btn" href="${E(urlPersonal(mio.token))}">Abrir mi link (soy admin)</a>
    <h2>Links del grupo</h2>
    <div>${r.links.map(l => `
      <div class="link-caja">
        <span class="quien-l"><span class="avatar s">${E(l.emoji)}</span>${E(l.nombre)}${l.admin ? ' <span class="tag">admin</span>' : ''}</span>
        <button class="btn chico" data-compartir="${E(l.token)}" data-nombre="${E(l.nombre)}">Compartir</button>
        <button class="btn chico sec" data-copiar="${E(l.token)}">Copiar</button>
      </div>`).join('')}</div>
    <p class="sub mt">Si pierden estos links, desde tu link de admin los podés ver de nuevo o regenerar.</p>
    <button class="link centro" id="otro">Crear otro grupo</button>`;
  vista.onclick = ev => {
    const c = ev.target.closest('[data-compartir]');
    if (c) return compartir(c.dataset.nombre, urlPersonal(c.dataset.compartir), r.nombre);
    const k = ev.target.closest('[data-copiar]');
    if (k) return copiar(urlPersonal(k.dataset.copiar));
    if (ev.target.id === 'otro') { vista.onclick = null; nombresOtras = []; formulario(); window.scrollTo(0, 0); }
  };
  window.scrollTo(0, 0);
}

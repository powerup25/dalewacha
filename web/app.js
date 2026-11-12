/* App de cada persona. Se entra con un link personal: ?t=TOKEN */

let S = null, token = '', tab = 'semana', animar = false, abrir = null, objetivo = null;
const vista = $('vista'), tabs = $('tabs'), dlg = $('dlg'), fAct = $('f-act'), inFoto = $('in-foto'), visor = $('visor'), dlgPerfil = $('perfil');

const api = (accion, ...args) => llamar(accion, token, ...args);
const relativa = k => k === S.hoy ? 'hoy' : k === sumar(S.hoy, -1) ? 'ayer' : corta(k);
const tipo = id => S.tipos.find(t => t.id === id) || { label: 'Otro', emoji: '✨' };
const miembro = id => S.miembros.find(m => m.id === id) || S.exMiembros.find(m => m.id === id) || { nombre: 'Alguien', emoji: '🙂' };
const nombrePrenda = p => p.modo === 'veces' ? `${p.cantidad} ${minus(p.texto)}` : p.texto;
const detallePrenda = p => p.modo === 'veces' ? `Con foto de prueba, ${S.plazoFoto} días de plazo`
  : p.modo === 'juntada' ? 'Se cumple en la próxima actividad grupal'
  : `${p.cantidad} ${pl(p.cantidad, 'día', 'días')} seguidos, con check-in`;
const conPrendas = () => S.grupo.prendas;

/* ───── Carga ───── */
async function cargar(){
  try {
    S = await api('estado');
    aplicarTema(S.perfil.tema, S.perfil.apariencia);
    try { localStorage.setItem('pacto-tema', JSON.stringify({ tema: S.perfil.tema, apariencia: S.perfil.apariencia })); } catch(e){}
    render();
    recuperarBorrador();
  } catch(e){
    if (e.message === 'LINK') return sinLink(true);
    vista.innerHTML = `<h1 class="chico">No cargó</h1><p class="sub mt">${E(e.message)}</p><button class="btn" id="reintentar">Reintentar</button>`;
    $('reintentar').onclick = cargar;
  }
}
async function accion(fn, args, ok){
  try { S = await api(fn, ...args); render(); if (ok) toast(ok); return true; }
  catch(e){ if (e.message === 'LINK') return sinLink(true); toast(e.message); return false; }
}
function sinLink(invalido){
  try { localStorage.removeItem('pacto-token'); } catch(e){}
  tabs.hidden = true; $('yo').hidden = true; document.body.classList.add('sin-tabs');
  vista.innerHTML = invalido
    ? `<h1 class="chico">Este link no funciona</h1><p class="sub mt">Puede que lo hayan cambiado o que ya no estés en el grupo. Pedile tu link nuevo a quien administra el grupo.</p>`
    : `<h1 class="chico">Necesitás tu link</h1><p class="sub mt">Cada persona entra con su propio link. Pedíselo a quien armó el grupo.</p>`;
}

/* ───── Fotos del muro (se cargan de a poco) ───── */
const fotoData = {}, fotoPend = {}, cola = []; let activos = 0, obs;
function pedirFoto(id){
  if (fotoData[id]) return Promise.resolve(fotoData[id]);
  if (!fotoPend[id]) fotoPend[id] = new Promise((res, rej) => { cola.push({ id, res, rej }); bombear(); });
  return fotoPend[id];
}
function bombear(){
  while (activos < 3 && cola.length){
    const t = cola.shift(); activos++;
    api('foto', t.id)
      .then(src => { fotoData[t.id] = src; t.res(src); }, err => { delete fotoPend[t.id]; t.rej(err); })
      .finally(() => { activos--; bombear(); });
  }
}
function mostrarFoto(el){
  const img = el.querySelector('img'), id = el.dataset.foto;
  if (fotoData[id]){ img.src = fotoData[id]; img.classList.add('ok'); return; }
  pedirFoto(id).then(src => { img.onload = () => img.classList.add('ok'); img.src = src; })
    .catch(() => { el.classList.add('fallo'); el.textContent = 'No se pudo cargar la foto'; });
}
function hidratarFotos(){
  if (obs) obs.disconnect();
  const els = [...vista.querySelectorAll('.foto[data-foto]')];
  if (!('IntersectionObserver' in window)) return els.forEach(mostrarFoto);
  obs = new IntersectionObserver(ents => ents.forEach(en => {
    if (en.isIntersecting){ obs.unobserve(en.target); mostrarFoto(en.target); }
  }), { rootMargin: '500px' });
  els.forEach(el => fotoData[el.dataset.foto] ? mostrarFoto(el) : obs.observe(el));
}
const fotoHtml = (id, alt) => `<button class="foto" data-foto="${E(id)}" aria-label="Ver foto grande"><img alt="${E(alt)}"></button>`;

/* ───── Render ───── */
function render(){
  const abiertos = new Set([...vista.querySelectorAll('details[open]')].map(d => d.dataset.id));
  if (abrir) abiertos.add(abrir);
  document.body.classList.remove('sin-tabs');
  $('marca').textContent = S.grupo.nombre;
  document.title = S.grupo.nombre;
  $('yo').hidden = false; $('yo').textContent = `${S.perfil.emoji} ${S.perfil.nombre}`;
  tabs.hidden = false;
  tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  vista.innerHTML = { semana: vSemana, muro: vMuro, grupo: vGrupo, reglas: vReglas }[tab]();
  vista.querySelectorAll('details[data-id]').forEach(d => { if (abiertos.has(d.dataset.id)) d.open = true; });
  hidratarFotos();
  animar = false;
}

function vSemana(){
  const p = S.progreso[S.yo], meta = S.grupo.meta;
  const rots = [-8, 6, -3, 10, -6, 4, -11];
  let sellos = '';
  for (let i = 0; i < Math.max(meta, p.cantidad); i++){
    const s = p.sellos[i];
    sellos += s
      ? `<div class="sello lleno${s.grupal ? ' grupal' : ''}${animar && i === p.cantidad - 1 ? ' nuevo' : ''}" style="--rot:${rots[i % 7]}deg" role="img" aria-label="${E(tipo(s.tipo).label)}${s.grupal ? ', grupal' : ''}">${tipo(s.tipo).emoji}</div>`
      : `<div class="sello" aria-hidden="true"></div>`;
  }
  const dow = (aFecha(S.hoy).getDay() + 6) % 7, quedan = 7 - dow, faltan = Math.max(0, meta - p.cantidad);
  let estado;
  if (p.cantidad > meta) estado = `Semana cumplida, y con ${p.cantidad - meta} de yapa.`;
  else if (p.cantidad === meta) estado = 'Semana cumplida. Lo que sumes ahora es de yapa.';
  else if (p.comodin) estado = 'Usaste el comodín: esta semana cuenta como cumplida.';
  else if (!p.activa) estado = 'Registrá una actividad para volver al juego.';
  else estado = `Te ${pl(faltan, 'falta', 'faltan')} ${faltan} y ${quedan === 1 ? 'queda hoy' : `quedan ${quedan} días`}.`;

  const aviso = !p.activa ? `<p class="aviso">Estás en pausa porque pasó más de una semana sin actividad. ${conPrendas() ? 'Mientras tanto no te tocan prendas ni frenás' : 'Mientras tanto no frenás'} la semana perfecta del grupo. Con una actividad volvés.</p>` : '';
  const racha = p.racha ? `<p class="racha">🔥 Racha de ${p.racha} ${pl(p.racha, 'semana', 'semanas')}</p>` : '';
  const comodin = (conPrendas() && p.activa && p.cantidad < meta && !p.comodin && p.comodinesRestantes > 0)
    ? `<button class="link centro" data-accion="comodin">Usar el comodín del mes</button>` : '';
  const mias = conPrendas() ? S.activas.filter(a => a.quien === S.yo) : [];

  return `${aviso}
    <p class="sub">Semana del ${corta(S.semana)} al ${corta(sumar(S.semana, 6))}</p>
    <h1>${p.cantidad} de ${meta}</h1>
    <div class="sellos">${sellos}</div>
    <p class="estado">${estado}</p>${racha}
    <button class="btn" data-accion="registrar">Registrar actividad</button>${comodin}
    ${mias.length ? `<h2>${pl(mias.length, 'Tu prenda', 'Tus prendas')}</h2>${mias.map(tarjetaPrenda).join('')}` : ''}
    ${teaser()}`;
}

function teaser(){
  const d = S.estrellas.disponibles;
  const premios = S.premios.filter(p => p.activo).sort((a, b) => a.costo - b.costo);
  const listo = premios.filter(p => p.costo <= d).pop(), prox = premios.find(p => p.costo > d);
  let t = `⭐ Tienen ${d} ${pl(d, 'estrella', 'estrellas')}`;
  if (listo) t += `. Ya pueden canjear ${listo.texto}`;
  else if (prox) t += `. Les ${pl(prox.costo - d, 'falta', 'faltan')} ${prox.costo - d} para ${prox.texto}`;
  return `<button class="teaser" data-ir="grupo">${E(t)}.</button>`;
}

function tarjetaPrenda(a){
  if (a.modo === 'juntada'){
    return `<div class="prenda"><p class="prenda-dia">Pendiente desde el ${larga(a.inicio)}</p>
      <p class="prenda-txt">${E(a.texto)}</p><p>Se cumple en la próxima actividad grupal.</p>
      <button class="btn ambar" data-accion="checkin" data-id="${a.id}">La cumplí</button></div>`;
  }
  if (a.modo === 'veces'){
    let cajas = '';
    for (let i = 0; i < a.cantidad; i++) cajas += `<span class="dia${i < a.hechas ? ' ok' : ''}">${i < a.hechas ? '✓' : i + 1}</span>`;
    return `<div class="prenda"><p class="prenda-dia">Llevás ${a.hechas} de ${a.cantidad}. Tenés hasta el ${corta(a.fin)}</p>
      <p class="prenda-txt">${E(nombrePrenda(a))}</p><div class="dias">${cajas}</div>
      <button class="btn ambar" data-accion="prueba" data-id="${a.id}">📸 Subir la foto de prueba</button></div>`;
  }
  let dias = '';
  for (let i = 0; i < a.cantidad; i++){
    const f = sumar(a.inicio, i), hecho = a.checkins.includes(f);
    let cls = 'dia', txt = i + 1, lbl = `Día ${i + 1}`;
    if (hecho){ cls += ' ok'; txt = '✓'; lbl += ', cumplido'; }
    else if (f < S.hoy){ cls += ' mal'; txt = '✗'; lbl += ', sin marcar'; }
    else if (f === S.hoy){ cls += ' hoy'; lbl += ', hoy'; }
    dias += `<span class="${cls}" aria-label="${lbl}">${txt}</span>`;
  }
  return `<div class="prenda"><p class="prenda-dia">Día ${a.dia} de ${a.cantidad}</p>
    <p class="prenda-txt">${E(a.texto)}</p><div class="dias">${dias}</div>
    ${a.hechoHoy ? `<p class="hecho">Hoy ya está marcado ✓</p>` : `<button class="btn ambar" data-accion="checkin" data-id="${a.id}">Cumplí hoy</button>`}</div>`;
}

function vMuro(){
  if (!S.muro.length) return `<h1 class="chico">Muro</h1><p class="vacio mt">Todavía no hay nada. La primera que registre una actividad marca el ritmo.</p>`;
  return `<h1 class="chico">Muro</h1>${S.muro.map(post).join('')}`;
}

function reaccHtml(p){
  return ['💪', '🔥', '👏', '😂'].map(em => {
    const l = p.reacciones[em] || [], mio = l.includes(S.yo);
    const quienes = lista(l.map(id => miembro(id).nombre));
    return `<button data-accion="reaccion" data-id="${p.id}" data-emoji="${em}" aria-pressed="${mio}"${quienes ? ` title="${E(quienes)}"` : ''}>${em}${l.length ? ' ' + l.length : ''}</button>`;
  }).join('') + (p.borrable ? `<button class="link peligro" data-accion="borrar" data-id="${p.id}">Borrar</button>` : '');
}

function post(p){
  let top, cuerpo = '';
  if (p.clase === 'actividad'){
    const parts = p.participantes.map(miembro), t = tipo(p.tipo), grupal = parts.length > 1;
    top = `<span class="avatares">${parts.map(m => `<span class="avatar s">${E(m.emoji)}</span>`).join('')}</span>
      <div><p><b>${E(lista(parts.map(m => m.nombre)))}</b> ${grupal ? 'hicieron' : 'hizo'} ${t.emoji} ${E(minus(t.label))}${grupal ? ' juntas' : ''}, ${p.minutos} min${grupal ? ' <span class="tag oro">Grupal ⭐</span>' : ''}</p>
      <p class="fecha">${relativa(p.fecha)}</p></div>`;
    cuerpo = fotoHtml(p.fotoId, `Foto de ${lista(parts.map(m => m.nombre))}`) + (p.nota ? `<p class="nota">${E(p.nota)}</p>` : '');
  } else if (p.clase === 'prueba'){
    const m = miembro(p.quien);
    top = `<span class="avatar s">${E(m.emoji)}</span>
      <div><p><b>${E(m.nombre)}</b> subió la prueba ${p.n} de ${p.total} <span class="tag ambar">Prenda</span></p>
      <p class="fecha">${E(p.total > 1 ? p.total + ' ' + minus(p.texto) : p.texto)}, ${relativa(p.fecha)}</p></div>`;
    cuerpo = fotoHtml(p.fotoId, `Prueba de ${m.nombre}`);
  } else {
    const m = miembro(p.quien);
    top = `<span class="avatar s">🎉</span>
      <div><p><b>¡Canjearon ${E(p.texto)}!</b></p><p class="fecha">${p.costo} ⭐, lo marcó ${E(m.nombre)} ${relativa(p.fecha)}</p></div>`;
    cuerpo = p.fotoId ? fotoHtml(p.fotoId, `Foto del premio ${p.texto}`)
      : `<button class="btn oro" data-accion="foto-canje" data-id="${p.id}">📸 Subir la foto del premio</button>`;
  }
  return `<article class="post"><div class="post-top">${top}</div>${cuerpo}<div class="reacc">${reaccHtml(p)}</div></article>`;
}

function vGrupo(){
  const e = S.estrellas, R = S.reglaEstrellas, d = e.disponibles, meta = S.grupo.meta;
  const semanaTxt = e.perfectaActual
    ? `<p class="aviso oro mt">¡Esta semana ya es perfecta! Todas las activas cumplieron y suman ${R.SEMANA_PERFECTA} ⭐ extra.</p>`
    : `<p class="aviso mt">Cada una que llegue a ${meta} suma ${R.SEMANA_CUMPLIDA} ⭐, y si llegan todas las activas, ${R.SEMANA_PERFECTA} ⭐ extra.</p>`;
  const filas = S.miembros.map(m => {
    const p = S.progreso[m.id];
    let mini = '';
    for (let i = 0; i < Math.max(meta, p.cantidad); i++){ const s = p.sellos[i]; mini += `<i class="${s ? 'on' + (s.grupal ? ' g' : '') : ''}"></i>`; }
    const prendas = (conPrendas() ? S.activas : []).filter(a => a.quien === m.id).map(a =>
      `<p class="p-prenda">${a.modo === 'dias' ? `Día ${a.dia}/${a.cantidad}: ` : a.modo === 'veces' ? `${a.hechas}/${a.cantidad}: ` : 'Pendiente: '}${E(a.modo === 'veces' ? minus(a.texto) : a.texto)}</p>`).join('');
    return `<div class="persona${p.activa ? '' : ' inactiva'}"><span class="avatar">${E(m.emoji)}</span>
      <div><p class="nombre">${E(m.nombre)}${m.id === S.yo ? ' (vos)' : ''}${p.activa ? '' : ' <span class="tag">en pausa</span>'}</p>
        <div class="mini" role="img" aria-label="${p.cantidad} de ${meta}">${mini}${p.comodin ? '<span class="tag">comodín</span>' : ''}</div>${prendas}</div>
      <span class="racha-n" aria-label="Racha de ${p.racha} semanas">${p.racha ? `🔥 ${p.racha}` : ''}</span></div>`;
  }).join('');
  const premios = S.premios.filter(p => p.activo).sort((a, b) => a.costo - b.costo).map(p => `
    <div class="premio"><div class="premio-top"><b>${E(p.texto)}</b><span>${p.costo} ⭐</span></div>
      <div class="barra-p" role="img" aria-label="${Math.min(Math.max(d, 0), p.costo)} de ${p.costo} estrellas"><i style="width:${Math.min(100, Math.max(0, d) / p.costo * 100)}%"></i></div>
      ${d >= p.costo ? `<button class="btn oro" data-accion="canjear" data-id="${p.id}">Canjear ${E(p.texto)}</button>`
        : `<p class="sub mt">${pl(p.costo - d, 'Falta', 'Faltan')} ${p.costo - d}</p>`}</div>`).join('');
  return `<h1 class="chico">Tienen ${d} ⭐</h1>
    <p class="sub mt">Cómo se suman: ${R.SEMANA_CUMPLIDA} ⭐ por cada una que cumple la semana, ${R.YAPA} ⭐ por cada actividad de yapa, ${R.SEMANA_PERFECTA} ⭐ extra si cumplen todas las activas y ${R.ACTIVIDAD_GRUPAL} ⭐ por cada día con actividad grupal.</p>
    ${semanaTxt}
    <h2>Esta semana</h2><div>${filas}</div>
    <h2>Premios</h2>${premios || '<p class="vacio">No hay premios activos.</p>'}`;
}

/* ───── Reglas (y panel de admin) ───── */
function opciones(pares, actual){ return pares.map(([v, t]) => `<option value="${v}"${String(v) === String(actual) ? ' selected' : ''}>${t}</option>`).join(''); }
const OPC_NIVEL = [['leve', 'Leve'], ['media', 'Media'], ['fuerte', 'Fuerte']];
const OPC_MODO = [['dias', 'Días seguidos, con check-in'], ['veces', 'Veces, con foto de prueba'], ['juntada', 'En la próxima actividad grupal']];

function edPrenda(p){
  return `<details class="ed${p.activa ? '' : ' archivada'}" data-ed="prenda" data-id="${p.id}">
    <summary><span class="txt">${E(nombrePrenda(p))}</span><span class="meta">${E(detallePrenda(p))}${p.activa ? '' : ', archivada'}</span></summary>
    <div class="ed-body">
      <label>Qué hay que hacer<input type="text" data-campo="texto" maxlength="80" value="${E(p.texto)}"></label>
      <label>Cómo se cumple<select data-campo="modo">${opciones(OPC_MODO, p.modo)}</select></label>
      <div class="fila">
        <label>Nivel<select data-campo="nivel">${opciones(OPC_NIVEL, p.nivel)}</select></label>
        <label><span class="lbl-cant">${p.modo === 'veces' ? 'Veces' : 'Días'}</span><input type="number" data-campo="cantidad" min="1" max="14" inputmode="numeric" value="${p.cantidad}"${p.modo === 'juntada' ? ' disabled' : ''}></label>
      </div>
      <label class="check"><input type="checkbox" data-campo="activa"${p.activa ? ' checked' : ''}> Entra en el sorteo</label>
      <p class="guardado" aria-live="polite"></p>
    </div></details>`;
}
function edPremio(p){
  return `<details class="ed${p.activo ? '' : ' archivada'}" data-ed="premio" data-id="${p.id}">
    <summary><span class="txt">${E(p.texto)}</span><span class="meta">${p.costo} ⭐${p.activo ? '' : ', archivado'}</span></summary>
    <div class="ed-body">
      <label>Premio<input type="text" data-campo="texto" maxlength="80" value="${E(p.texto)}"></label>
      <label>Estrellas que cuesta<input type="number" data-campo="costo" min="1" max="100" inputmode="numeric" value="${p.costo}"></label>
      <label class="check"><input type="checkbox" data-campo="activo"${p.activo ? ' checked' : ''}> Disponible para canjear</label>
      <p class="guardado" aria-live="polite"></p>
    </div></details>`;
}

function vAdmin(){
  const g = S.grupo;
  const personas = S.links.map(l => `
    <details class="ed" data-ed="persona" data-id="${l.id}">
      <summary><span class="txt">${E(l.emoji)} ${E(l.nombre)}${l.id === S.yo ? ' (vos)' : ''}${l.admin ? ' <span class="tag">admin</span>' : ''}</span><span class="meta">Tocá para ver su link y opciones</span></summary>
      <div class="ed-body">
        <div class="acciones">
          <button class="btn chico" data-accion="compartir-link" data-id="${l.id}">Compartir su link</button>
          <button class="btn chico sec" data-accion="copiar-link" data-id="${l.id}">Copiar</button>
        </div>
        ${l.id === S.yo ? '' : `<label>Nombre<input type="text" data-persona="nombre" maxlength="24" value="${E(l.nombre)}"></label>
        <label class="check"><input type="checkbox" data-persona="admin"${l.admin ? ' checked' : ''}> También es admin</label>`}
        <div class="acciones">
          <button class="link" data-accion="regenerar" data-id="${l.id}">Generar link nuevo</button>
          ${l.id === S.yo ? '' : `<button class="link peligro" data-accion="quitar" data-id="${l.id}">Quitar del grupo</button>`}
        </div>
        <p class="guardado" aria-live="polite"></p>
      </div></details>`).join('');
  return `<h2>Administrar</h2>
    <div class="ajustes">
      <label>Nombre del grupo<input type="text" data-grupo="nombre" maxlength="40" value="${E(g.nombre)}"></label>
      <div class="fila">
        <label>Actividades por semana<select data-grupo="meta">${opciones([1,2,3,4,5,6,7].map(n => [n, n]), g.meta)}</select></label>
        <label>Minutos mínimos<input type="number" data-grupo="minutos" min="5" max="180" step="5" inputmode="numeric" value="${g.minutos}"></label>
      </div>
      <label class="check mt"><input type="checkbox" data-grupo="prendas"${g.prendas ? ' checked' : ''}> Con prendas</label>
      <p class="ayuda">Apagado es el modo light: sin prendas, con estrellas y premios.</p>
      <label class="check"><input type="checkbox" data-grupo="unaPorDia"${g.unaPorDia ? ' checked' : ''}> Dos actividades el mismo día suman un solo sello</label>
      <label class="check"><input type="checkbox" data-grupo="mails"${g.mails ? ' checked' : ''}> Recordatorios por mail</label>
      <p class="ayuda">Les llegan a quienes cargaron su mail en el perfil.</p>
      <p class="guardado" id="guardado-grupo" aria-live="polite"></p>
    </div>
    <h2>Personas</h2>${personas}
    ${S.links.length < 12 ? `<button class="link" data-accion="agregar-persona">+ Agregar persona</button>` : ''}`;
}

function vReglas(){
  const meta = S.grupo.meta, admin = S.admin;
  const reglas = [
    ['leve', 'Te faltó 1 actividad'],
    meta > 2 ? ['media', `Te faltaron ${meta > 3 ? `entre 2 y ${meta - 1}` : '2'}`] : null,
    ['fuerte', 'No hiciste ninguna'],
  ].filter(Boolean).map(([n, t]) => `<div class="regla"><span>${t}</span><span class="nivel ${n}">${n[0].toUpperCase() + n.slice(1)}</span></div>`).join('');
  const prendas = OPC_NIVEL.map(([n, t]) => {
    const items = S.prendas.filter(p => p.nivel === n);
    return `<h3 class="nivel ${n}">${t}</h3>` + (admin
      ? items.map(edPrenda).join('') + `<button class="link" data-accion="nueva-prenda" data-nivel="${n}">+ Agregar prenda ${minus(t)}</button>`
      : `<ul class="lista">${items.filter(p => p.activa).map(p => `<li>${E(nombrePrenda(p))}<br><span class="sub">${E(detallePrenda(p))}</span></li>`).join('')}</ul>`);
  }).join('');
  const premios = admin
    ? S.premios.map(edPremio).join('') + `<button class="link" data-accion="nuevo-premio">+ Agregar premio</button>`
    : `<ul class="lista">${S.premios.filter(p => p.activo).map(p => `<li>${E(p.texto)} <span class="sub">${p.costo} ⭐</span></li>`).join('')}</ul>`;
  const hist = conPrendas() && S.historial.length ? `<h2>Historial de prendas</h2><ul class="lista">${S.historial.map(a => `
    <li><b>${E(miembro(a.quien).nombre)}</b>: ${E(nombrePrenda(a))}<br>
    <span class="res ${a.estado}">${a.estado === 'cumplida' ? 'Cumplida' : 'Incompleta'}</span> <span class="sub">desde el ${larga(a.inicio)}</span></li>`).join('')}</ul>` : '';

  return `<h1 class="chico">Reglas</h1>
    <p class="sub mt">La meta es ${meta} ${pl(meta, 'actividad', 'actividades')} por semana de al menos ${S.grupo.minutos} minutos, siempre con foto. ${conPrendas()
      ? `Cada lunes se cierra la semana: si no llegaste, se sortea una prenda del nivel que te toque.`
      : 'Están en modo light: no hay prendas, solo estrellas y premios.'} Si pasás más de una semana sin registrar nada, quedás en pausa hasta que vuelvas.${admin ? ' Los cambios se guardan solos.' : ''}</p>
    ${admin ? vAdmin() : ''}
    ${conPrendas() ? `<h2>Prendas</h2>${reglas}${prendas}` : ''}
    <h2>Premios del grupo</h2>${premios}
    ${hist}`;
}

/* ───── Perfil ───── */
function abrirPerfil(){
  const p = S.perfil;
  $('perfil-cuerpo').innerHTML = `
    <label>Tu apodo<input type="text" data-perfil="nombre" maxlength="24" value="${E(p.nombre)}"></label>
    <p class="leyenda" style="margin-top:16px">Tu emoji</p>
    <div class="emojis">${EMOJIS.map(e => `<label class="chip"><input type="radio" name="p-emoji" data-perfil="emoji" value="${e}"${e === p.emoji ? ' checked' : ''}><span>${e}</span></label>`).join('')}</div>
    <label>¿Otro? Pegá cualquier emoji<input type="text" data-perfil="emoji-libre" maxlength="16" value="${EMOJIS.includes(p.emoji) ? '' : E(p.emoji)}" placeholder="🦖"></label>
    <p class="leyenda" style="margin-top:16px">Color</p>
    <div class="temas chips">${TEMAS.map(([v, n, c]) => `<label class="chip"><input type="radio" name="p-tema" data-perfil="tema" value="${v}"${v === p.tema ? ' checked' : ''}><span><i class="muestra" style="background:${c}"></i>${n}</span></label>`).join('')}</div>
    <p class="leyenda" style="margin-top:16px">Apariencia</p>
    <div class="chips">${[['auto', 'Como el celu'], ['light', '☀️ Claro'], ['dark', '🌙 Oscuro']].map(([v, n]) => `<label class="chip"><input type="radio" name="p-ap" data-perfil="apariencia" value="${v}"${v === p.apariencia ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div>
    <label>Mail para recordatorios <span class="ayuda">(opcional)</span><input type="email" data-perfil="email" maxlength="80" value="${E(p.email)}" placeholder="vos@gmail.com"></label>
    <p class="ayuda">Solo llegan si quien administra el grupo los activa.</p>`;
  $('perfil-guardado').textContent = '';
  dlgPerfil.showModal();
}
const tPerfil = {};
function guardarPerfil(campo, valor, ms){
  clearTimeout(tPerfil[campo]);
  tPerfil[campo] = setTimeout(async () => {
    const g = $('perfil-guardado'); g.style.color = ''; g.textContent = 'Guardando…';
    try {
      await api('editarPerfil', { [campo]: valor });
      S.perfil[campo] = valor;
      const yo = S.miembros.find(m => m.id === S.yo); if (yo && (campo === 'nombre' || campo === 'emoji')) yo[campo] = valor;
      $('yo').textContent = `${S.perfil.emoji} ${S.perfil.nombre}`;
      if (campo === 'tema' || campo === 'apariencia'){
        try { localStorage.setItem('pacto-tema', JSON.stringify({ tema: S.perfil.tema, apariencia: S.perfil.apariencia })); } catch(e){}
      }
      g.textContent = 'Guardado ✓';
    } catch(e){ g.style.color = 'var(--rosa-txt)'; g.textContent = e.message; }
  }, ms);
}
$('perfil-cuerpo').addEventListener('input', e => {
  const el = e.target.closest('[data-perfil]'); if (!el) return;
  const c = el.dataset.perfil;
  if (c === 'nombre' && el.value.trim()) guardarPerfil('nombre', el.value.trim(), 700);
  if (c === 'email') guardarPerfil('email', el.value.trim(), 900);
  if (c === 'emoji-libre' && el.value.trim()){
    dlgPerfil.querySelectorAll('input[name="p-emoji"]').forEach(i => { i.checked = false; });
    guardarPerfil('emoji', el.value.trim(), 700);
  }
});
$('perfil-cuerpo').addEventListener('change', e => {
  const el = e.target.closest('[data-perfil]'); if (!el) return;
  const c = el.dataset.perfil;
  if (c === 'emoji'){ dlgPerfil.querySelector('[data-perfil="emoji-libre"]').value = ''; guardarPerfil('emoji', el.value, 0); }
  if (c === 'tema'){ aplicarTema(el.value, S.perfil.apariencia); guardarPerfil('tema', el.value, 0); }
  if (c === 'apariencia'){ aplicarTema(S.perfil.tema, el.value); guardarPerfil('apariencia', el.value, 0); }
});
dlgPerfil.addEventListener('close', () => { if (S) render(); });

/* ───── Eventos ───── */
tabs.addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});
$('yo').addEventListener('click', abrirPerfil);
document.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
[dlg, dlgPerfil].forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
visor.addEventListener('click', () => visor.close());

vista.addEventListener('click', async e => {
  const ir = e.target.closest('[data-ir]');
  if (ir){ tab = ir.dataset.ir; render(); window.scrollTo(0, 0); return; }
  const f = e.target.closest('.foto[data-foto]');
  if (f){ const img = f.querySelector('img'); if (img.src){ visor.querySelector('img').src = img.src; visor.showModal(); } return; }

  const b = e.target.closest('[data-accion]'); if (!b || b.disabled) return;
  const { accion: acc, id } = b.dataset;
  if (acc === 'registrar') return abrirRegistro();
  if (acc === 'prueba') return pedirArchivo({ tipo: 'prueba', id });
  if (acc === 'foto-canje') return pedirArchivo({ tipo: 'canje', id });
  if (acc === 'compartir-link'){ const l = S.links.find(x => x.id === id); return compartir(l.nombre, urlPersonal(l.token), S.grupo.nombre); }
  if (acc === 'copiar-link'){ const l = S.links.find(x => x.id === id); return copiar(urlPersonal(l.token)); }
  if (acc === 'reaccion'){
    const p = S.muro.find(x => x.id === id), em = b.dataset.emoji;
    const l = p.reacciones[em] = p.reacciones[em] || [];
    const i = l.indexOf(S.yo); i >= 0 ? l.splice(i, 1) : l.push(S.yo);
    b.closest('.reacc').innerHTML = reaccHtml(p);
    api('reaccionar', id, em).catch(err => toast(err.message));
    return;
  }
  b.disabled = true;
  if (acc === 'checkin') await accion('checkin', [id], '¡Marcado! 💪');
  if (acc === 'comodin' && confirm('¿Usás el comodín de este mes? La semana cuenta como cumplida, pero no suma estrellas.')) await accion('usarComodin', [], 'Comodín usado');
  if (acc === 'borrar' && confirm('¿Borrás esta actividad? También se borra la foto.')) await accion('borrarActividad', [id], 'Actividad borrada');
  if (acc === 'canjear'){
    const p = S.premios.find(x => x.id === id);
    if (confirm(`¿Canjean ${p.texto}? Se descuentan ${p.costo} estrellas.`)){
      if (await accion('canjearPremio', [id], '¡A disfrutar! Después suban la foto al muro 🎉')) { tab = 'muro'; render(); window.scrollTo(0, 0); }
    }
  }
  if (acc === 'nueva-prenda' || acc === 'nuevo-premio'){
    try {
      const r = await api(acc === 'nueva-prenda' ? 'nuevaPrenda' : 'nuevoPremio', b.dataset.nivel);
      S = r.estado; abrir = r.nuevo; render(); abrir = null;
      const inp = vista.querySelector(`details[data-id="${r.nuevo}"] input[data-campo="texto"]`);
      if (inp){ inp.focus(); inp.select(); inp.scrollIntoView({ block: 'center' }); }
    } catch(err){ toast(err.message); }
  }
  if (acc === 'agregar-persona'){
    const nombre = prompt('¿Cómo se llama?');
    if (nombre !== null){
      const antes = new Set(S.links.map(l => l.id));
      if (await accion('agregarPersona', [nombre.trim()])){
        const nueva = S.links.find(l => !antes.has(l.id));
        if (nueva){ abrir = nueva.id; render(); abrir = null; toast('Listo. Ahora compartile su link.'); }
      }
    }
  }
  if (acc === 'regenerar'){
    const l = S.links.find(x => x.id === id);
    const txt = l.id === S.yo ? 'Tu link actual va a dejar de funcionar y vas a pasar a usar uno nuevo. ¿Seguimos?' : `El link actual de ${l.nombre} va a dejar de funcionar. ¿Generás uno nuevo?`;
    if (confirm(txt)){
      abrir = id;
      if (await accion('regenerarLink', [id], 'Link nuevo generado')){
        if (l.id === S.yo){ const nuevo = S.links.find(x => x.id === S.yo); guardarToken(nuevo.token); }
      }
      abrir = null;
    }
  }
  if (acc === 'quitar'){
    const l = S.links.find(x => x.id === id);
    if (confirm(`¿Quitás a ${l.nombre} del grupo? Su link deja de funcionar. Sus actividades quedan en el muro.`)) await accion('quitarPersona', [id], `${l.nombre} ya no está en el grupo`);
  }
  b.disabled = false;
});

/* ───── Guardado automático (admin) ───── */
const timers = {};
function programar(clave, ms, fn){ clearTimeout(timers[clave]); timers[clave] = setTimeout(fn, ms); }

vista.addEventListener('input', e => {
  const el = e.target;
  if (el.matches('[data-campo]') && el.type === 'text'){ const ed = el.closest('[data-ed]'); programar(ed.dataset.id + el.dataset.campo, 700, () => guardarCampo(el, ed)); }
  if (el.matches('[data-grupo="nombre"]') && el.value.trim()) programar('g-nombre', 700, () => guardarGrupo('nombre', el.value.trim()));
  if (el.matches('[data-persona="nombre"]') && el.value.trim()){ const ed = el.closest('[data-ed]'); programar('p-' + ed.dataset.id, 700, () => guardarNombrePersona(ed, el.value.trim())); }
});
vista.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-campo]')){ const ed = el.closest('[data-ed]'); programar(ed.dataset.id + el.dataset.campo, 0, () => guardarCampo(el, ed)); }
  if (el.matches('[data-grupo]') && el.dataset.grupo !== 'nombre'){
    const c = el.dataset.grupo;
    guardarGrupo(c, el.type === 'checkbox' ? el.checked : Number(el.value), true);
  }
  if (el.matches('[data-persona="admin"]')){
    const ed = el.closest('[data-ed]');
    abrir = ed.dataset.id;
    accion('cambiarAdmin', [ed.dataset.id, el.checked], el.checked ? 'Ahora también es admin' : 'Ya no es admin').then(() => { abrir = null; });
  }
});

async function guardarGrupo(campo, valor, recargar){
  const g = $('guardado-grupo'); if (g){ g.style.color = ''; g.textContent = 'Guardando…'; }
  try {
    await api('editarGrupo', { [campo]: valor });
    if (recargar){ S = await api('estado'); render(); }
    else { S.grupo[campo] = valor; $('marca').textContent = S.grupo.nombre; }
    const g2 = $('guardado-grupo'); if (g2) g2.textContent = 'Guardado ✓';
  } catch(err){ const g2 = $('guardado-grupo'); if (g2){ g2.style.color = 'var(--rosa-txt)'; g2.textContent = err.message; } }
}
async function guardarNombrePersona(ed, nombre){
  const g = ed.querySelector('.guardado'); g.style.color = ''; g.textContent = 'Guardando…';
  try {
    await api('renombrarPersona', ed.dataset.id, nombre);
    [S.links, S.miembros].forEach(arr => { const x = arr.find(m => m.id === ed.dataset.id); if (x) x.nombre = nombre; });
    g.textContent = 'Guardado ✓';
  } catch(err){ g.style.color = 'var(--rosa-txt)'; g.textContent = err.message; }
}
function guardarCampo(el, ed){
  const cual = ed.dataset.ed, id = ed.dataset.id, campo = el.dataset.campo;
  const valor = el.type === 'checkbox' ? el.checked : el.value;
  const obj = (cual === 'prenda' ? S.prendas : S.premios).find(x => x.id === id);
  if (campo === 'texto' && !String(valor).trim()) return;
  if (campo === 'cantidad' || campo === 'costo'){ const n = Math.round(Number(valor)); if (!n || n < 1) return; obj[campo] = n; }
  else obj[campo] = campo === 'texto' ? String(valor).trim() : valor;
  if (cual === 'prenda'){
    ed.querySelector('.txt').textContent = nombrePrenda(obj);
    ed.querySelector('.meta').textContent = detallePrenda(obj) + (obj.activa ? '' : ', archivada');
    ed.classList.toggle('archivada', !obj.activa);
    ed.querySelector('[data-campo="cantidad"]').disabled = obj.modo === 'juntada';
    ed.querySelector('.lbl-cant').textContent = obj.modo === 'veces' ? 'Veces' : 'Días';
  } else {
    ed.querySelector('.txt').textContent = obj.texto;
    ed.querySelector('.meta').textContent = `${obj.costo} ⭐` + (obj.activo ? '' : ', archivado');
    ed.classList.toggle('archivada', !obj.activo);
  }
  const g = ed.querySelector('.guardado'); g.style.color = ''; g.textContent = 'Guardando…';
  api(cual === 'prenda' ? 'editarPrenda' : 'editarPremio', id, { [campo]: valor })
    .then(() => { g.textContent = 'Guardado ✓'; })
    .catch(err => { g.style.color = 'var(--rosa-txt)'; g.textContent = err.message; });
}

/* ───── Registrar actividad ───── */
function abrirRegistro(){
  fAct.reset();
  $('chips').innerHTML = S.tipos.map((t, i) =>
    `<label class="chip"><input type="radio" name="tipo" value="${t.id}"${i === 0 ? ' checked' : ''}><span>${t.emoji} ${E(t.label)}</span></label>`).join('');
  const otras = S.miembros.filter(m => m.id !== S.yo);
  $('lbl-grupal').hidden = !otras.length;
  $('chips-quien').innerHTML = otras.map(m =>
    `<label class="chip"><input type="checkbox" name="con" value="${E(m.id)}"><span>${E(m.emoji)} ${E(m.nombre)}</span></label>`).join('');
  $('con-quien').hidden = true; $('hint').innerHTML = '';
  const ops = [];
  for (let k = S.hoy; k >= S.semana; k = sumar(k, -1)) ops.push(`<option value="${k}">${relativa(k)}</option>`);
  $('sel-fecha').innerHTML = ops.join('');
  fAct.minutos.min = S.grupo.minutos;
  if (Number(fAct.minutos.value) < S.grupo.minutos) fAct.minutos.value = S.grupo.minutos;
  $('ayuda-min').textContent = `Mínimo ${S.grupo.minutos} minutos para que cuente.`;
  $('btn-foto').disabled = false; $('btn-foto').textContent = '📸 Sacar la foto y sellar';
  estadoDlg('');
  dlg.showModal();
}
const conQuien = () => [...fAct.querySelectorAll('input[name="con"]:checked')].map(i => i.value);
function pendientesJuntada(){
  if (!conPrendas()) return [];
  const parts = [S.yo, ...conQuien()];
  return S.activas.filter(a => a.modo === 'juntada' && parts.includes(a.quien));
}
function actualizarHint(){
  const pend = $('grupal').checked ? pendientesJuntada() : [];
  $('hint').innerHTML = pend.map(a => `<p class="hint">💡 Ya que están juntas: ${a.quien === S.yo ? 'tenés' : `${E(miembro(a.quien).nombre)} tiene`} pendiente «${E(a.texto)}», del ${larga(a.inicio)}.</p>`).join('');
}
$('grupal').addEventListener('change', e => { $('con-quien').hidden = !e.target.checked; actualizarHint(); });
$('chips-quien').addEventListener('change', actualizarHint);

function estadoDlg(t, clase){ const el = $('estado-dlg'); el.textContent = t || ''; el.classList.toggle('mal', clase === 'mal'); }

/* Si el celu recarga la página al abrir la cámara, recuperamos lo cargado. */
const BORRADOR = 'pacto-borrador';
let borradorRevisado = false;
function recuperarBorrador(){
  if (borradorRevisado) return; borradorRevisado = true;
  let b = null;
  try { b = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch(e){}
  if (!b || Date.now() - b.t > 15 * 60 * 1000) { try { localStorage.removeItem(BORRADOR); } catch(e){} return; }
  abrirRegistro();
  const d = b.datos;
  const radio = fAct.querySelector(`input[name="tipo"][value="${d.tipo}"]`); if (radio) radio.checked = true;
  fAct.minutos.value = d.minutos;
  if ([...$('sel-fecha').options].some(o => o.value === d.fecha)) $('sel-fecha').value = d.fecha;
  fAct.nota.value = d.nota || '';
  if (b.grupal){
    $('grupal').checked = true; $('con-quien').hidden = false;
    fAct.querySelectorAll('input[name="con"]').forEach(i => { i.checked = (d.participantes || []).includes(i.value); });
    actualizarHint();
  }
  $('btn-foto').textContent = '🖼️ Elegir la foto y sellar';
  estadoDlg('Tu celu recargó la app al abrir la cámara y la foto no llegó. Sacala con la cámara del celu y después elegila desde la galería.', 'mal');
}
dlg.addEventListener('close', () => { try { localStorage.removeItem(BORRADOR); } catch(e){} });

$('btn-foto').addEventListener('click', () => {
  const f = new FormData(fAct), min = Number(f.get('minutos'));
  if (!min || min < S.grupo.minutos) return estadoDlg(`Tiene que durar al menos ${S.grupo.minutos} minutos.`, 'mal');
  const grupal = $('grupal').checked, con = grupal ? conQuien() : [];
  if (grupal && !con.length) return estadoDlg('Elegí con quién la hiciste.', 'mal');
  estadoDlg('');
  const datos = { tipo: f.get('tipo'), minutos: min, fecha: f.get('fecha'), nota: f.get('nota'), participantes: con };
  try { localStorage.setItem(BORRADOR, JSON.stringify({ datos, grupal, t: Date.now() })); } catch(e){}
  pedirArchivo({ tipo: 'actividad', datos, pendientes: grupal ? pendientesJuntada().length : 0 });
});

function pedirArchivo(obj){
  objetivo = obj;
  const inp = obj.tipo === 'actividad' ? $('in-foto-act') : inFoto;
  inp.value = ''; inp.click();
}

async function manejarArchivo(e){
  const file = e.target.files && e.target.files[0], obj = objetivo; objetivo = null;
  if (!file || !obj) return;
  const btn = $('btn-foto'), esAct = obj.tipo === 'actividad';
  const aviso = t => esAct ? estadoDlg(t) : toast(t);
  try {
    if (esAct){ btn.disabled = true; btn.textContent = 'Subiendo…'; }
    aviso('Preparando la foto…');
    const b64 = await comprimir(file);
    aviso('Subiendo la foto… no cierres la app');
    if (esAct){
      S = await api('registrarActividad', Object.assign({}, obj.datos, { foto: b64 }));
      dlg.close(); tab = 'semana'; animar = true; render(); window.scrollTo(0, 0);
      toast(obj.pendientes ? '¡Sellado! Y no se olviden de la prenda pendiente 😉' : '¡Sellado! 💪');
    } else if (obj.tipo === 'prueba'){
      S = await api('subirPrueba', obj.id, b64); render(); toast('¡Prueba subida! ✓');
    } else {
      S = await api('fotoCanje', obj.id, b64); render(); toast('¡Foto subida! 🎉');
    }
  } catch(err){
    const msg = err && err.message === 'imagen' ? 'No se pudo leer esa foto. Probá sacarla de nuevo o elegir otra.' : 'No se subió: ' + err.message;
    esAct ? estadoDlg(msg, 'mal') : toast(msg);
  }
  btn.disabled = false; btn.textContent = '📸 Sacar la foto y sellar';
}
inFoto.addEventListener('change', manejarArchivo);
$('in-foto-act').addEventListener('change', manejarArchivo);

async function comprimir(file){
  let fuente = null, w = 0, h = 0;
  try { fuente = await createImageBitmap(file); w = fuente.width; h = fuente.height; }
  catch(e){ try { fuente = await cargarImagen(file); w = fuente.naturalWidth; h = fuente.naturalHeight; } catch(e2){ fuente = null; } }
  if (fuente && w && h){
    const s = Math.min(1, 1200 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    c.getContext('2d').drawImage(fuente, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.8);
    if (url.length > 1000) return url.split(',')[1];
  }
  if (/jpe?g/i.test(file.type) && file.size < 6e6) return (await leerComoDataURL(file)).split(',')[1];
  throw new Error('imagen');
}
function cargarImagen(file){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('imagen')); };
    img.src = url;
  });
}
function leerComoDataURL(file){
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

/* ───── Inicio ───── */
function guardarToken(t){
  token = t;
  try { localStorage.setItem('pacto-token', t); } catch(e){}
  history.replaceState(null, '', location.pathname + '?t=' + encodeURIComponent(t));
}
document.addEventListener('visibilitychange', () => {
  const editando = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
  if (!document.hidden && S && !dlg.open && !dlgPerfil.open && !editando) cargar();
});

(function iniciar(){
  const t = new URLSearchParams(location.search).get('t');
  let guardado = '';
  try { guardado = localStorage.getItem('pacto-token') || ''; } catch(e){}
  if (t) guardarToken(t);
  else if (guardado) guardarToken(guardado);
  if (!token) return sinLink(false);
  cargar();
})();

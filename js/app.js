// ============================================================
// app.js - Lógica principal
// ============================================================

// ── Estado global ──
let G = {
  user: null,
  tab: 'resumen',
  bancos: [], cheques: [], prestamos: [],
  showAddBanco: false, editBancoId: null,
  showAddCheque: false,
  showAddPrestamo: false, newPrestamoCuotas: [],
  showAddUser: false, usuarios: [],
  expandedPrestamo: null,
  loading: false
};

// ── Utilidades ──
function fmt(n) {
  return '$' + (+n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR');
}
function addBizDays(date, days) {
  let d = new Date(date);
  let added = 0;
  while (added < days) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) added++; }
  return d;
}
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function getDias() {
  const hoy = today(); const dias = [hoy];
  for (let i = 1; i <= 20; i++) dias.push(addBizDays(hoy, i));
  return dias;
}
function showLoading(el) { el.innerHTML = '<div class="loading">Cargando</div>'; }

// ── Proyección ──
function chequesPorDia(bancoId, dt) {
  const hoy = today();
  return G.cheques.filter(c => c.banco_id === bancoId && c.estado !== 'cancelado').reduce((s, c) => {
    const cd = new Date(c.vencimiento + 'T12:00:00'); cd.setHours(0, 0, 0, 0);
    const imp = cd < hoy ? hoy : cd;
    return imp.getTime() === dt.getTime() ? s + parseFloat(c.importe || 0) : s;
  }, 0);
}
function cuotasPorDia(bancoId, dt) {
  return G.prestamos.filter(p => p.banco_id === bancoId).reduce((s, p) => {
    return s + (p.cuotas || []).reduce((ss, c) => {
      const cd = new Date(c.fecha + 'T12:00:00'); cd.setHours(0, 0, 0, 0);
      return cd.getTime() === dt.getTime() ? ss + parseFloat(c.cuota_total || 0) : ss;
    }, 0);
  }, 0);
}
function buildProy(banco, dias) {
  let saldo = parseFloat(banco.saldo || 0); const rows = [];
  dias.forEach((dt, idx) => {
    const chq = chequesPorDia(banco.id, dt);
    const cuotas = cuotasPorDia(banco.id, dt);
    const disp = saldo + parseFloat(banco.acuerdo || 0) - chq - cuotas;
    rows.push({ dt, idx, saldo, chq, cuotas, disp });
    saldo = saldo - chq - cuotas;
  });
  return rows;
}
function resumenPrestamo(p) {
  const cuotas = p.cuotas || [];
  if (!cuotas.length) return { totalCap: 0, totalInt: 0, totalIva: 0, totalOtros: 0, totalCuotas: 0, promedio: 0, prox: null, cant: 0 };
  const hoy = today();
  const totalCap = cuotas.reduce((s, c) => s + parseFloat(c.capital || 0), 0);
  const totalInt = cuotas.reduce((s, c) => s + parseFloat(c.interes || 0), 0);
  const totalIva = cuotas.reduce((s, c) => s + parseFloat(c.iva || 0), 0);
  const totalOtros = cuotas.reduce((s, c) => s + parseFloat(c.otros_imp || 0), 0);
  const totalCuotas = cuotas.reduce((s, c) => s + parseFloat(c.cuota_total || 0), 0);
  const promedio = cuotas.length ? totalCuotas / cuotas.length : 0;
  const pend = cuotas.filter(c => { const d = new Date(c.fecha + 'T12:00:00'); d.setHours(0, 0, 0, 0); return d >= hoy; });
  return { totalCap, totalInt, totalIva, totalOtros, totalCuotas, promedio, prox: pend[0] || null, cant: cuotas.length };
}

// ── RENDER ──
function render() {
  if (!G.user) { renderLogin(); return; }
  document.getElementById('root').innerHTML = `
    <div class="app-wrap">
      <div class="topbar">
        <div class="topbar-left">
          <span class="app-title">Gestión Bancaria</span>
          <span class="badge ${G.user.rol === 'administrador' ? 'badge-admin' : 'badge-consulta'}">${G.user.rol}</span>
          <span style="color:var(--text2);font-size:12px">${G.user.nombre}</span>
        </div>
        <button class="btn-sm" onclick="logout()">Salir</button>
      </div>
      <div class="nav">
        ${['resumen','cheques','prestamos','bancos','usuarios']
          .filter(t => t !== 'usuarios' || G.user.rol === 'administrador')
          .map(t => `<button class="nav-tab ${G.tab === t ? 'active' : ''}" onclick="setTab('${t}')">${{resumen:'Resumen',cheques:'Cheques',prestamos:'Préstamos',bancos:'Bancos',usuarios:'Usuarios'}[t]}</button>`)
          .join('')}
      </div>
      <div id="tab-content"></div>
    </div>`;
  renderTab();
}

function renderTab() {
  const el = document.getElementById('tab-content');
  if (!el) return;
  if (G.tab === 'resumen') el.innerHTML = buildResumen();
  else if (G.tab === 'cheques') el.innerHTML = buildCheques();
  else if (G.tab === 'prestamos') el.innerHTML = buildPrestamos();
  else if (G.tab === 'bancos') el.innerHTML = buildBancos();
  else if (G.tab === 'usuarios') el.innerHTML = buildUsuarios();
}

// ── LOGIN ──
function renderLogin() {
  document.getElementById('root').innerHTML = `
    <div class="login-screen">
      <div class="card login-card">
        <div class="login-title">Gestión Bancaria</div>
        <div class="login-sub">Ingresá con tu cuenta</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="form-group"><label>Email</label><input type="email" id="l-email" placeholder="usuario@empresa.com" onkeydown="if(event.key==='Enter')doLogin()"></div>
          <div class="form-group"><label>Contraseña</label><input type="password" id="l-pass" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"></div>
          <div id="l-err" class="error-msg" style="display:none"></div>
          <button class="btn-primary" id="l-btn" onclick="doLogin()">Ingresar</button>
        </div>
        <div class="login-demo">Demo: admin@empresa.com / admin123</div>
      </div>
    </div>`;
}

async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass = document.getElementById('l-pass').value;
  const btn = document.getElementById('l-btn');
  const err = document.getElementById('l-err');
  btn.disabled = true; btn.textContent = 'Ingresando...';
  try {
    const user = await dbLoginUsuario(email, pass);
    if (user) { G.user = user; await loadAll(); render(); }
    else { err.style.display = 'block'; err.textContent = 'Email o contraseña incorrectos'; }
  } catch (e) { err.style.display = 'block'; err.textContent = 'Error de conexión: ' + e.message; }
  btn.disabled = false; btn.textContent = 'Ingresar';
}

async function logout() { G.user = null; G.tab = 'resumen'; renderLogin(); }

// ── CARGA DE DATOS ──
async function loadAll() {
  const [bancos, cheques, prestamos, usuarios] = await Promise.all([
    dbGetBancos(), dbGetCheques(), dbGetPrestamos(), dbGetUsuarios()
  ]);
  G.bancos = bancos; G.cheques = cheques; G.prestamos = prestamos; G.usuarios = usuarios;
}

// ── RESUMEN ──
function buildResumen() {
  if (!G.bancos.length) return `<div class="empty-state">No hay bancos. Ir a <b>Bancos</b> para agregar.</div>`;
  const dias = getDias();
  const totSaldo = G.bancos.reduce((s, b) => s + parseFloat(b.saldo || 0), 0);
  const totAcuerdo = G.bancos.reduce((s, b) => s + parseFloat(b.acuerdo || 0), 0);
  let saldoC = totSaldo;
  const consolRows = dias.map((dt, idx) => {
    const chqT = G.bancos.reduce((s, b) => s + chequesPorDia(b.id, dt), 0);
    const cuotasT = G.bancos.reduce((s, b) => s + cuotasPorDia(b.id, dt), 0);
    const disp = saldoC + totAcuerdo - chqT - cuotasT;
    const r = { dt, idx, saldo: saldoC, chqT, cuotasT, disp };
    saldoC = saldoC - chqT - cuotasT; return r;
  });

  let html = `<div class="consolidado">
    <h2 style="margin-bottom:.75rem">Posición consolidada — todos los bancos</h2>
    <div class="metrics-grid">
      <div class="metric"><div class="label">Saldo total</div><div class="value">${fmt(totSaldo)}</div></div>
      <div class="metric"><div class="label">Acuerdos totales</div><div class="value">${fmt(totAcuerdo)}</div></div>
      <div class="metric"><div class="label">Disponible total</div><div class="value ${(totSaldo + totAcuerdo) >= 0 ? 'pos' : 'neg'}">${fmt(totSaldo + totAcuerdo)}</div></div>
      <div class="metric"><div class="label">Bancos</div><div class="value">${G.bancos.length}</div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Saldo inicio</th><th>Acuerdos</th><th>Cheques pendientes</th><th>Cuotas préstamos</th><th>Disponible consolidado</th></tr></thead>
      <tbody>${consolRows.map((r, i) => `<tr>
        <td>${i === 0 ? '<b>Hoy</b>' : r.dt.toLocaleDateString('es-AR')}</td>
        <td>${fmt(r.saldo)}</td><td>${fmt(totAcuerdo)}</td>
        <td>${r.chqT > 0 ? `<span class="neg">${fmt(r.chqT)}</span>` : '—'}</td>
        <td>${r.cuotasT > 0 ? `<span class="neg">${fmt(r.cuotasT)}</span>` : '—'}</td>
        <td class="${r.disp >= 0 ? 'pos' : 'neg'}">${fmt(r.disp)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>
  <div style="margin:1.25rem 0 .75rem"><h2 style="font-size:16px;color:var(--text2)">Posición por banco</h2></div>`;

  G.bancos.forEach(banco => {
    const proy = buildProy(banco, dias);
    html += `<div class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:.75rem">
        <h3>${banco.nombre}</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div class="metric" style="padding:5px 10px"><div class="label">Saldo</div><div class="value" style="font-size:14px">${fmt(banco.saldo)}</div></div>
          <div class="metric" style="padding:5px 10px"><div class="label">Acuerdo</div><div class="value" style="font-size:14px">${fmt(banco.acuerdo)}</div></div>
          <div class="metric" style="padding:5px 10px"><div class="label">Disponible</div><div class="value ${(parseFloat(banco.saldo) + parseFloat(banco.acuerdo)) >= 0 ? 'pos' : 'neg'}" style="font-size:14px">${fmt(parseFloat(banco.saldo) + parseFloat(banco.acuerdo))}</div></div>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Saldo inicio</th><th>Acuerdo</th><th>Cheques pendientes</th><th>Cuotas préstamos</th><th>Disponible</th></tr></thead>
        <tbody>${proy.map((r, i) => `<tr>
          <td>${i === 0 ? '<b>Hoy</b>' : r.dt.toLocaleDateString('es-AR')}</td>
          <td>${fmt(r.saldo)}</td><td>${fmt(banco.acuerdo)}</td>
          <td>${r.chq > 0 ? `<span class="neg">${fmt(r.chq)}</span>` : '—'}</td>
          <td>${r.cuotas > 0 ? `<span class="neg">${fmt(r.cuotas)}</span>` : '—'}</td>
          <td class="${r.disp >= 0 ? 'pos' : 'neg'}">${fmt(r.disp)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  });
  return html;
}

// ── CHEQUES ──
function buildCheques() {
  const isAdmin = G.user.rol === 'administrador';
  const pendCount = G.cheques.filter(c => c.estado !== 'cancelado').length;
  const pendTotal = G.cheques.filter(c => c.estado !== 'cancelado').reduce((s, c) => s + parseFloat(c.importe || 0), 0);

  let form = '';
  if (isAdmin && G.showAddCheque) {
    form = `<div class="card card-highlight" style="margin-bottom:1rem">
      <h3 style="margin-bottom:.75rem">Nuevo cheque</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nro. Cheque</label><input id="c-nro" placeholder="000001"></div>
        <div class="form-group"><label>Orden (destinatario)</label><input id="c-orden" placeholder="Proveedor S.A."></div>
        <div class="form-group"><label>Fecha emisión</label><input type="date" id="c-emision"></div>
        <div class="form-group"><label>Fecha vencimiento</label><input type="date" id="c-venc"></div>
        <div class="form-group"><label>Banco</label><select id="c-banco">
          <option value="">Seleccionar...</option>
          ${G.bancos.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Importe</label><input type="number" id="c-importe" placeholder="0.00"></div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" onclick="saveCheque()">Guardar</button>
        <button onclick="G.showAddCheque=false;renderTab()">Cancelar</button>
      </div>
    </div>`;
  }

  const rows = G.cheques.map(c => {
    const banco = G.bancos.find(b => b.id === c.banco_id);
    const estado = c.estado || 'pendiente';
    const vd = new Date(c.vencimiento + 'T12:00:00'); vd.setHours(0, 0, 0, 0);
    const vencido = vd < today() && estado === 'pendiente';
    return `<tr>
      <td>${c.nro}</td>
      <td>${c.orden || '—'}</td>
      <td>${fmtDate(c.emision)}</td>
      <td style="${vencido ? 'color:var(--red);font-weight:500' : ''}">${fmtDate(c.vencimiento)}${vencido ? ' ⚠️' : ''}</td>
      <td>${banco ? banco.nombre : '—'}</td>
      <td class="text-right">${fmt(c.importe)}</td>
      <td>${isAdmin
        ? `<select class="estado-sel" onchange="setChequeEstado('${c.id}',this.value)"><option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option><option value="cancelado" ${estado === 'cancelado' ? 'selected' : ''}>Cancelado</option></select>`
        : `<span class="badge ${estado === 'pendiente' ? 'badge-pend' : 'badge-canc'}">${estado === 'pendiente' ? 'Pendiente' : 'Cancelado'}</span>`}</td>
      ${isAdmin ? `<td><button class="btn-sm btn-danger" onclick="deleteCheque('${c.id}')">Eliminar</button></td>` : ''}
    </tr>`;
  }).join('');

  return `
    <div class="section-header"><h2>Cheques emitidos</h2>
      ${isAdmin ? `<button class="btn-primary" onclick="G.showAddCheque=!G.showAddCheque;renderTab()">+ Agregar cheque</button>` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:1rem">
      <div class="metric"><div class="label">Pendientes</div><div class="value">${pendCount}</div></div>
      <div class="metric"><div class="label">Total pendiente</div><div class="value neg">${fmt(pendTotal)}</div></div>
    </div>
    ${form}
    <div class="card">
      ${G.cheques.length
        ? `<div class="table-wrap"><table><thead><tr>
            <th>Nro.</th><th>Orden</th><th>Emisión</th><th>Vencimiento</th><th>Banco</th>
            <th class="text-right">Importe</th><th>Estado</th>${isAdmin ? '<th></th>' : ''}
          </tr></thead><tbody>${rows}</tbody></table></div>`
        : '<div class="empty-state">No hay cheques cargados.</div>'}
    </div>
    <p class="footnote">⚠️ Cheques vencidos con estado Pendiente se imputan al día de hoy en el Resumen.</p>`;
}

// ── PRÉSTAMOS ──
function buildPrestamos() {
  const isAdmin = G.user.rol === 'administrador';
  let form = '';
  if (isAdmin && G.showAddPrestamo) {
    const cuotas = G.newPrestamoCuotas;
    const totCap = cuotas.reduce((s, c) => s + c.capital, 0);
    const totInt = cuotas.reduce((s, c) => s + c.interes, 0);
    const totIva = cuotas.reduce((s, c) => s + c.iva, 0);
    const totOtros = cuotas.reduce((s, c) => s + c.otrosImp, 0);
    const totCuota = cuotas.reduce((s, c) => s + c.cuotaTotal, 0);

    const cuotasRows = cuotas.map((c, i) => `<tr>
      <td>${fmtDate(c.fecha)}</td>
      <td class="text-right">${fmt(c.capital)}</td>
      <td class="text-right">${fmt(c.interes)}</td>
      <td class="text-right">${fmt(c.iva)}</td>
      <td class="text-right">${fmt(c.otrosImp)}</td>
      <td class="text-right" style="font-weight:600">${fmt(c.cuotaTotal)}</td>
      <td><button class="btn-sm btn-danger" onclick="removeCuota(${i})">×</button></td>
    </tr>`).join('');

    form = `<div class="card card-highlight" style="margin-bottom:1rem">
      <h3 style="margin-bottom:.75rem">Nuevo préstamo — cuadro de marcha</h3>
      <div class="form-grid" style="margin-bottom:1rem">
        <div class="form-group"><label>Banco</label><select id="p-banco">
          <option value="">Seleccionar...</option>
          ${G.bancos.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Nombre / referencia</label><input id="p-nombre" placeholder="Ej: Préstamo capital trabajo"></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Fecha</th><th class="text-right">Capital</th><th class="text-right">Interés</th>
          <th class="text-right">IVA</th><th class="text-right">Otros Impuestos</th>
          <th class="text-right">Cuota total</th><th></th>
        </tr></thead>
        <tbody>
          ${cuotasRows}
          <tr style="background:var(--surface2)">
            <td><input type="date" id="nc-fecha"></td>
            <td><input type="number" id="nc-capital" placeholder="0.00" oninput="recalc()"></td>
            <td><input type="number" id="nc-interes" placeholder="0.00" oninput="recalc()"></td>
            <td><input type="number" id="nc-iva" placeholder="0.00" oninput="recalc()"></td>
            <td><input type="number" id="nc-otros" placeholder="0.00" oninput="recalc()"></td>
            <td><input type="number" id="nc-total" placeholder="0.00" readonly></td>
            <td><button class="btn-sm btn-primary" onclick="addCuota()">+ Agregar</button></td>
          </tr>
          ${cuotas.length ? `<tr class="tr-total">
            <td>Totales (${cuotas.length} cuota${cuotas.length !== 1 ? 's' : ''})</td>
            <td class="text-right">${fmt(totCap)}</td>
            <td class="text-right">${fmt(totInt)}</td>
            <td class="text-right">${fmt(totIva)}</td>
            <td class="text-right">${fmt(totOtros)}</td>
            <td class="text-right">${fmt(totCuota)}</td>
            <td></td>
          </tr>` : ''}
        </tbody>
      </table></div>
      <div class="form-actions">
        <button class="btn-primary" onclick="savePrestamo()" ${!cuotas.length ? 'disabled' : ''}>Guardar préstamo (${cuotas.length} cuotas)</button>
        <button onclick="G.showAddPrestamo=false;G.newPrestamoCuotas=[];renderTab()">Cancelar</button>
      </div>
    </div>`;
  }

  const prestRows = G.prestamos.map(p => {
    const banco = G.bancos.find(b => b.id === p.banco_id);
    const res = resumenPrestamo(p);
    const exp = G.expandedPrestamo === p.id;
    let cuadro = '';
    if (exp && p.cuotas && p.cuotas.length) {
      cuadro = `<div class="table-wrap" style="margin-top:1rem"><table>
        <thead><tr>
          <th>#</th><th>Fecha</th><th class="text-right">Capital</th><th class="text-right">Interés</th>
          <th class="text-right">IVA</th><th class="text-right">Otros Impuestos</th><th class="text-right">Cuota total</th>
        </tr></thead>
        <tbody>
          ${p.cuotas.map((c, i) => `<tr>
            <td>${i + 1}</td><td>${fmtDate(c.fecha)}</td>
            <td class="text-right">${fmt(c.capital)}</td>
            <td class="text-right">${fmt(c.interes)}</td>
            <td class="text-right">${fmt(c.iva)}</td>
            <td class="text-right">${fmt(c.otros_imp)}</td>
            <td class="text-right" style="font-weight:600">${fmt(c.cuota_total)}</td>
          </tr>`).join('')}
          <tr class="tr-total">
            <td colspan="2">Totales</td>
            <td class="text-right">${fmt(res.totalCap)}</td>
            <td class="text-right">${fmt(res.totalInt)}</td>
            <td class="text-right">${fmt(res.totalIva)}</td>
            <td class="text-right">${fmt(res.totalOtros)}</td>
            <td class="text-right">${fmt(res.totalCuotas)}</td>
          </tr>
        </tbody>
      </table></div>`;
    }
    return `<div class="card" style="margin-bottom:.75rem">
      <div style="margin-bottom:.6rem">
        <span style="font-weight:600;font-size:15px">${p.nombre}</span>
        <span style="color:var(--text2);font-size:12px;margin-left:8px">${banco ? banco.nombre : '—'}</span>
      </div>
      <div class="metrics-grid">
        <div class="metric"><div class="label">Cuotas</div><div class="value" style="font-size:14px">${res.cant}</div></div>
        <div class="metric"><div class="label">Total capital</div><div class="value" style="font-size:14px">${fmt(res.totalCap)}</div></div>
        <div class="metric"><div class="label">Total intereses</div><div class="value" style="font-size:14px">${fmt(res.totalInt)}</div></div>
        <div class="metric"><div class="label">Total IVA</div><div class="value" style="font-size:14px">${fmt(res.totalIva)}</div></div>
        <div class="metric"><div class="label">Otros impuestos</div><div class="value" style="font-size:14px">${fmt(res.totalOtros)}</div></div>
        <div class="metric"><div class="label">Total a pagar</div><div class="value neg" style="font-size:14px">${fmt(res.totalCuotas)}</div></div>
        <div class="metric"><div class="label">Cuota promedio</div><div class="value" style="font-size:14px">${fmt(res.promedio)}</div></div>
        ${res.prox ? `<div class="metric"><div class="label">Próx. vencimiento</div><div class="value" style="font-size:13px">${fmtDate(res.prox.fecha)}</div></div>` : ''}
        ${res.prox ? `<div class="metric"><div class="label">Próx. cuota</div><div class="value neg" style="font-size:13px">${fmt(res.prox.cuota_total)}</div></div>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <button class="btn-link" onclick="togglePrestamo('${p.id}')">${exp ? '▲ Ocultar cuadro' : '▼ Ver cuadro de marcha'}</button>
        ${isAdmin ? `<button class="btn-sm btn-danger" onclick="deletePrestamo('${p.id}')">Eliminar</button>` : ''}
      </div>
      ${exp ? cuadro : ''}
    </div>`;
  }).join('');

  return `
    <div class="section-header"><h2>Préstamos vigentes</h2>
      ${isAdmin ? `<button class="btn-primary" onclick="G.showAddPrestamo=true;G.newPrestamoCuotas=[];renderTab()">+ Agregar préstamo</button>` : ''}
    </div>
    ${form}
    ${G.prestamos.length ? prestRows : '<div class="card"><div class="empty-state">No hay préstamos cargados.</div></div>'}`;
}

// ── BANCOS ──
function buildBancos() {
  const isAdmin = G.user.rol === 'administrador';
  let form = '';
  if (isAdmin && G.showAddBanco) {
    const b = G.editBancoId ? G.bancos.find(x => x.id === G.editBancoId) : {};
    form = `<div class="card card-highlight" style="margin-bottom:1rem">
      <h3 style="margin-bottom:.75rem">${G.editBancoId ? 'Editar banco' : 'Nuevo banco'}</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nombre</label><input id="b-nombre" value="${b.nombre || ''}" placeholder="Banco Nación"></div>
        <div class="form-group"><label>Saldo actual ($)</label><input type="number" id="b-saldo" value="${b.saldo || ''}" placeholder="0.00"></div>
        <div class="form-group"><label>Acuerdo en cuenta ($)</label><input type="number" id="b-acuerdo" value="${b.acuerdo || ''}" placeholder="0.00"></div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" onclick="saveBanco()">Guardar</button>
        <button onclick="G.showAddBanco=false;G.editBancoId=null;renderTab()">Cancelar</button>
      </div>
    </div>`;
  }
  const rows = G.bancos.map(b => `<tr>
    <td>${b.nombre}</td>
    <td class="text-right">${fmt(b.saldo)}</td>
    <td class="text-right">${fmt(b.acuerdo)}</td>
    <td class="text-right">${fmt(parseFloat(b.saldo) + parseFloat(b.acuerdo))}</td>
    ${isAdmin ? `<td><div style="display:flex;gap:6px">
      <button class="btn-sm" onclick="editBanco('${b.id}')">Editar</button>
      <button class="btn-sm btn-danger" onclick="deleteBanco('${b.id}')">Eliminar</button>
    </div></td>` : ''}
  </tr>`).join('');
  return `
    <div class="section-header"><h2>Cuentas bancarias</h2>
      ${isAdmin ? `<button class="btn-primary" onclick="G.showAddBanco=true;G.editBancoId=null;renderTab()">+ Agregar banco</button>` : ''}
    </div>
    ${form}
    <div class="card">
      ${G.bancos.length
        ? `<div class="table-wrap"><table><thead><tr>
            <th>Banco</th><th class="text-right">Saldo actual</th><th class="text-right">Acuerdo</th><th class="text-right">Disponible total</th>${isAdmin ? '<th></th>' : ''}
          </tr></thead><tbody>${rows}</tbody></table></div>`
        : '<div class="empty-state">No hay bancos.</div>'}
    </div>`;
}

// ── USUARIOS ──
function buildUsuarios() {
  let form = '';
  if (G.showAddUser) {
    form = `<div class="card card-highlight" style="margin-bottom:1rem">
      <h3 style="margin-bottom:.75rem">Nuevo usuario</h3>
      <div class="form-grid">
        <div class="form-group"><label>Nombre</label><input id="u-nombre" placeholder="Nombre completo"></div>
        <div class="form-group"><label>Email</label><input type="email" id="u-email" placeholder="usuario@empresa.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="u-pass" placeholder="Mínimo 6 caracteres"></div>
        <div class="form-group"><label>Rol</label><select id="u-rol">
          <option value="consulta">Consulta</option>
          <option value="administrador">Administrador</option>
        </select></div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" onclick="saveUsuario()">Guardar</button>
        <button onclick="G.showAddUser=false;renderTab()">Cancelar</button>
      </div>
    </div>`;
  }
  const rows = G.usuarios.map(u => `<tr>
    <td>${u.nombre}</td><td>${u.email}</td>
    <td><span class="badge ${u.rol === 'administrador' ? 'badge-admin' : 'badge-consulta'}">${u.rol}</span></td>
    <td>${u.id !== G.user.id ? `<button class="btn-sm btn-danger" onclick="deleteUsuario('${u.id}')">Eliminar</button>` : '<span style="font-size:12px;color:var(--text2)">Cuenta actual</span>'}</td>
  </tr>`).join('');
  return `
    <div class="section-header"><h2>Gestión de usuarios</h2>
      <button class="btn-primary" onclick="G.showAddUser=!G.showAddUser;renderTab()">+ Nuevo usuario</button>
    </div>
    ${form}
    <div class="card">
      <div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}

// ── ACCIONES ──
function setTab(t) { G.tab = t; G.showAddCheque = false; G.showAddPrestamo = false; G.showAddBanco = false; G.showAddUser = false; renderTab(); }
function togglePrestamo(id) { G.expandedPrestamo = G.expandedPrestamo === id ? null : id; renderTab(); }

async function saveBanco() {
  const nombre = document.getElementById('b-nombre').value.trim();
  const saldo = parseFloat(document.getElementById('b-saldo').value) || 0;
  const acuerdo = parseFloat(document.getElementById('b-acuerdo').value) || 0;
  if (!nombre) { alert('Ingresá el nombre del banco'); return; }
  try {
    if (G.editBancoId) { await dbUpdateBanco(G.editBancoId, { nombre, saldo, acuerdo }); }
    else { await dbCreateBanco({ nombre, saldo, acuerdo }); }
    G.bancos = await dbGetBancos();
    G.showAddBanco = false; G.editBancoId = null; renderTab();
  } catch (e) { alert('Error: ' + e.message); }
}
function editBanco(id) { G.editBancoId = id; G.showAddBanco = true; renderTab(); }
async function deleteBanco(id) {
  if (!confirm('¿Eliminar banco? También se eliminarán sus cheques y préstamos.')) return;
  try { await dbDeleteBanco(id); G.bancos = await dbGetBancos(); G.cheques = await dbGetCheques(); G.prestamos = await dbGetPrestamos(); renderTab(); }
  catch (e) { alert('Error: ' + e.message); }
}

async function saveCheque() {
  const nro = document.getElementById('c-nro').value.trim();
  const orden = document.getElementById('c-orden').value.trim();
  const emision = document.getElementById('c-emision').value;
  const vencimiento = document.getElementById('c-venc').value;
  const banco_id = document.getElementById('c-banco').value;
  const importe = parseFloat(document.getElementById('c-importe').value) || 0;
  if (!nro || !vencimiento || !banco_id || !importe) { alert('Completá los campos obligatorios'); return; }
  try {
    await dbCreateCheque({ nro, orden, emision: emision || null, vencimiento, banco_id, importe, estado: 'pendiente' });
    G.cheques = await dbGetCheques(); G.showAddCheque = false; renderTab();
  } catch (e) { alert('Error: ' + e.message); }
}
async function setChequeEstado(id, estado) {
  try { await dbUpdateChequeEstado(id, estado); G.cheques = await dbGetCheques(); renderTab(); }
  catch (e) { alert('Error: ' + e.message); }
}
async function deleteCheque(id) {
  if (!confirm('¿Eliminar cheque?')) return;
  try { await dbDeleteCheque(id); G.cheques = await dbGetCheques(); renderTab(); }
  catch (e) { alert('Error: ' + e.message); }
}

function recalc() {
  const cap = parseFloat(document.getElementById('nc-capital')?.value) || 0;
  const int = parseFloat(document.getElementById('nc-interes')?.value) || 0;
  const iva = parseFloat(document.getElementById('nc-iva')?.value) || 0;
  const otros = parseFloat(document.getElementById('nc-otros')?.value) || 0;
  const el = document.getElementById('nc-total');
  if (el) el.value = (cap + int + iva + otros).toFixed(2);
}
function addCuota() {
  const fecha = document.getElementById('nc-fecha')?.value;
  const capital = parseFloat(document.getElementById('nc-capital')?.value) || 0;
  const interes = parseFloat(document.getElementById('nc-interes')?.value) || 0;
  const iva = parseFloat(document.getElementById('nc-iva')?.value) || 0;
  const otrosImp = parseFloat(document.getElementById('nc-otros')?.value) || 0;
  if (!fecha) { alert('Ingresá la fecha de la cuota'); return; }
  G.newPrestamoCuotas.push({ fecha, capital, interes, iva, otrosImp, cuotaTotal: capital + interes + iva + otrosImp });
  renderTab();
}
function removeCuota(idx) { G.newPrestamoCuotas.splice(idx, 1); renderTab(); }
async function savePrestamo() {
  const banco_id = document.getElementById('p-banco')?.value;
  const nombre = (document.getElementById('p-nombre')?.value || '').trim() || 'Préstamo';
  if (!banco_id) { alert('Seleccioná el banco'); return; }
  if (!G.newPrestamoCuotas.length) { alert('Ingresá al menos una cuota'); return; }
  const monto = G.newPrestamoCuotas.reduce((s, c) => s + c.capital, 0);
  try {
    await dbCreatePrestamo({ banco_id, nombre, monto }, G.newPrestamoCuotas);
    G.prestamos = await dbGetPrestamos(); G.showAddPrestamo = false; G.newPrestamoCuotas = []; renderTab();
  } catch (e) { alert('Error: ' + e.message); }
}
async function deletePrestamo(id) {
  if (!confirm('¿Eliminar préstamo?')) return;
  try { await dbDeletePrestamo(id); G.prestamos = await dbGetPrestamos(); renderTab(); }
  catch (e) { alert('Error: ' + e.message); }
}

async function saveUsuario() {
  const nombre = document.getElementById('u-nombre').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const password = document.getElementById('u-pass').value;
  const rol = document.getElementById('u-rol').value;
  if (!nombre || !email || !password) { alert('Completá todos los campos'); return; }
  if (G.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase())) { alert('Ya existe ese email'); return; }
  try {
    await dbCreateUsuario({ nombre, email: email.toLowerCase(), password, rol });
    G.usuarios = await dbGetUsuarios(); G.showAddUser = false; renderTab();
  } catch (e) { alert('Error: ' + e.message); }
}
async function deleteUsuario(id) {
  if (!confirm('¿Eliminar usuario?')) return;
  try { await dbDeleteUsuario(id); G.usuarios = await dbGetUsuarios(); renderTab(); }
  catch (e) { alert('Error: ' + e.message); }
}

// ── INICIO ──
window.addEventListener('DOMContentLoaded', () => { renderLogin(); });

// ============================================================
// db.js - Capa de datos con Supabase
// ============================================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── USUARIOS ──
async function dbGetUsuarios() {
  const { data, error } = await db.from('usuarios').select('*').order('nombre');
  if (error) throw error;
  return data;
}
async function dbCreateUsuario(u) {
  const { data, error } = await db.from('usuarios').insert(u).select().single();
  if (error) throw error;
  return data;
}
async function dbDeleteUsuario(id) {
  const { error } = await db.from('usuarios').delete().eq('id', id);
  if (error) throw error;
}
async function dbLoginUsuario(email, password) {
  const { data, error } = await db.from('usuarios')
    .select('*').eq('email', email.toLowerCase()).eq('password', password).single();
  if (error) return null;
  return data;
}

// ── BANCOS ──
async function dbGetBancos() {
  const { data, error } = await db.from('bancos').select('*').order('nombre');
  if (error) throw error;
  return data;
}
async function dbCreateBanco(b) {
  const { data, error } = await db.from('bancos').insert(b).select().single();
  if (error) throw error;
  return data;
}
async function dbUpdateBanco(id, b) {
  const { error } = await db.from('bancos').update(b).eq('id', id);
  if (error) throw error;
}
async function dbDeleteBanco(id) {
  const { error } = await db.from('bancos').delete().eq('id', id);
  if (error) throw error;
}

// ── CHEQUES ──
async function dbGetCheques() {
  const { data, error } = await db.from('cheques')
    .select('*, bancos(id, nombre)').order('vencimiento');
  if (error) throw error;
  return data;
}
async function dbCreateCheque(c) {
  const { data, error } = await db.from('cheques').insert(c).select().single();
  if (error) throw error;
  return data;
}
async function dbUpdateChequeEstado(id, estado) {
  const { error } = await db.from('cheques').update({ estado }).eq('id', id);
  if (error) throw error;
}
async function dbDeleteCheque(id) {
  const { error } = await db.from('cheques').delete().eq('id', id);
  if (error) throw error;
}

// ── PRÉSTAMOS ──
async function dbGetPrestamos() {
  const { data, error } = await db.from('prestamos')
    .select('*, bancos(id, nombre), cuotas_prestamo(*)')
    .order('created_at');
  if (error) throw error;
  // ordenar cuotas por orden
  return data.map(p => ({
    ...p,
    cuotas: (p.cuotas_prestamo || []).sort((a, b) => a.orden - b.orden)
  }));
}
async function dbCreatePrestamo(p, cuotas) {
  const { data: prestamo, error } = await db.from('prestamos').insert({
    banco_id: p.banco_id,
    nombre: p.nombre,
    monto: p.monto
  }).select().single();
  if (error) throw error;

  if (cuotas && cuotas.length) {
    const rows = cuotas.map((c, i) => ({
      prestamo_id: prestamo.id,
      fecha: c.fecha,
      capital: c.capital,
      interes: c.interes,
      iva: c.iva,
      otros_imp: c.otrosImp,
      cuota_total: c.cuotaTotal,
      orden: i
    }));
    const { error: err2 } = await db.from('cuotas_prestamo').insert(rows);
    if (err2) throw err2;
  }
  return prestamo;
}
async function dbDeletePrestamo(id) {
  const { error } = await db.from('prestamos').delete().eq('id', id);
  if (error) throw error;
}

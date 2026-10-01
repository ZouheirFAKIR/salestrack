// Rapport PDF commercial (jour, semaine, mois, trimestre, année, global)
// Règle : devis comptés à leur date de création, commandes et CA à leur date de confirmation.
const pool = require('../db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const odoo = require('./odooClient');
const { toMoroccoDate } = odoo;

const LOGO_PATH = path.join(__dirname, '../assets/yealead.png');

function getLogo() {
  try {
    return fs.readFileSync(LOGO_PATH);
  } catch (err) {
    console.warn(`Logo Yealead introuvable (${LOGO_PATH}) :`, err.message);
    return null;
  }
}

const ACCENT = '#f86635';
const ACCENT_LIGHT = '#fdf1ec';
const BLUE = '#3b82f6';
const PURPLE = '#a78bfa';
const GREEN = '#22c55e';
const RED = '#ef4444';
const GRAY = '#9ca3af';
const TEAL = '#14b8a6';
const ORANGE_DEVIS = '#f59e0b';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const TITLES = {
  day: 'Rapport journalier',
  week: 'Rapport hebdomadaire',
  month: 'Rapport mensuel',
  quarter: 'Rapport trimestriel',
  year: 'Rapport annuel',
  global: 'Rapport global',
};

const ACTIVITY_LABELS = {
  'To Do': 'À faire',
  Call: 'Appel',
  Meeting: 'Réunion',
  Email: 'Email',
  Reminder: 'Rappel',
  'Time Off Approval': 'Validation congé',
  'Expense Approval': 'Validation dépense',
  'Allocation Approval': 'Validation allocation',
};

// ---------- Dates et nombres ----------
function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
function parse(s) { return new Date(`${s}T00:00:00Z`); }
function shift(s, days) { const d = parse(s); d.setUTCDate(d.getUTCDate() + days); return iso(d); }
function todayMorocco() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date()); }
function fmtDate(s) { const d = parse(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
function fmtNum(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
function fmtMAD(n) { return `${fmtNum(n)} MAD`; }
function pct(part, total) { return total > 0 ? Math.round((part / total) * 100) : 0; }

// Devis : jour de création. Commande : jour de confirmation.
function orderDay(o) {
  const isCommande = ['sale', 'done'].includes(o.state);
  const raw = isCommande ? o.date_order : o.create_date;
  return raw ? toMoroccoDate(raw) : null;
}
function orderDateDomain(from, to) {
  return ['|', '&', ['create_date', '>=', from], ['create_date', '<=', to], '&', ['date_order', '>=', from], ['date_order', '<=', to]];
}

function getRange(period, dateStr) {
  const d = parse(dateStr || todayMorocco());
  let start;
  let end;
  let label;
  if (period === 'week') {
    const day = d.getUTCDay();
    start = new Date(d); start.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
    end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    label = `Semaine du ${fmtDate(iso(start))} au ${fmtDate(iso(end))}`;
  } else if (period === 'month') {
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    label = `Mois de ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } else if (period === 'quarter') {
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 0));
    label = `Trimestre : ${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()} à ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  } else if (period === 'year') {
    start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(d.getUTCFullYear(), 11, 31));
    label = `Année ${d.getUTCFullYear()}`;
  } else {
    start = d;
    end = d;
    label = `Journée du ${fmtDate(iso(d))}`;
  }
  return { start: iso(start), end: iso(end), label };
}

function mondayOf(dayStr) {
  const d = parse(dayStr);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return iso(d);
}

// Semaine -> par jour, Mois -> par semaine, sinon -> par mois
function granularityOf(period) {
  if (period === 'week') return 'day';
  if (period === 'month') return 'week';
  return 'month';
}

function buildBuckets(period, start, end) {
  const buckets = [];
  const g = granularityOf(period);
  if (period === 'day') return [];
  if (g === 'day') {
    for (let d = parse(start); iso(d) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      buckets.push({
        key: iso(d),
        label: `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()}`,
        tableLabel: `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`,
      });
    }
  } else if (g === 'week') {
    const d = parse(mondayOf(start));
    let n = 1;
    while (iso(d) <= end) {
      const we = new Date(d); we.setUTCDate(we.getUTCDate() + 6);
      const from = iso(d) < start ? start : iso(d);
      const to = iso(we) > end ? end : iso(we);
      buckets.push({
        key: iso(d),
        label: `Sem. ${n}`,
        tableLabel: `Semaine ${n} (${parse(from).getUTCDate()} au ${parse(to).getUTCDate()} ${MONTHS_SHORT[parse(to).getUTCMonth()]})`,
      });
      d.setUTCDate(d.getUTCDate() + 7);
      n++;
    }
  } else {
    const d = parse(`${start.slice(0, 7)}-01`);
    while (iso(d).slice(0, 7) <= end.slice(0, 7)) {
      buckets.push({
        key: iso(d).slice(0, 7),
        label: `${MONTHS_SHORT[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        tableLabel: `${MONTHS[d.getUTCMonth()].charAt(0).toUpperCase()}${MONTHS[d.getUTCMonth()].slice(1)} ${d.getUTCFullYear()}`,
      });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
  }
  return buckets.map((b) => ({ ...b, devis: 0, commandes: 0, ca: 0, appels: 0, rdv: 0 }));
}

// ---------- Données ----------
async function getReportData(commercialId, period, dateStr) {
  const userRes = await pool.query('SELECT nom, email, odoo_user_id FROM users WHERE id = $1', [commercialId]);
  const user = userRes.rows[0] || {};
  const today = todayMorocco();
  const isGlobal = period === 'global';

  let { start, end, label } = isGlobal
    ? { start: '2000-01-01', end: today, label: '' }
    : getRange(period, dateStr);

  // 1. Appels et rendez-vous saisis dans SalesTrack
  const localRes = await pool.query(
    `SELECT TO_CHAR(date_activite, 'YYYY-MM-DD') AS jour, type, sens, statut, COUNT(*)::int AS n
     FROM activities
     WHERE commercial_id = $1 AND type IN ('appel', 'rdv') AND DATE(date_activite) BETWEEN $2 AND $3
     GROUP BY 1, 2, 3, 4`,
    [commercialId, start, end]
  );
  const local = {
    appels: 0,
    rdv: 0,
    sens: { sortant: 0, entrant: 0, autre: 0 },
    reponse: { repond: 0, ne_repond_pas: 0, autre: 0 },
    presence: { present: 0, absent: 0, autre: 0 },
  };
  localRes.rows.forEach((r) => {
    if (r.type === 'appel') {
      local.appels += r.n;
      local.sens[r.sens in local.sens ? r.sens : 'autre'] += r.n;
      local.reponse[r.statut in local.reponse ? r.statut : 'autre'] += r.n;
    } else {
      local.rdv += r.n;
      local.presence[r.statut in local.presence ? r.statut : 'autre'] += r.n;
    }
  });

  // 2. Données Odoo
  const odooUserId = user.odoo_user_id;
  const sales = { linked: !!odooUserId, error: false, devis: 0, commandes: 0, ca: 0, orders: [] };
  const acts = { linked: !!odooUserId, error: false, total: 0, planned: 0, overdue: 0, done: 0, cancelled: 0, byCategory: [] };
  const leads = {
    linked: !!odooUserId, error: false,
    waitingActive: 0, waitingLost: 0, pipelineActive: 0, pipelineLost: 0,
    periodWaitingNew: 0, periodWaitingLost: 0, periodPipelineNew: 0, periodPipelineLost: 0,
    byStage: [], withoutActivity: 0,
  };

  if (odooUserId) {
    const [ordersR, actsR, leadsR] = await Promise.allSettled([
      odoo.execute(
        'sale.order', 'search_read',
        [[['user_id', '=', odooUserId], ...(isGlobal ? [] : orderDateDomain(`${shift(start, -1)} 00:00:00`, `${shift(end, 1)} 23:59:59`))]],
        { fields: ['state', 'amount_total', 'create_date', 'date_order'] }
      ),
      odoo.execute(
        'mail.activity', 'search_read',
        [[['user_id', '=', odooUserId], ...(isGlobal ? [] : [['date_deadline', '>=', start], ['date_deadline', '<=', end]])]],
        { fields: ['activity_type_id', 'state', 'active', 'activity_cancel'], context: { active_test: false } }
      ),
      odoo.execute(
        'crm.lead', 'search_read',
        [[['user_id', '=', odooUserId]]],
        { fields: ['type', 'active', 'stage_id', 'activity_state', 'create_date', 'write_date'], context: { active_test: false } }
      ),
    ]);

    if (ordersR.status === 'fulfilled') {
      ordersR.value.forEach((o) => {
        const day = orderDay(o);
        if (!day || day < start || day > end) return;
        if (['draft', 'sent'].includes(o.state)) {
          sales.devis++;
          sales.orders.push({ day, kind: 'devis', amount: 0 });
        } else if (['sale', 'done'].includes(o.state)) {
          sales.commandes++;
          sales.ca += o.amount_total || 0;
          sales.orders.push({ day, kind: 'commande', amount: o.amount_total || 0 });
        }
      });
    } else {
      sales.error = true;
      console.error('Erreur Odoo (rapport ventes):', ordersR.reason?.message);
    }

    if (actsR.status === 'fulfilled') {
      const cat = {};
      actsR.value.forEach((r) => {
        let status;
        if (r.active === false) status = r.activity_cancel ? 'cancelled' : 'done';
        else status = r.state === 'overdue' ? 'overdue' : 'planned';
        acts[status]++;
        acts.total++;
        const raw = r.activity_type_id ? r.activity_type_id[1] : 'Autre';
        const lbl = ACTIVITY_LABELS[raw] || raw;
        if (!cat[lbl]) cat[lbl] = { label: lbl, total: 0, done: 0, planned: 0, overdue: 0, cancelled: 0 };
        cat[lbl].total++;
        cat[lbl][status]++;
      });
      acts.byCategory = Object.values(cat).sort((a, b) => b.total - a.total);
    } else {
      acts.error = true;
      console.error('Erreur Odoo (rapport activités):', actsR.reason?.message);
    }

    if (leadsR.status === 'fulfilled') {
      const stageMap = {};
      leadsR.value.forEach((l) => {
        const isPipe = l.type === 'opportunity';
        const created = l.create_date ? toMoroccoDate(l.create_date) : '';
        const changed = l.write_date ? toMoroccoDate(l.write_date) : '';
        const createdIn = created >= start && created <= end;
        const lostIn = !l.active && changed >= start && changed <= end;
        if (isPipe) {
          if (l.active) {
            leads.pipelineActive++;
            const name = l.stage_id ? l.stage_id[1] : 'Sans étape';
            stageMap[name] = (stageMap[name] || 0) + 1;
            if (!l.activity_state) leads.withoutActivity++;
          } else {
            leads.pipelineLost++;
          }
          if (createdIn) leads.periodPipelineNew++;
          if (lostIn) leads.periodPipelineLost++;
        } else {
          if (l.active) leads.waitingActive++; else leads.waitingLost++;
          if (createdIn) leads.periodWaitingNew++;
          if (lostIn) leads.periodWaitingLost++;
        }
      });
      leads.byStage = Object.entries(stageMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    } else {
      leads.error = true;
      console.error('Erreur Odoo (rapport pistes):', leadsR.reason?.message);
    }
  }

  // Global : la période commence à la première donnée trouvée
  if (isGlobal) {
    const days = [...sales.orders.map((o) => o.day), ...localRes.rows.map((r) => r.jour)].filter(Boolean).sort();
    start = days[0] || today;
    label = `Toute l'activité, du ${fmtDate(start)} au ${fmtDate(end)}`;
  }

  // 3. Évolution (Semaine -> par jour, Mois -> par semaine, sinon -> par mois)
  const buckets = buildBuckets(period, start, end > today ? today : end);
  const granularity = granularityOf(period);
  const monthly = granularity === 'month';
  const unit = { day: 'jour', week: 'semaine', month: 'mois' }[granularity];
  const index = {};
  buckets.forEach((b, i) => { index[b.key] = i; });
  const keyOf = (day) => {
    if (granularity === 'month') return day.slice(0, 7);
    if (granularity === 'week') return mondayOf(day);
    return day;
  };

  sales.orders.forEach((o) => {
    const b = buckets[index[keyOf(o.day)]];
    if (!b) return;
    if (o.kind === 'devis') b.devis++;
    else { b.commandes++; b.ca += o.amount; }
  });
  localRes.rows.forEach((r) => {
    const b = buckets[index[keyOf(r.jour)]];
    if (!b) return;
    if (r.type === 'appel') b.appels += r.n; else b.rdv += r.n;
  });

  return {
    nom: user.nom || 'Commercial',
    email: user.email || '',
    period,
    title: TITLES[period] || 'Rapport',
    periodLabel: label,
    start,
    end,
    monthly,
    unit,
    local,
    sales,
    acts,
    leads,
    buckets,
  };
}

// ---------- Dessin (une seule page A4, lecture facile) ----------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 28;
const CW = PAGE_W - M * 2;
const GAP = 10;
const COL = (CW - GAP) / 2;

function plural(n, one, many) { return `${fmtNum(n)} ${Number(n) > 1 ? many : one}`; }

// Écrit un texte sur une seule ligne (jamais coupé), aligné à gauche ou à droite
function cell(doc, text, x, w, y, align) {
  const t = String(text);
  let size = doc._fontSize;
  while (size > 5 && doc.widthOfString(t) > w) { size -= 0.25; doc.fontSize(size); }
  const tx = align === 'right' ? x + w - doc.widthOfString(t) : x;
  doc.text(t, tx, y, { lineBreak: false });
}

function card(doc, x, y, w, h, title, subtitle) {
  doc.roundedRect(x, y, w, h, 8).lineWidth(0.7).fillAndStroke('#ffffff', '#e9e9e9');
  doc.rect(x + 12, y + 12, 3, 11).fill(ACCENT);
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text(title, x + 20, y + 12, { width: w - 32, lineBreak: false });
  if (subtitle) {
    doc.fillColor('#9ca3af').font('Helvetica').fontSize(6.8).text(subtitle, x + 20, y + 25, { width: w - 32, lineBreak: false });
    return y + 40;
  }
  return y + 32;
}

function header(doc, data) {
  doc.rect(0, 0, PAGE_W, 58).fill(ACCENT);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('SalesTrack', M, 13, { lineBreak: false });
  doc.font('Helvetica').fontSize(10).text(`${data.title}  ·  Généré le ${fmtDate(todayMorocco())}`, M, 35, { lineBreak: false });
  const logo = getLogo();
  if (logo) {
    doc.circle(M + CW - 21, 29, 22).fill('#ffffff');
    doc.image(logo, M + CW - 38, 12, { fit: [34, 34], align: 'center', valign: 'center' });
  }

  const y = 70;
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(14).text(data.nom, M, y, { lineBreak: false });
  doc.fillColor('#6b7280').font('Helvetica').fontSize(8).text(data.email, M, y + 17, { lineBreak: false });

  doc.font('Helvetica-Bold').fontSize(9);
  const chipW = Math.min(CW * 0.62, doc.widthOfString(data.periodLabel) + 24);
  doc.roundedRect(M + CW - chipW, y + 2, chipW, 22, 11).fill(ACCENT_LIGHT);
  doc.fillColor(ACCENT).text(data.periodLabel, M + CW - chipW, y + 9, { width: chipW, align: 'center', lineBreak: false });
  return y + 38;
}

function kpiRow(doc, y, items) {
  const h = 50;
  const gap = 8;
  const bw = (CW - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = M + i * (bw + gap);
    const value = String(it.value);
    doc.roundedRect(x, y, bw, h, 7).fill(ACCENT_LIGHT);
    let size = 15;
    doc.font('Helvetica-Bold').fontSize(size);
    while (size > 8 && doc.widthOfString(value) > bw - 14) { size -= 0.5; doc.fontSize(size); }
    doc.fillColor(it.color).text(value, x + 8, y + 9 + (15 - size) / 2, { lineBreak: false });
    doc.fillColor('#374151').font('Helvetica').fontSize(7.5);
    cell(doc, it.label, x + 8, bw - 14, y + 29);
    if (it.sub) { doc.fillColor('#9ca3af').fontSize(6); cell(doc, it.sub, x + 8, bw - 14, y + 39); }
  });
  return y + h;
}

// Résumé en phrases simples
function summaryBox(doc, y, data) {
  const { sales, local, acts, leads } = data;
  const prenom = data.nom.split(' ')[0];
  const answered = local.reponse.repond + local.reponse.ne_repond_pas;
  const seen = local.presence.present + local.presence.absent;
  const lines = [];

  if (sales.linked && !sales.error) {
    lines.push(`Ventes : ${prenom} a créé ${plural(sales.devis, 'devis', 'devis')} et confirmé ${plural(sales.commandes, 'commande', 'commandes')}`
      + (sales.commandes > 0 ? `, pour un chiffre d'affaires de ${fmtMAD(sales.ca)}.` : ' (aucun chiffre d\'affaires sur la période).'));
  }
  let terrain = `Terrain : ${plural(local.appels, 'appel', 'appels')}`;
  if (answered > 0) terrain += ` (le client a répondu à ${pct(local.reponse.repond, answered)}%)`;
  terrain += ` et ${plural(local.rdv, 'rendez-vous', 'rendez-vous')}`;
  if (seen > 0) terrain += ` (client présent à ${pct(local.presence.present, seen)}%)`;
  lines.push(`${terrain}.`);
  if (leads.linked && !leads.error) {
    let odooLine = `Suivi Odoo : ${plural(leads.pipelineActive, 'opportunité ouverte', 'opportunités ouvertes')}`;
    if (leads.withoutActivity > 0) odooLine += `, dont ${fmtNum(leads.withoutActivity)} sans activité prévue`;
    if (acts.linked && !acts.error && acts.overdue > 0) odooLine += ` · ${plural(acts.overdue, 'activité en retard', 'activités en retard')}`;
    lines.push(`${odooLine}.`);
  }

  const h = 16 + lines.length * 12;
  doc.roundedRect(M, y, CW, h, 8).lineWidth(0.7).fillAndStroke('#ffffff', '#e9e9e9');
  doc.rect(M, y, 4, h).fill(ACCENT);
  let ly = y + 8;
  lines.forEach((l) => {
    const [label, ...rest] = l.split(' : ');
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8.5).text(`${label} : `, M + 14, ly, { continued: true, lineBreak: false });
    doc.font('Helvetica').fillColor('#374151').text(rest.join(' : '), { lineBreak: false });
    ly += 12;
  });
  return y + h;
}

function splitBarAt(doc, x, y, w, title, rawSegments) {
  const segments = rawSegments.filter((s) => !(s.optional && s.value === 0));
  const total = segments.reduce((s, v) => s + v.value, 0);
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text(title, x, y, { lineBreak: false });
  doc.fillColor('#6b7280').font('Helvetica').fontSize(7).text(`Total : ${fmtNum(total)}`, x, y + 0.5, { width: w, align: 'right', lineBreak: false });

  const by = y + 12;
  const bh = 10;
  doc.save();
  doc.roundedRect(x, by, w, bh, 5).clip();
  doc.rect(x, by, w, bh).fill('#eeeeee');
  if (total > 0) {
    let cx = x;
    const visible = segments.filter((s) => s.value > 0);
    visible.forEach((s, i) => {
      const sw = (s.value / total) * w;
      doc.rect(cx, by, Math.max(sw - (i < visible.length - 1 ? 1.5 : 0), 0), bh).fill(s.color);
      cx += sw;
    });
  }
  doc.restore();

  let lx = x;
  let ly = by + bh + 5;
  doc.font('Helvetica').fontSize(7.5);
  segments.forEach((s) => {
    const txt = `${s.label} : ${fmtNum(s.value)} (${pct(s.value, total)}%)`;
    const tw = 9 + doc.widthOfString(txt);
    if (lx + tw > x + w) { lx = x; ly += 11; }
    doc.rect(lx, ly + 1.5, 6, 6).fill(s.color);
    doc.fillColor('#374151').text(txt, lx + 9, ly, { lineBreak: false });
    lx += tw + 12;
  });
  return ly + 16;
}

function niceMax(v) {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return Math.max(4, m * p);
}

function legendAt(doc, rightX, y, series) {
  doc.font('Helvetica').fontSize(7.5);
  let lx = rightX;
  [...series].reverse().forEach((s) => {
    lx -= doc.widthOfString(s.label);
    doc.fillColor('#374151').text(s.label, lx, y, { lineBreak: false });
    lx -= 10;
    doc.rect(lx, y + 1.5, 6, 6).fill(s.color);
    lx -= 14;
  });
}

// Barres verticales avec la valeur écrite au-dessus de chaque barre
function barChartAt(doc, x, y, w, h, buckets, series) {
  const axisW = 26;
  const plotX = x + axisW;
  const plotW = w - axisW;
  const plotH = h - 16;
  const maxVal = niceMax(Math.max(0, ...buckets.flatMap((b) => series.map((s) => b[s.key] || 0))));

  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 4) * i;
    const gy = y + plotH - (plotH * i) / 4;
    doc.moveTo(plotX, gy).lineTo(plotX + plotW, gy).lineWidth(0.5).strokeColor(i === 0 ? '#d1d5db' : '#f1f1f1').stroke();
    doc.fillColor('#9ca3af').font('Helvetica').fontSize(6.5).text(fmtNum(v), x, gy - 3, { width: axisW - 5, align: 'right', lineBreak: false });
  }

  const n = Math.max(buckets.length, 1);
  const gw = plotW / n;
  const bw = Math.min(18, (gw * 0.7) / series.length);
  const step = Math.ceil(n / 14);
  const showValues = n <= 20;

  buckets.forEach((b, i) => {
    const gx = plotX + i * gw + (gw - bw * series.length) / 2;
    series.forEach((s, j) => {
      const v = b[s.key] || 0;
      if (v <= 0) return;
      const bh = Math.max(2, (v / maxVal) * plotH);
      doc.rect(gx + j * bw, y + plotH - bh, Math.max(bw - 1.5, 1), bh).fill(s.color);
      if (showValues) {
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(6.5)
          .text(fmtNum(v), gx + j * bw - 10, y + plotH - bh - 9, { width: bw + 20, align: 'center', lineBreak: false });
      }
    });
    if (i % step === 0) {
      doc.fillColor('#6b7280').font('Helvetica').fontSize(6.5)
        .text(b.label, plotX + i * gw - 12, y + plotH + 5, { width: gw + 24, align: 'center', lineBreak: false });
    }
  });
}

function tableAt(doc, x, y, w, columns, rows, totalRow) {
  const rowH = 14;
  doc.rect(x, y, w, rowH).fill(ACCENT_LIGHT);
  let cx = x;
  columns.forEach((c) => {
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(7);
    cell(doc, c.label, cx + 5, c.w * w - 10, y + 4, c.align);
    cx += c.w * w;
  });
  let ry = y + rowH;
  const all = totalRow ? [...rows, { ...totalRow, isTotal: true }] : rows;
  all.forEach((r, i) => {
    if (r.isTotal) doc.rect(x, ry, w, rowH).fill('#f3f4f6');
    else if (i % 2 === 1) doc.rect(x, ry, w, rowH).fill('#fafafa');
    let rx = x;
    columns.forEach((c) => {
      const val = String(r[c.key] ?? '');
      const muted = !r.isTotal && c.align === 'right' && (val === '0' || val === '0 MAD');
      doc.fillColor(r.isTotal ? '#111827' : muted ? '#c4c4c4' : '#374151')
        .font(r.isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
      cell(doc, val, rx + 5, c.w * w - 10, ry + 4, c.align);
      rx += c.w * w;
    });
    ry += rowH;
  });
  return ry;
}

function stageBars(doc, x, y, w, stages, maxRows = 5) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const labelW = 70;
  const numW = 30;
  const barW = w - labelW - numW - 8;
  stages.slice(0, maxRows).forEach((s, i) => {
    const ry = y + i * 13;
    doc.fillColor('#374151').font('Helvetica').fontSize(7.5).text(s.name, x, ry, { width: labelW, lineBreak: false });
    doc.roundedRect(x + labelW, ry + 1.5, barW, 6, 3).fill('#f1f1f1');
    doc.roundedRect(x + labelW, ry + 1.5, Math.max(4, (s.count / max) * barW), 6, 3).fill(BLUE);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(7.5)
      .text(fmtNum(s.count), x + labelW + barW + 4, ry, { width: numW, align: 'right', lineBreak: false });
  });
  return y + Math.min(stages.length, maxRows) * 13;
}

function note(doc, x, y, w, text) {
  doc.fillColor('#9ca3af').font('Helvetica-Oblique').fontSize(7.5).text(text, x, y, { width: w });
}

// ----- Blocs -----
function terrainBlock(doc, x, y, w, h, local) {
  const top = card(doc, x, y, w, h, 'Appels et rendez-vous', 'Saisis par le commercial dans SalesTrack');
  let cy = top + 2;
  cy = splitBarAt(doc, x + 14, cy, w - 28, 'Appels sortants ou entrants ?', [
    { label: 'Sortants', value: local.sens.sortant, color: BLUE },
    { label: 'Entrants', value: local.sens.entrant, color: PURPLE },
    { label: 'Non précisé', value: local.sens.autre, color: GRAY, optional: true },
  ]);
  cy = splitBarAt(doc, x + 14, cy + 2, w - 28, 'Le client a-t-il répondu ?', [
    { label: 'Oui', value: local.reponse.repond, color: GREEN },
    { label: 'Non', value: local.reponse.ne_repond_pas, color: RED },
    { label: 'Non précisé', value: local.reponse.autre, color: GRAY, optional: true },
  ]);
  splitBarAt(doc, x + 14, cy + 2, w - 28, 'Le client était-il présent au RDV ?', [
    { label: 'Présent', value: local.presence.present, color: GREEN },
    { label: 'Absent', value: local.presence.absent, color: RED },
    { label: 'Non précisé', value: local.presence.autre, color: GRAY, optional: true },
  ]);
}

function fmtRow(b) {
  return { devis: fmtNum(b.devis), commandes: fmtNum(b.commandes), ca: fmtNum(b.ca), appels: fmtNum(b.appels), rdv: fmtNum(b.rdv) };
}

function detailBlock(doc, x, y, w, h, data) {
  const unitTitle = { jour: 'Détail jour par jour', semaine: 'Détail semaine par semaine', mois: 'Détail mois par mois' }[data.unit];
  const top = card(doc, x, y, w, h, unitTitle, 'Les cases grises = aucune activité');
  let buckets = data.buckets;
  let olderRow = null;
  if (buckets.length > 12) {
    const older = buckets.slice(0, buckets.length - 11);
    buckets = buckets.slice(-11);
    olderRow = older.reduce((acc, b) => ({
      devis: acc.devis + b.devis, commandes: acc.commandes + b.commandes, ca: acc.ca + b.ca, appels: acc.appels + b.appels, rdv: acc.rdv + b.rdv,
    }), { devis: 0, commandes: 0, ca: 0, appels: 0, rdv: 0 });
    olderRow.label = `Avant ${buckets[0].tableLabel.toLowerCase()}`;
  }
  const rows = [
    ...(olderRow ? [olderRow] : []).map((b) => ({ periode: b.label, ...fmtRow(b) })),
    ...buckets.map((b) => ({ periode: b.tableLabel, ...fmtRow(b) })),
  ];
  tableAt(doc, x + 10, top, w - 20, [
    { key: 'periode', label: data.unit === 'jour' ? 'Jour' : data.unit === 'semaine' ? 'Semaine' : 'Mois', w: 0.34 },
    { key: 'devis', label: 'Devis', w: 0.12, align: 'right' },
    { key: 'commandes', label: 'Cmd.', w: 0.11, align: 'right' },
    { key: 'ca', label: 'CA MAD', w: 0.17, align: 'right' },
    { key: 'appels', label: 'Appels', w: 0.14, align: 'right' },
    { key: 'rdv', label: 'RDV', w: 0.12, align: 'right' },
  ], rows, {
    periode: 'Total',
    devis: fmtNum(data.sales.devis),
    commandes: fmtNum(data.sales.commandes),
    ca: fmtNum(data.sales.ca),
    appels: fmtNum(data.local.appels),
    rdv: fmtNum(data.local.rdv),
  });
}

function activitiesBlock(doc, x, y, w, h, acts, isGlobal) {
  const top = card(doc, x, y, w, h, 'Activités Odoo', isGlobal ? 'Toutes les activités planifiées dans Odoo' : "Activités dont l'échéance tombe dans la période");
  if (!acts.linked) return note(doc, x + 20, top + 4, w - 40, 'Pas de compte Odoo lié.');
  if (acts.error) return note(doc, x + 20, top + 4, w - 40, 'Connexion Odoo indisponible.');
  if (acts.total === 0) return note(doc, x + 20, top + 4, w - 40, 'Aucune activité sur la période.');
  tableAt(doc, x + 10, top, w - 20, [
    { key: 'label', label: 'Type', w: 0.24 },
    { key: 'total', label: 'Total', w: 0.13, align: 'right' },
    { key: 'done', label: 'Faites', w: 0.16, align: 'right' },
    { key: 'planned', label: 'Prévues', w: 0.16, align: 'right' },
    { key: 'overdue', label: 'En retard', w: 0.16, align: 'right' },
    { key: 'cancelled', label: 'Annulées', w: 0.15, align: 'right' },
  ], acts.byCategory.slice(0, 6).map((c) => ({
    label: c.label, total: fmtNum(c.total), done: fmtNum(c.done), planned: fmtNum(c.planned), overdue: fmtNum(c.overdue), cancelled: fmtNum(c.cancelled),
  })), {
    label: 'Total', total: fmtNum(acts.total), done: fmtNum(acts.done), planned: fmtNum(acts.planned), overdue: fmtNum(acts.overdue), cancelled: fmtNum(acts.cancelled),
  });
}

function leadsBlock(doc, x, y, w, h, leads, isGlobal) {
  const top = card(doc, x, y, w, h, "Liste d'attente et pipeline (Odoo)", "Situation aujourd'hui");
  if (!leads.linked) return note(doc, x + 20, top + 4, w - 40, 'Pas de compte Odoo lié.');
  if (leads.error) return note(doc, x + 20, top + 4, w - 40, 'Connexion Odoo indisponible.');
  let cy = splitBarAt(doc, x + 14, top + 2, w - 28, "Liste d'attente (pistes)", [
    { label: 'Actives', value: leads.waitingActive, color: ACCENT },
    { label: 'Perdues', value: leads.waitingLost, color: GRAY },
  ]);
  cy = splitBarAt(doc, x + 14, cy + 2, w - 28, 'Pipeline (opportunités)', [
    { label: 'Ouvertes', value: leads.pipelineActive, color: BLUE },
    { label: 'Perdues', value: leads.pipelineLost, color: GRAY },
  ]);
  if (!isGlobal) {
    doc.fillColor('#6b7280').font('Helvetica').fontSize(7);
    cell(doc, `Pendant la période - pistes : +${fmtNum(leads.periodWaitingNew)} nouvelles, ${fmtNum(leads.periodWaitingLost)} perdues`, x + 14, w - 28, cy);
    doc.fontSize(7);
    cell(doc, `Pendant la période - opportunités : +${fmtNum(leads.periodPipelineNew)} nouvelles, ${fmtNum(leads.periodPipelineLost)} perdues`, x + 14, w - 28, cy + 10);
    cy += 24;
  }
  const maxRows = Math.floor((y + h - 10 - (cy + 15)) / 13);
  if (leads.byStage.length > 0 && maxRows > 0) {
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text('Opportunités ouvertes, par étape', x + 14, cy + 2, { lineBreak: false });
    stageBars(doc, x + 14, cy + 15, w - 28, leads.byStage, Math.min(5, maxRows));
  }
}

function renderReportPdf(res, data) {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const fileName = `rapport_${data.nom.replace(/\s+/g, '_')}_${data.period}_${data.start}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  doc.pipe(res);

  doc.rect(0, 0, PAGE_W, PAGE_H).fill('#f7f7f5');
  const { sales, local, acts, leads, buckets } = data;
  const isGlobal = data.period === 'global';
  const hasTrend = buckets.length > 1;
  const odooOk = sales.linked && !sales.error;
  const answered = local.reponse.repond + local.reponse.ne_repond_pas;
  const seen = local.presence.present + local.presence.absent;

  let y = header(doc, data) + 4;

  // 1. Chiffres clés
  y = kpiRow(doc, y, [
    { label: 'Devis créés', value: odooOk ? fmtNum(sales.devis) : '-', color: ORANGE_DEVIS },
    { label: 'Commandes confirmées', value: odooOk ? fmtNum(sales.commandes) : '-', color: GREEN },
    { label: "Chiffre d'affaires", value: odooOk ? fmtMAD(sales.ca) : '-', color: ACCENT },
    { label: 'Appels', value: fmtNum(local.appels), color: BLUE, sub: answered > 0 ? `${pct(local.reponse.repond, answered)}% ont répondu` : '' },
    { label: 'Rendez-vous', value: fmtNum(local.rdv), color: PURPLE, sub: seen > 0 ? `${pct(local.presence.present, seen)}% présents` : '' },
  ]);
  y += 8;

  // 2. Résumé en phrases
  y = summaryBox(doc, y, data) + GAP;

  if (hasTrend) {
    // 3. Détail (tableau) | Appels et RDV
    const rowsCount = Math.min(buckets.length, 12) + 1;
    const h3 = Math.max(178, 40 + (rowsCount + 1) * 14 + 10);
    detailBlock(doc, M, y, COL, h3, data);
    terrainBlock(doc, M + COL + GAP, y, COL, h3, local);
    y += h3 + GAP;

    // 4. Graphique devis et commandes (seulement s'il y a des données)
    if (odooOk && (sales.devis + sales.commandes) > 0) {
      const h4 = Math.max(110, Math.min(150, PAGE_H - 30 - y - GAP - 196));
      const chartBuckets = buckets.length > 12 ? buckets.slice(-12) : buckets;
      const sub = buckets.length > 12 ? '12 derniers mois · le chiffre au-dessus de chaque barre = le nombre exact' : 'Le chiffre au-dessus de chaque barre = le nombre exact';
      const top = card(doc, M, y, CW, h4, `Devis et commandes par ${data.unit}`, sub);
      legendAt(doc, M + CW - 14, y + 14, [
        { label: 'Devis créés', color: ORANGE_DEVIS },
        { label: 'Commandes confirmées', color: GREEN },
      ]);
      barChartAt(doc, M + 12, top + 10, CW - 26, y + h4 - top - 22, chartBuckets, [
        { key: 'devis', label: 'Devis', color: ORANGE_DEVIS },
        { key: 'commandes', label: 'Commandes', color: GREEN },
      ]);
      y += h4 + GAP;
    }
  } else {
    const h3 = 178;
    terrainBlock(doc, M, y, COL, h3, local);
    leadsBlock(doc, M + COL + GAP, y, COL, h3, leads, isGlobal);
    y += h3 + GAP;
  }

  // 5. Activités Odoo | Liste d'attente et pipeline
  const bottomH = Math.min(PAGE_H - 30 - y, 210);
  if (hasTrend) {
    activitiesBlock(doc, M, y, COL, bottomH, acts, isGlobal);
    leadsBlock(doc, M + COL + GAP, y, COL, bottomH, leads, isGlobal);
  } else {
    activitiesBlock(doc, M, y, CW, Math.min(bottomH, 60 + (Math.min(acts.byCategory.length, 6) + 2) * 14), acts, isGlobal);
  }

  // Pied de page
  doc.fillColor('#9ca3af').font('Helvetica').fontSize(6.5)
    .text(`SalesTrack · ${data.title} · ${data.nom}`, M, PAGE_H - 20, { lineBreak: false });
  doc.text('Devis : date de création · Commandes et CA : date de confirmation (Odoo)', M, PAGE_H - 20, { width: CW, align: 'right', lineBreak: false });

  doc.end();
}

module.exports = { getReportData, renderReportPdf };
const pool = require('../db');
const PDFDocument = require('pdfkit');
const odoo = require('./odooClient');
const { toMoroccoDate } = odoo;

const ACCENT = '#f86635';
const ACCENT_LIGHT = '#fdf1ec';
const TYPE_LABELS = { appel: 'Appels', rdv: 'Rendez-vous', devis: 'Devis', commande: 'Commandes' };
const PIPELINE_COLORS = ['#f86635', '#3b9edb', '#9b7fe0', '#f2c14e', '#4caf80', '#e05c5c'];
function drawPageBorder(doc) {
  const m = 10;
  doc.rect(m, m, doc.page.width - m * 2, doc.page.height - m * 2)
    .lineWidth(2).strokeColor(ACCENT).stroke();
  doc.rect(m + 4, m + 4, doc.page.width - (m + 4) * 2, doc.page.height - (m + 4) * 2)
    .lineWidth(0.5).strokeColor('#ddd').stroke();
}

function estimateGlobalHeight(data) {
  let h = 52 + 14; // banniere
  h += 16 + 46; // titre SalesTrack + boxes
  h += 26 + (data.odoo.linked && !data.odoo.error ? 46 : 8); // Odoo ventes
  h += 26 + (data.odooActivities.byCategory.length === 0 ? 8 : data.odooActivities.byCategory.length * 19 + 8);
  h += 26 + 46; // Liste d'attente
  h += 26 + (data.odooPipeline.byStage.length === 0 ? 8 : Math.max(60, data.odooPipeline.byStage.length * 10) + 29);
  h += 26 + 46 + 4; // Points
  h += 26 + (data.redemptions.length === 0 ? 8 : Math.min(data.redemptions.length, 5) * 12 + 12 + (data.redemptions.length > 5 ? 10 : 0));
  h += 26 + (data.activities.length === 0 ? 8 : Math.min(data.activities.length, 8) * 12 + 12 + (data.activities.length > 8 ? 10 : 0));
  h += 30; // footer
  return Math.max(500, h + 70);
}

function estimateDailyHeight(data) {
  let h = 52 + 14;
  h += 16 + 46; // resume
  h += 26 + data.quotaProgress.length * 19 + 8; // objectifs
  h += 26 + 20; // classement
  h += 26 + (data.odoo.linked && !data.odoo.error ? 46 : 8); // Odoo ventes
  h += 26 + (data.odooActivitiesToday.byCategory.length === 0 ? 8 : data.odooActivitiesToday.byCategory.length * 19 + 8);
  h += 26 + 46; // Liste attente & pipeline du jour
  h += 26 + (data.activities.length === 0 ? 8 : Math.min(data.activities.length, 10) * 12 + 12 + (data.activities.length > 10 ? 10 : 0));
  h += 30; // footer
  return Math.max(420, h + 70);
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// ---------- Helpers de mise en page ----------

function drawHeader(doc, title, subtitle) {
  const bannerHeight = 52;
  doc.rect(0, 0, doc.page.width, bannerHeight).fill(ACCENT);
  doc.fillColor('#fff').fontSize(15).font('Helvetica-Bold').text('SalesTrack', doc.page.margins.left, 8);
  doc.fontSize(9.5).font('Helvetica').text(title, doc.page.margins.left, 25);
  doc.fontSize(7).fillColor('#ffe8de').text(subtitle, doc.page.margins.left, 39);
  doc.fillColor('#000').font('Helvetica');
  doc.y = bannerHeight + 14;
}

function drawSectionTitle(doc, text, withDivider = true) {
  if (withDivider) {
    const lineY = doc.y;
    doc.moveTo(doc.page.margins.left, lineY)
      .lineTo(doc.page.width - doc.page.margins.right, lineY)
      .lineWidth(0.5)
      .strokeColor('#eee')
      .stroke();
    doc.y = lineY + 10;
  }
  const y = doc.y;
  doc.rect(doc.page.margins.left, y, 3, 10).fill(ACCENT);
  doc.fillColor('#222').fontSize(9.5).font('Helvetica-Bold').text(text, doc.page.margins.left + 8, y - 1);
  doc.y = y + 16;
  doc.fillColor('#000').font('Helvetica');
}

function drawStatBoxes(doc, stats) {
  const startX = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 5;
  const boxWidth = (contentWidth - gap * (stats.length - 1)) / stats.length;
  const boxHeight = 30;
  const y = doc.y;

  stats.forEach((s, i) => {
    const x = startX + i * (boxWidth + gap);
    doc.roundedRect(x, y, boxWidth, boxHeight, 4).fill(ACCENT_LIGHT);
    doc.fillColor(ACCENT).fontSize(11).font('Helvetica-Bold')
      .text(String(s.value), x, y + 5, { width: boxWidth, align: 'center' });
    doc.fillColor('#666').fontSize(6).font('Helvetica')
      .text(s.label, x, y + 19, { width: boxWidth, align: 'center' });
  });

  doc.fillColor('#000');
  doc.y = y + boxHeight + 16;
}

function drawListRows(doc, rows, emptyText, maxRows = 8) {
  doc.fillColor('#000').font('Helvetica');
  if (rows.length === 0) {
    doc.fontSize(7.5).fillColor('#888').text(emptyText);
    doc.y += 8;
    return;
  }
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowHeight = 12;
  const shown = rows.slice(0, maxRows);

  shown.forEach((line, i) => {
    const y = doc.y;
    if (i % 2 === 0) {
      doc.rect(startX, y - 1, width, rowHeight).fill('#faf5f3');
    }
    doc.fillColor('#333').fontSize(7).font('Helvetica')
      .text(line, startX + 4, y + 1.5, { width: width - 8 });
    doc.y = y + rowHeight;
  });

  if (rows.length > maxRows) {
    doc.fontSize(6.5).fillColor('#999')
      .text(`+ ${rows.length - maxRows} autre(s) - voir l'application pour l'historique complet`);
  }
  doc.y += 12;
}

function drawCategoryBars(doc, categories) {
  doc.fillColor('#000').font('Helvetica');
  if (categories.length === 0) {
    doc.fontSize(7.5).fillColor('#888').text('Aucune donnee');
    doc.y += 8;
    return;
  }
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const maxVal = Math.max(...categories.map((c) => c.count), 1);
  const barHeight = 4;

  categories.forEach((c) => {
    const y = doc.y;
    doc.fillColor('#333').fontSize(7).text(c.label, startX, y);
    doc.text(String(c.count), startX, y, { width, align: 'right' });
    doc.y = y + 9;
    const barY = doc.y;
    doc.roundedRect(startX, barY, width, barHeight, 2).fill('#f1ece9');
    const fillWidth = Math.max(3, (c.count / maxVal) * width);
    doc.roundedRect(startX, barY, fillWidth, barHeight, 2).fill(ACCENT);
    doc.y = barY + barHeight + 6;
  });
  doc.fillColor('#000');
  doc.y += 8;
}

function drawQuotaBars(doc, quotaData) {
  doc.fillColor('#000').font('Helvetica');
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const barHeight = 4;

  quotaData.forEach((q) => {
    const y = doc.y;
    doc.fillColor('#333').fontSize(7).text(q.label, startX, y);
    doc.text(`${q.achieved} / ${q.target}  (${q.percent}%)`, startX, y, { width, align: 'right' });
    doc.y = y + 9;
    const barY = doc.y;
    doc.roundedRect(startX, barY, width, barHeight, 2).fill('#f1ece9');
    const fillWidth = Math.max(3, (Math.min(100, q.percent) / 100) * width);
    const color = q.percent >= 100 ? '#4caf80' : ACCENT;
    doc.roundedRect(startX, barY, fillWidth, barHeight, 2).fill(color);
    doc.y = barY + barHeight + 6;
  });
  doc.fillColor('#000');
  doc.y += 8;
}

function drawDonutChart(doc, x, y, radius, segments, centerLabel, centerValue) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let startAngle = -Math.PI / 2;
  const steps = 36;

  if (total <= 0) {
    doc.circle(x, y, radius).fill('#eee');
  } else {
    segments.forEach((seg) => {
      if (seg.value <= 0) return;
      const sweep = (seg.value / total) * Math.PI * 2;
      const endAngle = startAngle + sweep;
      const points = [[x, y]];
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + (sweep * i) / steps;
        points.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
      }
      doc.polygon(...points).fill(seg.color);
      startAngle = endAngle;
    });
  }

  doc.circle(x, y, radius * 0.55).fill('#ffffff');
  doc.fillColor('#222').fontSize(11).font('Helvetica-Bold')
    .text(String(centerValue), x - radius, y - 9, { width: radius * 2, align: 'center' });
  doc.fillColor('#888').fontSize(5.5).font('Helvetica')
    .text(centerLabel, x - radius, y + 4, { width: radius * 2, align: 'center' });
  doc.fillColor('#000');
}

function drawFooter(doc) {
  const bottom = doc.y + 15;
  doc.moveTo(doc.page.margins.left, bottom - 6)
    .lineTo(doc.page.width - doc.page.margins.right, bottom - 6)
    .lineWidth(0.5).strokeColor('#eee').stroke();
  doc.fontSize(6.5).fillColor('#999').font('Helvetica')
    .text('Genere automatiquement par SalesTrack', doc.page.margins.left, bottom);
  doc.fillColor('#000');
}

// ---------- Donnees Odoo - Ventes ----------

async function getOdooStatsRange(odooUserId, fromDate) {
  if (!odooUserId) return { linked: false, error: false, devis: 0, commandes: 0, chiffreAffaires: 0 };
  const cacheKey = `stats-range:${odooUserId}:${fromDate || 'all'}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const domain = [['user_id', '=', odooUserId]];
    if (fromDate) domain.push(['create_date', '>=', fromDate]);

    const orders = await odoo.execute(
      'sale.order', 'search_read', [domain],
      { fields: ['state', 'amount_total', 'create_date'] }
    );

    const filtered = fromDate
      ? orders.filter((o) => toMoroccoDate(o.create_date) >= fromDate.slice(0, 10))
      : orders;

    const devis = filtered.filter((o) => ['draft', 'sent'].includes(o.state)).length;
    const commandesList = filtered.filter((o) => ['sale', 'done'].includes(o.state));
    const commandes = commandesList.length;
    const chiffreAffaires = Math.round(commandesList.reduce((sum, o) => sum + o.amount_total, 0) * 100) / 100;

    const result = { linked: true, error: false, devis, commandes, chiffreAffaires };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Erreur Odoo (rapport):', err.message);
    return { linked: true, error: true, devis: 0, commandes: 0, chiffreAffaires: 0 };
  }
}

async function getOdooStatsToday(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, devis: 0, commandes: 0, chiffreAffaires: 0 };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dateObj = new Date(`${today}T00:00:00Z`);
    const prevDay = new Date(dateObj); prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const nextDay = new Date(dateObj); nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const orders = await odoo.execute(
      'sale.order', 'search_read',
      [[
        ['user_id', '=', odooUserId],
        ['create_date', '>=', `${prevDay.toISOString().slice(0, 10)} 00:00:00`],
        ['create_date', '<=', `${nextDay.toISOString().slice(0, 10)} 23:59:59`],
      ]],
      { fields: ['state', 'amount_total', 'create_date'] }
    );

    const ordersToday = orders.filter((o) => toMoroccoDate(o.create_date) === today);
    const devis = ordersToday.filter((o) => ['draft', 'sent'].includes(o.state)).length;
    const commandesList = ordersToday.filter((o) => ['sale', 'done'].includes(o.state));
    const commandes = commandesList.length;
    const chiffreAffaires = Math.round(commandesList.reduce((sum, o) => sum + o.amount_total, 0) * 100) / 100;

    return { linked: true, error: false, devis, commandes, chiffreAffaires };
  } catch (err) {
    console.error('Erreur Odoo (rapport du jour):', err.message);
    return { linked: true, error: true, devis: 0, commandes: 0, chiffreAffaires: 0 };
  }
}

function renderOdooSection(doc, odooData) {
  drawSectionTitle(doc, 'Donnees Odoo - Ventes');
  if (!odooData.linked) { doc.fontSize(7.5).fillColor('#888').text('Compte non lie a Odoo.'); doc.y += 8; return; }
  if (odooData.error) { doc.fontSize(7.5).fillColor('#888').text('Connexion Odoo indisponible.'); doc.y += 8; return; }
  drawStatBoxes(doc, [
    { label: 'Devis', value: odooData.devis },
    { label: 'Commandes', value: odooData.commandes },
    { label: 'CA (MAD)', value: odooData.chiffreAffaires.toLocaleString('fr-FR') },
  ]);
}

// ---------- Donnees Odoo - Activites ----------

async function getOdooActivitiesSummary(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, total: 0, planned: 0, overdue: 0, done: 0, cancelled: 0, byCategory: [] };
  const cacheKey = `activities-summary:${odooUserId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const records = await odoo.execute(
      'mail.activity', 'search_read',
      [[['user_id', '=', odooUserId]]],
      { fields: ['activity_type_id', 'date_deadline', 'state', 'active', 'activity_cancel'], context: { active_test: false } }
    );

    const done = records.filter((r) => r.active === false && !r.activity_cancel).length;
    const cancelled = records.filter((r) => r.active === false && r.activity_cancel).length;
    const planned = records.filter((r) => r.active !== false && (r.state === 'planned' || r.state === 'today')).length;
    const overdue = records.filter((r) => r.active !== false && r.state === 'overdue').length;

    const categoryMap = {};
    records.forEach((r) => {
      const label = r.activity_type_id ? r.activity_type_id[1] : 'Autre';
      categoryMap[label] = (categoryMap[label] || 0) + 1;
    });
    const byCategory = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

    const result = { linked: true, error: false, total: records.length, planned, overdue, done, cancelled, byCategory };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Erreur Odoo (activites, rapport):', err.message);
    return { linked: true, error: true, total: 0, planned: 0, overdue: 0, done: 0, cancelled: 0, byCategory: [] };
  }
}

async function getOdooActivitiesToday(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, total: 0, byCategory: [] };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const records = await odoo.execute(
      'mail.activity', 'search_read',
      [[['user_id', '=', odooUserId], ['date_deadline', '=', today]]],
      { fields: ['activity_type_id', 'date_deadline', 'active', 'activity_cancel'], context: { active_test: false } }
    );
    const filtered = records.filter((r) => !(r.active === false && r.activity_cancel));

    const categoryMap = {};
    filtered.forEach((r) => {
      const label = r.activity_type_id ? r.activity_type_id[1] : 'Autre';
      categoryMap[label] = (categoryMap[label] || 0) + 1;
    });
    const byCategory = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

    return { linked: true, error: false, total: filtered.length, byCategory };
  } catch (err) {
    console.error('Erreur Odoo (activites du jour, rapport):', err.message);
    return { linked: true, error: true, total: 0, byCategory: [] };
  }
}

function renderOdooActivitiesSection(doc, data, title) {
  drawSectionTitle(doc, title);
  if (!data.linked) { doc.fontSize(7.5).fillColor('#888').text('Compte non lie a Odoo.'); doc.y += 8; return; }
  if (data.error) { doc.fontSize(7.5).fillColor('#888').text('Connexion Odoo indisponible.'); doc.y += 8; return; }
  if (data.byCategory.length === 0) {
    doc.fontSize(7.5).fillColor('#888').text('Aucune activite');
    doc.y += 8;
    return;
  }
  drawCategoryBars(doc, data.byCategory);
}

// ---------- Donnees Odoo - Liste d'attente ----------

async function getOdooWaitingList(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, total: 0, lost: 0 };
  const cacheKey = `waiting-list:${odooUserId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const total = await odoo.execute(
      'crm.lead', 'search_count',
      [[
        '|', ['type', '=', 'lead'], ['type', '=', false],
        ['user_id', '=', odooUserId],
        ['active', '=', true],
      ]]
    );
    const lost = await odoo.execute(
      'crm.lead', 'search_count',
      [[
        '|', ['type', '=', 'lead'], ['type', '=', false],
        ['user_id', '=', odooUserId],
        ['active', '=', false],
      ]],
      { context: { active_test: false } }
    );
    const result = { linked: true, error: false, total, lost };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Erreur Odoo (liste attente, rapport):', err.message);
    return { linked: true, error: true, total: 0, lost: 0 };
  }
}

function renderOdooWaitingListSection(doc, data) {
  drawSectionTitle(doc, "Liste d'attente (Odoo)");
  if (!data.linked) { doc.fontSize(7.5).fillColor('#888').text('Compte non lie a Odoo.'); doc.y += 8; return; }
  if (data.error) { doc.fontSize(7.5).fillColor('#888').text('Connexion Odoo indisponible.'); doc.y += 8; return; }
  drawStatBoxes(doc, [
    { label: 'En attente', value: data.total },
    { label: 'Perdues', value: data.lost },
  ]);
}

async function getOdooWaitingLostToday(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, newToday: 0, lostToday: 0 };
  try {
    const newToday = await odoo.execute(
      'crm.lead', 'search_count',
      [[
        '|', ['type', '=', 'lead'], ['type', '=', false],
        ['user_id', '=', odooUserId],
        ['create_date', '>=', new Date().toISOString().slice(0, 10) + ' 00:00:00'],
      ]]
    );
    const lostToday = await odoo.execute(
      'crm.lead', 'search_count',
      [[
        '|', ['type', '=', 'lead'], ['type', '=', false],
        ['user_id', '=', odooUserId],
        ['active', '=', false],
        ['write_date', '>=', new Date().toISOString().slice(0, 10) + ' 00:00:00'],
      ]],
      { context: { active_test: false } }
    );
    return { linked: true, error: false, newToday, lostToday };
  } catch (err) {
    console.error('Erreur Odoo (liste attente jour, rapport):', err.message);
    return { linked: true, error: true, newToday: 0, lostToday: 0 };
  }
}

async function getOdooPipelineToday(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, newToday: 0, lostToday: 0 };
  try {
    const newToday = await odoo.execute(
      'crm.lead', 'search_count',
      [[
        ['type', '=', 'opportunity'],
        ['user_id', '=', odooUserId],
        ['create_date', '>=', new Date().toISOString().slice(0, 10) + ' 00:00:00'],
      ]]
    );
    const lostToday = await odoo.execute(
      'crm.lead', 'search_count',
      [[
        ['type', '=', 'opportunity'],
        ['user_id', '=', odooUserId],
        ['active', '=', false],
        ['write_date', '>=', new Date().toISOString().slice(0, 10) + ' 00:00:00'],
      ]],
      { context: { active_test: false } }
    );
    return { linked: true, error: false, newToday, lostToday };
  } catch (err) {
    console.error('Erreur Odoo (pipeline jour, rapport):', err.message);
    return { linked: true, error: true, newToday: 0, lostToday: 0 };
  }
}

function renderOdooWaitingPipelineTodaySection(doc, waiting, pipeline) {
  drawSectionTitle(doc, "Liste d'attente & Pipeline du jour (Odoo)");
  if (!waiting.linked && !pipeline.linked) {
    doc.fontSize(7.5).fillColor('#888').text('Compte non lie a Odoo.');
    doc.y += 8;
    return;
  }
  drawStatBoxes(doc, [
    { label: 'Liste attente - nouvelles', value: waiting.newToday },
    { label: 'Liste attente - perdues', value: waiting.lostToday },
    { label: 'Pipeline - nouvelles', value: pipeline.newToday },
    { label: 'Pipeline - perdues', value: pipeline.lostToday },
  ]);
}

async function getOdooLostCount(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, total: 0 };
  const cacheKey = `lost-count:${odooUserId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const total = await odoo.execute(
      'crm.lead', 'search_count',
      [[
        ['type', '=', 'opportunity'],
        ['user_id', '=', odooUserId],
        ['active', '=', false],
      ]],
      { context: { active_test: false } }
    );
    const result = { linked: true, error: false, total };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Erreur Odoo (perdues, rapport):', err.message);
    return { linked: true, error: true, total: 0 };
  }
}

// ---------- Donnees Odoo - Pipeline ----------

async function getOdooPipeline(odooUserId) {
  if (!odooUserId) return { linked: false, error: false, total: 0, withActivity: 0, withoutActivity: 0, byStage: [] };
  const cacheKey = `pipeline:${odooUserId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const leads = await odoo.execute(
      'crm.lead', 'search_read',
      [[['user_id', '=', odooUserId], ['type', '=', 'opportunity'], ['active', '=', true]]],
      { fields: ['name', 'stage_id', 'activity_state'] }
    );
    const stages = await odoo.execute('crm.stage', 'search_read', [[]], { fields: ['id', 'name', 'sequence'] });

    const stageMap = {};
    stages.forEach((s) => { stageMap[s.id] = { name: s.name, sequence: s.sequence, count: 0 }; });

    let withActivity = 0;
    leads.forEach((l) => {
      const stageId = l.stage_id ? l.stage_id[0] : null;
      if (stageId && stageMap[stageId]) stageMap[stageId].count++;
      if (l.activity_state) withActivity++;
    });

    const total = leads.length;
    const withoutActivity = total - withActivity;
    const byStage = Object.values(stageMap)
      .filter((s) => s.count > 0)
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({ name: s.name, count: s.count, percent: total > 0 ? Math.round((s.count / total) * 100) : 0 }));

    const result = {
      linked: true, error: false, total, withActivity, withoutActivity,
      withActivityPercent: total > 0 ? Math.round((withActivity / total) * 100) : 0,
      withoutActivityPercent: total > 0 ? Math.round((withoutActivity / total) * 100) : 0,
      byStage,
    };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Erreur Odoo (pipeline, rapport):', err.message);
    return { linked: true, error: true, total: 0, withActivity: 0, withoutActivity: 0, byStage: [] };
  }
}

function renderOdooPipelineSection(doc, data, lostData) {
  drawSectionTitle(doc, "Pipeline d'opportunites (Odoo)");
  if (!data.linked) { doc.fontSize(7.5).fillColor('#888').text('Compte non lie a Odoo.'); doc.y += 8; return; }
  if (data.error) { doc.fontSize(7.5).fillColor('#888').text('Connexion Odoo indisponible.'); doc.y += 8; return; }
  if (data.byStage.length === 0) {
    doc.fontSize(7.5).fillColor('#888').text('Aucune opportunite');
    doc.y += 8;
    return;
  }

  const segments = data.byStage.map((s, i) => ({ ...s, color: PIPELINE_COLORS[i % PIPELINE_COLORS.length] }));
  const startY = doc.y;
  const radius = 26;
  const centerX = doc.page.margins.left + radius;
  const centerY = startY + radius;

  drawDonutChart(doc, centerX, centerY, radius,
    segments.map((s) => ({ value: s.count, color: s.color })),
    'opportunites', data.total);

  const legendX = doc.page.margins.left + radius * 2 + 15;
  let legendY = startY;
  segments.forEach((s) => {
    doc.rect(legendX, legendY + 1, 6, 6).fill(s.color);
    doc.fillColor('#333').fontSize(7).font('Helvetica')
      .text(`${s.name} - ${s.count} (${s.percent}%)`, legendX + 10, legendY);
    legendY += 10;
  });
  doc.fillColor('#000');

  doc.y = Math.max(startY + radius * 2 + 8, legendY + 4);

  const lostText = lostData && lostData.linked && !lostData.error ? `   |   Perdues : ${lostData.total}` : '';
  doc.fontSize(7).fillColor('#333').font('Helvetica')
    .text(`Avec activite : ${data.withActivity} (${data.withActivityPercent}%)   |   Sans activite : ${data.withoutActivity} (${data.withoutActivityPercent}%)${lostText}`);
  doc.y += 10;
}

// ---------- Objectifs / Classement (SalesTrack) ----------

async function getQuotaProgress(commercialId, typeCounts, odooUserId) {
  const quotasResult = await pool.query(
    'SELECT type, daily_target FROM type_quotas WHERE commercial_id = $1',
    [commercialId]
  );
  const quotas = { appel: 80, rdv: 2, devis: 3, commande: 1 };
  quotasResult.rows.forEach((r) => { quotas[r.type] = r.daily_target; });

  const merged = { ...typeCounts };
  if (odooUserId) {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const dateObj = new Date(`${todayStr}T00:00:00Z`);
      const prevDay = new Date(dateObj); prevDay.setUTCDate(prevDay.getUTCDate() - 1);
      const nextDay = new Date(dateObj); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const orders = await odoo.execute(
        'sale.order', 'search_read',
        [[
          ['user_id', '=', odooUserId],
          ['create_date', '>=', `${prevDay.toISOString().slice(0, 10)} 00:00:00`],
          ['create_date', '<=', `${nextDay.toISOString().slice(0, 10)} 23:59:59`],
        ]],
        { fields: ['state', 'create_date'] }
      );
      const ordersToday = orders.filter((o) => toMoroccoDate(o.create_date) === todayStr);
      merged.devis = (merged.devis || 0) + ordersToday.filter((o) => ['draft', 'sent'].includes(o.state)).length;
      merged.commande = (merged.commande || 0) + ordersToday.filter((o) => ['sale', 'done'].includes(o.state)).length;
    } catch (err) {
      console.error('Erreur Odoo (quota progress, rapport):', err.message);
    }
  }

  return Object.keys(quotas).map((type) => ({
    type,
    label: TYPE_LABELS[type] || type,
    target: quotas[type],
    achieved: merged[type] || 0,
    percent: quotas[type] > 0 ? Math.round(((merged[type] || 0) / quotas[type]) * 100) : 0,
  }));
}

async function getTodayRank(commercialId) {
  const result = await pool.query(
    `SELECT u.id, u.odoo_user_id, COALESCE(COUNT(a.id), 0) as total
     FROM users u
     LEFT JOIN activities a ON a.commercial_id = u.id AND DATE(a.date_activite) = CURRENT_DATE
     WHERE u.role != 'admin' OR u.role IS NULL
     GROUP BY u.id, u.odoo_user_id`
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const dateObj = new Date(`${todayStr}T00:00:00Z`);
  const prevDay = new Date(dateObj); prevDay.setUTCDate(prevDay.getUTCDate() - 1);
  const nextDay = new Date(dateObj); nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  await Promise.all(result.rows.map(async (row) => {
    if (!row.odoo_user_id) return;
    try {
      const orders = await odoo.execute(
        'sale.order', 'search_read',
        [[
          ['user_id', '=', row.odoo_user_id],
          ['create_date', '>=', `${prevDay.toISOString().slice(0, 10)} 00:00:00`],
          ['create_date', '<=', `${nextDay.toISOString().slice(0, 10)} 23:59:59`],
        ]],
        { fields: ['state', 'create_date'] }
      );
      const ordersToday = orders.filter((o) => toMoroccoDate(o.create_date) === todayStr);
      const odooDevis = ordersToday.filter((o) => ['draft', 'sent'].includes(o.state)).length;
      const odooCommande = ordersToday.filter((o) => ['sale', 'done'].includes(o.state)).length;
      row.total = Number(row.total) + odooDevis + odooCommande;
    } catch (err) {
      console.error('Erreur Odoo (rank, rapport):', err.message);
    }
  }));

  result.rows.sort((a, b) => Number(b.total) - Number(a.total));
  const index = result.rows.findIndex((r) => String(r.id) === String(commercialId));
  return { rank: index >= 0 ? index + 1 : null, totalCommercials: result.rows.length };
}

function renderQuotaSection(doc, quotaData) {
  drawSectionTitle(doc, 'Objectifs du jour');
  drawQuotaBars(doc, quotaData);
}

function renderRankSection(doc, rankData) {
  drawSectionTitle(doc, 'Classement du jour');
  if (rankData.rank === null) {
    doc.fontSize(7.5).fillColor('#888').text('Non classe');
  } else {
    doc.fontSize(9).fillColor('#333').font('Helvetica-Bold')
      .text(`${rankData.rank}e sur ${rankData.totalCommercials} commerciaux`);
    doc.font('Helvetica');
  }
  doc.y += 8;
}

// ---------- Rapport global ----------

async function getGlobalReportData(commercialId) {
  const userResult = await pool.query('SELECT nom, email, odoo_user_id FROM users WHERE id = $1', [commercialId]);
  const user = userResult.rows[0];

  const typeResult = await pool.query(
    'SELECT type, COUNT(*) as total FROM activities WHERE commercial_id = $1 GROUP BY type',
    [commercialId]
  );
  const typeCounts = { appel: 0, rdv: 0, devis: 0, commande: 0 };
  let total = 0;
  typeResult.rows.forEach((r) => {
    typeCounts[r.type] = Number(r.total);
    total += Number(r.total);
  });

  const dailyResult = await pool.query(
    `SELECT DISTINCT TO_CHAR(date_activite, 'YYYY-MM-DD') as jour
     FROM activities WHERE commercial_id = $1 ORDER BY jour DESC`,
    [commercialId]
  );
  const daySet = new Set(dailyResult.rows.map((r) => r.jour));
  let streak = 0;
  let missed = 0;
  let cursor = new Date();
  let safety = 0;
  while (safety < 400) {
    const key = cursor.toISOString().split('T')[0];
    if (daySet.has(key)) {
      streak++;
      missed = 0;
    } else {
      missed++;
      if (missed > 1) break;
    }
    cursor.setDate(cursor.getDate() - 1);
    safety++;
  }

  const quizResult = await pool.query(
    `SELECT COALESCE(SUM(best_score), 0) as total FROM (
       SELECT DISTINCT ON (course_id) score as best_score
       FROM quiz_attempts WHERE commercial_id = $1
       ORDER BY course_id, score DESC, completed_at DESC
     ) t`,
    [commercialId]
  );
  const bonusResult = await pool.query(
    'SELECT COALESCE(SUM(points), 0) as total FROM daily_bonus_points WHERE commercial_id = $1',
    [commercialId]
  );
  const spentResult = await pool.query(
    'SELECT COALESCE(SUM(cost_at_redemption), 0) as spent FROM reward_redemptions WHERE commercial_id = $1',
    [commercialId]
  );
  const earned = Number(quizResult.rows[0].total) + Number(bonusResult.rows[0].total);
  const spent = Number(spentResult.rows[0].spent);

  const redemptionsResult = await pool.query(
    `SELECT rr.quantity, rr.cost_at_redemption, rr.redeemed_at, r.title
     FROM reward_redemptions rr JOIN rewards r ON r.id = rr.reward_id
     WHERE rr.commercial_id = $1 ORDER BY rr.redeemed_at DESC`,
    [commercialId]
  );

  const allActivitiesResult = await pool.query(
    `SELECT type, sens, statut, description, date_activite
     FROM activities WHERE commercial_id = $1
     ORDER BY date_activite DESC`,
    [commercialId]
  );

  const [odooData, odooActivities, odooPipeline, odooWaitingList, odooLost] = await Promise.all([
    getOdooStatsRange(user?.odoo_user_id, null),
    getOdooActivitiesSummary(user?.odoo_user_id),
    getOdooPipeline(user?.odoo_user_id),
    getOdooWaitingList(user?.odoo_user_id),
    getOdooLostCount(user?.odoo_user_id),
  ]);

  return {
    nom: user?.nom || 'Inconnu',
    email: user?.email || '',
    typeCounts, total, streak,
    points: { earned, spent, balance: earned - spent },
    redemptions: redemptionsResult.rows,
    activities: allActivitiesResult.rows,
    odoo: odooData,
    odooActivities,
    odooPipeline,
    odooWaitingList,
    odooLost,
  };
}

function renderGlobalReportPdf(res, data) {
  const doc = new PDFDocument({ margin: 26, size: [595.28, estimateGlobalHeight(data)] });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport_global_${data.nom.replace(/\s+/g, '_')}.pdf"`);
  doc.pipe(res);

  drawPageBorder(doc);
  drawHeader(doc, 'Rapport global', `${data.nom} - ${data.email} - genere le ${new Date().toLocaleDateString('fr-FR')}`);

  drawSectionTitle(doc, 'Activites SalesTrack (total)', false);
  drawStatBoxes(doc, [
    { label: TYPE_LABELS.appel, value: data.typeCounts.appel },
    { label: TYPE_LABELS.rdv, value: data.typeCounts.rdv },
    { label: TYPE_LABELS.devis, value: data.typeCounts.devis },
    { label: TYPE_LABELS.commande, value: data.typeCounts.commande },
    { label: 'Total', value: data.total },
    { label: 'Serie (j)', value: data.streak },
  ]);

  renderOdooSection(doc, data.odoo);
  renderOdooActivitiesSection(doc, data.odooActivities, 'Activites Odoo (appels, taches, rappels)');
  renderOdooWaitingListSection(doc, data.odooWaitingList);
  renderOdooPipelineSection(doc, data.odooPipeline, data.odooLost);

  drawSectionTitle(doc, 'Points');
  drawStatBoxes(doc, [
    { label: 'Gagnes', value: data.points.earned },
    { label: 'Depenses', value: data.points.spent },
    { label: 'Solde', value: data.points.balance },
  ]);
  doc.y += 4;

  drawSectionTitle(doc, 'Recompenses echangees');
  const redemptionLines = data.redemptions.map((r) => {
    const date = new Date(r.redeemed_at).toLocaleDateString('fr-FR');
    return `${r.title} x${r.quantity} - ${r.cost_at_redemption} pts - ${date}`;
  });
  drawListRows(doc, redemptionLines, 'Aucune recompense echangee', 5);

  drawSectionTitle(doc, 'Historique des activites (recentes)');
  const activityLines = data.activities.map((a) => {
    const date = new Date(a.date_activite).toLocaleDateString('fr-FR');
    const heure = new Date(a.date_activite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const label = TYPE_LABELS[a.type] || a.type;
    let line = `${date} ${heure}  ${label}`;
    if (a.sens) line += ` (${a.sens})`;
    if (a.statut) line += ` - ${a.statut}`;
    if (a.description) line += ` - ${a.description}`;
    return line;
  });
  drawListRows(doc, activityLines, 'Aucune activite enregistree', 8);

  drawFooter(doc);
  doc.end();
}

// ---------- Rapport du jour ----------

async function getDailyReportData(commercialId) {
  const userResult = await pool.query('SELECT nom, email, odoo_user_id FROM users WHERE id = $1', [commercialId]);
  const user = userResult.rows[0];

  const activitiesResult = await pool.query(
    `SELECT type, sens, statut, description, date_activite
     FROM activities
     WHERE commercial_id = $1 AND DATE(date_activite) = CURRENT_DATE
     ORDER BY date_activite ASC`,
    [commercialId]
  );

  const typeCounts = { appel: 0, rdv: 0, devis: 0, commande: 0 };
  activitiesResult.rows.forEach((a) => {
    if (typeCounts[a.type] !== undefined) typeCounts[a.type]++;
  });

  const [odooData, odooActivitiesToday, quotaProgress, rank, odooWaitingToday, odooPipelineToday] = await Promise.all([
    getOdooStatsToday(user?.odoo_user_id),
    getOdooActivitiesToday(user?.odoo_user_id),
    getQuotaProgress(commercialId, typeCounts),
    getTodayRank(commercialId),
    getOdooWaitingLostToday(user?.odoo_user_id),
    getOdooPipelineToday(user?.odoo_user_id),
  ]);

  return {
    nom: user?.nom || 'Inconnu',
    email: user?.email || '',
    date: new Date(),
    activities: activitiesResult.rows,
    typeCounts,
    total: activitiesResult.rows.length,
    odoo: odooData,
    odooActivitiesToday,
    quotaProgress,
    rank,
    odooWaitingToday,
    odooPipelineToday,
  };
}

function renderDailyReportPdf(res, data) {
  const doc = new PDFDocument({ margin: 26, size: [595.28, estimateDailyHeight(data)] });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport_jour_${data.nom.replace(/\s+/g, '_')}.pdf"`);
  doc.pipe(res);

  drawPageBorder(doc);
  drawHeader(doc, 'Rapport du jour', `${data.nom} - ${data.email} - ${data.date.toLocaleDateString('fr-FR')}`);

  drawSectionTitle(doc, "Resume du jour (SalesTrack)", false);
  drawStatBoxes(doc, [
    { label: TYPE_LABELS.appel, value: data.typeCounts.appel },
    { label: TYPE_LABELS.rdv, value: data.typeCounts.rdv },
    { label: TYPE_LABELS.devis, value: data.typeCounts.devis },
    { label: TYPE_LABELS.commande, value: data.typeCounts.commande },
    { label: 'Total', value: data.total },
  ]);

  renderQuotaSection(doc, data.quotaProgress);
  renderRankSection(doc, data.rank);
  renderOdooSection(doc, data.odoo);
  renderOdooActivitiesSection(doc, data.odooActivitiesToday, 'Activites Odoo du jour');
  renderOdooWaitingPipelineTodaySection(doc, data.odooWaitingToday, data.odooPipelineToday);

  drawSectionTitle(doc, 'Detail des activites');
  const activityLines = data.activities.map((a) => {
    const heure = new Date(a.date_activite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const label = TYPE_LABELS[a.type] || a.type;
    let line = `${heure}  ${label}`;
    if (a.sens) line += ` (${a.sens})`;
    if (a.statut) line += ` - ${a.statut}`;
    if (a.description) line += ` - ${a.description}`;
    return line;
  });
  drawListRows(doc, activityLines, "Aucune activite aujourd'hui", 10);

  drawFooter(doc);
  doc.end();
}

module.exports = { getGlobalReportData, renderGlobalReportPdf, getDailyReportData, renderDailyReportPdf };
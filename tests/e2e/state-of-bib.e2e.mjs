// Tests d'interaction State of BIB dans un vrai navigateur (Chromium).
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
// Playwright est fourni par l'environnement de test (pas une dépendance du projet).
const { chromium, devices } = createRequire(import.meta.url)('playwright');
// Usage : BASE_URL=http://localhost:3000 node tests/e2e/state-of-bib.e2e.mjs [dossier_captures]
// Prérequis : site démarré (pnpm build && pnpm start), Playwright + Chromium.
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const out = process.argv[2] || tmpdir();
const results = [];
const ok = (name, cond, extra='') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/_vercel|status of 404/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  await page.goto(BASE + '/fr/state_of_bib', { waitUntil: 'networkidle' });
  await page.waitForSelector('.sob-map-svg path.country');
  const nCountries = await page.$$eval('.sob-map-svg path.country', els => els.length);
  ok('carte : pays du périmètre dessinés', nCountries > 50, nCountries);
  const header = await page.$eval('.ed-header', e => e.getBoundingClientRect().height);
  ok('hauteur en-tête mesurée', header > 0, header);

  // Sélection au clic dans la liste puis comparaison
  await page.click('.sob-rank-btn >> nth=0');
  await page.waitForTimeout(800);
  let url = new URL(page.url());
  ok('sélection pays → URL', !!url.searchParams.get('country'), url.search);
  ok('pays mis en évidence', (await page.$$('.sob-map-svg path.country.is-selected')).length === 1);
  const transform = await page.$eval('.sob-zoom-layer', g => g.getAttribute('transform'));
  ok('zoom animé vers la sélection', transform && transform !== 'translate(0,0) scale(1)', transform);
  await page.selectOption('.sob-details select >> nth=1', { index: 2 });
  await page.waitForTimeout(500);
  url = new URL(page.url());
  ok('comparaison de deux pays', !!url.searchParams.get('compare') && (await page.$$('.sob-detail-card')).length === 2, url.search);
  await page.screenshot({ path: out + '/map-compare.png' });

  // Changement de métrique : couleurs recalculées, légende mise à jour
  const before = await page.$eval('.sob-legend-ends', e => e.textContent);
  await page.selectOption('.sob-filterbar select >> nth=1', 'devs_active_28d');
  await page.waitForTimeout(700);
  const after = await page.$eval('.sob-legend-ends', e => e.textContent);
  ok('changement de métrique : légende recalculée', before !== after, `${before} → ${after}`);

  // Filtre région cumulé
  await page.selectOption('.sob-filterbar select >> nth=0', 'Caribbean');
  await page.waitForTimeout(600);
  const out1 = await page.$$eval('.sob-map-svg path.country.is-out', els => els.length);
  ok('filtre région : pays hors région atténués', out1 > 40, out1);
  const top = await page.$$eval('.sob-rank-btn .sob-map-aside-name em', els => els.map(e => e.textContent));
  ok('filtres cumulés : classement limité à la région', top.length > 0 && top.every(t => t === 'Caraïbes'), top.join(','));

  // Réinitialisation
  await page.click('.sob-filterbar-actions button:has-text("Réinitialiser")');
  await page.waitForTimeout(800);
  ok('réinitialisation : URL nettoyée', new URL(page.url()).search === '', page.url());
  const t2 = await page.$eval('.sob-zoom-layer', g => g.getAttribute('transform'));
  ok('réinitialisation : vue d’ensemble', !t2 || /scale\(1\)$/.test(t2) || t2 === 'translate(0,0) scale(1)', t2);

  // Zoom par boutons et clavier
  await page.click('.sob-map-tools button >> nth=0');
  await page.waitForTimeout(400);
  const t3 = await page.$eval('.sob-zoom-layer', g => g.getAttribute('transform'));
  ok('zoom bouton', /scale\(1\.5/.test(t3 || ''), t3);
  await page.focus('.sob-map-svg');
  await page.keyboard.press('0');
  await page.waitForTimeout(300);
  const t4 = await page.$eval('.sob-zoom-layer', g => g.getAttribute('transform'));
  ok('clavier : 0 recentre', /scale\(1\)/.test(t4 || ''), t4);

  // Survol carte : infobulle
  const box = await page.$eval('.sob-map-svg path.country[data-iso="NGA"]', p => { const r = p.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
  await page.mouse.move(box.x, box.y);
  await page.waitForTimeout(200);
  const tip = await page.$eval('.sob-map-tooltip', e => ({ o: getComputedStyle(e).opacity, t: e.textContent }));
  ok('infobulle avec métrique', tip.o === '1' && /Nigeria/.test(tip.t), tip.t);

  // Courbes : chargement différé, survol, clavier, lecture, brush
  await page.locator('[aria-busy="true"] >> nth=0').scrollIntoViewIfNeeded();
  await page.waitForSelector('.sob-timeline-svg path.sob-line');
  ok('chargement différé des courbes', (await page.$$('.sob-timeline-svg path.sob-line')).length === 8);
  await page.focus('.sob-timeline-svg');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  const readout = await page.$eval('.sob-chart-readout b', e => e.textContent);
  ok('clavier : lecture mois par mois', /2026/.test(readout), readout);
  await page.keyboard.press('Home');
  await page.click('.sob-chart-tools button:has-text("Lecture")');
  await page.waitForTimeout(1200);
  const cur1 = await page.$eval('.sob-chart-readout b', e => e.textContent);
  const playing = await page.$eval('.sob-chart-tools .sob-icon-btn', e => e.getAttribute('aria-pressed'));
  ok('lecture / pause', playing === 'true' && cur1 !== readout, cur1);
  await page.click('.sob-chart-tools button:has-text("Pause")');
  await page.locator('.sob-brush').scrollIntoViewIfNeeded();
  const brush = await page.$eval('.sob-brush .overlay', r => { const b = r.getBoundingClientRect(); return { x: b.x, y: b.y + b.height/2, w: b.width }; });
  await page.mouse.move(brush.x + brush.w*0.2, brush.y); await page.mouse.down(); await page.mouse.move(brush.x + brush.w*0.6, brush.y, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(500);
  url = new URL(page.url());
  ok('sélection de plage temporelle (brush)', !!url.searchParams.get('from') && !!url.searchParams.get('to'), url.search);
  await page.screenshot({ path: out + '/timeline.png', clip: await page.$eval('.sob-chart', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, width: r.width, height: Math.min(r.height, 800) }; }), fullPage: true });

  // Classement : tri et mise en évidence
  const order1 = await page.$$eval('.sob-eco-card .sob-eco-name', els => els.map(e => e.textContent));
  await page.selectOption('.sob-ranking select', 'growth_rel');
  await page.waitForTimeout(600);
  const order2 = await page.$$eval('.sob-eco-card .sob-eco-name', els => els.map(e => e.textContent));
  ok('tri dynamique du classement', order1.join() !== order2.join(), order2.join(' '));
  await page.click('.sob-eco-select >> nth=0');
  ok('mise en évidence d’un écosystème', new URL(page.url()).searchParams.get('eco') !== null);

  // Cohortes : activation, parts, clavier
  if (await page.$('[aria-busy="true"]')) await page.locator('[aria-busy="true"] >> nth=0').scrollIntoViewIfNeeded();
  await page.waitForSelector('.sob-cohort-svg path.sob-area');
  await page.click('.sob-toggle >> nth=2');
  await page.waitForTimeout(300);
  ok('cohortes : désactivation d’une catégorie', (await page.$$('.sob-cohort-svg path.sob-area')).length === 2);
  await page.click('.sob-cohort .sob-seg button >> nth=1');
  await page.focus('.sob-cohort-svg'); await page.keyboard.press('End');
  const total = await page.$eval('.sob-cohort .sob-chart-readout', e => e.textContent);
  ok('cohortes : parts et lecture clavier', /%/.test(total), total.slice(0, 120));
  await page.screenshot({ path: out + '/cohort.png', clip: await page.$eval('.sob-cohort', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }; }), fullPage: true });

  // URL partageable : rechargement avec les filtres
  const shared = page.url();
  const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p2.goto(shared, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(500);
  ok('URL partageable restaure les filtres', new URL(p2.url()).search === new URL(shared).search, new URL(shared).search);

  // Mouvement réduit
  const p3 = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p3.goto(BASE + '/fr/state_of_bib?country=NGA', { waitUntil: 'networkidle' });
  await p3.waitForTimeout(300);
  const t5 = await p3.$eval('.sob-zoom-layer', g => g.getAttribute('transform'));
  const anim = await p3.$$eval('.sob-draw', els => els.length);
  ok('mouvement réduit : zoom immédiat, pas de tracé animé', /scale/.test(t5 || '') && anim === 0, t5);

  // Mobile tactile
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const m = await ctx.newPage();
  await m.goto(BASE + '/fr/state_of_bib', { waitUntil: 'networkidle' });
  await m.waitForSelector('.sob-map-svg path.country');
  await m.locator('.sob-map-svg').scrollIntoViewIfNeeded();
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  ok('mobile : aucun défilement horizontal', sw <= 390, sw);
  const nga = await m.$eval('.sob-map-svg path.country[data-iso="NGA"]', p => { const r = p.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; });
  await m.touchscreen.tap(nga.x, nga.y);
  await m.waitForTimeout(800);
  ok('mobile : sélection au toucher', new URL(m.url()).searchParams.get('country') === 'NGA', m.url());
  await m.screenshot({ path: out + '/mobile-map.png', fullPage: false });
  const small = await m.$$eval('.sob-filterbar button, .sob-filterbar select, .sob-map-tools button, .sob-rank-btn, .sob-seg button, .sob-toggle', els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).length);
  ok('mobile : cibles tactiles ≥ 44 px', small === 0, small);

  ok('aucune erreur JavaScript', errors.length === 0, errors.slice(0,3).join(' | '));
  await b.close();
  for (const r of results) console.log(r.join(' | '));
  const passed = results.filter(r => r[0]==='PASS').length;
  console.log(`${passed}/${results.length} réussis`);
  process.exitCode = passed === results.length ? 0 : 1;
})().catch(e => { console.error(e); process.exit(1); });

'use strict';
/* پنل «بنگاه‌ها»: فقط برای مدیر اصلی سامانه (حساب مالک بنگاه main).
   ساخت بنگاه جدید (دو مخزن جدا برای هر بنگاه)، اشتراک ۳۰ روزه، سطح‌ها (نقره‌ای/طلایی/پلاتینی)، توکن و لینک دعوت هر بنگاه. */

const TIER_KEYS = ['silver', 'gold', 'platinum'];
const HUES = [210, 145, 30, 280, 350, 180, 55, 320, 100, 250];   // رنگ کادر هر بنگاه
const siteOf = slug => location.origin + location.pathname + '?a=' + slug;
// «۱۲»، «۱۲٫۵»، «12.5» → عدد (میلیون تومان)
const millions = s => parseFloat(String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫/]/g, '.').replace(/[^\d.]/g, '')) || 0;

async function panelAgencies(pt) {
  const O = DB.owner;
  pt.innerHTML = '<div class="spin"></div>';
  try { if (!(await O.load())) return agenciesConnect(pt); }
  catch (e) { pt.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const reg = await O.registry(); REG = reg;
  const tiers = Object.fromEntries(TIER_KEYS.map(k => [k, tierFull(k)]));
  const income = Object.values(reg.tenants || {}).reduce((s, x) => s + (x.history || []).reduce((a, h) => a + (+h.price || 0), 0), 0);
  const planOpts = (withTrial) => opts([...(withTrial ? [['trial', PLANS.trial.name]] : []), ...PAID.map(p => [p, PLANS[p].name]), ...(withTrial ? [['', 'فعلا فعال نشود (بعدا تمدید می‌کنم)']] : [])], withTrial ? 'trial' : 'm1');
  // «اسم | لینک» در هر خط → [{name,url}]
  const parseSearches = txt => String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/(https:\/\/divar\.ir\/\S+)/); return m ? { name: l.replace(m[1], '').replace(/[|،,:-]+\s*$/, '').trim() || 'محدوده', url: m[1] } : null; }).filter(Boolean);
  const list = Object.entries(reg.tenants || {}).sort((a, b) => (b[1].created || '').localeCompare(a[1].created || ''));
  const now = Date.now(), daysLeft = x => x.expires ? Math.ceil((new Date(x.expires) - now) / 864e5) : 0;
  const state = x => x.active === false ? ['متوقف', 'bad'] : daysLeft(x) > 5 ? ['فعال', 'ok'] : daysLeft(x) > 0 ? ['رو به پایان', 'warn'] : ['تمام شده', 'bad'];
  const nActive = list.filter(([, x]) => x.active !== false && daysLeft(x) > 0).length;
  const sel = 'style="width:auto;min-height:32px;padding:3px 8px;font-size:13px"';
  pt.innerHTML = `
    <div class="stats" style="margin-bottom:12px">
      <div class="stat"><small>کل بنگاه‌ها</small><b>${fa(list.length)}</b></div>
      <div class="stat"><small>اشتراک فعال</small><b style="color:var(--ok)">${fa(nActive)}</b></div>
      <div class="stat"><small>نیاز به تمدید</small><b style="color:${list.length - nActive ? 'var(--bad)' : ''}">${fa(list.length - nActive)}</b></div>
      <div class="stat"><small>جمع دریافتی</small><b>${income ? tomanTxt(income) : '۰'}</b></div>
    </div>
    <div id="ag-new-out"></div>
    <details class="card" style="margin-bottom:12px" ${list.length ? '' : 'open'}><summary style="cursor:pointer"><b>${I.plus.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px"')} بنگاه جدید</b></summary>
      <form class="stack" id="ag-new" style="margin-top:10px">
        <div class="grid2"><label class="f"><span>نام بنگاه</span><input name="name" required placeholder="مثلا املاک وطن"></label>
          <label class="f"><span>نام انگلیسی (در آدرس سایت)</span><input name="slug" required dir="ltr" placeholder="vatan" pattern="[a-z][a-z0-9-]{2,24}"></label>
          <label class="f"><span>تلفن دفتر</span><input name="phone" inputmode="tel"></label>
          <label class="f"><span>سطح اشتراک</span><select name="tier">${opts(TIER_KEYS.map(k => [k, tiers[k].name]), 'silver')}</select></label></div>
        <b class="small">مدیر بنگاه</b>
        <div class="grid3"><input name="bname" required placeholder="نام و نام خانوادگی"><input name="bphone" inputmode="tel" placeholder="موبایل"><input name="bpw" required minlength="6" dir="ltr" placeholder="رمز برای او" autocomplete="off"></div>
        <label class="f"><span>بسته اشتراک (قیمت هر بسته در جدول «سطح‌ها و تعرفه‌ها» پایین صفحه)</span><select name="plan">${planOpts(true)}</select></label>
        <label class="f"><span>محدوده دیوار این بنگاه — هر خط: نام محدوده و لینک جستجو در دیوار (دیده‌بان بنگاه فقط از همین‌ها آگهی می‌آورد)</span>
          <textarea name="searches" rows="2" dir="auto" placeholder="آپارتمان فروشی سعادت‌آباد https://divar.ir/s/tehran/buy-apartment/saadat-abad"></textarea></label>
        <button class="btn primary">ساخت بنگاه</button>
        <p class="small muted" style="margin:0">اپ دو مخزن جداگانه برای این بنگاه می‌سازد (اطلاعات محرمانه و آگهی‌ها). بنگاه‌ها به اطلاعات هم دسترسی ندارند.</p>
      </form></details>
    <div class="tbl" id="ag-list">${list.map(([slug, x], i) => { const [st, cls] = state(x), d = daysLeft(x), t = tiers[x.tier] || tiers.silver, hue = HUES[i % HUES.length]; return `
      <div class="card stack" data-slug="${esc(slug)}" style="border:2px solid hsl(${hue} 60% 45%);background:hsla(${hue},70%,50%,.07);margin-bottom:12px">
        <div style="height:6px;border-radius:6px;background:hsl(${hue} 60% 45%);margin:-4px 0 2px"></div>
        <div class="row"><b style="flex:1;font-size:16px">${esc(x.name)}</b>${x.trial && d > 0 ? '<span class="tag warn">آزمایشی</span>' : ''}<span class="tag ${cls}">${st}</span><span class="tag">${esc(t.name)}${PLANS[x.plan] && !x.trial ? ' · ' + PLANS[x.plan].short : ''}</span></div>
        <div class="small muted" dir="ltr" style="text-align:right">${esc(slug)} · ${esc(x.phone || '')}</div>
        <div class="small">${x.expires ? `پایان اشتراک: <b>${new Date(x.expires).toLocaleDateString('fa-IR')}</b> · ${d > 0 ? `${fa(d)} روز مانده` : `${fa(-d)} روز گذشته`}` : 'هنوز فعال نشده'}</div>
        <div class="small" data-boss></div>
        <div class="small muted" data-stats>در حال خواندن آمار…</div>
        <details class="small" data-staffbox><summary style="cursor:pointer"><b>👥 مدیر و مشاوران این بنگاه</b> <span class="muted" data-staffn></span></summary><div class="tbl" data-staff style="margin-top:6px"></div></details>
        <div class="row">
          <select data-plan ${sel}>${planOpts(false)}</select><button class="btn sm primary" data-renew>✅ پول را گرفتم — تمدید</button>
          ${x.active === false ? '<button class="btn sm" data-on>فعال کردن دوباره</button>' : '<button class="btn sm danger" data-off>قطع اشتراک</button>'}
          <select data-tier ${sel}>${opts(TIER_KEYS.map(k => [k, tiers[k].name]), x.tier)}</select></div>
        <div class="row">
          <a class="btn sm" href="${esc(siteOf(slug))}" target="_blank" rel="noopener">سایت بنگاه</a>
          <button class="btn sm" data-copysite>کپی لینک سایت برای مشتری‌ها</button>
          ${O.hasToken(slug) ? '<button class="btn sm" data-invite>لینک دعوت مدیر بنگاه</button>' : ''}</div>
        ${O.hasToken(slug) ? '' : agencyTokenBox(slug, x)}
        <details class="small"><summary style="cursor:pointer"><b>📍 محدوده دیوار</b> <span class="muted">(${fa((x.searches || []).length)} جستجو)</span></summary>
          <div class="stack" style="margin-top:6px"><div class="chips">${(x.searches || []).map(s => `<a class="chip" target="_blank" rel="noopener" href="${esc(s.url)}">${esc(s.name)}</a>`).join('') || '<span class="muted">هنوز محدوده‌ای تعیین نشده؛ دیده‌بان این بنگاه کار نمی‌کند</span>'}</div>
          <textarea data-srch rows="3" dir="auto" placeholder="هر خط: نام محدوده و لینک جستجو در دیوار">${esc((x.searches || []).map(s => s.name + ' ' + s.url).join('\n'))}</textarea>
          <button class="btn sm" data-srchsave style="align-self:flex-start">ذخیره محدوده</button></div></details>
        <div data-out></div>
        ${(x.history || []).length ? `<details class="small"><summary style="cursor:pointer" class="muted">سابقه اشتراک (${fa(x.history.length)}) · جمع ${tomanTxt(x.history.reduce((a, h) => a + (+h.price || 0), 0))}</summary>${x.history.map(h => `<div class="muted">${new Date(h.at).toLocaleDateString('fa-IR')} — ${PLANS[h.plan]?.name || fa(h.days) + ' روز'}${h.tier ? ' · ' + esc((tiers[h.tier] || tiers.silver).name) : ''}${h.plan === 'trial' ? ' · رایگان' : h.price ? ' · ' + tomanTxt(h.price) : ''}</div>`).join('')}</details>` : ''}
      </div>`; }).join('') || '<div class="empty">هنوز بنگاهی نساخته‌اید.</div>'}</div>
    <details class="card" style="margin-top:12px"><summary style="cursor:pointer"><b>⚙️ سطح‌ها و تعرفه‌ها</b> <span class="small muted">· مدیر هر بنگاه همین قیمت‌ها را در تب «تعرفه‌ها» می‌بیند</span></summary>
      <form class="stack" id="ag-tiers" style="margin-top:10px">
        ${TIER_KEYS.map(k => `<div class="stack" style="padding:10px;border-radius:12px;background:var(--sunk)"><div class="grid3"><label class="f"><span>نام</span><input name="${k}-name" value="${esc(tiers[k].name)}"></label>
          <label class="f"><span>آگهی دیوار در روز (۰ = نامحدود)</span><input name="${k}-daily" inputmode="numeric" value="${fa(tiers[k].daily || 0)}"></label>
          <label class="f"><span>سقف ۷ روز (۰ = نامحدود)</span><input name="${k}-weekly" inputmode="numeric" value="${fa(tiers[k].weekly || 0)}"></label>
          <label class="f"><span>سرعت دیده‌بان (ثانیه)</span><select name="${k}-every">${opts([5, 10, 20, 30, 60].map(x => [x, fa(x) + ' ثانیه']), tiers[k].every)}</select></label></div>
          <div class="grid2">${PAID.map(p => `<label class="f"><span>${PLANS[p].name} (میلیون تومان)</span><input name="${k}-${p}" inputmode="decimal" value="${fa((tiers[k].prices[p] || 0) / 1e6)}"></label>`).join('')}</div></div>`).join('')}
        <button class="btn">ذخیره سطح‌ها و قیمت‌ها</button></form></details>
    <details class="card" style="margin-top:12px"><summary style="cursor:pointer"><b>☎️ پشتیبانی</b> <span class="small muted">· به بنگاه‌هایی که اشتراکشان تمام شده نمایش داده می‌شود</span></summary>
      <form class="grid3" id="ag-sup" style="margin-top:10px"><input name="name" placeholder="نام (مثلا پشتیبانی سامانه)" value="${esc(reg.support?.name || '')}"><input name="phone" inputmode="tel" placeholder="شماره تماس" value="${esc(reg.support?.phone || '')}"><button class="btn">ذخیره</button></form></details>`;

  const reload = () => { S.panel = null; panelAgencies(pt); };
  const act = async (btn, fn, ok) => { btn.disabled = true; try { await fn(); toast(ok); reload(); } catch (e) { toast(e.message, 5000); btn.disabled = false; } };
  // آمار هر بنگاه (از مخزن خودش، با توکن مدیر کل)
  for (const [slug] of list) {
    const box = $(`[data-slug="${slug}"] [data-stats]`, pt);
    O.stats(slug).then(s => {
      const card = box.closest('[data-slug]'), tt = tiers[REG.tenants[slug].tier] || tiers.silver, dl = tt.daily, wl = tt.weekly;
      $('[data-boss]', card).innerHTML = s.boss ? `مدیر بنگاه: <b>${esc(s.boss.full_name)}</b>${s.boss.phone ? ` · <a href="tel:${esc(s.boss.phone)}" dir="ltr">${esc(faStr(s.boss.phone))}</a>` : ''}` : '';
      const ag = s.staff.filter(p => !p.boss);
      $('[data-staffn]', card).textContent = `(${fa(ag.length)} مشاور)`;
      $('[data-staff]', card).innerHTML = s.staff.sort((a, b) => b.boss - a.boss).map(p => `<div class="tr" style="padding:6px 0"><div class="mid"><b>${esc(p.full_name)}</b> <span class="tag${p.boss ? ' sale' : ''}">${p.boss ? 'مدیر بنگاه' : 'مشاور'}</span>${p.active ? '' : ' <span class="tag bad">غیرفعال</span>'}
        <div class="muted">${esc(faStr(p.phone || ''))}${p.phone ? ' · ' : ''}عضو از ${p.created_at ? new Date(p.created_at).toLocaleDateString('fa-IR') : '—'} · ${fa(p.listings)} آگهی${p.last_login ? ' · آخرین ورود ' + ago(p.last_login) : ''}</div></div>
        ${p.boss ? '' : `<button class="btn sm danger" data-delst="${esc(p.id)}" data-name="${esc(p.full_name)}">حذف</button>`}</div>`).join('') || '<div class="muted">هنوز کسی عضو نشده</div>';
      $$('[data-delst]', card).forEach(b => b.addEventListener('click', () => {
        if (confirm(`«${b.dataset.name}» از «${REG.tenants[slug].name}» برای همیشه حذف شود؟\nآگهی‌هایش به نام مدیر همان بنگاه می‌ماند.`)) act(b, () => O.removeStaff(slug, b.dataset.delst), 'حذف شد');
      }));
      box.innerHTML = `${fa(s.admins)} مدیر · ${fa(s.agents)} مشاور · ${fa(s.listings)} آگهی (${fa(s.active)} فعال) · دیوار امروز: ${fa(s.divarToday)} از ${dl > 0 ? fa(dl) : 'نامحدود'} · این هفته: ${fa(s.divarWeek || 0)} از ${wl > 0 ? fa(wl) : 'نامحدود'}${s.lastLogin ? ` · آخرین ورود: ${esc(s.lastWho || '')} ${ago(s.lastLogin)}` : ''}`; })
      .catch(e => { box.textContent = 'آمار خوانده نشد: ' + e.message; });
  }
  $$('[data-slug]', pt).forEach(card => {
    const slug = card.dataset.slug, out = $('[data-out]', card);
    $('[data-renew]', card)?.addEventListener('click', e => {
      const x = REG.tenants[slug], p = $('[data-plan]', card).value, price = (tiers[x.tier] || tiers.silver).prices[p] || 0;
      if (confirm(`اشتراک «${x.name}»\nبسته: ${PLANS[p].name} — سطح ${(tiers[x.tier] || tiers.silver).name}\nمبلغ: ${tomanTxt(price)}\nپول را گرفته‌اید و تمدید ثبت شود؟`)) act(e.target, () => O.renew(slug, p), 'تمدید شد ✓');
    });
    $('[data-srchsave]', card).addEventListener('click', e => {
      const raw = $('[data-srch]', card).value, list = parseSearches(raw);
      if (raw.trim() && !list.length) return toast('لینک جستجو باید با https://divar.ir/ شروع شود');
      act(e.target, () => O.setSearches(slug, list), 'محدوده ذخیره شد');
    });
    $('[data-off]', card)?.addEventListener('click', e => { if (confirm('اشتراک این بنگاه همین حالا قطع شود؟ اطلاعاتشان پاک نمی‌شود.')) act(e.target, () => O.setActive(slug, false), 'قطع شد'); });
    $('[data-on]', card)?.addEventListener('click', e => act(e.target, () => O.setActive(slug, true), 'فعال شد'));
    $('[data-tier]', card).addEventListener('change', e => act(e.target, () => O.setTier(slug, e.target.value), 'سطح اشتراک عوض شد'));
    $('[data-copysite]', card).addEventListener('click', () => copyText(siteOf(slug)));
    $('[data-invite]', card)?.addEventListener('click', async e => {
      const pw = prompt('یک رمز برای مدیر این بنگاه بنویسید (حداقل ۶ حرف). رمز قبلی او عوض می‌شود:'); if (pw == null) return;
      if (pw.length < 6) return toast('رمز باید حداقل ۶ حرف باشد');
      e.target.disabled = true;
      try { showInviteBox(out, REG.tenants[slug], await O.bossInvite(slug, pw)); } catch (err) { toast(err.message, 5000); } finally { e.target.disabled = false; }
    });
    bindTokenBox(card, slug, null, reload);
  });
  $('#ag-new').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, b = $('button', f);
    b.disabled = true; b.textContent = 'در حال ساخت مخزن‌ها و فایل‌ها…';
    try {
      const r = await O.createTenant({ name: f.name.value.trim(), slug: f.slug.value.trim(), phone: f.phone.value.trim(), tier: f.tier.value, plan: f.plan.value, searches: parseSearches(f.searches.value), boss: { name: f.bname.value.trim(), phone: f.bphone.value.trim(), pw: f.bpw.value } });
      REG = await O.registry();
      const box = $('#ag-new-out');
      box.innerHTML = `<div class="card stack" style="margin-bottom:12px;border-color:var(--accent)"><h3>✅ «${esc(f.name.value)}» ساخته شد — یک قدم مانده</h3>${agencyTokenBox(r.slug, REG.tenants[r.slug], true)}<div data-out></div></div>`;
      bindTokenBox(box, r.slug, f.bpw.value, null);
      f.reset(); box.scrollIntoView({ behavior: 'smooth' });
      b.disabled = false; b.textContent = 'ساخت بنگاه';
    } catch (err) { toast(err.message, 6000); b.disabled = false; b.textContent = 'ساخت بنگاه'; }
  });
  $('#ag-tiers').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    const t = Object.fromEntries(TIER_KEYS.map(k => [k, { name: f[k + '-name'].value.trim() || DEF_TIERS[k].name, daily: Math.max(0, toNum(f[k + '-daily'].value) || 0), weekly: Math.max(0, toNum(f[k + '-weekly'].value) || 0), every: +f[k + '-every'].value,
      prices: Object.fromEntries(PAID.map(p => [p, Math.round(millions(f[k + '-' + p].value) * 1e6)])) }]));
    act($('button', f), () => O.saveTiers(t), 'سطح‌ها ذخیره شد');
  });
  $('#ag-sup').addEventListener('submit', e => { e.preventDefault(); act($('button', e.target), () => O.saveSupport({ name: e.target.name.value.trim(), phone: e.target.phone.value.trim() }), 'ذخیره شد'); });
}

// ثبت توکن مخصوص یک بنگاه (فقط به دو مخزن همان بنگاه دسترسی دارد)
function agencyTokenBox(slug, x, fresh) {
  const n1 = x.privateRepo.split('/')[1], n2 = x.publicRepo.split('/')[1];
  return `<div class="stack" data-tokbox style="padding:10px;border-radius:12px;background:var(--sunk)">
    <b class="small">${fresh ? 'قدم آخر: ' : '⚠️ '}رمز مخزن (توکن) این بنگاه</b>
    <ol class="small" style="padding-inline-start:18px;margin:0;line-height:1.9">
      <li><a href="https://github.com/settings/personal-access-tokens/new?name=amlak-${encodeURIComponent(slug)}&expires_in=365&contents=write" target="_blank" rel="noopener">این لینک</a> را باز کنید.</li>
      <li>Repository access: <b>Only select repositories</b> ← فقط این دو: <b dir="ltr">${esc(n1)}</b> و <b dir="ltr">${esc(n2)}</b></li>
      <li>Contents: <b>Read and write</b> ← Generate token ← کپی</li></ol>
    <div class="row"><input data-tok dir="ltr" placeholder="github_pat_…" style="flex:1;min-width:180px" autocomplete="off"><button class="btn sm primary" data-toksave>ثبت توکن</button></div></div>`;
}
function bindTokenBox(root, slug, bossPw, after) {
  const btn = $('[data-toksave]', root); if (!btn) return;
  btn.addEventListener('click', async () => {
    const tok = $('[data-tok]', root).value.trim(); if (!tok) return toast('توکن را بچسبانید');
    btn.disabled = true; btn.textContent = 'در حال بررسی…';
    try {
      await DB.owner.setTenantToken(slug, tok);
      toast('توکن ثبت شد ✓');
      if (bossPw) { $('[data-tokbox]', root).remove(); showInviteBox($('[data-out]', root), REG.tenants[slug], await DB.owner.bossInvite(slug, bossPw)); }
      else if (after) after();
    } catch (e) { toast(e.message, 6000); btn.disabled = false; btn.textContent = 'ثبت توکن'; }
  });
}
function showInviteBox(box, x, link) {
  const boss = 'مدیر ' + x.name;
  const msg = `سلام،\nپنل ${x.name} در سامانه املاک آماده است.\nاین لینک را روی گوشی خود باز کنید و رمز را بزنید:\n${link}\nرمز را جداگانه به شما می‌گویم.\n\nسایت آگهی‌های شما برای مشتری‌ها:\n${siteOf(Object.keys(REG.tenants).find(k => REG.tenants[k] === x))}`;
  box.innerHTML = `<div class="stack" style="padding:10px;border-radius:12px;border:1px solid var(--accent)"><b class="small">لینک دعوت ${esc(boss)}</b>
    <p class="small muted" style="margin:0">لینک را بفرستید و <b>رمز را جداگانه</b> بگویید.</p>
    <input readonly dir="ltr" value="${esc(link)}" onclick="this.select()">
    <div class="row"><button class="btn sm" data-cp>کپی لینک</button>${x.phone ? `<a class="btn sm primary" target="_blank" rel="noopener" href="https://wa.me/${esc(waPhone(x.phone))}?text=${encodeURIComponent(msg)}">${I.chat} واتس‌اپ به دفتر</a>` : ''}</div></div>`;
  $('[data-cp]', box).addEventListener('click', () => copyText(link));
}

// یک بار: اتصال «مدیریت کل» (توکنی که به همه مخزن‌های شما دسترسی دارد و می‌تواند مخزن بسازد)
function agenciesConnect(pt) {
  pt.innerHTML = `<div class="card stack" style="max-width:640px">
    <h3>🔐 اتصال مدیریت کل — یک بار</h3>
    <p class="small muted" style="margin:0">برای ساختن بنگاه‌ها، اپ به یک توکن کلی نیاز دارد که فقط روی دستگاه شما و رمزگذاری‌شده با رمز ورود خودتان نگه داشته می‌شود. مشاوران و بنگاه‌ها هرگز آن را نمی‌بینند.</p>
    <ol class="small" style="padding-inline-start:18px;margin:0;line-height:2">
      <li><a href="https://github.com/settings/personal-access-tokens/new?name=amlak-master&expires_in=365&contents=write&administration=write" target="_blank" rel="noopener">این لینک</a> را باز کنید.</li>
      <li>Repository access: <b>All repositories</b></li>
      <li>Permissions: <b>Administration</b> و <b>Contents</b> هر دو روی <b>Read and write</b> ← Generate token ← کپی</li></ol>
    <form class="stack" id="ag-m"><input name="tok" required dir="ltr" placeholder="github_pat_…" autocomplete="off">
      <input name="pw" type="password" required dir="ltr" placeholder="رمز ورود خودتان (برای قفل کردن خزانه)" autocomplete="current-password">
      <button class="btn primary">اتصال</button></form></div>`;
  $('#ag-m').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('button', e.target); b.disabled = true; b.textContent = 'در حال بررسی…';
    try { await DB.owner.setMaster(e.target.tok.value, e.target.pw.value); toast('وصل شد ✓'); panelAgencies(pt); }
    catch (err) { toast(err.message, 6000); b.disabled = false; b.textContent = 'اتصال'; }
  });
}

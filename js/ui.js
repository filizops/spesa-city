// ===== Schermate: menu città, supermercato, Municipio, carrello =====

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const eur = n => Number(n).toFixed(2).replace('.', ',') + ' €';
const fmtDate = iso => { const a = String(iso || '').split('-'); return a.length === 3 ? `${a[2]}/${a[1]}` : '—'; };
const todayIso = () => isoDate(new Date());

const UI = {
  view: null, toastTimer: 0,

  init() {
    $('#cities').innerHTML = Object.keys(CITIES).map(id => {
      const c = CITIES[id];
      return `<button class="city" data-city="${id}"><span class="city-ico">${c.icon}</span><span><b>${esc(c.name)}</b><small>${esc(c.tag)} · ${c.main.length} supermercati</small></span><span class="go">▶</span></button>`;
    }).join('');
    $('#cities').addEventListener('click', e => { const b = e.target.closest('[data-city]'); if (b) startCity(b.dataset.city); });
    $('#btnCity').addEventListener('click', () => showMenu());
    $('#btnCart').addEventListener('click', () => this.open({ kind: 'cart' }));
    $('#sheet').addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) this.act(el.dataset.act, el.dataset); });
    $('#sheet').addEventListener('input', e => {
      if (e.target.id === 'q') { this.view.q = e.target.value; $('#results').innerHTML = this.searchResults(); }
    });
    $('#sheet').addEventListener('change', e => {
      if (e.target.dataset.done) {
        const it = this.cart().find(i => i.id === e.target.dataset.done);
        if (it) { it.done = e.target.checked; State.save(); this.render(true); }
      }
    });
  },

  isOpen() { return !!this.view; },
  cart() { return State.cart[State.city]; },
  inCart(id) { return this.cart().some(i => i.id === id); },

  open(view) { this.view = view; World.stop(); $('#sheet').classList.remove('hidden'); this.render(); },
  close() {
    if (this.view && this.view.from) { this.view = this.view.from; this.render(); return; }
    this.view = null; $('#sheet').classList.add('hidden');
  },
  openBuilding(b) {
    if (b.type === 'hall') this.open({ kind: 'hall', tab: 'best', cat: '', q: '' });
    else this.open({ kind: 'store', sid: b.sid, tab: 'flyer', cat: '' });
  },

  toast(msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => t.classList.remove('show'), ms || 3200);
  },

  updateCart() {
    const n = this.cart().length, el = $('#cartN');
    el.textContent = n; el.classList.toggle('hidden', !n);
  },

  // ----- Azioni -----
  async act(act, d) {
    const v = this.view, city = State.city;
    if (act === 'close') return this.close();
    if (act === 'tab') { v.tab = d.tab; v.cat = ''; return this.render(); }
    if (act === 'cat') { v.cat = d.cat; return this.render(); }
    if (act === 'save') {
      const cart = this.cart(), i = cart.findIndex(x => x.id === d.id);
      if (i >= 0) cart.splice(i, 1);
      else if (OFFER_INDEX[d.id]) { cart.push(this.snapshot(OFFER_INDEX[d.id])); this.toast('Aggiunta al carrello 🛒', 1400); }
      State.save(); this.updateCart(); return this.render(true);
    }
    if (act === 'remove') { State.cart[city] = this.cart().filter(x => x.id !== d.id); State.save(); this.updateCart(); return this.render(true); }
    if (act === 'swap') {
      const cart = this.cart(), i = cart.findIndex(x => x.id === d.id), alt = OFFER_INDEX[d.alt];
      if (i >= 0 && alt) { cart[i] = this.snapshot(alt); State.save(); this.toast('Sostituita con l\'offerta migliore ✓', 1800); }
      return this.render(true);
    }
    if (act === 'clear') {
      if (confirm('Svuotare tutto il carrello?')) { State.cart[city] = []; State.save(); this.updateCart(); this.render(); }
      return;
    }
    if (act === 'fav') {
      const favs = State.favs[city], i = favs.indexOf(d.sid);
      if (i >= 0) favs.splice(i, 1);
      else if (favs.length >= MAX_FAVS) return this.toast(`Puoi tenere al massimo ${MAX_FAVS} preferiti: togline uno prima.`);
      else { favs.push(d.sid); this.toast(`${STORES[d.sid].name} ora ha la sua casetta in città ★`); }
      State.save(); World.build(city); return this.render(true);
    }
    if (act === 'store') return this.open({ kind: 'store', sid: d.sid, tab: 'flyer', cat: '', from: v });
    if (act === 'screen') {
      if (ROUTINE_URL) window.open(ROUTINE_URL, '_blank', 'noopener');
      else this.toast('Lo screening parte dal PC: nell\'app Claude apri le attività programmate, scegli “Spesa City – screening volantini” e premi “Esegui ora”.', 9000);
      return;
    }
    if (act === 'refresh') {
      this.toast('Aggiorno le offerte…', 1500);
      await loadOffers(true);
      this.render();
      this.toast(DATA.source === 'demo'
        ? 'Non ci sono ancora volantini letti: per ora vedi dati dimostrativi.'
        : 'Offerte aggiornate ✓', 4500);
    }
  },

  snapshot(o) {
    return { id: o.id, sid: o.sid, key: o.key, name: o.name, brand: o.brand, qty: o.qty, cat: o.cat, unit: o.unit,
      price: o.price, oldPrice: o.oldPrice, unitPrice: o.unitPrice, validTo: o.validTo, done: false };
  },

  // ----- Pezzi riutilizzabili -----
  pill(sid) {
    const st = STORES[sid] || { name: sid, sign: '#888', text: '#fff' };
    return `<span class="pill" style="background:${st.sign};color:${st.text}">${esc(st.name)}</span>`;
  },
  offerCard(o, showStore) {
    const saved = this.inCart(o.id);
    const sub = [o.brand, o.qty].filter(Boolean).join(' · ') + (o.unitPrice ? ` · ${eur(o.unitPrice)}/${o.unit}` : '');
    return `<div class="offer">
      <div class="o-ico">${(CATS[o.cat] || {}).e || '🛒'}</div>
      <div class="o-main"><div class="o-name">${esc(o.name)}</div><div class="o-sub">${esc(sub)}</div>${showStore ? this.pill(o.sid) : ''}</div>
      <div class="o-price">${o.disc ? `<span class="disc">-${o.disc}%</span>` : ''}<b>${eur(o.price)}</b>${o.oldPrice ? `<s>${eur(o.oldPrice)}</s>` : ''}</div>
      <button class="save${saved ? ' on' : ''}" data-act="save" data-id="${esc(o.id)}" aria-label="${saved ? 'Togli dal carrello' : 'Salva nel carrello'}">${saved ? '✓' : '+'}</button>
    </div>`;
  },
  chips(offers, cur) {
    const present = Object.keys(CATS).filter(k => offers.some(o => o.cat === k));
    return `<div class="chips"><button class="chip${!cur ? ' on' : ''}" data-act="cat" data-cat="">Tutte</button>` +
      present.map(k => `<button class="chip${cur === k ? ' on' : ''}" data-act="cat" data-cat="${k}">${CATS[k].e} ${CATS[k].n}</button>`).join('') + '</div>';
  },
  tabs(list, cur) {
    return list.map(([id, label]) => `<button class="tab${cur === id ? ' on' : ''}" data-act="tab" data-tab="${id}">${label}</button>`).join('');
  },
  empty(msg) { return `<div class="empty">${msg}</div>`; },
  demoNote() {
    return DATA.source === 'demo' ? '<div class="note">⚠️ Dati dimostrativi: prezzi di esempio, non offerte reali.</div>' : '';
  },

  // ----- Disegno delle schermate -----
  render(keepScroll) {
    const v = this.view; if (!v) return;
    const body = $('#sheetBody'), top = body.scrollTop;
    const out = v.kind === 'store' ? this.storeView(v) : v.kind === 'hall' ? this.hallView(v) : this.cartView();
    const head = $('#sheetHead');
    head.style.background = out.bg; head.style.color = out.fg;
    $('#sheetTitle').innerHTML = out.title;
    $('#sheetSub').innerHTML = out.sub || '';
    $('#sheetClose').textContent = v.from ? '←' : '✕';
    $('#sheetTabs').innerHTML = out.tabs || '';
    $('#sheetTabs').classList.toggle('hidden', !out.tabs);
    body.innerHTML = out.body;
    body.scrollTop = keepScroll ? top : 0;
  },

  storeView(v) {
    const st = STORES[v.sid], info = storeInfo(State.city, v.sid), offers = info.offers || [];
    let body = this.demoNote();
    if (info.stale && offers.length) body += '<div class="note">⚠️ Volantino nuovo non trovato all\'ultimo screening: queste offerte potrebbero non essere aggiornate.</div>';
    if (!offers.length) body += this.empty('All\'ultimo screening non c\'erano offerte leggibili per questo supermercato.<br>Puoi guardare il volantino dal link qui sotto.');
    else if (v.tab === 'flyer') {
      const list = offers.filter(o => !v.cat || o.cat === v.cat);
      body += this.chips(offers, v.cat) + list.map(o => this.offerCard(o)).join('');
    } else {
      const top = offers.slice().sort((a, b) => b.disc - a.disc).slice(0, 8);
      body += '<h3>🏆 Gli sconti più forti del volantino</h3>' + top.map(o => this.offerCard(o)).join('');
    }
    if (/^https:\/\//.test(info.flyerUrl || '')) body += `<a class="link" href="${esc(info.flyerUrl)}" target="_blank" rel="noopener">Sfoglia i volantini di ${esc(st.name)} ↗</a>`;
    else if (st.url) body += `<a class="link" href="${st.url}" target="_blank" rel="noopener">Apri il sito ufficiale di ${esc(st.name)} ↗</a>`;
    const white = st.sign.toLowerCase() === '#ffffff';
    return {
      bg: white ? st.text : st.sign, fg: white ? '#ffffff' : st.text,
      title: esc(st.name),
      sub: info.validTo ? `${offers.length} offerte · valide fino al ${fmtDate(info.validTo)}` : '',
      tabs: this.tabs([['flyer', '📰 Volantino'], ['top', '🏆 Top offerte']], v.tab),
      body,
    };
  },

  hallView(v) {
    const city = State.city, all = allOffers(city);
    let body = '';
    if (v.tab === 'best') {
      const list = all.filter(o => !v.cat || o.cat === v.cat);
      const byDisc = (a, b) => b.disc - a.disc || a.price - b.price;
      body += this.demoNote() + this.chips(all, v.cat);
      body += '<h3>🏆 Le 10 migliori offerte della città</h3>' + (list.slice().sort(byDisc).slice(0, 10).map(o => this.offerCard(o, true)).join('') || this.empty('Nessuna offerta.'));
      body += '<h3>⭐ Il meglio di ogni supermercato</h3>';
      const vis = visibleStoreIds(city);
      const order = [...vis, ...cityStoreIds(city).filter(s => !vis.includes(s))];
      for (const sid of order) {
        const top = list.filter(o => o.sid === sid).sort(byDisc).slice(0, 3);
        if (top.length) body += `<div class="group-h">${this.pill(sid)}</div>` + top.map(o => this.offerCard(o)).join('');
      }
    } else if (v.tab === 'search') {
      body += `<input id="q" class="search" type="search" placeholder="Cerca un prodotto: pasta, latte, caffè…" value="${esc(v.q)}" autocomplete="off">` +
        `<div id="results">${this.searchResults()}</div>`;
    } else {
      const favs = State.favs[city];
      body += `<p class="hint">Qui trovi gli altri supermercati di ${esc(CITIES[city].name)}. Segna con ★ fino a ${MAX_FAVS} preferiti: avranno una casetta fissa in città.</p>`;
      for (const sid of CITIES[city].others) {
        const n = (storeInfo(city, sid).offers || []).length, on = favs.includes(sid);
        body += `<div class="other">
          <div class="o-main">${this.pill(sid)}<div class="o-sub">${n} offerte nel volantino${on ? ' · in città ★' : ''}</div></div>
          <button class="btn small" data-act="store" data-sid="${sid}">Offerte</button>
          <button class="star${on ? ' on' : ''}" data-act="fav" data-sid="${sid}" aria-label="Preferito">${on ? '★' : '☆'}</button>
        </div>`;
      }
      body += `<div class="refresh">
        <div><b>Ultimo aggiornamento:</b> ${fmtDate(DATA.updatedAt)}${DATA.source === 'demo' ? ' (dimostrativo)' : ''}</div>
        <button class="btn" data-act="screen">🤖 Rifai lo screening supermercati</button>
        <button class="btn light" data-act="refresh">🔄 Ricarica le offerte</button>
        <p class="hint">Lo screening lo fa Claude sul PC di casa, ogni domenica mattina. Quando ha finito, tocca “Ricarica le offerte”.</p>
      </div>`;
    }
    return {
      bg: '#5b4a8a', fg: '#ffffff', title: '🏛️ Municipio', sub: esc(CITIES[city].name),
      tabs: this.tabs([['best', '🏆 Migliori'], ['search', '🔎 Cerca'], ['others', '🏪 Altri negozi']], v.tab),
      body,
    };
  },

  searchResults() {
    const q = (this.view.q || '').trim().toLowerCase();
    if (q.length < 2) return this.empty('Scrivi almeno 2 lettere per cercare in tutti i volantini della città.');
    const res = allOffers(State.city)
      .filter(o => (o.name + ' ' + (o.brand || '') + ' ' + ((CATS[o.cat] || {}).n || '')).toLowerCase().includes(q))
      .sort((a, b) => (a.unitPrice || a.price) - (b.unitPrice || b.price));
    if (!res.length) return this.empty('Nessuna offerta trovata questa settimana.');
    return `<p class="hint">${res.length} offerte, dalla più conveniente</p>` + res.map(o => this.offerCard(o, true)).join('');
  },

  betterAlt(item) {
    // Confronto per prezzo al kg/litro quando c'è; altrimenti solo fra prodotti dello stesso tipo e della stessa marca.
    if (!item.key) return null;
    const norm = s => String(s || '').trim().toLowerCase();
    let best = null, bestVal = Infinity;
    for (const o of allOffers(State.city)) {
      if (o.key !== item.key || o.sid === item.sid || this.inCart(o.id)) continue;
      let mine, theirs;
      if (o.unitPrice && item.unitPrice) { mine = item.unitPrice; theirs = o.unitPrice; }
      else if (norm(item.brand) && norm(item.brand) === norm(o.brand)) { mine = item.price; theirs = o.price; }
      else continue;
      if (theirs < mine * 0.97 && theirs < bestVal) { best = o; bestVal = theirs; }
    }
    return best;
  },

  cartView() {
    const cart = this.cart(), city = State.city, today = todayIso();
    const head = { bg: '#2a9d8f', fg: '#ffffff', title: '🛒 Il mio carrello', sub: esc(CITIES[city].name) };
    if (!cart.length) return { ...head, body: this.empty('Il carrello è vuoto.<br>Entra in un supermercato e tocca <b>+</b> sulle offerte che ti interessano.') };

    const sids = [...new Set(cart.map(i => i.sid))];
    const total = cart.reduce((s, i) => s + i.price, 0);
    const saved = cart.reduce((s, i) => s + (i.oldPrice ? i.oldPrice - i.price : 0), 0);
    let body = `<div class="summary">
      <div><b>${cart.length}</b><small>offerte</small></div><div><b>${sids.length}</b><small>${sids.length === 1 ? 'negozio' : 'negozi'}</small></div>
      <div><b>${eur(total)}</b><small>totale</small></div><div class="green"><b>${eur(saved)}</b><small>risparmio</small></div></div>`;

    for (const sid of sids) {
      const items = cart.filter(i => i.sid === sid), sub = items.reduce((s, i) => s + i.price, 0);
      body += `<div class="group-h">${this.pill(sid)}<span>${items.length} · ${eur(sub)}</span></div>`;
      for (const it of items) {
        const alt = this.betterAlt(it), old = it.validTo && it.validTo < today;
        body += `<div class="offer cart${it.done ? ' done' : ''}">
          <input type="checkbox" class="check" data-done="${esc(it.id)}" ${it.done ? 'checked' : ''} aria-label="Preso">
          <div class="o-main"><div class="o-name">${esc(it.name)}${old ? ' <span class="exp">scaduta</span>' : ''}</div>
            <div class="o-sub">${esc([it.brand, it.qty].filter(Boolean).join(' · '))}</div></div>
          <div class="o-price"><b>${eur(it.price)}</b>${it.oldPrice ? `<s>${eur(it.oldPrice)}</s>` : ''}</div>
          <button class="save del" data-act="remove" data-id="${esc(it.id)}" aria-label="Rimuovi">✕</button>
        </div>`;
        if (alt) body += `<div class="alt">💡 Da ${this.pill(alt.sid)} costa meno: <b>${eur(alt.price)}</b> <span class="o-sub">(${esc([alt.brand, alt.name, alt.qty].filter(Boolean).join(' · '))}${alt.unitPrice ? `, ${eur(alt.unitPrice)}/${esc(alt.unit)}` : ' — controlla che il formato sia lo stesso'})</span>
          <button class="btn small" data-act="swap" data-id="${esc(it.id)}" data-alt="${esc(alt.id)}">Sostituisci</button></div>`;
      }
    }

    const missed = allOffers(city)
      .filter(o => sids.includes(o.sid) && o.disc >= 35 && !this.inCart(o.id) && !cart.some(i => i.key && i.key === o.key))
      .sort((a, b) => b.disc - a.disc).slice(0, 4);
    if (missed.length) body += '<h3>👀 Già che ci vai… te le sei perse?</h3>' + missed.map(o => this.offerCard(o, true)).join('');
    body += '<button class="btn ghost" data-act="clear">Svuota carrello</button>';
    return { ...head, body };
  },
};

// ----- Avvio -----
function showMenu() {
  UI.view = null; $('#sheet').classList.add('hidden');
  $('#menu').classList.remove('hidden');
}

function startCity(id) {
  State.city = id; State.save();
  $('#menu').classList.add('hidden');
  $('#btnCity').textContent = `${CITIES[id].icon} ${CITIES[id].name} ▾`;
  World.build(id); World.spawn(); World.resize();
  UI.updateCart();
  UI.toast('Tocca dove vuoi andare, oppure trascina il dito per usare il joystick 🕹️', 4500);
}

async function boot() {
  State.load();
  await loadOffers();
  UI.init();
  World.init($('#game'));
  if (State.city) startCity(State.city); else showMenu();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();

// ===== Configurazione: categorie, supermercati, città, stato salvato, offerte =====

const CATS = {
  frutta:    { n: 'Frutta e verdura',  e: '🥦' },
  carne:     { n: 'Carne e pesce',     e: '🥩' },
  latticini: { n: 'Latticini e uova',  e: '🧀' },
  dispensa:  { n: 'Dispensa',          e: '🍝' },
  bevande:   { n: 'Bevande',           e: '🥤' },
  dolci:     { n: 'Colazione e dolci', e: '🍪' },
  surgelati: { n: 'Surgelati',         e: '🧊' },
  casa:      { n: 'Casa e igiene',     e: '🧴' },
};

// sign = colore insegna, text = colore scritta, roof = tetto, wall = muro
const STORES = {
  despar:    { name: 'Despar',       sign: '#00843d', text: '#ffffff', roof: '#c8102e', wall: '#f4efe1', url: 'https://www.despar.it' },
  lidl:      { name: 'Lidl',         sign: '#ffe500', text: '#0050aa', roof: '#0050aa', wall: '#eef2f7', url: 'https://www.lidl.it', discount: true },
  pam:       { name: 'Pam',          sign: '#e4002b', text: '#ffffff', roof: '#f08a00', wall: '#fff3e0', url: 'https://www.pampanorama.it' },
  ipercoop:  { name: 'IperCoop',     sign: '#ffffff', text: '#e30613', roof: '#8e1b1b', wall: '#f1e9e4', url: 'https://www.coopalleanza3-0.it' },
  conad:     { name: 'Conad',        sign: '#ffd100', text: '#d8151b', roof: '#d8151b', wall: '#fff8dc', url: 'https://www.conad.it' },
  esselunga: { name: 'Esselunga',    sign: '#ffffff', text: '#003da5', roof: '#f26b21', wall: '#f3efe6', url: 'https://www.esselunga.it' },
  carrefour: { name: 'Carrefour',    sign: '#004e9f', text: '#ffffff', roof: '#e1251b', wall: '#eef3f8', url: 'https://www.carrefour.it' },
  coop:      { name: 'Coop',         sign: '#e30613', text: '#ffffff', roof: '#7a1f1f', wall: '#f6eeee', url: 'https://www.e-coop.it' },
  eurospin:  { name: 'Eurospin',     sign: '#00428e', text: '#ffd400', roof: '#00306b', wall: '#eef1f6', url: 'https://www.eurospin.it', discount: true },
  aldi:      { name: 'Aldi',         sign: '#00205c', text: '#ffffff', roof: '#f47d20', wall: '#eef2f7', url: 'https://www.aldi.it', discount: true },
  penny:     { name: 'Penny',        sign: '#cd1719', text: '#ffe600', roof: '#8c1012', wall: '#fbf1f1', url: 'https://www.penny.it', discount: true },
  gigante:   { name: 'Il Gigante',   sign: '#e2001a', text: '#ffffff', roof: '#1d6b3a', wall: '#f3f1e7', url: 'https://www.ilgigante.net' },
  bosco:     { name: 'Bosco',        sign: '#1d6b3a', text: '#ffffff', roof: '#6b4a2b', wall: '#f1ecdf', url: null },
  ins:       { name: "In's Mercato", sign: '#e30613', text: '#ffffff', roof: '#f2b705', wall: '#fff6e0', url: 'https://www.insmercato.it', discount: true },
};

const CITIES = {
  milano: {
    name: 'Milano', icon: '⛪', tag: 'La città del Duomo',
    main: ['esselunga', 'carrefour', 'lidl', 'conad'],
    others: ['coop', 'pam', 'eurospin', 'penny', 'aldi', 'gigante'],
    theme: { path: '#c9c4bb', path2: '#b3ada2', hall: 'duomo', sea: false },
  },
  trieste: {
    name: 'Trieste', icon: '⚓', tag: 'La città sul mare',
    main: ['despar', 'lidl', 'pam', 'ipercoop', 'conad'],
    others: ['eurospin', 'aldi', 'bosco', 'ins'],
    theme: { path: '#e6d3a3', path2: '#d3bd87', hall: 'torre', sea: true },
  },
};

const MAX_FAVS = 2;

// ----- Stato salvato sul telefono -----
const State = {
  city: null,
  favs: { milano: [], trieste: [] },
  cart: { milano: [], trieste: [] },
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('spesa-city') || '{}');
      if (s.city && CITIES[s.city]) this.city = s.city;
      for (const c in CITIES) {
        if (s.favs && Array.isArray(s.favs[c])) this.favs[c] = s.favs[c].filter(id => CITIES[c].others.includes(id)).slice(0, MAX_FAVS);
        if (s.cart && Array.isArray(s.cart[c])) this.cart[c] = s.cart[c];
      }
    } catch (e) { /* stato corrotto: si riparte da zero */ }
  },
  save() {
    try { localStorage.setItem('spesa-city', JSON.stringify({ city: this.city, favs: this.favs, cart: this.cart })); } catch (e) {}
  },
};

// ----- Offerte -----
let DATA = null;          // { updatedAt, source, cities: { id: { stores: { id: { validFrom, validTo, offers:[...] } } } } }
const OFFER_INDEX = {};   // id -> offerta

async function loadOffers(bust) {
  let data = null;
  try {
    const r = await fetch('data/offers.json' + (bust ? '?t=' + Date.now() : ''), { cache: 'no-store' });
    if (r.ok) data = await r.json();
  } catch (e) {}
  if (!data || !data.cities) data = makeDemoData();
  DATA = data;
  for (const k in OFFER_INDEX) delete OFFER_INDEX[k];
  for (const c in DATA.cities) {
    const stores = DATA.cities[c].stores || {};
    for (const sid in stores) {
      (stores[sid].offers || []).forEach((o, i) => {
        o.sid = sid; o.city = c;
        o.id = o.id || `${c}-${sid}-${i}`;
        o.validTo = stores[sid].validTo;
        o.disc = o.oldPrice && o.oldPrice > o.price ? Math.round((1 - o.price / o.oldPrice) * 100) : 0;
        OFFER_INDEX[o.id] = o;
      });
    }
  }
}

function storeInfo(city, sid) {
  return (DATA.cities[city] && DATA.cities[city].stores && DATA.cities[city].stores[sid]) || { offers: [] };
}
function cityStoreIds(city) { return [...CITIES[city].main, ...CITIES[city].others]; }
function visibleStoreIds(city) { return [...CITIES[city].main, ...State.favs[city]]; }
function allOffers(city) { return cityStoreIds(city).flatMap(sid => storeInfo(city, sid).offers || []); }

// ----- Dati dimostrativi (usati finché non esiste data/offers.json) -----
const DEMO_CATALOG = [
  // key, nome, marche, quantità, misura, unità, prezzo pieno, categoria
  ['pasta', 'Pasta di semola', ['Barilla', 'De Cecco', 'Rummo', 'Garofalo'], '500 g', 0.5, 'kg', 1.29, 'dispensa'],
  ['passata', 'Passata di pomodoro', ['Mutti', 'Cirio', 'Pomì'], '700 g', 0.7, 'kg', 1.39, 'dispensa'],
  ['olio', "Olio extravergine d'oliva", ['Monini', 'Carapelli', 'Farchioni'], '1 l', 1, 'l', 9.9, 'dispensa'],
  ['tonno', "Tonno all'olio d'oliva", ['Rio Mare', 'Nostromo', 'Mareblu'], '3 x 80 g', 0.24, 'kg', 4.49, 'dispensa'],
  ['riso', 'Riso Carnaroli', ['Scotti', 'Gallo'], '1 kg', 1, 'kg', 3.29, 'dispensa'],
  ['pane', 'Pan bauletto', ['Mulino Bianco', 'Morato'], '400 g', 0.4, 'kg', 1.69, 'dispensa'],
  ['caffe', 'Caffè macinato', ['Lavazza', 'Illy', 'Kimbo', 'Segafredo'], '2 x 250 g', 0.5, 'kg', 6.99, 'dolci'],
  ['biscotti', 'Biscotti frollini', ['Mulino Bianco', 'Galbusera', 'Balocco'], '700 g', 0.7, 'kg', 2.79, 'dolci'],
  ['crema', 'Crema spalmabile alle nocciole', ['Nutella', 'Novi'], '600 g', 0.6, 'kg', 5.49, 'dolci'],
  ['cereali', 'Cereali per la colazione', ["Kellogg's", 'Nestlé'], '375 g', 0.375, 'kg', 3.49, 'dolci'],
  ['latte', 'Latte UHT parzialmente scremato', ['Granarolo', 'Parmalat'], '1 l', 1, 'l', 1.39, 'latticini'],
  ['yogurt', 'Yogurt alla frutta', ['Müller', 'Yomo', 'Danone'], '8 x 125 g', 1, 'kg', 3.19, 'latticini'],
  ['mozzarella', 'Mozzarella', ['Santa Lucia', 'Granarolo', 'Vallelata'], '3 x 125 g', 0.375, 'kg', 3.29, 'latticini'],
  ['parmigiano', 'Parmigiano Reggiano DOP 24 mesi', ['Parmareggio'], '300 g', 0.3, 'kg', 7.9, 'latticini'],
  ['burro', 'Burro', ['Lurpak', 'Prealpi'], '250 g', 0.25, 'kg', 2.99, 'latticini'],
  ['uova', 'Uova fresche medie', ['Le Naturelle', 'AIA'], '10 pezzi', 10, 'pz', 3.29, 'latticini'],
  ['pollo', 'Petto di pollo a fette', ['AIA', 'Amadori', 'Fileni'], 'al kg', 1, 'kg', 10.9, 'carne'],
  ['macinato', 'Macinato di bovino', ['Banco macelleria'], '500 g', 0.5, 'kg', 5.49, 'carne'],
  ['salmone', 'Filetto di salmone', ['Banco pescheria'], '250 g', 0.25, 'kg', 6.99, 'carne'],
  ['prosciutto', 'Prosciutto crudo San Daniele DOP', ['Banco gastronomia'], '100 g', 0.1, 'kg', 4.29, 'carne'],
  ['mele', 'Mele Golden', ['Melinda', 'Marlene'], '1,5 kg', 1.5, 'kg', 2.99, 'frutta'],
  ['banane', 'Banane', ['Chiquita', 'Del Monte'], 'al kg', 1, 'kg', 1.79, 'frutta'],
  ['arance', 'Arance da spremuta', ['Origine Italia'], 'rete 2 kg', 2, 'kg', 2.99, 'frutta'],
  ['zucchine', 'Zucchine', ['Origine Italia'], 'al kg', 1, 'kg', 2.49, 'frutta'],
  ['insalata', 'Insalata in busta', ['Bonduelle', 'DimmidiSì'], '250 g', 0.25, 'kg', 1.89, 'frutta'],
  ['patate', 'Patate', ['Origine Italia'], 'sacco 2 kg', 2, 'kg', 2.79, 'frutta'],
  ['acqua', 'Acqua naturale', ['Levissima', "Sant'Anna", 'San Benedetto'], '6 x 1,5 l', 9, 'l', 2.79, 'bevande'],
  ['cola', 'Cola', ['Coca-Cola', 'Pepsi'], '2 x 1,5 l', 3, 'l', 3.49, 'bevande'],
  ['birra', 'Birra', ['Peroni', 'Moretti', 'Heineken'], '3 x 33 cl', 0.99, 'l', 2.69, 'bevande'],
  ['prosecco', 'Prosecco DOC', ['Mionetto', 'Zonin'], '75 cl', 0.75, 'l', 6.99, 'bevande'],
  ['succo', 'Succo di frutta', ['Yoga', 'Santal'], '1 l', 1, 'l', 1.59, 'bevande'],
  ['pizza', 'Pizza margherita surgelata', ['Buitoni', 'Cameo', 'Italpizza'], '2 pezzi', 2, 'pz', 3.99, 'surgelati'],
  ['gelato', 'Gelato in vaschetta', ['Sammontana', 'Algida'], '500 g', 0.5, 'kg', 3.99, 'surgelati'],
  ['piselli', 'Pisellini surgelati', ['Findus', 'Orogel'], '750 g', 0.75, 'kg', 2.99, 'surgelati'],
  ['bastoncini', 'Bastoncini di merluzzo', ['Findus', 'Frosta'], '450 g', 0.45, 'kg', 4.99, 'surgelati'],
  ['detersivo', 'Detersivo lavatrice liquido', ['Dash', 'Dixan', 'Omino Bianco'], '25 lavaggi', 25, 'lavaggio', 6.99, 'casa'],
  ['carta', 'Carta igienica', ['Scottex', 'Regina', 'Foxy'], '8 rotoli', 8, 'rotolo', 3.99, 'casa'],
  ['piatti', 'Detersivo piatti', ['Svelto', 'Nelsen'], '900 ml', 0.9, 'l', 1.89, 'casa'],
  ['dentifricio', 'Dentifricio', ['Mentadent', 'AZ', 'Colgate'], '75 ml', 1, 'pz', 1.99, 'casa'],
  ['shampoo', 'Shampoo', ['Pantene', 'Garnier'], '250 ml', 1, 'pz', 2.99, 'casa'],
];

function seededRng(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function isoDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function makeDemoData() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const week = isoDate(monday);
  const data = { updatedAt: week, source: 'demo', cities: {} };
  for (const c in CITIES) {
    data.cities[c] = { stores: {} };
    for (const sid of cityStoreIds(c)) {
      const rnd = seededRng(week + c + sid);
      const st = STORES[sid];
      const factor = (st.discount ? 0.84 : 0.96) + rnd() * 0.1;
      const pool = DEMO_CATALOG.slice();
      const offers = [];
      const count = 14 + Math.floor(rnd() * 5);
      for (let i = 0; i < count && pool.length; i++) {
        const [key, name, brands, qty, size, unit, base, cat] = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        const own = st.discount && rnd() < 0.55;
        const brand = own ? 'Marca ' + st.name : brands[Math.floor(rnd() * brands.length)];
        const oldPrice = Math.round(base * factor * (own ? 0.85 : 1) * 20) / 20 - 0.01;
        const disc = 0.15 + rnd() * 0.35;
        const price = Math.max(0.29, Math.round(oldPrice * (1 - disc) * 10) / 10 - 0.01);
        offers.push({
          key, name, brand, qty, cat, unit,
          price: +price.toFixed(2), oldPrice: +oldPrice.toFixed(2),
          unitPrice: +(price / size).toFixed(2),
        });
      }
      data.cities[c].stores[sid] = { validFrom: week, validTo: isoDate(sunday), offers };
    }
  }
  return data;
}

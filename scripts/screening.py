"""Screening volantini: legge da PromoQui le offerte in corso per Milano e Trieste e scrive data/offers.json.

Uso:  python scripts/screening.py
Non inventa nulla: ogni offerta viene dai dati pubblicati nella pagina del volantino.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "offers.json"
BASE = "https://www.promoqui.it"
MAX_FLYERS = 4          # volantini letti per supermercato
MAX_OFFERS = 80         # offerte tenute per supermercato
PAUSE = 0.7             # secondi tra una richiesta e l'altra

# id supermercato -> nomi usati da PromoQui ("slugs": tutti letti; "fallback": solo se gli altri non danno nulla)
STORES = {
    "trieste": {
        "despar": {"slugs": ["despar", "eurospar", "interspar"]},
        "lidl": {"slugs": ["lidl"]},
        "pam": {"slugs": ["pam", "pam-panorama"]},
        "ipercoop": {"slugs": ["ipercoop"], "fallback": ["coop"]},
        "conad": {"slugs": ["conad", "conad-city"], "fallback": ["conad-superstore", "spazio-conad"]},
        "eurospin": {"slugs": ["eurospin"]},
        "aldi": {"slugs": ["aldi"]},
        "bosco": {"slugs": ["bosco", "supermercati-bosco"]},
        "ins": {"slugs": ["ins", "in-s", "ins-mercato"]},
    },
    "milano": {
        "esselunga": {"slugs": ["esselunga"]},
        "carrefour": {"slugs": ["carrefour", "carrefour-market", "carrefour-express"], "fallback": ["carrefour-iper"]},
        "lidl": {"slugs": ["lidl"]},
        "conad": {"slugs": ["conad", "conad-city"], "fallback": ["conad-superstore", "spazio-conad"]},
        "coop": {"slugs": ["coop"], "fallback": ["ipercoop"]},
        "pam": {"slugs": ["pam", "pam-panorama"]},
        "eurospin": {"slugs": ["eurospin"]},
        "penny": {"slugs": ["penny", "penny-market"]},
        "aldi": {"slugs": ["aldi"]},
        "gigante": {"slugs": ["il-gigante"]},
    },
}

# Prodotti confrontabili fra supermercati: (chiave, categoria, espressione sul nome)
KEYS = [
    ("yogurt", "latticini", r"\byog(h)?urt\b"),
    ("pizza", "surgelati", r"\bpizz[ae]\b(?!.*(farina|lievito|base))"),
    ("gelato", "surgelati", r"\bgelat[oi]\b|\bcornett[oi] algida\b"),
    ("bastoncini", "surgelati", r"\bbastoncini\b"),
    ("piselli", "surgelati", r"\bpisell(i|ini)\b"),
    ("detersivo", "casa", r"detersivo.*(lavatrice|bucato|liquido|capi)|\b(dash|dixan)\b"),
    ("piatti", "casa", r"detersivo.*piatti|\bsvelto\b|\bnelsen\b"),
    ("carta", "casa", r"carta igienica|rotoloni"),
    ("dentifricio", "casa", r"\bdentifrici[oi]\b"),
    ("shampoo", "casa", r"\bshampoo\b"),
    ("caffe", "dolci", r"\bcaff[eè]\b|\bcapsule\b|\bcialde\b"),
    ("biscotti", "dolci", r"\bbiscott[oi]\b|\bfrollini\b|\bgocciole\b"),
    ("crema", "dolci", r"\bnutella\b|crema spalmabile|crema.*nocciol"),
    ("cereali", "dolci", r"\bcereali\b|\bmuesli\b|corn flakes"),
    ("latte", "latticini", r"\blatte (uht|fresco|parzialmente|intero|scremato|microfiltrato|alta qualit|senza lattosio|a lunga)"),
    ("mozzarella", "latticini", r"\bmozzarell[ae]\b"),
    ("parmigiano", "latticini", r"parmigiano"),
    ("grana", "latticini", r"grana padano"),
    ("burro", "latticini", r"^burro\b|\bburro (tradizionale|di panna|bavarese)"),
    ("uova", "latticini", r"\buova\b"),
    ("pollo", "carne", r"\bpollo\b"),
    ("macinato", "carne", r"\bmacinato\b|\bhamburger\b"),
    ("salmone", "carne", r"\bsalmone\b"),
    ("crudo", "carne", r"prosciutto crudo|san daniele|prosciutto di parma"),
    ("cotto", "carne", r"prosciutto cotto"),
    ("tonno", "dispensa", r"\btonno\b"),
    ("passata", "dispensa", r"\bpassata\b|polpa.*pomodoro|\bpelati\b"),
    ("olio", "dispensa", r"olio extra ?vergine"),
    ("pasta", "dispensa", r"pasta (di semola|di grano|integrale|trafilata|all'uovo|fresca)|\b(spaghetti|penne|fusilli|rigatoni)\b"),
    ("riso", "dispensa", r"^riso\b|\briso (carnaroli|arborio|basmati|parboiled|ribe|roma)"),
    ("pane", "dispensa", r"pan bauletto|pan ?carr|pane (bianco|integrale|a fette|in cassetta)"),
    ("mele", "frutta", r"\bmele\b"),
    ("banane", "frutta", r"\bbanane\b"),
    ("arance", "frutta", r"\barance\b"),
    ("zucchine", "frutta", r"\bzucchine\b"),
    ("insalata", "frutta", r"\binsalat[ae]\b(?!.*(riso|pasta|mare|pollo|russa))"),
    ("patate", "frutta", r"\bpatate\b(?!.*(fritte|surgel|forno))"),
    ("acqua", "bevande", r"\bacqua (minerale|naturale|frizzante|oligominerale|leggermente)|\b(levissima|sant'anna|san benedetto|vitasnella|uliveto|rocchetta|lete|ferrarelle)\b"),
    ("cola", "bevande", r"coca[- ]cola|\bpepsi\b"),
    ("birra", "bevande", r"\bbirr[ae]\b"),
    ("prosecco", "bevande", r"\bprosecco\b"),
    ("succo", "bevande", r"\bsucc(o|hi)\b|\bnettare\b"),
]

# Categoria generica quando il prodotto non ha una chiave: l'ordine conta
CATS = [
    ("surgelati", r"surgelat|\bfindus\b|\borogel\b|minestrone|sofficini|4 salti|ghiacciol"),
    ("casa", r"detersiv|ammorbident|asciugatutto|scottex|fazzolett|tovagliol|\bsacchi\b|pellicola|alluminio|candeggina|sgrassator|anticalcare|lavastoviglie|pastiglie|spugn|balsamo|bagnoschiuma|bagno ?doccia|doccia|sapone|spazzolin|deodorant|collutorio|assorbenti|pannolin|salviett|crema (viso|mani|corpo)|rasoi|schiuma da barba|cotton|igienizzant|detergent|swiffer|paviment|\bvetri\b|\bwc\b|napisan|\blacca\b|colorazione|per (cani|gatti)|\b(cane|gatto|cani|gatti)\b|crocchette|lettiera|carta forno|bucato|smacchiator|profumator|insetticid"),
    ("dolci", r"cioccolat|merend|\btort[ae]\b|panettone|pandoro|croissant|cornetti|marmellat|confettur|\bmiele\b|fette biscottate|wafer|caramelle|torrone|pralin|zucchero|\bcacao\b|budin|kinder|crostat|tisan|camomilla|plumcake|\bt[eèé] in\b|dolc|pasticc|barrett|creme caramel|tiramis"),
    ("carne", r"tacchino|suino|bovin|vitell|manzo|maiale|salsicc|arrost|bistecc|\bfesa\b|lonza|costine|\bcarne\b|prosciutto|speck|salam|mortadella|bresaola|pancetta|w[uü]rstel|merluzzo|orata|branzino|gamber|\bpesce\b|cozze|vongole|calamari|trota|baccal|cotechino|zampone|affettat|\bcoppa\b|porchetta|coniglio|agnello|spiedini|cotolett|scaloppin|filett|polpo|seppi|sgombro fresco|braciol|fettine|spezzatino|cordon bleu"),
    ("latticini", r"\blatte\b|formaggi|\bgrana\b|\bburro\b|ricotta|mascarpone|stracchino|gorgonzola|\bpanna\b|pecorino|asiago|emmental|provol|scamorza|burrata|philadelphia|montasio|fontina|taleggio|\bbrie\b|\bfeta\b|robiola|crescenza|kefir|skyr|caciotta|latteria|sottilette|fiocchi di latte"),
    ("frutta", r"\bpere\b|\buva\b|clementine|mandarin|limoni|\bkiwi\b|ananas|fragole|cachi|melagran|castagne|radicchio|pomodor(i|ini)|carote|cipoll|finocch|cavol|broccol|spinaci|peperon|melanzan|\bzucca\b|funghi|verdur|\bfrutta\b|carciof|lattuga|rucola|valeriana|\bporri\b|sedano|\baglio\b|\bnoci\b|mandorle|nocciole|pistacchi|avocado|mirtilli|lamponi|datteri"),
    ("bevande", r"\bacqua\b|\bvino\b|spumante|aranciata|fanta|sprite|bibit|aperitiv|aperol|spritz|\bamaro\b|grappa|whisky|vodka|\bgin\b|liquore|champagne|chianti|lambrusco|cabernet|merlot|pinot|chardonnay|energy drink|red bull|gatorade|estath|sciroppo|tonica|limoncello|\brum\b|\bt[eèé] (freddo|verde|al)|\bdoc\b|\bdocg\b|\bigt\b|ribolla|refosco|friulano|barbera|nero d'avola|montepulciano|franciacorta"),
    ("dispensa", r"\bpasta\b|\briso\b|\bolio\b|aceto|legumi|fagioli|\bceci\b|lenticchie|farina|\bsale\b|\bpane\b|\bsugo\b|\bsughi\b|\bpesto\b|maionese|ketchup|\bsals[ae]\b|brodo|\bdado\b|gnocchi|tortellini|ravioli|piadin|crackers|grissini|patatine|olive|sottacet|sottoli|\bmais\b|taralli|polenta|cous ?cous|zupp[ae]|minestr|pangrattato|lievito|spezie|sgombro|acciughe|pur[eè]|tramezzini|focacci|pomodor|snack|pop ?corn|arachidi|tortiglioni|lasagne|cannelloni|schiacciat"),
]


# Articoli non alimentari da scartare anche se il nome contiene una parola "alimentare"
EXCLUDE = (r"macchina|friggitric|albero|addobb|lucine|luci led|giocattol|bambol|\blego\b|peluche|\btv\b|televis|smartphone|tablet|"
           r"aspirapolver|ferro da stiro|frullator|bollitore|tostapane|padell|pentol|coltell|piumin|copert|pigiam|\bcalz|scarpe|"
           r"giacc|magli|trapano|avvitator|valigi|candel|\btazz|bicchier|\bset\b|cuscin|lenzuol|asciugaman|tappet|\bsedi[ae]\b|lampad|"
           r"batterie|\bpile\b|caricator|cuffie|stufa|termoventilat|microonde|\bforno (elettrico|a)\b|bilancia|puzzle|\bgioc(o|hi)\b|console|"
           r"\blibr[oi]\b|su tutti i prodotti|selezione di prodotti|buono sconto|decorazion|ghirland|presepe|portacandel|contenitor|tovaglia\b")


def fetch(path):
    req = urllib.request.Request(BASE + path, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
    })
    time.sleep(PAUSE)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            html = r.read().decode("utf-8", "replace")
    except Exception:
        return None
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))["props"]["pageProps"].get("apiResources") or {}
    except Exception:
        return None


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:40] or "prodotto"


def classify(name, hint):
    low = name.lower()
    if re.search(r"ravioli|tortell|gnocchi|lasagn|cannelloni|tramezzin|panin|piadin|\bsug[oh]|\bpesto\b|risotto|zupp", low):
        return slugify(name), "dispensa"   # piatti pronti e primi: non confrontarli con l'ingrediente
    for key, cat, rx in KEYS:
        if re.search(rx, low):
            return key, cat
    both = low + " | " + hint.lower()
    for cat, rx in CATS:
        if re.search(rx, both):
            return slugify(name), cat
    return None, None


def to_offer(gib, cats, valid_to):
    s = gib.get("settings") or {}
    digits = ((s.get("price_extended") or {}).get("digits") or "").replace(",", ".")
    try:
        price = round(float(digits), 2)
    except ValueError:
        return None
    if price <= 0:
        return None
    title = (gib.get("title") or "").strip()
    brand = (s.get("brand") or "").strip()
    name = title
    if brand and title.lower().startswith(brand.lower() + " - "):
        name = title[len(brand) + 3:].strip()
    elif " - " in title and not brand:
        name = title
    name = re.sub(r"\s+", " ", name).strip()
    if not name or re.search(EXCLUDE, name.lower()):
        return None
    if name.isupper():
        name = name.capitalize()
    key, cat = classify(name, cats.get(str(s.get("shared_category_id")), ""))
    if not cat or (price > 45 and cat not in ("carne", "latticini")):
        return None
    old = None
    try:
        disc = int(gib.get("discount") or 0)
    except (TypeError, ValueError):
        disc = 0
    if -85 <= disc <= -5:
        old = round(price / (1 + disc / 100), 2)
    return {"key": key, "name": name, "brand": brand, "qty": "", "cat": cat, "price": price,
            "oldPrice": old, "unit": None, "unitPrice": None, "validTo": valid_to}


def read_group(city, slugs, today):
    flyers, url = [], None
    for slug in slugs:
        res = fetch(f"/{city}/{slug}")
        for f in (res or {}).get("flyersByRetailer") or []:
            start, end = str(f.get("start_date", ""))[:10], str(f.get("end_date", ""))[:10]
            if not f.get("id"):
                continue
            href = f"/volantino/{slug}/{f['id']}"   # alcuni volantini hanno un link esterno: si usa sempre la pagina interna
            soon = (date.fromisoformat(today) + timedelta(days=2)).isoformat()   # anche i volantini che partono entro 2 giorni
            if start <= soon and today <= end and f["id"] not in [x["id"] for x in flyers]:
                flyers.append({"id": f["id"], "href": href, "start": start, "end": end})
                url = url or f"{BASE}/{city}/{slug}"
    flyers.sort(key=lambda f: f["end"])
    offers, seen, used = [], set(), []
    for f in flyers[:MAX_FLYERS]:
        res = fetch(f["href"])
        if not res:
            continue
        cats = {str(c.get("id")): c.get("name", "") for c in res.get("flyerSharedCategories") or []}
        found = 0
        for gib in (res.get("flyerGibsData") or {}).get("flyerGibs") or []:
            o = to_offer(gib, cats, f["end"])
            if not o:
                continue
            sig = (o["name"].lower(), o["brand"].lower(), o["price"])
            if sig in seen:
                continue
            seen.add(sig)
            offers.append(o)
            found += 1
        if found:
            used.append(f)
    offers.sort(key=lambda o: (o["oldPrice"] is None, -((o["oldPrice"] or o["price"]) / o["price"])))
    return offers[:MAX_OFFERS], used, url


def read_store(city, conf, today):
    """Restituisce (offerte, validFrom, validTo, url) leggendo i volantini validi oggi."""
    url = None
    for slugs in (conf["slugs"], conf.get("fallback", [])):
        if not slugs:
            continue
        offers, used, u = read_group(city, slugs, today)
        url = url or u
        if offers:
            return offers, min(f["start"] for f in used), max(f["end"] for f in used), u
    return [], None, None, url


def main():
    today = date.today().isoformat()
    try:
        previous = json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        previous = {}
    data = {"updatedAt": today, "source": "ai", "cities": {}}
    total, report = 0, []
    for city, stores in STORES.items():
        data["cities"][city] = {"stores": {}}
        for sid, conf in stores.items():
            offers, start, end, url = read_store(city, conf, today)
            entry = {"validFrom": start, "validTo": end, "flyerUrl": url, "stale": False, "offers": offers}
            if not offers:
                old = previous.get("cities", {}).get(city, {}).get("stores", {}).get(sid) or {}
                if old.get("offers") and str(old.get("validTo", "")) >= today:
                    entry = dict(old, stale=True)
                else:
                    entry = {"validFrom": None, "validTo": None, "flyerUrl": url, "stale": True, "offers": []}
            data["cities"][city]["stores"][sid] = entry
            n = len(entry["offers"])
            total += n
            note = " (dati della volta scorsa)" if entry["stale"] and n else (" NESSUN VOLANTINO TROVATO" if not n else "")
            report.append(f"  {city:8} {sid:10} {n:3} offerte, fino al {entry['validTo'] or '-'}{note}")
            print(report[-1], flush=True)
    if total == 0:
        print("Nessuna offerta letta: data/offers.json non viene modificato.")
        return 1
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Scritto {OUT} con {total} offerte.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

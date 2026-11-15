"""Controlla che data/offers.json rispetti il formato atteso dall'app. Esce con codice 1 se trova errori."""
import json
import re
import sys
from pathlib import Path

EXPECTED = {
    "trieste": ["despar", "lidl", "pam", "ipercoop", "conad", "eurospin", "aldi", "bosco", "ins"],
    "milano": ["esselunga", "carrefour", "lidl", "conad", "coop", "pam", "eurospin", "penny", "aldi", "gigante"],
}
CATS = {"frutta", "carne", "latticini", "dispensa", "bevande", "dolci", "surgelati", "casa"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def main():
    path = Path(__file__).resolve().parent.parent / "data" / "offers.json"
    errors = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # file mancante o JSON non valido
        print(f"ERRORE: impossibile leggere {path}: {exc}")
        return 1

    if not DATE.match(str(data.get("updatedAt", ""))):
        errors.append("updatedAt deve essere una data AAAA-MM-GG")
    if data.get("source") != "ai":
        errors.append('source deve essere "ai"')

    total = 0
    for city, store_ids in EXPECTED.items():
        stores = data.get("cities", {}).get(city, {}).get("stores")
        if not isinstance(stores, dict):
            errors.append(f"{city}: manca cities.{city}.stores")
            continue
        for sid in store_ids:
            where = f"{city}/{sid}"
            st = stores.get(sid)
            if not isinstance(st, dict) or not isinstance(st.get("offers"), list):
                errors.append(f"{where}: supermercato mancante o senza lista offers")
                continue
            if st["offers"]:
                for field in ("validFrom", "validTo"):
                    if not DATE.match(str(st.get(field, ""))):
                        errors.append(f"{where}: {field} deve essere una data AAAA-MM-GG")
            for i, o in enumerate(st["offers"]):
                tag = f"{where} offerta {i + 1}"
                if not isinstance(o, dict):
                    errors.append(f"{tag}: non è un oggetto")
                    continue
                if not str(o.get("name", "")).strip():
                    errors.append(f"{tag}: name vuoto")
                if o.get("cat") not in CATS:
                    errors.append(f"{tag}: cat non valida ({o.get('cat')!r})")
                if not is_num(o.get("price")) or o["price"] <= 0:
                    errors.append(f"{tag}: price deve essere un numero positivo")
                old = o.get("oldPrice")
                if old is not None and (not is_num(old) or (is_num(o.get("price")) and old < o["price"])):
                    errors.append(f"{tag}: oldPrice deve essere null o un numero >= price")
                up = o.get("unitPrice")
                if up is not None and (not is_num(up) or up <= 0 or not o.get("unit")):
                    errors.append(f"{tag}: unitPrice deve essere null o un numero positivo con unit")
                key = o.get("key")
                if not isinstance(key, str) or not re.match(r"^[a-z0-9-]+$", key):
                    errors.append(f"{tag}: key deve essere minuscola senza spazi")
                total += 1
        extra = set(stores) - set(store_ids)
        if extra:
            errors.append(f"{city}: supermercati non previsti: {sorted(extra)}")

    if total == 0:
        errors.append("nessuna offerta in tutto il file")
    for e in errors[:60]:
        print("ERRORE:", e)
    if errors:
        print(f"{len(errors)} errori.")
        return 1
    print(f"OK: {total} offerte valide.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

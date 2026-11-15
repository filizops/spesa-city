# Screening volantini — istruzioni per Claude

Queste istruzioni sono eseguite da un'attività programmata di Claude sul PC (ogni domenica, o a richiesta).
Obiettivo: riscrivere `data/offers.json` con le offerte reali dei volantini in corso, poi pubblicarlo.

## Regola numero uno

**Non inventare mai prodotti o prezzi.** Ogni offerta deve venire da un volantino o da una pagina offerte
che hai effettivamente letto in questa esecuzione. Se di un supermercato non riesci a leggere nulla di affidabile,
non riempire con dati plausibili: applica la regola "Se un volantino non si trova" più sotto.

## Supermercati da coprire

| Città (id) | Supermercati (id) |
|---|---|
| `trieste` | `despar`, `lidl`, `pam`, `ipercoop`, `conad`, `eurospin`, `aldi`, `bosco`, `ins` |
| `milano` | `esselunga`, `carrefour`, `lidl`, `conad`, `coop`, `pam`, `eurospin`, `penny`, `aldi`, `gigante` |

I nomi completi e i siti ufficiali sono in `js/data.js` (oggetto `STORES`). Usa esattamente questi id.

## Come procedere

1. Per ogni coppia città/supermercato cerca il volantino **valido oggi** per quella città
   (i volantini cambiano per zona: scegli un punto vendita di Trieste o di Milano, non uno generico di un'altra regione).
   Parti dal sito ufficiale; se non è leggibile, usa pagine pubbliche che riportano lo stesso volantino.
2. Estrai da 15 a 40 offerte per supermercato, privilegiando alimentari e prodotti per la casa di uso comune
   e gli sconti più forti. Salta elettronica, abbigliamento, giardinaggio e simili.
3. Scrivi `data/offers.json` nel formato sotto.
4. Esegui `python scripts/validate_offers.py` e correggi finché non passa.
5. Fai commit del solo file `data/offers.json` su `main` con messaggio `Screening volantini AAAA-MM-GG` e fai push.
6. Nel messaggio finale elenca, per città, quante offerte hai trovato per supermercato e quali sono rimasti senza volantino.

## Formato di `data/offers.json`

```json
{
  "updatedAt": "2026-11-15",
  "source": "ai",
  "cities": {
    "trieste": {
      "stores": {
        "despar": {
          "validFrom": "2026-11-12",
          "validTo": "2026-11-25",
          "flyerUrl": "https://… pagina da cui hai letto le offerte",
          "stale": false,
          "offers": [
            {
              "key": "pasta",
              "name": "Pasta di semola",
              "brand": "Barilla",
              "qty": "500 g",
              "cat": "dispensa",
              "price": 0.79,
              "oldPrice": 1.19,
              "unit": "kg",
              "unitPrice": 1.58
            }
          ]
        }
      }
    }
  }
}
```

Campi di ogni offerta:

- `name`: nome del prodotto in italiano, senza marca e senza quantità.
- `brand`: marca (stringa vuota se non indicata).
- `qty`: formato come scritto sul volantino (`500 g`, `6 x 1,5 l`, `al kg`).
- `cat`: una tra `frutta`, `carne`, `latticini`, `dispensa`, `bevande`, `dolci`, `surgelati`, `casa`.
- `price`: prezzo in offerta, numero in euro.
- `oldPrice`: prezzo pieno **solo se il volantino lo riporta o riporta la percentuale di sconto** (in quel caso calcolalo); altrimenti `null`.
- `unit` e `unitPrice`: prezzo per unità di misura (`kg`, `l`, `pz`, `lavaggio`, `rotolo`), calcolato da prezzo e quantità. Se non è calcolabile metti `null` in entrambi.
- `key`: serve a confrontare lo stesso tipo di prodotto fra supermercati. Usa una di queste chiavi quando il prodotto corrisponde:
  `pasta, passata, olio, tonno, riso, pane, caffe, biscotti, crema, cereali, latte, yogurt, mozzarella, parmigiano, burro, uova, pollo, macinato, salmone, prosciutto, mele, banane, arance, zucchine, insalata, patate, acqua, cola, birra, prosecco, succo, pizza, gelato, piselli, bastoncini, detersivo, carta, piatti, dentifricio, shampoo`.
  Per altri prodotti inventa una chiave breve in minuscolo senza spazi e riusala identica in tutti i supermercati (es. `grana`, `wurstel`).

## Se un volantino non si trova

- Se nel file esistente ci sono offerte di quel supermercato con `validTo` non ancora passata, lasciale e metti `"stale": true`.
- Altrimenti scrivi il supermercato con `"offers": []` e `"stale": true`.

Tutti i supermercati della tabella devono comparire nel file, anche se vuoti.

Se non hai letto nessuna offerta per nessun supermercato, non scrivere il file e non fare commit: spiega solo cosa è andato storto.

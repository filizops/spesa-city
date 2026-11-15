# Screening volantini — istruzioni per Claude

Queste istruzioni sono eseguite da un'attività programmata di Claude sul PC (ogni domenica, o a richiesta).
Obiettivo: aggiornare `data/offers.json` con le offerte reali dei volantini in corso e pubblicarlo.

## Regola numero uno

**Non inventare mai prodotti o prezzi.** Le offerte vengono solo da ciò che lo script legge davvero.
Se un supermercato resta senza offerte, va bene così: l'app lo segnala. Non riempire a mano.

## Passi

1. `git pull --ff-only`
2. `python scripts/screening.py` — legge da PromoQui i volantini validi per Milano e Trieste e riscrive `data/offers.json`.
   Dura qualche minuto e stampa quante offerte ha trovato per supermercato.
3. `python scripts/validate_offers.py` — deve stampare `OK`.
4. Se è tutto a posto: commit del solo `data/offers.json` su `main` con messaggio `Screening volantini AAAA-MM-GG`, poi `git push origin main`.
5. Riepilogo finale in italiano semplice: offerte per supermercato, quali sono rimasti vuoti, esito del push.

## Se qualcosa non va

- **Lo script non legge nessuna offerta** (esce con errore e non tocca il file): non fare commit.
  Controlla se la pagina `https://www.promoqui.it/trieste/lidl` contiene ancora il blocco `__NEXT_DATA__`
  con `flyersByRetailer` e `flyerGibsData`; se la struttura è cambiata, adatta `scripts/screening.py` e riprova.
  Se il sito blocca l'accesso (errore 403, captcha), fermati e riferiscilo: non aggirare il blocco.
- **Un supermercato che la volta scorsa aveva offerte ora è vuoto**: verifica nel dizionario `STORES` dello script
  che il nome usato da PromoQui (lo "slug" nell'indirizzo) sia ancora giusto, e correggilo se serve.
- **Categorie sbagliate evidenti** (es. un elettrodomestico tra gli alimentari): correggi le liste `KEYS`, `CATS`
  o `EXCLUDE` nello script, riesegui, e includi anche lo script nel commit.

## Limiti noti

- PromoQui non riporta peso o formato: per questo l'app confronta i prezzi solo fra prodotti dello stesso tipo e della stessa marca.
- Conad e IperCoop di Trieste e i supermercati Bosco spesso non hanno offerte con prezzo leggibile su PromoQui.

## Formato del file

`data/offers.json` ha `updatedAt`, `source: "ai"` e, per ogni città e supermercato, `validFrom`, `validTo`, `flyerUrl`,
`stale` e la lista `offers`. Ogni offerta ha `key`, `name`, `brand`, `qty`, `cat`
(una tra `frutta`, `carne`, `latticini`, `dispensa`, `bevande`, `dolci`, `surgelati`, `casa`), `price`, `oldPrice` (o `null`),
`unit` e `unitPrice` (o `null`), `validTo`.

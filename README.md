# LAB-8

Prima vertical slice giocabile di **LAB-8**, endless runner arcade 8-bit ambientato in un laboratorio biochimico spaziale.

## Concept
Guido corre automaticamente nel laboratorio. Le provette restano distruttibili con lo sparo; gli ostacoli strutturali del laboratorio sono invece indistruttibili e vanno evitati. Giorno e notte alternano palette e provette zombie.

## Ostacoli
- **Provette**: a terra, distruttibili sparando; di notte diventano zombie.
- **Cassa radioattiva**: bassa, a terra, indistruttibile; va saltata. Ha simbolo radioattivo giallo.
- **Frigorifero da laboratorio**: alto, a terra, indistruttibile; richiede un salto più leggibile e anticipato.
- **Ostacolo volante**: appare a quote diverse; in base all'altezza si evita passando sotto oppure saltando.

I colpi che impattano un ostacolo indistruttibile rimbalzano all'indietro e generano una scintilla. Gli spawn usano distanze minime e una guardia per evitare sequenze troppo punitive di ostacoli alti indistruttibili.

## Stack
HTML5, CSS, JavaScript ES modules e Canvas 2D. Nessuna dipendenza esterna e nessuna build necessaria.

## Avvio
```bash
python -m http.server 8080
```
Aprire `http://localhost:8080`.

## Controlli
- Salto: `Spazio`, `Freccia Su`, `W`
- Sparo: `X`, `F`
- Rallenta: `-`
- Accelera: `+` / `=`
- Restart: `R`, `Invio`

Su touch sono disponibili pulsanti arcade dedicati per salto, sparo e cambio marcia.

## iPad / PWA
Il canvas mantiene coordinate logiche `960x360` e scala preservando l'aspect ratio. Tastiera e touch usano la stessa `handleAction()`. Pointer Events gestiscono press/release/cancel. Il layout supporta safe area, `viewport-fit=cover`, resize e orientation change.

Inclusi Web App Manifest, modalità standalone, landscape, meta iOS/iPadOS, service worker e icone placeholder 8-bit.

> PWA e service worker richiedono HTTPS, eccetto `localhost`.

Da verificare su hardware reale: Safari iPad, installazione Home Screen, safe area specifiche, ergonomia touch e rotazione durante la partita.

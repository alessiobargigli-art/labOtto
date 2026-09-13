# LAB-8

Prima vertical slice giocabile di **LAB-8**, endless runner arcade 8-bit ambientato in un laboratorio biochimico spaziale.

## Concept
Guido corre automaticamente nel laboratorio. Salta le provette, distruggile sparando e regola manualmente la velocità. Giorno e notte alternano palette e provette zombie.

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

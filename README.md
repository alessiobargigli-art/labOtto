# LAB-8

Prima vertical slice giocabile di **LAB-8**, endless runner arcade 8-bit ambientato in un laboratorio biochimico spaziale.

## Concept

Guido, un alieno, corre automaticamente nel laboratorio. Il giocatore deve saltare le provette, distruggerle sparando e scegliere manualmente la velocità di scorrimento. Il gioco alterna giorno e notte: durante la notte la palette cambia e le provette diventano zombie.

## Stack

- HTML5
- CSS
- JavaScript ES modules
- Canvas 2D
- Nessuna dipendenza esterna
- Nessuna build necessaria

## Avvio

```bash
python -m http.server 8080
```

Aprire `http://localhost:8080`.

## Controlli

| Azione | Tastiera |
| --- | --- |
| Salto | `Spazio`, `Freccia Su`, `W` |
| Sparo | `X`, `F` |
| Rallenta | `-` |
| Accelera | `+` / `=` |
| Restart dopo game over | `R`, `Invio` |

Su dispositivi touch sono disponibili controlli arcade dedicati per salto, sparo e cambio marcia.

## Gameplay

- Guido corre automaticamente.
- Tre velocità fisse: lenta, normale e veloce.
- Nessun aumento automatico della velocità.
- Le provette sono ostacoli e possono essere distrutte con i colpi.
- Una collisione con una provetta termina la partita.
- Il punteggio cresce con il tempo e assegna bonus quando si distrugge una provetta.
- Il record viene salvato nel `localStorage`.
- Giorno/notte cambia a intervalli regolari.
- Di notte la palette cambia e le provette hanno una variante zombie.

## iPad, touch e PWA

Il canvas mantiene coordinate logiche `960x360` e viene scalato via CSS preservando l'aspect ratio. Tastiera e touch convergono sulla stessa `handleAction()`. I controlli usano Pointer Events e gestiscono press/release/cancel. Il layout supporta safe area, `viewport-fit=cover`, resize e orientation change.

Sono inclusi `manifest.webmanifest`, modalità standalone, orientamento landscape, meta tag iOS/iPadOS, service worker e icone placeholder 8-bit in `icons/`.

> Service worker e installazione PWA richiedono HTTPS, eccetto `localhost` durante lo sviluppo.

Su Safari/iPadOS: **Condividi → Aggiungi alla schermata Home**.

## Verifica

Verificato automaticamente: sintassi JavaScript, manifest JSON, asset PWA, mapping input condiviso, canvas responsive e app shell via HTTP locale.

Da verificare su hardware reale: Safari iPad, installazione Home Screen, safe area specifiche, ergonomia touch e rotazione durante la partita.

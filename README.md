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

La scelta è intenzionalmente minimale: il repository di partenza era vuoto e la milestone richiede una vertical slice browser-based piccola e immediata.

## Avvio

È consigliato servire la cartella con un piccolo server HTTP locale, perché `game.js` è caricato come ES module.

Con Python:

```bash
python -m http.server 8080
```

Poi aprire:

```text
http://localhost:8080
```

In alternativa va bene qualunque static file server.

## Controlli

| Azione | Tastiera |
| --- | --- |
| Salto | `Spazio`, `Freccia Su`, `W` |
| Sparo | `X`, `F` |
| Rallenta | `-` |
| Accelera | `+` / `=` |
| Restart dopo game over | `R`, `Invio` |

Su dispositivi touch sono disponibili quattro pulsanti sotto il canvas.

## Regole della vertical slice

- Guido corre automaticamente.
- Tre velocità fisse: lenta, normale e veloce.
- Nessun aumento automatico della velocità.
- Le provette sono ostacoli e possono essere distrutte con i colpi.
- Cassa radioattiva, frigorifero da laboratorio e ostacoli volanti sono indistruttibili.
- I colpi contro gli ostacoli indistruttibili rimbalzano con una scintilla.
- Una collisione con una provetta termina la partita.
- Il punteggio cresce con il tempo e assegna bonus quando si distrugge una provetta.
- Il record viene salvato nel `localStorage` del browser.
- Giorno/notte cambia a intervalli regolari.
- Di notte la palette cambia e le provette hanno una variante zombie visivamente distinta.

## Configurazione

I parametri di gameplay sono centralizzati nell'oggetto `CONFIG` all'inizio di `game.js`, inclusi:

- gravità e salto;
- velocità delle tre marce;
- distanza minima/massima tra ostacoli, con gap maggiori per frigoriferi e volanti;
- velocità dei proiettili;
- cooldown di sparo;
- durata giorno/notte;
- valori di punteggio.

## Struttura

```text
.
├── index.html
├── styles.css
├── game.js
├── test-game.mjs
├── sw.js
├── manifest.webmanifest
├── icons/
└── README.md
```

## Milestone coperta

Questa versione include la vertical slice richiesta: controlli, salto, sparo, tre marce manuali, punteggio, collisioni, provette, restart e ciclo giorno/notte.

## iPad, touch e PWA

La vertical slice 0.2 mantiene le coordinate logiche del gioco a `960x360` e scala solo il canvas via CSS, preservando l'aspect ratio. In questo modo fisica, collisioni e rendering non cambiano al variare della risoluzione.

### Controlli touch

Sui dispositivi touch vengono mostrati controlli arcade dedicati sotto la scena:

- **SALTO** → stessa azione di `Spazio` / `↑` / `W`;
- **SPARO** → stessa azione di `X` / `F`;
- **− MARcia** → diminuisce la marcia;
- **+ MARcia** → aumenta la marcia.

Gli eventi touch passano dalla stessa funzione `handleAction()` usata dalla tastiera. I controlli usano Pointer Events, gestiscono `pointerdown`, `pointerup`, `pointercancel` e perdita della pointer capture. Nell'area di gioco vengono inoltre bloccati selezione del testo, menu contestuale, scrolling/overscroll e gesture browser che interferirebbero con la partita.

L'interfaccia è ottimizzata soprattutto per iPad in landscape. Safe area, `viewport-fit=cover`, resize e orientation change sono gestiti dal layout responsive senza cambiare le dimensioni logiche del canvas.

### Installazione su Home Screen / PWA

Sono inclusi:

- `manifest.webmanifest`;
- modalità `standalone` e orientamento preferito landscape;
- meta tag iOS/iPadOS per Web App;
- service worker minimale (`sw.js`) per la cache dell'app shell;
- icone placeholder in `icons/` (`192x192`, `512x512`, Apple Touch Icon `180x180`).

Le icone attuali sono placeholder pixel-art coerenti con LAB-8. Quando saranno disponibili gli asset definitivi, sostituire i PNG mantenendo gli stessi nomi/dimensioni oppure aggiornare manifest e `<link rel="apple-touch-icon">`.

> Service worker e installazione PWA richiedono HTTPS, ad eccezione di `localhost` durante lo sviluppo.

Su Safari/iPadOS l'installazione avviene tramite **Condividi → Aggiungi alla schermata Home**. Il comportamento standalone reale, le safe area specifiche del dispositivo e la resa delle gesture devono essere confermati su un iPad fisico.

## Verifica 0.2

Verificabile automaticamente nel repository:

- sintassi JavaScript di gioco e service worker;
- validità JSON del Web App Manifest;
- presenza di tutti gli asset referenziati;
- risposta HTTP dell'app shell tramite server statico locale;
- mapping condiviso degli input tastiera/pointer verso `handleAction()`;
- canvas con dimensioni logiche fisse e aspect ratio responsive;
- configurazione PWA e icone richieste.

Da verificare manualmente su hardware reale:

- Safari su iPad in landscape e portrait;
- installazione dalla Home Screen;
- safe area su modelli con notch/isola;
- ergonomia reale dei quattro controlli touch;
- rotazione durante una partita e comportamento standalone iPadOS.

## Ostacoli indistruttibili - 0.3

La generazione mantiene una sola minaccia per finestra di spawn, evitando combinazioni sovrapposte o pattern senza via d'uscita. Le provette restano distruttibili; gli altri tre tipi non vengono rimossi dai proiettili.

- **Cassa radioattiva**: bassa, a terra, con simbolo giallo; si supera saltando.
- **Frigorifero da laboratorio**: ostacolo a terra più alto, con gap di spawn dedicato per rendere leggibile il timing del salto.
- **Ostacolo volante**: compare a due quote; quello alto consente di passare sotto, quello basso richiede un salto.
- **Rimbalzo colpi**: un proiettile che colpisce un ostacolo indistruttibile inverte la direzione una sola volta e genera una scintilla pixel-art.

I controlli desktop, touch/iPad e la configurazione PWA restano invariati. La cache del service worker è stata portata a `lab8-v0.4` per invalidare correttamente la PWA dopo l'introduzione del Boss Stage.

## Test locale

La regressione gameplay minima usa solo Node e non introduce dipendenze:

```bash
node test-game.mjs
```

Copre spawn dei nuovi ostacoli, gap dedicati, indistruttibilità, rimbalzo/spark dei proiettili, distruttibilità delle provette e collisione con Guido.


## Boss Stage - 0.4

Il frigorifero da laboratorio è ora un evento raro e configurabile (`CONFIG.fridgeChance`), protetto anche da `CONFIG.fridgeMinSpawnSeparation` per evitare apparizioni consecutive o troppo ravvicinate. Saltarlo mantiene la partita nel runner; colpirlo con un proiettile apre automaticamente il primo Boss Stage dopo una breve transizione glitch 8-bit.

Il gioco usa tre modalità semplici ed esplicite: `RUNNER`, `BOSS` e `GAME_OVER`. Il Boss è un grande palazzo pixel-art integrato nello stesso loop, senza dipendenze o state machine esterne. Alterna una fase di attacco a una breve finestra di vulnerabilità. Durante gli attacchi lancia un solo pericolo leggibile per volta: oggetti distruttibili con lo sparo oppure blocchi indistruttibili da evitare.

Il palazzo possiede tre nuclei/finestre deboli. Ogni nucleo colpito durante la finestra di vulnerabilità completa una fase e assegna punti; dopo il terzo nucleo il palazzo entra in una breve sequenza di distruzione pixelata, assegna il bonus Boss e riporta Guido al normale laboratorio continuando la partita. Le collisioni durante il Boss passano dalla stessa `gameOver()` usata dal runner.

I principali parametri di bilanciamento del Boss sono centralizzati in `CONFIG`: durata transizione, durata fase d'attacco, finestra vulnerabile, intervallo e velocità attacchi, punteggi e durata della vittoria.

### Verifica Boss

`node test-game.mjs` copre anche rarità/separazione del frigorifero, ingresso al Boss tramite colpo, salto senza ingresso, oggetti distruttibili e indistruttibili, collisione/Game Over, tre nuclei, vittoria, bonus, ritorno al runner e riuso degli stessi input di sparo/marcia. Safari/iPadOS fisico resta una verifica manuale: il codice mantiene gli stessi controlli Pointer Events, layout responsive e PWA già esistenti, ma non viene dichiarato testato su hardware reale.

## 2.0.11 — Aggiornamento cache

Script, CSS e musica usano URL con `?v=2.0.11`, così anche un vecchio service worker recupera i file nuovi. La registrazione e il controllo degli aggiornamenti avvengono all'inizio della pagina, indipendentemente dal gioco e dallo splash. Gli aggiornamenti diventano visibili alla successiva apertura o ricarica.

Ogni release usa una cache separata per versione e percorso del sito. Il service worker legge solo la cache corrente e rimuove le precedenti cache dello stesso percorso; le cache legacy `lab8-v*` non vengono più consultate. I dati del giocatore in localStorage restano conservati. AGGIORNA svuota la cache del sito e ricarica con un URL nuovo.

Per una nuova release aggiornare insieme `VERSION` in `sw.js`, badge e query `v` in `index.html`, e `MUSIC_URL` in `audio.js`. `node test-cache.mjs` verifica coerenza degli URL, migrazione da cache legacy, isolamento delle cache e fallback offline.

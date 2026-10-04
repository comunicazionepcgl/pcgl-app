# Diretta APR (DJI Mavic 3E) sulla demo della fiera

Percorso delle immagini:

```
DJI RC Pro (DJI Pilot 2) --RTMP--> server della diretta --HLS/HTTPS--> pcgl.it/reas (muro e Live)
```

La demo controlla ogni 20 secondi se la diretta è attiva: se sì mostra **IN DIRETTA**
(con alcuni secondi di ritardo), altrimenti torna da sola al video registrato `drone.mp4`.

## 1. Il server (una volta)

Serve una macchina raggiungibile da internet con Docker (es. una piccola VM cloud) e le porte
**1935/tcp** (RTMP), **80** e **443** aperte.

1. Copia questa cartella sul server.
2. In `mediamtx.yml` sostituisci `CAMBIA_QUESTA_PASSWORD` con una password lunga.
3. Copia `.env.example` come `.env` e scrivi il nome del server in `LIVE_HOST`
   (`live.pcgl.it` con un record DNS A verso l'IP del server, oppure `IP-con-trattini.sslip.io`).
4. Avvia: `docker compose up -d`

## 2. Collegare la demo

Crea su pcgl.it, accanto a `index.html`, il file **`live.txt`** con una sola riga:

```
https://live.pcgl.it/apr/index.m3u8
```

(con il nome scelto in `LIVE_HOST`). Senza `live.txt` la demo mostra solo il video registrato.

## 3. Trasmettere dal radiocomando

Nell'app **DJI Pilot 2** del radiocomando, nelle impostazioni della trasmissione in diretta
(Live streaming), scegli **RTMP personalizzato** e inserisci:

```
rtmp://live.pcgl.it:1935/apr?user=apr&pass=LA_PASSWORD
```

Avvia la diretta: entro circa 20-30 secondi il muro dello stand mostra **IN DIRETTA**.
Il radiocomando deve avere internet (wifi o hotspot del telefono).

## Note

- **Prova prima della fiera**: trasmetti per qualche minuto e controlla il muro
  (`https://pcgl.it/reas/index.html?kiosk=1&view=wall`).
- **Prova senza drone**: da un PC con ffmpeg
  `ffmpeg -re -stream_loop -1 -i drone.mp4 -c copy -f flv "rtmp://live.pcgl.it:1935/apr?user=apr&pass=LA_PASSWORD"`
- **Volo**: in fiera (Montichiari è vicino all'aeroporto) il volo sul posto richiede autorizzazioni;
  la soluzione prevista è il volo altrove con le immagini trasmesse allo stand. Verificare su d-flight.it.
- **Dopo la fiera**: `docker compose down` e spegnere/eliminare la VM per non avere costi.

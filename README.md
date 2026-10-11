# Dreame Controller

Addon per Home Assistant con un'interfaccia rapida per il robot Dreame D10 Plus Gen 2. Usa le entità e i servizi di Home Assistant esposti dall'integrazione comunitaria [Dreame Vacuum](https://github.com/Tasshack/dreame-vacuum). L'addon non richiede le credenziali Dreame: l'integrazione gestisce l'accesso a Dreamehome.

## Stato

Il modello D10 Plus Gen 2 (`dreame.vacuum.r2423`) compare nell'[elenco dei dispositivi supportati](https://dv.tasshack.com/guide/more/supported-devices). La compatibilità dell'esemplare con firmware `4.3.3_1438` e con la regione dell'account **non è ancora stata verificata**. La prima versione dell'interfaccia offre stato, batteria, avvio, pausa, ripresa, stop e ritorno alla base. Le funzioni per stanze, zone e mappe verranno aggiunte dopo aver osservato le entità disponibili sul robot.

## Installazione prevista

1. Installare HACS e l'integrazione Dreame Vacuum in Home Assistant, seguendo la [guida ufficiale del progetto](https://dv.tasshack.com/installation).
2. Configurare l'integrazione con l'account **Dreamehome** e con la stessa regione scelta nell'app. L'accesso tramite email è richiesto; per un login Google o Apple occorre creare una password dedicata nelle impostazioni dell'app. Le credenziali vanno inserite solo nell'interfaccia di Home Assistant.
3. Verificare che in Home Assistant appaia un'entità `vacuum.*` e che i comandi base funzionino.
4. Aggiungere `https://github.com/ebordoni/dreame-controller` come repository di addon Home Assistant, installare l'addon **Dreame Controller** e aprirlo dal pannello laterale.

L'addon comunica con Home Assistant attraverso il [proxy interno del Supervisor](https://developers.home-assistant.io/docs/apps/communication/) e il token fornito all'addon. Non espone una porta diretta: la UI è accessibile tramite Ingress.

## Sviluppo locale

Servono Node.js 24 e npm. In due terminali:

```sh
npm ci --prefix addon/backend
npm ci --prefix addon/frontend
npm run dev --prefix addon/backend
npm run dev --prefix addon/frontend
```

Per eseguire il backend fuori da Home Assistant, impostare `HA_BASE_URL` all'URL delle API REST e `HA_TOKEN` a un token Home Assistant. Non inserire il token nel repository. Il backend ascolta sulla porta 8103; Vite inoltra `/api` a quella porta.

## Scelta tecnica e limiti

Il [collegamento locale diretto](https://dv.tasshack.com/configuration/local) dell'integrazione è documentato per vecchi dispositivi configurabili tramite Xiaomi Home e non fornisce la mappa. Per questo modello Dreamehome la comunicazione dipende dai server Dreame. [Valetudo](https://valetudo.cloud/pages/general/supported-robots/) non elenca il D10 Plus Gen 2. L'app può essere più veloce da usare rispetto all'app ufficiale, ma non può eliminare i tempi del cloud.

Il codice dell'integrazione Dreame Vacuum non viene copiato in questo repository. L'addon interagisce solo con le API pubbliche di Home Assistant.

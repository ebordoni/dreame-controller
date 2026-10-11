# Dreame Controller

Addon per Home Assistant con un'interfaccia rapida per il robot Dreame D10 Plus Gen 2. Usa le entità e i servizi di Home Assistant esposti dall'integrazione comunitaria [Dreame Vacuum](https://github.com/Tasshack/dreame-vacuum). L'addon non richiede le credenziali Dreame: l'integrazione gestisce l'accesso a Dreamehome.

## Stato

Il modello D10 Plus Gen 2 è supportato dall'integrazione Dreame Vacuum. La connessione è stata verificata con firmware 4.3.3_1438, account Dreamehome sul server Europa e integrazione v2.0.1. Home Assistant rende disponibili stato, batteria, mappa e stanze.

La versione 0.2.0 mostra la mappa corrente e consente di selezionare le stanze da pulire. Nei **Predefiniti** si salvano una potenza e un numero di passate comuni a tutte le stanze. In **Nuova pulizia** si possono modificare quei valori per una o più stanze: le modifiche valgono solo per il comando corrente. I predefiniti sono conservati nel volume dati dell'addon e sopravvivono a riavvii e aggiornamenti. La selezione avviene nell'elenco accanto alla mappa; la selezione tramite tocco sulla mappa non è ancora disponibile.

La pulizia per stanze usa il servizio [Dreame Vacuum vacuum_clean_segment](https://dv.tasshack.com/guide/services/vacuum-services). Se nell'integrazione sono attive la pulizia personalizzata o la sequenza stanze, occorre disattivarle perché l'integrazione potrebbe ignorare potenza e passate inviate dall'addon. L'invio del comando al robot non è ancora stato verificato su una pulizia reale.

## Installazione

1. Installare HACS e l'integrazione Dreame Vacuum in Home Assistant, seguendo la [guida ufficiale del progetto](https://dv.tasshack.com/installation).
2. Configurare l'integrazione con l'account **Dreamehome** e con la stessa regione scelta nell'app. L'accesso tramite email è richiesto; per un login Google o Apple occorre creare una password dedicata nelle impostazioni dell'app. Le credenziali vanno inserite solo nell'interfaccia di Home Assistant.
3. Verificare che in Home Assistant appaia un'entità `vacuum.*`.
4. Aggiungere `https://github.com/ebordoni/dreame-controller` come repository di addon Home Assistant, installare **Dreame Controller** e aprirlo dal pannello laterale.

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

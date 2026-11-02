# PPL Training

Ein deutschsprachiges Trainingstagebuch für iPhone und Windows. Der Plan rotiert durch Push 1, Pull 1, Pause, Legs 1, Push 2, Pause, Pull 2, Legs 2, Pause. Bankdrücken, Kniebeugen und Kreuzheben sind enthalten; Legs 1 setzt den Schwerpunkt auf Quadrizeps, Legs 2 auf Beinbeuger und Gesäß.

## Benutzen

1. Den veröffentlichten GitHub-Pages-Link in Safari öffnen.
2. Über **Teilen → Zu Home-Bildschirm** hinzufügen. Falls angeboten, **Als Web-App öffnen** aktivieren.
3. Die neue App mit Internet starten und unter **Mehr** warten, bis **Offline bereit** angezeigt wird.
4. Zum Prüfen Flugmodus einschalten, die App vollständig schließen und über ihr Symbol neu starten.

Nach erfolgreicher Vorbereitung sind Trainings, Planänderungen, Verlauf und Backups auch offline verfügbar. Die App braucht keinen Account, kein ChatGPT-Abonnement und keine IPA-Installation. iOS kann Websitedaten löschen, etwa wenn sie manuell entfernt werden; deshalb regelmäßig **Mehr → Backup erstellen** verwenden.

## Funktionen und Daten

- Gewichte, Wiederholungen, Arbeitssätze und zusätzliche Aufwärmsätze erfassen.
- Übungen umsortieren, ersetzen, ergänzen oder eigene Übungen anlegen.
- Änderungen wahlweise für die laufende Einheit oder auch für den Trainingsplan speichern.
- Pausentimer, Trainingsnotizen, Verlauf und Fortschrittskurven.
- JSON-Backups exportieren und importieren. Backups früherer PPL-Versionen bleiben kompatibel.

Trainingsdaten liegen lokal im Browser beziehungsweise in der Home-Bildschirm-App. Es gibt keine Datenbank, automatische Synchronisierung, Analyse-Dienste oder externen Schriftarten. GitHub liefert nur die App-Dateien aus. Safari und die installierte App können getrennte Speicher verwenden. Bereits vorhandene Daten deshalb in der bisherigen Version als Backup exportieren und in der neuen App unter **Mehr → Backup importieren** übernehmen.

## GitHub Pages einrichten

Dieses Repository ist eine vollständig statische App ohne Build oder kostenpflichtige Dienste:

1. **Settings → Pages** öffnen.
2. Unter **Build and deployment → Source** die Option **Deploy from a branch** auswählen.
3. Branch **main**, Ordner **/docs**, dann **Save**.
4. Den von GitHub unter **Pages** angezeigten HTTPS-Link öffnen.

Alle Ressourcen, der Manifest-Startpfad und der Service Worker verwenden relative Pfade. Die App funktioniert dadurch auch unter dem Repository-Unterpfad. Cache und lokaler Speicher sind auf diesen App-Pfad begrenzt.

## Entwicklung und Prüfung

Voraussetzung für die automatisierten Prüfungen: Node.js ab Version 20. Es müssen keine Pakete installiert werden.

```sh
npm run check
npm test
```

Die Tests prüfen Trainingsrotation, abgeschlossene und laufende Einheiten, Übungsänderungen, Backup-Validierung sowie den echten Service-Worker-Code mit einem vollständig getrennten Netzwerk und einem GitHub-Pages-Unterpfad. Sie ersetzen keinen Test auf einem echten iPhone.

Wenn eine veröffentlichte Datei in `docs/` geändert wird, `VERSION` in `docs/sw.js` erhöhen. Eine neue Version wird vollständig vorbereitet und erst über **Mehr → Aktualisieren** aktiviert. Der bestehende Trainingsstand wird vor dem Neuladen gespeichert.

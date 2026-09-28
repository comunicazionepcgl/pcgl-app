# Pulizia a fine fiera: cancella tutti gli eventi condivisi (tesserini, check-in, SOS,
# classifica, allerte) di una sessione della demo dal progetto Firebase della fiera.
#
# Uso (da PowerShell, nella cartella fiera-demo\backend):
#   .\pulizia-fine-fiera.ps1                       # sessione predefinita del QR
#   .\pulizia-fine-fiera.ps1 -Sessione reas-altro  # sessione passata con ?s=reas-altro
#
# Serve la Firebase CLI con un account che ha accesso al progetto (firebase login).
# Prima di cancellare, la CLI chiede conferma.
#
# Per azzerare solo il muro dello stand tra una giornata e l'altra non serve questo script:
# basta il pulsante "Azzera demo" nella vista del muro (?view=wall): i dati restano nell'archivio.

param(
    [string]$Sessione = "reas-8cb84fff42",
    [string]$Progetto = "offesometro"
)

if ($Sessione.Length -lt 8 -or $Sessione.Length -gt 40) {
    Write-Error "Id sessione non valido: deve avere tra 8 e 40 caratteri."
    exit 1
}

$percorso = "fiera/$Sessione/eventi"
Write-Host "Cancellazione di tutti i documenti in '$percorso' (progetto '$Progetto')..."
firebase firestore:delete $percorso --recursive --project $Progetto

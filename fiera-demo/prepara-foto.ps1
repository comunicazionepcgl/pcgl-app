# Prepara le foto per la presentazione del chiosco (pcgl.it/reas/foto/).
#
# Uso: metti le foto nuove (qualsiasi nome, .jpg/.jpeg/.png) nella cartella foto\ e lancia
#   .\prepara-foto.ps1
# dalla cartella fiera-demo. Si può rilanciare ogni volta che si aggiungono foto.
#
# Cosa fa:
# - numera le foto nuove DOPO quelle già numerate (01.jpg, 02.jpg, ...), in ordine di nome
#   (per le foto di WhatsApp coincide con l'ordine di scatto);
# - le raddrizza se il telefono le ha salvate ruotate e le riduce a max 1920 px (JPEG);
# - sposta gli originali in foto-originali\ (da NON caricare sul sito);
# - aggiorna foto\elenco-foto.txt (numero <- nome originale) per scrivere le didascalie;
# - aggiunge righe vuote a foto\didascalie.txt, così l'ordine delle didascalie resta allineato.
#
# Sul sito va caricata solo la cartella foto\ (senza elenco-foto.txt, che non serve).

param(
    [int]$LatoMassimo = 1920,
    [int]$Qualita = 82
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$base      = $PSScriptRoot
$fotoDir   = Join-Path $base 'foto'
$origDir   = Join-Path $base 'foto-originali'
$elenco    = Join-Path $fotoDir 'elenco-foto.txt'
$didascalie = Join-Path $fotoDir 'didascalie.txt'
$utf8      = New-Object System.Text.UTF8Encoding $false

if (-not (Test-Path $fotoDir)) { throw "Cartella non trovata: $fotoDir" }
New-Item -ItemType Directory -Force $origDir | Out-Null

# Foto già numerate e foto nuove
$numerate = Get-ChildItem $fotoDir -File | Where-Object { $_.Name -match '^\d{2}\.jpg$' }
$nuove = Get-ChildItem $fotoDir -File |
    Where-Object { $_.Extension -match '^\.(jpe?g|png)$' -and $_.Name -notmatch '^\d{2}\.jpg$' } |
    Sort-Object Name

# Controllo buchi nella numerazione esistente (la presentazione si ferma al primo numero mancante)
$numeri = @($numerate | ForEach-Object { [int]$_.BaseName } | Sort-Object)
for ($i = 0; $i -lt $numeri.Count; $i++) {
    if ($numeri[$i] -ne $i + 1) { Write-Warning "Manca la foto $('{0:D2}' -f ($i + 1)).jpg: le foto successive non verrebbero mostrate. Rinomina a mano per chiudere il buco." ; break }
}

if (-not $nuove) { Write-Host "Nessuna foto nuova in $fotoDir ($($numerate.Count) già numerate)."; return }

$prossimo = if ($numeri.Count) { ($numeri | Measure-Object -Maximum).Maximum + 1 } else { 1 }
if ($prossimo + $nuove.Count - 1 -gt 99) { throw "Troppe foto: la presentazione ne gestisce al massimo 99." }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]$Qualita)

$righeElenco = @()
foreach ($f in $nuove) {
    $nome = '{0:D2}.jpg' -f $prossimo
    $dest = Join-Path $fotoDir $nome
    $img = [System.Drawing.Image]::FromFile($f.FullName)
    try {
        # Orientamento EXIF (0x0112): le foto dei telefoni spesso sono "ruotate" solo nei metadati
        if ($img.PropertyIdList -contains 0x0112) {
            $o = [BitConverter]::ToUInt16($img.GetPropertyItem(0x0112).Value, 0)
            $rot = @{ 2 = 'RotateNoneFlipX'; 3 = 'Rotate180FlipNone'; 4 = 'Rotate180FlipX'; 5 = 'Rotate90FlipX'; 6 = 'Rotate90FlipNone'; 7 = 'Rotate270FlipX'; 8 = 'Rotate270FlipNone' }[[int]$o]
            if ($rot) { $img.RotateFlip([System.Drawing.RotateFlipType]::$rot) }
        }
        $scala = [Math]::Min(1.0, $LatoMassimo / [Math]::Max($img.Width, $img.Height))
        $w = [int][Math]::Round($img.Width * $scala); $h = [int][Math]::Round($img.Height * $scala)
        $bmp = New-Object System.Drawing.Bitmap $w, $h
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.DrawImage($img, 0, 0, $w, $h)
            $g.Dispose()
            try { $bmp.Save($dest, $jpegCodec, $encParams) }
            catch { if (Test-Path $dest) { Remove-Item -LiteralPath $dest }; throw "Errore su $($f.Name): $($_.Exception.Message) (originale non spostato)" }
        } finally { $bmp.Dispose() }
    } finally { $img.Dispose() }

    Move-Item -LiteralPath $f.FullName -Destination (Join-Path $origDir $f.Name) -Force
    $kb = [Math]::Round((Get-Item $dest).Length / 1KB)
    Write-Host ("{0}  <-  {1}  ({2}x{3}, {4} KB)" -f $nome, $f.Name, $w, $h, $kb)
    $righeElenco += "$nome  <-  $($f.Name)"
    $prossimo++
}

[IO.File]::AppendAllLines($elenco, [string[]]$righeElenco, $utf8)

# Didascalie: una riga per foto; aggiunge righe vuote per le nuove foto
$righeDid = if (Test-Path $didascalie) { [IO.File]::ReadAllLines($didascalie, $utf8) } else { @() }
$totale = $prossimo - 1
if ($righeDid.Count -lt $totale) {
    $righeDid = @($righeDid) + @('') * ($totale - $righeDid.Count)
    [IO.File]::WriteAllLines($didascalie, [string[]]$righeDid, $utf8)
}

Write-Host ""
Write-Host "Fatto: $($nuove.Count) foto nuove, $totale in totale. Originali in foto-originali\."
Write-Host "Didascalie: scrivile in foto\didascalie.txt (riga 1 = 01.jpg, riga 2 = 02.jpg, ...)."

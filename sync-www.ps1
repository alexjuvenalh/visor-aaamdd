# sync-www.ps1
# Sincroniza archivos web de raiz -> www/ (Android Capacitor)
# Uso: .\sync-www.ps1 [-DryRun]
param([switch]$DryRun)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$www  = Join-Path $root "www"

Write-Host ""
Write-Host "sync-www: root -> www/" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor DarkGray

$files = @(
    "index.html",
    "instalar.html",
    "css\estilosmapa.css",
    "css\estilos.css",
    "css\celular.css",
    "css\tablet.css",
    "css\computadora.css",
    "js\util.js",
    "js\cargar-datos.js",
    "js\iconos-rada.js",
    "js\gps.js",
    "js\search.js",
    "js\descargas.js",
    "js\archivos.js",
    "js\coordenadas.js",
    "jsmapa\index.js",
    "leaflet\leaflet.js",
    "leaflet\leaflet.css",
    "leaflet\leaflet.markercluster.js",
    "leaflet\MarkerCluster.css",
    "leaflet\MarkerCluster.Default.css",
    "leaflet\jszip.min.js",
    "leaflet\shpwrite.js",
    "leaflet\proj4.js",
    "leaflet\togeojson.js",
    "imagenes\favicon.png"
)

$geojson = @(
    "faja_poligono.json",
    "faja_hito.json",
    "uso_temporal.json",
    "rada_fuente.json",
    "aaa.json",
    "ala.json",
    "departamento.json",
    "provincia.json",
    "distrito.json",
    "carta.json",
    "rio_principal.json",
    "rio.json"
)

$ok = 0
$err = 0

function Sync-File($srcRel) {
    $src = Join-Path $root $srcRel
    $dst = Join-Path $www $srcRel
    $dstDir = Split-Path $dst -Parent

    if (-not (Test-Path $src)) {
        Write-Host "  WARN: $srcRel (not found)" -ForegroundColor Yellow
        $script:err++
        return
    }

    if (-not (Test-Path $dstDir)) {
        if (-not $DryRun) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    }

    if ($DryRun) {
        Write-Host "  [dry] $srcRel -> www\$srcRel" -ForegroundColor Gray
    } else {
        Copy-Item -Path $src -Destination $dst -Force
        Write-Host "  OK: $srcRel" -ForegroundColor Green
    }
    $script:ok++
}

# Web files
foreach ($f in $files) { Sync-File $f }

# GeoJSON
foreach ($g in $geojson) { Sync-File "visor\geojson\$g" }

# Leaflet images
$leafImgSrc = Join-Path $root "leaflet\images"
$leafImgDst = Join-Path $www "leaflet\images"
if (Test-Path $leafImgSrc) {
    if (-not (Test-Path $leafImgDst)) {
        if (-not $DryRun) { New-Item -ItemType Directory -Path $leafImgDst -Force | Out-Null }
    }
    if (-not $DryRun) {
        Copy-Item -Path "$leafImgSrc\*" -Destination $leafImgDst -Force -Recurse
    }
    Write-Host "  OK: leaflet\images\" -ForegroundColor Green
    $ok++
}

Write-Host "==============================" -ForegroundColor DarkGray
if ($DryRun) {
    Write-Host "DRY RUN: $ok files would be copied." -ForegroundColor Yellow
} else {
    Write-Host "Sync done: $ok files copied." -ForegroundColor Green
    if ($err -gt 0) { Write-Host "Warnings: $err files not found." -ForegroundColor Yellow }
}
Write-Host ""

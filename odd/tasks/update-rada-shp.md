# update-rada-shp

## Goal
Update RADA map data from the refreshed SHP using the clean path only: SHP -> `geo.rada` -> GeoJSON.

## Constraints
- Do not write to `geo.resolucion`.
- Do not write to `geo.derecho`.
- Do not write to `geo.punto_derecho`.
- Use the RADA shapefile at `D:/Datos/OneDrive - Autoridad Nacional del Agua/MDD 2026/AAA/SHP/New folder/RADA.shp`.
- Back up `geo.rada` before import.
- Do not commit, push, or delete unrelated files without explicit user authorization.

## Tasks
- [x] Back up only `geo.rada`.
- [x] Import the SHP using `scripts/migrar-rada.js`, which targets `geo.rada`.
- [x] Regenerate visor GeoJSON.
- [x] Verify the working tree and confirm only expected RADA outputs changed.
- [ ] Report results and pending commit/push decision.

## Evidence
- `geo.rada` backup: `../Sisgeoalfa/backups/respaldo-geo-rada-20261012-183418.dump` (272 KB).
- Import command: `DB_HOST=localhost node scripts/migrar-rada.js --shp "D:/Datos/OneDrive - Autoridad Nacional del Agua/MDD 2026/AAA/SHP/New folder/RADA.shp"`.
- Import result: 2802 read, 19 new, 2783 skipped, 0 errors; `geo.rada` count 2812 -> 2831.
- Forbidden table counts unchanged: `geo.resolucion=4495`, `geo.derecho=2725`, `geo.punto_derecho=4618`.
- GeoJSON regenerated with `VISOR_GEOJSON_DIR` pointed at the current `Visor` root; `rada_fuente.json` has 2831 features in both `visor/geojson/` and `www/visor/geojson/`.
- Working tree after cleanup: only `visor/geojson/rada_fuente.json`, `www/visor/geojson/rada_fuente.json`, and this ODD task file are changed/untracked.

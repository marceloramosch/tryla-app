# location-core: funcion atomica `analizarUbicacion`

Recibe `{ direccion, ciudad, zona?, estado?, cocina? }` y devuelve un JSON con el schema de `schema.json`.
Sin interfaz y sin efectos secundarios: los datos entran por proveedores inyectados (`providers/`).
Lo que no se pueda obtener **no se inventa**: queda en `calidad.faltantes`, y cada numero lleva su fuente en `evidencia`.

```
node run.mjs "1500 Marilla St" "Dallas" --estado TX --cocina "tacos / mexicana"
node --test tests/analyze-location.test.mjs
```

Variables opcionales de `run.mjs`: `CENSUS_API_KEY` (poblacion e ingreso), `SUPABASE_USER_JWT` (empleos desde Supabase)
o `JOBS_CSV` (empleos desde los CSV de LODES, sin base de datos). Las llaves privadas nunca van en este repositorio.

`model-params.json` tiene los parametros del modelo. **Son iniciales y no estan calibrados** (version `0.1.0-sin-calibrar`).
`examples/` tiene resultados reales (sin ACS, porque la llave del Censo vive en Supabase). Ver el plan de verificacion para calibrar.

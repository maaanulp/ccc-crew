# CCC online host

`server.js` sirve `cccstudio.html` y protege cada General Database por `crew identification`.

## Estado actual

- Cada crew tiene un archivo General separado.
- Las contrasenas se guardan como hashes SHA-256.
- `/api/login` crea la sesion de crew.
- `/api/create-crew` registra una nueva crew.
- `/api/general` lee y actualiza la base de la crew autenticada.
- `/api/operators` devuelve las sesiones activas de la crew.
- `/health` sirve como comprobacion del host.

## Ejecucion local

```powershell
$env:CREW_ID="crew"
$env:CREW_PASSWORD="cambia-esta-clave"
$env:ADMIN_PASSWORD="cambia-la-clave-admin"
node server.js
```

Abre `http://localhost:8787`.

## Despliegue real

Para ponerlo en Internet hay que desplegar este proyecto en un proveedor y configurar sus variables de entorno:

- `PORT`: el proveedor normalmente la asigna.
- `CREW_ID`: identificacion inicial opcional.
- `CREW_PASSWORD`: clave inicial opcional.
- `ADMIN_PASSWORD`: clave para purgar la General Database.

Importante: el almacenamiento actual usa archivos locales. Muchos hosts gratuitos borran el disco al reiniciar, por lo que para una base online persistente hay que conectar una base gestionada, por ejemplo PostgreSQL/Supabase. No compartas las contrasenas de crew en el codigo ni las subas al repositorio.

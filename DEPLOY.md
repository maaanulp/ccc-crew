# CCC — Guía de Seguridad y Despliegue

## ⚠️ CRÍTICO: Tu IP Personal NUNCA debe quedar expuesta

El servidor corre en tu PC local en el puerto `8787`. Si abres ese puerto en el router o lo compartes directamente, **tu IP real queda expuesta**.

### La solución correcta: usa siempre un intermediario

```
Tu PC (puerto 8787) ──► Tunnel / Cloud hosting ──► Internet
```

El mundo externo solo ve la IP del intermediario, **nunca la tuya**.

---

## Opción 1: Tunnel Local (rápido, gratis, sin configuración)

```bash
# Terminal 1 — servidor
npm run server

# Terminal 2 — tunnel (genera URL pública temporal)
npm run tunnel
```

El tunnel crea una URL como `https://xxxx.loca.lt` que enmascara tu IP completamente.

> **Importante:** La URL del tunnel cambia cada vez que lo reinicias. Para URL fija, usa la Opción 2.

---

## Opción 2: Render.com (gratis, URL fija, SSL automático)

Esta es la **opción recomendada** para uso permanente sin exponer tu IP.

### Pasos

1. **Sube el código a GitHub** (si no lo has hecho):
   ```bash
   git add -A && git commit -m "security hardening" && git push
   ```

2. **Crea cuenta en** https://render.com

3. **Nuevo Web Service → conecta tu repo**

4. **Configuración del servicio:**
   - Build command: `npm run build`
   - Start command: `node server.js`
   - Environment: `Node`
   - Plan: `Free`

5. **Variables de entorno** (en Render → Environment):
   ```
   NODE_ENV=production
   CREW_ID=tu-crew-id
   CREW_PASSWORD=contraseña-segura-larga
   ADMIN_PASSWORD=contraseña-admin-muy-segura
   PORT=10000
   ```

6. **Despliega** → Render te da una URL `https://tu-app.onrender.com`

Tu IP personal **nunca aparece** — solo la IP de los servidores de Render.

---

## Opción 3: Railway.app (similar a Render)

1. https://railway.app → New Project → Deploy from GitHub
2. Configura las mismas variables de entorno
3. Genera URL `https://tu-app.up.railway.app`

---

## Resumen de Seguridad Implementada

| Vulnerabilidad | Estado | Solución aplicada |
|---|---|---|
| IP personal expuesta | ✅ Mitigado | Tunnel/Cloud — nunca exponer puerto directo |
| Rate limiting (brute-force) | ✅ Arreglado | 10 intentos / 15 min por IP |
| CORS con wildcard + credenciales | ✅ Arreglado | Allowlist de orígenes, no `*` con credentials |
| Errores con rutas internas | ✅ Arreglado | Solo "Internal server error" al cliente |
| Cookie sin `Secure` flag | ✅ Arreglado | Secure activado automáticamente en HTTPS |
| Código duplicado / roto en server.js | ✅ Arreglado | Reescritura completa limpia |
| Path traversal en static serving | ✅ Arreglado | Doble check: decode + resolve + startsWith |
| data/ accidentalmente servida | ✅ Arreglado | Bloqueo explícito de DATA_DIR |
| Sin cabeceras de seguridad | ✅ Arreglado | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Server header revela tecnología | ✅ Arreglado | Header `Server: CCC` personalizado |
| operatorName sin sanitizar | ✅ Arreglado | Solo `[a-zA-Z0-9_ \-.]` permitidos |
| Token de sesión sin validación | ✅ Arreglado | Regex `/^[a-f0-9]{64}$/` antes de buscar |
| Sesiones no expiran | ✅ Arreglado | Purga automática cada hora |
| Mensajes distintos login/pass | ✅ Arreglado | Mensaje genérico "Invalid credentials" |
| Rutas internas en UI frontend | ✅ Arreglado | `sanitizeErr()` elimina paths en diagLines |

---

## Configuración de Variables de Entorno (Local)

Crea un archivo `.env` (ignorado por git) en la raíz:

```env
CREW_ID=mi-crew-secreto
CREW_PASSWORD=contraseña-muy-larga-y-aleatoria
ADMIN_PASSWORD=admin-solo-yo-se-esto
NODE_ENV=development
```

Y ejecuta con:
```bash
node -r dotenv/config server.js
# o instala dotenv: npm install dotenv
```

---

## ¿Cómo sé que mi IP no está expuesta?

1. Abre `https://tu-url-publica.loca.lt`
2. En DevTools → Network → cualquier request
3. Los headers de respuesta mostrarán `Server: CCC` — **sin versión de Node, sin paths**
4. Haz `curl -I https://tu-url.loca.lt` — no verás tu IP real en ningún header

Para confirmarlo definitivamente, puedes usar https://ipinfo.io desde otra red y comparar — verás la IP del tunnel/Render, nunca la tuya.

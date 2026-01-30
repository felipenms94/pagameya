# Cobros y Deudas Backend

## Requisitos
- Node.js 18+
- PostgreSQL

## Configuracion
Define `DATABASE_URL` en tu entorno o en un `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"
AUTH_SECRET="cambia-esto-en-prod"
```

## Migraciones

```bash
npm run db:migrate
```

## Seed

```bash
npm run db:seed
```

## Healthcheck

```bash
curl http://localhost:3000/api/health
```

## Auth

Registrar:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@pagameya.local\",\"password\":\"demo1234\"}"
```

Login (guarda cookie en archivo):

```bash
curl -c cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@pagameya.local\",\"password\":\"demo1234\"}"
```

Nota: el seed crea el usuario `demo@pagameya.local` con password `demo1234`.

Usuario actual:

```bash
curl -b cookie.txt http://localhost:3000/api/auth/me
```

Logout:

```bash
curl -b cookie.txt -X POST http://localhost:3000/api/auth/logout
```

## Workspaces API

Listar:

```bash
curl http://localhost:3000/api/workspaces -b cookie.txt
```

Crear:

```bash
curl -X POST http://localhost:3000/api/workspaces \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"name\":\"Mi workspace\",\"mode\":\"BUSINESS\"}"
```

Ver 1:

```bash
curl http://localhost:3000/api/workspaces/<ID> -b cookie.txt
```

## Invitations API

Nota: las invitaciones expiran por defecto en 7 dias (expiresAt = now + 7 dias).

Crear invitacion (solo OWNER):

```bash
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"email\":\"nuevo@correo.com\",\"role\":\"MEMBER\"}"
```

Listar invitaciones del workspace (solo OWNER):

```bash
curl "http://localhost:3000/api/invitations?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Ver invitaciones pendientes para el usuario logueado:

```bash
curl http://localhost:3000/api/invitations/pending -b cookie.txt
```

Aceptar invitacion (requiere login con el mismo email invitado):

```bash
curl -X POST http://localhost:3000/api/invitations/accept \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"token\":\"<INVITE_TOKEN>\"}"
```

Revocar invitacion (solo OWNER):

```bash
curl -X POST http://localhost:3000/api/invitations/<INVITATION_ID>/revoke \
  -b cookie.txt
```

## Members API

Nota: miembros/equipo solo aplica a workspaces en modo BUSINESS (si es PERSONAL devuelve BUSINESS_ONLY).

Login (guardar cookie):

```bash
curl -c cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@pagameya.local\",\"password\":\"demo1234\"}"
```

Listar miembros (OWNER/ADMIN):

```bash
curl "http://localhost:3000/api/members?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Cambiar rol (solo OWNER, role: ADMIN|MEMBER):

```bash
curl -X PATCH "http://localhost:3000/api/members/<USER_ID>?workspaceId=<WORKSPACE_ID>" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"role\":\"ADMIN\"}"
```

Eliminar miembro (OWNER/ADMIN):

```bash
curl -X DELETE "http://localhost:3000/api/members/<USER_ID>?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

## Tags and Persons API

Crear tag:

```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"name\":\"VIP\",\"color\":\"#FFAA00\"}"
```

Crear person:

```bash
curl -X POST http://localhost:3000/api/persons \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"name\":\"Cliente Uno\",\"phone\":\"5551234\"}"
```

Asignar tag:

```bash
curl -X POST http://localhost:3000/api/persons/<PERSON_ID>/tags \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"tagId\":\"<TAG_ID>\"}"
```

Buscar person por name:

```bash
curl "http://localhost:3000/api/persons?workspaceId=<WORKSPACE_ID>&search=cliente" \
  -b cookie.txt
```

Filtrar por priority (LOW|MEDIUM|HIGH):

```bash
curl "http://localhost:3000/api/persons?workspaceId=<WORKSPACE_ID>&priority=HIGH" \
  -b cookie.txt
```

## Debts and Payments API

Crear deuda:

```bash
curl -X POST http://localhost:3000/api/debts \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"personId\":\"<PERSON_ID>\",\"direction\":\"RECEIVABLE\",\"amountOriginal\":120,\"dueDate\":\"2026-02-01T00:00:00.000Z\",\"splitCount\":3,\"minSuggestedPayment\":40}"
```

Crear deuda con splitCount=4 y ver splitEach/scheduleSuggested:

```bash
curl -X POST http://localhost:3000/api/debts \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"personId\":\"<PERSON_ID>\",\"direction\":\"RECEIVABLE\",\"amountOriginal\":200,\"splitCount\":4}"
```

Ver detalle para scheduleSuggested y splitEach:

```bash
curl "http://localhost:3000/api/debts/<DEBT_ID>?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Ver suggestedPayments con minSuggestedPayment:

```bash
curl -X POST http://localhost:3000/api/debts \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"personId\":\"<PERSON_ID>\",\"direction\":\"RECEIVABLE\",\"amountOriginal\":150,\"minSuggestedPayment\":25}"
```

Ver suggestedPayments sin minSuggestedPayment (base 10% con clamp):

```bash
curl -X POST http://localhost:3000/api/debts \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"personId\":\"<PERSON_ID>\",\"direction\":\"RECEIVABLE\",\"amountOriginal\":300}"
```

Crear deuda con interes mensual:

```bash
curl -X POST http://localhost:3000/api/debts \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"personId\":\"<PERSON_ID>\",\"direction\":\"RECEIVABLE\",\"amountOriginal\":100,\"hasInterest\":true,\"interestRatePct\":5,\"interestPeriod\":\"MONTHLY\"}"
```

Hack para probar interes sin esperar (ajustar issuedAt):

```bash
curl -X PATCH http://localhost:3000/api/debts/<DEBT_ID> \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"issuedAt\":\"2026-01-01T00:00:00.000Z\"}"
```

Verificar interes en detalle:

```bash
curl "http://localhost:3000/api/debts/<DEBT_ID>?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Registrar pago:

```bash
curl -X POST http://localhost:3000/api/debts/<DEBT_ID>/payments \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"amount\":50}"
```

Listar deudas vencidas:

```bash
curl "http://localhost:3000/api/debts?workspaceId=<WORKSPACE_ID>&overdue=true" \
  -b cookie.txt
```

Listar payment types:

```bash
curl "http://localhost:3000/api/payment-types?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

## Email Automation API

Preview email:

```bash
curl "http://localhost:3000/api/email/preview?workspaceId=<WORKSPACE_ID>&type=DAILY" \
  -b cookie.txt
```

Send test email:

```bash
curl -X POST http://localhost:3000/api/email/send-test \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"toEmail\":\"demo@pagameya.local\",\"type\":\"DAILY\",\"direction\":\"RECEIVABLE\"}"
```

Email settings (OWNER/ADMIN):

```bash
curl "http://localhost:3000/api/email/settings?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

```bash
curl -X PUT http://localhost:3000/api/email/settings \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"dailyEnabled\":true,\"dailyHourLocal\":8,\"weeklyEnabled\":true,\"weeklyDayOfWeek\":1,\"weeklyHourLocal\":8,\"toMode\":\"OWNERS\",\"toEmails\":null,\"timezone\":\"America/Guayaquil\"}"
```

Cron daily (opcional toEmail/direction):

```bash
curl -X POST http://localhost:3000/api/cron/email/daily \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"direction\":\"RECEIVABLE\"}"
```

Cron weekly (opcional toEmail/direction):

```bash
curl -X POST http://localhost:3000/api/cron/email/weekly \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\"}"
```

Nota: requiere header `x-cron-secret` igual a `CRON_SECRET`.

Logs:

```bash
curl "http://localhost:3000/api/email/logs?workspaceId=<WORKSPACE_ID>&type=DAILY&status=SENT&limit=20" \
  -b cookie.txt
```

Nota: daily evita duplicados por dia (workspace+direction+to). weekly evita duplicados por semana ISO.
Cron respeta EmailSettings (enabled + recipients).

## Vercel Deploy + Cron

Variables de entorno requeridas en Vercel:
- `DATABASE_URL`
- `CRON_SECRET`
- `SMTP_*` (si usas email SMTP)
- `APP_BASE_URL` (opcional)

Configura `CRON_SECRET` y usa el header `x-cron-secret` en tus llamadas cron.

Ejemplo `vercel.json` (horarios en UTC):

```json
{
  "crons": [
    { "path": "/api/cron/email/daily", "schedule": "0 13 * * *" },
    { "path": "/api/cron/email/weekly", "schedule": "0 13 * * 1" }
  ]
}
```

America/Guayaquil es UTC-5 sin DST:
- 08:00 Guayaquil = 13:00 UTC (daily `0 13 * * *`)
- Lunes 08:00 Guayaquil = Lunes 13:00 UTC (weekly `0 13 * * 1`)

Ping protegido para probar cron:

```bash
curl -H "x-cron-secret: <CRON_SECRET>" http://localhost:3000/api/cron/ping
```
## Alerts API

Preview email:

```bash
curl "http://localhost:3000/api/email/preview?workspaceId=<WORKSPACE_ID>&type=DAILY" \
  -b cookie.txt
```

Send test email:

```bash
curl -X POST http://localhost:3000/api/email/send-test \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"toEmail\":\"demo@pagameya.local\",\"type\":\"DAILY\"}"
```

Cron daily:

```bash
curl -X POST http://localhost:3000/api/cron/email/daily \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Cron weekly:

```bash
curl -X POST http://localhost:3000/api/cron/email/weekly \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d "{}"
```

## Alerts API

Alertas internas automaticas (on-demand):

```bash
curl "http://localhost:3000/api/alerts?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Filtrar por direccion:

```bash
curl "http://localhost:3000/api/alerts?workspaceId=<WORKSPACE_ID>&direction=RECEIVABLE" \
  -b cookie.txt
```

## Dashboard and Today API

Dashboard:

```bash
curl "http://localhost:3000/api/dashboard?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Cobrar hoy / Pagar hoy:

```bash
curl "http://localhost:3000/api/today?workspaceId=<WORKSPACE_ID>&direction=RECEIVABLE" \
  -b cookie.txt
```

## Reminder Templates API

Listar plantillas:

```bash
curl "http://localhost:3000/api/templates/reminders?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Crear/actualizar plantilla (WHATSAPP soft/normal/strong):

```bash
curl -X PUT http://localhost:3000/api/templates/reminders \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"channel\":\"WHATSAPP\",\"tone\":\"soft\",\"title\":null,\"body\":\"Hola {personName}, saldo {balance} vence {dueDate}\"}"
```

WhatsApp link usando plantilla:

```bash
curl "http://localhost:3000/api/whatsapp/link?workspaceId=<WORKSPACE_ID>&personId=<PERSON_ID>&debtId=<DEBT_ID>&tone=soft" \
  -b cookie.txt
```

## Internal Reminders API

Recordatorios internos automaticos:

```bash
curl "http://localhost:3000/api/reminders/internal?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Filtrar por direccion:

```bash
curl "http://localhost:3000/api/reminders/internal?workspaceId=<WORKSPACE_ID>&direction=RECEIVABLE" \
  -b cookie.txt
```

## Promises and Reminders API

Recordatorios sugeridos (automaticos):

```bash
curl "http://localhost:3000/api/reminders/suggested?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Log de recordatorio enviado:

```bash
curl -X POST http://localhost:3000/api/reminders/log \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"debtId\":\"<DEBT_ID>\",\"personId\":\"<PERSON_ID>\",\"channel\":\"WHATSAPP\",\"tone\":\"soft\",\"kind\":\"DUE_TODAY\"}"
```


Crear promise:

```bash
curl -X POST http://localhost:3000/api/debts/<DEBT_ID>/promises \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"promisedDate\":\"2026-02-01T00:00:00.000Z\",\"promisedAmount\":60}"
```

Crear reminder:

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"debtId\":\"<DEBT_ID>\",\"channel\":\"WHATSAPP\",\"scheduledFor\":\"2026-02-01T10:00:00.000Z\",\"messageText\":\"Recordatorio\"}"
```

WhatsApp link:

```bash
curl "http://localhost:3000/api/whatsapp/link?workspaceId=<WORKSPACE_ID>&personId=<PERSON_ID>&debtId=<DEBT_ID>&tone=soft" \
  -b cookie.txt
```

## Exports API

Descargar debts.xlsx:

```bash
curl -o debts.xlsx "http://localhost:3000/api/export/debts.xlsx?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Descargar persons.xlsx:

```bash
curl -o persons.xlsx "http://localhost:3000/api/export/persons.xlsx?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Descargar statement.pdf:

```bash
curl -o statement.pdf "http://localhost:3000/api/persons/<PERSON_ID>/statement.pdf?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Descargar backup.json:

```bash
curl "http://localhost:3000/api/export/backup.json?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

## Pro endpoints

Crear forma de pago custom:

```bash
curl -X POST http://localhost:3000/api/payment-types \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"name\":\"Pago en tienda\"}"
```

Eliminar forma de pago custom:

```bash
curl -X DELETE "http://localhost:3000/api/payment-types/<ID>?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Crear recordatorio:

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"debtId\":\"<DEBT_ID>\",\"channel\":\"IN_APP\",\"scheduledFor\":\"2026-02-01T10:00:00.000Z\",\"messageText\":\"Recordatorio\"}"
```

Eliminar recordatorio:

```bash
curl -X DELETE "http://localhost:3000/api/reminders/<ID>?workspaceId=<WORKSPACE_ID>" \
  -b cookie.txt
```

Crear adjunto:

```bash
curl -X POST http://localhost:3000/api/attachments \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"workspaceId\":\"<WORKSPACE_ID>\",\"debtId\":\"<DEBT_ID>\",\"url\":\"https://example.com/foto\",\"note\":\"Comprobante\"}"
```

## Notifications Service

Sends emails and supports realtime notifications. Designed to consume events from RabbitMQ and act out-of-process from the User Management service.

### Features
- Email sending (Nodemailer)
- RabbitMQ integration (consume/publish)
- Socket.io server (optional) with Redis adapter for scaling
- Security middleware (helmet, cors)

### Tech
- Node.js, Express
- amqplib, nodemailer, socket.io
- helmet, cors, express‑validator

---

## Run Locally

Environment variables:
```bash
RABBITMQ_URL=amqp://localhost:5672
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=secret
SMTP_FROM="Acme <no-reply@acme.com>"
CORS_ORIGIN=http://localhost:5173
```

Install and start:
```bash
npm install
npm run dev
# or
npm start
```

---

## Architecture

Entry: `server.js`
- Sets helmet/cors/json, connects RabbitMQ via `config/rabbitmq.js`
- Mounts `routes/email.js` for email submissions
- Optionally configures Socket.io + Redis adapter for multi-instance realtime

Configuration
- `config/rabbitmq.js`: RabbitMQ lifecycle (connect, channel, disconnect)
- `config/redis.js`: Redis client for adapters (if used)
- `config/constants.js`: service constants

Controllers
- `controllers/emailController.js`: validate inputs and send emails via `utils/mailer.js`

Utilities
- `utils/mailer.js`: Nodemailer transporter + send helpers
- `utils/logger.js`: central logging wrapper (extendable)

Routes
- `routes/email.js`: POST endpoint to send emails (templating can be added)

---

## Example Email Request

```http
POST /api/email
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Welcome",
  "html": "<p>Hello!</p>"
}
```

Response:
```json
{ "success": true }
```

---

## Production Notes
- Run with a process manager (PM2/systemd) and enable health checks
- Use durable exchanges/queues and dead-lettering in RabbitMQ where appropriate
- Externalize templates for emails, add retries/backoff on transient failures
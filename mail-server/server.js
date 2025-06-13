// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configurar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15"
});

const app = express();

// Normaliza FRONTEND_URL sin slash final
const frontendURL = (process.env.FRONTEND_URL || "").replace(/\/$/, "");

app.use(cors({
  origin: frontendURL,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(bodyParser.json());

// 1) Enviar cotización por email
app.post("/send-quotation", async (req, res) => {
  const data = req.body;
  // Construir HTML del email
  const html = `
    <h1>Cotización ${data.numero}</h1>
    <p><strong>Subtotal:</strong> $${data.subtotal}</p>
    <p><strong>Descuento:</strong> $${data.descuento}</p>
    <p><strong>Impuestos:</strong> $${data.impuestos}</p>
    <p><strong>Anticipo:</strong> $${data.anticipo}</p>
    <p><strong>Total:</strong> $${data.total}</p>
    <a href="${frontendURL}/?numero=${data.numero}&action=approve" style="text-decoration:none">
      <button style="
        padding:12px 24px;
        background-color:#007bff;
        color:#fff;
        border:none;
        border-radius:4px;
        font-size:16px;
        cursor:pointer;
      ">
        ✅ APROBAR COTIZACIÓN
      </button>
    </a>
  `;
  const msg = {
    to: data.clienteEmail,
    from: process.env.FROM_EMAIL,
    subject: `Cotización ${data.numero}`,
    html
  };
  try {
    await sgMail.send(msg);
    return res.sendStatus(200);
  } catch (err) {
    console.error("SendGrid error:", err.response?.body || err);
    return res.status(500).json({ error: err.response?.body || err.message });
  }
});

// 2) Crear PaymentIntent para Stripe
app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body;
  console.log("⚡️ create-payment-intent amount:", amount);

  // Rechazar montos cero o negativos
  if (!amount || amount <= 0) {
    return res.status(400).json({
      error: "El anticipo debe ser mayor a cero para poder generar un pago."
    });
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd"
    });
    return res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("Stripe PaymentIntent error:", err.raw?.message || err);
    return res.status(500).json({
      error: err.raw?.message || err.message || "Error interno de Stripe"
    });
  }
});

// 404 para rutas no definidas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Arrancar el servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});

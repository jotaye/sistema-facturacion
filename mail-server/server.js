// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";

// ——————————————
// CONFIG
// ——————————————
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});
const frontendURL = (process.env.FRONTEND_URL || "").replace(/\/$/, "");

// ——————————————
// APP
// ——————————————
const app = express();
app.use(cors({
  origin: frontendURL,
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(bodyParser.json());

// ——————————————
// 1) Enviar cotización por email
// ——————————————
app.post("/send-quotation", async (req, res) => {
  const d = req.body;
  const html = `
    <h1>Cotización ${d.numero}</h1>
    <p><strong>Total Neto:</strong> $${d.total}</p>
    <a href="${frontendURL}/?numero=${d.numero}&action=checkout">
      <button style="
        padding:12px 24px;
        background:#007bff;
        color:white;
        border:none;
        border-radius:4px;
        font-size:16px;
        cursor:pointer;
      ">PAGAR ANTICIPO</button>
    </a>
  `;
  try {
    await sgMail.send({
      to: d.clienteEmail,
      from: process.env.FROM_EMAIL,
      subject: `Tu cotización ${d.numero}`,
      html
    });
    res.sendStatus(200);
  } catch (err) {
    console.error("SendGrid error:", err.response?.body || err);
    res.status(500).json({ error: err.response?.body || err.message });
  }
});

// ——————————————
// 2) Crear sesión de Checkout
// ——————————————
app.post("/create-checkout-session", async (req, res) => {
  const { anticipo, numero } = req.body;
  if (!anticipo || anticipo <= 0) {
    return res.status(400).json({ error: "Anticipo debe ser mayor a cero." });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Anticipo Cotización ${numero}` },
          unit_amount: Math.round(anticipo * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${frontendURL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendURL}?canceled=true`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout error:", err.raw?.message || err);
    res.status(500).json({ error: err.raw?.message || err.message });
  }
});

// ——————————————
// 404
// ——————————————
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ——————————————
// ARRANQUE
// ——————————————
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});

// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";

// ——————————————
// CONFIGURACIÓN
// ——————————————
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const FRONTEND_URL = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ——————————————
// APP
// ——————————————
const app = express();

// 1) WEBHOOK de Stripe (usa raw body)
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error("⚠️ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const numero = session.metadata.numero;
      const clienteEmail = session.customer_details?.email;
      console.log(`✅ Pago completado para cotización ${numero}, email: ${clienteEmail}`);

      if (clienteEmail) {
        // Construye un email con link a la factura en tu frontend
        const html = `
          <h1>Factura ${numero}</h1>
          <p>Gracias por tu pago de <strong>$${(session.amount_total/100).toFixed(2)}</strong>.</p>
          <p>Puedes ver y descargar tu factura aquí:</p>
          <a href="${FRONTEND_URL}/?success=true&numero=${numero}" target="_blank" style="
            display:inline-block;
            padding:12px 24px;
            background-color:#28a745;
            color:white;
            text-decoration:none;
            border-radius:4px;
            font-size:16px;
          ">Ver Factura</a>
        `;
        try {
          await sgMail.send({
            to: clienteEmail,
            from: process.env.FROM_EMAIL,
            subject: `Tu factura ${numero}`,
            html,
          });
          console.log(`📧 Email de factura enviado a ${clienteEmail}`);
        } catch (e) {
          console.error("❌ Error enviando email de factura:", e.response?.body || e);
        }
      }
    }

    res.sendStatus(200);
  }
);

// Middlewares para el resto de endpoints
app.use(cors({ origin: FRONTEND_URL }));
app.use(bodyParser.json());

// 2) Enviar cotización por email (igual que antes)
app.post("/send-quotation", async (req, res) => {
  const d = req.body;
  const html = `
    <h1>Cotización ${d.numero}</h1>
    <p><strong>Total Neto:</strong> $${d.total}</p>
    <a href="${FRONTEND_URL}/?action=checkout&numero=${d.numero}">
      <button style="
        padding:12px 24px;
        background-color:#007bff;
        color:white;
        border:none;
        border-radius:4px;
        font-size:16px;
        cursor:pointer;
      ">💳 PAGAR ANTICIPO</button>
    </a>
  `;
  try {
    await sgMail.send({
      to: d.clienteEmail,
      from: process.env.FROM_EMAIL,
      subject: `Cotización ${d.numero}`,
      html,
    });
    res.sendStatus(200);
  } catch (err) {
    console.error("SendGrid error:", err.response?.body || err);
    res.status(500).json({ error: err.response?.body || err.message });
  }
});

// 3) Crear sesión de Stripe Checkout
app.post("/create-checkout-session", async (req, res) => {
  const { anticipo, numero } = req.body;
  if (!anticipo || anticipo <= 0) {
    return res
      .status(400)
      .json({ error: "El anticipo debe ser mayor a cero." });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Anticipo Cotización ${numero}` },
            unit_amount: Math.round(anticipo * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${FRONTEND_URL}/?success=true&numero=${numero}`,
      cancel_url: `${FRONTEND_URL}?canceled=true`,
      metadata: { numero },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout error:", err.raw?.message || err);
    res.status(500).json({ error: err.raw?.message || err.message });
  }
});

// 404 para todo lo demás
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Arrancar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
});

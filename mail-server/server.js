// server.js
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

const app = express();
const PORT = process.env.PORT || 10000;

// Configura SendGrid y Stripe
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// 1️⃣ WEBHOOK (debe ir ANTES de cualquier body-parser o CORS)
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("⚠️ Error de firma webhook:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const numero = session.metadata.numero;
      const email = session.customer_details.email;
      const total = (session.amount_total / 100).toFixed(2);

      // Envía el email con el link a la factura
      const html = `
        <h1>Factura ${numero}</h1>
        <p>Gracias por tu pago de <strong>$${total}</strong>.</p>
        <p>Puedes ver o descargar tu factura aquí:</p>
        <a href="${process.env.FRONTEND_URL}/?success=true&numero=${numero}">
          Ver Factura
        </a>
      `;
      try {
        await sgMail.send({
          to: email,
          from: process.env.FROM_EMAIL,
          subject: `Tu factura ${numero}`,
          html,
        });
        console.log(`📧 Email enviado a ${email} para cotización ${numero}`);
      } catch (e) {
        console.error("❌ Error enviando email:", e);
      }
    }

    res.sendStatus(200);
  }
);

// 2️⃣ CORS y body-parser (JSON)
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  })
);
app.use(express.json());

// 3️⃣ Crear sesión de Checkout
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { numero, anticipo, clienteEmail } = req.body;
    // Asegúrate de parsear y convertir a entero de centavos:
    const anticipoFloat = parseFloat(anticipo) || 0;
    const amountCents = Math.round(anticipoFloat * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Anticipo Cotización ${numero}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/?success=true&numero=${numero}`,
      cancel_url: `${process.env.FRONTEND_URL}/?canceled=true`,
      metadata: { numero },
      customer_email: clienteEmail, // para recibos de Stripe
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Error creando sesión:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ (Opcional) Enviar cotización sin pagar
app.post("/send-quotation", async (req, res) => {
  try {
    const { numero, clienteEmail } = req.body;
    const html = `
      <h1>Cotización ${numero}</h1>
      <p>Puedes revisar tu cotización aquí:</p>
      <a href="${process.env.FRONTEND_URL}/?numero=${numero}">
        Ver Cotización
      </a>
    `;
    await sgMail.send({
      to: clienteEmail,
      from: process.env.FROM_EMAIL,
      subject: `Tu cotización ${numero}`,
      html,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error enviando cotización:", e);
    res.status(500).json({ error: "Error enviando email" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Mail‐server corriendo en puerto ${PORT}`)
);

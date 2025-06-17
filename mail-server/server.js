// server.js
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configura SendGrid y Stripe
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// 1️⃣ WEBHOOK: escucha el pago completado y envía una Invoice
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
      const email  = session.customer_details.email;
      const amount = session.amount_total; // en cents

      try {
        // 1) Crea (o recupera) Customer en Stripe
        let customer;
        if (session.customer) {
          customer = await stripe.customers.retrieve(session.customer);
        } else {
          customer = await stripe.customers.create({
            email,
            metadata: { numero }
          });
        }

        // 2) Crea InvoiceItem con el anticipo
        await stripe.invoiceItems.create({
          customer: customer.id,
          amount: amount,
          currency: "usd",
          description: `Anticipo Cotización ${numero}`,
          metadata: { numero }
        });

        // 3) Crea y envía la Invoice al cliente
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          collection_method: "send_invoice",
          days_until_due: 0,
          metadata: { numero }
        });
        await stripe.invoices.sendInvoice(invoice.id);

        console.log(`✅ Invoice enviada para cotización ${numero} a ${email}`);
      } catch (e) {
        console.error("❌ Error generando/enviando Invoice:", e);
      }
    }

    res.sendStatus(200);
  }
);

// 2️⃣ CORS y JSON
const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
app.use(
  cors({
    origin: frontendUrl,
  })
);
app.use(express.json());

// 3️⃣ Crear sesión de Checkout
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { numero, anticipo, clienteEmail } = req.body;
    const anticipoFloat = parseFloat(anticipo) || 0;
    const amountCents   = Math.round(anticipoFloat * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Anticipo Cotización ${numero}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${frontendUrl}/?success=true&numero=${numero}`,
      cancel_url: `${frontendUrl}/?canceled=true`,
      metadata: { numero },
      customer_email: clienteEmail,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Error creando sesión:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Enviar cotización (sin pagar)
app.post("/send-quotation", async (req, res) => {
  try {
    const { numero, clienteEmail } = req.body;
    const approveUrl = `${frontendUrl}/?action=checkout&numero=${numero}`;
    const html = `
      <h1>Cotización ${numero}</h1>
      <p>Puedes revisar tu cotización o aprobarla para pagar el anticipo:</p>
      <p style="margin:20px 0;">
        <a
          href="${approveUrl}"
          style="
            display:inline-block;
            padding:12px 24px;
            background-color:#1a73e8;
            color:#fff;
            text-decoration:none;
            border-radius:4px;
            font-weight:bold;
          "
        >
          ✅ APROBAR COTIZACIÓN
        </a>
      </p>
      <p>Si solo quieres verla, haz clic aquí:</p>
      <a href="${frontendUrl}/?numero=${numero}">Ver Cotización</a>
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

import express from "express";
import cors from "cors";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

const app = express();
const PORT = process.env.PORT || 10000;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// 1️⃣ Webhook (raw body)
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const numero  = session.metadata.numero;
    const email   = session.customer_details.email;
    const total   = (session.amount_total/100).toFixed(2);

    // Enviar factura definitiva
    const htmlInv = `
      <img src="https://tu-dominio.com/logo-header.png" alt="Jotaye Logo" width="200"/>
      <h1>Factura ${numero}</h1>
      <p>Gracias por tu pago de <strong>$${total}</strong>.</p>
      <p>Descarga tu factura aquí:</p>
      <a href="${process.env.FRONTEND_URL}/?success=true&numero=${numero}">
        Ver / Descargar Factura
      </a>
    `;
    try {
      await sgMail.send({
        to: email,
        from: process.env.FROM_EMAIL,
        subject: `Tu factura ${numero}`,
        html: htmlInv
      });
      console.log(`📧 Factura enviada a ${email}`);
    } catch (e) {
      console.error("❌ Error enviando factura:", e);
    }
  }

  res.sendStatus(200);
});

// 2️⃣ CORS y JSON
const FRONT = (process.env.FRONTEND_URL||"").replace(/\/+$/,"");
app.use(cors({ origin: FRONT }));
app.use(express.json());

// 3️⃣ Crear sesión de checkout
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { numero, anticipo, clienteEmail } = req.body;
    const amountCents = Math.round(parseFloat(anticipo)*100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data:{
          currency: "usd",
          product_data:{ name:`Anticipo Cotización ${numero}` },
          unit_amount: amountCents
        },
        quantity:1
      }],
      mode: "payment",
      success_url: `${FRONT}/?success=true&numero=${numero}`,
      cancel_url:  `${FRONT}/?canceled=true`,
      metadata: { numero },
      customer_email: clienteEmail
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Error creando sesión:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Enviar cotización
app.post("/send-quotation", async (req, res) => {
  try {
    const { numero, clienteEmail } = req.body;
    const htmlCot = `
      <img src="https://tu-dominio.com/logo-header.png" alt="Jotaye Logo" width="200"/>
      <h1>Cotización ${numero}</h1>
      <p>Puedes revisar tu cotización y aprobar el anticipo desde aquí:</p>
      <a href="${FRONT}/?action=checkout&numero=${numero}"
         style="display:inline-block;
                padding:12px 20px;
                background:#0070f3;
                color:#fff;
                text-decoration:none;
                border-radius:4px;">
        Aprobar cotización y pagar
      </a>
    `;
    await sgMail.send({
      to: clienteEmail,
      from: process.env.FROM_EMAIL,
      subject: `Tu cotización ${numero}`,
      html: htmlCot
    });
    res.json({ ok:true });
  } catch (e) {
    console.error("❌ Error enviando cotización:", e);
    res.status(500).json({ error:"Error enviando email" });
  }
});

app.listen(PORT, ()=>console.log(`🚀 Mail‐server corriendo en puerto ${PORT}`));

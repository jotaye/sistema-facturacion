// server.js
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

const app = express();
const PORT = process.env.PORT || 10000;

// 0️⃣ Configurar SendGrid y Stripe
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// 1️⃣ Webhook (raw body, ANTES de CORS / JSON parser)
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
      console.error("⚠️ Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const numero = session.metadata.numero;
      const email = session.customer_details.email;
      const total = (session.amount_total / 100).toFixed(2);

      // Enviar factura final al cliente
      const invoiceHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <div style="text-align:center">
            <img src="https://sistema-facturacion-iota.vercel.app/logo-header.png" 
                 alt="Logo" style="max-width:200px;margin-bottom:20px"/>
            <h1>Factura ${numero}</h1>
          </div>
          <p>Gracias por tu pago de <strong>$${total}</strong>.</p>
          <p>Puedes ver o descargar tu factura completa aquí:</p>
          <p><a href="${process.env.FRONTEND_URL}/?success=true&numero=${numero}">
            Ver Factura
          </a></p>
        </div>
      `;

      try {
        await sgMail.send({
          to: email,
          from: process.env.FROM_EMAIL,      // debe ser sales@jotayegroupllc.com
          subject: `Tu factura ${numero}`,
          html: invoiceHtml,
        });
        console.log(`📧 Factura ${numero} enviada a ${email}`);
      } catch (e) {
        console.error("❌ Error enviando factura:", e);
      }
    }

    res.sendStatus(200);
  }
);

// 2️⃣ CORS y body-parser PARA TODAS las demás rutas
const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
app.use(
  cors({
    origin: frontendUrl,
  })
);
app.use(express.json());

// 3️⃣ Crear sesión de Checkout (Stripe)
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { numero, anticipo, clienteEmail } = req.body;
    const amountCents = Math.round((parseFloat(anticipo) || 0) * 100);

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
      cancel_url:  `${frontendUrl}/?canceled=true`,
      metadata: { numero },
      customer_email: clienteEmail,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Error creando Checkout Session:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Enviar cotización por email (SendGrid)
app.post("/send-quotation", async (req, res) => {
  try {
    const {
      numero, clienteEmail,
      items, concepto,
      observaciones, subtotal,
      descuento, impuestos,
      anticipo, total
    } = req.body;

    // Montar la tabla de items
    const rowsHtml = (items || []).map(it => `
      <tr>
        <td style="border:1px solid #333;padding:5px">${it.id}</td>
        <td style="border:1px solid #333;padding:5px">${it.descripcion}</td>
        <td style="border:1px solid #333;padding:5px">${it.cantidad}</td>
        <td style="border:1px solid #333;padding:5px">$${it.precio.toFixed(2)}</td>
        <td style="border:1px solid #333;padding:5px">$${it.total.toFixed(2)}</td>
      </tr>
    `).join("");

    // HTML del email
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <div style="text-align:center;margin-bottom:20px">
          <img src="https://sistema-facturacion-iota.vercel.app/logo-header.png"
               alt="Logo" style="max-width:200px;"/><br/>
          <h1>Cotización ${numero}</h1>
        </div>
        <p>Puedes revisar tu cotización y aprobar el anticipo desde aquí:</p>
        <p style="text-align:center">
          <a href="${frontendUrl}/?action=checkout&numero=${numero}"
             style="display:inline-block;
                    background:#007bff;color:#fff;
                    padding:10px 20px;
                    text-decoration:none;
                    border-radius:5px">
            Aprobar cotización y pagar
          </a>
        </p>
        <h2>Detalle</h2>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="border:1px solid #333;padding:5px">ID</th>
              <th style="border:1px solid #333;padding:5px">Descripción</th>
              <th style="border:1px solid #333;padding:5px">Cantidad</th>
              <th style="border:1px solid #333;padding:5px">Precio Unit.</th>
              <th style="border:1px solid #333;padding:5px">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <h2>Resumen</h2>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Descuento: $${descuento.toFixed(2)}</p>
        <p>Impuestos: $${impuestos.toFixed(2)}</p>
        <p>Anticipo sugerido: $${anticipo.toFixed(2)}</p>
        <h3>Total: $${total.toFixed(2)}</h3>
        <h2>Información Adicional</h2>
        <p><strong>Concepto:</strong> ${concepto}</p>
        <p><strong>Observaciones:</strong><br/>
           ${observaciones.replace(/\n/g,"<br/>")}</p>
        <hr/>
        <p><em>Nota:</em> Los pagos con tarjeta tienen un recargo
           del 3% por procesamiento.</p>
      </div>
    `;

    await sgMail.send({
      to: clienteEmail,
      from: process.env.FROM_EMAIL,  // sales@jotayegroupllc.com
      subject: `Tu cotización ${numero}`,
      html
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error en /send-quotation:", e);
    res.status(500).json({ error: "Error enviando cotización" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Mail‐server corriendo en puerto ${PORT}`)
);

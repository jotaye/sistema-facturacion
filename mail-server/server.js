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

// 1️⃣ Webhook de Stripe (raw body)
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

      // HTML de la factura final
      const htmlInvoice = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <img src="https://tu-dominio.com/logo-header.png" alt="Jotaye Logo" style="width:150px;display:block;margin:20px auto"/>
          <h2 style="text-align:center">FACTURA ${numero}</h2>
          <p>Gracias por tu pago de <strong>$${total}</strong>.</p>
          <p>Puedes ver o descargar tu factura en tu panel:</p>
          <p><a href="${process.env.FRONTEND_URL}/?success=true&numero=${numero}"
             style="background:#0070f3;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">
             Ver Factura
          </a></p>
        </div>
      `;

      try {
        await sgMail.send({
          to: email,
          from: "sales@jotayegroupllc.com",
          subject: `Tu factura ${numero}`,
          html: htmlInvoice,
        });
        console.log(`📧 Email de factura enviado a ${email}`);
      } catch (e) {
        console.error("❌ Error enviando factura:", e);
      }
    }

    res.sendStatus(200);
  }
);

// 2️⃣ CORS + JSON
const FRONT = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
app.use(cors({ origin: FRONT }));
app.use(express.json());

// 3️⃣ Crear sesión de Stripe Checkout
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { numero, anticipo, clienteEmail } = req.body;
    const amountCents = Math.round(parseFloat(anticipo) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Anticipo Cotización ${numero}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${FRONT}/?success=true&numero=${numero}`,
      cancel_url: `${FRONT}/?canceled=true`,
      metadata: { numero },
      customer_email: clienteEmail,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Error creando sesión:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Enviar cotización por email (ahora con HTML completo)
app.post("/send-quotation", async (req, res) => {
  try {
    const {
      numero,
      clienteEmail,
      fecha,
      clienteNombre,
      clienteTipo,
      clienteDireccion,
      clienteTelefono,
      items,
      concepto,
      observaciones,
      subtotal,
      descuento,
      impuestos,
      anticipo,
      total,
    } = req.body;

    // Construyo la tabla de ítems
    const rowsHtml = items
      .map(
        (it) => `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;">${it.id}</td>
        <td style="border:1px solid #ddd;padding:8px;">${it.descripcion}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;">${
          it.cantidad
        }</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;">$${it.precio.toFixed(
          2
        )}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:right;">$${it.total.toFixed(
          2
        )}</td>
      </tr>`
      )
      .join("");

    const htmlCot = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <img src="https://tu-dominio.com/logo-header.png" alt="Jotaye Logo" style="width:150px;display:block;margin:20px auto"/>
        <h2 style="text-align:center">COTIZACIÓN ${numero}</h2>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Cliente:</strong> ${clienteNombre} (${clienteTipo})</p>
        <p><strong>Dirección:</strong> ${clienteDireccion}</p>
        <p><strong>Teléfono:</strong> ${clienteTelefono}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="border:1px solid #ddd;padding:8px">ID</th>
              <th style="border:1px solid #ddd;padding:8px">Descripción</th>
              <th style="border:1px solid #ddd;padding:8px;text-align:right">Cant.</th>
              <th style="border:1px solid #ddd;padding:8px;text-align:right">Precio</th>
              <th style="border:1px solid #ddd;padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <p style="margin-top:20px"><strong>Concepto:</strong> ${concepto}</p>
        <p><strong>Observaciones:</strong> ${observaciones}</p>
        <hr/>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Descuento: $${descuento.toFixed(2)}</p>
        <p>Impuestos: $${impuestos.toFixed(2)}</p>
        <p>Anticipo sugerido: $${anticipo.toFixed(2)}</p>
        <p><strong>Total Neto: $${total.toFixed(2)}</strong></p>
        <p style="text-align:center;margin:30px 0">
          <a href="${FRONT}/?action=checkout&numero=${numero}"
             style="background:#0070f3;color:#fff;padding:12px 20px;
                    text-decoration:none;border-radius:4px;">
            Aprobar cotización y pagar
          </a>
        </p>
      </div>
    `;

    await sgMail.send({
      to: clienteEmail,
      from: "sales@jotayegroupllc.com",
      subject: `Tu cotización ${numero}`,
      html: htmlCot,
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

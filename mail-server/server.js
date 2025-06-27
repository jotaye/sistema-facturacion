import express from "express";
import cors from "cors";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

const app = express();
const PORT = process.env.PORT || 10000;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// 1️⃣ Webhook (raw)
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const sig   = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const numero  = session.metadata.numero;
      const email   = session.customer_details.email;
      const total   = (session.amount_total/100).toFixed(2);
      const htmlInv = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <div style="text-align:center">
            <img src="${process.env.FRONTEND_URL}/logo-header.png" alt="Logo" style="max-width:200px;margin-bottom:20px"/>
            <h1>Factura ${numero}</h1>
          </div>
          <p>Gracias por tu pago de <strong>$${total}</strong>.</p>
          <p><a href="${process.env.FRONTEND_URL}/?success=true&numero=${numero}">Ver Factura</a></p>
        </div>`;
      await sgMail.send({ to: email, from: process.env.FROM_EMAIL, subject:`Tu factura ${numero}`, html: htmlInv });
      console.log(`Factura ${numero} enviada a ${email}`);
    }
  } catch (e) {
    console.error("Webhook error:", e);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  res.sendStatus(200);
});

// 2️⃣ CORS + JSON
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// 3️⃣ Crear Checkout
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { numero, anticipo, clienteEmail } = req.body;
    const amountCents = Math.round((parseFloat(anticipo)||0)*100);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data:{ currency:"usd", product_data:{ name:`Anticipo ${numero}` }, unit_amount:amountCents }, quantity:1 }],
      mode:"payment",
      success_url:`${process.env.FRONTEND_URL}/?success=true&numero=${numero}`,
      cancel_url:`${process.env.FRONTEND_URL}/?canceled=true`,
      metadata:{ numero }, customer_email: clienteEmail
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    res.status(500).json({ error: e.message });
  }
});

// 4️⃣ Enviar cotización
app.post("/send-quotation", async (req, res) => {
  try {
    const { numero, clienteEmail, items, concepto, observaciones, subtotal, descuento, impuestos, anticipo, total } = req.body;
    const rows = (items||[]).map(it=>`
      <tr>
        <td style="border:1px solid #333;padding:5px">${it.id}</td>
        <td style="border:1px solid #333;padding:5px">${it.descripcion}</td>
        <td style="border:1px solid #333;padding:5px">${it.cantidad}</td>
        <td style="border:1px solid #333;padding:5px">$${it.precio.toFixed(2)}</td>
        <td style="border:1px solid #333;padding:5px">$${it.total.toFixed(2)}</td>
      </tr>`).join("");
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <div style="text-align:center;margin-bottom:20px">
          <img src="${process.env.FRONTEND_URL}/logo-header.png" alt="Logo" style="max-width:200px;"/><br/>
          <h1>Cotización ${numero}</h1>
        </div>
        <p>Revisa y <strong>aprueba tu cotización</strong> aquí:</p>
        <p style="text-align:center">
          <a href="${process.env.FRONTEND_URL}/?action=checkout&numero=${numero}"
             style="background:#007bff;color:#fff;padding:10px 20px;
                    text-decoration:none;border-radius:5px">
            Aprobar cotización y pagar
          </a>
        </p>
        <h2>Detalle</h2>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="border:1px solid #333;padding:5px">ID</th>
            <th style="border:1px solid #333;padding:5px">Desc.</th>
            <th style="border:1px solid #333;padding:5px">Cant.</th>
            <th style="border:1px solid #333;padding:5px">Precio</th>
            <th style="border:1px solid #333;padding:5px">Total</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <h2>Resumen</h2>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Descuento: $${descuento.toFixed(2)}</p>
        <p>Impuestos: $${impuestos.toFixed(2)}</p>
        <p>Anticipo sugerido: $${anticipo.toFixed(2)}</p>
        <h3>Total: $${total.toFixed(2)}</h3>
        <h2>Información Adicional</h2>
        <p><strong>Concepto:</strong> ${concepto}</p>
        <p><strong>Observaciones:</strong><br/>${observaciones.replace(/\n/g,"<br/>")}</p>
        <hr/>
        <p><em>Nota:</em> Pagos con tarjeta con recargo 3%.</p>
      </div>`;
    await sgMail.send({ to: clienteEmail, from: process.env.FROM_EMAIL, subject:`Tu cotización ${numero}`, html });
    res.json({ ok:true });
  } catch (e) {
    console.error("send-quotation error:", e);
    res.status(500).json({ error:"Error enviando cotización" });
  }
});

app.listen(PORT, ()=>console.log(`🚀 Server corriendo en puerto ${PORT}`));

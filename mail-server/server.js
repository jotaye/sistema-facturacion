// === server.js con botón de pago en correo e integración de recibo ===

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// === Ruta para enviar cotización o factura por correo ===
app.post("/send-quotation", async (req, res) => {
  const { numero, to, subject, texto, pdfBase64, tipo, datos } = req.body;

  if (!numero || !to || !subject || !texto || !tipo) {
    return res.status(400).json({ ok: false, error: "Faltan datos requeridos." });
  }

  let htmlContent = "";

  if (tipo === "factura" && datos) {
    htmlContent = `
      <h2>Your invoice from Jotaye Group LLC</h2>
      <p>Hi ${datos.cliente.nombre},</p>
      <p>Thank you for choosing Jotaye Group LLC. Please see attached invoice due upon receipt.</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><th>Service</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        ${datos.items.map(item => `
          <tr>
            <td>${item.descripcion}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precio}</td>
            <td>$${item.total}</td>
          </tr>`).join("")}
      </table>
      <p><strong>Total:</strong> $${datos.resumen.total}</p>
      <p><strong>Advance:</strong> $${datos.resumen.anticipo}</p>
      <br>
      <a href="https://sistema-facturacion-iota.vercel.app/" target="_blank" style="padding:10px 20px;background:#28a745;color:white;text-decoration:none;border-radius:5px;">💳 Pagar Anticipo</a>
      <p style="margin-top:10px;font-size:0.9em;color:#555;">Este enlace lo llevará a una página segura para completar el pago del anticipo. Se aplicará una comisión de Stripe (2.9% + $0.30).</p>
    `;
  } else {
    htmlContent = `
      <h2>Your quotation from Jotaye Group LLC</h2>
      <p>Hi ${datos.cliente.nombre},</p>
      <p>Thank you for your interest in Jotaye Group LLC.</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><th>Service</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        ${datos.items.map(item => `
          <tr>
            <td>${item.descripcion}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precio}</td>
            <td>$${item.total}</td>
          </tr>`).join("")}
      </table>
      <p><strong>Total Estimate:</strong> $${datos.resumen.total}</p>
    `;
  }

  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject: `${tipo === "factura" ? "Factura N°" : "Cotización N°"} ${numero} – Jotaye Group LLC`,
    html: htmlContent,
  };

  if (pdfBase64) {
    msg.attachments = [
      {
        content: pdfBase64,
        filename: `${tipo}-${numero}.pdf`,
        type: "application/pdf",
        disposition: "attachment"
      }
    ];
  }

  try {
    await sgMail.send(msg);
    res.json({ ok: true, message: "Correo enviado correctamente." });
  } catch (err) {
    console.error("Error al enviar correo:", err.response?.body || err.message);
    res.status(500).json({ ok: false, error: "Error al enviar correo." });
  }
});

// === Ruta para Stripe checkout ===
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { amount, description, email } = req.body;

    if (!amount || !description || !email) {
      return res.status(400).json({ error: "Datos incompletos." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: description },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1
      }],
      success_url: `${process.env.FRONTEND_URL}?pago=exitoso`,
      cancel_url: `${process.env.FRONTEND_URL}?pago=cancelado`
    });

    res.json({ sessionUrl: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Error al crear sesión de Stripe" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
});

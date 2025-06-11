// === server.js actualizado con plantilla profesional y botón de pago en correo ===

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

  if (!numero || !to || !subject || !texto || !tipo || !datos) {
    return res.status(400).json({ ok: false, error: "Faltan datos requeridos." });
  }

  const { cliente, resumen, items, concepto = "", observaciones = "" } = datos;
  const total = parseFloat(resumen.total);
  const anticipo = parseFloat(resumen.anticipo);
  const porcentaje = resumen.porcentajeImpuesto;
  const impuesto = resumen.impuestos;
  const subtotal = resumen.subtotal;

  // HTML del correo
  let htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <img src="https://www.jotayegroupllc.com/logo.png" alt="Jotaye Logo" style="height: 60px;">
      <div style="text-align: right;">
        <strong>JOTAYE GROUP LLC</strong><br>
        11201 SW 55Th St, Unit 286<br>
        Miramar FL 33025<br>
        (305) 417-2681<br>
        jotayegroupllc@gmail.com
      </div>
    </div>

    <div style="margin-top: 30px;">
      <strong>Cliente:</strong> ${cliente.nombre}<br>
      <strong>Dirección:</strong> ${cliente.direccion}<br>
      <strong>Teléfono:</strong> ${cliente.telefono}<br>
      <strong>Email:</strong> ${cliente.email}<br><br>
      <strong>${tipo === "factura" ? "Factura" : "Cotización"}:</strong> ${numero}<br>
      <strong>Fecha:</strong> ${datos.fecha || "-"}<br>
      <strong>Concepto:</strong> ${concepto || "-"}
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 200px;">Descripción</th>
          <th style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 80px;">Cantidad</th>
          <th style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 100px;">Precio</th>
          <th style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 200px;">${item.descripcion}</td>
            <td style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 80px;">${item.cantidad}</td>
            <td style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 100px;">$${item.precio}</td>
            <td style="border: 1px solid #ccc; padding: 6px; word-wrap: break-word; max-width: 100px;">$${item.total}</td>
          </tr>`).join("")}
      </tbody>
    </table>

    <div style="text-align: right; margin-top: 20px;">
      <div><strong>Subtotal:</strong> $${subtotal}</div>
      <div><strong>Impuestos (${porcentaje}%):</strong> $${impuesto}</div>
      <div><strong>Anticipo:</strong> $${anticipo}</div>
      <div style="font-size: 1.2em; margin-top: 5px;"><strong>Total:</strong> $${total}</div>
    </div>
  `;

  if (tipo === "factura" && cliente.email && anticipo > 0) {
    htmlContent += `
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://sistema-facturacion-iota.vercel.app" target="_blank" style="padding:12px 24px; background:#28a745; color:white; font-size:16px; text-decoration:none; border-radius:6px;">
        💳 Pagar Anticipo
      </a>
      <p style="font-size: 0.9em; color: #555; margin-top: 10px;">
        Este botón le permitirá pagar el anticipo de su factura. Se aplica una comisión de Stripe (2.9% + $0.30).
      </p>
    </div>
    `;
  }

  htmlContent += `
    <div style="margin-top: 30px; font-size: 0.9em;">
      <strong>Observaciones:</strong><br>${observaciones || "-"}
    </div>
  </div>
  `;

  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject: `${tipo === "factura" ? "Factura N°" : "Cotización N°"} ${numero} – Jotaye Group LLC`,
    html: htmlContent
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

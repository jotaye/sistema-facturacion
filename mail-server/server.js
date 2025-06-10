// mail-server/server.js

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post("/send-quotation", async (req, res) => {
  const { numero, to, subject, texto, pdfBase64, data } = req.body;

  if (!numero || !to || !subject || !texto) {
    return res.status(400).json({ ok: false, error: "Faltan datos requeridos." });
  }

  // Detectar tipo de documento por el subject
  const isFactura = subject.toLowerCase().includes("factura") || numero.startsWith("FAC");
  const isCotizacion = subject.toLowerCase().includes("cotizacion") || numero.startsWith("COT");

  const asuntoFinal = isFactura
    ? `Factura N° ${numero} – Jotaye Group LLC`
    : `Cotización N° ${numero} – Jotaye Group LLC`;

  // Plantilla HTML diferente según el tipo
  let htmlBody = "";

  if (isFactura && data) {
    const {
      cliente,
      resumen,
      items
    } = data;

    const itemsHtml = items.map(i => `
      <tr>
        <td>${i.descripcion}</td>
        <td>${i.cantidad}</td>
        <td>$${i.precio}</td>
        <td>$${i.total}</td>
      </tr>
    `).join("");

    htmlBody = `
      <h2>Your invoice from Jotaye Group LLC</h2>
      <p>Hi ${cliente.nombre},</p>
      <p>Thank you for choosing Jotaye Group LLC. Please see attached invoice due upon receipt.</p>

      <table>
        <tr><td><strong>Job Number:</strong></td><td>${numero}</td></tr>
        <tr><td><strong>Invoice Number:</strong></td><td>${numero}</td></tr>
        <tr><td><strong>Customer Name:</strong></td><td>${cliente.nombre}</td></tr>
        <tr><td><strong>Company Name:</strong></td><td>${cliente.tipo}</td></tr>
        <tr><td><strong>Service Address:</strong></td><td>${cliente.direccion}</td></tr>
      </table>

      <h3>Services</h3>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
        ${itemsHtml}
      </table>

      <p><strong>Subtotal:</strong> $${resumen.subtotal}</p>
      <p><strong>Discount:</strong> $${resumen.descuento}</p>
      <p><strong>Taxes:</strong> $${resumen.impuestos}</p>
      <p><strong>Advance:</strong> $${resumen.anticipo}</p>
      <h3>Total job price: $${resumen.total}</h3>
      <h2>Amount Due: <strong>$${resumen.total}</strong></h2>
    `;
  } else {
    htmlBody = `
      <h2>Gracias por su solicitud</h2>
      <p>${texto}</p>
      <p><strong>Total estimado:</strong> (ver PDF adjunto si aplica)</p>
    `;
  }

  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject: asuntoFinal,
    html: htmlBody,
  };

  if (pdfBase64) {
    msg.attachments = [
      {
        content: pdfBase64,
        filename: `${isFactura ? "Factura" : "Cotizacion"}-${numero}.pdf`,
        type: "application/pdf",
        disposition: "attachment",
      },
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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

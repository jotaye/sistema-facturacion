// === server.js con cuerpo de correo para cotización y factura ===

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

      <p><strong>Job Number:</strong> ${numero}<br />
      <strong>Invoice Number:</strong> ${numero}<br />
      <strong>Customer Name:</strong> ${datos.cliente.nombre}<br />
      <strong>Company Name:</strong> ${datos.cliente.tipo}<br />
      <strong>Service Address:</strong> ${datos.cliente.direccion}</p>

      <p><strong>Concept:</strong> ${datos.concepto || "-"}</p>

      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><th>Services</th><th>qty</th><th>unit price</th><th>amount</th></tr>
        ${datos.items.map(item => `
          <tr>
            <td>${item.descripcion}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precio}</td>
            <td>$${item.total}</td>
          </tr>`).join('')}
      </table>

      <p>
        <strong>Subtotal:</strong> $${datos.resumen.subtotal}<br />
        <strong>Discount:</strong> $${datos.resumen.descuento}<br />
        <strong>Taxes:</strong> $${datos.resumen.impuestos}<br />
        <strong>Advance:</strong> $${datos.resumen.anticipo}<br />
        <strong>Total job price:</strong> $${datos.resumen.total}<br />
        <strong><span style="font-size: 1.2em;">Amount Due:</span></strong> <strong>$${datos.resumen.total}</strong>
      </p>
      <p><strong>Observations:</strong> ${datos.observaciones || "-"}</p>
    `;
  } else if (tipo === "cotizacion" && datos) {
    htmlContent = `
      <h2>Your quotation from Jotaye Group LLC</h2>
      <p>Hi ${datos.cliente.nombre},</p>
      <p>Thank you for your interest in Jotaye Group LLC. Please find below the details of your quotation:</p>

      <p><strong>Quotation Number:</strong> ${numero}<br />
      <strong>Date:</strong> ${datos.fecha}<br />
      <strong>Customer Name:</strong> ${datos.cliente.nombre}<br />
      <strong>Company Name:</strong> ${datos.cliente.tipo}<br />
      <strong>Service Address:</strong> ${datos.cliente.direccion}</p>

      <p><strong>Concept:</strong> ${datos.concepto || "-"}</p>

      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><th>Services</th><th>qty</th><th>unit price</th><th>amount</th></tr>
        ${datos.items.map(item => `
          <tr>
            <td>${item.descripcion}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precio}</td>
            <td>$${item.total}</td>
          </tr>`).join('')}
      </table>

      <p>
        <strong>Subtotal:</strong> $${datos.resumen.subtotal}<br />
        <strong>Discount:</strong> $${datos.resumen.descuento}<br />
        <strong>Taxes:</strong> $${datos.resumen.impuestos}<br />
        <strong>Total estimated:</strong> $${datos.resumen.total}
      </p>
      <p><strong>Observations:</strong> ${datos.observaciones || "-"}</p>

      <p>We look forward to working with you.<br />Sincerely,<br /><strong>Jotaye Group LLC</strong></p>
    `;
  } else {
    htmlContent = `
      <h2>Gracias por su solicitud</h2>
      <p>${texto}</p>
      <p><strong>Total estimado:</strong> (ver PDF adjunto si aplica)</p>
    `;
  }

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
        filename: `${tipo === "factura" ? "Factura" : "Cotizacion"}-${numero}.pdf`,
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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

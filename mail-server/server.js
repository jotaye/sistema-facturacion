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
  const { numero, to, subject, texto, pdfBase64 } = req.body;

  if (!numero || !to || !subject || !texto) {
    return res.status(400).json({ ok: false, error: "Faltan datos requeridos." });
  }

  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject: `Cotización N° ${numero} – ${subject}`,
    html: `
      <h2>Gracias por su solicitud</h2>
      <p>${texto}</p>
      <p><strong>Total estimado:</strong> (ver PDF adjunto si aplica)</p>
    `,
  };

  // Si hay PDF adjunto en base64
  if (pdfBase64) {
    msg.attachments = [
      {
        content: pdfBase64,
        filename: `Cotizacion-${numero}.pdf`,
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

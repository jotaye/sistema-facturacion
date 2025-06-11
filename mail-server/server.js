import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Setup SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Setup Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Correo con PDF
app.post("/send-quotation", async (req, res) => {
  const { to, subject, texto, tipo, numero, datos } = req.body;

  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject: `${subject} - ${numero}`,
    html: `
      <h3>${subject} de Jotaye Group LLC</h3>
      <p>${texto}</p>
      <p><strong>Total:</strong> $${datos.resumen.total}</p>
      <p>Si deseas pagar, puedes hacerlo desde el enlace que te proporcionaremos en breve.</p>
      <p>Gracias por confiar en nosotros.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    res.status(200).send("Correo enviado");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al enviar correo");
  }
});

// Checkout Stripe
app.post("/create-checkout-session", async (req, res) => {
  const { amount, email, descripcion } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: descripcion || "Pago Jotaye Group",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}?pago=exito`,
      cancel_url: `${process.env.FRONTEND_URL}?pago=cancelado`,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al crear sesión de pago");
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

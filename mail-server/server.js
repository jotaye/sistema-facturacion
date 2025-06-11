
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const app = express();
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(STRIPE_SECRET_KEY);

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/send-quotation', async (req, res) => {
  const { to, subject, texto } = req.body;
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    text: texto,
  };
  try {
    await sgMail.send(msg);
    res.status(200).send('Email enviado');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error enviando correo');
  }
});

app.post('/create-checkout-session', async (req, res) => {
  const { amount, description } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: description,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error al crear sesión:", error);
    res.status(500).send("Fallo al crear sesión de Stripe");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

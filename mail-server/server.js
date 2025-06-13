import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";
import { readFileSync } from "fs";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(bodyParser.json());

// Enviar cotización por email
app.post("/send-quotation", async (req, res) => {
  const data = req.body;
  const html = `<h1>Cotización ${data.numero}</h1>
    <p>Subtotal: $${data.subtotal}</p>
    <!-- botón aprobar -->
    <a href="${process.env.FRONTEND_URL}/?numero=${data.numero}&action=approve">APROBAR COTIZACIÓN</a>
  `;
  const msg = { to: data.clienteEmail, from: process.env.FROM_EMAIL, subject:`Cotización ${data.numero}`, text: html, html };
  try { await sgMail.send(msg); res.sendStatus(200); }
  catch(e){ console.error(e); res.sendStatus(500); }
});

// Crear PaymentIntent para Stripe Elements
app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body;
  try {
    const intent = await stripe.paymentIntents.create({ amount: Math.round(amount*100), currency: "usd" });
    res.json({ clientSecret: intent.client_secret });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Servir PDF o HTML adicionales si hace falta...

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log("Backend corriendo en puerto",PORT));

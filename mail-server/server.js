// server.js (Express + SendGrid + Stripe)
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

const app = express();
const PORT = process.env.PORT || 10000;

// Setups
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY,{ apiVersion:"2022-11-15" });

// 1️⃣ Webhook Stripe (raw body)
app.post("/webhook",
  express.raw({type:"application/json"}),
  async (req,res)=>{
    const sig=req.headers["stripe-signature"];
    let event;
    try {
      event=stripe.webhooks.constructEvent(
        req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch(e){
      console.error("Webhook signature error:", e.message);
      return res.status(400).send(`Webhook Error: ${e.message}`);
    }
    if(event.type==="checkout.session.completed"){
      const sess=event.data.object;
      const numero=sess.metadata.numero;
      const email=sess.customer_details.email;
      // Envío de Invoice Link
      const html=`
        <h1>Factura ${numero}</h1>
        <p>Gracias por tu pago.</p>
        <p>Descarga tu factura aquí:</p>
        <a href="${process.env.FRONTEND_URL}/?success=true&numero=${numero}">
          Ver Factura
        </a>`;
      try {
        await sgMail.send({
          to: email,
          from: process.env.FROM_EMAIL,
          subject: `Tu factura ${numero}`,
          html
        });
        console.log(`Invoice enviado a ${email}`);
      } catch(e){
        console.error("Error enviando invoice:", e);
      }
    }
    res.sendStatus(200);
  }
);

// 2️⃣ CORS y JSON
const FRONT = (process.env.FRONTEND_URL||"").replace(/\/+$/,"");
app.use(cors({origin:FRONT}));
app.use(express.json());

// 3️⃣ Crear Checkout Session
app.post("/create-checkout-session", async (req,res)=>{
  try {
    const {numero, anticipo, clienteEmail} = req.body;
    const anticipoFloat = parseFloat(anticipo)||0;
    const amountCents = Math.round(anticipoFloat*100);
    const session = await stripe.checkout.sessions.create({
      payment_method_types:["card"],
      line_items:[{
        price_data:{
          currency:"usd",
          product_data:{name:`Anticipo Cotización ${numero}`},
          unit_amount: amountCents
        },
        quantity:1
      }],
      mode:"payment",
      success_url:`${FRONT}/?success=true&numero=${numero}`,
      cancel_url:`${FRONT}/?canceled=true`,
      metadata:{numero},
      customer_email: clienteEmail
    });
    res.json({url:session.url});
  } catch(e){
    console.error("Error creando sesión:", e);
    res.status(500).json({error:e.message});
  }
});

// 4️⃣ Enviar Cotización
app.post("/send-quotation", async (req,res)=>{
  try {
    const {numero, clienteEmail} = req.body;
    const html=`
      <h1>Cotización ${numero}</h1>
      <p>Revisa tu cotización aquí:</p>
      <a href="${FRONT}/?numero=${numero}">Ver Cotización</a>`;
    await sgMail.send({
      to: clienteEmail,
      from: process.env.FROM_EMAIL,
      subject:`Tu cotización ${numero}`,
      html
    });
    res.json({ok:true});
  } catch(e){
    console.error("Error enviando cotización:", e);
    res.status(500).json({error:"Error enviando cotización"});
  }
});

app.listen(PORT, ()=>console.log(`Mail-server en puerto ${PORT}`));

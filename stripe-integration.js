// === stripe-integration.js ===
// Este script agrega una sección de pago con Stripe Elements embebido en tu interfaz sin modificar tu sistema actual.

// Incluye el Stripe.js en tu index.html (dentro de <head>):
// <script src="https://js.stripe.com/v3/"></script>

let stripe;
let elements;
let card;

async function initializeStripe(publicKey) {
  stripe = Stripe(publicKey);
  elements = stripe.elements();

  card = elements.create("card");
  card.mount("#card-element");

  card.on("change", (event) => {
    const displayError = document.getElementById("card-errors");
    if (event.error) {
      displayError.textContent = event.error.message;
    } else {
      displayError.textContent = "";
    }
  });
}

async function createPaymentIntent(data, tipoPago) {
  const res = await fetch("https://mail-server-byrb.onrender.com/create-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data, tipoPago })
  });

  return res.json();
}

async function handleStripePayment(tipoPago) {
  const datos = obtenerDatosCotizacion();
  const resumen = datos.resumen;

  const result = await createPaymentIntent(datos, tipoPago);

  const { clientSecret } = result;

  const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: card,
      billing_details: {
        name: datos.cliente.nombre,
        email: datos.cliente.email
      }
    }
  });

  if (error) {
    alert("❌ Error en el pago: " + error.message);
  } else {
    if (paymentIntent.status === "succeeded") {
      alert("✅ Pago realizado exitosamente.");
    }
  }
}

// === Agrega este HTML dentro de tu archivo index.html donde quieras mostrar Stripe ===
/*
<div id="stripe-checkout" style="margin-top: 40px;">
  <h3>💳 Pagar con tarjeta</h3>
  <p>Se aplicará una comisión de 2.9% + $0.30 al total.</p>
  <div id="card-element" style="margin: 20px 0;"></div>
  <div id="card-errors" style="color: red; margin-bottom: 20px;"></div>
  <button onclick="handleStripePayment('anticipo')">Pagar Anticipo (50%)</button>
  <button onclick="handleStripePayment('total')">Pagar Total</button>
</div>
*/

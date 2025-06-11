
// stripe-integration.js

let stripe, elements;

document.addEventListener("DOMContentLoaded", async () => {
  const anticipo = parseFloat(document.getElementById("inputAnticipo").value) || 0;
  if (anticipo > 0) {
    await initializeStripe();
    document.getElementById("stripeContainer").style.display = "block";
    renderStripeElements(anticipo);
  }
});

async function initializeStripe() {
  stripe = Stripe("pk_test_51NcGwJDCjEk88OSKAtqyZ1RrFJXfDkp0A8b6X2YkpROvU4h2M6CVkMBMRsiusOY2cHNKZwvYAsLi44XAK9UvRcuM00auA0PpbR");
  elements = stripe.elements();
}

function renderStripeElements(anticipo) {
  const commission = (anticipo * 0.029) + 0.3;
  const totalConComision = anticipo + commission;

  document.getElementById("notaStripe").innerText = 
    `Nota: Este pago incluye una comisión de Stripe ($0.30 + 2.9%). Total a pagar: $${totalConComision.toFixed(2)}`;

  const card = elements.create("card");
  card.mount("#card-element");

  const form = document.getElementById("stripeForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { paymentIntent, error } = await stripe.confirmCardPayment(
      await crearSesionStripe(totalConComision),
      {
        payment_method: {
          card: card,
          billing_details: {
            name: document.getElementById("clienteNombre").value
          },
        },
      }
    );

    if (error) {
      alert("❌ Error en el pago: " + error.message);
    } else {
      alert("✅ Pago exitoso. ID: " + paymentIntent.id);
    }
  });
}

async function crearSesionStripe(monto) {
  const res = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(monto * 100),
      description: "Pago de anticipo Jotaye Group LLC"
    })
  });

  const data = await res.json();
  return data.clientSecret;
}

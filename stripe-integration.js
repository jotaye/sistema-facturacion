// === stripe-integration.js ===

let stripe, elements, card;

window.addEventListener("DOMContentLoaded", async () => {
  const stripePublicKey = "pk_test_51ODW8jIvf4ow0klzZGHH8wWApVwbUtb3PZLKtH6eR62XxMIdWx7rJFcqG9nSmPb35FSs4jTuQwl1SVjXKFi13zrV00r1w5OL6T"; // Usa tu clave pública real
  stripe = Stripe(stripePublicKey);
  elements = stripe.elements();

  const style = {
    base: {
      color: "#32325d",
      fontFamily: 'Arial, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4"
      }
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a"
    }
  };

  card = elements.create("card", { style });
  card.mount("#card-element");

  document.getElementById("payment-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const anticipo = parseFloat(document.getElementById("inputAnticipo").value || 0);
    const total = parseFloat(document.getElementById("resTotal").innerText || 0);
    const nombre = document.getElementById("clienteNombre").value;
    const email = document.getElementById("clienteEmail").value;

    if (!anticipo || anticipo === 0) {
      return alert("❗ No hay anticipo definido para procesar el pago.");
    }

    const stripeFee = parseFloat((anticipo * 0.029 + 0.30).toFixed(2));
    const totalConTarifa = parseFloat((anticipo + stripeFee).toFixed(2));

    const response = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        email,
        anticipo,
        stripeFee,
        totalConTarifa
      })
    });

    const session = await response.json();

    const result = await stripe.redirectToCheckout({ sessionId: session.id });
    if (result.error) {
      alert(result.error.message);
    }
  });
});

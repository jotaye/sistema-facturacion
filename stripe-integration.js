document.addEventListener("DOMContentLoaded", async () => {
  const stripePublicKey = "pk_test_51NnhziCw3yxIQO..."; // Usa tu clave pública de Stripe real
  const stripe = Stripe(stripePublicKey);
  const elements = stripe.elements();
  const cardElement = elements.create("card");
  cardElement.mount("#card-element");

  document.getElementById("payment-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById("amount").value);
    const email = document.getElementById("email").value;
    const cotizacionId = document.getElementById("cotizacionId").value;

    try {
      const res = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount, email, cotizacionId })
      });

      const data = await res.json();

      if (!data.id) throw new Error("Stripe session error");

      const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (error) alert(error.message);
    } catch (err) {
      console.error(err);
      alert("Error iniciando el pago.");
    }
  });

  // Mostrar resumen de comisión Stripe antes del pago
  document.getElementById("amount").addEventListener("input", () => {
    const base = parseFloat(document.getElementById("amount").value) || 0;
    const fee = base * 0.029 + 0.30;
    const total = base + fee;
    document.getElementById("resumenTotal").innerText = `Total con comisión de Stripe: $${total.toFixed(2)} (incluye $${fee.toFixed(2)} de comisión)`;
  });
});

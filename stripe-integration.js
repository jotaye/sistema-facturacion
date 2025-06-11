
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const monto = parseFloat(urlParams.get('monto')) || 0;
  const ref = urlParams.get('ref') || "Sin referencia";

  const fee = (monto * 0.029 + 0.30);
  const total = monto + fee;

  document.getElementById("monto").innerText = monto.toFixed(2);
  document.getElementById("comision").innerText = fee.toFixed(2);
  document.getElementById("total").innerText = total.toFixed(2);
  document.getElementById("ref").innerText = ref;

  const stripe = Stripe("pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI");
  const elements = stripe.elements();
  const paymentElement = elements.create("payment");
  paymentElement.mount("#payment-element");

  const form = document.getElementById("payment-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const response = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total, ref })
    });

    const session = await response.json();
    const result = await stripe.redirectToCheckout({ sessionId: session.id });

    if (result.error) {
      document.getElementById("payment-message").innerText = result.error.message;
    }
  });
});


document.addEventListener("DOMContentLoaded", async () => {
  const stripe = Stripe("pk_test_placeholder"); // reemplazar con clave pública real
  const elements = stripe.elements();
  const paymentElement = elements.create("payment");
  paymentElement.mount("#payment-element");

  const form = document.getElementById("payment-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.querySelector("#submit").disabled = true;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (error) {
      document.getElementById("payment-message").textContent = error.message;
    }
  });
});

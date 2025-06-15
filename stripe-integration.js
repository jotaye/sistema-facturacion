// stripe-integration.js
document.addEventListener("DOMContentLoaded", () => {
  const btnAprobar = document.getElementById("btnAprobar");
  btnAprobar.addEventListener("click", async () => {
    const numero      = document.getElementById("numero").value;
    const anticipo    = document.getElementById("inputAnticipo").value;
    const clienteEmail= document.getElementById("clienteEmail").value;

    try {
      const res = await fetch(
        "https://mail-server-byrb.onrender.com/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numero, anticipo, clienteEmail })
        }
      );
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location = url;
    } catch (err) {
      console.error("Error iniciando Stripe Checkout:", err);
      alert("No se pudo iniciar Stripe Checkout: " + err.message);
    }
  });
});

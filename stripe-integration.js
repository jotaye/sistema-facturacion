// stripe-integration.js
document.addEventListener("DOMContentLoaded", () => {
  const BACKEND_URL = "https://mail-server-byrb.onrender.com";
  const stripe = Stripe("pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI");
  const btnAprobar = document.getElementById("btnAprobar");

  btnAprobar.addEventListener("click", async () => {
    const numero       = document.getElementById("numero").value;
    const anticipo     = parseFloat(document.getElementById("inputAnticipo").value)||0;
    const clienteEmail = document.getElementById("clienteEmail").value;

    try {
      const res = await fetch(
        `${BACKEND_URL}/create-checkout-session`,
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
      alert("No se pudo iniciar Stripe Checkout:\n" + err.message);
    }
  });
});

// stripe-integration.js (front-end)
const btnAprobar = document.getElementById("btnAprobar");

btnAprobar.addEventListener("click", async () => {
  // Datos de tu formulario
  const numero = document.getElementById("numero").value;
  const anticipo = document.getElementById("inputAnticipo").value;
  const clienteEmail = document.getElementById("clienteEmail").value;

  try {
    const res = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero, anticipo, clienteEmail })
    });
    const { url } = await res.json();
    window.location = url; // redirige a Stripe Checkout
  } catch (err) {
    alert("Error al iniciar pago: " + err.message);
    console.error(err);
  }
});

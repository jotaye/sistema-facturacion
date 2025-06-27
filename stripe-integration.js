// (solo si separas el handler de "Aprobar")
document.getElementById("btnAprobar").addEventListener("click", async () => {
  const numero      = document.getElementById("numero").value;
  const anticipo    = document.getElementById("inputAnticipo").value;
  const clienteEmail= document.getElementById("clienteEmail").value;
  try {
    const res = await fetch(
      "https://mail-server-byrb.onrender.com/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, anticipo, clienteEmail }),
      }
    );
    const { url, error } = await res.json();
    if (error) throw new Error(error);
    window.location = url;
  } catch (err) {
    console.error("Stripe Checkout:", err);
    alert("Error iniciando pago: "+err.message);
  }
});

// === stripe-integration.js ===

// Espera a que el documento esté listo
document.addEventListener("DOMContentLoaded", async () => {
  const stripePublicKey = "pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI";
  const stripe = Stripe(stripePublicKey);

  const btnAprobar = document.getElementById("btnAprobar");

  if (!btnAprobar) return;

  btnAprobar.addEventListener("click", async () => {
    // Validar campos mínimos
    const email = document.getElementById("clienteEmail").value;
    const nombre = document.getElementById("clienteNombre").value;
    const anticipo = parseFloat(document.getElementById("inputAnticipo").value);
    const total = parseFloat(document.getElementById("resTotal").innerText);

    if (!email || !nombre || isNaN(anticipo) || anticipo <= 0) {
      alert("Debe completar los datos del cliente y el anticipo debe ser mayor a 0.");
      return;
    }

    // Calcular total + comisión Stripe (2.9% + $0.30)
    const stripeFee = (anticipo * 0.029) + 0.30;
    const totalConFee = (anticipo + stripeFee).toFixed(2);

    // Confirmar al cliente
    const confirmacion = confirm(`El total a pagar con comisiones Stripe es: $${totalConFee}\nDesea continuar al pago?`);
    if (!confirmacion) return;

    // Enviar al backend para crear la sesión de pago
    try {
      const res = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(totalConFee),
          description: `Anticipo de cotización para ${nombre}`,
          email,
        })
      });

      const data = await res.json();

      if (data && data.sessionUrl) {
        window.open(data.sessionUrl, "_blank");
      } else {
        alert("No se pudo generar la sesión de pago.");
        console.error(data);
      }
    } catch (err) {
      console.error("Error creando la sesión de pago:", err);
      alert("Error al conectar con Stripe. Intente nuevamente.");
    }
  });
});

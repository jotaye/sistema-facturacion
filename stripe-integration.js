// === stripe-integration.js ===

document.addEventListener("DOMContentLoaded", async () => {
  const stripePublicKey = "pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI";
  const stripe = Stripe(stripePublicKey);

  const btnAprobar = document.getElementById("btnAprobar");

  if (!btnAprobar) return;

  btnAprobar.addEventListener("click", async () => {
    const email = document.getElementById("clienteEmail").value;
    const nombre = document.getElementById("clienteNombre").value;
    const anticipo = parseFloat(document.getElementById("inputAnticipo").value);
    const total = parseFloat(document.getElementById("resTotal").innerText);

    if (!email || !nombre || isNaN(anticipo) || anticipo <= 0) {
      alert("Debe completar los datos del cliente y el anticipo debe ser mayor a 0.");
      return;
    }

    // ❗ Validar que el anticipo sea al menos 40% del total
    const minimoAnticipo = total * 0.4;
    if (anticipo < minimoAnticipo) {
      alert(`El anticipo mínimo requerido es el 40% del total: $${minimoAnticipo.toFixed(2)}.`);
      return;
    }

    const stripeFee = (anticipo * 0.029) + 0.30;
    const totalConFee = (anticipo + stripeFee).toFixed(2);

    const confirmacion = confirm(`El total a pagar incluyendo comisión de Stripe es: $${totalConFee}\n¿Desea continuar al pago con tarjeta?`);
    if (!confirmacion) return;

    try {
      const res = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(totalConFee),
          description: `Anticipo de cotización para ${nombre}`,
          email,
          generateReceipt: true // 🧾 Marca para generar recibo de pago
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

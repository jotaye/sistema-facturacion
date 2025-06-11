// === stripe-integration.js ===

const stripePublicKey = "pk_test_XXXXXXXXXXXXXXXXXXXXXXXX"; // Reemplazar con tu clave pública real de Stripe
document.addEventListener("DOMContentLoaded", () => {
  const stripe = Stripe(stripePublicKey);

  document.getElementById("btnAprobar").addEventListener("click", async () => {
    const datos = obtenerDatosCotizacion();

    // Validaciones previas
    if (!datos.cliente.email || parseFloat(datos.resumen.anticipo) <= 0) {
      alert("Debe completar los datos del cliente y el anticipo debe ser mayor a 0.");
      return;
    }

    const descripcion = `Anticipo por trabajo: ${datos.numero}`;
    const monto = parseFloat(datos.resumen.anticipo);
    const email = datos.cliente.email;

    // Calcular comisión Stripe (2.9% + $0.30)
    const comision = monto * 0.029 + 0.30;
    const totalConComision = (monto + comision).toFixed(2);

    const confirmacion = confirm(`El total a pagar incluyendo comisión de Stripe es: $${totalConComision}\n\u00bfDesea continuar al pago con tarjeta?`);
    if (!confirmacion) return;

    // Crear sesión de pago
    try {
      const response = await fetch("https://mail-server-byrb.onrender.com/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalConComision,
          description,
          email
        })
      });

      const data = await response.json();

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        alert("No se pudo generar la sesión de pago.");
      }
    } catch (error) {
      console.error("Error creando la sesión de pago:", error);
      alert("Error al conectar con Stripe. Intente nuevamente.");
    }
  });
});

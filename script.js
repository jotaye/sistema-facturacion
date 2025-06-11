
// === Inicialización de Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyBXBGILqL1JArsbJkKjUhX79veAnvkNcSg",
  authDomain: "presupuestos-1dd33.firebaseapp.com",
  projectId: "presupuestos-1dd33",
  storageBucket: "presupuestos-1dd33.appspot.com",
  messagingSenderId: "1077139821356",
  appId: "1:1077139821356:web:a831b1d90777b583b0d289",
  measurementId: "G-GG4X805W1R"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// (Tu código original aquí omitido por longitud para este ejemplo)

// === Botón Aprobar Cotización (Nuevo flujo con Stripe + Email) ===
document.getElementById("btnAprobar").addEventListener("click", async () => {
  const numeroCotizacion = document.getElementById("numero").value;
  if (!numeroCotizacion) return alert("No se ha cargado una cotización válida.");

  const confirmacion = confirm("¿Estás seguro de aprobar esta cotización y enviar el anticipo al cliente?");
  if (!confirmacion) return;

  try {
    const response = await fetch("https://mail-server-byrb.onrender.com/aprobar-cotizacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotizacionId: numeroCotizacion })
    });

    if (!response.ok) throw new Error("Error al aprobar cotización");

    const data = await response.json();
    window.open(data.invoice_url, "_blank");
    alert("Cotización aprobada correctamente. El cliente recibirá el link de pago por email.");
  } catch (error) {
    console.error(error);
    alert("Hubo un error al aprobar la cotización.");
  }
});

// === Función para enviar factura final (opcional futura) ===
async function enviarFacturaFinal(customerId, numeroCotizacion, totalDeseado) {
  try {
    const response = await fetch("https://mail-server-byrb.onrender.com/stripe/factura-final", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        total_amount: totalDeseado,
        description: numeroCotizacion
      })
    });

    if (!response.ok) throw new Error("Error al enviar factura final");

    const data = await response.json();
    window.open(data.invoice_url, "_blank");
    alert("Factura final generada correctamente. El cliente recibirá el link de pago.");
  } catch (error) {
    console.error(error);
    alert("Error al generar la factura final.");
  }
}

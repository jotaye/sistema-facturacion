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

// === Agregar fila ===
const tabla = document.querySelector("#tablaItems tbody");
document.getElementById("btnAgregarFila").addEventListener("click", agregarFila);
document.getElementById("btnEliminarFila").addEventListener("click", eliminarFila);

function agregarFila() {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${tabla.rows.length + 1}</td>
    <td><input type="text" class="descripcion" /></td>
    <td><input type="number" class="cantidad" value="1" min="1" /></td>
    <td><input type="number" class="precio" value="0.00" step="0.01" /></td>
    <td class="total">$0.00</td>
    <td><button class="btnEliminar">🗑️</button></td>
  `;
  tabla.appendChild(row);
  row.querySelector(".cantidad").addEventListener("input", recalcularTotales);
  row.querySelector(".precio").addEventListener("input", recalcularTotales);
  row.querySelector(".btnEliminar").addEventListener("click", () => {
    row.remove();
    recalcularTotales();
  });
  recalcularTotales();
}

function eliminarFila() {
  if (tabla.rows.length > 0) {
    tabla.deleteRow(-1);
    recalcularTotales();
  }
}

function recalcularTotales() {
  let subtotal = 0;
  tabla.querySelectorAll("tr").forEach(row => {
    const cantidad = parseFloat(row.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(row.querySelector(".precio").value) || 0;
    const total = cantidad * precio;
    row.querySelector(".total").innerText = `$${total.toFixed(2)}`;
    subtotal += total;
  });

  const descuentoPct = parseFloat(document.getElementById("inputDescuento").value) || 0;
  const montoDescuento = (subtotal * descuentoPct) / 100;
  const impuestoPct = parseFloat(document.getElementById("inputImpuesto").value) || 0;
  const montoImpuesto = ((subtotal - montoDescuento) * impuestoPct) / 100;
  const anticipo = parseFloat(document.getElementById("inputAnticipo").value) || 0;
  const totalNeto = subtotal - montoDescuento + montoImpuesto - anticipo;

  document.getElementById("resSubtotal").innerText = subtotal.toFixed(2);
  document.getElementById("resDescuento").innerText = montoDescuento.toFixed(2);
  document.getElementById("resImpuestos").innerText = montoImpuesto.toFixed(2);
  document.getElementById("resTotal").innerText = totalNeto.toFixed(2);
}

["inputDescuento", "inputImpuesto", "inputAnticipo"].forEach(id =>
  document.getElementById(id).addEventListener("input", recalcularTotales)
);

async function generarNumero(tipo) {
  const hoy = new Date();
  const fecha = hoy.toISOString().split("T")[0].replace(/-/g, "");
  const prefix = tipo === "factura" ? "FAC" : "COT";
  const snapshot = await db.collection(tipo === "factura" ? "facturas" : "cotizaciones").get();
  const nuevo = snapshot.size + 1;
  return `${prefix}-${fecha}-${String(nuevo).padStart(4, '0')}`;
}

function obtenerDatosCotizacion() {
  const subtotal = parseFloat(document.getElementById("resSubtotal").innerText) || 0;
  const descuentoPct = parseFloat(document.getElementById("inputDescuento").value) || 0;
  const montoDescuento = parseFloat(document.getElementById("resDescuento").innerText) || 0;
  const impuestoPct = parseFloat(document.getElementById("inputImpuesto").value) || 0;
  const montoImpuesto = parseFloat(document.getElementById("resImpuestos").innerText) || 0;
  const anticipo = parseFloat(document.getElementById("inputAnticipo").value) || 0;
  const total = parseFloat(document.getElementById("resTotal").innerText) || 0;

  const cotizacion = {
    fecha: document.getElementById("fecha").value,
    cliente: {
      nombre: document.getElementById("clienteNombre").value,
      tipo: document.getElementById("clienteTipo").value,
      direccion: document.getElementById("clienteDireccion").value,
      email: document.getElementById("clienteEmail").value,
      telefono: document.getElementById("clienteTelefono").value
    },
    items: [],
    resumen: {
      subtotal: subtotal.toFixed(2),
      porcentajeDescuento: descuentoPct.toFixed(2),
      descuento: montoDescuento.toFixed(2),
      porcentajeImpuesto: impuestoPct.toFixed(2),
      impuestos: montoImpuesto.toFixed(2),
      totalSinImpuesto: (subtotal - montoDescuento).toFixed(2),
      anticipo: anticipo.toFixed(2),
      total: total.toFixed(2)
    }
  };

  tabla.querySelectorAll("tr").forEach(row => {
    const cantidad = parseFloat(row.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(row.querySelector(".precio").value) || 0;
    const totalItem = cantidad * precio;

    cotizacion.items.push({
      descripcion: row.querySelector(".descripcion").value,
      cantidad: cantidad.toString(),
      precio: precio.toFixed(2),
      total: totalItem.toFixed(2)
    });
  });

  return cotizacion;
}

// === Guardar Cotización ===
document.getElementById("btnGuardar").addEventListener("click", async () => {
  const datos = obtenerDatosCotizacion();
  const numero = await generarNumero("cotizacion");
  datos.numero = numero;
  document.getElementById("numero").value = numero;

  db.collection("cotizaciones").doc(numero).set(datos)
    .then(() => alert("✅ Cotización guardada con número " + numero))
    .catch(err => alert("❌ Error: " + err));
});

// === Buscar ===
document.getElementById("btnBuscar").addEventListener("click", async () => {
  const num = document.getElementById("numero").value;
  if (!num) return alert("❗ Ingresa el número de cotización o factura.");

  const ref = num.startsWith("FAC") ? "facturas" : "cotizaciones";
  const docRef = db.collection(ref).doc(num);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return alert("❌ No encontrada.");
  cargarDatos(docSnap.data(), num);
});

function cargarDatos(data, numero) {
  document.getElementById("numero").value = numero;
  document.getElementById("fecha").value = data.fecha;
  document.getElementById("clienteNombre").value = data.cliente.nombre;
  document.getElementById("clienteTipo").value = data.cliente.tipo;
  document.getElementById("clienteDireccion").value = data.cliente.direccion;
  document.getElementById("clienteEmail").value = data.cliente.email;
  document.getElementById("clienteTelefono").value = data.cliente.telefono;

  tabla.innerHTML = "";
  data.items.forEach(item => {
    agregarFila();
    const fila = tabla.lastChild;
    fila.querySelector(".descripcion").value = item.descripcion;
    fila.querySelector(".cantidad").value = item.cantidad;
    fila.querySelector(".precio").value = item.precio;
  });

  document.getElementById("inputDescuento").value = data.resumen.porcentajeDescuento;
  document.getElementById("inputImpuesto").value = data.resumen.porcentajeImpuesto;
  document.getElementById("inputAnticipo").value = data.resumen.anticipo;
  recalcularTotales();
}

// === Enviar ===
async function enviarEmailCotizacion(data, tipo) {
  const to = data.cliente.email;
  if (!to) return alert("❗ Email no válido");

  const asunto = tipo === "factura" ? "Factura" : "Cotización";
  const mensaje = tipo === "factura"
    ? "Gracias por su aprobación. Adjuntamos su factura."
    : "Adjuntamos la cotización solicitada.";

  fetch("https://mail-server-byrb.onrender.com/send-quotation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numero: data.numero,
      to: to,
      subject: asunto,
      texto: mensaje,
      pdfBase64: null
    })
  })
    .then(res => res.ok ? alert("📨 Correo enviado.") : alert("❌ Error al enviar."))
    .catch(err => alert("❌ Error backend: " + err));
}

// === Botones ===
document.getElementById("btnImprimir").addEventListener("click", () => window.print());
document.getElementById("btnReiniciar").addEventListener("click", () => location.reload());
document.getElementById("btnEnviar").addEventListener("click", async () => {
  const datos = obtenerDatosCotizacion();
  datos.numero = document.getElementById("numero").value;
  await enviarEmailCotizacion(datos, "cotizacion");
});
document.getElementById("btnAprobar").addEventListener("click", async () => {
  const datos = obtenerDatosCotizacion();
  const numero = await generarNumero("factura");
  datos.numero = numero;
  document.getElementById("numero").value = numero;

  db.collection("facturas").doc(numero).set(datos).then(() => {
    enviarEmailCotizacion(datos, "factura");
    alert("✅ Factura generada y enviada.");
  });
});
document.getElementById("btnFacturar").addEventListener("click", async () => {
  const datos = obtenerDatosCotizacion();
  const numero = await generarNumero("factura");
  datos.numero = numero;
  document.getElementById("numero").value = numero;

  db.collection("facturas").doc(numero).set(datos).then(() => {
    alert("✅ Factura generada. Puedes imprimirla ahora.");
    window.print();
  });
});

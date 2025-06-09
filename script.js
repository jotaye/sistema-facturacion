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

// === Utilidad para generar número único ===
function generarNumero(tipo) {
  const fecha = new Date().toISOString().slice(0,10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${tipo.toUpperCase()}-${fecha}-${random}`;
}

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

// === Cálculo de totales ===
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

// === Recalcular totales al cambiar valores ===
["inputDescuento", "inputImpuesto", "inputAnticipo"].forEach(id =>
  document.getElementById(id).addEventListener("input", recalcularTotales)
);

// === Obtener datos del formulario ===
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
    numero: document.getElementById("numero").value || generarNumero("COT"),
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

// === Guardar cotización ===
document.getElementById("btnGuardar").addEventListener("click", () => {
  const data = obtenerDatosCotizacion();
  document.getElementById("numero").value = data.numero;

  db.collection("cotizaciones").doc(data.numero).set(data)
    .then(() => alert("✅ Cotización guardada"))
    .catch(err => alert("❌ Error: " + err));
});

// === Buscar Cotización / Factura ===
document.getElementById("btnBuscar").addEventListener("click", () => {
  const codigo = document.getElementById("buscar").value.trim();
  if (!codigo) return alert("❗ Ingresa un número válido");

  const colecciones = ["cotizaciones", "facturas"];

  Promise.any(colecciones.map(col =>
    db.collection(col).doc(codigo).get().then(doc => doc.exists ? doc.data() : Promise.reject())
  ))
    .then(data => cargarCotizacion(data))
    .catch(() => alert("❌ No encontrada"));
});

function cargarCotizacion(data) {
  document.getElementById("fecha").value = data.fecha;
  document.getElementById("numero").value = data.numero;
  document.getElementById("clienteNombre").value = data.cliente.nombre;
  document.getElementById("clienteTipo").value = data.cliente.tipo;
  document.getElementById("clienteDireccion").value = data.cliente.direccion;
  document.getElementById("clienteEmail").value = data.cliente.email;
  document.getElementById("clienteTelefono").value = data.cliente.telefono;
  document.getElementById("inputDescuento").value = data.resumen.porcentajeDescuento;
  document.getElementById("inputImpuesto").value = data.resumen.porcentajeImpuesto;
  document.getElementById("inputAnticipo").value = data.resumen.anticipo;

  tabla.innerHTML = "";
  data.items.forEach((item, i) => {
    agregarFila();
    const row = tabla.rows[i];
    row.querySelector(".descripcion").value = item.descripcion;
    row.querySelector(".cantidad").value = item.cantidad;
    row.querySelector(".precio").value = item.precio;
  });
  recalcularTotales();
}

// === Imprimir ===
document.getElementById("btnImprimir").addEventListener("click", () => window.print());

// === Reiniciar Cotización ===
document.getElementById("btnReiniciar").addEventListener("click", () => location.reload());

// === Enviar por Email ===
document.getElementById("btnEnviar").addEventListener("click", () => {
  enviarEmailCotizacion(obtenerDatosCotizacion(), "cotizacion");
});

// === Aprobar Cotización → Factura ===
document.getElementById("btnAprobar").addEventListener("click", () => {
  const datosFactura = obtenerDatosCotizacion();
  datosFactura.tipo = "factura";
  datosFactura.numero = generarNumero("FAC");
  document.getElementById("numero").value = datosFactura.numero;

  db.collection("facturas").doc(datosFactura.numero).set(datosFactura)
    .then(() => {
      enviarEmailCotizacion(datosFactura, "factura");
      alert("✅ Factura generada y enviada.");
    });
});

// === Envío Email ===
function enviarEmailCotizacion(data, tipo) {
  const to = data.cliente.email;
  if (!to) return alert("❗ Email del cliente no válido");

  const asunto = tipo === "factura" ? "Factura" : "Cotización";
  const mensaje = tipo === "factura" ?
    "Adjunto encontrará la factura aprobada con el total correspondiente." :
    "Adjunto encontrará la cotización solicitada con el total estimado.";

  fetch("https://mail-server-byrb.onrender.com/send-quotation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numero: data.numero,
      to: to,
      subject: asunto,
      texto: mensaje,
      pdfBase64: null // puedes conectar PDF luego
    })
  })
    .then(res => res.ok ? alert(`📨 ${asunto} enviada.`) : alert("❌ Falló envío por correo."))
    .catch(err => alert("❌ Error de conexión: " + err));
}

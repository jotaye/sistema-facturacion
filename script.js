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

document.addEventListener("DOMContentLoaded", generarNumeroAutomatico);

async function generarNumeroAutomatico() {
  const hoy = new Date();
  const fecha = hoy.toISOString().split("T")[0].replace(/-/g, "");
  const snapshot = await db.collection("cotizaciones").where("numero", ">=", `COT-${fecha}-0000`).where("numero", "<=", `COT-${fecha}-9999`).get();
  const cantidad = snapshot.size + 1;
  const numero = `COT-${fecha}-${String(cantidad).padStart(4, "0")}`;
  document.getElementById("numero").value = numero;
}

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

document.getElementById("btnGuardar").addEventListener("click", guardarCotizacion);

document.getElementById("btnBuscar").addEventListener("click", async () => {
  const buscar = document.getElementById("buscar").value.trim();
  if (!buscar) return alert("🔎 Ingresa un número para buscar");
  const doc = await db.collection("cotizaciones").doc(buscar).get();
  if (!doc.exists) return alert("❌ No encontrado");
  cargarCotizacionEnFormulario(doc.data());
});

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
    numero: document.getElementById("numero").value,
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

function guardarCotizacion() {
  const cot = obtenerDatosCotizacion();
  db.collection("cotizaciones").doc(cot.numero).set(cot)
    .then(() => alert("✅ Cotización guardada con ID personalizado"))
    .catch(err => alert("❌ Error al guardar: " + err));
}

function cargarCotizacionEnFormulario(data) {
  document.getElementById("fecha").value = data.fecha;
  document.getElementById("numero").value = data.numero;
  document.getElementById("clienteNombre").value = data.cliente.nombre;
  document.getElementById("clienteTipo").value = data.cliente.tipo;
  document.getElementById("clienteDireccion").value = data.cliente.direccion;
  document.getElementById("clienteEmail").value = data.cliente.email;
  document.getElementById("clienteTelefono").value = data.cliente.telefono;

  tabla.innerHTML = "";
  data.items.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><input type="text" class="descripcion" value="${item.descripcion}"/></td>
      <td><input type="number" class="cantidad" value="${item.cantidad}" min="1"/></td>
      <td><input type="number" class="precio" value="${item.precio}" step="0.01"/></td>
      <td class="total">$${item.total}</td>
      <td><button class="btnEliminar">🗑️</button></td>
    `;
    tabla.appendChild(row);
    row.querySelector(".cantidad").addEventListener("input", recalcularTotales);
    row.querySelector(".precio").addEventListener("input", recalcularTotales);
    row.querySelector(".btnEliminar").addEventListener("click", () => row.remove());
  });

  document.getElementById("inputDescuento").value = data.resumen.porcentajeDescuento;
  document.getElementById("inputImpuesto").value = data.resumen.porcentajeImpuesto;
  document.getElementById("inputAnticipo").value = data.resumen.anticipo;
  recalcularTotales();
}

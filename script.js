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

// === Variables Globales ===
let numeroCotizacion = document.getElementById("numero");
let tablaItems = document.querySelector("#tablaItems tbody");

// === Función para agregar fila ===
document.getElementById("btnAgregarFila").addEventListener("click", () => {
  const rowCount = tablaItems.rows.length + 1;
  const row = tablaItems.insertRow();
  row.innerHTML = `
    <td>${rowCount}</td>
    <td><input type="text" placeholder="Descripción" /></td>
    <td><input type="number" value="0" /></td>
    <td><input type="number" value="0.00" /></td>
    <td class="importe">0.00</td>
    <td><button class="eliminar">❌</button></td>
  `;
});

// === Función para eliminar fila ===
document.getElementById("btnEliminarFila").addEventListener("click", () => {
  if (tablaItems.rows.length > 1) tablaItems.deleteRow(-1);
});

// === Calcular Totales ===
function calcularTotales() {
  let subtotal = 0;
  const filas = tablaItems.querySelectorAll("tr");
  filas.forEach(row => {
    const cantidad = parseFloat(row.cells[2].querySelector("input").value) || 0;
    const precio = parseFloat(row.cells[3].querySelector("input").value) || 0;
    const importe = cantidad * precio;
    row.cells[4].innerText = importe.toFixed(2);
    subtotal += importe;
  });

  const descuentoPorcentaje = parseFloat(document.getElementById("inputDescuento").value) || 0;
  const descuento = subtotal * (descuentoPorcentaje / 100);
  const subtotalConDescuento = subtotal - descuento;
  const impuestoPorcentaje = parseFloat(document.getElementById("inputImpuesto").value) || 0;
  const impuestos = subtotalConDescuento * (impuestoPorcentaje / 100);
  const anticipo = parseFloat(document.getElementById("inputAnticipo").value) || 0;
  const total = subtotalConDescuento + impuestos - anticipo;

  document.getElementById("resSubtotal").innerText = subtotal.toFixed(2);
  document.getElementById("resImpuestos").innerText = impuestos.toFixed(2);
  document.getElementById("resTotal").innerText = total.toFixed(2);
}

setInterval(calcularTotales, 500);

// === Guardar Cotización ===
document.getElementById("btnGuardar").addEventListener("click", async () => {
  const cotizacion = {
    numero: numeroCotizacion.value,
    fecha: document.getElementById("fecha").value,
    cliente: {
      nombre: document.getElementById("clienteNombre").value,
      direccion: document.getElementById("clienteDireccion").value,
      telefono: document.getElementById("clienteTelefono").value,
      email: document.getElementById("clienteEmail").value,
      notas: document.getElementById("clienteNotas").value,
    },
    items: [],
    subtotal: parseFloat(document.getElementById("resSubtotal").innerText),
    impuestos: parseFloat(document.getElementById("resImpuestos").innerText),
    total: parseFloat(document.getElementById("resTotal").innerText),
    estado: "pendiente"
  };

  tablaItems.querySelectorAll("tr").forEach(row => {
    const descripcion = row.cells[1].querySelector("input").value;
    const cantidad = parseFloat(row.cells[2].querySelector("input").value) || 0;
    const precio = parseFloat(row.cells[3].querySelector("input").value) || 0;
    cotizacion.items.push({ descripcion, cantidad, precio });
  });

  await db.collection("cotizaciones").doc(`COT-${cotizacion.numero}`).set(cotizacion);
  alert("✅ Cotización guardada con éxito");
});

// === Imprimir ===
document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});

// === Reiniciar ===
document.getElementById("btnReiniciar").addEventListener("click", () => {
  window.location.reload();
});

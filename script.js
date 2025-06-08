
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

let tablaItems = document.querySelector("#tablaItems tbody");
const subtotalSpan = document.getElementById("resSubtotal");
const descuentoInput = document.getElementById("inputDescuento");
const descuentoSpan = document.getElementById("resDescuento");
const impuestoInput = document.getElementById("inputImpuesto");
const impuestosSpan = document.getElementById("resImpuestos");
const anticipoInput = document.getElementById("inputAnticipo");
const totalSpan = document.getElementById("resTotal");

function agregarFila() {
  const rowCount = tablaItems.rows.length + 1;
  const row = tablaItems.insertRow();
  row.innerHTML = `
    <td>${rowCount}</td>
    <td><input type="text" placeholder="Descripción" /></td>
    <td><input type="number" value="0" min="0" /></td>
    <td><input type="number" value="0.00" min="0" step="0.01" /></td>
    <td class="importe">0.00</td>
    <td><button class="eliminar">❌</button></td>
  `;
  row.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", calcularTotales);
  });
  row.querySelector(".eliminar").addEventListener("click", () => {
    row.remove();
    calcularTotales();
  });
}

function calcularTotales() {
  let subtotal = 0;
  const filas = tablaItems.querySelectorAll("tr");
  filas.forEach(row => {
    const cantidad = parseFloat(row.cells[2].querySelector("input").value) || 0;
    const precio = parseFloat(row.cells[3].querySelector("input").value) || 0;
    const total = cantidad * precio;
    subtotal += total;
    row.cells[4].textContent = total.toFixed(2);
  });

  const descuentoPorc = parseFloat(descuentoInput.value) || 0;
  const descuentoMonto = subtotal * (descuentoPorc / 100);
  const impuestoPorc = parseFloat(impuestoInput.value) || 0;
  const impuestoMonto = (subtotal - descuentoMonto) * (impuestoPorc / 100);
  const anticipo = parseFloat(anticipoInput.value) || 0;

  const total = subtotal - descuentoMonto + impuestoMonto - anticipo;

  subtotalSpan.textContent = subtotal.toFixed(2);
  descuentoSpan.textContent = descuentoMonto.toFixed(2);
  impuestosSpan.textContent = impuestoMonto.toFixed(2);
  totalSpan.textContent = total.toFixed(2);
}

document.getElementById("btnAgregarFila").addEventListener("click", agregarFila);
document.getElementById("btnEliminarFila").addEventListener("click", () => {
  if (tablaItems.rows.length > 0) {
    tablaItems.deleteRow(-1);
    calcularTotales();
  }
});

// Recalcular cuando cambien los campos externos
[descuentoInput, impuestoInput, anticipoInput].forEach(el => {
  el.addEventListener("input", calcularTotales);
});

// === Inicializar con una fila al cargar ===
window.addEventListener("DOMContentLoaded", () => {
  agregarFila();
  calcularTotales();
});

// script.js

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

// === Variables y Elementos ===
const tabla = document.getElementById("tablaItems").getElementsByTagName("tbody")[0];
const btnAgregarFila = document.getElementById("btnAgregarFila");
const btnEliminarFila = document.getElementById("btnEliminarFila");

const subtotalEl = document.getElementById("resSubtotal");
const descuentoPorcEl = document.getElementById("inputDescuento");
const descuentoMontoEl = document.getElementById("resDescuento");
const impuestoPorcEl = document.getElementById("inputImpuesto");
const impuestoMontoEl = document.getElementById("resImpuestos");
const anticipoEl = document.getElementById("inputAnticipo");
const totalEl = document.getElementById("resTotal");

// === Función para agregar fila ===
function agregarFila() {
  const row = tabla.insertRow();
  row.innerHTML = `
    <td>${tabla.rows.length}</td>
    <td><input type="text" class="descripcion" /></td>
    <td><input type="number" class="cantidad" value="1" min="1" /></td>
    <td><input type="number" class="precio" value="0.00" min="0" step="0.01" /></td>
    <td class="total">0.00</td>
    <td><button onclick="eliminarFila(this)">Eliminar</button></td>
  `;
  recalcular();
  row.querySelectorAll("input").forEach(input => input.addEventListener("input", recalcular));
}

// === Función para eliminar fila ===
function eliminarFila(btn) {
  const row = btn.closest("tr");
  row.remove();
  recalcular();
}

// === Función para recalcular totales ===
function recalcular() {
  let subtotal = 0;
  tabla.querySelectorAll("tr").forEach(row => {
    const cantidad = parseFloat(row.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(row.querySelector(".precio").value) || 0;
    const total = cantidad * precio;
    row.querySelector(".total").innerText = total.toFixed(2);
    subtotal += total;
  });
  subtotalEl.innerText = subtotal.toFixed(2);

  const descuentoPct = parseFloat(descuentoPorcEl.value) || 0;
  const descuento = subtotal * (descuentoPct / 100);
  descuentoMontoEl.innerText = descuento.toFixed(2);

  const impuestoPct = parseFloat(impuestoPorcEl.value) || 0;
  const impuesto = (subtotal - descuento) * (impuestoPct / 100);
  impuestoMontoEl.innerText = impuesto.toFixed(2);

  const anticipo = parseFloat(anticipoEl.value) || 0;
  const totalNeto = subtotal - descuento + impuesto - anticipo;
  totalEl.innerText = totalNeto.toFixed(2);
}

// === Función imprimir ===
document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});

// === Función reiniciar formulario ===
document.getElementById("btnReiniciar").addEventListener("click", () => {
  document.querySelectorAll("input, textarea").forEach(el => el.value = "");
  tabla.innerHTML = "";
  agregarFila();
  recalcular();
});

// === Eventos iniciales ===
btnAgregarFila.addEventListener("click", agregarFila);
btnEliminarFila.addEventListener("click", () => {
  if (tabla.rows.length > 0) tabla.deleteRow(tabla.rows.length - 1);
  recalcular();
});

descuentoPorcEl.addEventListener("input", recalcular);
impuestoPorcEl.addEventListener("input", recalcular);
anticipoEl.addEventListener("input", recalcular);

document.addEventListener("DOMContentLoaded", () => {
  agregarFila();
});

// script.js

// Firebase config
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXBGILqL1JArsbJkKjUhX79veAnvkNcSg",
  authDomain: "presupuestos-1dd33.firebaseapp.com",
  projectId: "presupuestos-1dd33",
  storageBucket: "presupuestos-1dd33.firebasestorage.app",
  messagingSenderId: "1077139821356",
  appId: "1:1077139821356:web:a831b1d90777b583b0d289",
  measurementId: "G-GG4X805W1R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Calcular totales
function calcularTotales() {
  const filas = document.querySelectorAll("#tablaItems tbody tr");
  let subtotal = 0;
  filas.forEach((fila) => {
    const cantidad = parseFloat(fila.cells[2].querySelector("input").value) || 0;
    const precio = parseFloat(fila.cells[3].querySelector("input").value) || 0;
    const importe = cantidad * precio;
    fila.cells[4].innerText = importe.toFixed(2);
    subtotal += importe;
  });

  const descuentoPct = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const descuentoVal = (subtotal * descuentoPct) / 100;
  const baseImponible = subtotal - descuentoVal;
  const impuestoPct = parseFloat(document.getElementById("impuestoPorcentaje").value) || 0;
  const impuestos = (baseImponible * impuestoPct) / 100;
  const anticipo = parseFloat(document.getElementById("anticipo").value) || 0;
  const total = baseImponible + impuestos - anticipo;

  document.getElementById("resSubtotal").value = subtotal.toFixed(2);
  document.getElementById("descuentoValor").value = descuentoVal.toFixed(2);
  document.getElementById("resImpuestos").value = impuestos.toFixed(2);
  document.getElementById("resTotal").value = total.toFixed(2);
}

// Escuchar cambios
["descuentoPorcentaje", "impuestoPorcentaje", "anticipo"].forEach(id => {
  document.getElementById(id).addEventListener("input", calcularTotales);
});

// Guardar cotización en Firestore
async function guardarCotizacion() {
  calcularTotales();

  const fecha = document.getElementById("fecha").value;
  const numero = document.getElementById("numero").value;
  const cliente = {
    nombre: document.getElementById("clienteNombre").value,
    direccion: document.getElementById("clienteDireccion").value,
    telefono: document.getElementById("clienteTelefono").value,
    email: document.getElementById("clienteEmail").value,
    notas: document.getElementById("clienteNotas").value
  };
  const items = [];
  const filas = document.querySelectorAll("#tablaItems tbody tr");

  filas.forEach((fila) => {
    const descripcion = fila.cells[1].querySelector("input").value;
    const cantidad = parseFloat(fila.cells[2].querySelector("input").value);
    const precio = parseFloat(fila.cells[3].querySelector("input").value);
    const importe = cantidad * precio;
    items.push({ descripcion, cantidad, precio, importe });
  });

  const subtotal = parseFloat(document.getElementById("resSubtotal").value);
  const descuento = parseFloat(document.getElementById("descuentoValor").value);
  const impuestos = parseFloat(document.getElementById("resImpuestos").value);
  const total = parseFloat(document.getElementById("resTotal").value);

  try {
    const docRef = await addDoc(collection(db, "cotizaciones"), {
      numero,
      fecha,
      cliente,
      items,
      subtotal,
      descuento,
      impuestos,
      total,
      estado: "pendiente"
    });
    alert("Cotización guardada con ID: " + docRef.id);
  } catch (e) {
    alert("Error al guardar: " + e);
  }
}

// Acciones de botones

document.getElementById("btnGuardar").addEventListener("click", guardarCotizacion);
document.getElementById("btnReiniciar").addEventListener("click", () => location.reload());
document.getElementById("btnImprimir").addEventListener("click", () => window.print());

document.querySelectorAll("#tablaItems input").forEach(input => {
  input.addEventListener("input", calcularTotales);
});

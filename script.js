// script.js

// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_DOMINIO.firebaseapp.com",
  projectId: "ID_PROYECTO",
  storageBucket: "bucket.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para obtener los datos del formulario y guardar cotización
async function guardarCotizacion() {
  const fecha = document.getElementById("fecha").value;
  const numero = document.getElementById("numero").value;
  const items = [];
  const filas = document.querySelectorAll("#tablaItems tbody tr");

  filas.forEach((fila) => {
    const descripcion = fila.cells[1].querySelector("input").value;
    const cantidad = parseFloat(fila.cells[2].querySelector("input").value);
    const precio = parseFloat(fila.cells[3].querySelector("input").value);
    const importe = cantidad * precio;
    items.push({ descripcion, cantidad, precio, importe });
  });

  const subtotal = parseFloat(document.getElementById("resSubtotal").value) || 0;
  const impuestos = parseFloat(document.getElementById("resImpuestos").value) || 0;
  const total = parseFloat(document.getElementById("resTotal").value) || 0;

  try {
    const docRef = await addDoc(collection(db, "cotizaciones"), {
      numero,
      fecha,
      items,
      subtotal,
      impuestos,
      total,
      estado: "pendiente"
    });
    alert("Cotización guardada con ID: " + docRef.id);
  } catch (e) {
    alert("Error al guardar: " + e);
  }
}

// Lógica para botones

document.getElementById("btnGuardar").addEventListener("click", guardarCotizacion);
document.getElementById("btnReiniciar").addEventListener("click", () => {
  location.reload();
});
document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});

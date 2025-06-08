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
  row.querySelector(".btnEliminar").addEventListener("click", () => row.remove());
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

// === Eventos para recalcular al cambiar inputs ===
document.getElementById("inputDescuento").addEventListener("input", recalcularTotales);
document.getElementById("inputImpuesto").addEventListener("input", recalcularTotales);
document.getElementById("inputAnticipo").addEventListener("input", recalcularTotales);

// === Guardar cotización en Firebase ===
document.getElementById("btnGuardar").addEventListener("click", () => {
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
      subtotal: document.getElementById("resSubtotal").innerText,
      descuento: document.getElementById("resDescuento").innerText,
      impuestos: document.getElementById("resImpuestos").innerText,
      anticipo: document.getElementById("inputAnticipo").value,
      total: document.getElementById("resTotal").innerText
    }
  };

  tabla.querySelectorAll("tr").forEach(row => {
    cotizacion.items.push({
      descripcion: row.querySelector(".descripcion").value,
      cantidad: row.querySelector(".cantidad").value,
      precio: row.querySelector(".precio").value
    });
  });

  db.collection("cotizaciones").add(cotizacion)
    .then(() => alert("✅ Cotización guardada correctamente"))
    .catch(err => alert("❌ Error al guardar: " + err));
});

// === Imprimir ===
document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});

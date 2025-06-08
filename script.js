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

// === Funciones Generales ===
function calcularTotales() {
  const filas = document.querySelectorAll("#tablaItems tbody tr");
  let subtotal = 0;
  filas.forEach(fila => {
    const cantidad = parseFloat(fila.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(fila.querySelector(".precio").value) || 0;
    const total = cantidad * precio;
    fila.querySelector(".total").textContent = total.toFixed(2);
    subtotal += total;
  });

  const descuentoPorc = parseFloat(document.getElementById("inputDescuento").value) || 0;
  const montoDescuento = subtotal * (descuentoPorc / 100);
  const subtotalDescontado = subtotal - montoDescuento;

  const impuestoPorc = parseFloat(document.getElementById("inputImpuesto").value) || 0;
  const montoImpuesto = subtotalDescontado * (impuestoPorc / 100);

  const anticipo = parseFloat(document.getElementById("inputAnticipo").value) || 0;
  const totalNeto = subtotalDescontado + montoImpuesto - anticipo;

  document.getElementById("resSubtotal").textContent = subtotal.toFixed(2);
  document.getElementById("resDescuento").textContent = montoDescuento.toFixed(2);
  document.getElementById("resImpuestos").textContent = montoImpuesto.toFixed(2);
  document.getElementById("resTotal").textContent = totalNeto.toFixed(2);
}

// === Agregar y Eliminar Filas ===
function agregarFila() {
  const tbody = document.querySelector("#tablaItems tbody");
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${tbody.children.length + 1}</td>
    <td><input type="text" class="descripcion" /></td>
    <td><input type="number" class="cantidad" value="0" /></td>
    <td><input type="number" class="precio" value="0.00" /></td>
    <td class="total">0.00</td>
    <td><button class="eliminar">Eliminar</button></td>
  `;
  tbody.appendChild(fila);
  fila.querySelector(".cantidad").addEventListener("input", calcularTotales);
  fila.querySelector(".precio").addEventListener("input", calcularTotales);
  fila.querySelector(".eliminar").addEventListener("click", () => fila.remove());
  calcularTotales();
}

document.getElementById("btnAgregarFila").addEventListener("click", agregarFila);
document.getElementById("btnEliminarFila").addEventListener("click", () => {
  const tbody = document.querySelector("#tablaItems tbody");
  if (tbody.children.length > 0) tbody.removeChild(tbody.lastChild);
  calcularTotales();
});

document.getElementById("inputDescuento").addEventListener("input", calcularTotales);
document.getElementById("inputImpuesto").addEventListener("input", calcularTotales);
document.getElementById("inputAnticipo").addEventListener("input", calcularTotales);

// === Guardar Cotización ===
document.getElementById("btnGuardar").addEventListener("click", async () => {
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
      subtotal: document.getElementById("resSubtotal").textContent,
      descuento: document.getElementById("resDescuento").textContent,
      impuestos: document.getElementById("resImpuestos").textContent,
      anticipo: document.getElementById("inputAnticipo").value,
      total: document.getElementById("resTotal").textContent
    }
  };

  document.querySelectorAll("#tablaItems tbody tr").forEach(fila => {
    cotizacion.items.push({
      descripcion: fila.querySelector(".descripcion").value,
      cantidad: fila.querySelector(".cantidad").value,
      precio: fila.querySelector(".precio").value,
      total: fila.querySelector(".total").textContent
    });
  });

  await db.collection("cotizaciones").add(cotizacion);
  alert("✅ Cotización guardada exitosamente");
});

// === Imprimir ===
document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});

// === Reiniciar ===
document.getElementById("btnReiniciar").addEventListener("click", () => {
  location.reload();
});

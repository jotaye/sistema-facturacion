// === Firebase Inicialización ===
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

// === Función para agregar una fila ===
const tablaItems = document.querySelector("#tablaItems tbody");
let contadorFilas = 0;

function agregarFila() {
  contadorFilas++;
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${contadorFilas}</td>
    <td><input type="text" class="descripcion" /></td>
    <td><input type="number" class="cantidad" value="0" /></td>
    <td><input type="number" class="precio" value="0.00" /></td>
    <td class="total">0.00</td>
    <td><button class="eliminar">🗑️</button></td>
  `;
  tablaItems.appendChild(fila);
  actualizarEventos();
}

// === Función para eliminar la última fila ===
function eliminarFila() {
  if (tablaItems.lastElementChild) {
    tablaItems.removeChild(tablaItems.lastElementChild);
    contadorFilas--;
    calcularTotales();
  }
}

// === Recalcular Totales ===
function calcularTotales() {
  let subtotal = 0;
  document.querySelectorAll("#tablaItems tbody tr").forEach((fila) => {
    const cantidad = parseFloat(fila.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(fila.querySelector(".precio").value) || 0;
    const total = cantidad * precio;
    fila.querySelector(".total").textContent = total.toFixed(2);
    subtotal += total;
  });

  const descuentoPorc = parseFloat(document.querySelector("#inputDescuento").value) || 0;
  const montoDescuento = subtotal * (descuentoPorc / 100);
  const subtotalDescontado = subtotal - montoDescuento;

  const impuestoPorc = parseFloat(document.querySelector("#inputImpuesto").value) || 0;
  const montoImpuesto = subtotalDescontado * (impuestoPorc / 100);

  const anticipo = parseFloat(document.querySelector("#inputAnticipo").value) || 0;
  const totalNeto = subtotalDescontado + montoImpuesto - anticipo;

  document.querySelector("#resSubtotal").textContent = subtotal.toFixed(2);
  document.querySelector("#resDescuento").textContent = montoDescuento.toFixed(2);
  document.querySelector("#resImpuestos").textContent = montoImpuesto.toFixed(2);
  document.querySelector("#resTotal").textContent = totalNeto.toFixed(2);
}

// === Eventos ===
function actualizarEventos() {
  document.querySelectorAll(".cantidad, .precio").forEach(input => {
    input.removeEventListener("input", calcularTotales);
    input.addEventListener("input", calcularTotales);
  });
  document.querySelectorAll(".eliminar").forEach(btn => {
    btn.onclick = function () {
      btn.closest("tr").remove();
      calcularTotales();
    }
  });
}

document.querySelector("#btnAgregarFila").addEventListener("click", agregarFila);
document.querySelector("#btnEliminarFila").addEventListener("click", eliminarFila);
document.querySelector("#inputDescuento").addEventListener("input", calcularTotales);
document.querySelector("#inputImpuesto").addEventListener("input", calcularTotales);
document.querySelector("#inputAnticipo").addEventListener("input", calcularTotales);

// === Inicializar con una fila por defecto ===
agregarFila();

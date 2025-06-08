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
  docu

// script.js
// Este archivo contiene la lógica del frontend (Firebase + Stripe) para cotizaciones y pagos
import { db } from "./firebase-config.js";

// URL base de tu backend en Render
const BACKEND_URL = "https://mail-server-byrb.onrender.com";

// Inicializa Stripe.js con tu clave pública
const stripe = Stripe("pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI");

// Obtén referencias al DOM
const tablaBody   = document.querySelector("#tablaItems tbody");
const btnAgregar  = document.getElementById("btnAgregarFila");
const btnEliminar = document.getElementById("btnEliminarFila");
const btnGuardar  = document.getElementById("btnGuardar");
const btnBuscar   = document.getElementById("btnBuscar");
const btnEnviar   = document.getElementById("btnEnviar");
const btnAprobar  = document.getElementById("btnAprobar");
const inpDesc     = document.getElementById("inputDescuento");
const inpImp      = document.getElementById("inputImpuesto");
const inpAnt      = document.getElementById("inputAnticipo");
const resSub      = document.getElementById("resSubtotal");
const resDesc     = document.getElementById("resDescuento");
const resImp      = document.getElementById("resImpuestos");
const resTot      = document.getElementById("resTotal");

// Configura eventos
btnAgregar.addEventListener("click", agregarFila);
btnEliminar.addEventListener("click", eliminarFila);
btnGuardar.addEventListener("click", guardarCotizacion);
btnBuscar.addEventListener("click", buscar);
btnEnviar.addEventListener("click", enviarEmail);
btnAprobar.addEventListener("click", aprobarYpagar);
[inpDesc, inpImp, inpAnt].forEach(el => el.addEventListener("input", recalcularTotales));

// Funciones de filas y totales
function agregarFila() {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${tablaBody.rows.length + 1}</td>
    <td><input class="descripcion" type="text"></td>
    <td><input class="cantidad" type="number" min="1" value="1"></td>
    <td><input class="precio" type="number" min="0" step="0.01" value="0.00"></td>
    <td class="total">$0.00</td>
    <td><button class="btnEliminar">Eliminar</button></td>
  `;
  tablaBody.appendChild(row);
  row.querySelector(".cantidad").addEventListener("input", recalcularTotales);
  row.querySelector(".precio").addEventListener("input", recalcularTotales);
  row.querySelector(".btnEliminar").addEventListener("click", () => {
    row.remove();
    recalcularTotales();
  });
  recalcularTotales();
}

function eliminarFila() {
  if (tablaBody.rows.length > 0) {
    tablaBody.deleteRow(-1);
    recalcularTotales();
  }
}

function recalcularTotales() {
  let subtotal = 0;
  tablaBody.querySelectorAll("tr").forEach(r => {
    const cantidad = parseFloat(r.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(r.querySelector(".precio").value) || 0;
    const total = cantidad * precio;
    r.querySelector(".total").innerText = `$${total.toFixed(2)}`;
    subtotal += total;
  });
  const descuentoMonto = (subtotal * (parseFloat(inpDesc.value) || 0)) / 100;
  const impuestosMonto = ((subtotal - descuentoMonto) * (parseFloat(inpImp.value) || 0)) / 100;
  const anticipo = parseFloat(inpAnt.value) || 0;
  resSub.innerText = subtotal.toFixed(2);
  resDesc.innerText = descuentoMonto.toFixed(2);
  resImp.innerText = impuestosMonto.toFixed(2);
  resTot.innerText = (subtotal - descuentoMonto + impuestosMonto - anticipo).toFixed(2);
}

// Leer formulario y armar objeto de datos
function leerFormulario() {
  return {
    fecha: document.getElementById("fecha").value,
    numero: document.getElementById("numero").value,
    clienteNombre: document.getElementById("clienteNombre").value,
    clienteTipo: document.getElementById("clienteTipo").value,
    clienteDireccion: document.getElementById("clienteDireccion").value,
    clienteEmail: document.getElementById("clienteEmail").value,
    clienteTelefono: document.getElementById("clienteTelefono").value,
    items: Array.from(tablaBody.querySelectorAll("tr")).map((r, i) => ({
      id: i + 1,
      descripcion: r.querySelector(".descripcion").value,
      cantidad: +r.querySelector(".cantidad").value,
      precio: +r.querySelector(".precio").value,
      total: parseFloat(r.querySelector(".total").innerText.replace("$", ""))
    })),
    concepto: document.getElementById("inputConcepto").value,
    observaciones: document.getElementById("inputObservaciones").value,
    subtotal: parseFloat(resSub.innerText),
    descuento: parseFloat(resDesc.innerText),
    impuestos: parseFloat(resImp.innerText),
    anticipo: parseFloat(inpAnt.value),
    total: parseFloat(resTot.innerText)
  };
}

// Guardar cotización en Firestore
async function guardarCotizacion() {
  try {
    const data = leerFormulario();
    await db.collection("cotizaciones").add(data);
    alert("Cotización guardada");
  } catch (e) {
    console.error("Error guardando cotización:", e);
    alert("Error guardando cotización");
  }
}

// Buscar cotización para carga
async function buscar() {
  const num = document.getElementById("inputNumeroBuscar").value.trim();
  if (!num) return alert("Escribe un número");
  try {
    const snap = await db.collection("cotizaciones").where("numero", "==", num).get();
    if (snap.empty) return alert("No encontrado");
    llenarFormulario(snap.docs[0].data());
  } catch (e) {
    console.error("Error buscando cotización:", e);
    alert("Error al buscar");
  }
}

// Llenar formulario con datos existentes
function llenarFormulario(d) {
  document.getElementById("fecha").value = d.fecha;
  document.getElementById("numero").value = d.numero;
  document.getElementById("clienteNombre").value = d.clienteNombre;
  document.getElementById("clienteTipo").value = d.clienteTipo;
  document.getElementById("clienteDireccion").value = d.clienteDireccion;
  document.getElementById("clienteEmail").value = d.clienteEmail;
  document.getElementById("clienteTelefono").value = d.clienteTelefono;
  tablaBody.innerHTML = "";
  d.items.forEach(() => agregarFila());
  const rows = tablaBody.querySelectorAll("tr");
  d.items.forEach((it, i) => {
    const row = rows[i];
    row.querySelector(".descripcion").value = it.descripcion;
    row.querySelector(".cantidad").value = it.cantidad;
    row.querySelector(".precio").value = it.precio;
  });
  document.getElementById("inputConcepto").value = d.concepto;
  document.getElementById("inputObservaciones").value = d.observaciones;
  recalcularTotales();
}

// Enviar cotización por email
async function enviarEmail() {
  try {
    const data = leerFormulario();
    const res = await fetch(`${BACKEND_URL}/send-quotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert("Correo enviado");
  } catch (e) {
    console.error("Error enviando correo:", e);
    alert("Error enviando correo");
  }
}

// Aprobar cotización y generar PaymentIntent + formulario Stripe
async function aprobarYpagar() {
  const d = leerFormulario();
  if (!d.anticipo || d.anticipo <= 0) return alert("No hay anticipo pendiente");

  // Guarda factura en Firestore
  await db.collection("facturas").doc(d.numero).set(d);

  // Crea PaymentIntent en backend
  try {
    const resp = await fetch(`${BACKEND_URL}/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: d.anticipo, numero: d.numero, clienteEmail: d.clienteEmail })
    });
    const { clientSecret, error } = await resp.json();
    if (error) throw new Error(error);

    // Muestra formulario Stripe Elements
    document.getElementById("app").innerHTML = `
      <h2>Pagar Anticipo: $${d.anticipo.toFixed(2)}</h2>
      <div id="card-element"></div>
      <button id="btnPagar">Pagar</button>
    `;
    const elements = stripe.elements();
    const card = elements.create("card");
    card.mount("#card-element");

    document.getElementById("btnPagar").addEventListener("click", async () => {
      const { error: payError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card }
      });
      if (payError) alert(payError.message);
      else alert("Pago exitoso");
    });
  } catch (err) {
    console.error("Error creando PaymentIntent:", err);
    alert("Error procesando pago");
  }
}

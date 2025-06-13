// script.js
// Módulo principal de funcionalidades: filas, totales, Firebase, email y Stripe Elements

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { loadStripe } from "https://js.stripe.com/v3/";

(async () => {
  // Carga Stripe con tu clave pública
  const stripe = await loadStripe("pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI");

  // Referencias a elementos del DOM
  const tablaBody = document.querySelector("#tablaItems tbody");
  const btnAgregar = document.getElementById("btnAgregarFila");
  const btnEliminar = document.getElementById("btnEliminarFila");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnEnviar = document.getElementById("btnEnviar");
  const btnAprobar = document.getElementById("btnAprobar");

  // Inputs de totales
  const inputDescuento = document.getElementById("inputDescuento");
  const inputImpuesto = document.getElementById("inputImpuesto");
  const inputAnticipo = document.getElementById("inputAnticipo");

  // Span de resultados
  const resSubtotal = document.getElementById("resSubtotal");
  const resDescuento = document.getElementById("resDescuento");
  const resImpuestos = document.getElementById("resImpuestos");
  const resTotal = document.getElementById("resTotal");

  // Eventos
  btnAgregar.addEventListener("click", agregarFila);
  btnEliminar.addEventListener("click", eliminarFila);
  btnGuardar.addEventListener("click", guardarCotizacion);
  btnBuscar.addEventListener("click", buscar);
  btnEnviar.addEventListener("click", enviarEmail);
  btnAprobar.addEventListener("click", () => aprobarYpagar(stripe));

  [inputDescuento, inputImpuesto, inputAnticipo].forEach(el =>
    el.addEventListener("input", recalcularTotales)
  );

  //=== Funciones ===

  function agregarFila() {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tablaBody.rows.length + 1}</td>
      <td><input class="descripcion" type="text"/></td>
      <td><input class="cantidad" type="number" min="1" value="1"/></td>
      <td><input class="precio" type="number" min="0" step="0.01" value="0.00"/></td>
      <td class="total">$0.00</td>
      <td><button class="btnEliminar">Eliminar</button></td>`;
    tablaBody.appendChild(row);

    // Eventos internos de la fila
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
      const c = parseFloat(r.querySelector(".cantidad").value) || 0;
      const p = parseFloat(r.querySelector(".precio").value) || 0;
      const t = c * p;
      r.querySelector(".total").innerText = `$${t.toFixed(2)}`;
      subtotal += t;
    });

    const descPct = parseFloat(inputDescuento.value) || 0;
    const descAmt = (subtotal * descPct) / 100;
    const impPct = parseFloat(inputImpuesto.value) || 0;
    const impAmt = ((subtotal - descAmt) * impPct) / 100;
    const anticipo = parseFloat(inputAnticipo.value) || 0;
    const neto = subtotal - descAmt + impAmt - anticipo;

    resSubtotal.innerText = subtotal.toFixed(2);
    resDescuento.innerText = descAmt.toFixed(2);
    resImpuestos.innerText = impAmt.toFixed(2);
    resTotal.innerText = neto.toFixed(2);
  }

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
      subtotal: parseFloat(resSubtotal.innerText),
      descuento: parseFloat(resDescuento.innerText),
      impuestos: parseFloat(resImpuestos.innerText),
      anticipo: parseFloat(inputAnticipo.value),
      total: parseFloat(resTotal.innerText)
    };
  }

  async function guardarCotizacion() {
    const data = leerFormulario();
    await addDoc(collection(db, "cotizaciones"), data);
    alert("Cotización guardada en Firebase.");
  }

  async function buscar() {
    const num = document.getElementById("inputNumeroBuscar").value.trim();
    if (!num) return alert("Escribe un número para buscar");
    const col = num.startsWith("FAC") ? "facturas" : "cotizaciones";
    const q = query(collection(db, col), where("numero", "==", num));
    const snap = await getDocs(q);
    if (snap.empty) return alert("No se encontró documento");
    snap.forEach(d => llenarFormulario(d.data()));
  }

  function llenarFormulario(data) {
    document.getElementById("fecha").value = data.fecha;
    document.getElementById("numero").value = data.numero;
    document.getElementById("clienteNombre").value = data.clienteNombre;
    document.getElementById("clienteTipo").value = data.clienteTipo;
    document.getElementById("clienteDireccion").value = data.clienteDireccion;
    document.getElementById("clienteEmail").value = data.clienteEmail;
    document.getElementById("clienteTelefono").value = data.clienteTelefono;
    // Vaciar tabla y volver a poblar
    tablaBody.innerHTML = "";
    data.items.forEach(item => {
      agregarFila();
      const row = tablaBody.lastElementChild;
      row.querySelector(".descripcion").value = item.descripcion;
      row.querySelector(".cantidad").value = item.cantidad;
      row.querySelector(".precio").value = item.precio;
    });
    recalcularTotales();
    document.getElementById("inputConcepto").value = data.concepto;
    document.getElementById("inputObservaciones").value = data.observaciones;
  }

  async function enviarEmail() {
    const data = leerFormulario();
    const resp = await fetch("/send-quotation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (resp.ok) alert("Correo enviado con botón de aprobación");
    else alert("Error enviando correo");
  }

  async function aprobarYpagar(stripe) {
    const data = leerFormulario();
    // 1) Guardar factura
    await setDoc(doc(db, "facturas", data.numero), data);
    // 2) Crear PaymentIntent
    const { clientSecret } = await fetch("/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: data.total })
    }).then(r => r.json());
    // 3) Mostrar Stripe Elements
    document.querySelector(".container").innerHTML = `
      <h2>Pagar Anticipo: $${data.total.toFixed(2)}</h2>
      <div id="card-element"></div>
      <button id="pay">Pagar</button>`;
    const elements = stripe.elements();
    const card = elements.create("card");
    card.mount("#card-element");
    document.getElementById("pay").addEventListener("click", async () => {
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card }
      });
      if (error) alert(error.message);
      else alert("Pago exitoso, ¡gracias!");
    });
  }

  // Inicializar primera tabla y totales
  recalcularTotales();
})();

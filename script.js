// script.js
// Lógica del frontend (Firebase + Stripe) para cotizaciones y pagos

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config.js"; // Asegúrate de exportar tu config
initializeApp(firebaseConfig);
const db = getFirestore();

const BACKEND_URL = "https://mail-server-byrb.onrender.com";
const stripe = Stripe("pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI");

// Umbral y porcentaje mínimo
const DEPOSIT_THRESHOLD = 2500.00;
const DEPOSIT_PERCENT   = 0.30;

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

btnAgregar.addEventListener("click", agregarFila);
btnEliminar.addEventListener("click", eliminarFila);
btnGuardar.addEventListener("click", guardarCotizacion);
btnBuscar.addEventListener("click", buscar);
btnEnviar.addEventListener("click", enviarEmail);
btnAprobar.addEventListener("click", aprobarYpagar);
[inpDesc, inpImp, inpAnt].forEach(el => el.addEventListener("input", recalcularTotales));

recalcularTotales();

async function agregarFila() {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${tablaBody.rows.length + 1}</td>
    <td><input class="descripcion" type="text"></td>
    <td><input class="cantidad"   type="number" min="1" value="1"></td>
    <td><input class="precio"      type="number" min="0" step="0.01" value="0.00"></td>
    <td class="total">$0.00</td>
    <td><button class="btnEliminar">Eliminar</button></td>`;
  tablaBody.appendChild(row);
  row.querySelector(".cantidad").addEventListener("input", recalcularTotales);
  row.querySelector(".precio") .addEventListener("input", recalcularTotales);
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
  let sub = 0;
  tablaBody.querySelectorAll("tr").forEach(r => {
    const c = parseFloat(r.querySelector(".cantidad").value) || 0;
    const p = parseFloat(r.querySelector(".precio") .value) || 0;
    const t = c * p;
    r.querySelector(".total").innerText = `$${t.toFixed(2)}`;
    sub += t;
  });

  const dAmt = sub * (parseFloat(inpDesc.value) || 0) / 100;
  const iAmt = (sub - dAmt) * (parseFloat(inpImp.value) || 0) / 100;
  const neto = sub - dAmt + iAmt;

  // Calcula anticipo mínimo o total completo
  let antic = parseFloat(inpAnt.value) || 0;
  if (neto < DEPOSIT_THRESHOLD) {
    // si es menor al umbral, oculta el campo y fija anticipo = total
    antic = neto;
    inpAnt.value = antic.toFixed(2);
    inpAnt.closest("div").style.display = "none";
  } else {
    inpAnt.closest("div").style.display = "";
    const minAnt = +(neto * DEPOSIT_PERCENT).toFixed(2);
    if (antic < minAnt) {
      antic = minAnt;
      inpAnt.value = antic.toFixed(2);
    }
  }

  resSub.innerText  = sub.toFixed(2);
  resDesc.innerText = dAmt.toFixed(2);
  resImp.innerText  = iAmt.toFixed(2);
  resTot.innerText  = neto.toFixed(2);
}

function leerFormulario() {
  const d = {
    fecha: document.getElementById("fecha").value,
    numero: document.getElementById("numero").value,
    clienteNombre: document.getElementById("clienteNombre").value,
    clienteTipo: document.getElementById("clienteTipo").value,
    clienteDireccion: document.getElementById("clienteDireccion").value,
    clienteEmail: document.getElementById("clienteEmail").value,
    clienteTelefono: document.getElementById("clienteTelefono").value,
    items: Array.from(tablaBody.querySelectorAll("tr")).map((r,i)=>({
      id: i+1,
      descripcion: r.querySelector(".descripcion").value,
      cantidad: +r.querySelector(".cantidad").value,
      precio: +r.querySelector(".precio").value,
      total: parseFloat(r.querySelector(".total").innerText.replace("$",""))
    })),
    concepto: document.getElementById("inputConcepto").value,
    observaciones: document.getElementById("inputObservaciones").value,
    subtotal: parseFloat(resSub.innerText),
    descuento: parseFloat(resDesc.innerText),
    impuestos: parseFloat(resImp.innerText),
    anticipo: parseFloat(inpAnt.value),
    total: parseFloat(resTot.innerText)
  };
  return d;
}

async function guardarCotizacion() {
  const data = leerFormulario();
  try {
    await db.collection("cotizaciones").add(data);
    alert("Cotización guardada");
  } catch (e) {
    console.error(e);
    alert("Error guardando cotización");
  }
}

async function buscar() {
  const num = document.getElementById("inputNumeroBuscar").value.trim();
  if (!num) return alert("Escribe un número");
  try {
    const snap = await db.collection("cotizaciones").where("numero","==",num).get();
    if (snap.empty) return alert("No encontrado");
    llenarFormulario(snap.docs[0].data());
  } catch (e) {
    console.error(e);
    alert("Error buscando cotización");
  }
}

function llenarFormulario(d) {
  document.getElementById("fecha").value    = d.fecha;
  document.getElementById("numero").value   = d.numero;
  document.getElementById("clienteNombre").value    = d.clienteNombre;
  document.getElementById("clienteTipo").value      = d.clienteTipo;
  document.getElementById("clienteDireccion").value = d.clienteDireccion;
  document.getElementById("clienteEmail").value     = d.clienteEmail;
  document.getElementById("clienteTelefono").value  = d.clienteTelefono;
  tablaBody.innerHTML = "";
  d.items.forEach(() => agregarFila());
  const rows = tablaBody.querySelectorAll("tr");
  d.items.forEach((it,i)=>{
    rows[i].querySelector(".descripcion").value = it.descripcion;
    rows[i].querySelector(".cantidad").value    = it.cantidad;
    rows[i].querySelector(".precio").value      = it.precio;
  });
  document.getElementById("inputConcepto").value      = d.concepto;
  document.getElementById("inputObservaciones").value = d.observaciones;
  recalcularTotales();
}

async function enviarEmail() {
  const data = leerFormulario();
  try {
    const res = await fetch(`${BACKEND_URL}/send-quotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(res.status);
    alert("Correo de cotización enviado");
  } catch (e) {
    console.error("Error enviando cotización:", e);
    alert("Error enviando cotización");
  }
}

async function aprobarYpagar() {
  const d = leerFormulario();
  if (!d.anticipo || d.anticipo <= 0) {
    return alert("No hay anticipo pendiente");
  }
  try {
    const resp = await fetch(`${BACKEND_URL}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: d.numero,
        anticipo: d.anticipo,
        clienteEmail: d.clienteEmail
      })
    });
    const { url, error } = await resp.json();
    if (error) throw new Error(error);
    window.location = url;
  } catch (err) {
    console.error("Error iniciando Stripe Checkout:", err);
    alert("No se pudo iniciar el pago:\n" + err.message);
  }
}

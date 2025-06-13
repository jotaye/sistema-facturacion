// script.js
import { db } from "./firebase-config.js";

const stripe = Stripe("pk_test_51RYYSpPFkZDbc1hwxDRXWJQ2T4sYQEtA5Ejx2gB2sCA90tdUQwJiqxdzkkn2VRz3mdFVu5BxbBnZheXQcNSB1CxT00hWKt2xXI");

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

function agregarFila() {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${tablaBody.rows.length+1}</td>
    <td><input class="descripcion" type="text"/></td>
    <td><input class="cantidad" type="number" min="1" value="1"/></td>
    <td><input class="precio" type="number" min="0" step="0.01" value="0.00"/></td>
    <td class="total">$0.00</td>
    <td><button class="btnEliminar">Eliminar</button></td>`;
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
    const c = parseFloat(r.querySelector(".cantidad").value)||0;
    const p = parseFloat(r.querySelector(".precio").value)||0;
    const t = c*p;
    r.querySelector(".total").innerText = `$${t.toFixed(2)}`;
    subtotal += t;
  });
  const dPct = parseFloat(inpDesc.value)||0;
  const dAmt = (subtotal*dPct)/100;
  const iPct = parseFloat(inpImp.value)||0;
  const iAmt = ((subtotal-dAmt)*iPct)/100;
  const antic = parseFloat(inpAnt.value)||0;
  const neto = subtotal-dAmt+iAmt-antic;
  resSub.innerText  = subtotal.toFixed(2);
  resDesc.innerText = dAmt.toFixed(2);
  resImp.innerText  = iAmt.toFixed(2);
  resTot.innerText  = neto.toFixed(2);
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
    items: Array.from(tablaBody.querySelectorAll("tr")).map((r,i)=>({
      id: i+1,
      descripcion: r.querySelector(".descripcion").value,
      cantidad: +r.querySelector(".cantidad").value,
      precio:   +r.querySelector(".precio").value,
      total:    parseFloat(r.querySelector(".total").innerText.replace("$",""))
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

async function guardarCotizacion() {
  const data = leerFormulario();
  await db.collection("cotizaciones").add(data);
  alert("Cotización guardada.");
}

async function buscar() {
  const num = document.getElementById("inputNumeroBuscar").value.trim();
  if (!num) return alert("Escribe un número");
  const col = num.startsWith("FAC") ? "facturas" : "cotizaciones";
  const snap = await db.collection(col).where("numero","==",num).get();
  if (snap.empty) return alert("No encontrado");
  snap.forEach(doc => llenarFormulario(doc.data()));
}

function llenarFormulario(data) {
  document.getElementById("fecha").value            = data.fecha;
  document.getElementById("numero").value           = data.numero;
  document.getElementById("clienteNombre").value    = data.clienteNombre;
  document.getElementById("clienteTipo").value      = data.clienteTipo;
  document.getElementById("clienteDireccion").value = data.clienteDireccion;
  document.getElementById("clienteEmail").value     = data.clienteEmail;
  document.getElementById("clienteTelefono").value  = data.clienteTelefono;
  tablaBody.innerHTML = "";
  data.items.forEach(item => {
    agregarFila();
    const row = tablaBody.lastElementChild;
    row.querySelector(".descripcion").value = item.descripcion;
    row.querySelector(".cantidad").value    = item.cantidad;
    row.querySelector(".precio").value      = item.precio;
  });
  recalcularTotales();
  document.getElementById("inputConcepto").value      = data.concepto;
  document.getElementById("inputObservaciones").value = data.observaciones;
}

async function enviarEmail() {
  const data = leerFormulario();
  const res = await fetch("https://mail-server-byrb.onrender.com/send-quotation", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data)
  });
  if (res.ok) alert("Correo enviado."); else alert("Error email.");
}

async function aprobarYpagar() {
  const data = leerFormulario();
  await db.collection("facturas").doc(data.numero).set(data);
  const { clientSecret } = await fetch("https://mail-server-byrb.onrender.com/create-payment-intent", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ amount: data.total })
  }).then(r=>r.json());
  document.querySelector(".container").innerHTML = `
    <h2>Pagar Anticipo: $${data.total.toFixed(2)}</h2>
    <div id="card-element"></div>
    <button id="pay">Pagar</button>`;
  const elements = stripe.elements();
  const card     = elements.create("card");
  card.mount("#card-element");
  document.getElementById("pay").addEventListener("click",async()=>{
    const { error } = await stripe.confirmCardPayment(clientSecret,{ payment_method:{ card }});
    if (error) alert(error.message); else alert("Pago exitoso");
  });
}

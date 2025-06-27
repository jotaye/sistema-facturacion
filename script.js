// (Si prefieres tener tu JS separado en vez de inline)
import { db } from "./firebase-config.js";
const stripe = Stripe("pk_test_XXXXXXXXXXXXXXXXXXXX");

const tablaBody   = document.querySelector("#tablaItems tbody");
const btnGuardar  = document.getElementById("btnGuardar");
const btnImprimir = document.getElementById("btnImprimir");
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

btnGuardar.addEventListener("click", guardarCotizacion);
btnImprimir.addEventListener("click", ()=>imprimirPlantilla());
btnBuscar.addEventListener("click", ()=>buscarUICotizacion().catch(e=>alert(e.message)));
btnEnviar.addEventListener("click", enviarEmail);
btnAprobar.addEventListener("click", ()=>iniciarCheckout(leerFormulario()));
[inpDesc, inpImp, inpAnt].forEach(i=>i.addEventListener("input", recalcularTotales));

function leerFormulario() {
  // igual que inline
}

async function guardarCotizacion() {
  const d = leerFormulario();
  await db.collection("cotizaciones").doc(d.numero).set(d);
  alert("Guardada: "+d.numero);
}

async function buscarUICotizacion() {
  const num = document.getElementById("inputNumeroBuscar").value.trim();
  if (!num) return alert("Escribe un número");
  const doc = await db.collection("cotizaciones").doc(num).get();
  if (!doc.exists) throw new Error("No encontrado: "+num);
  imprimirPlantilla(doc.data());
}

// etc... (igual que inline)

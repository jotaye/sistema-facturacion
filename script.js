import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { loadStripe } from "https://js.stripe.com/v3/";

const tabla = document.querySelector("#tablaItems tbody");
document.getElementById("btnAgregarFila").addEventListener("click", agregarFila);
document.getElementById("btnEliminarFila").addEventListener("click", eliminarFila);
["inputDescuento","inputImpuesto","inputAnticipo"].forEach(id=>document.getElementById(id).addEventListener("input", recalcularTotales));
document.getElementById("btnGuardar").addEventListener("click", guardarCotizacion);
document.getElementById("btnBuscar").addEventListener("click", buscar);
document.getElementById("btnEnviar").addEventListener("click", enviarEmail);
document.getElementById("btnAprobar").addEventListener("click", aprobarYpagar);

function agregarFila(){
  const row=document.createElement("tr");
  row.innerHTML=`
    <td>${tabla.rows.length+1}</td>
    <td><input class="descripcion" type="text"/></td>
    <td><input class="cantidad" type="number" min="1" value="1"/></td>
    <td><input class="precio" type="number" min="0" step="0.01" value="0.00"/></td>
    <td class="total">$0.00</td>
    <td><button class="btnEliminar">🗑️</button></td>`;
  tabla.appendChild(row);
  row.querySelector(".cantidad").addEventListener("input",recalcularTotales);
  row.querySelector(".precio").addEventListener("input",recalcularTotales);
  row.querySelector(".btnEliminar").addEventListener("click",()=>{
    row.remove(); recalcularTotales();
  });
  recalcularTotales();
}

function eliminarFila(){ if(tabla.rows.length>0){ tabla.deleteRow(-1); recalcularTotales(); } }

function recalcularTotales(){
  let subtotal=0;
  tabla.querySelectorAll("tr").forEach(r=>{
    const c=parseFloat(r.querySelector(".cantidad").value)||0;
    const p=parseFloat(r.querySelector(".precio").value)||0;
    const t=c*p;
    r.querySelector(".total").innerText=`$${t.toFixed(2)}`;
    subtotal+=t;
  });
  const descPct=+document.getElementById("inputDescuento").value||0;
  const descAmt=subtotal*descPct/100;
  const impPct=+document.getElementById("inputImpuesto").value||0;
  const impAmt=(subtotal-descAmt)*impPct/100;
  const antic=+document.getElementById("inputAnticipo").value||0;
  const neto=subtotal-descAmt+impAmt-antic;
  document.getElementById("resSubtotal").innerText=subtotal.toFixed(2);
  document.getElementById("resDescuento").innerText=descAmt.toFixed(2);
  document.getElementById("resImpuestos").innerText=impAmt.toFixed(2);
  document.getElementById("resTotal").innerText=neto.toFixed(2);
}

async function guardarCotizacion(){
  const data=leerFormulario();
  await addDoc(collection(db,"cotizaciones"),data);
  alert("Cotización guardada.");
}

async function buscar(){
  const num=document.getElementById("inputNumeroBuscar").value;
  if(!num) return alert("Escribe un número");
  const q=query(collection(db, num.startsWith("FAC")?"facturas":"cotizaciones"), where("numero","==",num));
  const snap=await getDocs(q);
  if(snap.empty) return alert("No encontrado");
  snap.forEach(d=>llenarFormulario(d.data()));
}

async function enviarEmail(){
  const data=leerFormulario();
  const res=await fetch("/send-quotation",{
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)
  });
  if(res.ok) alert("Correo enviado con botón de aprobación."); else alert("Error email");
}

async function aprobarYpagar(){
  const data=leerFormulario();
  // Genera factura
  await setDoc(doc(db,"facturas",data.numero),data);
  // Crea PaymentIntent
  const {clientSecret}=await fetch("/create-payment-intent",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:data.total})
  }).then(r=>r.json());
  const stripe=await loadStripe("TU_PUBLISHABLE_KEY");
  const elements=stripe.elements();
  const card=elements.create("card");
  document.querySelector(".container").innerHTML=`<h2>Pagar Anticipo $${data.total}</h2><div id="card-element"></div><button id="pay">Pagar</button>`;
  card.mount("#card-element");
  document.getElementById("pay").addEventListener("click",async()=>{
    const {error}=await stripe.confirmCardPayment(clientSecret,{payment_method:{card}});
    if(error) alert(error.message); else alert("Pago exitoso");
  });
}

function leerFormulario(){
  return {
    fecha:document.getElementById("fecha").value,
    numero:document.getElementById("numero").value,
    clienteNombre:document.getElementById("clienteNombre").value,
    clienteTipo:document.getElementById("clienteTipo").value,
    clienteDireccion:document.getElementById("clienteDireccion").value,
    clienteEmail:document.getElementById("clienteEmail").value,
    clienteTelefono:document.getElementById("clienteTelefono").value,
    items:Array.from(tabla.querySelectorAll("tr")).map((r,i)=>({
      id:i+1,
      descripcion:r.querySelector(".descripcion").value,
      cantidad:+r.querySelector(".cantidad").value,
      precio:+r.querySelector(".precio").value,
      total:+r.querySelector(".total").innerText.replace("$","")
    })),
    concepto:document.getElementById("inputConcepto").value,
    observaciones:document.getElementById("inputObservaciones").value,
    subtotal:+document.getElementById("resSubtotal").innerText,
    descuento:+document.getElementById("resDescuento").innerText,
    impuestos:+document.getElementById("resImpuestos").innerText,
    anticipo:+document.getElementById("inputAnticipo").value,
    total:+document.getElementById("resTotal").innerText
  };
}

function llenarFormulario(data){
  document.getElementById("fecha").value=data.fecha;
  document.getElementById("numero").value=data.numero;
  document.getElementById("clienteNombre").value=data.clienteNombre;
  document.getElementById("clienteTipo").value=data.clienteTipo;
  document.getElementById("clienteDireccion").value=data.clienteDireccion;
  document.getElementById("clienteEmail").value=data.clienteEmail;
  document.getElementById("clienteTelefono").value=data.clienteTelefono;
  // limpia tabla e inserta items...
}

// fin script.js

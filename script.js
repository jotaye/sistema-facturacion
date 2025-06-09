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
  row.querySelector(".btnEliminar").addEventListener("click", () => {
    row.remove();
    recalcularTotales();
  });
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

// === Recalcular al cambiar inputs ===
["inputDescuento", "inputImpuesto", "inputAnticipo"].forEach(id => {
  document.getElementById(id).addEventListener("input", recalcularTotales);
});

// === Guardar cotización ===
document.getElementById("btnGuardar").addEventListener("click", () => {
  const numero = document.getElementById("numero").value.trim();
  if (!numero) return alert("❗ Debes asignar un número de cotización.");

  const subtotal = parseFloat(document.getElementById("resSubtotal").innerText) || 0;
  const descuentoPct = parseFloat(document.getElementById("inputDescuento").value) || 0;
  const montoDescuento = parseFloat(document.getElementById("resDescuento").innerText) || 0;
  const impuestoPct = parseFloat(document.getElementById("inputImpuesto").value) || 0;
  const montoImpuesto = parseFloat(document.getElementById("resImpuestos").innerText) || 0;
  const anticipo = parseFloat(document.getElementById("inputAnticipo").value) || 0;
  const total = parseFloat(document.getElementById("resTotal").innerText) || 0;

  const cotizacion = {
    fecha: document.getElementById("fecha").value,
    numero,
    cliente: {
      nombre: document.getElementById("clienteNombre").value,
      tipo: document.getElementById("clienteTipo").value,
      direccion: document.getElementById("clienteDireccion").value,
      email: document.getElementById("clienteEmail").value,
      telefono: document.getElementById("clienteTelefono").value
    },
    items: [],
    resumen: {
      subtotal: subtotal.toFixed(2),
      porcentajeDescuento: descuentoPct.toFixed(2),
      descuento: montoDescuento.toFixed(2),
      porcentajeImpuesto: impuestoPct.toFixed(2),
      impuestos: montoImpuesto.toFixed(2),
      totalSinImpuesto: (subtotal - montoDescuento).toFixed(2),
      anticipo: anticipo.toFixed(2),
      total: total.toFixed(2)
    }
  };

  tabla.querySelectorAll("tr").forEach(row => {
    const cantidad = parseFloat(row.querySelector(".cantidad").value) || 0;
    const precio = parseFloat(row.querySelector(".precio").value) || 0;
    const totalItem = cantidad * precio;
    cotizacion.items.push({
      descripcion: row.querySelector(".descripcion").value,
      cantidad: cantidad.toString(),
      precio: precio.toFixed(2),
      total: totalItem.toFixed(2)
    });
  });

  db.collection("cotizaciones").doc(numero).set(cotizacion)
    .then(() => alert("✅ Cotización guardada correctamente."))
    .catch(err => alert("❌ Error al guardar: " + err.message));
});

// === Buscar cotización ===
document.getElementById("btnBuscar").addEventListener("click", () => {
  const buscar = document.getElementById("buscar").value.trim();
  if (!buscar) return alert("❗ Ingresa un número de cotización o factura.");
  db.collection("cotizaciones").doc(buscar).get()
    .then(doc => {
      if (!doc.exists) return alert("❌ Cotización no encontrada.");
      const data = doc.data();
      document.getElementById("numero").value = data.numero;
      document.getElementById("fecha").value = data.fecha || "";
      document.getElementById("clienteNombre").value = data.cliente.nombre || "";
      document.getElementById("clienteTipo").value = data.cliente.tipo || "";
      document.getElementById("clienteDireccion").value = data.cliente.direccion || "";
      document.getElementById("clienteEmail").value = data.cliente.email || "";
      document.getElementById("clienteTelefono").value = data.cliente.telefono || "";
      document.getElementById("inputDescuento").value = data.resumen.porcentajeDescuento || 0;
      document.getElementById("inputImpuesto").value = data.resumen.porcentajeImpuesto || 0;
      document.getElementById("inputAnticipo").value = data.resumen.anticipo || 0;

      tabla.innerHTML = "";
      data.items.forEach((item, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td><input type="text" class="descripcion" value="${item.descripcion}" /></td>
          <td><input type="number" class="cantidad" value="${item.cantidad}" /></td>
          <td><input type="number" class="precio" value="${item.precio}" /></td>
          <td class="total">$${item.total}</td>
          <td><button class="btnEliminar">🗑️</button></td>
        `;
        tabla.appendChild(row);
        row.querySelector(".cantidad").addEventListener("input", recalcularTotales);
        row.querySelector(".precio").addEventListener("input", recalcularTotales);
        row.querySelector(".btnEliminar").addEventListener("click", () => {
          row.remove();
          recalcularTotales();
        });
      });

      recalcularTotales();
    })
    .catch(err => alert("❌ Error al buscar: " + err.message));
});

// === Imprimir ===
document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});

// === Reiniciar ===
document.getElementById("btnReiniciar").addEventListener("click", () => {
  location.reload();
});

// === Enviar por email ===
document.getElementById("btnEnviar").addEventListener("click", () => {
  const email = document.getElementById("clienteEmail").value;
  if (!email) return alert("❗ Ingresa un email válido del cliente.");

  fetch("https://mail-server-byrb.onrender.com/send-quotation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numero: document.getElementById("numero").value,
      to: email,
      subject: "Cotización Jotaye Group LLC",
      texto: `Adjunto encontrará su cotización. Total estimado: $${document.getElementById("resTotal").innerText}`,
      pdfBase64: null // Pendiente: adjuntar PDF real si lo deseas
    })
  })
    .then(res => res.ok ? alert("📨 Cotización enviada por correo.") : alert("❌ Falló el envío."))
    .catch(err => alert("❌ Error al enviar correo: " + err));
});

// === Aprobar ===
document.getElementById("btnAprobar").addEventListener("click", () => {
  alert("✅ Cotización aprobada. Generando factura... (pendiente PDF)");
  // Aquí agregar: generación de PDF y guardado en Firebase 'facturas'
});

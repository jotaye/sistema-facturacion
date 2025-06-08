// src/js/script.js (completo y actualizado)

document.addEventListener("DOMContentLoaded", () => {
  const tablaBody = document.querySelector("#tablaItems tbody");
  const btnAgregar = document.getElementById("btnAgregar");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnImprimir = document.getElementById("btnImprimir");
  const btnFactura = document.getElementById("btnFactura");
  const btnEnviar = document.getElementById("btnEnviar");

  const resSubtotal = document.getElementById("resSubtotal");
  const resImpuestos = document.getElementById("resImpuestos");
  const resTotal = document.getElementById("resTotal");
  const inputDescuento = document.getElementById("inputDescuento");
  const inputAnticipo = document.getElementById("inputAnticipo");

  const calcularTotales = () => {
    let subtotal = 0;
    tablaBody.querySelectorAll("tr").forEach(row => {
      const cantidad = parseFloat(row.querySelector(".cantidad").value) || 0;
      const precio = parseFloat(row.querySelector(".precio").value) || 0;
      const subtotalItem = cantidad * precio;
      row.querySelector(".subtotal").textContent = subtotalItem.toFixed(2);
      subtotal += subtotalItem;
    });

    const impuestos = subtotal * 0.10;
    const descuento = subtotal * (parseFloat(inputDescuento.value) || 0) / 100;
    const anticipo = parseFloat(inputAnticipo.value) || 0;
    const total = subtotal + impuestos - descuento - anticipo;

    resSubtotal.textContent = subtotal.toFixed(2);
    resImpuestos.textContent = impuestos.toFixed(2);
    resTotal.textContent = total.toFixed(2);
  };

  const agregarFila = () => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><input type="text" class="descripcion" placeholder="Descripción" /></td>
      <td><input type="number" class="cantidad" value="1" min="1" /></td>
      <td><input type="number" class="precio" value="0.00" step="0.01" /></td>
      <td>$<span class="subtotal">0.00</span></td>
      <td><button class="btnEliminar">Eliminar</button></td>
    `;

    fila.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", calcularTotales);
    });

    fila.querySelector(".btnEliminar").addEventListener("click", () => {
      fila.remove();
      calcularTotales();
    });

    tablaBody.appendChild(fila);
    calcularTotales();
  };

  inputDescuento.addEventListener("input", calcularTotales);
  inputAnticipo.addEventListener("input", calcularTotales);
  btnAgregar.addEventListener("click", agregarFila);
  btnImprimir.addEventListener("click", () => window.print());
  btnGuardar.addEventListener("click", () => alert("Guardar cotización aún no implementado."));
  btnFactura.addEventListener("click", () => alert("Generación de PDF aún no implementada."));

  btnEnviar.addEventListener("click", async () => {
    const numero = "0001";
    const to = document.getElementById("clienteEmail").value;
    const subject = "Cotización enviada desde el sistema";
    const texto = "Gracias por confiar en nuestros servicios.";

    if (!to) {
      alert("Por favor ingresa el email del cliente.");
      return;
    }

    try {
      const response = await fetch("https://mail-server-byrb.onrender.com/send-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, to, subject, texto })
      });

      const data = await response.json();

      if (data.ok) {
        alert("Cotización enviada exitosamente al correo del cliente.");
      } else {
        alert("Error al enviar: " + data.error);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("No se pudo enviar la cotización.");
    }
  });

  // Inicializar con una fila
  agregarFila();
});

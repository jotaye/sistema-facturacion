// firebase-config.js
// SDK modular v9+ de Firebase, cargado como módulo en el navegador

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXBGILqL1JArsbJkKjUhX79veAnvkNcSg",
  authDomain: "presupuestos-1dd33.firebaseapp.com",
  projectId: "presupuestos-1dd33",
  storageBucket: "presupuestos-1dd33.appspot.com",
  messagingSenderId: "1077139821356",
  appId: "1:1077139821356:web:a831b1d90777b583b0d289",
  measurementId: "G-GG4X805W1R"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Analytics (opcional)
const analytics = getAnalytics(app);

// Inicializa y exporta Firestore para usarlo en script.js
export const db = getFirestore(app);

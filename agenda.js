 import { salvarEvento, buscarEventos } from "./firebaseDB.js";
import { logout, isAdmin } from "./firebaseAuth.js";

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const auth = getAuth();

const titulo = document.getElementById("titulo");
const data = document.getElementById("data");
const descricao = document.getElementById("descricao");
const lista = document.getElementById("listaEventos");

// PROTEÇÃO
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const admin = await isAdmin(user.uid);
  carregarEventos(admin);
});

// SALVAR
document.getElementById("btnSalvarEvento").addEventListener("click", async () => {
  await salvarEvento(titulo.value, data.value, descricao.value);
  location.reload();
});

// CARREGAR
async function carregarEventos(admin = false) {
  const eventos = await buscarEventos(admin);

  lista.innerHTML = "";

  eventos.forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${e.titulo}</strong> - ${e.data}<br>
      ${e.descricao}
    `;
    lista.appendChild(li);
  });
}

// LOGOUT
document.getElementById("btnLogout").addEventListener("click", async () => {
  await logout();
  window.location.href = "index.html";
});

import { renderCalendar } from "./calendar.js";

const conteudo = document.getElementById("conteudo");

// troca de tela
function navegar(pagina) {

  if (pagina === "home") {
    renderCalendar(conteudo);
  }

  if (pagina === "buscar") {
    conteudo.innerHTML = "<input placeholder='Buscar...'>";
  }

  if (pagina === "favoritos") {
    conteudo.innerHTML = "<h2>⭐ Favoritos</h2>";
  }

  if (pagina === "anotacoes") {
    conteudo.innerHTML = "<h2>📝 Anotações</h2>";
  }

  if (pagina === "atividades") {
    conteudo.innerHTML = "<h2>📊 Atividades</h2>";
  }

  if (pagina === "tarefas") {
    conteudo.innerHTML = "<h2>📋 Tarefas</h2>";
  }

  if (pagina === "perfil") {
    conteudo.innerHTML = "<h2>👤 Perfil</h2>";
  }
}

// menu
document.querySelectorAll(".menu button").forEach(btn => {
  btn.onclick = () => navegar(btn.dataset.page);
});

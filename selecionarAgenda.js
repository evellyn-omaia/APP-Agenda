import {
  criarAgenda,
  entrarNaAgenda,
  getUserData,
  auth,
} from "./firebaseAuth.js";

import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// ================= PROTEÇÃO =================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href =
      "index.html";

    return;
  }

  const data =
    await getUserData(user.uid);

  if (data?.agendaId) {

    window.location.href =
      "indexAgenda.html";

  }
});

// ================= CRIAR =================

document.getElementById("btnCriar").onclick =
async () => {

  try {

    const user = auth.currentUser;

    const codigo =
      await criarAgenda(user.uid);

    alert(
      "Agenda criada! Código: " + codigo
    );

    window.location.href =
      "indexAgenda.html";

  } catch (err) {

    alert(err.message);

  }
};

// ================= ENTRAR =================

document.getElementById("btnEntrar").onclick =
async () => {

  try {

    const codigo =
      document
        .getElementById("codigo")
        .value
        .trim();

    if (!codigo) {

      alert("Digite um código");

      return;
    }

    const user = auth.currentUser;

    await entrarNaAgenda(
      user.uid,
      codigo
    );

    alert("Entrou na agenda!");

    window.location.href =
      "indexAgenda.html";

  } catch (err) {

    alert(err.message);

  }
};
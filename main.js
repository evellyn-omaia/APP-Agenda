import {
  cadastrar,
  login,
  loginComGoogle,
  salvarUsuarioGoogle,
} from "./firebaseAuth.js";

// ELEMENTOS
const email = document.getElementById("email");
const senha = document.getElementById("senha");

// ================= CADASTRO =================

document.getElementById("btnCadastro").onclick =
async () => {

  try {

    await cadastrar(
      email.value,
      senha.value
    );

    alert("Conta criada!");

    window.location.href =
      "selecionarAgenda.html";

  } catch (err) {

    alert(err.message);

  }
};

// ================= LOGIN =================

document.getElementById("btnLogin").onclick =
async () => {

  try {

    await login(
      email.value,
      senha.value
    );

    window.location.href =
      "selecionarAgenda.html";

  } catch (err) {

    alert(err.message);

  }
};

// ================= GOOGLE =================

document.getElementById("btnGoogle").onclick =
async () => {

  try {

    const result =
      await loginComGoogle();

    await salvarUsuarioGoogle(
      result.user
    );

    window.location.href =
      "selecionarAgenda.html";

  } catch (err) {

    console.error(err);

    alert(err.message);

  }
};
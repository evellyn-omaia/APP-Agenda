import {
  cadastrar,
  login,
  loginComGoogle,
  processarLoginGoogle,
  salvarUsuarioGoogle,
  auth,
} from "./firebaseAuth.js";

import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// ========================================
// ELEMENTOS
// ========================================

const email =
  document.getElementById("email");

const senha =
  document.getElementById("senha");

const btnCadastro =
  document.getElementById("btnCadastro");

  const btnMostrarSenha =
  document.getElementById("toggleSenha");

  const iconeMostrarSenha =
  document.getElementById(
    "iconeMostrarSenha",
  );

const iconeOcultarSenha =
  document.getElementById(
    "iconeOcultarSenha",
  );

const btnLogin =
  document.getElementById("btnLogin");

const btnGoogle =
  document.getElementById("btnGoogle");

  // ========================================
// MOSTRAR / OCULTAR SENHA
// ========================================

// ========================================
// MOSTRAR E OCULTAR SENHA
// ========================================

btnMostrarSenha.addEventListener(
  "click",
  () => {
    const senhaEstaOculta =
      senha.type === "password";

    senha.type =
      senhaEstaOculta
        ? "text"
        : "password";

    iconeMostrarSenha.classList.toggle(
      "oculto",
      senhaEstaOculta,
    );

    iconeOcultarSenha.classList.toggle(
      "oculto",
      !senhaEstaOculta,
    );

    btnMostrarSenha.setAttribute(
      "aria-label",
      senhaEstaOculta
        ? "Ocultar senha"
        : "Mostrar senha",
    );

    btnMostrarSenha.title =
      senhaEstaOculta
        ? "Ocultar senha"
        : "Mostrar senha";

    senha.focus();

    const finalDoTexto =
      senha.value.length;

    senha.setSelectionRange(
      finalDoTexto,
      finalDoTexto,
    );
  },
);

let redirecionando = false;

// ========================================
// REDIRECIONAR USUÁRIO LOGADO
// ========================================

async function redirecionarUsuario(user) {
  if (!user || redirecionando) {
    return;
  }

  redirecionando = true;

  /*
    Depois de qualquer login, o usuário
    sempre vai para a tela de seleção
    de agendas.
  */
  window.location.replace(
    "./selecionarAgenda.html",
  );
}

// ========================================
// PROCESSAR RETORNO DO GOOGLE NO CELULAR
// ========================================

async function verificarRetornoGoogle() {
  try {
    const user =
      await processarLoginGoogle();

    if (user) {
      await redirecionarUsuario(user);
    }
  } catch (erro) {
    console.error(
      "Erro no retorno do Google:",
      erro,
    );

    alert(
      erro.message ||
      "Não foi possível concluir o login com Google.",
    );
  }
}

await verificarRetornoGoogle();

// ========================================
// VERIFICAR SESSÃO JÁ EXISTENTE
// ========================================

onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      return;
    }

    await redirecionarUsuario(user);
  },
);

// ========================================
// CADASTRO
// ========================================

btnCadastro.onclick = async () => {
  try {
    btnCadastro.disabled = true;

    btnCadastro.textContent =
      "Criando conta...";

    const user =
      await cadastrar(
        email.value.trim(),
        senha.value,
      );

    alert("Conta criada!");

    await redirecionarUsuario(user);
  } catch (erro) {
    console.error(
      "Erro ao cadastrar:",
      erro,
    );

    alert(
      erro.message ||
      "Não foi possível criar a conta.",
    );

    btnCadastro.disabled = false;

    btnCadastro.textContent =
      "Criar conta";
  }
};

// ========================================
// LOGIN COM E-MAIL
// ========================================

btnLogin.onclick = async () => {
  try {
    btnLogin.disabled = true;

    btnLogin.textContent =
      "Entrando...";

    const resultado =
      await login(
        email.value.trim(),
        senha.value,
      );

    await redirecionarUsuario(
      resultado.user,
    );
  } catch (erro) {
    console.error(
      "Erro no login:",
      erro,
    );

    alert(
      erro.message ||
      "Não foi possível entrar.",
    );

    btnLogin.disabled = false;

    btnLogin.textContent =
      "Entrar";
  }
};

// ========================================
// LOGIN COM GOOGLE
// ========================================

btnGoogle.onclick = async () => {
  try {
    btnGoogle.disabled = true;

    btnGoogle.textContent =
      "Abrindo Google...";

    const resultado =
      await loginComGoogle();

    /*
      No celular, o login usa redirecionamento.

      Nesse caso, resultado será null porque
      o navegador sairá da página atual.

      Quando o usuário voltar do Google,
      processarLoginGoogle() concluirá o login.
    */
    if (!resultado?.user) {
      return;
    }

    /*
      No computador, o login por popup retorna
      o usuário imediatamente.
    */
    await salvarUsuarioGoogle(
      resultado.user,
    );

    await redirecionarUsuario(
      resultado.user,
    );
  } catch (erro) {
    console.error(
      "Erro no login com Google:",
      erro,
    );

    alert(
      erro.message ||
      "Não foi possível entrar com Google.",
    );

    btnGoogle.disabled = false;

    btnGoogle.textContent =
      "Entrar com Google";
  }
};
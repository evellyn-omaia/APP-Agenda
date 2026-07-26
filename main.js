import {
  cadastrar,
  getUsuarioAutenticado,
  login,
  loginComGoogle,
  processarLoginGoogle,
  salvarUsuarioGoogle,
} from "./firebaseAuth.js";

// ========================================
// ELEMENTOS
// ========================================

const email = document.getElementById("email");
const senha = document.getElementById("senha");
const btnCadastro = document.getElementById("btnCadastro");
const btnLogin = document.getElementById("btnLogin");
const btnGoogle = document.getElementById("btnGoogle");
const btnMostrarSenha = document.getElementById("toggleSenha");
const iconeMostrarSenha = document.getElementById("iconeMostrarSenha");
const iconeOcultarSenha = document.getElementById("iconeOcultarSenha");

let redirecionando = false;
let processandoLogin = false;

function definirBotoesDesabilitados(desabilitados) {
  btnLogin.disabled = desabilitados;
  btnCadastro.disabled = desabilitados;
  btnGoogle.disabled = desabilitados;
}

function validarCredenciais() {
  const emailInformado = email.value.trim();
  const senhaInformada = senha.value;

  if (!emailInformado) {
    throw new Error("Digite seu e-mail.");
  }

  if (!senhaInformada) {
    throw new Error("Digite sua senha.");
  }

  return {
    email: emailInformado,
    senha: senhaInformada,
  };
}

function mensagemErroAuth(erro) {
  const mensagens = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/missing-password": "Digite sua senha.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet e tente novamente.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes da conclusão do login.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Permita pop-ups para este site.",
    "auth/unauthorized-domain": "O domínio deste site não está autorizado no Firebase Authentication.",
    "auth/operation-not-allowed": "Este tipo de login não está habilitado no Firebase.",
    "auth/cancelled-popup-request": "Já existe uma tentativa de login com Google em andamento.",
  };

  return mensagens[erro?.code]
    || erro?.message
    || "Não foi possível concluir a autenticação.";
}

async function redirecionarUsuario(user) {
  if (!user || redirecionando) {
    return;
  }

  redirecionando = true;
  definirBotoesDesabilitados(true);

  // Confirma que a sessão e o token estão disponíveis antes da navegação.
  await user.getIdToken();

  window.location.replace("./selecionarAgenda.html");
}

// ========================================
// MOSTRAR / OCULTAR SENHA
// ========================================

btnMostrarSenha.addEventListener("click", () => {
  const senhaEstaOculta = senha.type === "password";

  senha.type = senhaEstaOculta
    ? "text"
    : "password";

  iconeMostrarSenha.classList.toggle("oculto", senhaEstaOculta);
  iconeOcultarSenha.classList.toggle("oculto", !senhaEstaOculta);

  const novoRotulo = senhaEstaOculta
    ? "Ocultar senha"
    : "Mostrar senha";

  btnMostrarSenha.setAttribute("aria-label", novoRotulo);
  btnMostrarSenha.title = novoRotulo;

  senha.focus();

  const finalDoTexto = senha.value.length;
  senha.setSelectionRange(finalDoTexto, finalDoTexto);
});

// ========================================
// CADASTRO
// ========================================

btnCadastro.addEventListener("click", async () => {
  if (processandoLogin) return;

  const textoOriginal = btnCadastro.textContent;

  try {
    processandoLogin = true;
    definirBotoesDesabilitados(true);
    btnCadastro.textContent = "Criando conta...";

    const credenciais = validarCredenciais();
    const user = await cadastrar(credenciais.email, credenciais.senha);

    await redirecionarUsuario(user);
  } catch (erro) {
    console.error("Erro ao cadastrar:", erro);
    alert(mensagemErroAuth(erro));

    processandoLogin = false;
    definirBotoesDesabilitados(false);
    btnCadastro.textContent = textoOriginal;
  }
});

// ========================================
// LOGIN COM E-MAIL
// ========================================

btnLogin.addEventListener("click", async () => {
  if (processandoLogin) return;

  const textoOriginal = btnLogin.textContent;

  try {
    processandoLogin = true;
    definirBotoesDesabilitados(true);
    btnLogin.textContent = "Entrando...";

    const credenciais = validarCredenciais();
    const resultado = await login(credenciais.email, credenciais.senha);

    await redirecionarUsuario(resultado.user);
  } catch (erro) {
    console.error("Erro no login:", erro);
    alert(mensagemErroAuth(erro));

    processandoLogin = false;
    definirBotoesDesabilitados(false);
    btnLogin.textContent = textoOriginal;
  }
});

// Permite enviar o login pelo teclado do celular ou computador.
senha.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    btnLogin.click();
  }
});

// ========================================
// LOGIN COM GOOGLE
// ========================================

btnGoogle.addEventListener("click", async () => {
  if (processandoLogin) return;

  const textoOriginal = btnGoogle.textContent;

  try {
    processandoLogin = true;
    definirBotoesDesabilitados(true);
    btnGoogle.textContent = "Abrindo Google...";

    const resultado = await loginComGoogle();

    /*
      O listener global que redirecionava automaticamente foi removido.
      Assim, o usuário do Google é salvo no Realtime Database antes da
      troca de página, sem corrida entre duas operações assíncronas.
    */
    await salvarUsuarioGoogle(resultado.user);
    await redirecionarUsuario(resultado.user);
  } catch (erro) {
    console.error("Erro no login com Google:", erro);
    alert(mensagemErroAuth(erro));

    processandoLogin = false;
    definirBotoesDesabilitados(false);
    btnGoogle.textContent = textoOriginal;
  }
});

// ========================================
// INICIALIZAÇÃO DA TELA
// ========================================

async function iniciarTelaLogin() {
  definirBotoesDesabilitados(true);

  try {
    /*
      Conclui uma tentativa antiga de signInWithRedirect(), caso o aparelho
      ainda esteja retornando de uma versão anterior do projeto.
    */
    const usuarioDoRedirect = await processarLoginGoogle();

    if (usuarioDoRedirect) {
      await redirecionarUsuario(usuarioDoRedirect);
      return;
    }

    const usuarioAtual = await getUsuarioAutenticado();

    if (usuarioAtual) {
      await redirecionarUsuario(usuarioAtual);
      return;
    }
  } catch (erro) {
    console.error("Erro ao restaurar a sessão:", erro);
  }

  processandoLogin = false;
  definirBotoesDesabilitados(false);
}

await iniciarTelaLogin();

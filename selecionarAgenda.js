import {
  criarAgenda,
  entrarNaAgenda,
  getAgendasDoUsuario,
  getAgendaPorId,
  selecionarAgenda,
  getUsuarioAutenticado,
  auth,
} from "./firebaseAuth.js";

// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const listaAgendas =
  document.getElementById("listaAgendas");

const mensagemSemAgendas =
  document.getElementById("mensagemSemAgendas");

const btnCriar =
  document.getElementById("btnCriar");

const btnEntrar =
  document.getElementById("btnEntrar");

const inputCodigo =
  document.getElementById("codigo");

const inputNomeAgenda =
  document.getElementById("nomeAgenda");

// ========================================
// VERIFICAR SE O USUÁRIO ESTÁ LOGADO
// ========================================

async function iniciarTelaSelecao() {
  /*
    Aguarda o Firebase restaurar completamente a sessão persistida.
    A página só decide redirecionar depois desse processo terminar.
  */
  const user = await getUsuarioAutenticado();

  if (!user) {
    window.location.replace("./index.html");
    return;
  }

  try {
    /*
      Mesmo que o usuário já tenha uma agenda atual, ele permanece nesta
      tela para escolher qual agenda deseja acessar.
    */
    await carregarAgendasDoUsuario(user.uid);
  } catch (error) {
    console.error("Erro ao iniciar a seleção de agendas:", error);
  }
}

// ========================================
// CARREGAR TODAS AS AGENDAS DO USUÁRIO
// ========================================

async function carregarAgendasDoUsuario(uid) {
  listaAgendas.innerHTML = "";

  try {
    /*
      Busca a lista salva em:

      usuarios/UID/agendas
    */
    const agendasUsuario =
      await getAgendasDoUsuario(uid);

    /*
      Transforma o objeto em uma lista de códigos.

      Exemplo:

      {
        ABC123: { role: "admin" },
        XYZ789: { role: "membro" }
      }

      vira:

      ["ABC123", "XYZ789"]
    */
    const agendaIds =
      Object.keys(agendasUsuario || {});

    if (agendaIds.length === 0) {
      mensagemSemAgendas.style.display = "block";
      return;
    }

    mensagemSemAgendas.style.display = "none";

    /*
      Para cada agenda vinculada ao usuário,
      buscamos os dados completos da agenda.
    */
    for (const agendaId of agendaIds) {
      const vinculoUsuario =
        agendasUsuario[agendaId];

      const agenda =
        await getAgendaPorId(agendaId);

      /*
        Se o vínculo existe no usuário,
        mas a agenda já foi excluída,
        ela não será mostrada.
      */
      if (!agenda) {
        continue;
      }

      criarCardAgenda(
        uid,
        agendaId,
        agenda,
        vinculoUsuario,
      );
    }
  } catch (error) {
    console.error(
      "Erro ao carregar agendas:",
      error,
    );

    alert(
      "Não foi possível carregar suas agendas.",
    );
  }
}

// ========================================
// CRIAR O CARD VISUAL DE CADA AGENDA
// ========================================

function criarCardAgenda(
  uid,
  agendaId,
  agenda,
  vinculoUsuario,
) {
  const card =
    document.createElement("button");

  card.type = "button";
  card.className = "card-agenda";

  const informacoes =
    document.createElement("div");

  informacoes.className =
    "card-agenda-info";

  const nomeAgenda =
    document.createElement("strong");

  nomeAgenda.textContent =
    agenda.nome || `Agenda ${agendaId}`;

  const codigoAgenda =
    document.createElement("span");

  codigoAgenda.textContent =
    `Código: ${agendaId}`;

  const cargoAgenda =
    document.createElement("span");

  cargoAgenda.className =
    "cargo-agenda";

  cargoAgenda.textContent =
    vinculoUsuario.role === "admin"
      ? "Administrador"
      : "Membro";

  const textoEntrar =
    document.createElement("span");

  textoEntrar.className =
    "entrar-agenda";

  textoEntrar.textContent =
    "Entrar";

  informacoes.appendChild(nomeAgenda);
  informacoes.appendChild(codigoAgenda);
  informacoes.appendChild(cargoAgenda);

  card.appendChild(informacoes);
  card.appendChild(textoEntrar);

  card.addEventListener(
    "click",
    async () => {
      await abrirAgenda(
        uid,
        agendaId,
        card,
      );
    },
  );

  listaAgendas.appendChild(card);
}

// ========================================
// SELECIONAR E ABRIR UMA AGENDA
// ========================================

async function abrirAgenda(
  uid,
  agendaId,
  botao,
) {
  const conteudoOriginal =
    botao.innerHTML;

  try {
    botao.disabled = true;

    botao.innerHTML = `
      <div class="card-agenda-info">
        <strong>Abrindo agenda...</strong>
      </div>
    `;

    /*
      Atualiza:

      usuarios/UID/agendaAtual
    */
    await selecionarAgenda(
      uid,
      agendaId,
    );

    window.location.href =
      "indexAgenda.html";
  } catch (error) {
    console.error(
      "Erro ao abrir agenda:",
      error,
    );

    alert(
      error.message ||
      "Não foi possível abrir a agenda.",
    );

    botao.disabled = false;
    botao.innerHTML =
      conteudoOriginal;
  }
}

// ========================================
// CRIAR UMA NOVA AGENDA
// ========================================

btnCriar.addEventListener(
  "click",
  async () => {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "Usuário não autenticado.",
        );
      }

      const nomeAgenda =
        inputNomeAgenda.value.trim() ||
        "Minha Agenda";

      btnCriar.disabled = true;
      btnCriar.textContent =
        "Criando...";

      /*
        criarAgenda agora recebe:

        1. UID do usuário
        2. nome da agenda
      */
      const codigo =
        await criarAgenda(
          user.uid,
          nomeAgenda,
        );

      alert(
        `Agenda criada! Código: ${codigo}`,
      );

      window.location.href =
        "indexAgenda.html";
    } catch (error) {
      console.error(
        "Erro ao criar agenda:",
        error,
      );

      alert(
        error.message ||
        "Não foi possível criar a agenda.",
      );

      btnCriar.disabled = false;
      btnCriar.textContent =
        "Criar agenda";
    }
  },
);

// ========================================
// ENTRAR EM UMA AGENDA PELO CÓDIGO
// ========================================

btnEntrar.addEventListener(
  "click",
  async () => {
    try {
      const codigo =
        inputCodigo.value
          .trim()
          .toUpperCase();

      if (!codigo) {
        alert(
          "Digite o código da agenda.",
        );

        inputCodigo.focus();
        return;
      }

      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "Usuário não autenticado.",
        );
      }

      btnEntrar.disabled = true;
      btnEntrar.textContent =
        "Entrando...";

      await entrarNaAgenda(
        user.uid,
        codigo,
      );

      alert(
        "Você entrou na agenda!",
      );

      window.location.href =
        "indexAgenda.html";
    } catch (error) {
      console.error(
        "Erro ao entrar na agenda:",
        error,
      );

      alert(
        error.message ||
        "Não foi possível entrar na agenda.",
      );

      btnEntrar.disabled = false;
      btnEntrar.textContent =
        "Entrar em uma agenda";
    }
  },
);

await iniciarTelaSelecao();

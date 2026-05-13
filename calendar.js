import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getUserData,
  criarAgenda,
  entrarNaAgenda,
  logout,
} from "./firebaseAuth.js";

import {
  getDatabase,
  ref,
  push,
  get,
  update,
  set,
  remove,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

import { db } from "./firebaseDB.js";

// LISTENER DE LOGIN
const auth = getAuth();

let role = null;
let agendaId = null;
let currentUser = null;

let notificacoes = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const data = await getUserData(user.uid);

  if (!data?.agendaId) {
    window.location.href = "selecionarAgenda.html";
    return;
  }

  currentUser = user;
  role = data.role;
  agendaId = data.agendaId;

  carregarCalendario();
});

const conteudo = document.getElementById("conteudo");

let dataAtual = new Date();
let filtroBusca = "";

const temaSalvo = localStorage.getItem("tema");

if (temaSalvo === "dark") {
  document.body.classList.add("dark");
}

// ================== NOTIFICAÇÕES ================

function addNotificacao(texto) {
  notificacoes.unshift({
    texto,
    data: new Date(),
  });

  renderNotificacoes();
}

function renderNotificacoes() {
  const el = document.getElementById("notificacoes");
  if (!el) return;

  el.innerHTML = notificacoes
    .slice(0, 5)
    .map(
      (n) => `
      <div class="notificacao">
        ${n.texto}
      </div>
    `,
    )
    .join("");
}

// ================== CALENDÁRIO ================

function carregarCalendario() {
  conteudo.innerHTML = `
  <header class="header">
  <div id="notificacoes"></div>
    <h1 id="mesAno" class="mes-clickavel"></h1>
    
    <div>
      <button id="prevMes">◀</button>
      <button id="proxMes">▶</button>
    </div>
  </header>

  <div id="calendario" class="calendario"></div>

  <!-- 👇 NOVA ÁREA -->
  <div id="previewDia" class="preview-dia">
    <p>Selecione um dia para ver os eventos</p>
  </div>
`;

  renderizarCalendario();
  document.getElementById("mesAno").onclick = () => {
    abrirSeletorData();
  };
  ativarBusca();

  document.getElementById("prevMes").onclick = () => {
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    renderizarCalendario();
  };

  document.getElementById("proxMes").onclick = () => {
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    renderizarCalendario();
  };
}
async function renderizarCalendario() {
  const calendario = document.getElementById("calendario");
  const mesAno = document.getElementById("mesAno");

  calendario.innerHTML = "";

  // dias da semana
  const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  diasSemana.forEach((dia, index) => {
    let div = document.createElement("div");
    div.classList.add("dia-semana");

    if (index >= 5) {
      div.style.color = "red";
    }

    div.innerText = dia;
    calendario.appendChild(div);
  });

  let ano = dataAtual.getFullYear();
  let mes = dataAtual.getMonth();

  let eventosPorDia;

  if (filtroBusca) {
    eventosPorDia = await buscarEventosFiltrados(ano, mes, filtroBusca);
  } else {
    const diasComEvento = await buscarDiasComEventos(ano, mes);
    eventosPorDia = {};

    diasComEvento.forEach((dia) => {
      eventosPorDia[dia] = true;
    });
  }

  let primeiroDia = new Date(ano, mes, 1).getDay();
  primeiroDia = primeiroDia === 0 ? 6 : primeiroDia - 1;

  let ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const nomesMeses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  mesAno.innerText = `${nomesMeses[mes]} ${ano}`;

  // espaços vazios
  for (let i = 0; i < primeiroDia; i++) {
    let vazio = document.createElement("div");
    calendario.appendChild(vazio);
  }

  let hoje = new Date();

  // dias
  for (let dia = 1; dia <= ultimoDia; dia++) {
    let divDia = document.createElement("div");
    divDia.classList.add("dia");
    divDia.innerText = dia;

    if (eventosPorDia[dia]) {
      divDia.classList.add("tem-evento");

      // destaque quando estiver buscando
      if (filtroBusca) {
        divDia.style.background = "#FFD54F";
      }
    }

    if (
      dia === hoje.getDate() &&
      mes === hoje.getMonth() &&
      ano === hoje.getFullYear()
    ) {
      divDia.classList.add("hoje");
    }

    let clickTimer = null;

    divDia.onclick = () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;

        // 👉 DUPLO CLIQUE
        abrirDia(dia, mes, ano);
      } else {
        clickTimer = setTimeout(() => {
          // 👉 CLIQUE SIMPLES
          mostrarPreviewDia(dia, mes, ano);
          clickTimer = null;
        }, 250);
      }
    };

    calendario.appendChild(divDia);
  }
}

function abrirSeletorData() {
  const modal = document.createElement("div");

  modal.classList.add("modal");

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const anoAtual = new Date().getFullYear();

  let optionsAno = "";

  for (let ano = 1; ano <= 9999; ano++) {
    optionsAno += `
      <option
        value="${ano}"
        ${ano === dataAtual.getFullYear() ? "selected" : ""}
      >
        ${ano}
      </option>
    `;
  }

  modal.innerHTML = `

    <div class="modal-conteudo mini-calendario-modal">

      <h2>Selecionar data</h2>

      <select id="selectMes">

        ${meses
          .map(
            (m, i) => `
          <option
            value="${i}"
            ${i === dataAtual.getMonth() ? "selected" : ""}
          >
            ${m}
          </option>
        `,
          )
          .join("")}

      </select>

      <select id="selectAno">
        ${optionsAno}
      </select>

      <div class="botoes-mini-calendario">

        <button id="cancelarMiniCalendario"
          class="btn-secundario-ui">
          Cancelar
        </button>

        <button id="confirmarMiniCalendario"
          class="btn-primary-ui">
          Abrir
        </button>

      </div>

    </div>

  `;

  document.body.appendChild(modal);

  document.getElementById("cancelarMiniCalendario").onclick = () => {
    modal.remove();
  };

  document.getElementById("confirmarMiniCalendario").onclick = () => {
    const mes = Number(document.getElementById("selectMes").value);

    const ano = Number(document.getElementById("selectAno").value);

    dataAtual = new Date(ano, mes, 1);

    modal.remove();

    renderizarCalendario();
  };
}
// ================== DIA (HORAS) ==================
async function buscarEventosDoDia(ano, mes, dia) {
  if (!agendaId) {
    alert("Você não está em nenhuma agenda!");
    return [];
  }

  const dataKey = `${ano}-${mes}-${dia}`;
  const snapshot = await get(ref(db, `agendas/${agendaId}/eventos/${dataKey}`));

  if (!snapshot.exists()) return [];

  const dados = snapshot.val();

  return Object.entries(dados).map(([id, valor]) => ({
    id,
    ...valor,
  }));
}

async function abrirDia(dia, mes, ano) {
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2>${dia}/${mes + 1}/${ano}</h2>
    </header>

    <div id="horas"></div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  const horasDiv = document.getElementById("horas");

  const eventos = await buscarEventosDoDia(ano, mes, dia);

  for (let i = 0; i < 24; i++) {
    let hora = document.createElement("div");
    hora.classList.add("hora");

    const eventosDaHora = eventos.filter((e) => Number(e.hora) === i);

    hora.innerHTML = `<strong>${i}:00</strong>`;

    eventosDaHora.forEach((e) => {
      const eventoDiv = document.createElement("div");
      eventoDiv.classList.add("evento");

      eventoDiv.innerHTML = `
  <div class="topo-evento">

    <div>
      <strong>${e.nome}</strong>
      <p>${e.descricao || ""}</p>
    </div>

    ${e.favorito ? `<span class="favorito-fixo">⭐</span>` : ""}

  </div>

  ${
    role === "admin"
      ? `
      <div class="acoes-evento">

  <button class="editar-evento">
    <span>Editar</span>
  
  </button>

  <button class="excluir-evento">
    <span>Excluir</span>
    
  </button>

</div>
    `
      : ""
  }
`;

      const estrela = eventoDiv.querySelector(".estrela");

      if (estrela) {
        estrela.addEventListener("click", async (ev) => {
          ev.stopPropagation();

          await toggleFavorito(e, ano, mes, dia);
        });
      }
      if (e.tag === "urgente") {
        eventoDiv.style.borderLeft = "5px solid red";
      }

      if (e.tag === "trabalho") {
        eventoDiv.style.borderLeft = "5px solid #3b82f6";
      }

      if (e.tag === "escola") {
        eventoDiv.style.borderLeft = "5px solid #22c55e";
      }

      if (e.tag === "pessoal") {
        eventoDiv.style.borderLeft = "5px solid #a855f7";
      }
      if (e.anexo) {
        eventoDiv.innerHTML += `
    <br>
    <img
      src="${e.anexo}"
      width="80"
      style="
        margin-top:10px;
        border-radius:10px;
      "
    >
  `;
      }
      hora.appendChild(eventoDiv);

      const editarBtn = eventoDiv.querySelector(".editar-evento");
      const excluirBtn = eventoDiv.querySelector(".excluir-evento");

      if (editarBtn) {
        editarBtn.onclick = (ev) => {
          ev.stopPropagation();

          editarEvento(e, dia, mes, ano);
        };
      }

      if (excluirBtn) {
        excluirBtn.onclick = async (ev) => {
          ev.stopPropagation();

          const confirmar = confirm("Excluir evento?");

          if (!confirmar) return;

          const dataKey = `${ano}-${mes}-${dia}`;

          await moverParaLixeira("evento", {
            ...e,
            dataKey,
          });

          await remove(
            ref(db, `agendas/${agendaId}/eventos/${dataKey}/${e.id}`),
          );

          abrirDia(dia, mes, ano);
        };
      }
    });

    hora.onclick = () => adicionarEvento(dia, mes, ano, i);

    horasDiv.appendChild(hora);
  }
}

// ================== EVENTO (TEMPORÁRIO) ==================
async function toggleFavorito(evento, ano, mes, dia) {
  try {
    const dataKey = `${ano}-${mes}-${dia}`;

    const novoValor = !evento.favorito;

    await update(
      ref(db, `agendas/${agendaId}/eventos/${dataKey}/${evento.id}`),
      {
        favorito: novoValor,
      },
    );

    evento.favorito = novoValor;

    await abrirDia(dia, mes, ano);
  } catch (erro) {
    console.error(erro);
    alert("Erro ao favoritar evento");
  }
}

function editarEvento(evento, dia, mes, ano) {
  const modal = document.createElement("div");

  modal.classList.add("modal");

  modal.innerHTML = `
    <div class="modal-conteudo">

      <h2>Editar Evento</h2>

      <input
        type="text"
        id="editNome"
        value="${evento.nome}"
      >

      <textarea id="editDescricao">${evento.descricao || ""}</textarea>

      <label>
        <input
          type="checkbox"
          id="editFavorito"
          ${evento.favorito ? "checked" : ""}
        >
        ⭐ Favorito
      </label>

      <button id="salvarEdicao">
        Salvar
      </button>

      <button id="cancelarEdicao">
        Cancelar
      </button>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("cancelarEdicao").onclick = () => {
    modal.remove();
  };

  document.getElementById("salvarEdicao").onclick = async () => {
    const dataKey = `${ano}-${mes}-${dia}`;

    await update(
      ref(db, `agendas/${agendaId}/eventos/${dataKey}/${evento.id}`),
      {
        nome: document.getElementById("editNome").value,

        descricao: document.getElementById("editDescricao").value,

        favorito: document.getElementById("editFavorito").checked,
      },
    );

    modal.remove();

    abrirDia(dia, mes, ano);
  };
}

function adicionarEvento(dia, mes, ano, hora) {
  if (!agendaId) {
    alert("Entre em uma agenda primeiro!");
    return;
  }
  if (!currentUser) {
    alert("Faça login!");
    return;
  }

  if (role !== "admin") {
    alert("Você não tem permissão para criar eventos!");
    return;
  }
  const modal = document.createElement("div");
  modal.classList.add("modal");

  modal.innerHTML = `
    <div class="modal-conteudo">
      <h2>Novo Evento</h2>

      <label>Nome do evento:</label>
      <input type="text" id="nomeEvento" placeholder="Digite o nome">

      <label>Descrição:</label>
      <textarea id="descricaoEvento" placeholder="Digite a descrição"></textarea>
      <label>Categoria:</label>

<select id="tagEvento">
  <option value="trabalho">Trabalho</option>
  <option value="escola">Escola</option>
  <option value="pessoal">Pessoal</option>
  <option value="urgente">Urgente</option>
</select>
<label class="favorito-label">
  <input type="checkbox" id="favoritoEvento">
  ⭐ Favoritar evento
</label>
<label>Anexo:</label>
<input type="file" id="anexoEvento">


      <div class="botoes">
        <button id="salvarEvento">Salvar</button>
        <button id="fecharModal">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // fechar
  document.getElementById("fecharModal").onclick = () => {
    modal.remove();
  };

  // salvar
  document.getElementById("salvarEvento").onclick = async () => {
    const nome = document.getElementById("nomeEvento").value;
    const descricao = document.getElementById("descricaoEvento").value;

    const file = document.getElementById("anexoEvento").files[0];

    let anexo = null;

    if (file) {
      anexo = await new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          resolve(e.target.result);
        };

        reader.readAsDataURL(file);
      });
    }

    if (!nome) {
      alert("Digite um nome!");
      return;
    }

    const dataKey = `${ano}-${mes}-${dia}`;
    const eventosRef = ref(db, `agendas/${agendaId}/eventos/${dataKey}`);

    await push(eventosRef, {
      nome: nome,
      descricao: descricao,
      hora: hora,

      favorito: document.getElementById("favoritoEvento").checked,

      anexo: anexo,

      tag: document.getElementById("tagEvento").value,
    });
    addNotificacao(` Novo evento: ${nome}`);
    modal.remove();
    abrirDia(dia, mes, ano); // atualiza
  };
}

async function buscarDiasComEventos(ano, mes) {
  if (!agendaId) return [];
  const snapshot = await get(ref(db, `agendas/${agendaId}/eventos`));

  if (!snapshot.exists()) return [];

  const dados = snapshot.val();

  let diasComEvento = [];

  for (let data in dados) {
    let [anoDB, mesDB, diaDB] = data.split("-").map(Number);

    if (anoDB === ano && mesDB === mes) {
      diasComEvento.push(diaDB);
    }
  }

  return diasComEvento;
}

async function mostrarPreviewDia(dia, mes, ano) {
  const preview = document.getElementById("previewDia");

  const eventos = await buscarEventosDoDia(ano, mes, dia);

  if (eventos.length === 0) {
    preview.innerHTML = `<p>Nenhum evento para ${dia}/${mes + 1}</p>`;
    return;
  }

  preview.innerHTML = `
  <h3>📅 ${dia}/${mes + 1}/${ano}</h3>

  ${eventos
    .map(
      (e) => `
    <div class="preview-evento-dia">
      <strong>${e.hora}:00</strong> - ${e.nome}
      <br>
      <small>${e.descricao || ""}</small>
    </div>
  `,
    )
    .join("")}
`;
}

// ================== MENU ==================

const btnHome = document.getElementById("home");

if (btnHome) {
  btnHome.onclick = () => {
    filtroBusca = "";

    const input = document.getElementById("inputBusca");

    if (input) {
      input.value = "";
    }

    // volta para mês atual
    dataAtual = new Date();

    carregarCalendario();
  };
}

// ================== BUSCA ==================

async function buscarEventosFiltrados(ano, mes, termo) {
  if (!agendaId) return {};
  const snapshot = await get(ref(db, `agendas/${agendaId}/eventos`));

  if (!snapshot.exists()) return {};

  const dados = snapshot.val();
  let eventosFiltrados = {};

  for (let data in dados) {
    let [anoDB, mesDB, diaDB] = data.split("-").map(Number);

    if (anoDB === ano && mesDB === mes) {
      let eventos = Object.values(dados[data]);

      let filtrados = eventos.filter(
        (e) =>
          e.nome.toLowerCase().includes(termo.toLowerCase()) ||
          String(diaDB).includes(termo),
      );

      if (filtrados.length > 0) {
        eventosFiltrados[diaDB] = true;
      }
    }
  }

  return eventosFiltrados;
}

function ativarBusca() {
  const buscarBtn = document.getElementById("buscar");
  const inputBusca = document.getElementById("inputBusca");

  if (!buscarBtn || !inputBusca) return;

  buscarBtn.onclick = () => {
    if (inputBusca.style.display === "none") {
      inputBusca.style.display = "block";
      inputBusca.focus();
    } else {
      inputBusca.style.display = "none";
      inputBusca.value = "";
      filtroBusca = "";
      renderizarCalendario();
    }
  };

  let timer;

  inputBusca.oninput = (e) => {
    clearTimeout(timer);

    timer = setTimeout(async () => {
      const termo = e.target.value.trim();
      filtroBusca = termo;

      if (termo !== "") {
        const encontrou = await irParaMesDoEvento(termo);

        if (!encontrou) {
          renderizarCalendario();
        }
      } else {
        renderizarCalendario();
      }
    }, 300);
  };
}

async function irParaMesDoEvento(termo) {
  if (!agendaId) return false;

  const snapshot = await get(ref(db, `agendas/${agendaId}/eventos`));

  if (!snapshot.exists()) return false;

  const dados = snapshot.val();

  termo = termo.toLowerCase().trim();

  for (let data in dados) {
    let [anoDB, mesDB, diaDB] = data.split("-").map(Number);

    let eventos = Object.values(dados[data]);

    let encontrou = eventos.some((e) => {
      return (
        (e.nome && e.nome.toLowerCase().includes(termo)) ||
        String(diaDB).includes(termo)
      );
    });

    if (encontrou) {
      // muda automaticamente para o mês do evento
      dataAtual = new Date(anoDB, mesDB, 1);

      renderizarCalendario();

      return true;
    }
  }

  return false;
}

// ================== PERFIL ==================

function abrirPerfil() {
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2>Perfil</h2>
    </header>

    <div class="perfil-container">

      <label class="foto-perfil">
        <input type="file" id="inputFoto" accept="image/*" hidden>
        <img id="previewFoto" src="https://via.placeholder.com/100" />
      </label>

      <p id="emailUsuario" style="margin-top:10px;"></p>

${
  role === "admin"
    ? `
      <div class="codigo-admin">

  <div class="codigo-topo">
    <div>
      <span class="codigo-label">
        Código da agenda
      </span>

      <h3 class="codigo-texto">
        ${agendaId}
      </h3>
    </div>

    <button id="copiarCodigoAgenda" class="btn-copiar-codigo">
      Copiar
    </button>
  </div>

</div>

      <button id="excluirAgenda" class="btn-danger">
        Excluir Agenda
      </button>
    `
    : `
      <button id="sairAgenda" class="btn-danger">
        Sair da Agenda
      </button>
    `
}

<button id="mudarConta">Mudar de conta</button>
<button id="logout">Deslogar</button>

    </div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  const inputFoto = document.getElementById("inputFoto");
  const preview = document.getElementById("previewFoto");
  const emailEl = document.getElementById("emailUsuario");

  let imagemBase64 = null;

  // =========================
  // CARREGAR DADOS DO FIREBASE
  // =========================
  async function carregarPerfil() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await get(ref(db, "usuarios/" + user.uid));

    if (!snap.exists()) return;

    const data = snap.val();

    // EMAIL COMO "NOME"
    emailEl.textContent = data.email || user.email;

    // FOTO SALVA
    if (data.foto) {
      preview.src = data.foto;
    }
  }

  carregarPerfil();

  // =========================
  // CONVERTER IMAGEM PARA BASE64
  // =========================
  inputFoto.onchange = () => {
    const file = inputFoto.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      imagemBase64 = e.target.result;
      preview.src = imagemBase64;
    };

    reader.readAsDataURL(file);
  };

  // =========================
  // SALVAR FOTO NO FIREBASE
  // =========================
  preview.onclick = () => inputFoto.click();

  inputFoto.onchange = async () => {
    const file = inputFoto.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      imagemBase64 = e.target.result;

      preview.src = imagemBase64;

      const user = auth.currentUser;

      if (!user) return;

      await update(ref(db, "usuarios/" + user.uid), {
        foto: imagemBase64,
      });

      if (agendaId) {
        await update(ref(db, `agendas/${agendaId}/membros/${user.uid}`), {
          foto: imagemBase64,
        });
      }

      alert("Foto atualizada!");
    };

    reader.readAsDataURL(file);
  };

  // =========================
  // TROCAR CONTA
  // =========================
  document.getElementById("mudarConta").onclick = () => {
    window.location.href = "login.html";
  };

  // =========================
  // SAIR DA AGENDA (MEMBRO)
  // =========================

  const sairAgendaBtn = document.getElementById("sairAgenda");

  if (sairAgendaBtn) {
    sairAgendaBtn.onclick = async () => {
      const confirmar = confirm(
        "Deseja realmente sair da agenda?\n\nVocê perderá suas informações da agenda.",
      );

      if (!confirmar) return;

      try {
        // remove membro da agenda
        await remove(ref(db, `agendas/${agendaId}/membros/${currentUser.uid}`));

        // remove tarefas
        await remove(ref(db, `tarefas/${currentUser.uid}/${agendaId}`));

        // remove anotações
        await remove(ref(db, `anotacoes/${currentUser.uid}/${agendaId}`));

        // remove agenda do usuário
        await update(ref(db, `usuarios/${currentUser.uid}`), {
          agendaId: null,
          role: null,
        });

        alert("Você saiu da agenda!");

        window.location.href = "selecionarAgenda.html";
      } catch (erro) {
        console.error(erro);

        alert("Erro ao sair da agenda");
      }
    };
  }

  // =========================
  // EXCLUIR AGENDA (ADMIN)
  // =========================

  const excluirAgendaBtn = document.getElementById("excluirAgenda");

  if (excluirAgendaBtn) {
    excluirAgendaBtn.onclick = async () => {
      const confirmar = confirm(
        "Deseja realmente excluir esta agenda?\n\nTODOS os dados serão apagados.",
      );

      if (!confirmar) return;

      try {
        // pega membros
        const membrosSnap = await get(ref(db, `agendas/${agendaId}/membros`));

        if (membrosSnap.exists()) {
          const membros = membrosSnap.val();

          // limpa usuários
          for (let uid in membros) {
            await update(ref(db, `usuarios/${uid}`), {
              agendaId: null,
              role: null,
            });

            // remove tarefas
            await remove(ref(db, `tarefas/${uid}/${agendaId}`));

            // remove anotações
            await remove(ref(db, `anotacoes/${uid}/${agendaId}`));
          }
        }

        // remove agenda inteira
        await remove(ref(db, `agendas/${agendaId}`));

        alert("Agenda excluída!");

        window.location.href = "selecionarAgenda.html";
      } catch (erro) {
        console.error(erro);

        alert("Erro ao excluir agenda");
      }
    };
  }

  // =========================
  // COPIAR CÓDIGO
  // =========================

  const copiarCodigoBtn = document.getElementById("copiarCodigoAgenda");

  if (copiarCodigoBtn) {
    copiarCodigoBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(agendaId);

        copiarCodigoBtn.innerText = "Copiado";

        copiarCodigoBtn.style.opacity = "0.85";

        setTimeout(() => {
          copiarCodigoBtn.innerText = "Copiar";

          copiarCodigoBtn.style.opacity = "1";
        }, 1800);
      } catch (erro) {
        console.error(erro);

        alert("Erro ao copiar código");
      }
    };
  }

  // =========================
  // LOGOUT
  // =========================
  document.getElementById("logout").onclick = async () => {
    await logout();
    window.location.href = "index.html";
  };
}

// ================== ANOTAÇÕES ==================

const btnAnotacoes = document.getElementById("anotacoes");

if (btnAnotacoes) {
  btnAnotacoes.onclick = abrirAnotacoes;
}

const btnPerfil = document.getElementById("perfil");

const btnMembros = document.getElementById("membros");

if (btnMembros) {
  btnMembros.onclick = abrirMembros;
}

const btnAtividades = document.getElementById("atividades");

if (btnAtividades) {
  btnAtividades.onclick = abrirAtividades;
}

if (btnPerfil) {
  btnPerfil.onclick = abrirPerfil;
}

const btnLixeira = document.getElementById("lixeira");

if (btnLixeira) {
  btnLixeira.onclick = abrirLixeira;
}

function abrirAnotacoes() {
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2 style="margin:auto;">Anotações</h2>
    </header>

    <div class="area-anotacoes">
      <div id="listaAnotacoes" class="lista-anotacoes"></div>

      <div class="nova-anotacao" id="novaAnotacao">
        +
      </div>
    </div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  renderizarAnotacoes();

  document.getElementById("novaAnotacao").onclick = () => {
    abrirEditor("", "");
  };
}

// ABRIR EDITOR (tipo página)
function abrirEditor(titulo = "", texto = "", id = null) {
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <input id="tituloAnotacao" value="${titulo}" placeholder="Sem título">
      <button id="salvarAnotacao">Salvar</button>
    </header>

    <div class="editor-full">
      <textarea id="textoAnotacao">${texto}</textarea>
    </div>
  `;

  document.getElementById("voltar").onclick = abrirAnotacoes;

  document.getElementById("salvarAnotacao").onclick = async () => {
    const titulo = document.getElementById("tituloAnotacao").value;
    const texto = document.getElementById("textoAnotacao").value;

    if (!texto.trim()) {
      alert("Escreva algo!");
      return;
    }

    if (id) {
      // EDITAR
      await update(ref(db, `anotacoes/${currentUser.uid}/${agendaId}/${id}`), {
        titulo: titulo || "Sem título",
        texto: texto,
      });
    } else {
      // NOVO
      await push(ref(db, `anotacoes/${currentUser.uid}/${agendaId}`), {
        titulo: titulo || "Sem título",
        texto: texto,
        data: Date.now(),
      });
    }

    abrirAnotacoes();
  };
}
// MOSTRAR ANOTAÇÕES
async function renderizarAnotacoes() {
  if (!agendaId) return;
  const lista = document.getElementById("listaAnotacoes");
  lista.innerHTML = "";

  const snapshot = await get(
    ref(db, `anotacoes/${currentUser.uid}/${agendaId}`),
  );

  if (!snapshot.exists()) return;

  const dados = snapshot.val();

  Object.entries(dados).forEach(([id, anotacao]) => {
    const item = document.createElement("div");
    item.classList.add("card-anotacao"); // usa o CSS que você já tem

    item.innerHTML = `
  <div class="topo-card-ui">

    <div>
      <strong>
        ${anotacao.titulo || "Sem título"}
      </strong>

      <p>
        ${(anotacao.texto || "").substring(0, 60)}...
      </p>
    </div>

    <button class="btn-excluir-mini">
      Excluir
    </button>

  </div>
`;

    item.querySelector(".btn-excluir-mini").onclick = async (ev) => {
      ev.stopPropagation();

      const confirmar = confirm("Excluir anotação?");

      if (!confirmar) return;

      await moverParaLixeira("anotacao", {
        ...anotacao,
        id,
        uid: currentUser.uid,
      });

      await remove(ref(db, `anotacoes/${currentUser.uid}/${agendaId}/${id}`));

      renderizarAnotacoes();
    };

    // 👇 AGORA CORRETO (3 parâmetros)
    item.onclick = () =>
      abrirEditor(anotacao.titulo || "", anotacao.texto || "", id);

    lista.appendChild(item);
  });
}

// ================== PRINCIPAIS EVENTOS ==================
const btnPrincipais = document.getElementById("principais");

if (btnPrincipais) {
  btnPrincipais.onclick = abrirPrincipaisEventos;
}

async function abrirPrincipaisEventos() {
  if (!agendaId) {
    alert("Você não está em nenhuma agenda!");
    return;
  }
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2 style="margin:auto;">Principais Eventos ⭐</h2>
    </header>

    <div id="listaPrincipais" class="lista-principais"></div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  const lista = document.getElementById("listaPrincipais");

  const snapshot = await get(ref(db, `agendas/${agendaId}/eventos`));

  if (!snapshot.exists()) {
    lista.innerHTML = "<p>Nenhum evento favoritado</p>";
    return;
  }

  const dados = snapshot.val();
  let encontrados = [];

  // percorre tudo
  for (let data in dados) {
    let [ano, mes, dia] = data.split("-");

    const eventos = dados[data];

    Object.entries(eventos).forEach(([id, e]) => {
      if (e.favorito === true) {
        encontrados.push({
          id,
          ...e,

          dia,
          mes,
          ano,

          dataFormatada: `${dia}/${Number(mes) + 1}/${ano}`,
        });
      }
    });
  }

  if (encontrados.length === 0) {
    lista.innerHTML = "<p>Nenhum favorito ainda ⭐</p>";
    return;
  }

  // renderiza
  encontrados.forEach((e) => {
    const card = document.createElement("div");
    card.classList.add("card-principal");

    card.innerHTML = `
  <h3>${e.nome}</h3>

  <p class="data-card-principal">
    ${e.dataFormatada}
  </p>

  <span class="hora-card-principal">
    ${e.hora}:00
  </span>
`;

    card.onclick = () => {
      abrirDetalhePrincipalEvento(e);
    };

    lista.appendChild(card);
  });
}

function abrirDetalhePrincipalEvento(evento) {
  const modal = document.createElement("div");

  modal.classList.add("modal");

  modal.innerHTML = `
    <div class="modal-conteudo modal-evento-detalhe">

      <h2>${evento.nome}</h2>

      <div class="info-evento-detalhe">

        <div class="linha-info">
          <strong>Data</strong>
          <span>${evento.dataFormatada}</span>
        </div>

        <div class="linha-info">
          <strong>Horário</strong>
          <span>${evento.hora}:00</span>
        </div>

        <div class="linha-info">
          <strong>Categoria</strong>
          <span>${evento.tag || "Sem categoria"}</span>
        </div>

      </div>

      <div class="descricao-evento-detalhe">
        ${evento.descricao || "Sem descrição"}
      </div>

      ${
        evento.anexo
          ? `
          <img
            src="${evento.anexo}"
            class="imagem-evento-detalhe"
          >
        `
          : ""
      }

      <div class="acoes-evento-detalhe">

        <button id="irEventoCalendario"
          class="btn-primary-ui">
          Abrir no calendário
        </button>

        <button id="fecharDetalheEvento"
          class="btn-secundario-ui">
          Fechar
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("fecharDetalheEvento").onclick = () => {
    modal.remove();
  };

  document.getElementById("irEventoCalendario").onclick = async () => {
    modal.remove();

    dataAtual = new Date(Number(evento.ano), Number(evento.mes), 1);

    await abrirDia(Number(evento.dia), Number(evento.mes), Number(evento.ano));
  };
}
// ================== LISTA DE TAREFAS ==================
const btnTarefas = document.getElementById("tarefas");

if (btnTarefas) {
  btnTarefas.onclick = abrirTarefas;
}

async function abrirTarefas() {
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2 style="margin:auto;">Lista de Tarefas</h2>
    </header>

    <div class="area-anotacoes">
      <div id="listaTarefas" class="lista-anotacoes"></div>

      <div class="nova-anotacao" id="novaTarefa">
        +
      </div>
    </div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  renderizarListasTarefas();

  document.getElementById("novaTarefa").onclick = () => {
    abrirEditorTarefa();
  };
}

function abrirEditorTarefa(lista = [], id = null) {
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2 style="margin:auto;">Nova Lista</h2>
      <button id="salvarLista">Salvar</button>
    </header>

    <div class="editor-tarefa">
      <div id="itensLista"></div>

      <button id="addItem">+ Adicionar tarefa</button>
    </div>
  `;

  document.getElementById("voltar").onclick = abrirTarefas;

  const container = document.getElementById("itensLista");

  function criarItem(texto = "", concluido = false) {
    const div = document.createElement("div");
    div.classList.add("item-tarefa");

    div.innerHTML = `

  <input type="checkbox" ${concluido ? "checked" : ""}>

  <input
    type="text"
    value="${texto}"
    placeholder="Digite a tarefa..."
  >

  <span class="estrela-tarefa">⭐</span>

`;

    const checkbox = div.querySelector("input[type='checkbox']");
    const input = div.querySelector("input[type='text']");

    function atualizarVisual() {
      if (checkbox.checked) {
        input.classList.add("concluido");
      } else {
        input.classList.remove("concluido");
      }
    }

    checkbox.onchange = atualizarVisual;
    atualizarVisual();

    container.appendChild(div);
  }

  // carregar existentes
  lista.forEach((item) => criarItem(item.texto, item.concluido));

  document.getElementById("addItem").onclick = () => criarItem();

  document.getElementById("salvarLista").onclick = async () => {
    const itens = [];

    document.querySelectorAll(".item-tarefa").forEach((div) => {
      const checkbox = div.querySelector("input[type='checkbox']");
      const input = div.querySelector("input[type='text']");

      if (input.value.trim()) {
        itens.push({
          texto: input.value,
          concluido: checkbox.checked,
        });
      }
    });

    if (itens.length === 0) {
      alert("Adicione pelo menos uma tarefa!");
      return;
    }

    if (id) {
      await update(ref(db, `tarefas/${currentUser.uid}/${agendaId}/${id}`), {
        itens: itens,
      });
    } else {
      await push(ref(db, `tarefas/${currentUser.uid}/${agendaId}`), {
        itens: itens,
        data: Date.now(),
      });
    }

    abrirTarefas();
  };
}

async function renderizarListasTarefas() {
  if (!agendaId) return;
  const lista = document.getElementById("listaTarefas");
  lista.innerHTML = "";

  const snapshot = await get(ref(db, `tarefas/${currentUser.uid}/${agendaId}`));

  if (!snapshot.exists()) return;

  const dados = snapshot.val();

  Object.entries(dados).forEach(([id, listaTarefa]) => {
    const card = document.createElement("div");
    card.classList.add("card-anotacao");

    const total = listaTarefa.itens.length;
    const feitas = listaTarefa.itens.filter((i) => i.concluido).length;

    card.innerHTML = `
  <div class="topo-card-ui">

    <div>
      <strong>Lista</strong>

      <p>
        ${feitas}/${total}
        concluídas
      </p>
    </div>

    <button class="btn-excluir-mini">
      Excluir
    </button>

  </div>
`;

    card.querySelector(".btn-excluir-mini").onclick = async (ev) => {
      ev.stopPropagation();

      const confirmar = confirm("Excluir lista?");

      if (!confirmar) return;

      await moverParaLixeira("tarefa", {
        ...listaTarefa,
        id,
        uid: currentUser.uid,
      });

      await remove(ref(db, `tarefas/${currentUser.uid}/${agendaId}/${id}`));

      renderizarListasTarefas();
    };

    card.onclick = () => abrirEditorTarefa(listaTarefa.itens, id);

    lista.appendChild(card);
  });
}

// ================== ATIVIDADE ==================

async function abrirAtividades() {
  const anoAtual = new Date().getFullYear();

  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>

      <div>
        <h2>Atividades</h2>
        <small>${anoAtual}</small>
      </div>
    </header>

    <div class="area-atividades">

      <div id="listaAtividades"></div>

      ${
        role === "admin"
          ? `
        <div class="nova-anotacao" id="novaAtividade">
          +
        </div>
      `
          : ""
      }

    </div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  if (role === "admin") {
    document.getElementById("novaAtividade").onclick = () =>
      abrirModalAtividade();
  }

  renderizarTodasAtividades();
}

// ==== Abrir mês ===
function abrirModalAtividade() {
  const modal = document.createElement("div");

  modal.classList.add("modal");

  modal.innerHTML = `
    <div class="modal-conteudo">

      <h2>Nova Atividade</h2>

      <input id="nomeAtv" placeholder="Nome">

      <input type="date" id="inicioAtv">

      <input type="date" id="prazoAtv">

      <select id="urgenciaAtv">
        <option value="baixa">Baixa</option>
        <option value="media">Média</option>
        <option value="alta">Alta</option>
      </select>

      <textarea id="descAtv"
        placeholder="Descrição"></textarea>

      <button id="salvarAtv">
        Salvar
      </button>

      <button id="fecharModal">
        Cancelar
      </button>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("fecharModal").onclick = () => modal.remove();

  document.getElementById("salvarAtv").onclick = async () => {
    const nome = document.getElementById("nomeAtv").value;

    const inicio = document.getElementById("inicioAtv").value;

    const prazo = document.getElementById("prazoAtv").value;

    const desc = document.getElementById("descAtv").value;

    const urgencia = document.getElementById("urgenciaAtv").value;

    if (!nome) {
      alert("Digite um nome");
      return;
    }

    const membrosSnap = await get(ref(db, `agendas/${agendaId}/membros`));

    let membros = {};

    if (membrosSnap.exists()) {
      const dados = membrosSnap.val();

      for (let uid in dados) {
        if (uid === currentUser.uid) continue;

        membros[uid] = {
          status: "pendente",
        };
      }
    }

    const data = new Date(prazo);

    const ano = data.getFullYear();
    const mes = data.getMonth();

    await push(ref(db, `agendas/${agendaId}/atividades/${ano}/${mes}`), {
      nome,
      inicio,
      prazo,
      desc,
      urgencia,
      concluida: false,
      membros,

      status: "a_fazer",
      responsavel: null,
    });

    modal.remove();

    renderizarTodasAtividades();
  };
}

function abrirEditarAtividade(atv, id, mes, ano) {
  const modal = document.createElement("div");

  modal.classList.add("modal");

  modal.innerHTML = `
    <div class="modal-conteudo">

      <h2>Editar Atividade</h2>

      <input id="editNomeAtv" value="${atv.nome}">

      <input
        type="date"
        id="editInicioAtv"
        value="${atv.inicio}"
      >

      <input
        type="date"
        id="editPrazoAtv"
        value="${atv.prazo}"
      >

      <select id="editUrgenciaAtv">
        <option value="baixa">Baixa</option>
        <option value="media">Média</option>
        <option value="alta">Alta</option>
      </select>

      <textarea id="editDescAtv">${atv.desc}</textarea>

      <button id="salvarEdicaoAtv">
        Salvar alterações
      </button>

      <button id="fecharEditAtv">
        Cancelar
      </button>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("editUrgenciaAtv").value = atv.urgencia;

  document.getElementById("fecharEditAtv").onclick = () => modal.remove();

  document.getElementById("salvarEdicaoAtv").onclick = async () => {
    await update(
      ref(db, `agendas/${agendaId}/atividades/${ano}/${mes}/${id}`),
      {
        nome: document.getElementById("editNomeAtv").value,

        inicio: document.getElementById("editInicioAtv").value,

        prazo: document.getElementById("editPrazoAtv").value,

        urgencia: document.getElementById("editUrgenciaAtv").value,

        desc: document.getElementById("editDescAtv").value,
      },
    );

    modal.remove();

    renderizarTodasAtividades();
  };
}

async function renderizarTodasAtividades() {
  const lista = document.getElementById("listaAtividades");

  lista.innerHTML = `
    <div class="kanban">

      <div class="coluna" id="col-a-fazer">
        <h3>A fazer</h3>
      </div>

      <div class="coluna" id="col-andamento">
        <h3>Em andamento</h3>
      </div>

      <div class="coluna" id="col-concluido">
        <h3>Concluído</h3>
      </div>

    </div>
  `;

  const snapshot = await get(ref(db, `agendas/${agendaId}/atividades`));

  if (!snapshot.exists()) return;

  const dados = snapshot.val();

  for (let ano in dados) {
    for (let mes in dados[ano]) {
      for (let id in dados[ano][mes]) {
        const atv = dados[ano][mes][id];

        const card = document.createElement("div");
        card.classList.add("card-atividade");
        card.style.cursor = "pointer";

        card.innerHTML = `
          <strong>${atv.nome}</strong>
          <p>${atv.desc || ""}</p>

          <small>${atv.urgencia}</small>

          ${atv.responsavel ? `<p>👤 Em andamento</p>` : `<p>👤 Livre</p>`}
        `;
        if (atv.responsavel === currentUser.uid) {
          card.style.border = "2px solid lime";
        }
        // =========================
        // CLICK (PEGAR ATIVIDADE)
        // =========================
        card.onclick = async () => {
          const refAtv = ref(
            db,
            `agendas/${agendaId}/atividades/${ano}/${mes}/${id}`,
          );

          const snap = await get(refAtv);
          const atual = snap.val();

          // 🔒 já está em andamento por outro usuário
          if (atual.responsavel && atual.responsavel !== currentUser.uid) {
            alert("Já está sendo feita por outra pessoa");
            return;
          }

          // 👇 PRIMEIRO CLICK = PEGA A ATIVIDADE
          if (!atual.responsavel) {
            await update(refAtv, {
              status: "em_andamento",
              responsavel: currentUser.uid,
            });
          }

          abrirDetalheAtividade(atv, id, mes, ano);
        };

        // =========================
        // COLOCAR NA COLUNA CERTA
        // =========================
        if (atv.status === "concluida") {
          document.getElementById("col-concluido").appendChild(card);
        } else if (atv.status === "em_andamento") {
          document.getElementById("col-andamento").appendChild(card);
        } else {
          document.getElementById("col-a-fazer").appendChild(card);
        }
      }
    }
  }
}

function abrirDetalheAtividade(atv, id, mes, ano) {
  const refAtv = ref(db, `agendas/${agendaId}/atividades/${ano}/${mes}/${id}`);

  const podeEditar = role === "admin" || atv.responsavel === currentUser.uid;

  const isAdmin = role === "admin";

  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2>${atv.nome}</h2>
    </header>

    <div class="detalhe-atividade">
      <p><strong>Início:</strong> ${atv.inicio}</p>
      <p><strong>Prazo:</strong> ${atv.prazo}</p>
      <p><strong>Urgência:</strong> ${atv.urgencia}</p>
      <p>${atv.desc}</p>

      <div id="statusAtividade"></div>

      ${!isAdmin ? `<button id="concluir">Marcar como concluída</button>` : ""}
    </div>
  `;

  document.getElementById("voltar").onclick = async () => {
    await abrirAtividades();
  };

  const statusDiv = document.getElementById("statusAtividade");

  // 👇 SOMENTE MEMBROS possuem status
  if (!isAdmin) {
    // marca como em execução
    update(
      ref(
        db,
        `agendas/${agendaId}/atividades/${ano}/${mes}/${id}/membros/${currentUser.uid}`,
      ),
      {
        status: "em_execucao",
      },
    );

    // concluída
    if (atv.membros?.[currentUser.uid]?.status === "concluida") {
      statusDiv.innerHTML = `
        <span style="color:lime;">
          ✅ Atividade concluída
        </span>
      `;
    }

    // botão concluir
    document.getElementById("concluir").onclick = async () => {
      await update(refAtv, {
        status: "concluida",
      });

      abrirAtividades();
    };
  }
}

//===================Código DA AGENDA ================

async function abrirCodigoAgenda() {
  if (!currentUser) {
    alert("Usuário não carregado!");
    return;
  }

  if (role !== "admin") {
    conteudo.innerHTML = `
      <p style="padding:20px;">Apenas o administrador pode ver o código da agenda.</p>
    `;
    return;
  }

  const data = await getUserData(currentUser.uid);
  const codigo = data?.agendaId;

  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2>Código da Agenda</h2>
    </header>

    <div style="padding:20px; text-align:center;">
      <h3>Seu código:</h3>
      <p style="font-size:22px; font-weight:bold;">${codigo || "Nenhum"}</p>

      <button id="copiarCodigo">Copiar código</button>
    </div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  document.getElementById("copiarCodigo").onclick = () => {
    if (codigo) {
      navigator.clipboard.writeText(codigo);
      alert("Código copiado!");
    }
  };
}
//============ EQUIPE =================

async function abrirMembros() {
  if (!agendaId) return;

  const membrosSnap = await get(ref(db, `agendas/${agendaId}/membros`));

  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">⬅</button>
      <h2>Membros</h2>
    </header>

    <div id="listaMembros"></div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  const lista = document.getElementById("listaMembros");

  if (!membrosSnap.exists()) {
    lista.innerHTML = "<p>Nenhum membro</p>";
    return;
  }

  const membros = membrosSnap.val();

  // pega atividades
  const atividadesSnap = await get(ref(db, `agendas/${agendaId}/atividades`));

  let atividades = {};

  if (atividadesSnap.exists()) {
    atividades = atividadesSnap.val();
  }

  // percorre membros
  for (let uid in membros) {
    if (uid === currentUser.uid && role === "admin") {
      continue;
    }

    const membro = membros[uid];

    let pendentes = 0;
    let andamento = 0;
    let concluidas = 0;

    let score = 0;

    // percorre atividades
    for (let ano in atividades) {
      for (let mes in atividades[ano]) {
        for (let atvId in atividades[ano][mes]) {
          const atv = atividades[ano][mes][atvId];

          const status = atv.membros?.[uid]?.status;

          const hoje = new Date();
          const prazo = atv.prazo ? new Date(atv.prazo) : null;

          // concluída
          if (status === "concluida") {
            concluidas++;
          }

          // passou prazo
          else if (prazo && hoje > prazo) {
            pendentes++;
          }

          // ainda executando
          else if (status === "em_execucao") {
            andamento++;
          }

          // nunca abriu
          else {
            pendentes++;
          }
        }
      }
    }

    score = concluidas * 5 + andamento * 2 - pendentes;
    const div = document.createElement("div");

    div.classList.add("card-membro");

    div.innerHTML = `

  <div class="topo-membro">

    <div class="member-info">

      <img
        src="${membro.foto || "https://i.imgur.com/placeholder.png"}"
        class="avatar"
      />

      <div class="dados-membro">
        <strong>
          ${membro.email || "Sem email"}
        </strong>

        <small>
          ${uid === currentUser.uid ? "Você" : "Membro"}
        </small>
      </div>

    </div>

   

  </div>

  ${
    role === "admin"
      ? `
      <div class="status-membro">

        <span class="status ok">
          ✅ ${concluidas} concluídas
        </span>

        <span class="status andamento">
          🟡 ${andamento} em execução
        </span>

        <span class="status pendente">
          ❌ ${pendentes} pendentes
        </span>

      </div>
    `
      : ""
  }
<div class="ranking">
  ⭐ Score: ${score}
</div>

${
  role === "admin" && uid !== currentUser.uid
    ? `
      <button class="btn-remover remover-membro">
        Remover membro
      </button>
    `
    : ""
}
`;

    // remover
    if (role === "admin" && uid !== currentUser.uid) {
      div.querySelector(".btn-remover").onclick = async () => {
        await remove(ref(db, `agendas/${agendaId}/membros/${uid}`));

        await update(ref(db, `usuarios/${uid}`), {
          agendaId: null,
        });

        abrirMembros();
      };
    }

    lista.appendChild(div);
  }
}

// ================== BOTÃO TEMA FLUTUANTE ==================

criarBotaoTema();

function criarBotaoTema() {
  const botao = document.createElement("button");

  botao.id = "toggleTema";

  atualizarIconeTema(botao);

  botao.onclick = () => {
    document.body.classList.toggle("dark");

    const modoAtual = document.body.classList.contains("dark")
      ? "dark"
      : "light";

    localStorage.setItem("tema", modoAtual);

    atualizarIconeTema(botao);
  };

  document.body.appendChild(botao);
}

function atualizarIconeTema(botao) {
  if (document.body.classList.contains("dark")) {
    // ☀
    botao.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="5"></circle>

        <path d="M12 1v2"></path>
        <path d="M12 21v2"></path>

        <path d="M4.22 4.22l1.42 1.42"></path>
        <path d="M18.36 18.36l1.42 1.42"></path>

        <path d="M1 12h2"></path>
        <path d="M21 12h2"></path>

        <path d="M4.22 19.78l1.42-1.42"></path>
        <path d="M18.36 5.64l1.42-1.42"></path>
      </svg>
    `;
  } else {
    // 🌙
    botao.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="
          M21 12.79A9 9 0 0 1
          11.21 3
          7 7 0 1 0
          21 12.79z
        "></path>
      </svg>
    `;
  }
}

async function moverParaLixeira(tipo, dados) {
  const idLixeira = crypto.randomUUID();

  await set(ref(db, `lixeira/${agendaId}/${idLixeira}`), {
    tipo,
    dados,
    deletadoEm: Date.now(),
    expiraEm: Date.now() + 10 * 24 * 60 * 60 * 1000,
  });
}

async function abrirLixeira() {
  conteudo.innerHTML = `
    <header class="header">
      <button id="voltar">Voltar</button>
      <h2>Lixeira</h2>
    </header>

    <div id="listaLixeira"></div>
  `;

  document.getElementById("voltar").onclick = carregarCalendario;

  const lista = document.getElementById("listaLixeira");

  const snapshot = await get(ref(db, `lixeira/${agendaId}`));

  if (!snapshot.exists()) {
    lista.innerHTML = "<p>Lixeira vazia</p>";

    return;
  }

  const dados = snapshot.val();

  for (let id in dados) {
    const item = dados[id];

    // APAGA AUTOMATICAMENTE
    if (Date.now() > item.expiraEm) {
      await remove(ref(db, `lixeira/${agendaId}/${id}`));

      continue;
    }

    const diasRestantes = Math.ceil(
      (item.expiraEm - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const div = document.createElement("div");

    div.classList.add("card-anotacao");

    div.innerHTML = `
      <strong>
        ${item.dados.nome || item.dados.titulo || "Item"}
      </strong>

      <p>
        Tipo: ${item.tipo}
      </p>

      <small>
        Excluído há expira em
        ${diasRestantes} dias
      </small>

      <div class="acoes-lixeira">

        <button class="restaurar-item">
          Restaurar
        </button>

        <button class="apagar-item">
          Excluir permanentemente
        </button>

      </div>
    `;

    // RESTAURAR
    div.querySelector(".restaurar-item").onclick = async () => {
      if (item.tipo === "evento") {
        await set(
          ref(
            db,
            `agendas/${agendaId}/eventos/${item.dados.dataKey}/${item.dados.id}`,
          ),
          item.dados,
        );
      }

      if (item.tipo === "anotacao") {
        await set(
          ref(db, `anotacoes/${item.dados.uid}/${agendaId}/${item.dados.id}`),
          item.dados,
        );
      }

      if (item.tipo === "tarefa") {
        await set(
          ref(db, `tarefas/${item.dados.uid}/${agendaId}/${item.dados.id}`),
          item.dados,
        );
      }

      await remove(ref(db, `lixeira/${agendaId}/${id}`));

      abrirLixeira();
    };

    // EXCLUIR DEFINITIVO
    div.querySelector(".apagar-item").onclick = async () => {
      const confirmar = confirm("Excluir permanentemente?");

      if (!confirmar) return;

      await remove(ref(db, `lixeira/${agendaId}/${id}`));

      abrirLixeira();
    };

    lista.appendChild(div);
  }
}

export { carregarCalendario };
// ================== START ==================

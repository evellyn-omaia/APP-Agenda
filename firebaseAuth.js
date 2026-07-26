import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  get,
  ref,
  remove,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

import {
  aguardarInicializacaoAuth,
  auth,
  db,
} from "./firebaseConfig.js";

export { auth, db };

// ========================
// CADASTRO
// ========================

export async function cadastrar(email, senha) {
  await aguardarInicializacaoAuth();

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    senha,
  );

  const user = userCredential.user;

  await set(ref(db, `usuarios/${user.uid}`), {
    email: user.email,
    nome: user.email?.split("@")[0] || "Usuário",
    foto: null,
    agendaAtual: null,
    agendas: {},
  });

  return user;
}

// ========================
// LOGIN COM E-MAIL
// ========================

export async function login(email, senha) {
  await aguardarInicializacaoAuth();

  const resultado = await signInWithEmailAndPassword(
    auth,
    email,
    senha,
  );

  // Garante que o token já está disponível antes de trocar de página.
  await resultado.user.getIdToken();

  return resultado;
}

// ========================
// LOGIN COM GOOGLE
// ========================

const provider =
  new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account",
});

export async function loginComGoogle() {
  /*
    Não existe nenhum await antes de signInWithPopup(). Isso preserva o gesto
    direto do clique/toque e evita que navegadores móveis bloqueiem a janela.

    A tela de login já aguarda aguardarInicializacaoAuth() antes de habilitar
    este botão, e initializeAuth() já nasce com a persistência configurada.
  */
  const resultado = await signInWithPopup(
    auth,
    provider,
  );

  await resultado.user.getIdToken();

  return resultado;
}

export async function processarLoginGoogle() {
  try {
    const resultado =
      await getRedirectResult(auth);

    if (!resultado?.user) {
      return null;
    }

    await salvarUsuarioGoogle(
      resultado.user,
    );

    await resultado.user.getIdToken();

    return resultado.user;
  } catch (erro) {
    console.error(
      "Erro ao concluir login com Google:",
      erro,
    );

    throw erro;
  }
}

// ========================
// ESTADO ATUAL DA AUTENTICAÇÃO
// ========================

export async function getUsuarioAutenticado() {
  return aguardarInicializacaoAuth();
}

// ========================
// LOGOUT
// ========================

export async function logout() {
  return signOut(auth);
}

// ========================
// PEGAR DADOS DO USUÁRIO
// ========================

export async function getUserData(uid) {
  const snapshot = await get(ref(db, `usuarios/${uid}`));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val();
}

// ========================
// PEGAR AGENDAS DO USUÁRIO
// ========================

export async function getAgendasDoUsuario(uid) {
  try {
    const usuarioRef = ref(
      db,
      `usuarios/${uid}`,
    );

    const usuarioSnapshot =
      await get(usuarioRef);

    if (!usuarioSnapshot.exists()) {
      return {};
    }

    const usuario =
      usuarioSnapshot.val();

    /*
      Formato novo já existente:

      usuarios/UID/agendas
    */
    if (
      usuario.agendas &&
      Object.keys(usuario.agendas).length > 0
    ) {
      return usuario.agendas;
    }

    /*
      Migração automática do formato antigo:

      agendaId
      role
    */
    if (usuario.agendaId) {
      const codigoAntigo =
        usuario.agendaId;

      const cargoAntigo =
        usuario.role === "admin"
          ? "admin"
          : "membro";

      const atualizacoes = {};

      atualizacoes[
        `usuarios/${uid}/agendaAtual`
      ] = codigoAntigo;

      atualizacoes[
        `usuarios/${uid}/agendas/${codigoAntigo}/role`
      ] = cargoAntigo;

      atualizacoes[
        `agendas/${codigoAntigo}/membros/${uid}/role`
      ] = cargoAntigo;

      await update(
        ref(db),
        atualizacoes,
      );

      return {
        [codigoAntigo]: {
          role: cargoAntigo,
        },
      };
    }

    return {};
  } catch (error) {
    console.error(
      "Erro ao buscar agendas do usuário:",
      error,
    );

    throw error;
  }
}

// ========================
// PEGAR DADOS DE UMA AGENDA
// ========================

export async function getAgendaPorId(agendaId) {
  const snapshot = await get(ref(db, `agendas/${agendaId}`));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: agendaId,
    ...snapshot.val(),
  };
}

// ========================
// SELECIONAR AGENDA ATUAL
// ========================

export async function selecionarAgenda(uid, agendaId) {
  const agendaDoUsuarioSnapshot = await get(
    ref(db, `usuarios/${uid}/agendas/${agendaId}`),
  );

  if (!agendaDoUsuarioSnapshot.exists()) {
    throw new Error("Você não faz parte desta agenda.");
  }

  const membroSnapshot = await get(
    ref(db, `agendas/${agendaId}/membros/${uid}`),
  );

  if (!membroSnapshot.exists()) {
    throw new Error("Você não está cadastrado como membro desta agenda.");
  }

  await update(ref(db, `usuarios/${uid}`), {
    agendaAtual: agendaId,
  });

  return {
    agendaId,
    role: membroSnapshot.val().role || "membro",
  };
}

// ========================
// SAIR DA AGENDA ATUAL
// SEM SAIR DA CONTA
// ========================

export async function limparAgendaAtual(uid) {
  await update(ref(db, `usuarios/${uid}`), {
    agendaAtual: null,
  });
}

// ========================
// VERIFICAR ADMINISTRADOR
// ========================

export async function isAdmin(uid, agendaId = null) {
  let idAgenda = agendaId;

  if (!idAgenda) {
    const usuarioSnapshot = await get(ref(db, `usuarios/${uid}`));

    if (!usuarioSnapshot.exists()) {
      return false;
    }

    idAgenda = usuarioSnapshot.val().agendaAtual;
  }

  if (!idAgenda) {
    return false;
  }

  const membroSnapshot = await get(
    ref(db, `agendas/${idAgenda}/membros/${uid}`),
  );

  if (!membroSnapshot.exists()) {
    return false;
  }

  return membroSnapshot.val().role === "admin";
}

// ========================
// GERAR CÓDIGO DA AGENDA
// ========================

async function gerarCodigoUnico() {
  let codigo;
  let existe = true;

  while (existe) {
    codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

    const snapshot = await get(ref(db, `agendas/${codigo}`));

    existe = snapshot.exists();
  }

  return codigo;
}

// ========================
// CRIAR AGENDA
// ========================

export async function criarAgenda(uid, nomeAgenda = "Minha Agenda") {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const codigo = await gerarCodigoUnico();

  const usuarioSnapshot = await get(ref(db, `usuarios/${uid}`));
  const usuarioData = usuarioSnapshot.exists()
    ? usuarioSnapshot.val()
    : {};

  const nomeUsuario =
    user.displayName ||
    usuarioData.nome ||
    user.email?.split("@")[0] ||
    "Usuário";

  const fotoUsuario =
    usuarioData.foto ||
    user.photoURL ||
    null;

  const atualizacoes = {};

  atualizacoes[`agendas/${codigo}`] = {
    nome: nomeAgenda.trim() || "Minha Agenda",
    codigo,
    admin: uid,
    criadaPor: uid,
    criadaEm: Date.now(),
    membros: {
      [uid]: {
        email: user.email || "Sem e-mail",
        nome: nomeUsuario,
        foto: fotoUsuario,
        role: "admin",
        entrouEm: Date.now(),
      },
    },
  };

  atualizacoes[`usuarios/${uid}/email`] =
    user.email || usuarioData.email || "";

  atualizacoes[`usuarios/${uid}/nome`] = nomeUsuario;
  atualizacoes[`usuarios/${uid}/foto`] = fotoUsuario;
  atualizacoes[`usuarios/${uid}/agendaAtual`] = codigo;

  atualizacoes[`usuarios/${uid}/agendas/${codigo}`] = {
    role: "admin",
    entrouEm: Date.now(),
  };

  await update(ref(db), atualizacoes);

  return codigo;
}

// ========================
// ENTRAR EM UMA AGENDA
// ========================

export async function entrarNaAgenda(uid, codigo) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const codigoFormatado = codigo.trim().toUpperCase();

  const agendaSnapshot = await get(
    ref(db, `agendas/${codigoFormatado}`),
  );

  if (!agendaSnapshot.exists()) {
    throw new Error("Código de agenda inválido.");
  }

  const usuarioSnapshot = await get(ref(db, `usuarios/${uid}`));

  const usuarioData = usuarioSnapshot.exists()
    ? usuarioSnapshot.val()
    : {};

  const membroExistenteSnapshot = await get(
    ref(db, `agendas/${codigoFormatado}/membros/${uid}`),
  );

  const membroExistente = membroExistenteSnapshot.exists()
    ? membroExistenteSnapshot.val()
    : null;

  const role = membroExistente?.role || "membro";

  const nomeUsuario =
    user.displayName ||
    usuarioData.nome ||
    user.email?.split("@")[0] ||
    "Usuário";

  const fotoUsuario =
    usuarioData.foto ||
    user.photoURL ||
    null;

  const atualizacoes = {};

  atualizacoes[
    `agendas/${codigoFormatado}/membros/${uid}`
  ] = {
    email: user.email || "Sem e-mail",
    nome: nomeUsuario,
    foto: fotoUsuario,
    role,
    entrouEm: membroExistente?.entrouEm || Date.now(),
  };

  atualizacoes[`usuarios/${uid}/email`] =
    user.email || usuarioData.email || "";

  atualizacoes[`usuarios/${uid}/nome`] = nomeUsuario;
  atualizacoes[`usuarios/${uid}/foto`] = fotoUsuario;
  atualizacoes[`usuarios/${uid}/agendaAtual`] = codigoFormatado;

  atualizacoes[
    `usuarios/${uid}/agendas/${codigoFormatado}`
  ] = {
    role,
    entrouEm:
      usuarioData.agendas?.[codigoFormatado]?.entrouEm ||
      Date.now(),
  };

  await update(ref(db), atualizacoes);

  return {
    agendaId: codigoFormatado,
    role,
  };
}

// ========================
// REMOVER UMA AGENDA DO USUÁRIO
// ========================

export async function removerAgendaDoUsuario(uid, agendaId) {
  const membroSnapshot = await get(
    ref(db, `agendas/${agendaId}/membros/${uid}`),
  );

  if (!membroSnapshot.exists()) {
    throw new Error("Você não faz parte desta agenda.");
  }

  if (membroSnapshot.val().role === "admin") {
    throw new Error(
      "O administrador não pode sair da agenda sem transferir a administração ou excluir a agenda.",
    );
  }

  const atualizacoes = {};

  atualizacoes[`agendas/${agendaId}/membros/${uid}`] = null;
  atualizacoes[`usuarios/${uid}/agendas/${agendaId}`] = null;

  const usuarioSnapshot = await get(ref(db, `usuarios/${uid}`));
  const usuarioData = usuarioSnapshot.val();

  if (usuarioData?.agendaAtual === agendaId) {
    atualizacoes[`usuarios/${uid}/agendaAtual`] = null;
  }

  await update(ref(db), atualizacoes);
}

// ========================
// SALVAR USUÁRIO GOOGLE
// ========================

export async function salvarUsuarioGoogle(user) {
  const snapshot = await get(ref(db, `usuarios/${user.uid}`));

  const email =
    user.email ||
    user.providerData?.[0]?.email ||
    "sem-email";

  if (!snapshot.exists()) {
    await set(ref(db, `usuarios/${user.uid}`), {
      email,
      nome: user.displayName || email.split("@")[0] || "Usuário",
      foto: user.photoURL || null,
      agendaAtual: null,
      agendas: {},
    });

    return;
  }

  const dadosAtuais = snapshot.val();

  await update(ref(db, `usuarios/${user.uid}`), {
    email,
    nome:
      user.displayName ||
      dadosAtuais.nome ||
      email.split("@")[0] ||
      "Usuário",
    foto:
      dadosAtuais.foto ||
      user.photoURL ||
      null,
  });
}
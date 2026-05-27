import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

// CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAxBIX4PPMmLthiUX67OA07BYtDRhkklOM",
  authDomain: "agenda-dois.firebaseapp.com",
  databaseURL: "https://agenda-dois-default-rtdb.firebaseio.com",
  projectId: "agenda-dois",
  storageBucket: "agenda-dois.firebasestorage.app",
  messagingSenderId: "400118550899",
  appId: "1:400118550899:web:71b79e181f1e25b64cb506",
};

// INIT
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

// ========================
// CADASTRO
// ========================
export async function cadastrar(email, senha) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    senha,
  );
  const user = userCredential.user;

  await set(ref(db, "usuarios/" + user.uid), {
    email: user.email,
    role: "viewer",
    agendaId: null,
  });

  return user;
}

// ========================
// LOGIN EMAIL
// ========================
export async function login(email, senha) {
  return await signInWithEmailAndPassword(auth, email, senha);
}

// ========================
// GOOGLE LOGIN
// ========================
const provider = new GoogleAuthProvider();

export function loginComGoogle() {
  return signInWithPopup(auth, provider);
}

// ========================
// LOGOUT
// ========================
export async function logout() {
  return signOut(auth);
}

// ========================
// PEGAR USUÁRIO
// (SEM ALTERAR DADOS!)
// ========================
export async function getUserData(uid) {
  const snapshot = await get(ref(db, "usuarios/" + uid));

  if (!snapshot.exists()) return null;

  return snapshot.val();
}

// ========================
// CHECAR ADMIN
// ========================
export async function isAdmin(uid) {
  const snapshot = await get(ref(db, "usuarios/" + uid));

  if (!snapshot.exists()) return false;

  return snapshot.val().role === "admin";
}

// ========================
// CRIAR AGENDA
// ========================
export async function criarAgenda(uid) {
  const user = auth.currentUser;

  if (!user) throw new Error("Usuário não autenticado");

  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

  await set(ref(db, `agendas/${codigo}`), {
    admin: uid,
    membros: {
      [uid]: {
        email: user.email || "Sem email",
        nome: user.displayName || user.email?.split("@")[0] || "Usuário",
        foto: user.photoURL || null,
        role: "admin",
      },
    },
  });

  await update(ref(db, `usuarios/${uid}`), {
  agendaId: codigo,
  role: "admin",
  foto: user.photoURL || null,
  nome: user.displayName || user.email?.split("@")[0] || "Usuário",
});

  return codigo;
}

// ========================
// ENTRAR NA AGENDA
// ========================
export async function entrarNaAgenda(uid, codigo) {
  const user = auth.currentUser;

  if (!user) throw new Error("Usuário não autenticado");

  const snapAgenda = await get(ref(db, `agendas/${codigo}`));

  if (!snapAgenda.exists()) {
    throw new Error("Código inválido");
  }

  const userSnap = await get(ref(db, `usuarios/${uid}`));
  const userData = userSnap.val();

  // adiciona como membro
  await set(ref(db, `agendas/${codigo}/membros/${uid}`), {
  email: user.email || "Sem email",
  nome: user.displayName || userData?.nome || user.email?.split("@")[0] || "Usuário",
  foto: userData?.foto || user.photoURL || null,
  role: "membro",
});

  // ATUALIZA USUÁRIO (IMPORTANTE: set evita dados parciais quebrados)
  await set(ref(db, `usuarios/${uid}`), {
    ...userData,
    agendaId: codigo,
    role: userData?.role === "admin" ? "admin" : "viewer",
  });
}

// ========================
// GOOGLE SAVE
// ========================
export async function salvarUsuarioGoogle(user) {
  const snapshot = await get(ref(db, "usuarios/" + user.uid));

  const email = user.email || user.providerData?.[0]?.email || "sem-email";

  if (!snapshot.exists()) {
    await set(ref(db, "usuarios/" + user.uid), {
      email,
      nome: user.displayName || "Sem nome",
      foto: user.photoURL || null,
      role: "viewer",
      agendaId: null,
    });
  }
}

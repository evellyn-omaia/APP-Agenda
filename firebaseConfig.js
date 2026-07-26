import {
  getApp,
  getApps,
  initializeApp,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getDatabase,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxBIX4PPMmLthiUX67OA07BYtDRhkklOM",
  authDomain: "agenda-dois.firebaseapp.com",
  databaseURL: "https://agenda-dois-default-rtdb.firebaseio.com",
  projectId: "agenda-dois",
  storageBucket: "agenda-dois.firebasestorage.app",
  messagingSenderId: "400118550899",
  appId: "1:400118550899:web:71b79e181f1e25b64cb506",
};

/*
  Existe apenas uma inicialização do Firebase em todo o projeto.
  Isso evita instâncias diferentes de Auth/Database e erros de ordem
  de carregamento entre firebaseAuth.js e firebaseDB.js.
*/
export const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

let authInstance;

try {
  /*
    A lista de persistências cria fallback para navegadores móveis:
    1. IndexedDB
    2. localStorage
    3. sessionStorage

    A autenticação já nasce configurada; não existe mais a corrida entre
    setPersistence() e signInWithEmailAndPassword().
  */
  authInstance = initializeAuth(app, {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
    ],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch (error) {
  /*
    Proteção para o caso de algum script antigo já ter inicializado Auth.
  */
  if (error?.code === "auth/already-initialized") {
    authInstance = getAuth(app);
  } else {
    throw error;
  }
}

export const auth = authInstance;
export const db = getDatabase(app);

export async function aguardarInicializacaoAuth() {
  await auth.authStateReady();
  return auth.currentUser;
}

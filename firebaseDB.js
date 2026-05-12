import { getApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getDatabase, ref, push, set, get, update }
from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxBIX4PPMmLthiUX67OA07BYtDRhkklOM",
  authDomain: "agenda-dois.firebaseapp.com",
  databaseURL: "https://agenda-dois-default-rtdb.firebaseio.com",
  projectId: "agenda-dois",
  storageBucket: "agenda-dois.firebasestorage.app",
  messagingSenderId: "400118550899",
  appId: "1:400118550899:web:71b79e181f1e25b64cb506"
};

const app = getApp();
const db = getDatabase(app);

export { db, ref, push, set, get, update };





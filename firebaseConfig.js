  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAxBIX4PPMmLthiUX67OA07BYtDRhkklOM",
    authDomain: "agenda-dois.firebaseapp.com",
    databaseURL: "https://agenda-dois-default-rtdb.firebaseio.com",
    projectId: "agenda-dois",
    storageBucket: "agenda-dois.firebasestorage.app",
    messagingSenderId: "400118550899",
    appId: "1:400118550899:web:71b79e181f1e25b64cb506"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
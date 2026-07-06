// AMR Portal Firebase 連線設定（免 npm 版本）
// 這個檔案會把 Firebase 掛到 window.AMRFirebase，讓原本 app.js 可以直接使用。
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCCBe5b_3jMHYSnwQwQr4r7uNdzm61PWBY",
    authDomain: "team-465.firebaseapp.com",
    projectId: "team-465",
    storageBucket: "team-465.firebasestorage.app",
    messagingSenderId: "1083534515383",
    appId: "1:1083534515383:web:c8c2262737d7024dc34132"
  };

  if (!window.firebase) {
    console.error("Firebase SDK 尚未載入，請確認 index.html 有載入 firebase-app-compat 與 firebase-firestore-compat。")
    window.AMRFirebase = { enabled: false };
    return;
  }

  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore(app);

  window.AMRFirebase = {
    enabled: true,
    app,
    db,
    dataDoc: db.collection("platform").doc("settings"),
    now: firebase.firestore.FieldValue.serverTimestamp
  };
})();

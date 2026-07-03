import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCBe5b_3jMHYSnwQwQr4r7uNdzm61PWBY",
  authDomain: "team-465.firebaseapp.com",
  projectId: "team-465",
  storageBucket: "team-465.firebasestorage.app",
  messagingSenderId: "1083534515383",
  appId: "1:1083534515383:web:b4f466e0ac36d42bc34132"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

export async function initFirebase() {
  await signInAnonymously(auth);
  return new Promise(resolve => onAuthStateChanged(auth, user => resolve(user)));
}

export function listenRecords(callback, onError) {
  return onSnapshot(collection(db, "team_scores"), snap => {
    const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    callback(rows);
  }, onError);
}

export function listenConfig(callback, onError) {
  return onSnapshot(doc(db, "platform", "settings"), snap => {
    callback(snap.exists() ? snap.data() : null);
  }, onError);
}

export function saveConfig(data) {
  return setDoc(doc(db, "platform", "settings"), data);
}

export function saveRecord(id, data) {
  return setDoc(doc(db, "team_scores", id), data);
}

export function removeRecord(id) {
  return deleteDoc(doc(db, "team_scores", id));
}

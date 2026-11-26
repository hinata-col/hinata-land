// Firebase 連線層：網站其他程式只透過這裡讀寫資料。
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider,
  linkWithPopup, signInWithCredential, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where,
  getDocs, addDoc, writeBatch, increment, deleteField, serverTimestamp, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ref = (path) => doc(db, ...path.split('/'));

export const fb = {
  // 帳號
  onUser(cb) {
    onAuthStateChanged(auth, (u) => {
      if (!u) { signInAnonymously(auth).catch((e) => cb(null, e)); return; }
      cb({ uid: u.uid, isAnon: u.isAnonymous, name: u.displayName || '' });
    });
  },
  // 回傳 { uid, isAnon, switched, oldUid }；switched 代表這個 Google 帳號以前登入過，換成那個帳號
  async googleLogin() {
    const provider = new GoogleAuthProvider();
    const cur = auth.currentUser;
    try {
      const res = await linkWithPopup(cur, provider);
      return { uid: res.user.uid, isAnon: false, switched: false };
    } catch (e) {
      if (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use') {
        const cred = GoogleAuthProvider.credentialFromError(e);
        const oldUid = cur.uid;
        const res = await signInWithCredential(auth, cred);
        return { uid: res.user.uid, isAnon: false, switched: true, oldUid };
      }
      throw e;
    }
  },
  logout() { return signOut(auth); },

  // 資料
  async get(path) { const s = await getDoc(ref(path)); return s.exists() ? Object.assign({ id: s.id }, s.data()) : null; },
  set(path, data, merge) { return setDoc(ref(path), data, merge ? { merge: true } : {}); },
  update(path, data) { return updateDoc(ref(path), data); },
  del(path) { return deleteDoc(ref(path)); },
  async add(coll, data) { const r = await addDoc(collection(db, coll), data); return r.id; },
  newId(coll) { return doc(collection(db, coll)).id; },
  async where(coll, field, value) {
    const s = await getDocs(query(collection(db, coll), where(field, '==', value)));
    return s.docs.map((d) => Object.assign({ id: d.id }, d.data()));
  },
  async batch(ops) {
    const b = writeBatch(db);
    ops.forEach((o) => {
      if (o.op === 'set') { b.set(ref(o.path), o.data, o.merge ? { merge: true } : {}); }
      else if (o.op === 'update') { b.update(ref(o.path), o.data); }
      else if (o.op === 'delete') { b.delete(ref(o.path)); }
    });
    return b.commit();
  },
  inc: (n) => increment(n),
  delField: () => deleteField(),
  now: () => serverTimestamp(),
  arrAdd: (v) => arrayUnion(v),
  arrDel: (v) => arrayRemove(v)
};

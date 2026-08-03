import { app } from "./firebase.js";

import {
getFirestore,
collection,
doc,
addDoc,
setDoc,
getDoc,
getDocs,
updateDoc,
deleteDoc,
query,
where,
orderBy,
limit,
runTransaction,
serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export const db = getFirestore(app);

export {
collection,
doc,
addDoc,
setDoc,
getDoc,
getDocs,
updateDoc,
deleteDoc,
query,
where,
orderBy,
limit,
runTransaction,
serverTimestamp
};
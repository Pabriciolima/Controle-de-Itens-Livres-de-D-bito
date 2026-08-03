import { app } from "./firebase.js";

import {
getAuth,
signInWithEmailAndPassword,
signOut,
onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

export const auth = getAuth(app);

export {
signInWithEmailAndPassword,
signOut,
onAuthStateChanged
};
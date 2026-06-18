import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyDIByMKfOBZky8Hoqmhvz05OLOBd7ePkmc",
    authDomain: "cinema-app-e1e53.firebaseapp.com",
    projectId: "cinema-app-e1e53",
    storageBucket: "cinema-app-e1e53.firebasestorage.app",
    messagingSenderId: "670717013403",
    appId: "1:670717013403:web:c1d06d4676366faf46053e"
};


export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
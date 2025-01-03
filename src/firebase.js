// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
//import { getFirestore } from "firebase/firestore";
import { getDatabase } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
 apiKey: "AIzaSyBIgWKE904al1DGYARgfxFjrmzwBjRlT3I",
  authDomain: "hostel-34e6a.firebaseapp.com",
  projectId: "hostel-34e6a",
  storageBucket: "hostel-34e6a.firebasestorage.app",
  messagingSenderId: "307307582358",
  appId: "1:307307582358:web:8a71a413663933bd38c3b7",
  measurementId: "G-8N9VEWS14W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
//export const db = getFirestore(app);
export const db=getDatabase(app);
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getDatabase} from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAck49dUUgA-jnqYOfrZEm--XseNfb3A1o",
  authDomain: "urbanflow-41ce2.firebaseapp.com",
  databaseURL: "https://urbanflow-41ce2-default-rtdb.firebaseio.com",
  projectId: "urbanflow-41ce2",
  storageBucket: "urbanflow-41ce2.firebasestorage.app",
  messagingSenderId: "706306888314",
  appId: "1:706306888314:web:e276be0c3e73572b6821c3",
  measurementId: "G-GE0S21S71T"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

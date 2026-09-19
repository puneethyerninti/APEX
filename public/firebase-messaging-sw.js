importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// NOTE: Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "apex-5b654.firebaseapp.com",
  projectId: "apex-5b654",
  storageBucket: "apex-5b654.firebasestorage.app",
  messagingSenderId: "1070526094287",
  appId: "1:1070526094287:web:4a4c292d1a197c824390ba"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.jpeg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

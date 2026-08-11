importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// NOTE: Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: "AIzaSyA1Tw9yR8kf89AJOOzlVcdt-lTgAgQyGKw",
  authDomain: "rivan-123.firebaseapp.com",
  projectId: "rivan-123",
  storageBucket: "rivan-123.firebasestorage.app",
  messagingSenderId: "91767917263",
  appId: "1:91767917263:web:508791b8795f8160c545ba"
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

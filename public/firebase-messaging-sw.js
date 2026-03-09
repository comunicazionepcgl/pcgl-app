// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configurazione Firebase (presa dal tuo firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyCTy06UxO-WIscvmkexn18W0Pbu1ge15Co",
  authDomain: "pcgl-volontari.firebaseapp.com",
  projectId: "pcgl-volontari",
  storageBucket: "pcgl-volontari.firebasestorage.app",
  messagingSenderId: "1016276758253",
  appId: "1:1016276758253:web:4da6e91c29cff7e66e66e4"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});

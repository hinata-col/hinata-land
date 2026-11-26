// ① Firebase 專案設定：到 Firebase 主控台 → 專案設定 → 一般 → 你的應用程式，複製 firebaseConfig 貼在這裡
export const firebaseConfig = {
  apiKey: 'AIzaSyA-XHQQ_hBWe7_Yj9GKr64wps32Aae3djw',
  authDomain: 'hinata-land.firebaseapp.com',
  projectId: 'hinata-land',
  storageBucket: 'hinata-land.firebasestorage.app',
  messagingSenderId: '100447300938',
  appId: '1:100447300938:web:deaa921783f583622b65b3'
};

// ② 開放中的園區：R＝平假名推、H＝在日向坂相會、M＝還沒結束！在日向坂相會
//    まだひな整理好之後，改成 ['R', 'H', 'M'] 就會出現在大門和選單
export const OPEN_AREAS = ['R', 'H'];

// ③ 網站網址（分享連結會用到）
export const SITE = 'https://hinata-land.pages.dev';

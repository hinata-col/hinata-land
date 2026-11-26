// ① Firebase 專案設定：到 Firebase 主控台 → 專案設定 → 一般 → 你的應用程式，複製 firebaseConfig 貼在這裡
export const firebaseConfig = {
  apiKey: 'PASTE_HERE',
  authDomain: 'PASTE_HERE',
  projectId: 'PASTE_HERE',
  storageBucket: 'PASTE_HERE',
  messagingSenderId: 'PASTE_HERE',
  appId: 'PASTE_HERE'
};

// ② 開放中的園區：R＝平假名推、H＝在日向坂相會、M＝還沒結束！在日向坂相會
//    まだひな整理好之後，改成 ['R', 'H', 'M'] 就會出現在大門和選單
export const OPEN_AREAS = ['R', 'H'];

// ③ 網站網址（分享連結會用到）
export const SITE = 'https://hinata-land.pages.dev';

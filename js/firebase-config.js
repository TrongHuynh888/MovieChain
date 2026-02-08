/**
 * ============================================
 * FIREBASE CONFIGURATION
 * ============================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyAXZV5e3Wug0BQAJZxDvSBuMWj75AwgdGc",
  authDomain: "webfilm-64f64.firebaseapp.com",
  // 👇 THÊM DÒNG NÀY (Dán link bạn vừa copy ở Bước 1 vào) 👇
  databaseURL:
    "https://webfilm-64f64-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "webfilm-64f64",
  storageBucket: "webfilm-64f64.firebasestorage.app",
  messagingSenderId: "140175603835",
  appId: "1:140175603835:web:fd0755fc11c327f118cade",
  measurementId: "G-0J6T4ZXJ94",
};

// ============================================
// KHỞI TẠO FIREBASE (CHẠY NGAY LẬP TỨC)
// ============================================

// Kiểm tra để tránh khởi tạo lại nếu đã có
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase Config Loaded & Initialized");
} else {
  firebase.app(); // Nếu đã có rồi thì dùng lại
  console.log("ℹ️ Firebase already initialized");
}

// Lưu ý: KHÔNG khai báo db hay auth ở đây.
// Việc đó để cho globals.js làm.

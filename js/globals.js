/**
 * GLOBAL VARIABLES
 * Khai báo biến dùng chung cho toàn bộ ứng dụng
 */

// 1. Khởi tạo Firebase (Đã config bên firebase-config.js)
let db = firebase.firestore();
let auth = firebase.auth();

// 2. Cấu hình Admin
const ADMIN_EMAIL = "huynhphutrong8223@gmail.com"; // Thay email admin của bạn vào đây
const ADMIN_UID = "";

// 3. Các biến trạng thái ứng dụng
let currentUser = null;
let isAdmin = false;
let currentMovieId = null;
let currentEpisode = 0;
let selectedRating = 0; // Biến lưu đánh giá sao

// 4. Cache dữ liệu
let allMovies = [];
let allCategories = [];
let allCountries = [];

console.log("✅ Globals Loaded");

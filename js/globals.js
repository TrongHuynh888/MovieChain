// 0. Lưu đường dẫn gốc của ứng dụng (Dùng cho Hash Routing)
// Đảm bảo APP_BASE_PATH luôn trỏ về file index.html hoặc root để hash không bị hỏng
let path = window.location.pathname;
if (path.includes('/watch/') || path.includes('/intro/')) {
    path = path.replace(/\/watch\/.*|\/intro\/.*/, "");
}
// Nếu không kết thúc bằng .html và không kết thúc bằng /, thêm /
if (!path.endsWith('.html') && !path.endsWith('/')) {
    path += '/';
}
window.APP_BASE_PATH = path;

// 1. Khởi tạo Firebase (Đã config bên firebase-config.js)
let db = firebase.firestore();
let auth = firebase.auth();

// 2. Cấu hình Admin
const ADMIN_EMAIL = "huynhphutrong8223@gmail.com"; // Thay email admin của bạn vào đây
const ADMIN_UID = "";

// 3. Các biến trạng thái ứng dụng
let currentUser = null;
let isAdmin = false;
let currentMovie = null; // Dữ liệu của phim đang xem
let currentMovieId = null;
let currentEpisode = 0;
let selectedRating = 0; // Biến lưu đánh giá sao

// 4. Cache dữ liệu
let allMovies = [];
let allCategories = [];
let allCountries = [];

console.log("✅ Globals Loaded");

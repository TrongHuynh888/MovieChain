/**
 * Render phim nổi bật
 */
function renderFeaturedMovies() {
  const container = document.getElementById("featuredMovies");
  if (!container) return;

  // Lấy 4 phim có rating cao nhất
  const featured = [...allMovies]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  container.innerHTML = featured
    .map((movie) => createMovieCard(movie))
    .join("");
}

/**
 * Render phim mới
 */
function renderNewMovies() {
  const container = document.getElementById("newMovies");
  if (!container) return;

  // Lấy 8 phim mới nhất
  const newMovies = [...allMovies]
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt);
      return dateB - dateA;
    })
    .slice(0, 8);

  container.innerHTML = newMovies
    .map((movie) => createMovieCard(movie))
    .join("");
}

/**
 * Render tất cả phim
 */
function renderAllMovies(movies = null) {
  const container = document.getElementById("allMovies");
  if (!container) return;

  const moviesToRender = movies || allMovies;

  if (moviesToRender.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">Không có phim nào</p>';
    return;
  }

  container.innerHTML = moviesToRender
    .map((movie) => createMovieCard(movie))
    .join("");
}

/**
 * Tạo HTML cho movie card (Phiên bản Netflix Pro - Nút to & Rõ chữ)
 * Tạo HTML cho movie card (Đã tích hợp nút Thích thông minh)
 */
/* ============================================================
   HÀM TẠO THẺ PHIM (ĐÃ FIX MOBILE TOUCH & GIỮ NGUYÊN TÍNH NĂNG CŨ)
   ============================================================ */
function createMovieCard(movie) {
  // 1. Logic xử lý nhãn Phần/Mùa (Giữ nguyên)
  const partHtml = movie.part
    ? `<span style="background: var(--accent-primary); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; text-transform: uppercase; vertical-align: middle;">${movie.part}</span>`
    : "";

  // 2. Logic kiểm tra yêu thích (Giữ nguyên)
  let isLiked = false;
  if (
    typeof currentUser !== "undefined" &&
    currentUser &&
    currentUser.favorites
  ) {
    isLiked = currentUser.favorites.includes(movie.id);
  }

  // Style cho nút thích (Giữ nguyên)
  const likeStyle = isLiked ? "color: #e50914; border-color: #e50914;" : "";
  const likeIcon = isLiked ? "fas fa-heart" : "far fa-heart";
  const likeClass = isLiked ? "liked" : "";

  // 3. XỬ LÝ DỮ LIỆU THẬT (Giữ nguyên)
  const matchScore = movie.rating
    ? Math.round(movie.rating * 10)
    : Math.floor(Math.random() * (99 - 85 + 1) + 85);

  const quality = movie.quality || "HD";
  const ageLimit = movie.ageLimit || "T13";
  const duration = movie.duration || "90 phút";

  // Link ảnh mặc định (Dark Theme)
  const fallbackImage =
    "https://placehold.co/300x450/2a2a3a/FFFFFF?text=NO+POSTER";

  return `
    <div class="movie-card-wrapper" id="movie-wrapper-${movie.id}">
        
        <div class="card movie-card-static" onclick="handleMovieClick(event, '${movie.id}')">
            <div class="card-image">
                <img src="${movie.posterUrl}" 
                     alt="${movie.title}" 
                     loading="lazy" 
                     onerror="this.onerror=null; this.src='${fallbackImage}';">
            </div>
            <div class="card-body">
                <h4 class="card-title">${movie.title}</h4>
                <div class="card-meta">
                    <span>${movie.year || "2026"}</span>
                    <span class="card-rating" style="color: var(--accent-secondary); font-weight: bold;">
                        ${movie.price ? movie.price + " CRO" : "Free"}
                    </span>
                </div>
            </div>
        </div>

        <div class="movie-popup-nfx" onclick="viewMovieDetail('${movie.id}')">
            
            <button class="mobile-close-popup" onclick="event.stopPropagation(); closeAllPopups()" 
                    style="display:none; position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.3); color:#fff; width:28px; height:28px; border-radius:50%; z-index:20; align-items:center; justify-content:center;">
                <i class="fas fa-times" style="font-size:14px;"></i>
            </button>

            <div class="popup-header-img">
                <img src="${movie.posterUrl}" 
                     alt="${movie.title}"
                     onerror="this.onerror=null; this.src='${fallbackImage}';">
            </div>
            <div class="popup-body">
                <div class="popup-actions">
                    <button class="btn-popup-play" onclick="event.stopPropagation(); viewMovieDetail('${movie.id}')">
                        <i class="fas fa-play"></i> Xem ngay
                    </button>
                    
                    <button class="btn-popup-icon ${likeClass} btn-like-${movie.id}" 
                            title="Thích" 
                            style="${likeStyle}"
                            onclick="event.stopPropagation(); toggleFavorite('${movie.id}')">
                        <i class="${likeIcon}"></i>
                    </button>
                    
                    <button class="btn-popup-icon ml-auto" title="Chi tiết" onclick="event.stopPropagation(); viewMovieDetail('${movie.id}')">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>

                <h3 class="popup-title-new">${movie.title} ${partHtml}</h3>
                
                <div class="popup-meta-row">
                    <span class="meta-match">${matchScore}% Phù hợp</span>
                    <span class="meta-age">${ageLimit}</span>
                    <span>${duration}</span>
                    <span class="meta-quality">${quality}</span>
                </div>

                <div class="popup-genres-row">
                    <span>${movie.category || "Phim mới"}</span>
                    <span class="dot">•</span>
                    <span>${movie.country || "Quốc tế"}</span>
                </div>
            </div>
        </div>
    </div>
  `;
}

/* ============================================================
   👇 CÁC HÀM HỖ TRỢ CLICK TRÊN MOBILE (Dán thêm vào cuối file home.js)
   ============================================================ */

function handleMovieClick(event, movieId) {
  // Nếu là màn hình PC (> 768px) -> Vào thẳng trang chi tiết
  if (window.innerWidth > 768) {
    viewMovieDetail(movieId);
    return;
  }

  // Nếu là Mobile:
  event.stopPropagation(); // Ngăn click lan ra ngoài

  // 1. Đóng popup khác đang mở
  closeAllPopups();

  // 2. Mở popup của phim này
  const wrapper = document.getElementById(`movie-wrapper-${movieId}`);
  if (wrapper) {
    wrapper.classList.add("active-mobile"); // Kích hoạt CSS hiển thị

    // Hiện nút đóng
    const closeBtn = wrapper.querySelector(".mobile-close-popup");
    if (closeBtn) closeBtn.style.display = "flex";
  }
}

function closeAllPopups() {
  document.querySelectorAll(".movie-card-wrapper").forEach((el) => {
    el.classList.remove("active-mobile");
    const closeBtn = el.querySelector(".mobile-close-popup");
    if (closeBtn) closeBtn.style.display = "none";
  });
}

// Tự động đóng popup khi bấm ra ngoài vùng đen (trên Mobile)
document.addEventListener("click", function (event) {
  if (window.innerWidth <= 768) {
    if (
      !event.target.closest(".movie-popup-nfx") &&
      !event.target.closest(".movie-card-static")
    ) {
      closeAllPopups();
    }
  }
});
/**
 * Search movies
 */
function searchMovies() {
  const query = document.getElementById("searchMovies").value.toLowerCase();
  filterMovies(query);
}
/**
 * Filter movies
 */
function filterMovies(searchQuery = null) {
  const query =
    searchQuery !== null
      ? searchQuery
      : document.getElementById("searchMovies")?.value.toLowerCase() || "";
  const category = document.getElementById("filterCategory")?.value || "";
  const country = document.getElementById("filterCountry")?.value || "";
  const year = document.getElementById("filterYear")?.value || "";

  let filtered = allMovies.filter((movie) => {
    const matchQuery = !query || movie.title.toLowerCase().includes(query);
    const matchCategory = !category || movie.category === category;
    const matchCountry = !country || movie.country === country;
    const matchYear = !year || movie.year == year;

    return matchQuery && matchCategory && matchCountry && matchYear;
  });

  renderAllMovies(filtered);
}
/**
 * Lọc phim theo Loại (Lẻ / Bộ)
 */
function filterByMovieType(type) {
  // 1. Chuyển sang trang danh sách phim
  showPage("movies");

  // 2. Cập nhật tiêu đề cho ngầu
  const titleMap = {
    single: "Danh sách Phim Lẻ",
    series: "Danh sách Phim Bộ",
  };
  document.querySelector("#moviesPage .section-title").textContent =
    titleMap[type] || "Tất cả Phim";

  // 3. Lọc danh sách
  const filtered = allMovies.filter((m) => m.type === type);

  // 4. Hiển thị ra màn hình
  renderAllMovies(filtered);

  // 5. Active menu (optional)
  // Nếu bạn muốn làm nút menu sáng lên thì cần thêm code xử lý class active ở đây
}
// ============================================
// LOGIC YÊU THÍCH & LỊCH SỬ (USER LIBRARY)
// ============================================
/**
 * Hàm xóa phim khỏi danh sách Yêu thích (Dành riêng cho Modal)
 */
async function removeFavoriteFromModal(movieId, btnElement) {
  // 1. Gọi hàm toggle cũ để xử lý logic xóa trong Database
  await toggleFavorite(movieId);

  // 2. Xử lý giao diện: Tìm cái thẻ chứa nút bấm và xóa nó đi
  const card = btnElement.closest(".card");

  if (card) {
    // Tạo hiệu ứng mờ dần và thu nhỏ
    card.style.transition = "all 0.3s ease";
    card.style.opacity = "0";
    card.style.transform = "scale(0.8)";

    // Đợi 0.3s cho hiệu ứng chạy xong rồi mới xóa hẳn khỏi HTML
    setTimeout(() => {
      card.remove();

      // Kiểm tra nếu xóa hết sạch phim thì hiện thông báo trống
      const container = document.getElementById("libraryList");
      if (container && container.children.length === 0) {
        container.innerHTML =
          '<p class="text-center text-muted">Bạn chưa thích phim nào.</p>';
      }
    }, 300);
  }
}
/**
 * Populate filter dropdowns
 */
function populateFilters() {
  // Categories
  const categoryFilter = document.getElementById("filterCategory");
  if (categoryFilter) {
    categoryFilter.innerHTML =
      '<option value="">Tất cả thể loại</option>' +
      allCategories
        .map((c) => `<option value="${c.name}">${c.name}</option>`)
        .join("");
  }

  // Countries
  const countryFilter = document.getElementById("filterCountry");
  if (countryFilter) {
    countryFilter.innerHTML =
      '<option value="">Tất cả quốc gia</option>' +
      allCountries
        .map((c) => `<option value="${c.name}">${c.name}</option>`)
        .join("");
  }

  // Years
  const yearFilter = document.getElementById("filterYear");
  if (yearFilter) {
    const years = [...new Set(allMovies.map((m) => m.year))].sort(
      (a, b) => b - a,
    );
    yearFilter.innerHTML =
      '<option value="">Tất cả năm</option>' +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");
  }
}
// ... (Code cũ giữ nguyên)

/**
 * ==========================================
 * BỔ SUNG: RENDER TRANG THỂ LOẠI
 * ==========================================
 */
/**
 * ==========================================
 * BỔ SUNG: RENDER TRANG THỂ LOẠI (GIAO DIỆN PRO)
 * ==========================================
 */
function renderCategoriesList() {
  const container = document.getElementById("categoriesList");
  if (!container) return;

  if (allCategories.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">Đang cập nhật thể loại...</p>';
    return;
  }

  // Danh sách các bộ màu Gradient đẹp (Tím, Xanh, Hồng, Cam...)
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Tím mộng mơ
    "linear-gradient(135deg, #FF3CAC 0%, #784BA0 50%, #2B86C5 100%)", // Cầu vồng tối
    "linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 52%, #2BFF88 90%)", // Neon sáng
    "linear-gradient(135deg, #F5576C 0%, #F093FB 100%)", // Hồng cam
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Xanh biển
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Xanh lá
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Vàng cam
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)", // Tím than
  ];

  // Icon tương ứng (nếu muốn mapping, ở đây để random cho đơn giản hoặc lấy icon mặc định)
  const defaultIcon = "fa-film";

  container.innerHTML = allCategories
    .map((cat, index) => {
      // Chọn màu xoay vòng
      const bgStyle = gradients[index % gradients.length];

      return `
        <div class="category-card-pro" 
             onclick="filterByCategoryFromList('${cat.name}')" 
             style="background: ${bgStyle};">
            
            <div class="cat-overlay"></div>
            
            <div class="cat-content">
                <div class="cat-icon-box">
                    <i class="fas ${cat.icon || defaultIcon}"></i>
                </div>
                <h3 class="cat-title">${cat.name}</h3>
                <span class="cat-subtitle">Khám phá ngay <i class="fas fa-arrow-right"></i></span>
            </div>
        </div>
    `;
    })
    .join("");
}

// Hàm hỗ trợ: Khi bấm vào thẻ thể loại -> Chuyển sang trang danh sách phim và lọc luôn
function filterByCategoryFromList(categoryName) {
  // 1. Chuyển trang
  showPage("movies");

  // 2. Gán giá trị vào ô lọc
  const select = document.getElementById("filterCategory");
  if (select) {
    select.value = categoryName;
    // 3. Gọi hàm lọc
    filterMovies();
  }
}
/**
 * ==========================================
 * BỔ SUNG: RENDER TRANG QUỐC GIA (GIAO DIỆN PRO)
 * ==========================================
 */
function renderCountriesList() {
  const container = document.getElementById("countriesList");
  if (!container) return; // Nếu chưa tạo trang HTML thì bỏ qua

  if (allCountries.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">Đang cập nhật quốc gia...</p>';
    return;
  }

  // Bộ màu Gradient riêng cho Quốc gia (Tông Xanh - Tím - Đỏ)
  const countryGradients = [
    "linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)", // Xanh ngọc
    "linear-gradient(135deg, #85FFBD 0%, #FFFB7D 100%)", // Vàng chanh
    "linear-gradient(135deg, #FF9A8B 0%, #FF6A88 55%, #FF99AC 100%)", // Đỏ hồng
    "linear-gradient(135deg, #21D4FD 0%, #B721FF 100%)", // Xanh tím
    "linear-gradient(135deg, #3EECAC 0%, #EE74E1 100%)", // Xanh hồng
    "linear-gradient(135deg, #D4145A 0%, #FBB03B 100%)", // Cam đỏ
  ];

  container.innerHTML = allCountries
    .map((country, index) => {
      const bgStyle = countryGradients[index % countryGradients.length];
      // Nếu có mã quốc gia (VN, US...) thì hiện, không thì hiện icon Trái đất
      const iconCode = country.code ? country.code.toUpperCase() : null;

      return `
        <div class="category-card-pro" 
             onclick="filterByCountryFromList('${country.name}')" 
             style="background: ${bgStyle};">
            
            <div class="cat-overlay"></div>
            
            <div class="cat-content">
                <div class="cat-icon-box">
                    ${
                      iconCode
                        ? `<span style="font-size: 2rem; font-weight: 900; border: 2px solid #fff; padding: 5px 10px; border-radius: 8px;">${iconCode}</span>`
                        : `<i class="fas fa-globe-asia"></i>`
                    }
                </div>
                <h3 class="cat-title">${country.name}</h3>
                <span class="cat-subtitle">Xem phim <i class="fas fa-arrow-right"></i></span>
            </div>
        </div>
    `;
    })
    .join("");
}

// Hàm chuyển trang và lọc theo quốc gia
function filterByCountryFromList(countryName) {
  showPage("movies");
  const select = document.getElementById("filterCountry");
  if (select) {
    select.value = countryName;
    filterMovies();
  }
}

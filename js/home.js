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
  const container = document.getElementById("allMoviesGrid");
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
/* ============================================================
   1. HÀM TẠO THẺ PHIM (Cập nhật để hỗ trợ Mobile chuẩn)
   ============================================================ */
function createMovieCard(movie, matchedTags = []) {
  // Logic xử lý dữ liệu (giữ nguyên)
  // Logic xử lý hiển thị Phần/Mùa (Tránh lặp chữ "Phần Phần")
  let displayPart = movie.part || "";
  if (displayPart && !displayPart.toString().toLowerCase().includes("phần") && 
      !displayPart.toString().toLowerCase().includes("season") && 
      !displayPart.toString().toLowerCase().includes("chapter")) {
      displayPart = `Phần ${displayPart}`;
  }

  const partHtml = movie.part
    ? `<span style="background: var(--accent-primary); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; text-transform: uppercase; vertical-align: middle;">${displayPart}</span>`
    : "";

  let isLiked = false;
  if (
    typeof currentUser !== "undefined" &&
    currentUser &&
    currentUser.favorites
  ) {
    isLiked = currentUser.favorites.includes(movie.id);
  }
  const likeIcon = isLiked ? "fas fa-heart" : "far fa-heart";
  const likeClass = isLiked ? "liked" : "";
  const fallbackImage =
    "https://placehold.co/300x450/2a2a3a/FFFFFF?text=NO+POSTER";
  const matchScore = movie.rating ? Math.round(movie.rating * 10) : 95;

  // Tính badge trạng thái tập (chỉ cho phim bộ)
  let episodeBadgeHtml = "";
  if (movie.type === "series") {
    const currentEps = (movie.episodes || []).length;
    const totalEps = movie.totalEpisodes || 0;
    if (totalEps > 0 && currentEps >= totalEps) {
      episodeBadgeHtml = `<span class="episode-badge episode-badge-full">Hoàn Tất (${currentEps}/${totalEps})</span>`;
    } else if (totalEps > 0) {
      episodeBadgeHtml = `<span class="episode-badge">Tập ${currentEps}/${totalEps}</span>`;
    } else if (currentEps > 0) {
      episodeBadgeHtml = `<span class="episode-badge">Tập ${currentEps}</span>`;
    }
  }

  // Logic hiển thị nhãn khớp (Match Badges) - CHI HIÊN KHI LỌC
  let matchBadgesHtml = "";
  if (matchedTags && matchedTags.length > 0) {
    matchBadgesHtml = `
      <div class="match-badges-container">
        ${matchedTags.map(tag => `
          <div class="match-badge match-badge-${tag.type}">
            <i class="fas fa-${tag.icon}"></i>
            <span>${tag.label}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
    <div class="movie-card-wrapper" id="movie-wrapper-${movie.id}" onclick="handleMovieClick(event, '${movie.id}')">
        
        <div class="card movie-card movie-card-static">
            <div class="card-image">
                <img src="${movie.posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.src='${fallbackImage}';">
                ${episodeBadgeHtml}
                ${matchBadgesHtml}
                <!-- Watch Progress Bar -->
                <div class="watch-progress-container" id="progress-${movie.id}">
                    <div class="watch-progress-bar" style="width: 0%"></div>
                </div>
            </div>
            <div class="card-body">
                <h4 class="card-title">${movie.title}</h4>
                ${movie.originTitle ? `<p class="card-origin-title" style="font-size: 0.8em; color: #555; margin: 3px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: italic; font-weight: 500;">${movie.originTitle}</p>` : ''}
                <div class="card-meta">
                    <span>${movie.year || "2026"}</span>
                    <span class="card-rating" style="color: var(--accent-secondary); font-weight: bold;">
                        ${movie.price ? movie.price + " CRO" : "Free"}
                    </span>
                </div>
            </div>
        </div>

        <div class="movie-popup-nfx" onclick="viewMovieDetail('${movie.id}')">
            <div class="popup-header-img">
                <img src="${movie.backgroundUrl || movie.posterUrl}" onerror="this.onerror=null; this.src='${fallbackImage}';">
            </div>
            <div class="popup-body">
                <div class="popup-actions">
                    <button class="btn-popup-play" onclick="event.stopPropagation(); viewMovieIntro('${movie.id}')">
                        <i class="fas fa-play"></i> Xem ngay
                    </button>
                    <button class="btn-popup-icon ${likeClass} btn-like-${movie.id}" onclick="event.stopPropagation(); toggleFavorite('${movie.id}')">
                        <i class="${likeIcon}"></i>
                    </button>
                    <button class="btn-popup-icon ml-auto" onclick="event.stopPropagation(); viewMovieIntro('${movie.id}')">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <h3 class="popup-title-new">${movie.title} ${partHtml}</h3>
                ${movie.originTitle ? `<p style="font-size: 0.85em; color: #555; margin: -5px 0 5px; font-style: italic; font-weight: 500;">${movie.originTitle}</p>` : ''}
                <div class="popup-meta-row">
                    <!-- Khối thông tin gốc -->
                    <div class="marquee-content">
                        <span class="meta-match">${matchScore}% Phù hợp</span>
                        <span class="meta-age">${movie.ageLimit || "T13"}</span>
                        <span>${movie.year || "2026"}</span>
                        <span>${movie.duration || "90p"}</span>
                        <span class="meta-quality">${movie.quality || "HD"}</span>
                    </div>
                    <!-- Bản sao chỉ dành cho hiệu ứng cuộn Marquee trên điện thoại -->
                    <div class="marquee-content marquee-duplicate mobile-only-marquee" aria-hidden="true">
                        <span class="meta-match">${matchScore}% Phù hợp</span>
                        <span class="meta-age">${movie.ageLimit || "T13"}</span>
                        <span>${movie.year || "2026"}</span>
                        <span>${movie.duration || "90p"}</span>
                        <span class="meta-quality">${movie.quality || "HD"}</span>
                    </div>
                </div>
                <div class="popup-genres-row">
                    <span class="desktop-genres">${(movie.categories && movie.categories.length > 0) ? movie.categories.slice(0, 2).join(', ') + (movie.categories.length > 2 ? '...' : '') : (movie.category || "Phim mới")}</span>
                    <span class="mobile-genres" style="display: none;">${(movie.categories && movie.categories.length > 0) ? movie.categories[0] + (movie.categories.length > 1 ? '...' : '') : (movie.category || "Phim mới")}</span>
                    <span class="dot">•</span>
                    <span class="popup-country">${movie.country || "Quốc tế"}</span>
                </div>
            </div>
        </div>
    </div>
  `;
}
/* ============================================================
   2. HÀM XỬ LÝ CLICK THÔNG MINH (Dán vào cuối file home.js)
   ============================================================ */

/* --- HÀM ĐÃ SỬA LỖI TRÙNG ID --- */
/* --- DÁN ĐÈ VÀO js/home.js --- */

function handleMovieClick(event, movieId) {
  // 1. PC: Chuyển trang luôn
  if (window.innerWidth > 1366) {
    viewMovieIntro(movieId);
    return;
  }

  // 2. MOBILE:
  // Nếu bấm vào nút bên trong popup (Play, Like) thì giữ nguyên
  if (event.target.closest(".movie-popup-nfx")) {
    return;
  }

  // 👇 FIX: Sử dụng event.currentTarget để lấy chính xác thẻ đang được click
  // (Thay vì getElementById vì 1 phim có thể xuất hiện ở nhiều danh sách -> Trùng ID)
  const currentWrapper = event.currentTarget.closest(".movie-card-wrapper") || event.currentTarget;
  if (!currentWrapper) return;

  // Kiểm tra xem nó đang mở hay đóng
  const isAlreadyOpen = currentWrapper.classList.contains("active-mobile");

  // Đóng tất cả popup khác
  closeAllPopups();

  // Nếu chưa mở thì mở ra (Nếu đang mở rồi thì ở trên đã đóng lại -> Tắt)
  if (!isAlreadyOpen) {
    // --- LOGIC TÍNH TOÁN VỊ TRÍ THÔNG MINH ---
    const rect = currentWrapper.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const isPortrait = window.innerHeight > window.innerWidth;
    
    // Reset các class định vị cũ
    currentWrapper.classList.remove("popup-align-left", "popup-align-right");

    // CHỈ áp dụng Smart Positioning (thụt lề) cho các hàng phim cuộn ngang (landscape row) 
    // và KHÔNG áp dụng khi đang ở giao diện dọc (Portrait) hoặc trong lưới movie-grid thông thường
    const isHorizontalRow = currentWrapper.closest(".country-movies-row");
    
    if (isHorizontalRow && !isPortrait) {
        // Nếu mép trái thẻ < 10% màn hình -> Đang ở lề TRÁI -> Mở sang phải
        if (rect.left < screenWidth * 0.1) {
            currentWrapper.classList.add("popup-align-left");
        } 
        // Nếu mép phải thẻ > 90% màn hình -> Đang ở lề PHẢI -> Mở sang trái
        else if (rect.right > screenWidth * 0.9) {
            currentWrapper.classList.add("popup-align-right");
        }
    }
    // Mặc định: CENTER cho Portrait hoặc movie-grid thông thường (Không cần add class gì)

    currentWrapper.classList.add("active-mobile");

    // FIX STACKING CONTEXT: Nâng section cha lên cao, nhưng dưới Navbar (Navbar=2000)
    const parentSection = currentWrapper.closest(".country-section") || currentWrapper.closest(".section");
    if (parentSection) {
        parentSection.classList.add("section-active-popup");
    }
  }

  // Ngăn click lan ra ngoài
  event.stopPropagation();
}

function closeAllPopups() {
  document.querySelectorAll(".movie-card-wrapper").forEach((el) => {
    el.classList.remove("active-mobile", "popup-align-left", "popup-align-right");
  });
  
  // Xóa class z-index khỏi các section
  document.querySelectorAll(".country-section, .section").forEach((sec) => {
    sec.classList.remove("section-active-popup");
  });
}

// Bấm ra ngoài khoảng trống thì đóng hết
document.addEventListener("click", function (event) {
    // Nếu không bấm vào bất kỳ card nào chứa popup
    if (!event.target.closest(".movie-card-wrapper")) {
        closeAllPopups();
    }
});

/**
 * Search movies
 */
/**
 * Search movies (Đã tối ưu hóa với Debounce)
 */
const searchMovies = debounce(function () {
  const query = document.getElementById("searchMovies").value.toLowerCase();
  filterMovies(query);
}, 300);
/**
 * Filter movies
 */
function filterMovies(searchQuery = null) {
  const query =
    searchQuery !== null
      ? searchQuery
      : document.getElementById("searchMovies")?.value.toLowerCase() || "";
      
  const categoryStr = document.getElementById("inputFilterCategory")?.value.trim() || "";
  const countryStr = document.getElementById("inputFilterCountry")?.value.trim() || "";
  const yearStr = document.getElementById("inputFilterYear")?.value.trim() || "";

  // Chuyển chuỗi thành mảng linh hoạt (hỗ trợ cả dấu phẩy thừa)
  const categories = categoryStr.split(',').map(s => s.trim()).filter(Boolean);
  const countries = countryStr.split(',').map(s => s.trim()).filter(Boolean);
  const years = yearStr.split(',').map(s => s.trim()).filter(Boolean);

  let filteredData = allMovies.map((movie) => {
    // 1. Ô tìm kiếm (Luôn là AND - để thu hẹp kết quả)
    const matchQuery = !query || movie.title.toLowerCase().includes(query);
    if (!matchQuery) return null;

    // Nếu không có bất kỳ bộ lọc nhãn nào (Categories, Countries, Years) thì chỉ lọc theo Search Query
    if (categories.length === 0 && countries.length === 0 && years.length === 0) {
      return { movie, matchedTags: [] };
    }

    // 2. Logic Union (OR) cho các bộ lọc nhãn
    let matchedTags = [];
    
    // Kiểm tra Thể loại
    let movieCats = (movie.categories || (movie.category ? [movie.category] : [])).map(c => c.toLowerCase());
    const matchedCategories = categories.filter(c => movieCats.includes(c.toLowerCase()));
    matchedCategories.forEach(cat => matchedTags.push({ type: 'category', icon: 'tag', label: cat }));
    
    // Kiểm tra Quốc gia
    const matchedCountries = countries.filter(c => movie.country && c.toLowerCase() === movie.country.toLowerCase());
    matchedCountries.forEach(cty => matchedTags.push({ type: 'country', icon: 'globe', label: cty }));
    
    // Kiểm tra Năm
    const matchedYears = years.filter(y => movie.year && y.toString() === movie.year.toString());
    matchedYears.forEach(y => matchedTags.push({ type: 'year', icon: 'calendar-alt', label: y }));

    // Kết hợp: Khớp bất kỳ tiêu chí nào trong bộ nhãn
    if (matchedTags.length > 0) {
      return { movie, matchedTags };
    }
    return null;
  }).filter(Boolean);

  // Render kết quả
  const container = document.getElementById("allMoviesGrid");
  if (container) {
    if (filteredData.length === 0) {
      container.innerHTML = '<div class="text-center w-100">Không tìm thấy phim phù hợp.</div>';
    } else {
      container.innerHTML = filteredData.map(item => createMovieCard(item.movie, item.matchedTags)).join("");
    }
  }
  
  // Hiển thị tóm tắt kết quả (Categories, Countries, Years)
  updateFilterSummary(categories, countries, years, allMovies, "filterResultSummary");
}

/**
 * Hiển thị tóm tắt kết quả lọc có số lượng kèm theo
 */
function updateFilterSummary(categories, countries, years, sourceData, summaryElementId) {
    const summaryEl = document.getElementById(summaryElementId);
    if (!summaryEl) return;

    if (categories.length === 0 && countries.length === 0 && years.length === 0) {
        summaryEl.innerHTML = "";
        summaryEl.classList.remove('active');
        return;
    }

    let summaryHtml = '<span style="margin-right: 10px;"><i class="fas fa-info-circle"></i> Kết quả lọc:</span>';
    
    // Đếm Thể loại
    if (categories.length > 0) {
        categories.forEach(cat => {
            const count = sourceData.filter(m => {
                let mCats = (m.categories || (m.category ? [m.category] : [])).map(c => c.toLowerCase());
                return mCats.includes(cat.toLowerCase());
            }).length;
            summaryHtml += `
                <span class="filter-summary-item">
                    <b>${cat}</b><span class="filter-count-badge ${count === 0 ? 'zero' : ''}">${count}</span>
                </span>
            `;
        });
    }

    // Đếm Quốc gia
    if (countries.length > 0) {
        countries.forEach(cty => {
            const count = sourceData.filter(m => m.country && m.country.toLowerCase() === cty.toLowerCase()).length;
            summaryHtml += `
                <span class="filter-summary-item">
                    <b>${cty}</b><span class="filter-count-badge ${count === 0 ? 'zero' : ''}">${count}</span>
                </span>
            `;
        });
    }

    // Đếm Năm
    if (years.length > 0) {
        years.forEach(y => {
            const count = sourceData.filter(m => m.year && m.year.toString() === y.toString()).length;
            summaryHtml += `
                <span class="filter-summary-item">
                    <b>${y}</b><span class="filter-count-badge ${count === 0 ? 'zero' : ''}">${count}</span>
                </span>
            `;
        });
    }

    summaryEl.innerHTML = summaryHtml;
    summaryEl.classList.add('active');
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
  // 1. Thể loại
  const catList = document.getElementById("listFilterCategory");
  const catInput = document.getElementById("inputFilterCategory");
  if (catList && catInput) {
    const categories = ['Tất cả thể loại', ...allCategories.map(c => c.name)];
    initFilterBox("boxFilterCategory", catInput, catList, categories);
  }

  // 2. Quốc gia
  const countryList = document.getElementById("listFilterCountry");
  const countryInput = document.getElementById("inputFilterCountry");
  if (countryList && countryInput) {
    const countries = ['Tất cả quốc gia', ...allCountries.map(c => c.name)];
    initFilterBox("boxFilterCountry", countryInput, countryList, countries);
  }

  // 3. Năm
  const yearList = document.getElementById("listFilterYear");
  const yearInput = document.getElementById("inputFilterYear");
  if (yearList && yearInput) {
    const years = ['Tất cả năm', ...[...new Set(allMovies.map((m) => m.year))].sort((a, b) => b - a)];
    initFilterBox("boxFilterYear", yearInput, yearList, years);
  }
}

/**
 * Khởi tạo logic cho Filter Box tùy chỉnh
 */
function initFilterBox(boxId, input, list, data, filterFunctionId = 'filterMovies') {
    const box = document.getElementById(boxId);
    
    const renderList = (inputValue = "") => {
        // Lấy danh sách đã chọn thực tế - xử lý an toàn
        const selectedValues = input.value.split(',').map(v => v.trim()).filter(Boolean);
        
        // Tách từ khóa tìm kiếm (chỉ lấy phần sau dấu phẩy cuối cùng)
        const parts = inputValue.split(',');
        const filterText = parts[parts.length - 1].trim().toLowerCase();
        
        let filtered = data.filter(item => 
            item.toString().toLowerCase().includes(filterText)
        );

        list.innerHTML = filtered.map(item => {
            const isSelected = selectedValues.includes(item.toString());
            const isAllMode = item.toString().includes("Tất cả");
            return `
                <div class="suggestion-item ${isSelected ? 'selected' : ''} ${isAllMode ? 'item-all' : ''}" 
                     onclick="selectFilterItem(event, '${boxId}', '${input.id}', '${item}', '${filterFunctionId}')">
                    <span class="item-label">${item}</span>
                    ${isSelected ? '<i class="fas fa-times btn-remove-item"></i>' : ''}
                </div>
            `;
        }).join("");
    };

    renderList();

    input.oninput = (e) => {
        renderList(e.target.value);
    };

    // Chuyển sang onclick để nhấn là mở, kể cả khi đã focus
    input.onclick = (e) => {
        e.stopPropagation(); // Ngăn sự kiện click global đóng nó ngay lập tức
        const isActive = box.classList.contains('active');
        
        // Nếu click vào cái đang mở thì không đóng (theo yêu cầu user)
        // Nhưng nếu click sang cái khác thì đóng cái cũ mở cái mới
        if (!isActive) {
            document.querySelectorAll('.custom-filter-box').forEach(b => b.classList.remove('active'));
            box.classList.add('active');
            renderList(input.value);
            input.select(); // Tự động bôi đen để gõ tìm kiếm mới nhanh hơn
        }
    };

    box.onclick = (e) => {
        e.stopPropagation();
        if (!box.classList.contains('active')) {
            input.click(); // Giả lập click vào input để mở
        }
    };
}

/**
 * Chọn một món trong danh sách gợi ý
 */
function selectFilterItem(event, boxId, inputId, value, filterFunctionId = 'filterMovies') {
    if (event) {
        event.stopPropagation(); // QUAN TRỌNG: Ngăn bọt khí (bubbles) làm đóng menu
    }
    
    const input = document.getElementById(inputId);
    const box = document.getElementById(boxId);
    
    let currentValues = input.value.split(',').map(v => v.trim()).filter(Boolean);
    
    if (value.includes("Tất cả")) {
        currentValues = []; // Clear all
    } else {
        const index = currentValues.indexOf(value);
        if (index > -1) {
            currentValues.splice(index, 1); // Deselect
        } else {
            currentValues.push(value); // Select
        }
    }
    
    input.value = currentValues.join(', ');
    
    // Tự động thêm dấu phẩy nếu danh sách không trống để báo hiệu chọn tiếp
    if (input.value && !input.value.endsWith(', ')) {
        input.value += ', ';
    }

    // Render lại trạng thái list mà không đóng menu
    const eventInput = new Event('input', { bubbles: true });
    input.dispatchEvent(eventInput);
    
    // Đảm bảo tiêu điểm vẫn ở input để user gõ tiếp
    input.focus();
}

// Đóng mọi dropdown khi bấm ra ngoài
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-filter-box').forEach(box => {
        box.classList.remove('active');
    });
});
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

  // 2. Gán giá trị vào ô lọc mới
  const input = document.getElementById("inputFilterCategory");
  if (input) {
    input.value = categoryName;
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
  const input = document.getElementById("inputFilterCountry");
  if (input) {
    input.value = countryName;
    filterMovies();
  }
}

/**
 * --- PHẦN PHIM THEO QUỐC GIA (LANDSCAPE 16:9) ---
 */

/**
 * Render các phần phim theo quốc gia
 */
function renderCountrySections() {
  const container = document.getElementById("countrySections");
  if (!container || !allMovies || allMovies.length === 0) return;

  // Danh sách các quốc gia cần hiển thị và từ khóa lọc
  const sections = [
    { id: "korea", name: "Hàn Quốc", icon: "🎎", filter: "Hàn Quốc" },
    { id: "china", name: "Trung Quốc", icon: "🐉", filter: "Trung Quốc" },
    { id: "usuk", name: "US-UK", icon: "🗽", filter: "Mỹ" }, // Có thể lọc theo 'Mỹ' hoặc thêm logic linh hoạt
  ];

  container.innerHTML = sections
    .map((section) => {
      // Lọc phim theo quốc gia
      const filteredMovies = allMovies
        .filter((m) => {
          if (!m.country) return false;
          const c = m.country.toLowerCase();
          
          if (section.id === "korea") {
            return c.includes("hàn") || c.includes("korea") || c.includes("kr");
          }
          if (section.id === "china") {
            return c.includes("trung") || c.includes("china") || c.includes("cn");
          }
          if (section.id === "usuk") {
            return (
              c.includes("mỹ") ||
              c.includes("anh") ||
              c.includes("âu") ||
              c.includes("us") ||
              c.includes("uk")
            );
          }
          return c.includes(section.filter.toLowerCase());
        })
        .slice(0, 10); // Lấy tối đa 10 phim mỗi phần

      if (filteredMovies.length === 0) return "";

      return `
            <section class="country-section" id="section-${section.id}">
                <div class="sidebar-decoration">${section.icon}</div>
                <div class="country-sidebar">
                    <h2>Phim <span>${section.name}</span> mới</h2>
                    <button class="btn-view-all" onclick="filterByCountryFromList('${section.filter}')">
                        Xem toàn bộ <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="country-movies-wrapper">
                    <div class="country-movies-row">
                        ${filteredMovies
                          .map((movie) => createLandscapeMovieCard(movie))
                          .join("")}
                    </div>
                </div>
            </section>
        `;
    })
    .join("");

  // Bật vuốt kéo thả cho PC sau khi DOM đã được chèn vào
  initDragToScroll();
}

/**
 * Tính năng kéo để cuộn dành cho Máy tính (Desktop Drag to Scroll)
 */
function initDragToScroll() {
  const sliders = document.querySelectorAll(".country-movies-row");
  
  sliders.forEach(slider => {
    let isDown = false;
    let isDragging = false;
    let startX;
    let scrollLeft;

    slider.addEventListener("mousedown", (e) => {
      isDown = true;
      isDragging = false; // Reset trạng thái kéo
      
      // Lấy vị trí click ban đầu (bỏ qua offset ngoài lề)
      startX = e.pageX - slider.offsetLeft;
      // Lưu lại vị trí cuộn hiện hành
      scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener("mouseleave", () => {
      isDown = false;
      slider.classList.remove("active-drag");
    });

    slider.addEventListener("mouseup", () => {
      isDown = false;
      slider.classList.remove("active-drag");
    });

    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return; // Chỉ chạy khi đang nhấn giữ chuột
      e.preventDefault(); // Ngăn chọn văn bản hoặc hình ảnh mặc định của trình duyệt
      
      const x = e.pageX - slider.offsetLeft;
      // Tính quãng đường kéo
      const walk = (x - startX) * 2; 

      // 🔥 THRESHOLD: Tăng lên 20px để tránh "nhận nhầm" tap thành drag trên Tablet/Mobile
      if (Math.abs(walk) > 20) {
          isDragging = true;
          slider.classList.add("active-drag"); // Khóa pointer-events của thẻ phim
      }

      // Cuộn thẻ div tương ứng với quãng đường kéo
      if (isDragging) {
          slider.scrollLeft = scrollLeft - walk;
      }
    });

    // Bắt sự kiện click để chặn nếu vừa thực hiện kéo chuột
    slider.addEventListener("click", (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true); // Use capture phase
  });
}

/**
 * Tạo thẻ phim ngang (Landscape 16:9)
 */
function createLandscapeMovieCard(movie) {
  const fallbackImage =
    "https://placehold.co/300x169/2a2a3a/FFFFFF?text=NO+IMAGE";
  // Ưu tiên backgroundUrl (ảnh ngang), fallback về posterUrl
  const imageUrl = movie.backgroundUrl || movie.posterUrl || fallbackImage;

  // Logic xử lý hiển thị Phần/Mùa (Tránh lặp chữ "Phần Phần")
  let displayPart = movie.part || "";
  if (displayPart && !displayPart.toString().toLowerCase().includes("phần") && 
      !displayPart.toString().toLowerCase().includes("season") && 
      !displayPart.toString().toLowerCase().includes("chapter")) {
      displayPart = `Phần ${displayPart}`;
  }

  let isLiked = false;
  if (
    typeof currentUser !== "undefined" &&
    currentUser &&
    currentUser.favorites
  ) {
    isLiked = currentUser.favorites.includes(movie.id);
  }
  const likeIcon = isLiked ? "fas fa-heart" : "far fa-heart";
  const likeClass = isLiked ? "liked" : "";
  const matchScore = movie.rating ? Math.round(movie.rating * 10) : 95;

  // Tính badge trạng thái tập (chỉ cho phim bộ)
  let lsEpisodeBadge = "";
  if (movie.type === "series") {
    const currentEps = (movie.episodes || []).length;
    const totalEps = movie.totalEpisodes || 0;
    if (totalEps > 0 && currentEps >= totalEps) {
      lsEpisodeBadge = `<div class="landscape-badge" style="left: 10px; right: auto; top: 10px; bottom: auto; background: rgba(81,207,102,0.9);">FULL</div>`;
    } else if (totalEps > 0) {
      lsEpisodeBadge = `<div class="landscape-badge" style="left: 10px; right: auto; top: 10px; bottom: auto; background: rgba(255,193,7,0.85); color: #000;">Tập ${currentEps}/${totalEps}</div>`;
    }
  }

  return `
        <div class="movie-card-landscape movie-card-wrapper" id="movie-wrapper-ls-${movie.id}" onclick="handleMovieClick(event, '${movie.id}')">
            <div class="landscape-img-container" style="background-image: url('${imageUrl}');">
                <div class="landscape-badge">${movie.quality || "HD"}</div>
                ${
                  movie.part
                    ? `<div class="landscape-badge" style="left: auto; right: 10px;">${displayPart}</div>`
                    : ""
                }
                ${lsEpisodeBadge}
            </div>
            <div class="landscape-info">
                <div class="landscape-title">${movie.title}</div>
                <div class="landscape-subtitle">${movie.originTitle || movie.category || ""}</div>
            </div>

            <!-- Popup khi rê chuột (Giao diện nâng cấp theo mẫu) -->
            <div class="movie-popup-nfx">
                <div class="popup-header-img">
                    <img src="${imageUrl}" onerror="this.src='${fallbackImage}';">
                </div>
                <div class="popup-body">
                    <h3 class="popup-title-main">${movie.title}</h3>
                    <div class="popup-subtitle-orig">${movie.originTitle || ""}</div>
                    
                    <div class="popup-actions" style="margin-top: 10px;">
                        <button class="btn-play-pink" onclick="event.stopPropagation(); viewMovieIntro('${movie.id}')">
                            <i class="fas fa-play"></i> Xem ngay
                        </button>
                        <button class="btn-action-glass ${likeClass} btn-like-${movie.id}" onclick="event.stopPropagation(); toggleFavorite('${movie.id}')">
                            <i class="${likeIcon}"></i> Thích
                        </button>
                        <button class="btn-action-glass" onclick="event.stopPropagation(); viewMovieIntro('${movie.id}')">
                             <i class="fas fa-info-circle"></i> Chi tiết
                        </button>
                    </div>

                    <div class="meta-badges-row">
                        <span class="badge-item imdb">IMDb ${movie.rating || "7.0"}</span>
                        <span class="badge-item year">${movie.year || "2026"}</span>
                        ${movie.part ? `<span class="badge-item">${displayPart}</span>` : ""}
                        ${movie.totalEpisodes ? `<span class="badge-item">Tập ${movie.totalEpisodes}</span>` : ""}
                        <span class="badge-item">${movie.quality || "HD"}</span>
                    </div>

                    <div class="popup-genres-text">
                        ${(movie.categories || []).join(' <span class="dot">•</span> ')}
                    </div>
                </div>
            </div>
        </div>
    `;
}


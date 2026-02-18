// Thêm vào đầu file admin.js
let editingUserId = null;
/**
 * Load dữ liệu cho Admin
 */
async function loadAdminData() {
  if (!isAdmin) return;

  try {
    // Load stats
    await loadAdminStats();

    // Load movies for admin
    await loadAdminMovies();

    // Load users
    await loadAdminUsers();

    // Load comments
    await loadAdminComments();

    // Load transactions
    await loadAdminTransactions();

    // Populate movie select for episodes
    //populateMovieSelect();

    // Load categories and countries tables
    renderAdminCategories();
    renderAdminCountries();
  } catch (error) {
    console.error("Lỗi load admin data:", error);
  }
}

/**
 * Load thống kê Admin
 */
async function loadAdminStats() {
  try {
    // Tổng số phim
    document.getElementById("statTotalMovies").textContent = allMovies.length;

    // Tổng lượt xem
    const totalViews = allMovies.reduce((sum, m) => sum + (m.views || 0), 0);
    document.getElementById("statTotalViews").textContent =
      formatNumber(totalViews);

    // Doanh thu ước tính
    let totalRevenue = 0;
    if (db) {
      const txSnapshot = await db
        .collection("transactions")
        .where("status", "==", "completed")
        .get();
      totalRevenue = txSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0,
      );
    }
    document.getElementById("statTotalRevenue").textContent =
      `${formatNumber(totalRevenue)} CRO`;

    // Tổng users
    let totalUsers = 0;
    if (db) {
      const usersSnapshot = await db.collection("users").get();
      totalUsers = usersSnapshot.size;
    }
    document.getElementById("statTotalUsers").textContent =
      formatNumber(totalUsers);

    // Recent movies
    renderRecentMovies();
  } catch (error) {
    console.error("Lỗi load stats:", error);
  }
}

/**
 * Render phim gần đây trong dashboard
 */
function renderRecentMovies() {
  const tbody = document.getElementById("recentMoviesTable");

  const recent = [...allMovies]
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt);
      return dateB - dateA;
    })
    .slice(0, 5);

  tbody.innerHTML = recent
    .map((movie) => {
      const date = movie.createdAt?.toDate
        ? movie.createdAt.toDate()
        : new Date(movie.createdAt);
      return `
            <tr>
                <td><img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.src='https://placehold.co/50x75'"></td>
                <td>${movie.title}</td>
                <td>${movie.price} CRO</td>
                <td><span class="status-badge ${movie.status}">${getStatusText(movie.status)}</span></td>
                <td>${formatDate(date)}</td>
            </tr>
        `;
    })
    .join("");
}

/**
 * Load danh sách phim cho Admin
 */
/**
 * Lọc danh sách phim (Admin)
 */
function filterAdminMovies() {
  const searchInput = document.getElementById("adminSearchMovies");
  const statusSelect = document.getElementById("adminFilterStatus");
  
  if (!searchInput) return;

  const searchText = searchInput.value.toLowerCase().trim();
  const statusFilter = statusSelect ? statusSelect.value : "";
  
  // Lọc phim từ biến toàn cục allAdminMovies (chứa đủ mọi trạng thái)
  const filteredMovies = allAdminMovies.filter(m => {
    const matchText = (m.title && m.title.toLowerCase().includes(searchText)) ||
                      (m.category && m.category.toLowerCase().includes(searchText));
    
    const matchStatus = statusFilter === "" || m.status === statusFilter;

    return matchText && matchStatus;
  });

  renderAdminMoviesList(filteredMovies);
}

/**
 * Render bảng phim
 */
function renderAdminMoviesList(movies) {
  const tbody = document.getElementById("adminMoviesTable");
  if (!tbody) return;

  if (movies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không tìm thấy phim nào</td></tr>';
    return;
  }

  tbody.innerHTML = movies
      .map(
        (movie) => `
            <tr>
                <td><img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.src='https://placehold.co/50x75'"></td>
                <td>${movie.title}</td>
                <td>${movie.category || "N/A"}</td>
                <td>${movie.price}</td>
                <td>${formatNumber(movie.views || 0)}</td>
                <td><span class="status-badge ${movie.status}">${getStatusText(movie.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editMovie('${movie.id}')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMovie('${movie.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
}

/**
 * Biến toàn cục lưu danh sách phim cho Admin (Bao gồm cả ẩn/chờ duyệt)
 */
let allAdminMovies = [];

/**
 * Load danh sách phim cho Admin
 */
async function loadAdminMovies() {
  const tbody = document.getElementById("adminMoviesTable");

  try {
    let movies = [];

    // 1. Lấy TẤT CẢ phim từ Firestore (Mới nhất lên đầu)
    if (db) {
      const snapshot = await db
        .collection("movies")
        .orderBy("createdAt", "desc")
        .get();
      movies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      movies = allMovies; // Dữ liệu mẫu nếu chưa có DB
    }
    
    // Lưu vào biến toàn cục để dùng cho lọc
    allAdminMovies = movies;

    // 2. Render Bảng Quản lý Phim Chính
    // Render lần đầu (hoặc dùng hàm filter để render)
    renderAdminMoviesList(allAdminMovies);
    
    // ... (Code cập nhật dropdown/dashboard giữ nguyên bên dưới)



    // =======================================================
    // 👇 ĐOẠN CODE MỚI THÊM ĐỂ FIX LỖI CỦA BẠN 👇
    // =======================================================

    // 3. Cập nhật ngay Menu chọn phim (Tab Quản lý Tập)
    const select = document.getElementById("selectMovieForEpisodes");
    if (select) {
      select.innerHTML =
        '<option value="">-- Chọn phim --</option>' +
        movies
          .map((m) => `<option value="${m.id}">${m.title}</option>`)
          .join("");
    }

    // 4. Cập nhật ngay Bảng "Phim mới thêm gần đây" (Dashboard)
    const recentTbody = document.getElementById("recentMoviesTable");
    if (recentTbody) {
      const recent = movies.slice(0, 5); // Lấy 5 phim mới nhất
      recentTbody.innerHTML = recent
        .map((movie) => {
          const date = movie.createdAt?.toDate
            ? movie.createdAt.toDate()
            : new Date(movie.createdAt);
          return `
                <tr>
                    <td><img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.src='https://placehold.co/50x75'"></td>
                    <td>${movie.title}</td>
                    <td>${movie.price} CRO</td>
                    <td><span class="status-badge ${movie.status}">${getStatusText(movie.status)}</span></td>
                    <td>${formatDate(date)}</td>
                </tr>
             `;
        })
        .join("");
    }

    // 5. Cập nhật Thống kê Tổng số phim (Dashboard)
    const statTotal = document.getElementById("statTotalMovies");
    if (statTotal) statTotal.textContent = movies.length;

    // =======================================================
  } catch (error) {
    console.error("Lỗi load admin movies:", error);
  }
}
/**
 * Mở modal thêm/sửa phim
 */
// Thêm hàm này vào trước openMovieModal
/**
 * Cập nhật UI nhập Phần/Mùa dựa trên Type
 */
function updateMoviePartUI() {
    const type = document.getElementById("moviePartType").value;
    const groupNumber = document.getElementById("groupPartNumber"); // Chứa Input Number + Buttons
    const inputCustom = document.getElementById("moviePartCustom");

    if (type === "custom") {
        // Hiện ô nhập text, ẩn ô nhập số
        groupNumber.style.display = "none";
        inputCustom.style.display = "block";
        inputCustom.focus();
    } else if (type === "") {
        // Ẩn cả 2
        groupNumber.style.display = "none";
        inputCustom.style.display = "none";
    } else {
        // Hiện ô nhập số, ẩn ô text
        groupNumber.style.display = "flex";
        inputCustom.style.display = "none";
    }
}

/**
 * Tăng giảm số phần
 */
function adjustPartNumber(delta) {
    const input = document.getElementById("moviePartNumber");
    let current = parseInt(input.value) || 1;
    current += delta;
    if (current < 1) current = 1;
    input.value = current;
}

/**
 * Chuyển đổi chế độ nhập giá
 */
function toggleMoviePrice(type) {
  const priceInput = document.getElementById("moviePrice");
  if (!priceInput) return;

  if (type === "free") {
    priceInput.value = 0;
    priceInput.disabled = true;
    priceInput.style.backgroundColor = "#e9ecef"; // Màu xám nhạt
    priceInput.style.color = "#6c757d"; // Màu chữ xám
  } else {
    // Nếu chuyển sang Paid mà giá đang là 0 thì set mặc định 1
    if (parseFloat(priceInput.value) === 0) {
        priceInput.value = 1;
    }
    priceInput.disabled = false;
    priceInput.style.backgroundColor = "";
    priceInput.style.color = "";
  }
}

/**
 * Mở modal thêm/sửa phim
 */
function openMovieModal(movieId = null) {
  const modal = document.getElementById("movieModal");
  const title = document.getElementById("movieModalTitle");
  const form = document.getElementById("movieForm");

  // Populate category and country selects
  const categorySelect = document.getElementById("movieCategory");
  const countrySelect = document.getElementById("movieCountry");

  categorySelect.innerHTML =
    '<option value="">Chọn thể loại</option>' +
    allCategories
      .map((c) => `<option value="${c.name}">${c.name}</option>`)
      .join("");

  countrySelect.innerHTML =
    '<option value="">Chọn quốc gia</option>' +
    allCountries
      .map((c) => `<option value="${c.name}">${c.name}</option>`)
      .join("");

  if (movieId) {
    // Edit mode
    title.textContent = "Sửa Phim";
    const movie = allMovies.find((m) => m.id === movieId);

    if (movie) {
      document.getElementById("movieId").value = movieId;
      document.getElementById("movieTitle").value = movie.title;
      // document.getElementById("moviePart").value = movie.part || ""; // Code cũ
      
      // Xử lý Phần/Mùa (Parse dữ liệu cũ)
      const partStr = movie.part || "";
      const partTypeSelect = document.getElementById("moviePartType");
      const partNumberInput = document.getElementById("moviePartNumber");
      const partCustomInput = document.getElementById("moviePartCustom");

      // Regex check: "Phần 1", "Season 2", "Chapter 10"
      const match = partStr.match(/^(Phần|Season|Chapter|Quyển|Tập)\s+(\d+)$/);

      if (match) {
          // Khớp mẫu -> Chọn Type và điền Number
          partTypeSelect.value = match[1];
          partNumberInput.value = match[2];
          partCustomInput.value = "";
      } else if (partStr.trim() === "") {
          // Trống
          partTypeSelect.value = "";
          partNumberInput.value = "1";
          partCustomInput.value = "";
      } else {
          // Không khớp (VD: "Tập Đặc Biệt") -> Chọn Custom
          partTypeSelect.value = "custom";
          partNumberInput.value = "1";
          partCustomInput.value = partStr;
      }
      updateMoviePartUI(); // Cập nhật UI ẩn hiện

      document.getElementById("moviePoster").value = movie.posterUrl;
      // New fields
      document.getElementById("movieBackground").value = movie.backgroundUrl || "";
      document.getElementById("movieCast").value = movie.cast || "";
      document.getElementById("movieVersions").value = movie.versions || "";
      document.getElementById("movieDuration").value = movie.duration || "";
      document.getElementById("movieAgeLimit").value = movie.ageLimit || "P";
      document.getElementById("movieQuality").value = movie.quality || "HD";

      document.getElementById("movieCategory").value = movie.category || "";
      document.getElementById("movieCountry").value = movie.country || "";
      document.getElementById("movieYear").value = movie.year || "";
      document.getElementById("moviePrice").value = movie.price || 0;
      document.getElementById("movieDescription").value =
        movie.description || "";
      document.getElementById("movieType").value = movie.type || "series";
      document.getElementById("movieTags").value = (movie.tags || []).join(
        ", ",
      );
      document.getElementById("movieStatus").value = movie.status || "public";
      
      // Xử lý Radio Button Free/Paid
      const priceVal = parseFloat(movie.price || 0);
      if (priceVal === 0) {
          document.querySelector('input[name="movieFeeType"][value="free"]').checked = true;
          toggleMoviePrice('free');
      } else {
          document.querySelector('input[name="movieFeeType"][value="paid"]').checked = true;
          toggleMoviePrice('paid');
      }
    }
  } else {
    // Add mode
    title.textContent = "Thêm Phim Mới";
    form.reset();
    document.getElementById("movieId").value = "";
    document.getElementById("movieYear").value = new Date().getFullYear();
    document.getElementById("movieType").value = "series";
    
    // Mặc định Phần/Mùa: Chọn "Phần 1"
    document.getElementById("moviePartType").value = "Phần";
    document.getElementById("moviePartNumber").value = "1";
    document.getElementById("moviePartCustom").value = "";
    updateMoviePartUI();

    // Reset new fields default
    document.getElementById("movieBackground").value = "";
    document.getElementById("movieCast").value = "";
    document.getElementById("movieVersions").value = "";
    document.getElementById("movieDuration").value = "";
    document.getElementById("movieAgeLimit").value = "P";
    document.getElementById("movieQuality").value = "HD";

    // Mặc định là Miễn phí
    document.querySelector('input[name="movieFeeType"][value="free"]').checked = true;
    toggleMoviePrice("free");
  }

  openModal("movieModal");
}

/**
 * Xử lý submit form phim
 */
async function handleMovieSubmit(event) {
  event.preventDefault();

  if (!db) {
    showNotification("Firebase chưa được cấu hình!", "error");
    return;
  }

  const movieId = document.getElementById("movieId").value;
  const movieData = {
    title: document.getElementById("movieTitle").value,
    posterUrl: document.getElementById("moviePoster").value,
    category: document.getElementById("movieCategory").value,
    country: document.getElementById("movieCountry").value,
    year: parseInt(document.getElementById("movieYear").value),
    // Logic giá vé mới
    price: document.querySelector('input[name="movieFeeType"]:checked').value === 'free' 
           ? 0 
           : parseFloat(document.getElementById("moviePrice").value || 0),
    description: document.getElementById("movieDescription").value,
    type: document.getElementById("movieType").value,
    
    // New fields
    backgroundUrl: document.getElementById("movieBackground").value,
    cast: document.getElementById("movieCast").value,
    versions: document.getElementById("movieVersions").value,
    duration: document.getElementById("movieDuration").value,
    ageLimit: document.getElementById("movieAgeLimit").value,
    quality: document.getElementById("movieQuality").value,

    // Logic gộp Phần/Mùa
    part: (() => {
        const type = document.getElementById("moviePartType").value;
        if (!type) return ""; // Trống
        if (type === "custom") return document.getElementById("moviePartCustom").value.trim();
        return `${type} ${document.getElementById("moviePartNumber").value}`;
    })(),
    tags: document
      .getElementById("movieTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter((t) => t),
    status: document.getElementById("movieStatus").value,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    showLoading(true, "Đang lưu...");

    if (movieId) {
      // Update
      await db.collection("movies").doc(movieId).update(movieData);
      showNotification("Đã cập nhật phim!", "success");
    } else {
      // Create
      movieData.views = 0;
      movieData.rating = 0;
      movieData.episodes = [];
      movieData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

      await db.collection("movies").add(movieData);
      showNotification("Đã thêm phim mới!", "success");
    }

    closeModal("movieModal");

    // Reload data
    await loadMovies();
    await loadAdminMovies();
  } catch (error) {
    console.error("Lỗi lưu phim:", error);
    showNotification("Không thể lưu phim!", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Sửa phim
 */
function editMovie(movieId) {
  openMovieModal(movieId);
}

/**
 * Xóa phim
 */
async function deleteMovie(movieId) {
  if (
    !confirm("Bạn có chắc muốn xóa phim này? Hành động này không thể hoàn tác!")
  )
    return;

  if (!db) return;

  try {
    showLoading(true, "Đang xóa...");

    await db.collection("movies").doc(movieId).delete();

    showNotification("Đã xóa phim!", "success");

    // Reload data
    await loadMovies();
    await loadAdminMovies();
  } catch (error) {
    console.error("Lỗi xóa phim:", error);
    showNotification("Không thể xóa phim!", "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Lọc phim trong dropdown chọn phim (Quản lý Tập)
 */
function filterEpisodeMovies() {
  const searchInput = document.getElementById("episodeMovieSearch");
  const select = document.getElementById("selectMovieForEpisodes");
  
  if (!searchInput || !select) return;

  const searchText = searchInput.value.toLowerCase().trim();
  
  // Lọc phim
  const filteredMovies = allMovies.filter(m => 
    m.title.toLowerCase().includes(searchText)
  );

  // Render lại dropdown
  if (filteredMovies.length === 0) {
    select.innerHTML = '<option value="">-- Không tìm thấy phim --</option>';
    select.size = 1; // Thu gọn
  } else {
    // Nếu đang tìm kiếm thì mở rộng danh sách (max 5 dòng) để user dễ thấy
    if (searchText.length > 0) {
       select.size = Math.min(filteredMovies.length + 1, 6);
    } else {
       select.size = 1; // Thu gọn nếu không tìm
    }

    select.innerHTML =
      '<option value="">-- Chọn phim --</option>' +
      filteredMovies
        .map((m) => `<option value="${m.id}">${m.title}</option>`)
        .join("");
        
    // Tự động chọn kết quả đầu tiên để load dữ liệu ngay
    if (searchText.length > 0 && filteredMovies.length > 0) {
        select.value = filteredMovies[0].id; // Chọn phim đầu tiên
        loadEpisodesForMovie(); // Load luôn tập phim
    }
  }
}

/**
 * Load tập phim cho phim đã chọn
 */
async function loadEpisodesForMovie() {
  const movieId = document.getElementById("selectMovieForEpisodes").value;
  const management = document.getElementById("episodesManagement");
  const tbody = document.getElementById("adminEpisodesTable");

  if (!movieId) {
    management.classList.add("hidden");
    return;
  }

  selectedMovieForEpisodes = movieId;
  management.classList.remove("hidden");

  const movie = allMovies.find((m) => m.id === movieId);
  const episodes = movie?.episodes || [];

  if (episodes.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Chưa có tập nào</td></tr>';
    return;
  }

  tbody.innerHTML = episodes
    .map(
      (ep, index) => `
        <tr>
            <td>${ep.episodeNumber}</td>
            <td>${ep.title || "N/A"}</td>
            <td>${ep.youtubeId}</td>
            <td>${ep.duration || "N/A"}</td>
            <td>${ep.quality || "HD"}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editEpisode(${index})" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEpisode(${index})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("");
}
/**
 * Xử lý hiển thị gợi ý khi chọn loại video
 */
/**
 * Thêm một dòng nhập source video
 */
function addSourceInput(type = "youtube", source = "", label = "") {
  const container = document.getElementById("sourceListContainer");
  const id = new Date().getTime() + Math.random().toString(36).substr(2, 9);

  const html = `
    <div class="source-item" id="source-${id}" style="display: grid; grid-template-columns: 100px 100px 1fr auto; gap: 10px; align-items: center; background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">
        <div>
            <input type="text" class="form-input source-label" placeholder="Nhãn (VD: Vietsub)" value="${label || "Bản gốc"}" required>
        </div>
        <div>
            <select class="form-select source-type" onchange="updateSourcePlaceholder('${id}')">
                <option value="youtube" ${type === "youtube" ? "selected" : ""}>YouTube</option>
                <option value="hls" ${type === "hls" ? "selected" : ""}>HLS</option>
                <option value="mp4" ${type === "mp4" ? "selected" : ""}>MP4</option>
            </select>
        </div>
        <div>
            <input type="text" class="form-input source-url" placeholder="Nhập ID hoặc URL" value="${source}" required>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeSourceInput('${id}')">
            <i class="fas fa-trash"></i>
        </button>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", html);
  updateSourcePlaceholder(id);
}

function removeSourceInput(id) {
  document.getElementById(`source-${id}`)?.remove();
}

function updateSourcePlaceholder(id) {
  const item = document.getElementById(`source-${id}`);
  if (!item) return;
  const type = item.querySelector(".source-type").value;
  const input = item.querySelector(".source-url");
  
  if (type === "youtube") input.placeholder = "ID YouTube (VD: dQw4...)";
  else if (type === "hls") input.placeholder = "Link .m3u8";
  else input.placeholder = "Link .mp4";
}

/**
 * Mở modal thêm/sửa tập (Hỗ trợ Multi-Source)
 */
function openEpisodeModal(index = null) {
  const title = document.getElementById("episodeModalTitle");
  const form = document.getElementById("episodeForm");
  const epNumGroup = document.getElementById("episodeNumberGroup");
  const indexInput = document.getElementById("episodeIndex");
  const sourceContainer = document.getElementById("sourceListContainer");

  // Reset form
  form.reset();
  sourceContainer.innerHTML = ""; // Xóa các source cũ

  const movieId = document.getElementById("selectMovieForEpisodes").value;
  const movie = allMovies.find((m) => m.id === movieId);
  const isSingle = movie && movie.type === "single";

  if (epNumGroup) epNumGroup.style.display = isSingle ? "none" : "block";

  if (index !== null) {
    // === EDIT ===
    title.textContent = isSingle ? "Cập Nhật Link Phim" : "Sửa Tập Phim";
    indexInput.value = index;

    const episode = movie?.episodes?.[index];

    if (episode) {
      document.getElementById("episodeNumber").value = episode.episodeNumber;
      document.getElementById("episodeTitle").value = episode.title || "";
      document.getElementById("episodeDuration").value = episode.duration || "";
      document.getElementById("episodeQuality").value = episode.quality || "1080p60";

      // Load Sources
      if (episode.sources && Array.isArray(episode.sources) && episode.sources.length > 0) {
        // Dữ liệu mới (Multi-source)
        episode.sources.forEach(src => {
            addSourceInput(src.type, src.source, src.label);
        });
      } else {
        // Dữ liệu cũ (Single source) -> Convert sang 1 dòng source
        const oldType = episode.videoType || "youtube";
        const oldSource = episode.videoSource || episode.youtubeId || "";
        addSourceInput(oldType, oldSource, "Mặc định");
      }
    }
  } else {
    // === ADD NEW ===
    title.textContent = isSingle ? "Cập Nhật Link Phim" : "Thêm Tập Mới";
    indexInput.value = "";

    if (isSingle) {
      document.getElementById("episodeNumber").value = 1;
      document.getElementById("episodeTitle").value = "Full Movie";
    } else {
      const nextEp = (movie?.episodes?.length || 0) + 1;
      document.getElementById("episodeNumber").value = nextEp;
      document.getElementById("episodeTitle").value = `Tập ${nextEp}`;
    }

    document.getElementById("episodeQuality").value = "1080p60";
    // Thêm 1 dòng trống mặc định
    addSourceInput("youtube", "", "Bản gốc");
  }

  openModal("episodeModal");
}

/**
 * Xử lý submit form tập phim
 */
async function handleEpisodeSubmit(event) {
  event.preventDefault();

  if (!db || !selectedMovieForEpisodes) return;

  const index = document.getElementById("episodeIndex").value;
  
  // Thu thập sources từ UI
  const sourceItems = document.querySelectorAll(".source-item");
  const sources = [];
  
  sourceItems.forEach(item => {
      sources.push({
          label: item.querySelector(".source-label").value,
          type: item.querySelector(".source-type").value,
          source: item.querySelector(".source-url").value
      });
  });

  if (sources.length === 0) {
      showNotification("Phải có ít nhất 1 nguồn video!", "warning");
      return;
  }

  // Tương thích ngược: Lấy source đầu tiên làm default
  const primarySource = sources[0];
  const youtubeId = primarySource.type === "youtube" ? primarySource.source : "";

  const episodeData = {
    episodeNumber: parseInt(document.getElementById("episodeNumber").value),
    title: document.getElementById("episodeTitle").value,
    duration: document.getElementById("episodeDuration").value,
    quality: document.getElementById("episodeQuality").value,
    
    // Dữ liệu cũ (cho app cũ)
    videoType: primarySource.type,
    videoSource: primarySource.source,
    youtubeId: youtubeId,
    
    // Dữ liệu mới
    sources: sources
  };

  try {
    showLoading(true, "Đang lưu...");

    const movieRef = db.collection("movies").doc(selectedMovieForEpisodes);
    const movieDoc = await movieRef.get();
    let episodes = movieDoc.data()?.episodes || [];

    if (index !== "") {
      episodes[parseInt(index)] = episodeData;
    } else {
      episodes.push(episodeData);
    }

    episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

    await movieRef.update({ episodes });

    showNotification("Đã lưu tập phim!", "success");
    closeModal("episodeModal");

    await loadMovies();
    loadEpisodesForMovie();
  } catch (error) {
    console.error("Lỗi lưu episode:", error);
    showNotification("Không thể lưu tập phim!", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Sửa tập phim
 */
function editEpisode(index) {
  openEpisodeModal(index);
}

/**
 * Xóa tập phim
 */
async function deleteEpisode(index) {
  if (!confirm("Bạn có chắc muốn xóa tập này?")) return;

  if (!db || !selectedMovieForEpisodes) return;

  try {
    showLoading(true, "Đang xóa...");

    const movieRef = db.collection("movies").doc(selectedMovieForEpisodes);
    const movieDoc = await movieRef.get();
    let episodes = movieDoc.data()?.episodes || [];

    episodes.splice(index, 1);

    await movieRef.update({ episodes });

    showNotification("Đã xóa tập phim!", "success");

    // Reload
    await loadMovies();
    loadEpisodesForMovie();
  } catch (error) {
    console.error("Lỗi xóa episode:", error);
    showNotification("Không thể xóa tập phim!", "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Populate movie select cho quản lý tập
 */
function populateMovieSelect() {
  const select = document.getElementById("selectMovieForEpisodes");
  select.innerHTML =
    '<option value="">-- Chọn phim --</option>' +
    allMovies
      .map((m) => `<option value="${m.id}">${m.title}</option>`)
      .join("");
}
/**
 * Load danh sách users cho Admin (Đã sửa: Hiện ảnh Avatar thật)
 */
/**
 * Biến toàn cục lưu danh sách users để tìm kiếm
 */
let allAdminUsers = [];

/**
 * Load danh sách users cho Admin (Đã sửa: Hiện ảnh Avatar thật + Tách hàm render)
 */
async function loadAdminUsers() {
  if (!db) return;

  try {
    const snapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();
    
    // Lưu vào biến toàn cục
    allAdminUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Render toàn bộ lần đầu
    renderAdminUsersList(allAdminUsers);

    // Gắn sự kiện tìm kiếm nếu chưa gắn
    const searchInput = document.getElementById("adminSearchUsers");
    const filterRole = document.getElementById("adminFilterRole");

    if (searchInput) {
      searchInput.oninput = filterAdminUsers;
    }
    if (filterRole) {
      filterRole.onchange = filterAdminUsers;
    }

  } catch (error) {
    console.error(error);
  }
}

/**
 * Hàm lọc user theo tên/email và vai trò
 */
function filterAdminUsers() {
  const searchText = document.getElementById("adminSearchUsers").value.toLowerCase().trim();
  const roleFilter = document.getElementById("adminFilterRole").value;

  const filtered = allAdminUsers.filter(user => {
    const matchName = (user.displayName || "").toLowerCase().includes(searchText);
    const matchEmail = (user.email || "").toLowerCase().includes(searchText);
    const matchRole = roleFilter ? user.role === roleFilter : true;

    return (matchName || matchEmail) && matchRole;
  });

  renderAdminUsersList(filtered);
}

/**
 * Hàm render UI danh sách user (Tách ra để tái sử dụng)
 */
function renderAdminUsersList(users) {
  const tbody = document.getElementById("adminUsersTable");
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">Không tìm thấy người dùng nào</td></tr>`;
    return;
  }

  tbody.innerHTML = users
    .map((user) => {
      const date = user.createdAt?.toDate
        ? formatDate(user.createdAt.toDate())
        : "N/A";
      const initial = (user.displayName ||
        user.email ||
        "U")[0].toUpperCase();

      // Avatar Logic
      let avatarHtml =
        user.avatar && user.avatar.startsWith("http")
          ? `<img src="${user.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">`
          : `<div class="comment-avatar" style="width:40px;height:40px;font-size:14px;">${initial}</div>`;

      // 👇 LOGIC TÍNH THỜI HẠN VIP 👇
      const isVip = user.isVip === true;
      let expiryText = "-";

      if (isVip) {
        if (user.vipExpiresAt) {
          // TRƯỜNG HỢP CÓ THỜI HẠN
          const expiryDate = user.vipExpiresAt.toDate 
             ? user.vipExpiresAt.toDate() 
             : new Date(user.vipExpiresAt);
             
          const now = new Date();
          const diffTime = expiryDate - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 0) {
            expiryText = `<span style="color: #00d4ff; font-weight:bold;">Còn ${diffDays} ngày</span>`;
          } else {
            expiryText = `<span style="color: #ff4444; font-weight:bold;">Đã hết hạn</span>`;
          }
        } else {
          // TRƯỜNG HỢP VĨNH VIỄN (vipExpiresAt là null)
          expiryText = `<span class="tag" style="background: linear-gradient(45deg, #00d4ff, #00ff88); color: #000; font-weight:800;">♾️ VĨNH VIỄN</span>`;
        }
      }
      // 👆 HẾT LOGIC TÍNH HẠN 👆

      const vipBadge = isVip
        ? `<span class="status-badge vip"><i class="fas fa-crown"></i> VIP</span>`
        : `<span class="status-badge free">Free</span>`;
      const vipBtnClass = isVip ? "btn-secondary" : "btn-vip-action";
      const vipIcon = isVip ? "fa-ban" : "fa-crown";
      
      const roleClass = user.role === "admin" ? "public" : (user.role === "editor" ? "pending" : "");

      return `
          <tr>
              <td>${avatarHtml}</td>
              <td>${user.email}</td>
              <td>${user.displayName || "N/A"}</td>
              <td><span class="status-badge ${roleClass}">${user.role || "user"}</span></td>
              <td><span class="status-badge ${user.isActive ? "active" : "blocked"}">${user.isActive ? "Hoạt động" : "Bị khóa"}</span></td>
              <td>${vipBadge}</td>
              
              <td style="font-size: 13px;">${expiryText}</td>
              
              <td>${date}</td>
              <td>
                  <button class="btn btn-sm ${vipBtnClass}" onclick="toggleUserVip('${user.id}', ${!isVip})" title="Cấp/Hủy VIP">
                      <i class="fas ${vipIcon}"></i>
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="openUserRoleModal('${user.id}', '${user.email}', '${user.role}')" title="Phân quyền"><i class="fas fa-user-cog"></i></button>
                  <button class="btn btn-sm ${user.isActive ? "btn-danger" : "btn-success"}" onclick="toggleUserStatus('${user.id}', ${!user.isActive})" title="${user.isActive ? "Khóa" : "Mở khóa"}"><i class="fas fa-${user.isActive ? "lock" : "unlock"}"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}', '${user.email}')" title="Xóa vĩnh viễn">
                      <i class="fas fa-trash-alt"></i>
                  </button>
                  </td>
          </tr>
      `;
    })
    .join("");
}
// 👇 HÀM MỚI: CẤP VIP CÓ THỜI HẠN 👇
// 👇 HÀM CẤP VIP (ĐÃ CÓ TÙY CHỌN VĨNH VIỄN) 👇
async function toggleUserVip(userId, setVip) {
  if (!db) return;

  let expiryDate = null; // Mặc định là null (Vĩnh viễn hoặc Hủy)
  let days = 0;
  let message = "";

  if (setVip) {
    // Hướng dẫn Admin nhập -1 để set vĩnh viễn
    const input = prompt(
      "Nhập số ngày VIP (Ví dụ: 30).\n👉 Nhập -1 để cấp VĨNH VIỄN.",
      "30",
    );

    if (input === null) return; // Nếu bấm hủy

    days = parseInt(input);

    if (isNaN(days)) {
      alert("Vui lòng nhập số!");
      return;
    }

    if (days === -1) {
      // TRƯỜNG HỢP VĨNH VIỄN
      expiryDate = null; // Không có ngày hết hạn
      message = "Đã cấp VIP VĨNH VIỄN! ♾️";
    } else if (days > 0) {
      // TRƯỜNG HỢP CÓ THỜI HẠN
      const now = new Date();
      expiryDate = new Date(now.setDate(now.getDate() + days));
      message = `Đã cấp VIP ${days} ngày!`;
    } else {
      alert("Số ngày không hợp lệ!");
      return;
    }
  } else {
    // HỦY VIP
    if (!confirm(`Bạn có chắc muốn HỦY VIP của người dùng này?`)) return;
    message = "Đã hủy VIP thành công!";
  }

  try {
    showLoading(true, "Đang cập nhật...");

    // Cập nhật vào Firestore
    await db
      .collection("users")
      .doc(userId)
      .update({
        isVip: setVip,
        vipSince: setVip
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null,
        vipExpiresAt: expiryDate, // Lưu ngày hết hạn (hoặc null nếu vĩnh viễn)
      });

    showNotification(message, "success");
    await loadAdminUsers();
  } catch (error) {
    console.error("Lỗi cập nhật VIP:", error);
    showNotification("Lỗi cập nhật!", "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Khóa/mở khóa user
 */
async function toggleUserStatus(userId, newStatus) {
  if (!db) return;

  const action = newStatus ? "mở khóa" : "khóa";
  if (!confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) return;

  try {
    showLoading(true, "Đang cập nhật...");

    await db.collection("users").doc(userId).update({
      isActive: newStatus,
    });

    showNotification(`Đã ${action} tài khoản!`, "success");

    await loadAdminUsers();
  } catch (error) {
    console.error("Lỗi toggle user status:", error);
    showNotification("Không thể cập nhật trạng thái!", "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Xóa tài khoản người dùng vĩnh viễn
 */
async function deleteUser(userId, userEmail) {
  // 1. Xác nhận hành động (Vì xóa là mất luôn)
  const confirmMsg = `⚠️ CẢNH BÁO NGUY HIỂM!\n\nBạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản: ${userEmail}?\n\nHành động này sẽ xóa toàn bộ dữ liệu của người dùng này khỏi hệ thống và KHÔNG THỂ khôi phục.`;

  if (!confirm(confirmMsg)) return; // Nếu bấm Hủy thì dừng

  if (!db) return;

  try {
    showLoading(true, "Đang xóa tài khoản...");

    // ✅ CODE MỚI: Chỉ đánh dấu là đã xóa (Soft Delete)
    // Để hệ thống còn nhận diện được là "thằng này đã bị xóa" mà chặn lại
    await db.collection("users").doc(userId).update({
      isDeleted: true, // Cờ đánh dấu đã xóa
      isActive: false, // Khóa luôn cho chắc
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showNotification("Đã xóa tài khoản thành công!", "success");

    // Tải lại bảng
    await loadAdminUsers();
    await loadAdminStats();
  } catch (error) {
    console.error("Lỗi xóa user:", error);
    showNotification("Lỗi: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Mở modal phân quyền user
 */
function openUserRoleModal(userId, email, currentRole) {
  editingUserId = userId;
  document.getElementById("userRoleEmail").textContent = `Email: ${email}`;
  document.getElementById("userRoleSelect").value = currentRole || "user";
  openModal("userRoleModal");
}

/**
 * Cập nhật role user
 */
async function updateUserRole() {
  if (!editingUserId || !db) return;

  const newRole = document.getElementById("userRoleSelect").value;

  try {
    showLoading(true, "Đang cập nhật...");

    await db.collection("users").doc(editingUserId).update({
      role: newRole,
    });

    showNotification("Đã cập nhật quyền người dùng!", "success");
    closeModal("userRoleModal");

    await loadAdminUsers();
  } catch (error) {
    console.error("Lỗi cập nhật role:", error);
    showNotification("Không thể cập nhật quyền!", "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Hiển thị bảng Thể loại (Đã cập nhật nút Sửa/Xóa)
 */
function renderAdminCategories() {
  const tbody = document.getElementById("adminCategoriesTable");
  const searchInput = document.getElementById("adminSearchCategory");
  
  if (!tbody) return;

  let categoriesToRender = allCategories;

  // Lọc nếu có từ khóa tìm kiếm
  if (searchInput) {
    const searchText = searchInput.value.toLowerCase().trim();
    if (searchText) {
      categoriesToRender = allCategories.filter(c => 
        (c.name && c.name.toLowerCase().includes(searchText)) || 
        (c.slug && c.slug.toLowerCase().includes(searchText)) ||
        (c.id && c.id.toLowerCase().includes(searchText))
      );
    }
  }

  if (categoriesToRender.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">Không tìm thấy thể loại nào</td></tr>';
    return;
  }

  tbody.innerHTML = categoriesToRender
    .map((cat, index) => {
      return `
            <tr>
                <td>${index + 1}</td>
                <td>${cat.id}</td>
                <td>${cat.name}</td>
                <td>${cat.slug || "N/A"}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editCategory('${cat.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
}

// ==========================================
// LOGIC QUẢN LÝ THỂ LOẠI (CATEGORY)
// ==========================================

// 1. Mở Modal Thêm/Sửa Thể loại
function openCategoryModal(categoryId = null) {
  const modalTitle = document.getElementById("categoryModalTitle");
  const idInput = document.getElementById("categoryId");
  const nameInput = document.getElementById("categoryName");
  const slugInput = document.getElementById("categorySlug");

  // Reset form
  document.getElementById("categoryForm").reset();

  if (categoryId) {
    // Chế độ Sửa: Điền dữ liệu cũ vào
    const category = allCategories.find((c) => c.id === categoryId);
    if (category) {
      modalTitle.textContent = "Cập nhật Thể Loại";
      idInput.value = category.id;
      nameInput.value = category.name;
      slugInput.value = category.slug || "";
    }
  } else {
    // Chế độ Thêm mới
    modalTitle.textContent = "Thêm Thể Loại Mới";
    idInput.value = "";
  }

  openModal("categoryModal");
}

// 2. Hàm gọi từ nút Sửa
function editCategory(categoryId) {
  openCategoryModal(categoryId);
}

// 3. Xử lý nút Lưu (Submit Form)
async function handleCategorySubmit(event) {
  event.preventDefault(); // Chặn load lại trang

  const categoryId = document.getElementById("categoryId").value;
  const name = document.getElementById("categoryName").value;
  let slug = document.getElementById("categorySlug").value;

  // Nếu không nhập slug thì tự tạo từ tên
  if (!slug) slug = createSlug(name);

  const categoryData = { name, slug };

  try {
    showLoading(true, "Đang lưu...");

    if (categoryId) {
      // Update
      await db.collection("categories").doc(categoryId).update(categoryData);
      showNotification("Đã cập nhật thể loại!", "success");
    } else {
      // Create new (Dùng slug làm ID luôn cho đẹp)
      const newId = slug;
      await db
        .collection("categories")
        .doc(newId)
        .set({ id: newId, ...categoryData });
      showNotification("Đã thêm thể loại mới!", "success");
    }

    closeModal("categoryModal");

    // Load lại dữ liệu mới nhất
    await loadCategories();
    renderAdminCategories();
    populateFilters(); // Cập nhật luôn ô lọc bên ngoài
  } catch (error) {
    console.error("Lỗi lưu category:", error);
    showNotification("Lỗi: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// 4. Xử lý Xóa
async function deleteCategory(categoryId) {
  if (!confirm("Bạn có chắc muốn xóa thể loại này?")) return;

  try {
    showLoading(true, "Đang xóa...");
    await db.collection("categories").doc(categoryId).delete();

    showNotification("Đã xóa thể loại!", "success");

    await loadCategories();
    renderAdminCategories();
    populateFilters();
  } catch (error) {
    console.error("Lỗi xóa category:", error);
    showNotification("Không thể xóa thể loại!", "error");
  } finally {
    showLoading(false);
  }
}

// ============================================
// ADMIN CRUD - COUNTRIES
// ============================================

// ==========================================
// LOGIC QUẢN LÝ QUỐC GIA (COUNTRY)
// ==========================================
/**
 * Hiển thị bảng Quốc gia (Admin) - CÓ NÚT SỬA/XÓA
 */
function renderAdminCountries() {
  const tbody = document.getElementById("adminCountriesTable");
  const searchInput = document.getElementById("adminSearchCountry");
  if (!tbody) return;

  // Nếu không có dữ liệu thì báo trống
  let countriesToRender = allCountries;

  if (searchInput) {
    const searchText = searchInput.value.toLowerCase().trim();
    if (searchText) {
      countriesToRender = allCountries.filter(c => 
        (c.name && c.name.toLowerCase().includes(searchText)) || 
        (c.id && c.id.toLowerCase().includes(searchText))
      );
    }
  }

  if (countriesToRender.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">Không tìm thấy quốc gia nào</td></tr>';
    return;
  }

  // Vẽ từng dòng
  tbody.innerHTML = countriesToRender
    .map((country, index) => {
      return `
            <tr>
                <td>${index + 1}</td>
                <td>${country.id}</td>
                <td><strong>${country.name}</strong></td>
                <td><span class="badge badge-primary">${country.code || "N/A"}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editCountry('${country.id}')" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCountry('${country.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
}

function openCountryModal(countryId = null) {
  const modalTitle = document.getElementById("countryModalTitle");
  const idInput = document.getElementById("countryId");
  const nameInput = document.getElementById("countryName");
  const codeInput = document.getElementById("countryCode");

  document.getElementById("countryForm").reset();

  if (countryId) {
    const country = allCountries.find((c) => c.id === countryId);
    if (country) {
      modalTitle.textContent = "Cập nhật Quốc Gia";
      idInput.value = country.id;
      nameInput.value = country.name;
      codeInput.value = country.code || country.id.toUpperCase();
      codeInput.disabled = true; // Không cho sửa mã
    }
  } else {
    modalTitle.textContent = "Thêm Quốc Gia Mới";
    idInput.value = "";
    codeInput.disabled = false;
  }

  openModal("countryModal");
}

function editCountry(countryId) {
  openCountryModal(countryId);
}

async function handleCountrySubmit(event) {
  event.preventDefault();

  const countryId = document.getElementById("countryId").value;
  const name = document.getElementById("countryName").value;
  const code = document.getElementById("countryCode").value.toUpperCase();

  const countryData = { name, code };

  try {
    showLoading(true, "Đang lưu...");

    if (countryId) {
      await db.collection("countries").doc(countryId).update(countryData);
    } else {
      const newId = code.toLowerCase(); // ID là mã quốc gia viết thường (vn, us, kr...)
      await db
        .collection("countries")
        .doc(newId)
        .set({ id: newId, ...countryData });
    }

    showNotification("Đã lưu quốc gia!", "success");
    closeModal("countryModal");

    await loadCountries();
    renderAdminCountries();
    populateFilters();
  } catch (error) {
    console.error("Lỗi lưu country:", error);
    showNotification("Lỗi: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

async function deleteCountry(countryId) {
  if (!confirm("Bạn có chắc muốn xóa quốc gia này?")) return;

  try {
    showLoading(true, "Đang xóa...");
    await db.collection("countries").doc(countryId).delete();
    showNotification("Đã xóa quốc gia!", "success");
    await loadCountries();
    renderAdminCountries();
    populateFilters();
  } catch (error) {
    console.error("Lỗi xóa country:", error);
    showNotification("Lỗi xóa!", "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Load danh sách bình luận (Đã sửa lỗi ID để xóa được ngay)
 */
async function loadAdminComments() {
  const tbody = document.getElementById("adminCommentsTable");
  if (!tbody || !db) return;

  if (!db) return;

  try {
    const snapshot = await db
      .collection("comments")
      .orderBy("createdAt", "desc")
      .get();
    
    // Lưu vào biến toàn cục
    allAdminComments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Render toàn bộ
    renderAdminCommentsList(allAdminComments);

  } catch (error) {
    console.error(error);
  }
}

/**
 * Hàm lọc comment theo nội dung và đánh giá
 */
function filterAdminComments() {
  const searchText = document.getElementById("adminSearchComments").value.toLowerCase().trim();
  const ratingFilter = document.getElementById("adminFilterCommentRating").value;

  const filtered = allAdminComments.filter(comment => {
    // Resolve tên phim chuẩn từ ID (giống logic render)
    let movieName = comment.movieTitle || "";
    if (comment.movieId && typeof allMovies !== 'undefined') {
        const foundMovie = allMovies.find(m => m.id === comment.movieId);
        if (foundMovie) movieName = foundMovie.title;
    }

    const matchContent = (comment.content || "").toLowerCase().includes(searchText);
    const matchUser = (comment.userName || "").toLowerCase().includes(searchText);
    const matchMovie = (movieName || "").toLowerCase().includes(searchText);
    
    const matchRating = ratingFilter ? parseInt(comment.rating) === parseInt(ratingFilter) : true;

    return (matchContent || matchUser || matchMovie) && matchRating;
  });

  renderAdminCommentsList(filtered);
}

/**
 * Render danh sách comment (UI)
 */
function renderAdminCommentsList(comments) {
  const tbody = document.getElementById("adminCommentsTable");
  if (!tbody) return;

  if (comments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Không tìm thấy bình luận nào</td></tr>`;
    return;
  }

  tbody.innerHTML = comments
    .map((comment) => {
      const date = comment.createdAt?.toDate
        ? formatDate(comment.createdAt.toDate())
        : "N/A";
      
      // FIX: Tìm tên phim từ allMovies nếu comment không có sẵn movieTitle
      let movieDisplay = comment.movieTitle || "N/A";
      if (comment.movieId && typeof allMovies !== 'undefined') {
          const foundMovie = allMovies.find(m => m.id === comment.movieId);
          if (foundMovie) {
              movieDisplay = foundMovie.title;
          }
      }

      const ratingStars = Array(5)
        .fill(0)
        .map(
          (_, i) =>
            `<i class="fas fa-star ${i < comment.rating ? "text-warning" : "text-muted"}"></i>`,
        )
        .join("");

      // Avatar User (Giả lập from name)
      const initial = (comment.userName || "U")[0].toUpperCase();
      const avatarHtml = comment.userAvatar
        ? `<img src="${comment.userAvatar}" class="comment-avatar-small" style="width:30px;height:30px;border-radius:50%">`
        : `<div class="comment-avatar-small" style="width:30px;height:30px;background:#E50914;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">${initial}</div>`;

      return `
          <tr>
              <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                      ${avatarHtml}
                      <span>${comment.userName || "Ẩn danh"}</span>
                  </div>
              </td>
              <td>${movieDisplay}</td>
              <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${comment.content}">${comment.content}</td>
              <td style="color:#ffaa00; font-size:12px;">⭐ ${comment.rating}</td>
              <td>${date}</td>
              <td>
                  <button class="btn btn-sm btn-danger" onclick="deleteComment('${comment.id}')">
                      <i class="fas fa-trash"></i>
                  </button>
              </td>
          </tr>
      `;
    })
    .join("");
}
/**
 * Xóa bình luận Admin (Xóa dòng ngay lập tức)
 */
async function deleteAdminComment(commentId) {
  if (!confirm("Bạn có chắc muốn xóa bình luận này vĩnh viễn?")) return;

  try {
    showLoading(true, "Đang xóa...");

    // 1. Xóa trong Database
    await db.collection("comments").doc(commentId).delete();

    // 2. Xóa dòng đó trên giao diện NGAY LẬP TỨC
    const row = document.getElementById(`row-comment-${commentId}`);
    if (row) {
      // Hiệu ứng mờ dần cho đẹp
      row.style.transition = "all 0.5s ease";
      row.style.opacity = "0";
      row.style.backgroundColor = "#ffcccc"; // Nháy đỏ nhẹ

      // Đợi 0.5s rồi xóa hẳn khỏi HTML
      setTimeout(() => row.remove(), 500);
    }

    showNotification("Đã xóa bình luận!", "success");
  } catch (error) {
    console.error("Lỗi xóa comment:", error);
    showNotification("Lỗi xóa!", "error");
  } finally {
    showLoading(false);
  }
}
/**
 * Load lịch sử giao dịch (Đã cập nhật hiện giờ chi tiết)
 */
async function loadAdminTransactions() {
  const tbody = document.getElementById("adminTransactionsTable");
  if (!tbody) return;

  if (!db) return;

  try {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';

    const snapshot = await db
      .collection("transactions")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center">Chưa có giao dịch nào</td></tr>';
      return;
    }

    tbody.innerHTML = snapshot.docs
      .map((doc) => {
        const tx = doc.data();

        // 👇 SỬA DÒNG NÀY: Dùng formatDateTime thay vì formatDate
        const date = tx.createdAt ? formatDateTime(tx.createdAt) : "N/A";

        // Format trạng thái màu sắc
        let statusBadge = "";
        if (tx.status === "completed")
          statusBadge = '<span class="status-badge active">Thành công</span>';
        else if (tx.status === "pending")
          statusBadge = '<span class="status-badge warning">Đang chờ</span>';
        else
          statusBadge = `<span class="status-badge blocked">${tx.status}</span>`;

        return `
            <tr>
                <td>
                    <a href="https://cronoscan.com/tx/${tx.txHash}" target="_blank" style="color:var(--accent-primary); text-decoration:none;">
                        ${tx.txHash ? tx.txHash.substring(0, 10) + "..." : "N/A"} <i class="fas fa-external-link-alt" style="font-size:10px;"></i>
                    </a>
                </td>
                <td title="${tx.userId}">${tx.userId ? tx.userId.substring(0, 8) + "..." : "N/A"}</td>
                <td><span style="font-weight:bold; color:#fff;">${tx.package || "VIP"}</span></td>
                <td style="color:#00ff88; font-weight:bold;">${formatNumber(tx.amount || 0)} CRO</td>
                <td>${statusBadge}</td>
                
                <td style="font-size: 13px;">${date}</td>
            </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Lỗi load transactions:", error);
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
  }
}

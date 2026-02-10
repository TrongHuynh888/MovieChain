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

    // 2. Render Bảng Quản lý Phim Chính
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
      document.getElementById("moviePart").value = movie.part || "";
      document.getElementById("moviePoster").value = movie.posterUrl;
      document.getElementById("movieCategory").value = movie.category || "";
      document.getElementById("movieCountry").value = movie.country || "";
      document.getElementById("movieYear").value = movie.year || "";
      document.getElementById("moviePrice").value = movie.price || 0;
      document.getElementById("movieDescription").value =
        movie.description || "";
      document.getElementById("movieType").value = movie.type || "series"; // Mặc định là phim bộ nếu chưa có
      document.getElementById("movieTags").value = (movie.tags || []).join(
        ", ",
      );
      document.getElementById("movieStatus").value = movie.status || "public";
    }
  } else {
    // Add mode
    title.textContent = "Thêm Phim Mới";
    form.reset();
    document.getElementById("movieId").value = "";
    document.getElementById("movieYear").value = new Date().getFullYear();
    document.getElementById("movieType").value = "series"; // Mặc định khi thêm mới
    document.getElementById("moviePart").value = "";
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
    price: parseFloat(document.getElementById("moviePrice").value),
    description: document.getElementById("movieDescription").value,
    type: document.getElementById("movieType").value,
    part: document.getElementById("moviePart").value.trim(),
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
 * Mở modal thêm/sửa tập (Đã nâng cấp cho Phim Lẻ)
 */
function openEpisodeModal(index = null) {
  const title = document.getElementById("episodeModalTitle");
  const form = document.getElementById("episodeForm");
  const epNumGroup = document.getElementById("episodeNumberGroup");
  const indexInput = document.getElementById("episodeIndex");

  // Reset form trước tiên để xóa dữ liệu cũ
  form.reset();

  // 1. Lấy phim đang chọn (Đảm bảo biến selectedMovieForEpisodes đã được khai báo)
  // Nếu bạn chưa khai báo biến này, hãy dùng: document.getElementById('selectMovieForEpisodes').value
  const movieId = document.getElementById("selectMovieForEpisodes").value;
  const movie = allMovies.find((m) => m.id === movieId);

  const isSingle = movie && movie.type === "single";

  // 2. Xử lý giao diện Lẻ/Bộ
  if (epNumGroup) {
    epNumGroup.style.display = isSingle ? "none" : "block";
  }

  // 3. Xử lý Dữ liệu
  if (index !== null) {
    // === CHẾ ĐỘ SỬA (EDIT) ===
    title.textContent = isSingle ? "Cập Nhật Link Phim" : "Sửa Tập Phim";
    indexInput.value = index;

    const episode = movie?.episodes?.[index];

    if (episode) {
      document.getElementById("episodeNumber").value = episode.episodeNumber;
      document.getElementById("episodeTitle").value = episode.title || "";
      document.getElementById("episodeYoutubeId").value =
        episode.youtubeId || "";
      document.getElementById("episodeDuration").value = episode.duration || "";

      // Nếu tập cũ chưa có quality, mặc định lấy 1080p60
      document.getElementById("episodeQuality").value =
        episode.quality || "1080p60";
    }
  } else {
    // === CHẾ ĐỘ THÊM MỚI (ADD) ===
    title.textContent = isSingle ? "Cập Nhật Link Phim" : "Thêm Tập Mới";
    indexInput.value = ""; // Xóa index để biết là đang thêm mới

    if (isSingle) {
      // Phim lẻ: Tự điền Tập 1
      document.getElementById("episodeNumber").value = 1;
      document.getElementById("episodeTitle").value = "Full Movie";
    } else {
      // Phim bộ: Tự tính tập tiếp theo
      const nextEp = (movie?.episodes?.length || 0) + 1;
      document.getElementById("episodeNumber").value = nextEp;
      document.getElementById("episodeTitle").value = `Tập ${nextEp}`; // Tự điền tên tập
    }

    // 👉 QUAN TRỌNG: Luôn set mặc định là 1080p60 khi thêm mới
    document.getElementById("episodeQuality").value = "1080p60";
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
  const episodeData = {
    episodeNumber: parseInt(document.getElementById("episodeNumber").value),
    title: document.getElementById("episodeTitle").value,
    youtubeId: document.getElementById("episodeYoutubeId").value,
    duration: document.getElementById("episodeDuration").value,
    quality: document.getElementById("episodeQuality").value,
  };

  try {
    showLoading(true, "Đang lưu...");

    const movieRef = db.collection("movies").doc(selectedMovieForEpisodes);
    const movieDoc = await movieRef.get();
    let episodes = movieDoc.data()?.episodes || [];

    if (index !== "") {
      // Update
      episodes[parseInt(index)] = episodeData;
    } else {
      // Add
      episodes.push(episodeData);
    }

    // Sort by episode number
    episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

    await movieRef.update({ episodes });

    showNotification("Đã lưu tập phim!", "success");
    closeModal("episodeModal");

    // Reload
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
async function loadAdminUsers() {
  const tbody = document.getElementById("adminUsersTable");
  if (!db) return;

  try {
    const snapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

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
            const expiryDate = user.vipExpiresAt.toDate();
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

        return `
            <tr>
                <td>${avatarHtml}</td>
                <td>${user.email}</td>
                <td>${user.displayName || "N/A"}</td>
                <td><span class="status-badge ${user.role === "admin" ? "public" : ""}">${user.role || "user"}</span></td>
                <td><span class="status-badge ${user.isActive ? "active" : "blocked"}">${user.isActive ? "Hoạt động" : "Bị khóa"}</span></td>
                <td>${vipBadge}</td>
                
                <td style="font-size: 13px;">${expiryText}</td>
                
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm ${vipBtnClass}" onclick="toggleUserVip('${user.id}', ${!isVip})">
                        <i class="fas ${vipIcon}"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="openUserRoleModal('${user.id}', '${user.email}', '${user.role}')"><i class="fas fa-user-cog"></i></button>
                    <button class="btn btn-sm ${user.isActive ? "btn-danger" : "btn-success"}" onclick="toggleUserStatus('${user.id}', ${!user.isActive})"><i class="fas fa-${user.isActive ? "lock" : "unlock"}"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}', '${user.email}')" title="Xóa vĩnh viễn">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    </td>
            </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error(error);
  }
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
  if (!tbody) return;

  if (allCategories.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center">Chưa có dữ liệu</td></tr>';
    return;
  }

  tbody.innerHTML = allCategories
    .map((cat, index) => {
      return `
            <tr>
                <td>${index + 1}</td>
                <td>${cat.id}</td>
                <td>${cat.name}</td>
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
  if (!tbody) return;

  // Nếu không có dữ liệu thì báo trống
  if (allCountries.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">Chưa có dữ liệu quốc gia</td></tr>';
    return;
  }

  // Vẽ từng dòng
  tbody.innerHTML = allCountries
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

  try {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';

    const snapshot = await db
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center">Không có bình luận nào</td></tr>';
      return;
    }

    tbody.innerHTML = snapshot.docs
      .map((doc) => {
        const comment = doc.data();
        const date = comment.createdAt ? formatDate(comment.createdAt) : "N/A";

        // Tìm tên phim
        const movie = allMovies.find((m) => m.id === comment.movieId);
        const movieName = movie ? movie.title : `ID: ${comment.movieId}`;

        const initial = (comment.userName || "U")[0].toUpperCase();
        const avatarHtml =
          comment.userAvatar && comment.userAvatar.startsWith("http")
            ? `<img src="${comment.userAvatar}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; margin-right: 8px;" onerror="this.src='https://ui-avatars.com/api/?name=${initial}&background=random'">`
            : `<div style="display:inline-block; width:30px; height:30px; line-height:30px; text-align:center; background:#666; color:#fff; border-radius:50%; margin-right:8px; font-size:12px; font-weight:bold;">${initial}</div>`;

        // 👇 QUAN TRỌNG: Thêm id="row-comment-${doc.id}" vào thẻ tr
        return `
            <tr id="row-comment-${doc.id}">
                <td style="display:flex; align-items:center;">${avatarHtml} ${escapeHtml(comment.userName || "Ẩn danh")}</td>
                <td>${escapeHtml(movieName)}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(comment.content)}
                </td>
                <td><span class="star-rating"><i class="fas fa-star text-warning"></i> ${comment.rating || 0}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdminComment('${doc.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Lỗi load comments:", error);
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
  }
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

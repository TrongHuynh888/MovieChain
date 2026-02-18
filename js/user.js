// 1. Mở Modal và điền dữ liệu cũ vào ô nhập
function openProfileModal() {
  if (!currentUser) return;

  // Hiển thị ảnh và tên hiện tại (Text tĩnh)
  document.getElementById("profileCurrentAvatar").src =
    currentUser.photoURL || "https://placehold.co/100";
  document.getElementById("profileDisplayName").textContent =
    currentUser.displayName;
  document.getElementById("profileEmail").textContent = currentUser.email;

  // 👇 ĐIỀN DỮ LIỆU CŨ VÀO Ô NHẬP (INPUT) ĐỂ SỬA 👇
  document.getElementById("profileNameInput").value =
    currentUser.displayName || ""; // Điền tên cũ
  document.getElementById("profileNewAvatar").value =
    currentUser.photoURL || ""; // Điền link ảnh cũ

  openModal("profileModal");
}

// 2. Lưu thay đổi (Cập nhật cả Tên và Avatar)
async function updateUserProfile() {
  const newName = document.getElementById("profileNameInput").value.trim();
  const newAvatar = document.getElementById("profileNewAvatar").value.trim();

  // Kiểm tra dữ liệu
  if (!newName) {
    showNotification("Tên không được để trống!", "warning");
    return;
  }

  try {
    showLoading(true, "Đang cập nhật hồ sơ...");

    // 1. Cập nhật Firebase Auth (Dữ liệu đăng nhập)
    await currentUser.updateProfile({
      displayName: newName,
      photoURL: newAvatar,
    });

    // 2. Cập nhật Firestore (Dữ liệu người dùng trong database)
    if (db) {
      await db.collection("users").doc(currentUser.uid).update({
        displayName: newName,
        avatar: newAvatar,
      });
    }

    showNotification("Cập nhật hồ sơ thành công!", "success");
    closeModal("profileModal");

    // 3. Cập nhật giao diện ngay lập tức (Không cần F5)
    updateAuthUI(true);
  } catch (error) {
    console.error("Lỗi cập nhật profile:", error);
    showNotification("Lỗi: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}
/* Cập nhật trong js/user.js */

/**
 * Hàm Toggle Like với hiệu ứng tức thì (Optimistic UI)
 */
async function toggleFavorite(movieId) {
  // 1. Kiểm tra đăng nhập
  if (!currentUser) {
    showNotification("Vui lòng đăng nhập để thích phim!", "warning");
    openAuthModal();
    return;
  }

  // 2. Xử lý logic ĐẢO NGƯỢC trạng thái ngay lập tức (Không chờ server)
  const index = currentUser.favorites.indexOf(movieId);
  let isAdding = false;

  if (index === -1) {
    // Chưa thích -> Thêm vào
    currentUser.favorites.push(movieId);
    isAdding = true;
    showNotification("Đã thêm vào danh sách yêu thích", "success");
  } else {
    // Đã thích -> Bỏ ra
    currentUser.favorites.splice(index, 1);
    isAdding = false;
    showNotification("Đã xóa khỏi danh sách yêu thích", "info");
  }

  // 3. CẬP NHẬT GIAO DIỆN NGAY LẬP TỨC (Tìm mọi nút like của phim này để đổi màu)
  const buttons = document.querySelectorAll(`.btn-like-${movieId}`);
  buttons.forEach((btn) => {
    const icon = btn.querySelector("i");

    if (isAdding) {
      // Đổi sang trạng thái ĐÃ THÍCH (Đỏ, Tim đặc)
      btn.classList.add("liked");
      btn.style.color = "#e50914";
      btn.style.borderColor = "#e50914";
      if (icon) {
        icon.classList.remove("far"); // Tim rỗng
        icon.classList.add("fas"); // Tim đặc
      }
    } else {
      // Đổi sang trạng thái CHƯA THÍCH (Trắng, Tim rỗng)
      btn.classList.remove("liked");
      btn.style.color = ""; // Về mặc định
      btn.style.borderColor = ""; // Về mặc định
      if (icon) {
        icon.classList.remove("fas"); // Tim đặc
        icon.classList.add("far"); // Tim rỗng
      }
    }
  });

  // 4. Gửi dữ liệu lên Server (Chạy ngầm - Sync Background)
  try {
    await db.collection("users").doc(currentUser.uid).update({
      favorites: currentUser.favorites,
    });
    // Thành công thì không cần làm gì nữa vì giao diện đã đổi rồi
  } catch (error) {
    console.error("Lỗi cập nhật Favorite:", error);
    // Nếu lỗi thì hoàn tác lại giao diện (Rất hiếm khi xảy ra)
    showNotification("Lỗi kết nối! Vui lòng thử lại.", "error");
    // ...Logic hoàn tác nếu cần...
  }
}

/**
 * 2. Lưu lịch sử xem (Gọi hàm này khi bấm Xem phim hoặc chọn Tập)
 */
async function saveWatchHistory(movieId, episodeIndex) {
  if (!currentUser || !db) return;
  try {
    await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("history")
      .doc(movieId)
      .set(
        {
          movieId: movieId,
          lastEpisode: episodeIndex,
          // Dùng serverTimestamp để sắp xếp phim nào mới xem lên đầu
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastWatchedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    console.log(`✅ Đã lưu: Phim ${movieId} - Tập ${episodeIndex + 1}`);
  } catch (error) {
    console.error("Lỗi lưu lịch sử:", error);
  }
}

/**
 * 3. Tải danh sách phim (Yêu thích hoặc Lịch sử) và hiển thị ra Modal
 */
// Thay thế hàm openLibraryModal cũ bằng hàm này
async function openLibraryModal(type) {
  if (!currentUser) return;

  const modalTitle = document.getElementById("libraryModalTitle");
  const container = document.getElementById("libraryList");

  // Reset tiêu đề & hiển thị loading
  container.innerHTML =
    '<div class="loading-spinner" style="margin: 20px auto;"></div>';
  openModal("libraryModal");

  let moviesToList = [];

  try {
    if (type === "favorites") {
      modalTitle.textContent = "Phim Yêu Thích ❤️";
      const favIds = currentUser.favorites || [];
      moviesToList = allMovies.filter((m) => favIds.includes(m.id));
    } else if (type === "history") {
      modalTitle.textContent = "Lịch Sử Đã Xem 🕒";
      if (db) {
        const snapshot = await db
          .collection("users")
          .doc(currentUser.uid)
          .collection("history")
          .orderBy("lastWatchedAt", "desc")
          .limit(50)
          .get();

        const historyData = snapshot.docs.map((doc) => doc.data());
        moviesToList = historyData
          .map((h) => {
            const movie = allMovies.find((m) => m.id === h.movieId);
            return movie ? { 
              ...movie, 
              _lastEpisode: h.lastEpisode,
              _minutesWatched: h.lastMinutesWatched || 0,
              _timeWatched: h.lastTimeWatched || 0
            } : null;
          })
          .filter((m) => m !== null);
      }
    }

    // --- RENDER GIAO DIỆN ---
    if (moviesToList.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
            <i class="far fa-folder-open" style="font-size: 40px; margin-bottom: 10px;"></i>
            <p>Danh sách trống</p>
        </div>`;
    } else {
      container.innerHTML = moviesToList
        .map((movie) => {
          // Nút xóa (chỉ hiện ở tab Yêu thích)
          const removeBtn =
            type === "favorites"
              ? `<button class="btn-remove-fav" 
                       onclick="event.stopPropagation(); removeFavoriteFromModal('${movie.id}', this)" 
                       title="Bỏ yêu thích">
                   <i class="fas fa-times"></i>
                 </button>`
              : "";

          // Thông tin phụ (Tập phim hoặc chất lượng)
          let metaInfo = `<span>${movie.year || "2026"}</span>`;
          let progressBar = '';
          if (type === "history" && movie._lastEpisode !== undefined) {
            const minutesWatched = movie._minutesWatched || 0;
            const timeWatched = movie._timeWatched || 0;
            // ✅ SỬA: Hiển thị thanh progress dựa trên thời gian đã xem
            // Vì không có duration nên hiển thị thanh tương đối với mốc 60 phút (max 100%)
            // Hoặc hiển thị thanh màu vàng cố định để cho biết đã xem
            const progressPercent = Math.min(Math.round((minutesWatched / 60) * 100), 100);
            progressBar = minutesWatched > 0 ? `
                <div class="watch-progress-bar" style="position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2);">
                    <div style="width: ${progressPercent}%; height: 100%; background: #fcd535; transition: width 0.3s ease;"></div>
                </div>
            ` : '';
            metaInfo = `<span style="color: #fcd535; font-size: 10px;">
                            <i class="fas fa-play-circle"></i> Tập ${movie._lastEpisode + 1}
                            ${minutesWatched > 0 ? `• ${minutesWatched} phút` : ''}
                         </span>`;
          } else {
            metaInfo += `<span style="color: var(--accent-secondary)">${movie.quality || "HD"}</span>`;
          }

          // 👇 ĐÃ THÊM ONERROR VÀO THẺ IMG BÊN DƯỚI 👇
          // Click vào thẻ phim sẽ truyền cả thời gian đã xem
          return `
            <div class="card" onclick="viewMovieFromHistory('${movie.id}', ${movie._lastEpisode || 0}, ${movie._timeWatched || 0})">
                <div class="card-image">
                    ${removeBtn}
                    <img src="${movie.posterUrl}" 
                         alt="${movie.title}" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://placehold.co/300x450/2a2a3a/FFFFFF?text=NO+POSTER';">
                    ${progressBar}
                </div>
                
                <div class="card-body">
                    <h4 class="card-title" title="${movie.title}">${movie.title}</h4>
                    <div class="card-meta">
                        ${metaInfo}
                    </div>
                </div>
            </div>`;
        })
        .join("");
    }
  } catch (error) {
    console.error("Lỗi tải thư viện:", error);
    container.innerHTML =
      '<p class="text-error text-center">Có lỗi xảy ra khi tải dữ liệu.</p>';
  }
}
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
 * Render danh sách yêu thích (Phiên bản Lite - Không Popup)
 * Giúp hiển thị đẹp trong Modal chật hẹp
 */
function renderFavorites() {
  const container = document.getElementById("libraryList");
  if (!container) return;

  if (
    !currentUser ||
    !currentUser.favorites ||
    currentUser.favorites.length === 0
  ) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
        <i class="far fa-folder-open" style="font-size: 40px; margin-bottom: 10px;"></i>
        <p>Danh sách trống</p>
      </div>`;
    return;
  }

  const favMovies = allMovies.filter((m) =>
    currentUser.favorites.includes(m.id),
  );

  // 👇 ĐÃ THÊM ONERROR VÀO THẺ IMG BÊN DƯỚI 👇
  container.innerHTML = favMovies
    .map(
      (movie) => `
    <div class="card">
        <div class="card-image" style="padding-top: 140%; position: relative;">
            <img src="${movie.posterUrl}" 
                 style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://placehold.co/300x450/2a2a3a/FFFFFF?text=NO+POSTER';">
                 
            <button class="btn-remove-fav" onclick="removeFavoriteFromModal('${movie.id}', this)" title="Bỏ thích">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="card-body" style="padding: 8px;">
            <h5 style="font-size: 13px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Montserrat', sans-serif;">
                ${movie.title}
            </h5>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-top: 4px;">
                <span>${movie.year || "2026"}</span>
                <span style="color: var(--accent-secondary)">${movie.quality || "HD"}</span>
            </div>
        </div>
    </div>
  `,
    )
    .join("");
}

/**
 * WATCH PARTY MODULE (MASTER VERSION - INTERNET READY)
 * - Đã tích hợp sẵn API Key Metered của bạn để xuyên tường lửa 4G/Wifi
 * - Fix triệt để lỗi Mic/Loa và Avatar
 */

let currentRoomId = null;
let roomUnsubscribe = null;
let chatUnsubscribe = null;
let membersUnsubscribe = null;
let player = null;
let isHost = false;
let lastSyncTime = 0;
const SYNC_THRESHOLD = 2;
let latestRoomData = null;
let allWatchRooms = []; // Lưu trữ tất cả các phòng để lọc cục bộ
let currentRoomFilter = 'all'; // 'all', 'public', 'private'

// --- VOICE CHAT VARIABLES ---
let myPeer = null;
let myStream = null;
let peers = {};
let isMicEnabled = false; // Mặc định tắt Mic
let globalAudioContext = null;

// QUẢN LÝ ÂM THANH
let isDeafened = false; // Mặc định nghe được
let localMutedPeers = new Set();
let peerVolumeLevels = {}; // Lưu mức âm lượng tùy chỉnh cho từng peer (0-2, mặc định 1)
let globalVoiceVolume = 1; // Âm lượng tổng cho tất cả mic (0-2, mặc định 1 = 100%)
let scheduleSyncInterval = null;
let currentScheduledTime = null;

// API KEY CỦA BẠN (Đã điền sẵn)
const METERED_API_KEY = "Tp6L8mYZolvVJ2ZwHQnmnZpt3kYvU8uEHJOozyjQtdT15XPE";
const APP_NAME = "tramphim";

// --- iOS Audio Ducking Workaround ---
function handleiOSAudio() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
    if (!globalAudioContext) globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().catch(() => {});
    }
    // Boost volume nội bộ nếu đang có player
    if (player && player.tagName === "VIDEO") {
        player.volume = 1; 
    }
  }
}
document.addEventListener('touchstart', handleiOSAudio, { once: true });
document.addEventListener('click', handleiOSAudio, { once: true });
// -------------------------------------

// ==========================================
// 1. MODULE LOADER
// ==========================================
async function initWatchPartyModule() {
  console.log("🚀 Đang tải module Watch Party (Internet Version)...");

  if (!document.getElementById("watchPartyPage")) {
    try {
      // Viết lại thành thế này:
const response = await fetch("./components/watch-party.html?v=" + new Date().getTime());
      if (!response.ok) throw new Error("Không tìm thấy file giao diện");
      const html = await response.text();
      document
        .getElementById("mainContent")
        .insertAdjacentHTML("beforeend", html);
    } catch (error) {
      console.error("Lỗi tải Watch Party:", error);
      return;
    }
  }

  const navMenu = document.getElementById("navMenu");
  if (!navMenu.querySelector('[data-page="watchParty"]')) {
    const link = document.createElement("a");
    link.href = "#";
    link.className = "nav-link";
    link.dataset.page = "watchParty";
    link.innerHTML = '<i class="fas fa-users"></i> Xem Chung';
    link.onclick = (e) => {
      e.preventDefault();
      loadRooms();
      showPage("watchParty");
    };
    const adminLink = document.getElementById("adminNavLink");
    navMenu.insertBefore(link, adminLink);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const inviteRoomId = urlParams.get("room");
  if (inviteRoomId) {
    setTimeout(() => {
      showPage("watchParty");
      joinRoom(inviteRoomId, "public");
    }, 2000);
  }
}

initWatchPartyModule();

// ==========================================
// 2. CORE LOGIC (ROOMS)
// ==========================================
// Biến để lưu listener của room list
let roomsUnsubscribe = null;
let roomRefreshInterval = null;

async function loadRooms() {
  const container = document.getElementById("roomList");
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    // Hủy listener cũ nếu có
    if (roomsUnsubscribe) {
        roomsUnsubscribe();
    }
    
    // Lấy thông số thời gian tự xóa phòng từ configs
    const wpConfigDoc = await db.collection("configs").doc("watchParty").get();
    const wpConfig = wpConfigDoc.exists ? wpConfigDoc.data() : {};
    const autoDeleteHoursLimit = wpConfig.autoDeleteHours || 6;
    
    // Thiết lập Interval tự động làm mới giao diện và xóa phòng cũ (mỗi 1 phút)
    if (roomRefreshInterval) {
      clearInterval(roomRefreshInterval);
    }
    roomRefreshInterval = setInterval(() => {
      if (allWatchRooms && allWatchRooms.length > 0) {
        let needsRender = false;
        const now = new Date();
        
        allWatchRooms.forEach(room => {
          const { isActuallyEnded, endedAt } = checkIfRoomEnded(room);
          if (isActuallyEnded && endedAt) {
            const endDate = endedAt.toDate ? endedAt.toDate() : new Date(endedAt);
            const diffHours = (now - endDate) / (1000 * 60 * 60);
            
            // Nếu phòng đã kết thúc hơn số giờ thiết lập (mặc định 6 tiếng)
            if (diffHours >= autoDeleteHoursLimit) {
              // Tự động xóa khỏi Database nếu là Host hoặc Admin
              if (currentUser && (currentUser.uid === room.hostId || (typeof isAdmin !== 'undefined' && isAdmin))) {
                console.log(`[Watch Party] Đang tự động xóa phòng ${room.name} (${room.id}) do đã kết thúc hơn ${autoDeleteHoursLimit} tiếng.`);
                db.collection("watchRooms").doc(room.id).delete().catch(e => console.error("Lỗi xóa phòng tự động:", e));
              }
            }
          }
        });
        
        // Luôn trigger filter (và render) để các tag "Sắp chiếu", "LIVE" tự cập nhật sang "Đã kết thúc" mà ko cần click
        filterWatchRooms();
      }
    }, 60000);

    roomsUnsubscribe = db
      .collection("watchRooms")
      .orderBy("createdAt", "desc")
      .limit(20)
      .onSnapshot((snapshot) => {
        container.innerHTML = "";
        if (snapshot.empty) {
          container.innerHTML =
            '<p class="text-center text-muted">Chưa có phòng nào. Hãy tạo phòng mới!</p>';
          return;
        }

        allWatchRooms = []; // 🔥 QUAN TRỌNG: Làm mới mảng để tránh lặp lại phòng cũ
        snapshot.forEach((doc) => {
          const room = { id: doc.id, ...doc.data() };
          allWatchRooms.push(room);
        });

        filterWatchRooms(); // Gọi hàm lọc và render
      }, (error) => {
        console.error("Lỗi realtime load phòng:", error);
        container.innerHTML = '<p class="text-center text-danger">Lỗi kết nối máy chủ.</p>';
      });
  } catch (error) {
    console.error("Lỗi load phòng:", error);
  }
}

/* Hàm render danh sách phòng (tách ra để dùng cho việc lọc) */
function renderWatchRooms(rooms) {
  const container = document.getElementById("roomList");
  if (!container) return;
  
  if (!rooms || rooms.length === 0) {
    container.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1; padding: 40px;">Không tìm thấy phòng nào phù hợp.</p>';
    return;
  }

  let htmlContent = "";
  rooms.forEach((room) => {
    const isPrivate = room.type === "private";
    const count = room.memberCount || 0;
    const posterUrl = room.moviePoster || 'https://via.placeholder.com/400x600/1a1a2e/ffffff?text=No+Poster';

    let deleteBtn = "";
    if (currentUser && (currentUser.uid === room.hostId || (typeof isAdmin !== 'undefined' && isAdmin))) {
      deleteBtn = `<button class="btn-delete-room" onclick="event.stopPropagation(); deleteRoom('${room.id}', '${room.hostId}')" title="Xóa phòng"><i class="fas fa-trash"></i></button>`;
    }

    const createdDate = formatRoomDate(room.createdAt);
    const epText = (room.episodeIndex !== undefined && room.episodeIndex !== null) 
      ? `Tập ${parseInt(room.episodeIndex) + 1}` 
      : 'Phim lẻ';
    const typeIcon = isPrivate ? 'fa-lock' : 'fa-globe-asia';
    const typeText = isPrivate ? 'Riêng tư' : 'Công khai';
    
    // --- Xử lý trạng thái Hẹn giờ / Live / Kết thúc ---
    let statusBadge = `<span class="wp-badge-live"><i class="fas fa-circle"></i> LIVE</span>`;
    let popupStatus = `<div class="wp-popup-status"><i class="fas fa-circle"></i> Đang phát trực tiếp</div>`;
    let joinBtnText = `Vào xem <i class="fas fa-play"></i>`;
    let joinBtnPopupText = `Vào xem ngay <i class="fas fa-play"></i>`;
    
    const { isActuallyEnded, endedAt } = checkIfRoomEnded(room);

    if (isActuallyEnded) {
        let timeStr = "";
        if (endedAt) {
            const date = endedAt.toDate ? endedAt.toDate() : new Date(endedAt);
            timeStr = ` lúc ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        statusBadge = `<span class="wp-badge-ended"><i class="fas fa-check-circle"></i> Đã Kết Thúc</span>`;
        popupStatus = `<div class="wp-popup-status" style="background: rgba(255,255,255,0.1); color: #ccc; border-color: rgba(255,255,255,0.2);"><i class="fas fa-check-circle" style="animation: none;"></i> Đã kết thúc${timeStr}</div>`;
        joinBtnText = `Chi tiết <i class="fas fa-info-circle"></i>`;
        joinBtnPopupText = `Xem chi tiết <i class="fas fa-info-circle"></i>`;
    } else if (room.scheduledTime) {
        const timeInfo = formatRelativeTime(room.scheduledTime);
        if (timeInfo.isFuture) {
            statusBadge = `<span class="wp-badge-live" style="background: rgba(156, 39, 176, 0.9); animation: none; box-shadow: 0 0 10px rgba(156, 39, 176, 0.5);"><i class="fas fa-clock" style="animation: none;"></i> ${timeInfo.text}</span>`;
            popupStatus = `<div class="wp-popup-status" style="background: rgba(156, 39, 176, 0.2); color: #e1bee7; border-color: rgba(156, 39, 176, 0.4);"><i class="fas fa-clock" style="animation: none;"></i> ${timeInfo.text}</div>`;
            joinBtnText = `Phòng chờ <i class="fas fa-door-open"></i>`;
            joinBtnPopupText = `Vào phòng chờ <i class="fas fa-door-open"></i>`;
        }
    }

    const html = `
      <div class="wp-room-card-wrapper" data-room-id="${room.id}" data-room-type="${room.type}">
        <div class="wp-room-card">
          ${deleteBtn}
          <img class="wp-room-poster" src="${posterUrl}" alt="${room.movieTitle}" loading="lazy">
          <div class="wp-room-overlay"></div>
          <div class="wp-room-badges">
            ${statusBadge}
            ${isPrivate ? '<span class="wp-badge-private"><i class="fas fa-lock"></i></span>' : '<span class="wp-badge-public"><i class="fas fa-globe-asia"></i></span>'}
          </div>
          <div class="wp-room-content">
            <h4 class="wp-room-name">${room.name}</h4>
            <p class="wp-room-movie"><i class="fas fa-film"></i> ${room.movieTitle}</p>
            <div class="wp-room-footer">
              <div class="wp-room-meta">
                <span class="wp-room-host"><i class="fas fa-crown"></i> ${room.hostName || 'Host'}</span>
                <span class="wp-room-count"><i class="fas fa-users"></i> ${count}</span>
              </div>
              <button class="wp-room-join-btn ${isActuallyEnded ? 'wp-btn-info' : ''}" onclick="event.stopPropagation(); joinRoom('${room.id}', '${room.type}')">
                ${joinBtnText}
              </button>
            </div>
          </div>
        </div>
        <div class="wp-room-popup">
          <button class="wp-popup-hide-btn" onclick="event.stopPropagation(); hideRoomPopup(this)" title="Ẩn chi tiết">
            <i class="fas fa-eye-slash"></i>
          </button>
          <h4 class="wp-popup-title">${room.name}</h4>
          <ul class="wp-popup-info">
            <li class="wp-popup-marquee-li"><i class="fas fa-film"></i> 
              <div class="wp-marquee-container">
                <div class="wp-marquee-content">
                  <span>${room.movieTitle || 'Chưa chọn phim'}</span>
                  <span class="wp-marquee-duplicate">${room.movieTitle || 'Chưa chọn phim'}</span>
                </div>
              </div>
            </li>
            <li><i class="fas fa-tv"></i> <span>${epText}</span></li>
            <li><i class="fas fa-crown"></i> <span>${room.hostName || 'Host'}</span></li>
            <li><i class="fas ${typeIcon}"></i> <span>${typeText}</span></li>
            <li><i class="fas fa-users"></i> <span>${count} người đang xem</span></li>
            <li><i class="fas fa-calendar-alt"></i> <span>${createdDate}</span></li>
          </ul>
          <div class="wp-popup-divider"></div>
          ${popupStatus}
          <button class="wp-popup-join-btn ${isActuallyEnded ? 'wp-btn-info' : ''}" onclick="event.stopPropagation(); joinRoom('${room.id}', '${room.type}')">
            ${joinBtnPopupText}
          </button>
        </div>
      </div>`;
    
    htmlContent += html;
  });

  container.innerHTML = htmlContent;

  initRoomPopupEvents();
}

/* Hàm lọc phòng dựa trên từ khóa và loại phòng */
function filterWatchRooms() {
  const searchInput = document.getElementById("wpRoomSearch");
  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
  
  let filtered = allWatchRooms;

  // 1. Lọc theo loại phòng (tab)
  if (currentRoomFilter === 'my_rooms') {
    if (!currentUser) {
      // Yêu cầu đăng nhập
      showNotification("Vui lòng kết nối ví để xem phòng của bạn!", "warning");
      filtered = []; // Trống khi chưa đăng nhập
    } else {
      filtered = filtered.filter(room => room.hostId === currentUser.uid);
    }
  } else if (currentRoomFilter !== 'all') {
    filtered = filtered.filter(room => room.type === currentRoomFilter);
  }

  // 2. Lọc theo từ khóa (tên phòng hoặc tên phim)
  if (keyword) {
    filtered = filtered.filter(room => 
      room.name.toLowerCase().includes(keyword) || 
      (room.movieTitle && room.movieTitle.toLowerCase().includes(keyword))
    );
  }

  renderWatchRooms(filtered);
}

/* Hàm chuyển đổi tab lọc */
function setRoomFilter(filterType) {
  currentRoomFilter = filterType;
  
  // Cập nhật UI nút
  const btns = document.querySelectorAll(".wp-filter-btn");
  btns.forEach(btn => {
    if (btn.dataset.filter === filterType) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  filterWatchRooms();
}

/* Format ngày giờ tạo phòng thành dạng tiếng Việt */
function formatRoomDate(timestamp) {
  if (!timestamp) return 'Không rõ';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    // Nếu dưới 1 phút
    if (diffMins < 1) return 'Vừa mới tạo';
    // Nếu dưới 60 phút
    if (diffMins < 60) return `${diffMins} phút trước`;
    // Nếu dưới 24 giờ
    if (diffHours < 24) return `${diffHours} giờ trước`;
    // Ngày cụ thể
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} lúc ${hours}:${mins}`;
  } catch (e) {
    return 'Không rõ';
  }
}

/* Gắn event listener cho popup thẻ phòng (mobile: touch, PC: hover tự CSS xử lý) */
function initRoomPopupEvents() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (!isTouchDevice) return; // PC dùng CSS :hover, không cần JS

  const wrappers = document.querySelectorAll('.wp-room-card-wrapper');

  wrappers.forEach(wrapper => {
    const card = wrapper.querySelector('.wp-room-card');
    if (!card) return;

    // Xóa onclick mặc định trên card (mobile sẽ dùng popup)
    card.removeAttribute('onclick');

    // Chạm vào card → toggle popup
    card.addEventListener('click', function(e) {
      // Nếu bấm nút xóa hoặc nút join → không toggle popup
      if (e.target.closest('.btn-delete-room') || e.target.closest('.wp-room-join-btn')) return;

      e.preventDefault();
      e.stopPropagation();

      const isActive = wrapper.classList.contains('popup-active');
      
      // Đóng tất cả popup khác
      document.querySelectorAll('.wp-room-card-wrapper.popup-active').forEach(w => {
        w.classList.remove('popup-active');
      });

      // Toggle popup hiện tại
      if (!isActive) {
        wrapper.classList.add('popup-active');
      }
    });
  });

  // Chạm ra ngoài → đóng tất cả popup
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.wp-room-card-wrapper')) {
      document.querySelectorAll('.wp-room-card-wrapper.popup-active').forEach(w => {
        w.classList.remove('popup-active');
      });
    }
  }, { capture: true });
}

/* Ẩn popup chi tiết phòng (Hỗ trợ cả PC & Mobile) */
function hideRoomPopup(btn) {
  const wrapper = btn.closest('.wp-room-card-wrapper');
  if (!wrapper) return;

  // 1. Reset class cho Mobile
  wrapper.classList.remove('popup-active');

  // 2. Thêm class ẩn để override hover trên PC
  wrapper.classList.add('popup-hidden');

  // 3. Tự động xóa class ẩn khi di chuột ra ngoài để lần sau hover lại vẫn hiện
  const resetHidden = () => {
    wrapper.classList.remove('popup-hidden');
    wrapper.removeEventListener('mouseleave', resetHidden);
  };
  wrapper.addEventListener('mouseleave', resetHidden);
}

async function deleteRoom(roomId, hostId) {
  if (!currentUser) return;
  const isOwner = currentUser.uid === hostId;
  
  // 👇 FIX: Admin có quyền xóa mọi phòng
  if (!isOwner && (typeof isAdmin === 'undefined' || !isAdmin)) {
    showNotification("Bạn không có quyền xóa phòng này!", "error");
    return;
  }
  if (!await customConfirm("⚠️ BẠN CÓ CHẮC MUỐN GIẢI TÁN PHÒNG NÀY?", { title: "Giải tán phòng", type: "danger", confirmText: "Giải tán" })) return;
  try {
    showLoading(true);
    await db.collection("watchRooms").doc(roomId).delete();
    showNotification("Đã giải tán phòng!", "success");
    loadRooms();
  } catch (error) {
    console.error(error);
  } finally {
    showLoading(false);
  }
}

async function openCreateRoomModal() {
  if (!currentUser) {
    showNotification("Vui lòng đăng nhập!", "warning");
    openAuthModal();
    return;
  }
  console.log("DEBUG: openCreateRoomModal called");
  
  // Reset Form Inputs
  const nameInput = document.getElementById("roomNameInput");
  const passInput = document.getElementById("roomPassword");
  const typeInput = document.getElementById("roomType");
  const movieIdInput = document.getElementById("roomMovieId");
  const epIndexInput = document.getElementById("roomEpisodeIndex");
  const searchInput = document.getElementById("wpMovieSearchInput");
  
  if (nameInput) nameInput.value = "";
  if (passInput) passInput.value = "";
  if (typeInput) typeInput.value = "public";
  if (movieIdInput) movieIdInput.value = "";
  if (epIndexInput) epIndexInput.value = "0";
  if (searchInput) searchInput.value = "";

  // Reset UI Steps & Previews
  const preview = document.getElementById('wpSelectedPreview');
  const epGroup = document.getElementById('roomEpisodeGroup');
  const passGroup = document.getElementById('roomPassGroup');
  
  if (preview) { preview.classList.add('hidden'); preview.innerHTML = ''; }
  if (epGroup) epGroup.classList.add('hidden');
  if (passGroup) passGroup.classList.add('hidden');

  // Đảm bảo dữ liệu phim đã được tải
  if (!allMovies || allMovies.length === 0) {
    console.warn("DEBUG: allMovies empty, attempting to load...");
    if (typeof loadMovies === 'function') {
      await loadMovies();
    }
  }
  
  // FALLBACK: Nếu vẫn trống, dùng SAMPLE_MOVIES
  if ((!allMovies || allMovies.length === 0) && typeof SAMPLE_MOVIES !== 'undefined') {
    console.warn("DEBUG: Using SAMPLE_MOVIES as fallback");
    allMovies = SAMPLE_MOVIES;
  }
  
  if (!allMovies || allMovies.length === 0) {
    console.error("DEBUG: Could not load any movies!");
  }

  let allowedMovies = [];
  if (isAdmin || (currentUser && currentUser.isVip === true)) {
    allowedMovies = allMovies;
  } else {
    allowedMovies = allMovies.filter(m => !m.isVip);
  }

  // Loại bỏ trùng lặp nếu có
  const uniqueMovies = Array.from(new Set(allowedMovies.map(m => m.id)))
    .map(id => allowedMovies.find(m => m.id === id));

  // Lưu để filter
  window.allAllowedWPMovies = uniqueMovies;
  console.log("DEBUG: Unique Movies for WP:", uniqueMovies.length, uniqueMovies);
  
  if (uniqueMovies.length > 0) {
    renderWPMovies(uniqueMovies);
  } else {
    console.error("DEBUG: No movies to render!");
  }

  if (uniqueMovies.length === 0) {
    console.warn("DEBUG: No movies allowed for current user");
    showNotification("Hiện tại chưa có phim nào khả dụng cho bạn.", "warning");
  }

  // 1. Reset trạng thái Collapse khi mở modal
  const selectionArea = document.querySelector('.wp-movie-selection-area');
  if (selectionArea) selectionArea.classList.remove('wp-collapsed');
  
  openModal('createWatchPartyModal');
}

function renderWPMovies(movies) {
  console.log("DEBUG: Rendering movies, count:", movies.length);
  const grid = document.getElementById("wpMovieGrid");
  if (!grid) {
      console.error("DEBUG: wpMovieGrid element not found!");
      showNotification("Lỗi: Không tìm thấy khung danh sách phim!", "error");
      return;
  }
  
  if (!movies || movies.length === 0) {
    grid.innerHTML = `
      <div class="wp-no-movies-msg">
        <p>Không tìm thấy phim nào phù hợp.</p>
        <button type="button" class="btn btn-sm btn-outline-primary" onclick="loadMovies().then(() => openCreateRoomModal())">
          Tải lại dữ liệu
        </button>
      </div>`;
    return;
  }

  const selectedId = document.getElementById("roomMovieId")?.value;

  grid.innerHTML = movies.map(m => {
    const isSelected = String(m.id) === String(selectedId);
    return `
      <div class="wp-movie-card ${isSelected ? 'selected' : ''}" 
           onclick="selectWPMovie('${m.id}')" 
           title="${m.title}">
        <img src="${m.posterUrl}" alt="${m.title}" loading="lazy">
        <div class="wp-movie-card-info">
          <div class="title">${m.title}</div>
        </div>
      </div>
    `;
  }).join("");
}

function filterWPMovies() {
  const searchInput = document.getElementById("wpMovieSearchInput");
  if (!searchInput) return;
  const val = searchInput.value.toLowerCase().trim();
  if (!window.allAllowedWPMovies) return;
  
  if (val === '') {
    renderWPMovies(window.allAllowedWPMovies);
    return;
  }
  
  const filtered = window.allAllowedWPMovies.filter(m => 
    m.title.toLowerCase().includes(val) || 
    (m.originTitle && m.originTitle.toLowerCase().includes(val))
  );
  renderWPMovies(filtered);
}

function selectWPMovie(id) {
  console.log("DEBUG: selectWPMovie called with ID:", id);
  
  // Tìm phim trong dữ liệu
  const movie = allMovies.find(m => String(m.id) === String(id)) || 
                (window.allAllowedWPMovies && window.allAllowedWPMovies.find(m => String(m.id) === String(id)));

  if (!movie) {
    console.error("DEBUG: Movie not found for ID:", id);
    showNotification("Không tìm thấy thông tin phim!", "error");
    return;
  }

  // Cập nhật giá trị ẩn
  const movieIdInput = document.getElementById('roomMovieId');
  if (movieIdInput) movieIdInput.value = id;

  // Hiển thị Preview và Thu gọn danh sách phim
  const preview = document.getElementById('wpSelectedPreview');
  const selectionArea = document.querySelector('.wp-movie-selection-area');
  
  if (preview) {
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <div class="selected-movie-info-wrap">
        <img src="${movie.posterUrl}" alt="${movie.title}">
        <div class="selected-info">
          <label>Đã chọn phim:</label>
          <h4>${movie.title}</h4>
          <p>${movie.type === 'series' ? 'Phim bộ' : 'Phim lẻ'} • ${movie.year || 'N/A'}</p>
        </div>
      </div>
      <button type="button" class="wp-change-movie-btn" onclick="undoMovieSelection()">
        <i class="fas fa-edit"></i> Đổi phim
      </button>
    `;
  }

  // 🔥 Smart Collapse: Thu gọn grid phim
  if (selectionArea) {
    selectionArea.classList.add('wp-collapsed');
  }

  // Highlight card đã chọn
  document.querySelectorAll('.wp-movie-card').forEach(card => card.classList.remove('selected'));
  const selectedCard = document.querySelector(`.wp-movie-card[onclick*="'${id}'"]`);
  if (selectedCard) selectedCard.classList.add('selected');

  // Xử lý tập phim
  const epGroup = document.getElementById('roomEpisodeGroup');
  const epGrid = document.getElementById('wpEpisodeGrid');
  const epIndexInput = document.getElementById('roomEpisodeIndex');

  if (movie.type === 'series' && movie.episodes && movie.episodes.length > 0) {
    if (epGroup) epGroup.classList.remove('hidden');
    if (epIndexInput) epIndexInput.value = "0";

    if (epGrid) {
      epGrid.innerHTML = movie.episodes.map((ep, idx) => `
        <button type="button" class="wp-ep-btn ${idx === 0 ? 'active' : ''}" 
                onclick="selectWPEpisode(${idx}, this)">
          ${idx + 1}
        </button>
      `).join("");
    }
    showNotification(`Đã chọn: ${movie.title}. Vui lòng chọn tập.`, "success");
  } else {
    if (epGroup) epGroup.classList.add('hidden');
    if (epIndexInput) epIndexInput.value = "0";
    showNotification(`Đã chọn: ${movie.title}`, "success");
  }

  // 🚀 Auto Scroll xuống cuối để thấy Step 3 và Nút xác nhận
  setTimeout(() => {
    const bodyScroll = document.querySelector('.wp-modal-body-scroll');
    if (bodyScroll) {
      bodyScroll.scrollTo({
        top: bodyScroll.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, 300);
}

function undoMovieSelection() {
  const selectionArea = document.querySelector('.wp-movie-selection-area');
  const preview = document.getElementById('wpSelectedPreview');
  const movieIdInput = document.getElementById('roomMovieId');
  const epGroup = document.getElementById('roomEpisodeGroup');

  if (selectionArea) selectionArea.classList.remove('wp-collapsed');
  if (preview) {
    preview.classList.add('hidden');
    preview.innerHTML = '';
  }
  if (movieIdInput) movieIdInput.value = '';
  if (epGroup) epGroup.classList.add('hidden');

  // Reset highlight cards
  document.querySelectorAll('.wp-movie-card').forEach(card => card.classList.remove('selected'));
  
  showNotification("Mời bạn chọn lại phim", "info");
}

function selectWPEpisode(index, btnElement) {
  const epIndexInput = document.getElementById("roomEpisodeIndex");
  if(epIndexInput) epIndexInput.value = index;
  // Bỏ active tất cả nút
  const grid = document.getElementById("wpEpisodeGrid");
  if(grid) {
      const btns = grid.querySelectorAll('.wp-ep-btn');
      btns.forEach(btn => btn.classList.remove('active'));
  }
  // Đánh dấu nút vừa bấm
  if(btnElement) btnElement.classList.add('active');
}

function toggleRoomPass() {
  const typeEl = document.getElementById("roomType");
  const passGroup = document.getElementById("roomPassGroup");
  
  if (!typeEl || !passGroup) return;
  
  passGroup.classList.toggle("hidden", typeEl.value !== "private");
}

async function handleCreateRoom(e) {
  e.preventDefault();
  const name = document.getElementById("roomNameInput")?.value || "";
  const movieId = document.getElementById("roomMovieId")?.value;
  const epIndex = document.getElementById("roomEpisodeIndex")?.value || 0;
  
  if (!movieId) {
    showNotification("Vui lòng chọn phim!", "warning");
    return;
  }
  const type = document.getElementById("roomType")?.value || "public";
  const password = document.getElementById("roomPassword")?.value || "";
  
  if (type === "private" && !password.trim()) {
    showNotification("Vui lòng nhập mật khẩu cho phòng riêng tư!", "warning");
    return;
  }
  
  // Tùy chọn thời gian
  const isScheduled = document.getElementById("roomScheduleToggle")?.checked;
  const timeInput = document.getElementById("roomScheduledTime")?.value;
  let scheduledTime = null;

  if (isScheduled) {
      if (!timeInput) {
          showNotification("Vui lòng chọn ngày giờ chiếu hợặc tắt cài đặt thời gian!", "warning");
          return;
      }
      const selectedDate = new Date(timeInput);
      if (selectedDate <= new Date()) {
          showNotification("Thời gian lên lịch phải ở tương lai!", "error");
          return;
      }
      scheduledTime = firebase.firestore.Timestamp.fromDate(selectedDate);
  }

  const movie = allMovies.find((m) => m.id === movieId);
  const episode = movie.episodes[epIndex];
  
  // Lấy thông tin video (Hỗ trợ Hybrid)
  const videoType = episode.videoType || "youtube";
  const videoSource = episode.videoSource || episode.youtubeId;

  try {
    showLoading(true);

    // --- KIỂM TRA GIỚI HẠN PHÒNG (TRỪ ADMIN) ---
    if (typeof isAdmin === 'undefined' || !isAdmin) {
      const configDoc = await db.collection("configs").doc("watchParty").get();
      const config = configDoc.exists ? configDoc.data() : {};
      
      const userLimit = config.userRoomLimit || 3;
      const totalLimit = config.totalRoomLimit || 50;

      // 1. Kiểm tra tổng số phòng toàn hệ thống
      const allRooms = await db.collection("watchRooms").get();
      if (allRooms.size >= totalLimit) {
        showLoading(false);
        showNotification(`Hệ thống đã đạt giới hạn tối đa ${totalLimit} phòng. Vui lòng quay lại sau!`, "warning");
        return;
      }
      
      // 2. Kiểm tra giới hạn của từng User
      const userRooms = await db.collection("watchRooms")
        .where("hostId", "==", currentUser.uid)
        .get();
      
      if (userRooms.size >= userLimit) {
        showLoading(false);
        showNotification(`Bạn đã đạt giới hạn tối đa ${userLimit} phòng. Vui lòng giải tán phòng cũ trước khi tạo mới!`, "warning");
        return;
      }
    }

    const roomRef = await db.collection("watchRooms").add({
      name,
      hostId: currentUser.uid,
      hostName: currentUser.displayName || "User",
      movieId,
      movieTitle: movie.title,
      moviePoster: movie.posterUrl || '', // Lưu poster để hiển thị card
      episodeIndex: parseInt(epIndex),
      videoType,
      videoSource,
      videoId: videoType === 'youtube' ? videoSource : '',
      type,
      password,
      status: "paused",
      currentTime: 0,
      duration: (() => {
          let d = episode.duration || 0;
          if (!d && movie.duration) {
              const mins = parseInt(movie.duration.replace(/\D/g, ''));
              if (mins) d = mins * 60;
          }
          return d;
      })(),
      scheduledTime: scheduledTime, // Lưu trường thời gian chiếu vào DB (null hoặc Timestamp)
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      memberCount: 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      bannedUsers: [],
    });
    closeModal("createWatchPartyModal");
    showLoading(false);
    joinRoom(roomRef.id, type, password);
  } catch (error) {
    console.error(error);
    showLoading(false);
  }
}

// ==========================================
// 3. JOIN ROOM & LOGIC
// ==========================================
async function joinRoom(roomId, type, passwordInput = null) {
  if (!currentUser) {
    showNotification("Đăng nhập để vào phòng!", "warning");
    openAuthModal();
    return;
  }
  try {
    showLoading(true);
    const roomRef = db.collection("watchRooms").doc(roomId);
    const doc = await roomRef.get();
    if (!doc.exists) {
      showLoading(false);
      await customAlert("Phòng không tồn tại!", { type: "warning" });
      return;
    }

    const data = doc.data();
    if (data.bannedUsers?.includes(currentUser.uid)) {
      showLoading(false);
      await customAlert("BẠN ĐÃ BỊ CẤM!", { type: "danger" });
      return;
    }
    if (data.type === "private" && currentUser.uid !== data.hostId) {
      if (!passwordInput) passwordInput = await customPrompt("🔒 Nhập mật khẩu:", { title: "Phòng riêng tư" });
      if (passwordInput !== data.password) {
        showLoading(false);
        await customAlert("Sai mật khẩu!", { type: "danger" });
        return;
      }
    }

    currentRoomId = roomId;
    document.getElementById("partyLobby").classList.add("hidden");
    document.getElementById("partyRoom").classList.remove("hidden");
    // 👇 THÊM DÒNG NÀY ĐỂ KHÓA CUỘN TRANG WEB
    document.body.classList.add("watch-party-active");
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";

    showLoading(false);

    roomUnsubscribe = roomRef.onSnapshot(async (docSnapshot) => {
      if (!docSnapshot.exists) {
        leaveRoom();
        return;
      }
      const roomData = docSnapshot.data();
      roomData.id = docSnapshot.id;
      latestRoomData = roomData;

      // 🔥 CHẾ ĐỘ ĐƠN GIẢN: Kiểm tra kết thúc ngay lập tức bằng hàm tập trung
      const { isActuallyEnded, endedAt } = checkIfRoomEnded(roomData);
      if (isActuallyEnded) {
          showRoomEndedOverlay(endedAt || roomData.endedAt);
          if (player) {
              if (player.pauseVideo) player.pauseVideo();
              else player.pause();
          }
          return;
      }

      if (roomData.bannedUsers?.includes(currentUser.uid)) {
        leaveRoom();
        return;
      }
      updateRoomUI(roomData);
      // Phòng hẹn giờ -> Schedule Sync Engine lo, không gọi handleSync để tránh xung đột
      if (!roomData.scheduledTime) {
        handleSync(roomData);
      }
    });

    await setupMemberAndChat(roomId, roomRef);
    try {
      initVoiceChat();
    } catch (err) {
      console.warn(err);
    }
  } catch (error) {
    console.error(error);
    showLoading(false);
  }
}

// 👇 Tìm và thay thế toàn bộ hàm setupMemberAndChat cũ bằng hàm này
async function setupMemberAndChat(roomId, roomRef) {
  // 1. Thêm bản thân vào danh sách thành viên
  await roomRef
    .collection("members")
    .doc(currentUser.uid)
    .set({
      name: currentUser.displayName || "User",
      avatar: currentUser.photoURL || "",
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      isChatBanned: false,
      isMicMuted: false,
      isMicBanned: false,
    });

  await roomRef.update({
    memberCount: firebase.firestore.FieldValue.increment(1),
  });

  // Biến lưu trạng thái cũ để so sánh (tránh thông báo lặp lại)
  let wasChatBanned = false;

  // 2. Lắng nghe thay đổi của phòng
  membersUnsubscribe = roomRef.collection("members").onSnapshot((snapshot) => {
    // Cập nhật số lượng
    const countEl = document.getElementById("memberCount");
    if (countEl) countEl.textContent = snapshot.size;

    // Vẽ lại danh sách thành viên
    renderMembersList(snapshot);

    // --- KIỂM TRA TRẠNG THÁI CỦA MÌNH ---
    const myDoc = snapshot.docs.find((d) => d.id === currentUser.uid);

    // A. LOGIC KICK (Đã hoạt động tốt)
    if (!myDoc && currentRoomId) {
      console.warn("🚫 Phát hiện bị Kick khỏi phòng!");
      leaveRoom(true);
      customAlert("⚠️ BẠN ĐÃ BỊ MỜI RA KHỎI PHÒNG!", { type: "danger" });
      return;
    }

    // B. LOGIC CẤM CHAT & MIC (FIX MỚI)
    if (myDoc) {
      const myData = myDoc.data();
      const chatInput = document.getElementById("chatInput");
      const chatBtn = document.querySelector("#chatForm button"); // Nút gửi

      // --- XỬ LÝ CẤM CHAT ---
      if (myData.isChatBanned) {
        // Nếu mới bị cấm lần đầu thì hiện thông báo
        if (!wasChatBanned) {
          showNotification("⛔ QUẢN TRỊ VIÊN ĐÃ CẤM BẠN CHAT!", "error");
          wasChatBanned = true;
        }

        // 🔥 KHÓA CỨNG Ô NHẬP LIỆU 🔥
        if (chatInput) {
          chatInput.disabled = true; // Không cho nhập
          chatInput.value = ""; // Xóa chữ đang nhập dở
          chatInput.placeholder = "⛔ Bạn đang bị cấm chat!";
          chatInput.style.backgroundColor = "#2a0000"; // Đổi nền đỏ tối cảnh báo
          chatInput.style.color = "#ff4444";
          chatInput.style.cursor = "not-allowed";
        }
        if (chatBtn) {
          chatBtn.disabled = true;
          chatBtn.style.opacity = "0.5";
        }
      } else {
        // Nếu được mở cấm
        if (wasChatBanned) {
          showNotification("✅ Bạn đã được mở Chat.", "success");
          wasChatBanned = false;
        }

        // MỞ LẠI Ô NHẬP LIỆU
        if (chatInput) {
          chatInput.disabled = false;
          chatInput.placeholder = "Nhập tin nhắn...";
          chatInput.style.backgroundColor = ""; // Trả về màu gốc
          chatInput.style.color = "";
          chatInput.style.cursor = "text";
        }
        if (chatBtn) {
          chatBtn.disabled = false;
          chatBtn.style.opacity = "1";
        }
      }

      // --- XỬ LÝ CẤM MIC (Giữ nguyên) ---
      if (myData.isMicBanned && isMicEnabled) {
        if (myStream && myStream.getAudioTracks()[0]) {
          myStream.getAudioTracks()[0].enabled = false;
        }
        isMicEnabled = false;
        updateMicUI(false);
        showNotification("⛔ QUẢN TRỊ VIÊN ĐÃ TẮT MIC CỦA BẠN!", "warning");
        roomRef
          .collection("members")
          .doc(currentUser.uid)
          .update({ isMicMuted: true });
      }
    }
  });

  loadChat(roomId);
  sendSystemMessage(`${currentUser.displayName} đã vào phòng 👋`);
}

function updateRoomUI(data) {
  document.getElementById("roomTitleDisplay").textContent = data.name;
  
  // 🔥 ĐƠN GIẢN HÓA: Kiểm tra kết thúc tập trung
  const { isActuallyEnded, endedAt } = checkIfRoomEnded(data);
  const liveBadge = document.querySelector(".live-badge");

  if (isActuallyEnded) {
      showRoomEndedOverlay(endedAt || data.endedAt);
      if (liveBadge) liveBadge.style.display = "none"; // Ẩn badge LIVE khi đã xong
      return; 
  } else {
      hideRoomEndedOverlay();
      if (liveBadge) liveBadge.style.display = "inline-flex";
  }

  // 👇 FIX: Admin cũng có quyền điều khiển như chủ phòng
  isHost = (currentUser.uid === data.hostId) || (typeof isAdmin !== 'undefined' && isAdmin);
  
  // Khởi tạo Hybrid Player (YouTube hoặc HTML5)
  // Chỉ init nếu chưa có player HOẶC loại video thay đổi
  if (!player || (player.videoType && player.videoType !== (data.videoType || "youtube"))) {
      initHybridPlayer(data);
  }

  // Quản lý hiển thị nút điều khiển (Play/Pause/Seek)
  const wpCenterOverlay = document.getElementById("wpCenterOverlay");
  const wpPlayPauseBtn = document.getElementById("wpPlayPauseBtn");
  const wpProgressSlider = document.getElementById("wpProgressSlider");

  if (data.scheduledTime) {
      startScheduleSync(data);
      // Ẩn hoàn toàn vì phòng lên lịch không cho thao tác thủ công
      if (wpCenterOverlay) wpCenterOverlay.style.display = 'none';
      if (wpPlayPauseBtn) wpPlayPauseBtn.style.display = 'none';
      if (wpProgressSlider) wpProgressSlider.style.pointerEvents = 'none';
  } else {
      // Nếu phòng thường mà đang chạy scheduleSync thì tắt đi
      if (scheduleSyncInterval) {
          clearInterval(scheduleSyncInterval);
          scheduleSyncInterval = null;
      }
      // Khôi phục lại hiển thị dựa theo isHost (Mặc định CSS sẽ lo flex/inline-flex)
      if (wpCenterOverlay) wpCenterOverlay.style.display = isHost ? '' : 'none';
      if (wpPlayPauseBtn) wpPlayPauseBtn.style.display = isHost ? '' : 'none';
      if (wpProgressSlider) wpProgressSlider.style.pointerEvents = isHost ? 'auto' : 'none';
  }
}

// --- RENDER DANH SÁCH THÀNH VIÊN (FULL CHỨC NĂNG ADMIN) ---
// --- RENDER DANH SÁCH THÀNH VIÊN (ĐÃ XÓA STYLE CỨNG ĐỂ CSS HOẠT ĐỘNG) ---
// --- RENDER DANH SÁCH THÀNH VIÊN (BẢN FINAL FIX MÀU CHỮ) ---
function renderMembersList(snapshot) {
  const list = document.getElementById("memberList");
  if (!list) return;
  list.innerHTML = "";

  snapshot.forEach((doc) => {
    const m = doc.data();
    const uid = doc.id;
    const isMe = uid === currentUser.uid;
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || "U")}&background=random&color=fff`;

    // Icon Mic & Ban
    const micIcon = m.isMicMuted
      ? '<i class="fas fa-microphone-slash mic-off" style="color:#ff4444"></i>'
      : '<i class="fas fa-microphone mic-on" style="color:#00ff6a"></i>';
    const chatBanIcon = m.isChatBanned
      ? '<i class="fas fa-comment-slash" style="color:#ff4444; margin-left:5px;" title="Bị cấm chat"></i>'
      : "";

    // Nút chức năng
    let actionButtons = "";
    if (!isMe) {
      const isMuted = localMutedPeers.has(uid);
      const currentVol = peerVolumeLevels[uid] !== undefined ? peerVolumeLevels[uid] : 1;
      const volPercent = Math.round(currentVol * 100);
      actionButtons += `
        <div class="peer-volume-control">
          <button class="btn-icon-small ${isMuted ? "active" : ""}" onclick="toggleLocalVolume('${uid}')" title="${isMuted ? 'Bỏ tắt tiếng' : 'Tắt tiếng'}">
            <i class="fas ${isMuted ? "fa-volume-mute" : (currentVol > 1 ? "fa-volume-up" : currentVol > 0 ? "fa-volume-down" : "fa-volume-off")}"></i>
          </button>
          <input type="range" min="0" max="200" value="${volPercent}" class="peer-vol-slider" 
                 oninput="setPeerVolume('${uid}', this.value)" 
                 title="Âm lượng: ${volPercent}%">
          <span class="peer-vol-label">${volPercent}%</span>
        </div>`;
    }

    if ((isHost || (typeof isAdmin !== "undefined" && isAdmin)) && !isMe) {
      actionButtons += `
            <div class="admin-actions" style="display:flex; gap:5px; margin-left:5px;">
                <button class="btn-icon-small" onclick="toggleChatBan('${uid}', ${!m.isChatBanned})"><i class="fas fa-comment-${m.isChatBanned ? "slash" : "dots"}"></i></button>
                <button class="btn-icon-small" onclick="toggleMicBan('${uid}', ${!m.isMicBanned})"><i class="fas fa-microphone-${m.isMicBanned ? "slash" : "lines"}"></i></button>
                <button class="btn-icon-small danger" onclick="kickUser('${uid}', '${m.name}')"><i class="fas fa-sign-out-alt"></i></button>
            </div>`;
    }

    // 👇 CHỖ SỬA QUAN TRỌNG NHẤT: Thêm class "role-host" thay vì style cứng
    const roleHtml =
      uid === latestRoomData?.hostId
        ? '<span class="role-host">👑 Chủ phòng</span>'
        : '<span class="role-member">Thành viên</span>';

    list.innerHTML += `
            <div class="member-item" id="member-row-${uid}">
                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width: 0;">
                    <div style="position:relative; flex-shrink: 0;">
                        <img src="${m.avatar || defaultAvatar}" class="member-avatar avatar-img">
                        ${m.isSpeaking ? '<div class="speaking-indicator"></div>' : ""}
                    </div>
                    <div class="member-info">
                        <div class="member-name-row">
                            <span class="member-name">${m.name}</span> 
                            ${micIcon} ${chatBanIcon}
                        </div>
                        <span class="member-role">${roleHtml}</span>
                    </div>
                </div>
                <div class="member-actions">${actionButtons}</div>
            </div>`;
  });
}

// ==========================================
// 4. AUDIO & PEERJS (MASTER FIX)
// ==========================================

function toggleLocalVolume(peerId) {
  if (localMutedPeers.has(peerId)) localMutedPeers.delete(peerId);
  else localMutedPeers.add(peerId);

  const audio = document.getElementById("audio-" + peerId);
  if (audio) audio.muted = isDeafened || localMutedPeers.has(peerId);

  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .get()
    .then(renderMembersList);
}

// Chỉnh âm lượng loa của một peer cụ thể (0-200%)
window.setPeerVolume = function(peerId, value) {
  const vol = parseInt(value) / 100; // 0 -> 2.0
  peerVolumeLevels[peerId] = vol;
  
  const audio = document.getElementById("audio-" + peerId);
  if (audio) {
    audio.volume = Math.min(vol, 1); // HTML audio chỉ hỗ trợ 0-1
  }
  
  // Nếu muốn vượt 100%, dùng Web Audio API GainNode
  const gainNode = window[`gainNode_${peerId}`];
  if (gainNode) {
    gainNode.gain.value = vol; // GainNode hỗ trợ > 1 = khuếch đại
  }

  // Cập nhật label
  const row = document.getElementById(`member-row-${peerId}`);
  if (row) {
    const label = row.querySelector('.peer-vol-label');
    if (label) label.textContent = Math.round(vol * 100) + '%';
    
    // Cập nhật icon
    const icon = row.querySelector('.peer-volume-control .btn-icon-small i');
    if (icon && !localMutedPeers.has(peerId)) {
      icon.className = `fas ${vol > 1 ? 'fa-volume-up' : vol > 0 ? 'fa-volume-down' : 'fa-volume-off'}`;
    }
  }
};

function toggleDeafen() {
  isDeafened = !isDeafened;
  document.getElementById("myDeafenBtn").innerHTML = isDeafened
    ? '<i class="fas fa-headphones-alt slash"></i>'
    : '<i class="fas fa-headphones"></i>';
  document.getElementById("myDeafenBtn").classList.toggle("active", isDeafened);

  document.querySelectorAll("audio").forEach((a) => {
    const peerId = a.id.replace("audio-", "");
    a.muted = isDeafened || localMutedPeers.has(peerId);
    if (!a.muted) a.play().catch((e) => {});
  });
}

// Bật/Tắt popup chỉnh âm lượng Voice tổng
window.toggleVoiceVolumePopup = function() {
  const popup = document.getElementById('voiceVolPopup');
  if (popup) popup.classList.toggle('hidden');
};

// Chỉnh âm lượng tổng cho tất cả mic (0-200%)
window.setGlobalVoiceVolume = function(value) {
  globalVoiceVolume = parseInt(value) / 100; // 0.0 -> 2.0
  
  // Cập nhật label hiển thị
  const label = document.getElementById('globalVoiceLabel');
  if (label) label.textContent = Math.round(globalVoiceVolume * 100) + '%';
  
  // Cập nhật icon nút
  const btnIcon = document.querySelector('.btn-voice-vol i');
  if (btnIcon) {
    if (globalVoiceVolume === 0) btnIcon.className = 'fas fa-volume-mute';
    else if (globalVoiceVolume < 1) btnIcon.className = 'fas fa-volume-down';
    else btnIcon.className = 'fas fa-volume-up';
  }
  
  // Áp dụng cho tất cả audio đang phát
  document.querySelectorAll('#audioContainer audio').forEach(a => {
    const peerId = a.id.replace('audio-', '');
    const gainNode = window[`gainNode_${peerId}`];
    if (gainNode) {
      gainNode.gain.value = globalVoiceVolume;
    }
    a.volume = Math.min(globalVoiceVolume, 1);
  });
};

// Đóng popup khi click ra ngoài
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('voiceVolBtnWrap');
  const popup = document.getElementById('voiceVolPopup');
  if (wrap && popup && !wrap.contains(e.target)) {
    popup.classList.add('hidden');
  }
});

function initVoiceChat() {
  if (typeof Peer === "undefined") {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    script.onload = startPeerConnection;
    document.head.appendChild(script);
  } else {
    startPeerConnection();
  }
}

// --- HÀM LẤY SERVER XỊN (Tự động dùng Key của bạn) ---
async function getTurnCredentials() {
  try {
    console.log("🔄 Đang lấy Server xuyên tường lửa...");
    const response = await fetch(
      `https://${APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`,
    );
    if (!response.ok) throw new Error("API Metered lỗi");
    const iceServers = await response.json();
    console.log("✅ Đã có Server xịn!");
    return iceServers;
  } catch (error) {
    console.error("⚠️ Lỗi lấy Server (Dùng tạm Google):", error);
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ];
  }
}

async function startPeerConnection() {
  addMicButtonToUI();
  if (!globalAudioContext)
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (globalAudioContext.state === "suspended") globalAudioContext.resume();

  try {
    // Chỉ lấy ICE Server Token, KHÔNG gọi getUserMedia ở đây để tránh ducking âm thanh sớm
    const iceServers = await getTurnCredentials();

    // Khởi tạo Peer Connection
    myPeer = new Peer(currentUser.uid, {
      config: {
        iceServers: iceServers,
        iceTransportPolicy: "all",
      },
      debug: 1,
    });

    myPeer.on("open", (id) => {
      console.log("✅ Kết nối Peer thành công:", id);
      showNotification("Đã kết nối Voice Chat", "success");
      // Mặc định kết nối tới mọi người để LẮNG NGHE (Nhận âm thanh)
      connectToAllPeers();
    });

    myPeer.on("call", (call) => {
      // Phải có luồng giả hoặc gọi answer. Nếu không có Mic (chưa getUserMedia), answer bằng stream rỗng hoặc không truyền thông số.
      if (myStream) {
          call.answer(myStream);
      } else {
          // Fake audio track to answer calls even if muted
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          oscillator.connect(dst);
          // Không bật oscillator để nó không kêu, chỉ đưa track rỗng
          call.answer(dst.stream);
      }
      
      call.on("stream", (remoteStream) => {
        addAudioStream(remoteStream, call.peer);
      });
    });

    myPeer.on("error", (err) => {
      console.warn("Lỗi Peer:", err);
      if (err.type === "disconnected" || err.type === "network") {
        setTimeout(() => {
          if (myPeer && !myPeer.destroyed) myPeer.reconnect();
        }, 3000);
      }
    });

  } catch (err) {
    console.error("Lỗi khởi tạo Voice Chat Server:", err);
    showNotification("Lỗi kết nối máy chủ Voice Chat. Vui lòng thử lại sau.", "error");
  }
}

function connectToAllPeers() {
  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .get()
    .then((snap) => {
      snap.forEach((doc) => {
        if (doc.id !== currentUser.uid) {
          const call = myPeer.call(doc.id, myStream);
          if (call) {
            call.on("stream", (remoteStream) => {
              addAudioStream(remoteStream, doc.id);
            });
          }
        }
      });
    });
}

function addAudioStream(stream, peerId) {
  const old = document.getElementById("audio-" + peerId);
  if (old) old.remove();

  const audio = document.createElement("audio");
  audio.srcObject = stream;
  audio.id = "audio-" + peerId;
  audio.autoplay = true;
  audio.playsInline = true;
  audio.controls = false;

  // 👇 FIX: Không dùng display:none để tránh bị trình duyệt chặn
  let container = document.getElementById("audioContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "audioContainer";
    container.style.cssText =
      "position:fixed; bottom:0; right:0; width:1px; height:1px; opacity:0; pointer-events:none; z-index:-1;";
    document.body.appendChild(container);
  }
  container.appendChild(audio);

  // 🔊 Tạo Web Audio API GainNode để khuếch đại vượt 100%
  try {
    if (!globalAudioContext)
      globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (globalAudioContext.state === 'suspended') globalAudioContext.resume().catch(()=>{});
    
    const source = globalAudioContext.createMediaElementSource(audio);
    const gainNode = globalAudioContext.createGain();
    
    // Áp dụng mức âm lượng đã lưu (nếu có)
    const savedVol = peerVolumeLevels[peerId] !== undefined ? peerVolumeLevels[peerId] : 1;
    gainNode.gain.value = savedVol;
    
    source.connect(gainNode);
    gainNode.connect(globalAudioContext.destination);
    
    // Lưu GainNode để setPeerVolume() truy cập được
    window[`gainNode_${peerId}`] = gainNode;
  } catch(e) {
    console.warn('⚠️ Không thể tạo GainNode cho peer:', peerId, e);
  }

  monitorAudioLevel(stream, peerId);

  audio.addEventListener("loadedmetadata", () => {
    audio.muted = isDeafened || localMutedPeers.has(peerId);
    if (!audio.muted) audio.play().catch((e) => {});
  });
}

// 👇 HÀM MONITOR BẤT TỬ (ĐẢM BẢO AVATAR NHÁY)
function monitorAudioLevel(stream, peerId) {
  try {
    if (!globalAudioContext)
      globalAudioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
    if (globalAudioContext.state === "suspended")
      globalAudioContext.resume().catch(() => {});

    const ctx = globalAudioContext;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();

    const gainZero = ctx.createGain();
    gainZero.gain.value = 0.001;
    source.connect(gainZero);
    gainZero.connect(ctx.destination);

    source.connect(analyser);
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const check = () => {
      const row = document.getElementById(`member-row-${peerId}`);
      if (!row) {
        requestAnimationFrame(check);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;

      const avatar = row.querySelector(".avatar-img");
      if (avg > 3) {
        if (avatar) avatar.classList.add("is-speaking");
        row.classList.add("is-speaking");
      } else {
        if (avatar) avatar.classList.remove("is-speaking");
        row.classList.remove("is-speaking");
      }
      requestAnimationFrame(check);
    };
    check();
  } catch (e) {
    console.warn(e);
  }
}

function addMicButtonToUI() {
  const header = document.querySelector(".room-header-bar");
  if (!header) return;

  if (document.getElementById("myMicBtn"))
    document.getElementById("myMicBtn").remove();
  if (document.getElementById("myDeafenBtn"))
    document.getElementById("myDeafenBtn").remove();

  const micBtn = document.createElement("button");
  micBtn.id = "myMicBtn";
  micBtn.className = "btn-mic-toggle active"; // Mặc định tắt (đỏ)
  micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  micBtn.onclick = toggleMyMic;

  const deafenBtn = document.createElement("button");
  deafenBtn.id = "myDeafenBtn";
  deafenBtn.className = "btn-deafen-toggle";
  deafenBtn.innerHTML = '<i class="fas fa-headphones"></i>';
  deafenBtn.onclick = toggleDeafen;

  // Nút âm lượng tổng cho Voice Chat
  const volBtn = document.createElement("div");
  volBtn.id = "voiceVolBtnWrap";
  volBtn.className = "voice-vol-btn-wrap";
  volBtn.innerHTML = `
    <button class="btn-voice-vol" onclick="toggleVoiceVolumePopup()" title="Âm lượng Voice Chat">
      <i class="fas fa-volume-up"></i>
    </button>
    <div class="voice-vol-popup hidden" id="voiceVolPopup">
      <div class="voice-vol-popup-header">
        <i class="fas fa-users"></i> Âm lượng Voice
      </div>
      <div class="voice-vol-popup-body">
        <i class="fas fa-volume-down"></i>
        <input type="range" min="0" max="200" value="${Math.round(globalVoiceVolume * 100)}" 
               class="voice-vol-slider" id="globalVoiceSlider" 
               oninput="setGlobalVoiceVolume(this.value)">
        <i class="fas fa-volume-up"></i>
      </div>
      <div class="voice-vol-popup-label" id="globalVoiceLabel">${Math.round(globalVoiceVolume * 100)}%</div>
    </div>
  `;

  header.insertBefore(volBtn, header.firstChild);
  header.insertBefore(deafenBtn, header.firstChild);
  header.insertBefore(micBtn, header.firstChild);
}

async function toggleMyMic() {
  if (globalAudioContext?.state === "suspended") globalAudioContext.resume().catch(()=>{});
  
  // NGUYÊN TẮC: Nếu chưa có luồng thực tế -> Yêu cầu xin quyền (getUserMedia)
  if (!myStream) {
      showNotification("Đang yêu cầu quyền Micro...", "info");
      
      const isSecure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
      if (!isSecure) {
          showNotification("⚠️ Voice Chat cần HTTPS để cấp quyền Micro. Hãy dùng HTTPS hoặc localhost!", "error");
          return;
      }

      try {
          const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                  echoCancellation: /iPad|iPhone|iPod/.test(navigator.userAgent) ? false : true, // Tắt trên iOS để tránh ducking quá mạnh
                  noiseSuppression: true,
                  autoGainControl: false, // Tắt tự động giảm âm lượng video nền
              },
              video: false,
          });
          
          myStream = stream;
          isMicEnabled = true;
          myStream.getAudioTracks()[0].enabled = true;
          
          updateMicUI(true);
          monitorAudioLevel(myStream, currentUser.uid);

          // Cập nhật Database
          db.collection("watchRooms")
            .doc(currentRoomId)
            .collection("members")
            .doc(currentUser.uid)
            .update({ isMicMuted: false });
          
          // Gửi luồng âm thanh mới này cho tất cả những người trong phòng
          if (myPeer && !myPeer.destroyed) {
              connectToAllPeers();
          }

          showNotification("Micro đã được bật!", "success");

          // Bắt đầu boost âm lượng video khi mic bật để chống ducking
          if (player && player.tagName === "VIDEO" && !player.muted) {
              player.volume = 1;
              player.muted = false; // Đảm bảo tiếng không bị vô tình ngắt bởi OS
          }

      } catch (err) {
          console.error("Lỗi Mic:", err);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
              showNotification("Bạn đã từ chối quyền Micro. Lấy lại quyền trên ổ khóa cạnh thanh địa chỉ URL!", "error");
          } else {
              showNotification("Lỗi kết nối Micro: " + (err.message || err.name), "error");
          }
      }
      return;
  }

  // NẾU ĐÃ CÓ LUỒNG SẴN (Bật/Tắt bình thường)
  isMicEnabled = !isMicEnabled;
  if (myStream.getAudioTracks()[0]) {
      myStream.getAudioTracks()[0].enabled = isMicEnabled;
  }
  
  // NẾU BẬT MIC -> Boost âm lượng video. NẾU TẮT MIC -> Phục hồi
  if (player && player.tagName === "VIDEO" && !player.muted) {
      if (isMicEnabled) {
          player.volume = 1; 
      }
  }

  updateMicUI(isMicEnabled);
  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(currentUser.uid)
    .update({ isMicMuted: !isMicEnabled });
}

function updateMicUI(enabled) {
  const btn = document.getElementById("myMicBtn");
  if (!btn) return;
  if (enabled) {
    btn.innerHTML = '<i class="fas fa-microphone"></i>';
    btn.classList.remove("active");
  } else {
    btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    btn.classList.add("active");
  }
}

// ==========================================
// 5. CÁC HÀM KHÁC (CHAT, PLAYER...)
// ==========================================
function loadChat(roomId) {
  chatUnsubscribe = db
    .collection("watchRooms")
    .doc(roomId)
    .collection("chat")
    .orderBy("createdAt", "asc")
    .onSnapshot((snapshot) => {
      const container = document.getElementById("chatMessages");
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added")
          renderMessage(change.doc.data(), container);
      });
      // Cuộn mượt xuống cuối
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    });
}
// 👇 Tìm và thay thế toàn bộ hàm sendChatMessage cũ
async function sendChatMessage(e) {
  if (e) e.preventDefault();

  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  // 1. KIỂM TRA NHANH: Nếu ô nhập đang bị khóa -> Chặn luôn
  if (input.disabled) {
    showNotification("⛔ BẠN ĐANG BỊ CẤM CHAT!", "error");
    return;
  }

  // 2. KIỂM TRA KỸ (SERVER-SIDE CHECK): Lấy dữ liệu mới nhất từ DB để chắc chắn
  try {
    const memberDoc = await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(currentUser.uid)
      .get();

    // Nếu trên Server ghi là đang bị cấm -> Chặn ngay lập tức
    if (memberDoc.exists && memberDoc.data().isChatBanned) {
      showNotification("⛔ BẠN ĐANG BỊ CẤM CHAT!", "error");

      // Khóa lại giao diện ngay (đề phòng giao diện chưa kịp cập nhật)
      input.disabled = true;
      input.value = "";
      input.placeholder = "⛔ Bạn đang bị cấm chat!";
      return; // 🛑 DỪNG LẠI, KHÔNG GỬI
    }
  } catch (err) {
    console.log("Lỗi kiểm tra quyền chat:", err);
    // Nếu lỗi mạng, có thể cho qua hoặc chặn tùy bạn, ở đây ta cứ để code chạy tiếp
  }

  // 3. GỬI TIN NHẮN (Khi đã vượt qua mọi kiểm tra)
  try {
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("chat")
      .add({
        userId: currentUser.uid,
        userName: currentUser.displayName,
        content: text,
        type: "text",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    input.value = "";
    // Scroll xuống cuối
    // ... sau đoạn input.value = "";
    const container = document.getElementById("chatMessages");
    if (container) {
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  } catch (e) {
    console.error("Lỗi gửi tin nhắn:", e);
    showNotification("Không thể gửi tin nhắn", "error");
  }
}
// ==========================================
// HYBRID PLAYER LOGIC (YOUTUBE + HLS/MP4)
// ==========================================

function initHybridPlayer(data) {
  const container = document.getElementById("partyPlayer");
  
  // 1. Dọn dẹp player cũ
  if (player && typeof player.destroy === "function") {
      try { player.destroy(); } catch(e){}
  }
  if (window.hlsInstance) {
      window.hlsInstance.destroy();
      window.hlsInstance = null;
  }
  player = null;
  container.innerHTML = "";

  // 2. Xác định loại video
  const type = data.videoType || "youtube";
  const source = data.videoSource || data.videoId;

  console.log("🎬 Init Player:", type, source);

  if (type === "youtube") {
      // --- YOUTUBE PLAYER ---
      container.innerHTML = '<div id="ytPlayerTarget"></div>';
      initYouTubePlayerLegacy(source);
  } else {
      // --- HTML5 PLAYER (HLS/MP4) ---
      initHTML5Player(type, source, data);
  }
}

function initHTML5Player(type, source, initialData) {
    const container = document.getElementById("partyPlayer");
    const video = document.createElement("video");
    video.id = "partyHtml5Player";
    video.controls = true;
    video.playsInline = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.backgroundColor = "#000";
    
    container.appendChild(video);
    player = video; // Gán vào biến toàn cục
    player.videoType = type; // Đánh dấu loại
    video.controls = false; // Tắt native controls, dùng custom

    // Xác định phòng có lên lịch chiếu hay không
    const isScheduledRoom = !!(initialData.scheduledTime);

    // Tính startPosition cho phòng hẹn giờ (HLS.js sẽ load segment đúng luôn, không cần seek)
    let hlsStartPosition = 0;
    if (isScheduledRoom) {
        const schedDate = initialData.scheduledTime.toDate ? initialData.scheduledTime.toDate() : new Date(initialData.scheduledTime);
        const elapsed = (new Date() - schedDate) / 1000;
        if (elapsed > 0) hlsStartPosition = elapsed;
    }

    // Load Source
    if (type === "hls" && Hls.isSupported()) {
        // Nếu phòng hẹn giờ, dùng startPosition để HLS.js load từ đúng segment luôn (KHÔNG cần seek sau)
        const hlsConfig = isScheduledRoom && hlsStartPosition > 0 
            ? { startPosition: hlsStartPosition } 
            : {};
        const hls = new Hls(hlsConfig);
        window.hlsInstance = hls;
        hls.loadSource(source);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isScheduledRoom) {
                video.play().catch(e => {
                    console.log("Auto-play blocked (Scheduled HLS)", e);
                    showMobilePlayOverlay();
                });
            } else if (initialData.status === "playing") {
                video.currentTime = initialData.currentTime || 0;
                video.play().catch(e => {
                    console.log("Auto-play blocked (Playing HLS)", e);
                    showMobilePlayOverlay();
                });
            }
            wpPopulateQuality(hls);
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (evt, data) => {
            wpUpdateQualityDisplay(data.level);
        });
    } else {
        video.src = source;
        if (isScheduledRoom && hlsStartPosition > 0) {
            video.currentTime = hlsStartPosition;
            video.play().catch(e => {
                console.log("Auto-play blocked (Scheduled MP4)", e);
                showMobilePlayOverlay();
            });
        } else if (initialData.status === "playing") {
             video.currentTime = initialData.currentTime || 0;
             video.play().catch(e => {
                 console.log("Auto-play blocked (Playing MP4)", e);
                 showMobilePlayOverlay();
             });
        }
    }

    // --- Lấy duration và cập nhật Firestore (Chỉ dành cho Host) ---
    if (isHost && !isScheduledRoom) {
        video.addEventListener("loadedmetadata", () => {
            if (video.duration && video.duration > 0 && (!initialData.duration || Math.abs(initialData.duration - video.duration) > 5)) {
                console.log("🎬 HTML5 duration updated:", video.duration);
                db.collection("watchRooms").doc(currentRoomId).update({ duration: video.duration });
            }
        });
    }

    // --- EVENTS CHO HOST (SYNC) ---
    // ⚠️ Phòng hẹn giờ: KHÔNG đăng ký event sync → Tránh Firestore feedback loop
    if (isHost && !isScheduledRoom) {
        let seeking = false;
        
        video.addEventListener("play", () => updateRoomState("playing", video.currentTime));
        video.addEventListener("pause", () => updateRoomState("paused", video.currentTime));
        
        video.addEventListener("seeking", () => { seeking = true; });
        video.addEventListener("seeked", () => { 
            seeking = false;
            updateRoomState("buffering", video.currentTime); 
        });
        
        setInterval(() => {
            if(!video.paused && !seeking) updateRoomState("playing", video.currentTime);
            
            // Fallback: Kiểm tra xem đã gần hết phim chưa (Chỉ dành cho Host)
            if (video.duration > 0 && video.currentTime >= video.duration - 0.5) {
                console.log("🎬 Video duration reached (Fallback), updating to ended.");
                updateRoomState("ended", video.duration);
            }
        }, 5000);

        // Sự kiện kết thúc phim (Host xử lý)
        video.addEventListener("ended", () => {
            console.log("🎬 Video ended, updating room state to ended.");
            updateRoomState("ended", video.duration || video.currentTime);
        });
    }

    // --- INIT CUSTOM CONTROLS ---
    initWpCustomControls(video);
}

function initYouTubePlayerLegacy(videoId) {
  let finalId = videoId;
  if (!videoId) return;
  if (videoId.includes("v=")) finalId = videoId.split("v=")[1].split("&")[0];
  else if (videoId.includes("youtu.be/")) finalId = videoId.split("youtu.be/")[1].split("?")[0];

  const create = () => {
    player = new YT.Player("ytPlayerTarget", {
      height: "100%",
      width: "100%",
      videoId: finalId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange },
    });
    player.videoType = "youtube"; // Đánh dấu
  };

  if (window.YT && window.YT.Player) create();
  else {
    window.onYouTubeIframeAPIReady = create;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }
}

function onPlayerReady() {
  if (latestRoomData) {
      // Phòng hẹn giờ: Schedule Sync Engine lo, không can thiệp ở đây
      if (latestRoomData.scheduledTime) return;
      // Seek đến đúng giờ
      if (Math.abs(player.getCurrentTime() - latestRoomData.currentTime) > 2) {
          player.seekTo(latestRoomData.currentTime, true);
      }
      if (latestRoomData.status === "playing") player.playVideo();
      
      // Cập nhật duration cho YouTube (Chỉ Host)
      if (isHost && !latestRoomData.scheduledTime) {
          const duration = player.getDuration();
          if (duration > 0 && (!latestRoomData.duration || Math.abs(latestRoomData.duration - duration) > 5)) {
              console.log("🎬 YouTube duration updated:", duration);
              db.collection("watchRooms").doc(currentRoomId).update({ duration: duration });
          }
      }
  }
}

const onPlayerStateChange = (event) => {
  // Update UI (Local) - Cho tất cả mọi người
  if (event.data === 1) updatePlayButtonState("playing");
  else if (event.data === 2) updatePlayButtonState("paused");
  else if (event.data === 3) updatePlayButtonState("loading"); // Buffering
  else if (event.data === 0) updatePlayButtonState("paused"); // Ended

  // Sync Logic (Host only) - Phòng hẹn giờ KHÔNG ghi Firestore (tránh feedback loop)
  if (!isHost) return;
  if (latestRoomData && latestRoomData.scheduledTime) return;
  const dur = player.getDuration ? player.getDuration() : 0;
  const curr = player.getCurrentTime ? player.getCurrentTime() : 0;
  
  if (event.data === 1) updateRoomState("playing", curr, dur);
  else if (event.data === 2) updateRoomState("paused", curr, dur);
  else if (event.data === 0) {
      console.log("🎬 YouTube ended, updating room state to ended.");
      updateRoomState("ended", dur || curr, dur);
  }
};

async function updateRoomState(status, time, forcedDuration = null) {
  if (!currentRoomId || currentRoomId === "undefined" || currentRoomId === "") return;
  
  // Bỏ qua throttle nếu là trạng thái kết thúc (quan trọng)
  if (status !== "ended" && Date.now() - lastSyncTime < 500) return;
  lastSyncTime = Date.now();
  
  try {
    const roomRef = db.collection("watchRooms").doc(currentRoomId);
    const doc = await roomRef.get();
    if (!doc.exists) return;
    const roomData = doc.data();

    const updateData = { 
        status, 
        currentTime: time,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Luôn cập nhật duration nếu có từ Player
    if (forcedDuration && forcedDuration > 0) {
        updateData.duration = forcedDuration;
    }

    // 1. Nếu bắt đầu phát (không phải hẹn giờ), lưu startedAt lần đầu tiên
    if (status === "playing" && !roomData.startedAt && !roomData.scheduledTime) {
        updateData.startedAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    // 2. Nếu kết thúc, tính endedAt = Start + Duration
    if (status === "ended") {
        let startTime = null;
        if (roomData.scheduledTime) {
            startTime = roomData.scheduledTime.toDate ? roomData.scheduledTime.toDate() : new Date(roomData.scheduledTime);
        } else if (roomData.startedAt) {
            startTime = roomData.startedAt.toDate ? roomData.startedAt.toDate() : new Date(roomData.startedAt);
        } else if (updateData.startedAt) { // Trường hợp vừa play xong end ngay
             startTime = new Date(); 
        }

        const duration = forcedDuration || roomData.duration || time || 0;
        if (startTime && duration > 0) {
            updateData.endedAt = new Date(startTime.getTime() + duration * 1000);
        } else {
            // Cùn lắm thì lấy mốc hiện tại
            updateData.endedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
    }

    await roomRef.update(updateData);
  } catch (e) {
    console.error("Lỗi cập nhật trạng thái phòng:", e);
  }
}

function handleSync(data) {
  if (isHost) return; // Host không cần sync ngược (trừ khi có tính năng cướp host)
  if (!player) return;

  // Phòng có lên lịch chiếu -> Schedule Sync Engine lo toàn bộ, không can thiệp ở đây
  if (data.scheduledTime) return;

  const currentType = player.videoType || (player.playVideo ? "youtube" : "html5");

  if (data.status === "ended") {
      showRoomEndedOverlay(data.endedAt);
      if (currentType === "youtube") player.pauseVideo();
      else player.pause();
      return;
  } else {
      hideRoomEndedOverlay();
  }

  if (currentType === "youtube" && player.getPlayerState) {
      // --- SYNC YOUTUBE ---
      const ytTime = player.getCurrentTime();
      const diff = Math.abs(ytTime - data.currentTime);
      
      if (diff > SYNC_THRESHOLD) player.seekTo(data.currentTime, true);
      
      const ytState = player.getPlayerState();
      if (data.status === "playing" && ytState !== 1) player.playVideo();
      else if (data.status === "paused" && ytState !== 2) player.pauseVideo();

  } else if (currentType === "html5" || player.tagName === "VIDEO") {
      // --- SYNC HTML5 ---
      const vidTime = player.currentTime;
      const diff = Math.abs(vidTime - data.currentTime);
      
      if (diff > SYNC_THRESHOLD) {
          console.log("🔄 Syncing time:", vidTime, "->", data.currentTime);
          player.currentTime = data.currentTime;
      }
      
      if (data.status === "playing" && player.paused) {
          player.play().catch(e => {
              console.log("Sync play failed (Autoplay block):", e);
              showMobilePlayOverlay();
          });
      } else if (data.status === "paused" && !player.paused) {
          player.pause();
      }
  }
}
// Thay thế toàn bộ hàm leaveRoom cũ
async function leaveRoom(isKicked = false) {
  // 1. Gửi thông báo Chat (Nếu tự rời đi)
  if (!isKicked && currentRoomId) {
    try {
      // Gửi nhanh tin nhắn báo rời
      await db
        .collection("watchRooms")
        .doc(currentRoomId)
        .collection("chat")
        .add({
          content: `${currentUser.displayName} đã rời phòng 🚪`,
          type: "system",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
      console.log("Không gửi được tn rời phòng");
    }
  }

  // 2. Dọn dẹp Voice Chat & Âm thanh (QUAN TRỌNG: FIX LỖI NGHE TIẾNG)
  if (myPeer) {
    myPeer.destroy();
    myPeer = null;
  }
  if (myStream) {
    myStream.getTracks().forEach((track) => track.stop());
    myStream = null;
  }

  // Xóa sạch các thẻ Audio của người khác
  document.querySelectorAll("audio").forEach((el) => el.remove());
  const audioContainer = document.getElementById("audioContainer");
  if (audioContainer) audioContainer.innerHTML = "";

  // 3. Hủy lắng nghe Firebase và Timer
  if (roomUnsubscribe) roomUnsubscribe();
  if (chatUnsubscribe) chatUnsubscribe();
  if (membersUnsubscribe) membersUnsubscribe();
  if (scheduleSyncInterval) {
      clearInterval(scheduleSyncInterval);
      scheduleSyncInterval = null;
  }

  // 4. Dọn dẹp Player
  if (player && typeof player.destroy === "function") {
    try {
      player.destroy();
    } catch (e) {}
  }
  player = null;
  document.getElementById("partyPlayer").innerHTML = ""; // Xóa trắng iframe

  // 5. Xóa tên khỏi danh sách thành viên (Nếu không phải bị kick)
  if (!isKicked && currentRoomId) {
    try {
      await db
        .collection("watchRooms")
        .doc(currentRoomId)
        .collection("members")
        .doc(currentUser.uid)
        .delete();
      await db
        .collection("watchRooms")
        .doc(currentRoomId)
        .update({
          memberCount: firebase.firestore.FieldValue.increment(-1),
        });
    } catch (e) {
      console.log("Lỗi xóa user:", e);
    }
  }

  // 6. Reset giao diện
  currentRoomId = null;
  document.getElementById("partyRoom").classList.add("hidden");
  document.getElementById("partyLobby").classList.remove("hidden");
  // 👇 THÊM DÒNG NÀY ĐỂ MỞ KHÓA CUỘN LẠI
  document.body.classList.remove("watch-party-active");
  // Hiện lại Footer
  const footer = document.querySelector("footer");
  if (footer) footer.style.display = "block";

  console.log("✅ Đã thoát phòng sạch sẽ.");
}
function renderMessage(msg, c) {
  const div = document.createElement("div");
  if (msg.type === "system") {
    div.className = "chat-msg system";
    div.textContent = msg.content;
  } else {
    div.className = `chat-msg ${msg.userId === currentUser.uid ? "me" : ""}`;
    div.innerHTML = `<span class="author">${msg.userId === currentUser.uid ? "" : msg.userName + ":"}</span> <span class="text">${msg.content}</span>`;
  }
  c.appendChild(div);
}
function sendSystemMessage(t) {
  db.collection("watchRooms").doc(currentRoomId).collection("chat").add({
    content: t,
    type: "system",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
function kickUser(uid, name) {
  customConfirm("KICK " + name + "?", { title: "Kick thành viên", type: "warning", confirmText: "Kick" }).then(ok => { if (!ok) return;
  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(uid)
    .delete();
  });
}

// --- GLOBAL CLICK LISTENER: FORCE WAKE UP AUDIO ---
document.addEventListener("click", () => {
  if (globalAudioContext && globalAudioContext.state === "suspended")
    globalAudioContext.resume();
  document.querySelectorAll("audio").forEach((a) => {
    if (a.paused && !a.muted) a.play().catch((e) => {});
  });
});
document.addEventListener(
  "touchstart",
  () => {
    if (globalAudioContext && globalAudioContext.state === "suspended")
      globalAudioContext.resume();
  },
  { passive: true },
);
// ==========================================
// 6. CÁC TIỆN ÍCH UI (TAB, EMOJI, COPY LINK) - BỔ SUNG
// ==========================================

// 1. Chuyển Tab (Chat <-> Thành viên)
function switchRoomTab(tabName) {
  // Xóa active cũ
  document
    .querySelectorAll(".room-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".room-tab-content")
    .forEach((c) => c.classList.remove("active"));

  // Active tab vừa bấm
  event.currentTarget.classList.add("active");

  // Hiện nội dung tương ứng
  if (tabName === "chat") {
    document.getElementById("tabChat").classList.add("active");
  } else {
    document.getElementById("tabMembers").classList.add("active");
  }
}

// 2. Copy Link mời bạn bè
function copyRoomLink() {
  const url = window.location.href;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      showNotification("Đã copy link phòng! Gửi cho bạn bè ngay.", "success");
    })
    .catch(() => {
      showNotification("Lỗi copy link", "error");
    });
}

// 3. Thả tim/Emoji bay bay
function sendReaction(emoji) {
  // Hiển thị ngay trên máy mình
  showFloatingEmoji(emoji);

  // Gửi qua chat để người khác cũng thấy
  db.collection("watchRooms").doc(currentRoomId).collection("chat").add({
    userId: currentUser.uid,
    content: emoji,
    type: "reaction",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function showFloatingEmoji(char) {
  const container = document.getElementById("floatingEmojis");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "float-icon";
  el.textContent = char;
  el.style.left = Math.random() * 80 + 10 + "%"; // Random vị trí ngang
  container.appendChild(el);

  // Tự xóa sau 3 giây
  setTimeout(() => el.remove(), 3000);
}

// 4. Xử lý hiển thị tin nhắn Emoji từ người khác
// (Tìm hàm renderMessage cũ và thay thế, hoặc để đoạn này đè lên cũng được)
const originalRenderMessage = renderMessage; // Lưu hàm cũ
renderMessage = function (msg, container) {
  if (msg.type === "reaction") {
    showFloatingEmoji(msg.content);
    return; // Không hiện reaction vào khung chat cho đỡ rác
  }
  // Nếu là tin nhắn thường thì gọi hàm cũ
  originalRenderMessage(msg, container);
};
// ============================================================
// PHẦN BỔ SUNG: LOGIC QUẢN TRỊ & FIX TAB (DÁN VÀO CUỐI FILE)
// ============================================================

// 1. FIX LỖI CHUYỂN TAB (PC & MOBILE)
// Gán vào window để đảm bảo gọi được từ HTML
window.switchRoomTab = function (tabName) {
  console.log("Đang chuyển sang tab:", tabName);

  // Xóa active cũ
  document
    .querySelectorAll(".room-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".room-tab-content")
    .forEach((c) => c.classList.remove("active"));

  // Active tab button vừa bấm
  // (Tìm nút có data-tab tương ứng hoặc dựa vào event)
  const btns = document.querySelectorAll(".room-tab");
  btns.forEach((btn) => {
    if (
      btn.textContent
        .toLowerCase()
        .includes(tabName === "chat" ? "chat" : "thành viên")
    ) {
      btn.classList.add("active");
    }
  });

  // Hiện nội dung
  if (tabName === "chat") {
    const chatTab = document.getElementById("tabChat");
    if (chatTab) chatTab.classList.add("active");
  } else {
    const memberTab = document.getElementById("tabMembers");
    if (memberTab) memberTab.classList.add("active");
  }
};

// 2. LOGIC CẤM CHAT (Ban Chat)
window.toggleChatBan = async function (uid, shouldBan) {
  if (!currentRoomId) return;
  try {
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(uid)
      .update({
        isChatBanned: shouldBan,
      });
    showNotification(
      shouldBan ? "Đã cấm chat thành viên này" : "Đã mở chat",
      "success",
    );
  } catch (e) {
    console.error("Lỗi cấm chat:", e);
    showNotification("Lỗi: Không thể cấm chat", "error");
  }
};

// 3. LOGIC CẤM MIC (Ban Mic)
window.toggleMicBan = async function (uid, shouldBan) {
  if (!currentRoomId) return;
  try {
    // Cập nhật trạng thái cấm mic VÀ ép tắt mic luôn (isMicMuted = true)
    const updateData = { isMicBanned: shouldBan };
    if (shouldBan) updateData.isMicMuted = true;

    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(uid)
      .update(updateData);
    showNotification(
      shouldBan ? "Đã khóa Mic thành viên này" : "Đã mở khóa Mic",
      "success",
    );
  } catch (e) {
    console.error("Lỗi cấm mic:", e);
  }
};

// 4. CSS BỔ SUNG CHO NÚT BẤM (Dùng JS chèn CSS cho tiện)
const styleAdmin = document.createElement("style");
styleAdmin.innerHTML = `
    .btn-icon-small {
        width: 28px; height: 28px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.1);
        color: #fff;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: 0.2s;
    }
    .btn-icon-small:hover { background: rgba(255,255,255,0.2); }
    .btn-icon-small.active { background: #ff4444; color: white; }
    .btn-icon-small.danger { background: rgba(255,0,0,0.2); color: #ff4444; }
    .btn-icon-small.danger:hover { background: #ff4444; color: white; }
    
    /* Active class cho Tab Content */
    .room-tab-content { display: none !important; height: 100%; }
    .room-tab-content.active { display: flex !important; flex-direction: column; }
`;
document.head.appendChild(styleAdmin);
// ============================================================
// PHẦN BỔ SUNG CUỐI CÙNG: PLAYER & KICK (DÁN NỐI TIẾP)
// ============================================================

// 1. Hàm Kick (Đuổi thành viên) - Trước đó bạn bị thiếu hàm này
window.kickUser = async function (uid, name) {
  if (!currentRoomId) return;
  if (!await customConfirm(`Bạn có chắc muốn mời ${name} ra khỏi phòng?`, { title: "Kick thành viên", type: "warning", confirmText: "Mời ra" })) return;

  try {
    // 1. Gửi thông báo lên kênh Chat trước
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("chat")
      .add({
        content: `🚫 ${name} đã bị mời ra khỏi phòng.`,
        type: "system",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // 2. Xóa thành viên (Code bên phía nạn nhân sẽ tự bắt sự kiện này và thoát)
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(uid)
      .delete();

    // 3. Giảm số lượng
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .update({
        memberCount: firebase.firestore.FieldValue.increment(-1),
      });

    showNotification(`Đã mời ${name} ra khỏi phòng`, "success");
  } catch (e) {
    console.error("Lỗi kick user:", e);
  }
};

// Đảm bảo nút "Rời phòng" trong HTML gọi đúng hàm
// Bạn hãy tìm nút "Rời phòng" trong file HTML (hoặc JS tạo ra nó) và đảm bảo nó là onclick="leaveRoom()"
// Nếu nút đó có ID là "btnLeaveRoom", thêm dòng này vào cuối file JS:
setTimeout(() => {
  const btnLeave =
    document.getElementById("btnLeaveRoom") ||
    document.querySelector(".btn-leave-room");
  if (btnLeave) btnLeave.onclick = () => leaveRoom();
}, 2000);

// 2. Các hàm điều khiển Player (Play, Pause, Tua) - Gán vào window để HTML gọi được
window.syncPlay = function () {
  if (latestRoomData && latestRoomData.scheduledTime) {
      showNotification("Phòng đã lên lịch sẽ tự động phát, không thể thao tác thủ công!", "info");
      return;
  }
  if (!isHost) {
    showNotification("Chỉ chủ phòng mới được bấm Play!", "warning");
    return;
  }
  if (!player) return;

  if (typeof player.playVideo === "function") { // YouTube
    player.playVideo();
    updateRoomState("playing", player.getCurrentTime());
  } else { // HTML5
    player.play().catch(e => {
        console.log("SyncPlay Error:", e);
        showMobilePlayOverlay();
    });
  }
};

window.syncPause = function () {
  if (latestRoomData && latestRoomData.scheduledTime) {
      showNotification("Phòng đang phát theo lịch, không thể tạm dừng!", "info");
      return;
  }
  if (!isHost) {
    showNotification("Chỉ chủ phòng mới được bấm Pause!", "warning");
    return;
  }
  if (!player) return;

  if (typeof player.pauseVideo === "function") { // YouTube
    player.pauseVideo();
    updateRoomState("paused", player.getCurrentTime());
  } else { // HTML5
    player.pause();
  }
};

window.syncSeek = function (seconds) {
  if (latestRoomData && latestRoomData.scheduledTime) {
      showNotification("Phòng đang phát theo lịch, không thể tua!", "info");
      return;
  }
  if (!isHost) {
    showNotification("Chỉ chủ phòng mới được tua!", "warning");
    return;
  }
  if (!player) return;

  let currentTime = 0;
  if (typeof player.getCurrentTime === "function") { // YouTube
      currentTime = player.getCurrentTime();
  } else { // HTML5
      currentTime = player.currentTime;
  }

  const newTime = currentTime + seconds;
  
  if (typeof player.seekTo === "function") { // YouTube
    player.seekTo(newTime, true);
  } else { // HTML5
    player.currentTime = newTime;
  }
  
  updateRoomState("buffering", newTime);
};

// (Hàm updateRoomState đã được hợp nhất lên phía trên)

// ==========================================
// WATCH PARTY - CUSTOM VIDEO CONTROLS LOGIC
// ==========================================
let wpHideTimer = null;

// Helper: Cập nhật trạng thái nút Play (Load/Play/Pause)
function updatePlayButtonState(state) {
    const centerBtn = document.getElementById("wpPlayBtn");
    const centerIcon = document.getElementById("wpPlayIcon");
    const bottomBtn = document.getElementById("wpPlayPauseBtn");
    const bottomIcon = bottomBtn ? bottomBtn.querySelector("i") : null;

    if (state === "loading") {
        if (centerIcon) centerIcon.className = "fas fa-spinner wp-spinner"; // Thêm class xoay
        if (bottomIcon) bottomIcon.className = "fas fa-spinner wp-spinner";
    } else if (state === "playing") {
        if (centerIcon) centerIcon.className = "fas fa-pause";
        if (bottomIcon) bottomIcon.className = "fas fa-pause";
    } else {
        // Paused or default
        if (centerIcon) centerIcon.className = "fas fa-play";
        if (bottomIcon) bottomIcon.className = "fas fa-play";
    }
}

function initWpCustomControls(video) {
    const container = document.getElementById("wpVideoContainer");
    if (!container) return;

    // Duration
    video.addEventListener("loadedmetadata", () => {
        const dur = document.getElementById("wpDuration");
        if (dur) dur.textContent = wpFormatTime(video.duration);
        const slider = document.getElementById("wpProgressSlider");
        if (slider) slider.max = video.duration;
    });

    // Time Update
    video.addEventListener("timeupdate", () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        const bar = document.getElementById("wpProgressBar");
        if (bar) bar.style.width = `${pct}%`;
        const slider = document.getElementById("wpProgressSlider");
        if (slider) slider.value = video.currentTime;
        const ct = document.getElementById("wpCurrentTime");
        if (ct) ct.textContent = wpFormatTime(video.currentTime);

        // Buffer
        if (video.buffered.length > 0) {
            const buf = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
            const bufBar = document.getElementById("wpBufferBar");
            if (bufBar) bufBar.style.width = `${buf}%`;
        }
    });

    // Loading State
    video.addEventListener("waiting", () => updatePlayButtonState("loading"));
    video.addEventListener("play", () => {
      if (isHost) updateRoomState("playing", video.currentTime, video.duration);
      updatePlayButtonState("playing");
    });
    video.addEventListener("pause", () => {
      if (isHost) updateRoomState("paused", video.currentTime, video.duration);
      updatePlayButtonState("paused");
    });
    video.addEventListener("ended", () => {
      if (isHost) updateRoomState("ended", video.duration, video.duration);
      updatePlayButtonState("ended");
    });
    video.addEventListener("canplay", () => {
        if (video.paused) updatePlayButtonState("paused");
        else updatePlayButtonState("playing");
    });
    // video.addEventListener("ended", () => updatePlayButtonState("paused")); // This line is replaced by the new "ended" event listener

    // Seek (Host only via slider)
    const slider = document.getElementById("wpProgressSlider");
    if (slider) {
        slider.addEventListener("change", (e) => {
            if (!isHost) {
                showNotification("Chỉ chủ phòng mới được tua!", "warning");
                return;
            }
            video.currentTime = parseFloat(e.target.value);
            updateRoomState("buffering", video.currentTime);
        });
    }

    // Play/Pause state for center overlay
    video.addEventListener("play", () => {
        container.classList.add("playing");
        container.classList.remove("paused");
        wpUpdatePlayIcons(true);
    });
    video.addEventListener("pause", () => {
        container.classList.remove("playing");
        container.classList.add("paused");
        wpUpdatePlayIcons(false);
    });

    // Volume
    const volSlider = document.getElementById("wpVolumeSlider");
    if (volSlider) {
        volSlider.addEventListener("input", (e) => {
            video.volume = e.target.value;
            wpUpdateVolumeIcon(video.volume);
        });
    }

    // --- LOGIC TỰ ĐỘNG ẨN CONTROL ---
    let hideTimeout = null;
    function wpShowControls() {
        container.classList.remove("user-inactive");
        container.classList.remove("hide-cursor");
        clearTimeout(hideTimeout);
        
        // Kiểm tra trạng thái phát (Hỗ trợ cả HTML5 và YouTube)
        let isPaused = true;
        if (video && !video.paused) {
            isPaused = false;
        } else if (window.player && typeof window.player.getPlayerState === 'function') {
            // YouTube state 1 là đang phát
            if (window.player.getPlayerState() === 1) isPaused = false;
        }

        if (!isPaused) {
            hideTimeout = setTimeout(() => {
                // Không ẩn nếu settings menu đang mở
                const settingsMenu = document.getElementById("wpSettingsMenu");
                if (settingsMenu && settingsMenu.style.display !== 'none') return;
                
                container.classList.add("user-inactive");
                container.classList.add("hide-cursor");
            }, 5000); // 5 giây theo yêu cầu
        }
    }

    container.addEventListener("mousemove", wpShowControls);
    container.addEventListener("touchstart", wpShowControls, { passive: true });
    
    video.addEventListener("play", wpShowControls);
    video.addEventListener("pause", () => {
        clearTimeout(hideTimeout);
        container.classList.remove("user-inactive");
        container.classList.remove("hide-cursor");
    });

    // Set initial state
    container.classList.add("paused");

    // Populate quality if HLS
    if (window.hlsInstance) {
        wpPopulateQuality(window.hlsInstance);
        window.hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (evt, data) => {
            wpUpdateQualityDisplay(data.level);
        });
    }
}

function wpFormatTime(s) {
    if (!s || isNaN(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m < 10 ? "0" + m : m}:${sec < 10 ? "0" + sec : sec}`;
}

function wpUpdatePlayIcons(isPlaying) {
    const icon = isPlaying ? "fas fa-pause" : "fas fa-play";
    const center = document.querySelector("#wpPlayIcon");
    const bottom = document.querySelector("#wpPlayPauseBtn i");
    if (center) center.className = icon;
    if (bottom) bottom.className = icon;
}

function wpUpdateVolumeIcon(vol) {
    const icon = document.querySelector("#wpVolumeBtn i");
    if (!icon) return;
    if (vol == 0) icon.className = "fas fa-volume-mute";
    else if (vol < 0.5) icon.className = "fas fa-volume-down";
    else icon.className = "fas fa-volume-up";
}

window.wpToggleMute = function() {
    if (!player || !player.tagName) return;
    player.muted = !player.muted;
    wpUpdateVolumeIcon(player.muted ? 0 : player.volume);
    const slider = document.getElementById("wpVolumeSlider");
    if (slider) slider.value = player.muted ? 0 : player.volume;
};

// --- Settings ---
window.wpToggleSettings = function() {
    const menu = document.getElementById("wpSettingsMenu");
    if (!menu) return;
    if (menu.style.display === "flex") {
        menu.style.display = "none";
    } else {
        menu.style.display = "flex";
    }
};

window.wpShowSubMenu = function(type) {
    document.getElementById("wpSettingsMenu").style.display = "none";
    if (type === 'speed') document.getElementById("wpSpeedMenu").style.display = "flex";
    else if (type === 'quality') document.getElementById("wpQualityMenu").style.display = "flex";
    else if (type === 'color') document.getElementById("wpColorMenu").style.display = "flex";
};

window.wpHideSubMenu = function() {
    const speed = document.getElementById("wpSpeedMenu");
    const quality = document.getElementById("wpQualityMenu");
    const color = document.getElementById("wpColorMenu");
    if (speed) speed.style.display = "none";
    if (quality) quality.style.display = "none";
    if (color) color.style.display = "none";
    document.getElementById("wpSettingsMenu").style.display = "flex";
};

window.wpSetSpeed = function(rate) {
    if (!isHost) { showNotification("Chỉ chủ phòng mới đổi tốc độ!", "warning"); return; }
    if (!player || !player.tagName) return;
    player.playbackRate = rate;
    const label = document.getElementById("wpSpeedVal");
    if (label) label.textContent = rate === 1 ? "Chuẩn" : rate + "x";
    
    document.querySelectorAll("#wpSpeedMenu .submenu-item").forEach(item => {
        item.classList.remove("active");
        if (item.textContent.includes(rate === 1 ? "Chuẩn" : rate + "x")) item.classList.add("active");
    });
    wpHideSubMenu();
    wpToggleSettings();
};

// --- Quality (HLS only) ---
function wpPopulateQuality(hls) {
    const menu = document.getElementById("wpQualityMenu");
    const item = document.getElementById("wpQualityItem");
    if (!menu || !hls || !hls.levels || hls.levels.length <= 1) return;
    if (item) item.style.display = "flex";
    
    const existing = menu.querySelectorAll(".submenu-item:not([data-level='-1'])");
    existing.forEach(el => el.remove());
    
    const levels = hls.levels.map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate }))
        .sort((a, b) => a.height - b.height);
    
    levels.forEach(level => {
        const el = document.createElement("div");
        el.className = "submenu-item";
        el.dataset.level = level.index;
        el.onclick = () => wpSetQuality(level.index);
        el.innerHTML = `${level.height}p <span class="quality-bitrate">${Math.round(level.bitrate/1000)} kbps</span>`;
        menu.appendChild(el);
    });
}

function wpUpdateQualityDisplay(levelIndex) {
    const hls = window.hlsInstance;
    if (!hls) return;
    const label = document.getElementById("wpQualityVal");
    if (!label) return;
    if (hls.autoLevelEnabled || levelIndex === -1) {
        const cur = hls.levels[hls.currentLevel];
        label.textContent = `Tự động (${cur ? cur.height : '?'}p)`;
    } else {
        const lv = hls.levels[levelIndex];
        label.textContent = lv ? `${lv.height}p` : 'N/A';
    }
}

window.wpSetQuality = function(levelIndex) {
    // Mở cho tất cả user vì mạng mỗi người khác nhau
    const hls = window.hlsInstance;
    if (!hls) return;
    hls.currentLevel = levelIndex;
    wpUpdateQualityDisplay(levelIndex);
    wpHideSubMenu();
    wpToggleSettings();
};

// --- Subtitle Color (All users) ---
window.wpSetSubtitleColor = function(color) {
    // Áp dụng màu cho phụ đề của video
    if (player && player.tagName === "VIDEO" && player.textTracks) {
        for (let i = 0; i < player.textTracks.length; i++) {
            const track = player.textTracks[i];
            if (track.cues) {
                for (let j = 0; j < track.cues.length; j++) {
                    track.cues[j].snapToLines = false;
                    track.cues[j].line = 90;
                }
            }
        }
    }

    // Lưu màu vào CSS variable cho video
    const container = document.getElementById("wpVideoContainer");
    if (container) {
        container.style.setProperty("--subtitle-color", color);
    }

    // Áp màu trực tiếp qua style tag
    let styleTag = document.getElementById("wp-subtitle-style");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "wp-subtitle-style";
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
        #partyHtml5Player::cue {
            color: ${color} !important;
            background: rgba(0,0,0,0.5) !important;
        }
    `;

    // Update UI
    const label = document.getElementById("wpColorVal");
    const names = { white: "Trắng", yellow: "Vàng", cyan: "Xanh dương", green: "Xanh lá" };
    if (label) label.textContent = names[color] || color;

    // Mark active
    document.querySelectorAll("#wpColorMenu .submenu-item").forEach(item => {
        item.classList.toggle("active", item.dataset.color === color);
    });

    wpHideSubMenu();
    wpToggleSettings();
};

// --- Fullscreen (All users) ---
window.wpToggleFullscreen = function() {
    const container = document.getElementById("wpVideoContainer");
    const icon = document.querySelector("#wpFullscreenBtn i");
    let isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

    if (!isFullscreen) {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen(); // Safari desktop/Android
        } else if (player && player.tagName === "VIDEO" && player.webkitEnterFullscreen) {
            // Cứu cánh cho iOS Safari (chỉ cho phép video fullscreen, không cho div)
            player.webkitEnterFullscreen();
            return;
        }
        if (icon) icon.className = "fas fa-compress";
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        if (icon) icon.className = "fas fa-expand";
    }
};

// Update syncPlay to also toggle pause (for center button)
const _originalSyncPlay = window.syncPlay;
window.syncPlay = function() {
    if (!isHost) { showNotification("Chỉ chủ phòng mới được điều khiển!", "warning"); return; }
    if (!player) return;
    
    if (player.tagName === "VIDEO") {
        if (player.paused) {
            player.play().catch(e => {});
        } else {
            player.pause();
        }
    } else if (typeof player.playVideo === "function") {
        // YouTube
        const state = player.getPlayerState();
        if (state === 1) { // Playing
            player.pauseVideo();
            updateRoomState("paused", player.getCurrentTime());
        } else {
            player.playVideo();
            updateRoomState("playing", player.getCurrentTime());
        }
    }
};

// --- MOBILE AUTOPLAY FIX ---
window.showMobilePlayOverlay = function() {
    const overlay = document.getElementById("wpMobilePlayOverlay");
    if (overlay) overlay.classList.remove("hidden");
};

window.wpInteractToPlay = function() {
    const overlay = document.getElementById("wpMobilePlayOverlay");
    if (overlay) overlay.classList.add("hidden");
    
    if (!player) return;
    
    // Phát video sau khi có tương tác
    if (player.tagName === "VIDEO") {
        player.play().catch(e => console.error("Still blocked after tap:", e));
    } else if (typeof player.playVideo === "function") {
        player.playVideo();
    }
};

/* ==========================================
   SCHEDULED ROOMS LOGIC (Hẹn giờ)
   ========================================== */
window.toggleScheduleInput = function() {
    const isChecked = document.getElementById("roomScheduleToggle").checked;
    const group = document.getElementById("roomScheduleInputGroup");
    const dateInput = document.getElementById("roomScheduledTime");
    
    if (isChecked) {
        group.classList.remove("hidden");
        // Mặc định set thời gian cách hiện tại 10 phút
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        
        // Format yyyy-MM-ddThh:mm (UTC localizer fix)
        const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
        dateInput.value = localISOTime;
    } else {
        group.classList.add("hidden");
        dateInput.value = "";
    }
};

// Hàm định dạng khoảng thời gian tương đối
window.formatRelativeTime = function(timestamp) {
    if (!timestamp) return "";
    
    const now = new Date();
    // Firestore Timestamp to JS Date
    const targetDate = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    const diffMs = targetDate - now;
    
    // Nếu quá khứ (đã/đang chiếu)
    if (diffMs <= 0) {
        return { isFuture: false, text: "Đã chiếu" };
    }
    
    // Tương lai (sắp chiếu)
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
        return { isFuture: true, text: `Chiếu sau ${diffDays} ngày` };
    } else if (diffHours > 0) {
        return { isFuture: true, text: `Chiếu lúc ${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}` };
    } else {
        return { isFuture: true, text: `Sắp chiếu (${diffMins} phút)` };
    }
};

// ==========================================
// SCHEDULE SYNC ENGINE (Chiến lược đồng bộ chuyên nghiệp)
// Tham khảo YouTube Premiere / Twitch:
//   Tầng 1: Seek MỘT LẦN khi mới vào phòng
//   Tầng 2: Điều chỉnh playbackRate (1.03x / 0.97x) để bù trễ nhẹ
//   Tầng 3: Hard Seek cho lệch lớn (>30s), có cooldown 15s
// ==========================================
function startScheduleSync(roomData) {
    const newTime = typeof roomData.scheduledTime.toDate === 'function' 
        ? roomData.scheduledTime.toDate().getTime() 
        : new Date(roomData.scheduledTime).getTime();

    // Cache: Nếu interval đang chạy cho cùng mốc thời gian -> Bỏ qua
    if (scheduleSyncInterval && currentScheduledTime === newTime) {
        return;
    }

    currentScheduledTime = newTime;
    if (scheduleSyncInterval) clearInterval(scheduleSyncInterval);

    let hasInitialSeeked = false;  // Cờ: Đã tua lần đầu chưa
    let lastHardSeekTime = 0;      // Thời điểm hard-seek gần nhất (ms)
    const HARD_SEEK_COOLDOWN = 15000; // 15 giây giữa 2 lần hard-seek
    const DRIFT_TOLERANCE = 5;     // Dưới 5s lệch -> coi là OK, không làm gì
    const RATE_ADJUST_RANGE = 15;  // 5-15s lệch -> Dùng playbackRate bù
    const HARD_SEEK_THRESHOLD = 30; // >30s lệch -> Bắt buộc hard-seek

    scheduleSyncInterval = setInterval(() => {
        if (!player) return;
        
        // 🔥 KIỂM TRA TRẠNG THÁI TỪ DB TRƯỚC (QUAN TRỌNG)
        if (latestRoomData && latestRoomData.status === "ended") {
            console.log("🛑 Engine detected ended status from DB. Stopping sync.");
            showRoomEndedOverlay(latestRoomData.endedAt);
            if (player.pauseVideo) player.pauseVideo();
            else player.pause();
            clearInterval(scheduleSyncInterval);
            scheduleSyncInterval = null;
            return;
        }

        const now = new Date();
        const schedDate = new Date(newTime);
        const diffSeconds = (now - schedDate) / 1000; // Số giây kể từ lúc hẹn giờ
        const syncStatus = document.getElementById("syncStatus");

        const isYt = (player.videoType === "youtube" || typeof player.getPlayerState === "function");

        // Lấy duration thực tế từ player hoặc DB
        const videoDuration = (isYt ? (player.getDuration ? player.getDuration() : 0) : player.duration) || roomData.duration || 0;

        if (diffSeconds >= 0) {
            // ========== ĐÃ QUA GIỜ CHIẾU ==========
            
            // 🔥 NẾU DIFF VƯỢT QUÁ DURATION THÌ KẾT THÚC LUÔN (TRÁNH SEEK VÔ TẬN)
            if (videoDuration > 0 && diffSeconds >= videoDuration) {
                console.log("🎬 diffSeconds exceeds videoDuration. Ending sync engine.");
                
                // Tính chính xác mốc thời gian phim hết
                const actualEndTime = new Date(schedDate.getTime() + videoDuration * 1000);
                
                if (isHost) updateRoomState("ended", videoDuration, videoDuration);
                showRoomEndedOverlay(actualEndTime);
                
                clearInterval(scheduleSyncInterval);
                scheduleSyncInterval = null;
                return;
            }

            let currentTime = 0;
            let isPlaying = false;
            let isBufferingState = false;

            if (isYt) {
                const ytState = player.getPlayerState ? player.getPlayerState() : -1;
                currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
                isPlaying = (ytState === 1);
                isBufferingState = (ytState === 3);

                // Đảm bảo video đang chạy
                if (!isPlaying && !isBufferingState) {
                    player.playVideo();
                }
            } else {
                currentTime = player.currentTime || 0;
                isPlaying = !player.paused;
                isBufferingState = (player.readyState < 3);

                if (!isPlaying && !isBufferingState) {
                    player.play().catch(e => {
                        console.log("Schedule auto-play blocked", e);
                        showMobilePlayOverlay();
                    });
                }
            }

            const drift = diffSeconds - currentTime;  // Dương = video chạy chậm hơn thực tế
            const absDrift = Math.abs(drift);

            // --- TẦNG 1: Initial Seek (Chỉ chạy 1 lần duy nhất khi mới vào phòng) ---
            if (!hasInitialSeeked && diffSeconds > 2) {
                hasInitialSeeked = true;
                console.log(`⏩ [ScheduleSync] Initial seek tới ${Math.round(diffSeconds)}s`);
                if (isYt) {
                    player.seekTo(diffSeconds, true);
                } else {
                    player.currentTime = diffSeconds;
                }
                // Hiện loader trong lúc seek lần đầu
                if (syncStatus) {
                    syncStatus.classList.remove("hidden");
                    syncStatus.querySelector("span").textContent = "Đang đồng bộ lần đầu...";
                }
                return; // Thoát sớm, đợi video load xong tick tiếp theo
            }

            // Nếu đang buffering thì chỉ hiện UI chờ, KHÔNG CAN THIỆP video
            if (isBufferingState) {
                if (syncStatus) {
                    syncStatus.classList.remove("hidden");
                    syncStatus.querySelector("span").textContent = "Đang tải luồng...";
                }
                return; // QUAN TRỌNG: Không làm gì khi đang buffer
            }

            // --- TẦNG 2: Playback Rate Adjustment (Bù trễ mượt mà, không giật) ---
            if (absDrift > DRIFT_TOLERANCE && absDrift <= HARD_SEEK_THRESHOLD) {
                // Video chạy chậm hơn thực tế -> Tăng tốc nhẹ
                if (drift > DRIFT_TOLERANCE) {
                    const newRate = Math.min(1.05, 1 + (absDrift / 200)); // Tối đa 1.05x
                    if (isYt) {
                        if (player.setPlaybackRate) player.setPlaybackRate(newRate);
                    } else {
                        player.playbackRate = newRate;
                    }
                }
                // Video chạy nhanh hơn thực tế -> Chậm lại nhẹ
                else if (drift < -DRIFT_TOLERANCE) {
                    const newRate = Math.max(0.95, 1 - (absDrift / 200)); // Tối thiểu 0.95x
                    if (isYt) {
                        if (player.setPlaybackRate) player.setPlaybackRate(newRate);
                    } else {
                        player.playbackRate = newRate;
                    }
                }

                // Ẩn loader vì video đang chạy bình thường (chỉ hơi lệch)
                if (syncStatus) syncStatus.classList.add("hidden");
            }
            // --- TẦNG 3: Hard Seek (Lệch quá lớn, bắt buộc phải nhảy) ---
            else if (absDrift > HARD_SEEK_THRESHOLD) {
                const nowMs = Date.now();
                if (nowMs - lastHardSeekTime > HARD_SEEK_COOLDOWN) {
                    lastHardSeekTime = nowMs;
                    console.warn(`⚡ [ScheduleSync] Hard seek: lệch ${Math.round(absDrift)}s -> tua tới ${Math.round(diffSeconds)}s`);
                    if (isYt) {
                        player.seekTo(diffSeconds, true);
                    } else {
                        player.currentTime = diffSeconds;
                    }
                    if (syncStatus) {
                        syncStatus.classList.remove("hidden");
                        syncStatus.querySelector("span").textContent = "Đang đồng bộ lại...";
                    }
                } else {
                    // Đang trong cooldown -> Chỉ hiện thông báo, không seek
                    if (syncStatus) {
                        syncStatus.classList.remove("hidden");
                        syncStatus.querySelector("span").textContent = "Đang bắt kịp tiến độ...";
                    }
                }
            }
            // --- Drift OK (dưới ngưỡng) -> Reset playbackRate về chuẩn ---
            else {
                if (isYt) {
                    if (player.setPlaybackRate) player.setPlaybackRate(1);
                } else {
                    player.playbackRate = 1;
                }
                if (syncStatus) syncStatus.classList.add("hidden");
            }

            // Nếu video đã chạy vượt quá duration thì đánh dấu kết thúc
            if (roomData.duration && diffSeconds >= roomData.duration) {
                if (isYt) { if (player.pauseVideo) player.pauseVideo(); }
                else player.pause();
                if (syncStatus) syncStatus.classList.add("hidden");
                
                // 🔥 QUAN TRỌNG: Cập nhật trạng thái "ended" lên Firestore cho phòng hẹn giờ
                if (isHost) {
                    updateRoomState("ended", roomData.duration);
                }
                
                clearInterval(scheduleSyncInterval);
                scheduleSyncInterval = null;
                currentScheduledTime = null;
            }
        } else {
            // ========== CHƯA TỚI GIỜ CHIẾU ==========
            if (syncStatus) {
                syncStatus.classList.remove("hidden");
                const remaining = Math.abs(Math.floor(diffSeconds));
                const rmMin = Math.floor(remaining / 60);
                const rmSec = remaining % 60;
                syncStatus.querySelector("span").innerHTML = `Chờ phát sóng: <b>${rmMin}:${rmSec.toString().padStart(2, '0')}</b>`;
            }

            if (isYt) {
                if (player.getPlayerState && player.getPlayerState() === 1) {
                    player.pauseVideo();
                }
                if (player.getCurrentTime && player.getCurrentTime() > 1) player.seekTo(0, true);
            } else {
                if (!player.paused) player.pause();
                if (player.currentTime > 1) player.currentTime = 0;
            }
        }
    }, 3000); // Kiểm tra mỗi 3 giây thay vì 1 giây (giảm tải CPU/Network)
}

/** Hàm kiểm tra phòng đã kết thúc chưa (Dùng chung cho cả Lobby và Room) **/
function checkIfRoomEnded(room) {
    if (!room) return { isActuallyEnded: false };
    
    // 1. Trạng thái cứng từ DB
    if (room.status === "ended") {
        return { isActuallyEnded: true, endedAt: room.endedAt || room.lastUpdated || new Date() };
    }

    // 2. Lấy duration (ưu tiên DB, sau đó tra cứu allMovies)
    let duration = room.duration || 0;
    if (!duration && typeof allMovies !== 'undefined' && room.movieId) {
        const movie = allMovies.find(m => m.id === room.movieId);
        if (movie && movie.duration) {
            const mins = parseInt(movie.duration.replace(/\D/g, ''));
            if (mins) duration = mins * 60;
        }
        if (movie && movie.episodes && room.episodeIndex !== undefined) {
             const ep = movie.episodes[room.episodeIndex];
             if (ep && ep.duration) duration = ep.duration;
        }
    }

    // 3. Kiểm tra dựa trên thời lượng (duration) và thời gian bắt đầu
    let startTime = null;
    if (room.scheduledTime) {
        startTime = room.scheduledTime.toDate ? room.scheduledTime.toDate() : new Date(room.scheduledTime);
    } else if (room.startedAt) {
        startTime = room.startedAt.toDate ? room.startedAt.toDate() : new Date(room.startedAt);
    }

    if (startTime && duration > 0) {
        const now = new Date();
        const expectedEnd = new Date(startTime.getTime() + duration * 1000);
        
        // Nếu đã qua thời điểm kết thúc dự kiến (+ 5s buffer cho mượt)
        if (now >= expectedEnd) {
            return { isActuallyEnded: true, endedAt: expectedEnd };
        }
    }

    // 4. Fallback: Kiểm tra dựa trên currentTime (nếu đang trong phòng)
    if (duration > 0 && room.currentTime >= duration - 3) {
        let calcEnd = new Date();
        if (startTime) {
            calcEnd = new Date(startTime.getTime() + duration * 1000);
        }
        return { isActuallyEnded: true, endedAt: calcEnd };
    }

    return { isActuallyEnded: false };
}

function showRoomEndedOverlay(endedAt) {
    const overlay = document.getElementById("roomEndedOverlay");
    const timeText = document.getElementById("endedTimeText");
    if (!overlay) return;

    overlay.classList.add("active");
    
    // Tắt các điều khiển khác
    const controls = document.getElementById("wpCenterOverlay");
    const bottomBar = document.getElementById("wpControlsBar");
    if (controls) controls.style.display = "none";
    if (bottomBar) bottomBar.style.display = "none";

    if (endedAt) {
        try {
            const date = endedAt.toDate ? endedAt.toDate() : new Date(endedAt);
            if (!isNaN(date.getTime())) {
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString();
                timeText.innerText = `Phòng đã đóng lúc: ${timeStr} - ${dateStr}`;
            } else {
                timeText.innerText = `Phòng đã đóng.`;
            }
        } catch (e) {
            timeText.innerText = `Phòng đã đóng.`;
        }
    } else {
        timeText.innerText = `Phòng đã đóng.`;
    }
}

/** Ẩn lớp phủ kết thúc phòng **/
function hideRoomEndedOverlay() {
    const overlay = document.getElementById("roomEndedOverlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    
    // Hiện lại các điều khiển
    const controls = document.getElementById("wpCenterOverlay");
    const bottomBar = document.getElementById("wpControlsBar");
    if (controls) controls.style.display = "flex";
    if (bottomBar) bottomBar.style.display = "flex";
}

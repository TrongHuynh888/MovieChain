/**
 * UTILS.JS - Các hàm tiện ích dùng chung
 * (Đã cập nhật: showPage và toggleSidebar)
 */

// ============================================
// 0. HÀM TỐI ƯU HIỆU NĂNG (CORE OPTIMIZATION)
// ============================================

/**
 * Debounce: Trì hoãn thực thi hàm cho đến khi ngừng kích hoạt trong một khoảng thời gian
 */
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Throttle: Giới hạn số lần thực thi hàm trong một khoảng thời gian
 */
function throttle(fn, limit) {
  let lastFunc;
  let lastRan;
  return function (...args) {
    if (!lastRan) {
      fn.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        function () {
          if (Date.now() - lastRan >= limit) {
            fn.apply(this, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan),
      );
    }
  };
}

// ============================================
// 1. GIAO DIỆN & THÔNG BÁO
// ============================================

function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const icons = {
    success: "fa-check-circle",
    error: "fa-times-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
          <i class="fas ${icons[type] || icons.info}"></i>
          <div class="notification-content">${message}</div>
          <button class="notification-close" onclick="this.parentElement.remove()">
              <i class="fas fa-times"></i>
          </button>
      `;

  container.appendChild(notification);

  setTimeout(() => {
    if (notification) {
      notification.style.animation = "slideIn 0.3s ease reverse";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

function showLoading(show, text = "Đang xử lý...") {
  const overlay = document.getElementById("loadingOverlay");
  const loadingText = document.getElementById("loadingText");

  if (show) {
    if (loadingText) loadingText.textContent = text;
    if (overlay) {
        overlay.classList.add("active");
        document.body.classList.add("modal-open");
    }
  } else {
    if (overlay) {
        overlay.classList.remove("active");
        // Kiểm tra xem còn modal nào khác đang mở không
        setTimeout(() => {
            const anyActiveModal = document.querySelector(".modal-overlay.active, .custom-popup-overlay.active, #loadingOverlay.active");
            if (!anyActiveModal) {
                document.body.classList.remove("modal-open");
            }
        }, 100);
    }
  }
}

// ============================================
// 2. XỬ LÝ FORMAT DỮ LIỆU
// ============================================

function formatNumber(num) {
  return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
}
/**Định dạng ngày theo dd/mm/yyyy */
function formatDate(date) {
  if (!date) return "N/A";
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
/**
 * Format ngày giờ chi tiết (dd/mm/yyyy HH:mm:ss)
 */
function formatDateTime(date) {
  if (!date) return "N/A";
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
function formatTimeAgo(date) {
  const now = new Date();
  const d = date.toDate ? date.toDate() : new Date(date);
  const diff = now - d;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(d);
  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return "Vừa xong";
}

function createSlug(text) {
  if (!text) return "";
  let slug = text.toLowerCase();

  // 1. Xử lý tiếng Việt (Bỏ dấu)
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Loại bỏ các dấu kết hợp
  slug = slug.replace(/[đĐ]/g, "d");
  
  // 2. Thay thế các ký tự đặc biệt và khoảng trắng
  slug = slug.replace(/[^a-z0-9\s-]/g, "") // Xóa ký tự lạ (giữ lại khoảng trắng và gạch ngang)
             .replace(/\s+/g, "-")         // Thay khoảng trắng thành gạch ngang
             .replace(/-+/g, "-")          // Xóa các dấu gạch ngang bị lặp
             .trim()                       // Cắt lề 2 đầu
             .replace(/^-+|-+$/g, "");      // Xóa gạch ngang ở đầu và cuối

  return slug;
}

function getStatusText(status) {
  const texts = {
    public: "Công khai",
    hidden: "Ẩn",
    pending: "Chờ duyệt",
    completed: "Hoàn thành",
    failed: "Thất bại",
  };
  return texts[status] || status;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// 3. ĐIỀU HƯỚNG & MODAL
// ============================================

function showPage(pageName, addToHistory = true) {
  // 0. Cập nhật URL (Sử dụng Hash Routing để fix lỗi F5)
  if (addToHistory) {
      let basePath = window.APP_BASE_PATH || "";
      // Đảm bảo không bị double slash khi nối với #/
      const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
      const url = pageName === 'home' ? basePath : `${cleanBase}#/${pageName}`;
      history.pushState({ page: pageName }, "", url);
  }
  
  // 0.5 Reset Metadata về mặc định nếu rời khỏi trang phim
  if (pageName !== "watch" && pageName !== "movieDetail" && pageName !== "movieIntro") {
      if (typeof updatePageMetadata === "function") {
          updatePageMetadata(
              "Trạm Phim - Trải Nghiệm Điện Ảnh Đẳng Cấp",
              "Trạm Phim - Nền tảng xem phim Web3 tiên phong. Trải nghiệm điện ảnh đỉnh cao, bảo mật và tích hợp thanh toán Crypto.",
              "https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico",
              window.location.href
          );
      }
  }

  // 1. Ẩn tất cả các trang
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // 2. Hiện trang cần đến
  const targetPage = document.getElementById(`${pageName}Page`);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // 3. Update menu active
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
    if (link.dataset.page === pageName) {
      link.classList.add("active");
    }
  });

  // 3b. Trigger Series Movies Page Logic
  if (pageName === 'seriesMovies' && typeof window.renderSeriesMoviesPage === 'function') {
      window.renderSeriesMoviesPage();
  }

  // 3c. Trigger Single Movies Page Logic
  if (pageName === 'singleMovies' && typeof window.renderSingleMoviesPage === 'function') {
      window.renderSingleMoviesPage();
  }

  // 4. Xử lý riêng cho trang Admin và Footer
  const footer = document.getElementById("footer");
  if (pageName === "admin") {
    if (footer) footer.style.display = "none";
    // Load data admin nếu cần
    if (typeof loadAdminData === "function") loadAdminData();
  } else {
    if (footer) footer.style.display = "block";
  }

  // 5. Nút sidebar (Quản lý trạng thái Admin Mode)
  const navbar = document.getElementById("navbar");
  if (navbar) {
    if (pageName === "admin") {
      navbar.classList.add("admin-mode");
      document.body.classList.add("admin-mode");
    } else {
      navbar.classList.remove("admin-mode");
      document.body.classList.remove("admin-mode");
    }
  }

  // 👇 6. LOGIC MỚI: Nếu vào trang Thể loại thì vẽ danh sách ra
  if (pageName === "categories" && typeof renderCategoriesList === "function") {
    renderCategoriesList();
  }
  // 👉 THÊM ĐOẠN NÀY CHO QUỐC GIA:
  if (pageName === "countries" && typeof renderCountriesList === "function") {
    renderCountriesList();
  }
  // 👉 THÊM ĐOẠN NÀY CHO DIỄN VIÊN:
  if (pageName === "actors" && typeof renderActorsPage === "function") {
    renderActorsPage();
  }
  // Cuộn lên đầu
  window.scrollTo(0, 0);
}

/**
 * Mở Modal bất kỳ (Dùng cho cả Đăng nhập, Profile, Thông báo...)
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Tìm lớp phủ mờ (overlay) bao quanh nó
    const overlay = modal.closest(".modal-overlay");
    if (overlay) {
      overlay.classList.add("active"); // Hiện overlay
      document.body.classList.add("modal-open"); // Khóa/Ẩn nút cuộn
    } else {
      modal.classList.add("active"); // Fallback nếu không có overlay
      document.body.classList.add("modal-open");
    }
  } else {
    console.error("Không tìm thấy modal có ID:", modalId);
  }
}

/**
 * Đóng Modal
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const overlay = modal.closest(".modal-overlay");
    if (overlay) {
      overlay.classList.remove("active"); // Ẩn overlay
    } else {
      modal.classList.remove("active");
    }
    // Kiểm tra xem còn modal nào mở không trước khi gỡ class modal-open
    setTimeout(() => {
        const anyActiveModal = document.querySelector(".modal-overlay.active, .custom-popup-overlay.active");
        if (!anyActiveModal) {
            document.body.classList.remove("modal-open");
        }
    }, 100);
  }
}

/**
 * Chuyển đổi qua lại giữa tab Đăng nhập và Đăng ký
 */
function switchAuthTab(tabName) {
  // 1. Ẩn tất cả các form (Login Form & Register Form)
  // Sửa lỗi: forFach -> forEach
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.remove("active");
  });

  // 2. Bỏ trạng thái active của tab cũ
  // Sửa lỗi: forFach -> forEach
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    // Sửa lỗi: aclive -> active
    tab.classList.remove("active");
  });

  // 3. Hiện form mới dựa trên tabName ('login' hoặc 'register')
  const targetForm = document.getElementById(tabName + "Form");
  if (targetForm) {
    targetForm.classList.add("active");
  }

  // 4. Active tab mới (để gạch chân dưới chân tab)
  const targetTab = document.querySelector(
    `.auth-tab[onclick*="'${tabName}'"]`,
  );
  if (targetTab) {
    targetTab.classList.add("active");
  }
}
// 👇 HÀM MỚI BỔ SUNG ĐỂ SỬA LỖI NÚT 3 GẠCH 👇
// 👇 HÀM TOGGLE SIDEBAR (SỬA LỖI ADMIN: TỰ ĐỘNG NHẬN DIỆN MOBILE/PC)
/* ============================================================
   HÀM TOGGLE SIDEBAR (ĐÃ FIX: ĐỒNG BỘ OVERLAY & MENU)
   ============================================================ */
/* Dán đè hàm này vào js/utils.js */
function toggleSidebar() {
  const sidebar = document.querySelector(".admin-sidebar");
  const overlayId = "adminSidebarOverlay";

  if (!sidebar) return;

  // 1. Logic cho Mobile
  if (window.innerWidth <= 768) {
    // Toggle trạng thái mở/đóng
    sidebar.classList.toggle("active");

    // Kiểm tra xem nó vừa mở hay vừa đóng?
    const isOpen = sidebar.classList.contains("active");

    // Xử lý lớp phủ đen (Overlay)
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = overlayId;
      overlay.style.cssText =
        "position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:5999; display:none; cursor:pointer;";

      // QUAN TRỌNG: Bấm vào đen -> BẮT BUỘC ĐÓNG
      overlay.onclick = function () {
        sidebar.classList.remove("active"); // Gỡ class active
        overlay.style.display = "none"; // Ẩn overlay
      };
      document.body.appendChild(overlay);
    }

    // Đồng bộ hiển thị: Menu mở thì hiện Overlay, Menu đóng thì ẩn
    overlay.style.display = isOpen ? "block" : "none";
  } else {
    // 2. Logic cho Desktop (Thu nhỏ menu)
    sidebar.classList.toggle("collapsed");
    const content = document.querySelector(".admin-content");
    if (content) content.classList.toggle("expanded");
  }
}
// ============================================
// 4. KHỞI TẠO UI (Navbar, Theme...)
// ============================================

function initializeUI() {
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const icon = document.getElementById("themeIcon");
  if (icon)
    icon.className = savedTheme === "dark" ? "fas fa-moon" : "fas fa-sun";
}

function initNavbarScroll() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", throttle(() => {
    if (window.scrollY > 50) {
      navbar?.classList.add("scrolled");
    } else {
      navbar?.classList.remove("scrolled");
    }
  }, 100));
}

// ... (Các code cũ giữ nguyên)

// ============================================
// 5. LOGIC ĐÁNH GIÁ SAO (STAR RATING)
// ============================================

function initializeRatingStars() {
  const container = document.getElementById("ratingStars");
  const valueDisplay = document.getElementById("ratingValue");

  if (!container) return; // Nếu không có chỗ chứa sao thì thôi

  // Tạo 10 ngôi sao
  let html = "";
  for (let i = 1; i <= 10; i++) {
    html += `<i class="far fa-star star-item" data-value="${i}" style="cursor: pointer; margin: 0 2px; font-size: 1.2rem; transition: color 0.2s;"></i>`;
  }
  container.innerHTML = html;

  // Gán sự kiện click và hover
  const stars = container.querySelectorAll(".star-item");
  stars.forEach((star) => {
    // 1. Khi bấm chọn
    star.addEventListener("click", () => {
      const value = parseInt(star.dataset.value);
      selectedRating = value; // Cập nhật biến toàn cục
      if (valueDisplay) valueDisplay.textContent = `${value}/10`;

      // Tô màu các sao đã chọn
      updateRatingStars(value);
    });

    // 2. Khi rê chuột vào (Hiệu ứng hover)
    star.addEventListener("mouseover", () => {
      const value = parseInt(star.dataset.value);
      updateRatingStars(value, true); // true = đang hover
    });
  });

  // 3. Khi chuột rời khỏi vùng sao -> Trả về trạng thái đã chọn
  container.addEventListener("mouseleave", () => {
    updateRatingStars(selectedRating);
  });
}

/**
 * Hàm tô màu ngôi sao
 */
function updateRatingStars(value, isHover = false) {
  const stars = document.querySelectorAll("#ratingStars .star-item");
  stars.forEach((star) => {
    const starValue = parseInt(star.dataset.value);

    if (starValue <= value) {
      // Sao sáng (Vàng)
      star.className = "fas fa-star star-item active";
      star.style.color = "#fcd535";
    } else {
      // Sao tối (Rỗng)
      star.className = "far fa-star star-item";
      star.style.color = isHover ? "#ccc" : ""; // Nếu hover thì xám nhạt, không thì màu mặc định
    }
  });
}
// ============================================
// 5. THEME & MOBILE MENU (FIX LỖI)
// ============================================

// Hàm đổi giao diện Sáng/Tối
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);

  // Đổi icon mặt trăng/mặt trời
  const icon = document.getElementById("themeIcon");
  if (icon) {
    icon.className = next === "dark" ? "fas fa-moon" : "fas fa-sun";
  }
}

// Hàm bật/tắt menu trên điện thoại
function toggleMobileMenu() {
  const menu = document.getElementById("navMenu");
  const btn = document.getElementById("mobileMenuToggle");

  if (menu) {
    menu.classList.toggle("active");

    // Đổi icon từ 3 gạch (bars) sang dấu X (times) và ngược lại
    const icon = btn.querySelector("i");
    if (icon) {
      if (menu.classList.contains("active")) {
        icon.className = "fas fa-times";
      } else {
        icon.className = "fas fa-bars";
      }
    }
  }
}

// Hàm đóng menu khi click vào link bên trong (để không phải tắt tay)
// Hàm đóng menu thông minh (Tự động nhận diện mọi nút bấm bên trong)
document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("navMenu");
  const btnIcon = document.querySelector("#mobileMenuToggle i");

  if (menu) {
    // Bắt sự kiện click vào menu
    menu.addEventListener("click", (e) => {
      // 1. Nếu bấm vào chính cái vùng nền trống của menu thì KHÔNG đóng
      if (e.target === menu) return;

      // 2. Nếu bấm vào BẤT KỲ thành phần nào bên trong (Icon, Chữ, Nút Xem chung...)
      // -> Đóng menu ngay lập tức
      menu.classList.remove("active");

      // Đổi icon X trở lại thành 3 gạch
      if (btnIcon) {
        btnIcon.className = "fas fa-bars";
      }
    });
  }
});

// ============================================
// 6. COMMENT REACTIONS SYSTEM
// ============================================

const EMOJI_MAP = {
    'like': '👍',
    'heart': '❤️',
    'haha': '😂',
    'wow': '😮',
    'sad': '😢',
    'angry': '😡'
};

/**
 * Xử lý thả cảm xúc cho bình luận (Dùng chung cho Intro & Detail)
 */
async function toggleCommentReaction(commentId, type, movieId, containerId) {
    if (!currentUser) {
        showNotification("Vui lòng đăng nhập để thực hiện!", "warning");
        if (typeof openAuthModal === 'function') openAuthModal();
        return;
    }

    if (!db) return;

    try {
        const commentRef = db.collection("comments").doc(commentId);
        
        // Optimistic UI: Cập nhật giao diện ngay lập tức
        const doc = await commentRef.get();
        if (!doc.exists) return;

        const data = doc.data();
        const reactions = data.reactions || {};
        const summary = data.reactionSummary || {};
        const userId = currentUser.uid;

        const oldType = reactions[userId];
        
        if (oldType === type) {
            delete reactions[userId];
            summary[type] = Math.max(0, (summary[type] || 0) - 1);
        } else {
            if (oldType) {
                summary[oldType] = Math.max(0, (summary[oldType] || 0) - 1);
            }
            reactions[userId] = type;
            summary[type] = (summary[type] || 0) + 1;
        }

        // Cập nhật UI ngay lập tức mà không cần reload list
        updateReactionUILocally(commentId, reactions, summary);

        // Sau đó mới cập nhật Firestore
        await commentRef.update({
            reactions: reactions,
            reactionSummary: summary
        });

    } catch (error) {
        console.error("Lỗi toggle reaction:", error);
    }
}

/**
 * Cập nhật giao diện reaction cục bộ cho một bình luận cụ thể
 */
function updateReactionUILocally(commentId, reactions, summary) {
    // 1. Tìm comment item (hỗ trợ cả prefix của Intro và Detail)
    const commentItem = document.getElementById(`intro-comment-${commentId}`) || 
                        document.getElementById(`comment-${commentId}`);
    if (!commentItem) return;

    // 2. Cập nhật nút Thích (Trạng thái Active)
    const triggerBtn = commentItem.querySelector('.btn-reaction-trigger');
    if (triggerBtn) {
        const isActive = currentUser && reactions && reactions[currentUser.uid];
        if (isActive) {
            triggerBtn.classList.add('active');
        } else {
            triggerBtn.classList.remove('active');
        }
    }

    // 3. Cập nhật Summary (Tổng số lượng emoji)
    const summaryWrapper = document.getElementById(`reaction-summary-${commentId}`);
    if (summaryWrapper) {
        summaryWrapper.innerHTML = renderReactionSummaryContent(summary);
    }
    
    // Tắt picker
    const picker = document.getElementById(`picker-${commentId}`);
    if (picker) picker.classList.remove('show');
}

/**
 * Render chuỗi HTML cho phần tổng hợp reaction
 */
function renderReactionSummaryHtml(commentId, summary) {
    return `<div class="reaction-summary-wrapper" id="reaction-summary-${commentId}">
        ${renderReactionSummaryContent(summary)}
    </div>`;
}

/**
 * Render nội dung bên trong summary
 */
function renderReactionSummaryContent(summary) {
    if (!summary) return "";
    
    const types = Object.keys(summary).filter(t => summary[t] > 0);
    if (types.length === 0) return "";

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    const sortedTypes = types.sort((a, b) => summary[b] - summary[a]).slice(0, 3);
    const iconsHtml = sortedTypes.map(t => `<span title="${t}">${EMOJI_MAP[t]}</span>`).join("");

    return `
        <div class="reaction-summary">
            <div class="reaction-summary-icons">
                ${iconsHtml}
            </div>
            <span class="reaction-count">${total}</span>
        </div>
    `;
}

/**
 * Bật/Tắt picker cho Mobile
 */
function toggleReactionPicker(commentId) {
    const picker = document.getElementById(`picker-${commentId}`);
    if (picker) {
        document.querySelectorAll('.reaction-picker.show').forEach(p => {
            if (p !== picker) p.classList.remove('show');
        });
        picker.classList.toggle('show');
    }
}

/* ============================================
   7. HỆ THỐNG POPUP MODAL CHUYÊN NGHIỆP
   Thay thế confirm(), prompt(), alert() native
   ============================================ */

/**
 * Tạo popup container và inject vào DOM nếu chưa có
 */
function _getPopupContainer() {
    let container = document.getElementById("customPopupOverlay");
    if (!container) {
        container = document.createElement("div");
        container.id = "customPopupOverlay";
        container.className = "custom-popup-overlay";
        container.innerHTML = `
            <div class="custom-popup" id="customPopupBox">
                <div class="custom-popup-icon" id="customPopupIcon"></div>
                <h3 class="custom-popup-title" id="customPopupTitle"></h3>
                <p class="custom-popup-message" id="customPopupMessage"></p>
                <div class="custom-popup-input-wrap" id="customPopupInputWrap" style="display:none;">
                    <select class="custom-popup-input form-select" id="customPopupSelect" style="display:none; margin-bottom: 10px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; width: 100%; font-family: inherit;">
                        <!-- Options sẽ được gen bằng js -->
                    </select>
                    <input type="text" class="custom-popup-input" id="customPopupInput" />
                    <textarea class="custom-popup-input" id="customPopupTextarea" rows="4" style="display:none; resize: vertical; font-family: inherit; line-height: 1.5; padding-top: 10px;"></textarea>
                </div>
                <div class="custom-popup-actions" id="customPopupActions"></div>
            </div>
        `;
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Hiển thị popup nội bộ (dùng chung cho confirm, prompt, alert)
 */
function _showCustomPopup({ title, message, icon, iconColor, inputVisible, isTextarea, selectOptions, inputDefault, confirmText, cancelText, confirmClass, onConfirm, onCancel }) {
    const overlay = _getPopupContainer();
    const titleEl = document.getElementById("customPopupTitle");
    const messageEl = document.getElementById("customPopupMessage");
    const iconEl = document.getElementById("customPopupIcon");
    const inputWrap = document.getElementById("customPopupInputWrap");
    const selectEl = document.getElementById("customPopupSelect");
    const inputEl = document.getElementById("customPopupInput");
    const textareaEl = document.getElementById("customPopupTextarea");
    const actionsEl = document.getElementById("customPopupActions");

    // Set nội dung
    titleEl.textContent = title || "Thông báo";
    messageEl.textContent = message || "";
    iconEl.innerHTML = icon ? `<i class="${icon}" style="color: ${iconColor || '#4db8ff'};"></i>` : "";
    iconEl.style.display = icon ? "flex" : "none";

    // Input (cho prompt)
    if (inputVisible) {
        inputWrap.style.display = "block";
        
        // 1. Phục vụ thẻ Select nếu có mảng selectOptions
        if (selectOptions && Array.isArray(selectOptions) && selectOptions.length > 0) {
            if (selectEl) {
                selectEl.style.display = "block";
                selectEl.innerHTML = selectOptions.map(opt => `<option value="${opt.value}" style="background: #1a1f36; color: #fff;">${opt.label}</option>`).join("");
            }
        } else {
            if (selectEl) selectEl.style.display = "none";
        }

        // 2. Text/Textarea
        if (isTextarea && textareaEl) {
            inputEl.style.display = "none";
            textareaEl.style.display = "block";
            textareaEl.value = inputDefault || "";
            setTimeout(() => textareaEl.focus(), 300);
        } else {
            if (textareaEl) textareaEl.style.display = "none";
            inputEl.style.display = "block";
            inputEl.value = inputDefault || "";
            setTimeout(() => inputEl.focus(), 300);
        }
    } else {
        inputWrap.style.display = "none";
    }

    // Nút hành động
    let buttonsHtml = "";
    if (cancelText) {
        buttonsHtml += `<button class="custom-popup-btn custom-popup-btn-cancel" id="customPopupCancel">${cancelText}</button>`;
    }
    buttonsHtml += `<button class="custom-popup-btn ${confirmClass || 'custom-popup-btn-primary'}" id="customPopupConfirm">${confirmText || 'OK'}</button>`;
    actionsEl.innerHTML = buttonsHtml;

    // Hiện popup với animation
    overlay.classList.add("active");
    document.body.classList.add("modal-open");

    // Bind sự kiện
    const confirmBtn = document.getElementById("customPopupConfirm");
    const cancelBtn = document.getElementById("customPopupCancel");

    const closePopup = () => {
        overlay.classList.remove("active");
        // Kiểm tra xem còn modal nào khác đang mở không
        setTimeout(() => {
            const anyActiveModal = document.querySelector(".modal-overlay.active, .custom-popup-overlay.active");
            if (!anyActiveModal) {
                document.body.classList.remove("modal-open");
            }
        }, 100);
    };

    confirmBtn.onclick = () => {
        closePopup();
        if (onConfirm) {
            let val = true;
            if (inputVisible) {
                // Return object nếu có select
                const textVal = isTextarea ? textareaEl.value : inputEl.value;
                if (selectOptions && selectOptions.length > 0 && selectEl) {
                    val = {
                        selectValue: selectEl.value,
                        textValue: textVal
                    };
                } else {
                    val = textVal;
                }
            }
            onConfirm(val);
        }
    };

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            closePopup();
            if (onCancel) onCancel();
        };
    }

    // Enter để xác nhận, Escape để hủy
    const keyHandler = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            confirmBtn.click();
            document.removeEventListener("keydown", keyHandler);
        } else if (e.key === "Escape") {
            e.preventDefault();
            if (cancelBtn) cancelBtn.click();
            else confirmBtn.click();
            document.removeEventListener("keydown", keyHandler);
        }
    };
    document.addEventListener("keydown", keyHandler);

    // Click overlay đóng (coi như hủy)
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            closePopup();
            if (onCancel) onCancel();
            document.removeEventListener("keydown", keyHandler);
        }
    };
}

/**
 * Thay thế confirm() — trả về Promise<boolean>
 * @param {string} message - Nội dung xác nhận
 * @param {Object} options - { title, icon, confirmText, cancelText, type }
 * @returns {Promise<boolean>}
 */
function customConfirm(message, options = {}) {
    const type = options.type || "warning";
    const iconMap = {
        danger: { icon: "fas fa-exclamation-triangle", color: "#ff6b6b" },
        warning: { icon: "fas fa-exclamation-circle", color: "#ffc107" },
        info: { icon: "fas fa-info-circle", color: "#4db8ff" },
        success: { icon: "fas fa-check-circle", color: "#51cf66" }
    };
    const typeInfo = iconMap[type] || iconMap.warning;

    return new Promise((resolve) => {
        _showCustomPopup({
            title: options.title || "Xác nhận",
            message: message,
            icon: typeInfo.icon,
            iconColor: typeInfo.color,
            inputVisible: false,
            confirmText: options.confirmText || "Xác nhận",
            cancelText: options.cancelText || "Hủy",
            confirmClass: type === "danger" ? "custom-popup-btn-danger" : "custom-popup-btn-primary",
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
}

/**
 * Thay thế prompt() — trả về Promise<string|null>
 * @param {string} message - Nội dung hướng dẫn
 * @param {Object} options - { title, defaultValue, placeholder, confirmText, cancelText }
 * @returns {Promise<string|null>}
 */
function customPrompt(message, options = {}) {
    return new Promise((resolve) => {
        _showCustomPopup({
            title: options.title || "Nhập thông tin",
            message: message,
            icon: "fas fa-edit",
            iconColor: "#4db8ff",
            inputVisible: true,
            isTextarea: options.isTextarea || false,
            selectOptions: options.selectOptions || null,
            inputDefault: options.defaultValue || "",
            confirmText: options.confirmText || "Xác nhận",
            cancelText: options.cancelText || "Hủy",
            confirmClass: "custom-popup-btn-primary",
            onConfirm: (value) => resolve(value),
            onCancel: () => resolve(null)
        });

        // Set placeholder nếu có
        const inputEl = document.getElementById("customPopupInput");
        const textareaEl = document.getElementById("customPopupTextarea");
        if (options.placeholder) {
            if (inputEl) inputEl.placeholder = options.placeholder;
            if (textareaEl) textareaEl.placeholder = options.placeholder;
        }
    });
}

/**
 * Thay thế alert() — trả về Promise<void>
 * @param {string} message - Nội dung thông báo
 * @param {Object} options - { title, type }
 * @returns {Promise<void>}
 */
function customAlert(message, options = {}) {
    const type = options.type || "info";
    const iconMap = {
        danger: { icon: "fas fa-times-circle", color: "#ff6b6b" },
        warning: { icon: "fas fa-exclamation-triangle", color: "#ffc107" },
        info: { icon: "fas fa-info-circle", color: "#4db8ff" },
        success: { icon: "fas fa-check-circle", color: "#51cf66" }
    };
    const typeInfo = iconMap[type] || iconMap.info;

    return new Promise((resolve) => {
        _showCustomPopup({
            title: options.title || "Thông báo",
            message: message,
            icon: typeInfo.icon,
            iconColor: typeInfo.color,
            inputVisible: false,
            confirmText: "OK",
            cancelText: null,
            confirmClass: "custom-popup-btn-primary",
            onConfirm: () => resolve(),
            onCancel: () => resolve()
        });
    });
}
// ============================================
// 6. CẬP NHẬT METADATA SEO/CHIA SẺ (OG TAGS)
// ============================================

/**
 * [NEW] Hàm cập nhật thẻ meta động để hỗ trợ tính năng Chia sẻ link (Share Preview)
 * Khi rời khỏi trang chi tiết, có thể tuỳ chọn gắn về giá trị mặc định của app.
 */
function updatePageMetadata(title, description, imageUrl, url) {
  // Cập nhật Document Title
  if (title) document.title = title;

  // Cập nhật thẻ Open Graph
  const ogTitle = document.getElementById("ogTitle");
  if (ogTitle && title) ogTitle.setAttribute("content", title);

  const ogDesc = document.getElementById("ogDescription");
  if (ogDesc && description) ogDesc.setAttribute("content", description);

  const ogImage = document.getElementById("ogImage");
  if (ogImage && imageUrl) ogImage.setAttribute("content", imageUrl);

  const ogUrl = document.getElementById("ogUrl");
  // Thêm tự động hashtag nếu là url đang truy cập
  if (ogUrl) ogUrl.setAttribute("content", url || window.location.href);

  // Thẻ Twitter Card
  const twTitle = document.getElementById("twTitle");
  if (twTitle && title) twTitle.setAttribute("content", title);

  const twDesc = document.getElementById("twDescription");
  if (twDesc && description) twDesc.setAttribute("content", description);

  const twImage = document.getElementById("twImage");
  if (twImage && imageUrl) twImage.setAttribute("content", imageUrl);
  
  // Trình duyệt native (như Edge) đôi khi lưu Cache thẻ header,
  // nhưng khi tải qua JS SPA và user nhấn "Share", Chromium Mới nhất 
  // vẫn sẽ quét lại DOM hiện hành để tạo card Preview.
}

/* ============================================
   XỬ LÝ NÚT CUỘN LÊN ĐẦU TRANG (SCROLL TO TOP)
   ============================================ */
window.scrollToTop = function() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};

// Hiển thị nút khi cuộn xuống 300px
window.addEventListener('scroll', function() {
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('show');
    } else {
      scrollTopBtn.classList.remove('show');
    }
  }
});


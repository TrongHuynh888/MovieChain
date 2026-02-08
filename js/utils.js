/**
 * UTILS.JS - Các hàm tiện ích dùng chung
 * (Đã cập nhật: showPage và toggleSidebar)
 */

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
    if (overlay) overlay.classList.add("active");
  } else {
    if (overlay) overlay.classList.remove("active");
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
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function showPage(pageName) {
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

  // 4. Xử lý riêng cho trang Admin và Footer
  const footer = document.getElementById("footer");
  if (pageName === "admin") {
    if (footer) footer.style.display = "none";
    // Load data admin nếu cần
    if (typeof loadAdminData === "function") loadAdminData();
  } else {
    if (footer) footer.style.display = "block";
  }

  // 5. Nút sidebar (Ẩn/Hiện nút 3 gạch)
  const sidebarBtn = document.getElementById("sidebarToggleBtn");
  if (sidebarBtn) {
    sidebarBtn.style.display = pageName === "admin" ? "block" : "none";
  }

  // 👇 6. LOGIC MỚI: Nếu vào trang Thể loại thì vẽ danh sách ra
  if (pageName === "categories" && typeof renderCategoriesList === "function") {
    renderCategoriesList();
  }
  // 👉 THÊM ĐOẠN NÀY CHO QUỐC GIA:
  if (pageName === "countries" && typeof renderCountriesList === "function") {
    renderCountriesList();
  }
  // Cuộn lên đầu
  window.scrollTo(0, 0);
}
/** <-- THÊM DẤU GẠCH CHÉO VÀO ĐẦU
 * Mở Modal bất kỳ (Dùng cho cả Đăng nhập, Profile, Thông báo...)
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Tìm lớp phủ mờ (overlay) bao quanh nó
    const overlay = modal.closest(".modal-overlay");
    if (overlay) {
      overlay.classList.add("active"); // Hiện overlay
    } else {
      modal.classList.add("active"); // Fallback nếu không có overlay
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
function toggleSidebar() {
  const sidebar = document.querySelector(".admin-sidebar");
  const content = document.querySelector(".admin-content");
  const overlayId = "adminSidebarOverlay";

  // Nếu không tìm thấy sidebar thì dừng ngay để tránh lỗi null
  if (!sidebar) return;

  // 1. XỬ LÝ CHO MOBILE (Màn hình <= 768px)
  if (window.innerWidth <= 768) {
    // Toggle class 'active' (Mở/Đóng)
    sidebar.classList.toggle("active");

    // Kiểm tra xem sau khi toggle thì menu đang MỞ hay ĐÓNG?
    const isOpen = sidebar.classList.contains("active");

    // Tìm hoặc tạo Overlay
    let overlay = document.getElementById(overlayId);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = overlayId;
      // Z-index 2999 để nằm dưới Sidebar (thường Sidebar là 3000+)
      overlay.style.cssText =
        "position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:2999; display:none; cursor:pointer;";

      // QUAN TRỌNG: Sự kiện click vào vùng đen -> BẮT BUỘC ĐÓNG
      overlay.onclick = function () {
        sidebar.classList.remove("active");
        overlay.style.display = "none";
      };

      document.body.appendChild(overlay);
    }

    // Đồng bộ hiển thị Overlay với trạng thái Menu
    // Nếu Menu mở -> Hiện Overlay. Nếu Menu đóng -> Ẩn Overlay.
    overlay.style.display = isOpen ? "block" : "none";
  } else {
    // 2. XỬ LÝ CHO DESKTOP (> 768px)
    // Thu nhỏ / Phóng to menu
    sidebar.classList.toggle("collapsed");

    // Đẩy nội dung chính sang phải/trái tương ứng
    if (content) {
      content.classList.toggle("expanded");
    }
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
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar?.classList.add("scrolled");
    } else {
      navbar?.classList.remove("scrolled");
    }
  });
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
document.addEventListener("DOMContentLoaded", () => {
  const menuLinks = document.querySelectorAll(".nav-link");
  const menu = document.getElementById("navMenu");
  const btnIcon = document.querySelector("#mobileMenuToggle i");

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (menu && menu.classList.contains("active")) {
        menu.classList.remove("active");
        if (btnIcon) btnIcon.className = "fas fa-bars";
      }
    });
  });
});

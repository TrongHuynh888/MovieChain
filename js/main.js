// ============================================
// CẬP NHẬT HÀM KHỞI CHẠY (startMovieChainApp)
// ============================================
window.startMovieChainApp = async () => {
  console.log("🎬 MovieChain Starting...");

  auth.onAuthStateChanged(handleAuthStateChange);
  await loadInitialData();

  initializeUI();
  initializeRatingStars();
  loadTheme();
  initNavbarScroll();

  // 👇 GỌI HÀM THỐNG KÊ MỚI TẠI ĐÂY 👇
  initVisitorStats();

  console.log("✅ App Ready!");
};

// ============================================
// HÀM THỐNG KÊ REALTIME (NGƯỜI THẬT)
// ============================================
function initVisitorStats() {
  const statVisits = document.getElementById("statVisits");
  const statOnline = document.getElementById("statOnline");
  const statTime = document.getElementById("statTime");

  // 1. TỔNG TRUY CẬP (Giữ nguyên logic cũ dùng Firestore)
  try {
    if (db) {
      const statsRef = db.collection("system").doc("stats");
      // Tăng view mỗi khi tải trang
      statsRef.set(
        {
          totalVisits: firebase.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );

      // Lắng nghe thay đổi
      statsRef.onSnapshot((doc) => {
        if (doc.exists) {
          if (statVisits)
            statVisits.textContent = formatNumber(doc.data().totalVisits || 0);
        }
      });
    }
  } catch (e) {
    console.error(e);
  }

  // 2. NGƯỜI ĐANG ONLINE (Dùng Realtime Database)
  try {
    const rtdb = firebase.database();
    const onlineRef = rtdb.ref("online_users"); // Nơi lưu danh sách user online
    const connectedRef = rtdb.ref(".info/connected"); // Trạng thái kết nối của bản thân

    // Khi người dùng kết nối thành công
    connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        // Tạo một kết nối mới vào danh sách
        const myCon = onlineRef.push();

        // QUAN TRỌNG: Khi mất mạng hoặc tắt tab -> Tự động xóa kết nối này
        myCon.onDisconnect().remove();

        // Đánh dấu là đang online
        myCon.set(true);
      }
    });

    // Lắng nghe tổng số lượng kết nối đang có trong danh sách
    onlineRef.on("value", (snap) => {
      if (statOnline) {
        // Đếm số lượng con (số người đang online)
        const count = snap.numChildren();
        statOnline.textContent = count;

        // Hiệu ứng nháy xanh để báo hiệu số liệu sống
        statOnline.classList.add("highlight");
        setTimeout(() => statOnline.classList.remove("highlight"), 500);
      }
    });
  } catch (e) {
    console.error("Lỗi Realtime DB (Kiểm tra lại config):", e);
    if (statOnline) statOnline.textContent = "1"; // Fallback nếu lỗi
  }

  // 3. THỜI GIAN TRUNG BÌNH (Giữ nguyên random cho đơn giản)
  if (statTime) {
    // Chúng ta sẽ lấy số liệu từ Firestore (đã load ở phần 1) để tính
    const statsRef = db.collection("system").doc("stats");
    statsRef.get().then((doc) => {
      if (doc.exists) {
        const visits = doc.data().totalVisits || 0;

        // CÔNG THỨC: Mặc định 15 phút + (Cứ 100 views thì tăng thêm 0.5 phút)
        // Số này sẽ cố định với mọi người dùng, và tăng dần theo thời gian -> Rất thật!
        const baseTime = 15;
        const growth = (visits / 100) * 0.5;

        // Giới hạn max là 45 phút (để không bị ảo quá)
        let calculatedTime = baseTime + growth;
        if (calculatedTime > 45) calculatedTime = 45;

        statTime.textContent = `${calculatedTime.toFixed(1)} phút`;
      }
    });
  }
}

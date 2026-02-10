// Thêm CSS cho phần trả lời bình luận
const replyStyles = document.createElement("style");
replyStyles.innerHTML = `
    /* --- CẤP 1: Thụt lề bình thường --- */
    .replies-list { margin-top: 10px; border-left: 2px solid rgba(255,255,255,0.1); padding-left: 12px; margin-left: 0; }
    .replies-controls { margin-top: 5px; margin-left: 0; display: flex; align-items: center; gap: 10px; }

    /* --- CẤP 2 TRỞ ĐI: Kéo ngược sang trái để thẳng hàng với Cấp 1 (Flat Thread) --- */
    .replies-list .replies-list { margin-left: -45px !important; border-left: 2px solid rgba(255,255,255,0.15); }
    .replies-list .replies-controls { margin-left: -45px !important; }

    /* --- MOBILE --- */
    @media (max-width: 768px) {
        .replies-list .replies-list { margin-left: -38px !important; }
        .replies-list .replies-controls { margin-left: -38px !important; }
    }

    .reply-node.hidden-reply { display: none; }
    .btn-show-replies { background: transparent; border: none; color: #aaa; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 0; }
    .btn-show-replies:hover { color: var(--accent-primary); text-decoration: underline; }
    
    .btn-hide-replies { background: transparent; border: none; color: #aaa; font-size: 12px; font-weight: bold; cursor: pointer; display: none; align-items: center; gap: 5px; padding: 0; }
    .btn-hide-replies:hover { color: #ff4444; text-decoration: underline; }

    .reply-form-container { margin-top: 10px; display: none; }
    .reply-form-container.active { display: block; animation: fadeIn 0.3s ease; }
    .btn-reply { background: transparent; border: none; color: #aaa; font-size: 12px; cursor: pointer; margin-left: 10px; }
    .btn-reply:hover { color: var(--accent-primary); text-decoration: underline; }
    .reply-input-group { display: flex; gap: 10px; margin-top: 5px; }
    .reply-input-group input { flex: 1; background: #333; border: 1px solid #555; color: #fff; padding: 5px 10px; border-radius: 4px; font-size: 13px; }
    .reply-input-group button { padding: 5px 15px; font-size: 12px; }
    .comment-content { word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%; }
`;
document.head.appendChild(replyStyles);

/**
 * Xem chi tiết phim (Đã nâng cấp: Tự động nhớ tập đang xem dở)
 */
async function viewMovieDetail(movieId) {
  currentMovieId = movieId;
  // Mặc định là tập đầu tiên (0)
  currentEpisode = 0;

  // 1. Tìm thông tin phim
  let movie = allMovies.find((m) => m.id === movieId);

  // Nếu không có trong cache thì tìm trong Firestore
  if (!movie && db) {
    try {
      const doc = await db.collection("movies").doc(movieId).get();
      if (doc.exists) {
        movie = { id: doc.id, ...doc.data() };
      }
    } catch (error) {
      console.error("Lỗi load movie detail:", error);
    }
  }

  if (!movie) {
    showNotification("Không tìm thấy phim!", "error");
    return;
  }

  // 👇 2. LOGIC MỚI: KHÔI PHỤC LỊCH SỬ XEM (QUAN TRỌNG) 👇
  if (currentUser && db) {
    try {
      const historyDoc = await db
        .collection("users")
        .doc(currentUser.uid)
        .collection("history")
        .doc(movieId)
        .get();

      if (historyDoc.exists) {
        const data = historyDoc.data();
        // Nếu có dữ liệu tập cũ -> Gán lại cho currentEpisode
        if (data.lastEpisode !== undefined) {
          currentEpisode = data.lastEpisode;
          console.log(
            `🔄 Đã khôi phục: Bạn đang xem tập ${currentEpisode + 1}`,
          );
        }
      }

      // Cập nhật lại thời gian "Vừa mới xem" lên đầu danh sách
      saveWatchHistory(movieId, currentEpisode);
    } catch (error) {
      console.error("Lỗi khôi phục lịch sử:", error);
    }
  }
  // 👆 HẾT PHẦN SỬA 👆

  // 3. Cập nhật lượt xem
  updateMovieViews(movieId);

  // 4. Điền thông tin vào giao diện (Giữ nguyên code cũ)
  document.getElementById("detailPoster").src = movie.posterUrl;
  document.getElementById("detailTitle").textContent = movie.title;
  document.getElementById("detailYear").textContent = movie.year || "N/A";
  document.getElementById("detailCountry").textContent = movie.country || "N/A";
  document.getElementById("detailCategory").textContent =
    movie.category || "N/A";
  document.getElementById("detailViews").textContent = formatNumber(
    movie.views || 0,
  );
  document.getElementById("detailRating").textContent = movie.rating || 0;
  document.getElementById("detailDescription").textContent =
    movie.description || "Chưa có mô tả";
  document.getElementById("detailPrice").textContent = movie.price || 0;

  // Render tags
  const tagsContainer = document.getElementById("detailTags");
  tagsContainer.innerHTML = (movie.tags || [])
    .map((tag) => {
      let tagClass = "";
      if (tag === "hot") tagClass = "hot";
      else if (tag === "mới") tagClass = "new";
      return `<span class="tag ${tagClass}">${tag}</span>`;
    })
    .join("");

  // 5. Render danh sách tập (Quan trọng: Nó sẽ dùng currentEpisode để highlight tập đang xem)
  renderEpisodes(movie.episodes || []);

  // 6. Kiểm tra quyền xem và tải Video
  await checkAndUpdateVideoAccess();

  // 7. Tải bình luận
  loadComments(movieId);

  // 8. Chuyển trang
  showPage("movieDetail");
}
/**
 * Render danh sách tập phim
 */
function renderEpisodes(episodes) {
  const container = document.getElementById("episodesList");
  const section = document.getElementById("episodesSection");

  if (!episodes || episodes.length <= 1) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  container.innerHTML = episodes
    .map(
      (ep, index) => `
        <div class="episode-item ${index === currentEpisode ? "active" : ""}" 
             onclick="selectEpisode(${index})">
            <div class="episode-number">Tập ${ep.episodeNumber}</div>
            <div class="episode-title">${ep.title || ""}</div>
            <small class="text-muted">${ep.duration || ""} • ${ep.quality || "HD"}</small>
        </div>
    `,
    )
    .join("");
}

/**
 * Chọn tập phim
 */
function selectEpisode(index) {
  currentEpisode = index;

  // Update active state
  document.querySelectorAll(".episode-item").forEach((el, i) => {
    el.classList.toggle("active", i === index);
  });
  // 👇 THÊM DÒNG NÀY: Lưu lịch sử xem ngay khi chọn tập 👇
  if (currentMovieId) {
    saveWatchHistory(currentMovieId, index);
  }
  // Update video if unlocked
  checkAndUpdateVideoAccess();
}

/**
 * Kiểm tra và cập nhật quyền xem video
 */
async function checkAndUpdateVideoAccess() {
  const videoLocked = document.getElementById("videoLocked");
  const videoPlayer = document.getElementById("videoPlayer");
  const buyTicketBtn = document.getElementById("buyTicketBtn");

  let hasAccess = false;

  // Admin luôn có quyền xem
  if (isAdmin) {
    hasAccess = true;
  }
  // 👇 2. THÊM ĐOẠN NÀY: VIP luôn được xem 👇
  else if (currentUser && currentUser.isVip === true) {
    hasAccess = true;

    // Đổi nút mua vé thành nút thông báo VIP
    if (buyTicketBtn) {
      buyTicketBtn.innerHTML = '<i class="fas fa-crown"></i> Đặc quyền VIP';
      buyTicketBtn.classList.add("btn-vip-action"); // Thêm class màu vàng
      buyTicketBtn.style.background =
        "linear-gradient(45deg, #fcd535, #ff9900)";
      buyTicketBtn.style.color = "#000";
      buyTicketBtn.style.border = "none";
      buyTicketBtn.disabled = true; // Không cho bấm mua nữa
    }
  } else if (currentUser && currentMovieId) {
    // Kiểm tra đã mua chưa
    hasAccess = await checkMoviePurchased(currentMovieId);
  }

  if (hasAccess) {
    // Mở khóa giao diện (Code cũ)
    videoLocked.classList.add("hidden");
    videoPlayer.classList.remove("hidden");
    buyTicketBtn.innerHTML = '<i class="fas fa-check"></i> Đã mua vé';
    buyTicketBtn.disabled = true;
    buyTicketBtn.classList.remove("btn-primary");
    buyTicketBtn.classList.add("btn-success");

    // 👇 ĐOẠN CODE XỬ LÝ LINK THÔNG MINH (SỬA Ở ĐÂY) 👇
    const movie = allMovies.find((m) => m.id === currentMovieId);
    if (movie && movie.episodes && movie.episodes[currentEpisode]) {
      let videoId = movie.episodes[currentEpisode].youtubeId; // Lấy cái chuỗi bạn nhập vào
      let embedUrl = "";

      // 1. Kiểm tra nếu là OK.RU (Ví dụ nhập: 123456789 hoặc link ok.ru/video/123...)
      if (videoId.includes("ok.ru")) {
        // Tự động chuyển link thường thành link Embed
        // Ví dụ: https://ok.ru/video/12345 -> https://ok.ru/videoembed/12345
        const id = videoId.split("/").pop(); // Lấy số cuối cùng
        embedUrl = `https://ok.ru/videoembed/${id}`;
      }
      // 2. Kiểm tra nếu là Google Drive (ID dài > 25 ký tự)
      else if (videoId.length > 25) {
        embedUrl = `https://drive.google.com/file/d/${videoId}/preview`;
      }
      // 3. Mặc định coi như là YouTube (ID ngắn 11 ký tự)
      else {
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
      }

      // Gán link đã xử lý vào Player
      videoPlayer.src = embedUrl;
    }
  } else {
    // Khóa video
    videoLocked.classList.remove("hidden");
    videoPlayer.classList.add("hidden");
    videoPlayer.src = "";
    buyTicketBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Mua Vé Ngay';
    buyTicketBtn.disabled = false;
    buyTicketBtn.classList.add("btn-primary");
    buyTicketBtn.classList.remove("btn-success");
  }
}

/**
 * Cập nhật lượt xem
 */
async function updateMovieViews(movieId) {
  if (!db) return;

  try {
    await db
      .collection("movies")
      .doc(movieId)
      .update({
        views: firebase.firestore.FieldValue.increment(1),
      });
  } catch (error) {
    console.error("Lỗi cập nhật views:", error);
  }
}

// ============================================
// PAYMENT / BUY TICKET
// ============================================

/**
 * Mua vé xem phim
 */
async function buyTicket() {
  if (!currentUser) {
    showNotification("Vui lòng đăng nhập để mua vé!", "warning");
    openAuthModal();
    return;
  }

  const movie = allMovies.find((m) => m.id === currentMovieId);
  if (!movie) {
    showNotification("Không tìm thấy thông tin phim!", "error");
    return;
  }

  // Kiểm tra đã mua chưa
  const alreadyPurchased = await checkMoviePurchased(currentMovieId);
  if (alreadyPurchased) {
    showNotification("Bạn đã mua vé phim này rồi!", "info");
    checkAndUpdateVideoAccess();
    return;
  }

  // Thực hiện thanh toán
  const txHash = await payWithCRO(movie.price, currentMovieId, movie.title);

  if (txHash) {
    // Thanh toán thành công - mở khóa video
    await checkAndUpdateVideoAccess();
  }
}
/**
 * Load bình luận
 */
async function loadComments(movieId) {
  const container = document.getElementById("commentsList");

  try {
    let comments = [];

    if (db) {
      const snapshot = await db
        .collection("comments")
        .where("movieId", "==", movieId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      comments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // --- LOGIC MỚI: SẮP XẾP BÌNH LUẬN THEO CẤP CHA - CON ---
    if (comments.length === 0) {
      container.innerHTML =
        '<p class="text-center text-muted">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
      return;
    }

    // 1. Tạo Map để tìm nhanh
    const commentMap = {};
    comments.forEach((c) => {
      c.children = []; // Tạo mảng chứa con
      commentMap[c.id] = c;
    });

    // 2. Phân loại Cha và Con
    const rootComments = [];
    comments.forEach((c) => {
      if (c.parentId && commentMap[c.parentId]) {
        // Nếu có cha -> Đẩy vào mảng children của cha
        commentMap[c.parentId].children.push(c);
        // Sắp xếp con theo thời gian tăng dần (cũ nhất ở trên)
        commentMap[c.parentId].children.sort(
          (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
        );
      } else {
        // Nếu không có cha -> Là gốc
        rootComments.push(c);
      }
    });

    // 3. Render
    container.innerHTML = rootComments
      .map((comment) => createCommentHtml(comment))
      .join("");
  } catch (error) {
    console.error("Lỗi load comments:", error);
    container.innerHTML =
      '<p class="text-center text-muted">Không thể tải bình luận</p>';
  }
}

/**
 * Tạo HTML cho comment
 */
function createCommentHtml(comment) {
  const initial = (comment.userName || "U")[0].toUpperCase();

  // Xử lý thời gian: Hiển thị cả tương đối và chi tiết
  let timeDisplay = "Vừa xong";
  if (comment.createdAt?.toDate) {
    const dateObj = comment.createdAt.toDate();
    timeDisplay = `${formatTimeAgo(dateObj)} <span style="opacity: 0.6; font-size: 10px; margin-left: 5px;">• ${formatDateTime(dateObj)}</span>`;
  }

  const deleteBtn =
    isAdmin || (currentUser && currentUser.uid === comment.userId)
      ? `<button class="btn btn-sm btn-danger" onclick="deleteComment('${comment.id}')">
               <i class="fas fa-trash"></i>
           </button>`
      : "";

  // Hiển thị Avatar nếu có, ngược lại hiển thị chữ cái đầu
  const avatarHtml =
    comment.userAvatar && comment.userAvatar.startsWith("http")
      ? `<img src="${comment.userAvatar}" class="comment-avatar" style="object-fit: cover;" alt="${initial}" onerror="this.src='https://ui-avatars.com/api/?name=${initial}&background=random'">`
      : `<div class="comment-avatar">${initial}</div>`;

  // Xử lý hiển thị các bình luận con (Đệ quy + Ẩn bớt)
  let childrenHtml = "";
  let showRepliesBtn = "";

  if (comment.children && comment.children.length > 0) {
    // Wrap mỗi child trong div ẩn (class hidden-reply)
    const renderedChildren = comment.children
      .map(
        (child) =>
          `<div class="reply-node hidden-reply">${createCommentHtml(child)}</div>`,
      )
      .join("");

    childrenHtml = `<div class="replies-list" id="replies-list-${comment.id}">
            ${renderedChildren}
         </div>`;

    // Nút xem thêm (Show more)
    showRepliesBtn = `
        <div class="replies-controls">
            <button class="btn-show-replies" id="btn-show-${comment.id}" onclick="loadMoreReplies('${comment.id}')">
                <i class="fas fa-caret-down"></i> <span>Xem ${comment.children.length} câu trả lời</span>
            </button>
            <button class="btn-hide-replies" id="btn-hide-${comment.id}" onclick="hideAllReplies('${comment.id}')">
                <i class="fas fa-eye-slash"></i> Ẩn tất cả
            </button>
        </div>
      `;
  }

  return `
        <div class="comment-item" id="comment-${comment.id}">
            ${avatarHtml}
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.userName || "Ẩn danh"}</span>
                    <span class="comment-rating">
                        ${comment.rating ? `<i class="fas fa-star"></i> ${comment.rating}/10` : ""}
                    </span>
                </div>
                <p class="comment-text">${escapeHtml(comment.content)}</p>
                <div class="comment-actions" style="display:flex; align-items:center;">
                    <div class="comment-time">${timeDisplay}</div>
                    <button class="btn-reply" onclick="toggleReplyForm('${comment.id}')">Trả lời</button>
                    <div style="margin-left:auto;">${deleteBtn}</div>
                </div>
                
                <!-- Form trả lời ẩn -->
                <div id="reply-form-${comment.id}" class="reply-form-container">
                    <div class="reply-input-group">
                        <input type="text" id="reply-input-${comment.id}" placeholder="Viết câu trả lời...">
                        <button class="btn btn-sm btn-primary" onclick="submitReply('${comment.id}')"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>

                <!-- Nút xem trả lời -->
                ${showRepliesBtn}

                <!-- Danh sách trả lời -->
                ${childrenHtml}
            </div>
        </div>
    `;
}

/**
 * Hàm hiển thị thêm 5 bình luận con (Load More)
 */
function loadMoreReplies(parentId) {
  const container = document.getElementById(`replies-list-${parentId}`);
  const btn = document.getElementById(`btn-show-${parentId}`);
  if (!container || !btn) return;

  // FIX: Thay querySelectorAll bằng children để chỉ lấy cấp con TRỰC TIẾP
  // Tránh trường hợp đếm nhầm các bình luận cấp cháu/chắt bên trong
  const hiddenItems = Array.from(container.children).filter(
    (node) =>
      node.classList.contains("reply-node") &&
      node.classList.contains("hidden-reply"),
  );

  if (hiddenItems.length === 0) {
    btn.style.display = "none";
    // Nếu không còn gì để hiện thì hiện nút ẩn (phòng hờ)
    const hideBtn = document.getElementById(`btn-hide-${parentId}`);
    if (hideBtn) hideBtn.style.display = "flex";
    return;
  }

  // Show 5 item tiếp theo
  let count = 0;
  hiddenItems.forEach((item, index) => {
    if (index < 5) {
      item.classList.remove("hidden-reply");
      item.style.animation = "fadeIn 0.5s ease";
      count++;
    }
  });

  // Update nút (Nếu còn ẩn thì hiện số lượng còn lại, hết thì ẩn nút)
  const remaining = hiddenItems.length - count;
  if (remaining > 0) {
    btn.querySelector("span").textContent = `Xem thêm ${remaining} câu trả lời`;
    btn.style.display = "flex"; // Đảm bảo nút hiện nếu còn
  } else {
    // Đã hiện hết -> Ẩn nút Show đi (vì đã có nút Hide All bên cạnh)
    btn.style.display = "none";
  }

  // Luôn hiện nút Hide All khi đã mở ra
  const hideBtn = document.getElementById(`btn-hide-${parentId}`);
  if (hideBtn) hideBtn.style.display = "flex";
}

/**
 * Hàm ẩn tất cả bình luận con
 */
function hideAllReplies(parentId) {
  const container = document.getElementById(`replies-list-${parentId}`);
  const showBtn = document.getElementById(`btn-show-${parentId}`);
  const hideBtn = document.getElementById(`btn-hide-${parentId}`);

  if (!container) return;

  // Ẩn tất cả item
  const allItems = container.querySelectorAll(".reply-node");
  allItems.forEach((item) => item.classList.add("hidden-reply"));

  // Reset nút Show về trạng thái ban đầu
  if (showBtn) {
    showBtn.style.display = "flex"; // Đảm bảo hiện lại nút Show

    // FIX: Chỉ đếm số lượng con trực tiếp để hiển thị đúng số lượng trên nút
    const directCount = Array.from(container.children).filter((node) =>
      node.classList.contains("reply-node"),
    ).length;

    showBtn.innerHTML = `<i class="fas fa-caret-down"></i> <span>Xem ${directCount} câu trả lời</span>`;
  }

  // Ẩn nút Hide
  if (hideBtn) hideBtn.style.display = "none";

  // Cuộn nhẹ về bình luận cha để người dùng không bị lạc
  const parentComment = document.getElementById(`comment-${parentId}`);
  if (parentComment)
    parentComment.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Bật/Tắt form trả lời
 */
function toggleReplyForm(commentId) {
  if (!currentUser) {
    showNotification("Vui lòng đăng nhập để trả lời!", "warning");
    openAuthModal();
    return;
  }

  // Đóng tất cả các form khác đang mở (nếu muốn)
  document
    .querySelectorAll(".reply-form-container")
    .forEach((el) => el.classList.remove("active"));

  const form = document.getElementById(`reply-form-${commentId}`);
  if (form) {
    form.classList.toggle("active");
    // Focus vào ô input
    if (form.classList.contains("active")) {
      setTimeout(
        () => document.getElementById(`reply-input-${commentId}`).focus(),
        100,
      );
    }
  }
}

/**
 * Gửi câu trả lời (Reply)
 */
async function submitReply(parentId) {
  if (!currentUser) return;

  const input = document.getElementById(`reply-input-${parentId}`);
  const content = input.value.trim();

  if (!content) {
    showNotification("Vui lòng nhập nội dung!", "warning");
    return;
  }

  try {
    showLoading(true, "Đang gửi...");

    // 1. Lưu vào Firestore
    const docRef = await db.collection("comments").add({
      movieId: currentMovieId,
      parentId: parentId,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email.split("@")[0],
      userAvatar: currentUser.photoURL || "",
      content: content,
      rating: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showNotification("Đã trả lời!", "success");
    input.value = "";
    toggleReplyForm(parentId);

    // 2. Cập nhật giao diện Realtime (Không reload trang)
    const newComment = {
      id: docRef.id,
      movieId: currentMovieId,
      parentId: parentId,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email.split("@")[0],
      userAvatar: currentUser.photoURL || "",
      content: content,
      rating: 0,
      createdAt: { toDate: () => new Date() }, // Fake thời gian hiện tại
      children: [],
    };

    // Tạo HTML cho comment mới
    const replyHtml = `<div class="reply-node" style="animation: fadeIn 0.5s ease;">${createCommentHtml(newComment)}</div>`;

    const repliesListId = `replies-list-${parentId}`;
    let repliesList = document.getElementById(repliesListId);
    const parentCommentItem = document.getElementById(`comment-${parentId}`);

    if (repliesList) {
      // TRƯỜNG HỢP A: Đã có danh sách trả lời -> Append vào cuối
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = replyHtml;
      repliesList.appendChild(tempDiv.firstElementChild);

      // Cập nhật nút "Ẩn tất cả" (Hiện nó lên nếu đang ẩn)
      const hideBtn = document.getElementById(`btn-hide-${parentId}`);
      if (hideBtn) hideBtn.style.display = "flex";

      // Cập nhật số lượng trong nút "Xem thêm" (nếu nó đang hiện)
      const showBtn = document.getElementById(`btn-show-${parentId}`);
      if (showBtn) {
        const total = repliesList.querySelectorAll(".reply-node").length;
        const span = showBtn.querySelector("span");
        if (span) span.textContent = `Xem ${total} câu trả lời`;
      }
    } else {
      // TRƯỜNG HỢP B: Đây là câu trả lời đầu tiên -> Tạo khung
      if (parentCommentItem) {
        const contentDiv = parentCommentItem.querySelector(".comment-content");

        const controlsHtml = `
                <div class="replies-controls">
                    <button class="btn-show-replies" id="btn-show-${parentId}" onclick="loadMoreReplies('${parentId}')" style="display:none;">
                        <i class="fas fa-caret-down"></i> <span>Xem 1 câu trả lời</span>
                    </button>
                    <button class="btn-hide-replies" id="btn-hide-${parentId}" onclick="hideAllReplies('${parentId}')" style="display:flex;">
                        <i class="fas fa-eye-slash"></i> Ẩn tất cả
                    </button>
                </div>
            `;
        const listHtml = `<div class="replies-list" id="replies-list-${parentId}">${replyHtml}</div>`;
        contentDiv.insertAdjacentHTML("beforeend", controlsHtml + listHtml);
      }
    }
  } catch (error) {
    console.error("Lỗi gửi reply:", error);
    showNotification("Lỗi gửi trả lời!", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Gửi bình luận
 */
async function submitComment() {
  if (!currentUser) {
    showNotification("Vui lòng đăng nhập để bình luận!", "warning");
    openAuthModal();
    return;
  }

  const content = document.getElementById("commentContent").value.trim();

  if (!content) {
    showNotification("Vui lòng nhập nội dung bình luận!", "warning");
    return;
  }

  if (selectedRating === 0) {
    showNotification("Vui lòng chọn đánh giá!", "warning");
    return;
  }

  if (!db) {
    showNotification("Firebase chưa được cấu hình!", "error");
    return;
  }

  try {
    showLoading(true, "Đang gửi bình luận...");

    await db.collection("comments").add({
      movieId: currentMovieId,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email.split("@")[0],
      userAvatar: currentUser.photoURL || "",
      content: content,
      rating: selectedRating,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Reset form
    document.getElementById("commentContent").value = "";
    selectedRating = 0;
    updateRatingStars(0);
    document.getElementById("ratingValue").textContent = "0/10";

    // Reload comments
    await loadComments(currentMovieId);

    // Cập nhật rating trung bình của phim
    await updateMovieRating(currentMovieId);

    showNotification("Đã gửi bình luận!", "success");
  } catch (error) {
    console.error("Lỗi gửi comment:", error);
    showNotification("Không thể gửi bình luận!", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Xóa bình luận
 */
async function deleteComment(commentId) {
  if (!confirm("Bạn có chắc muốn xóa bình luận này?")) return;

  if (!db) return;

  try {
    await db.collection("comments").doc(commentId).delete();

    // Remove from DOM
    const commentEl = document.getElementById(`comment-${commentId}`);
    if (commentEl) {
      commentEl.remove();
    }

    showNotification("Đã xóa bình luận!", "success");
  } catch (error) {
    console.error("Lỗi xóa comment:", error);
    showNotification("Không thể xóa bình luận!", "error");
  }
}

/**
 * Cập nhật rating trung bình của phim
 */
async function updateMovieRating(movieId) {
  if (!db) return;

  try {
    const snapshot = await db
      .collection("comments")
      .where("movieId", "==", movieId)
      .get();

    if (snapshot.empty) return;

    const ratings = snapshot.docs.map((doc) => doc.data().rating || 0);
    const avgRating = (
      ratings.reduce((a, b) => a + b, 0) / ratings.length
    ).toFixed(1);

    await db
      .collection("movies")
      .doc(movieId)
      .update({
        rating: parseFloat(avgRating),
      });
  } catch (error) {
    console.error("Lỗi cập nhật rating:", error);
  }
}

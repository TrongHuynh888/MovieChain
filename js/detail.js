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

    if (comments.length === 0) {
      container.innerHTML =
        '<p class="text-center text-muted">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
      return;
    }

    container.innerHTML = comments
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
  const time = comment.createdAt?.toDate
    ? formatTimeAgo(comment.createdAt.toDate())
    : "Vừa xong";

  const deleteBtn =
    isAdmin || (currentUser && currentUser.uid === comment.userId)
      ? `<button class="btn btn-sm btn-danger" onclick="deleteComment('${comment.id}')">
               <i class="fas fa-trash"></i>
           </button>`
      : "";

  return `
        <div class="comment-item" id="comment-${comment.id}">
            <div class="comment-avatar">${initial}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.userName || "Ẩn danh"}</span>
                    <span class="comment-rating">
                        <i class="fas fa-star"></i> ${comment.rating || 0}/10
                    </span>
                </div>
                <p class="comment-text">${escapeHtml(comment.content)}</p>
                <div class="comment-time">${time}</div>
                <div class="comment-actions">${deleteBtn}</div>
            </div>
        </div>
    `;
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

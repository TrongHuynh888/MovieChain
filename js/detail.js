// --- CONFIG ---
const EPISODES_PER_PAGE = 10;
let currentEpisodePage = 0;

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
    
    /* --- WATCH PROGRESS BAR (Dưới poster) --- */
    .watch-progress-container {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(255,255,255,0.2);
        border-radius: 0 0 8px 8px;
        overflow: hidden;
        z-index: 5;
    }
    .watch-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #E50914, #ff6b6b);
        transition: width 0.3s ease;
        border-radius: 0 0 0 8px;
    }
    .movie-card { position: relative; overflow: hidden; }
    .movie-card .watch-progress-container { display: none; }
    .movie-card.has-watched .watch-progress-container { display: block; }
    .movie-card:hover .watch-progress-container { display: block; }
    
    /* --- RESUME WATCH MODAL --- */
    .resume-watch-modal {
        max-width: 400px;
        border-radius: 16px;
        background: linear-gradient(145deg, #1a1a2e, #16213e);
        border: 1px solid rgba(229, 9, 20, 0.3);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .resume-watch-modal .modal-header {
        background: linear-gradient(135deg, #E50914, #b2070f);
        padding: 20px 24px;
        border-radius: 16px 16px 0 0;
        text-align: center;
    }
    .resume-watch-modal .modal-header h3 {
        margin: 0;
        color: #fff;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }
    .resume-watch-modal .modal-body {
        padding: 24px;
        text-align: center;
    }
    .resume-watch-modal .modal-body p {
        color: #ccc;
        font-size: 15px;
        margin-bottom: 20px;
        line-height: 1.5;
    }
    .resume-watch-modal .resume-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255,255,255,0.05);
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 10px;
    }
    .resume-watch-modal .resume-time-label,
    .resume-watch-modal .resume-progress-label {
        color: #888;
        font-size: 13px;
    }
    .resume-watch-modal .resume-time-value {
        color: #E50914;
        font-weight: bold;
        font-size: 16px;
    }
    .resume-watch-modal .resume-progress-value {
        color: #4ade80;
        font-weight: bold;
        font-size: 16px;
    }
    .resume-watch-modal .modal-footer {
        padding: 16px 24px 24px;
        display: flex;
        gap: 12px;
        justify-content: center;
    }
    .resume-watch-modal .btn {
        flex: 1;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        border: none;
        font-size: 14px;
    }
    .resume-watch-modal .btn-secondary {
        background: rgba(255,255,255,0.1);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.2);
    }
    .resume-watch-modal .btn-secondary:hover {
        background: rgba(255,255,255,0.2);
    }
    .resume-watch-modal .btn-primary {
        background: linear-gradient(135deg, #E50914, #ff6b6b);
        color: #fff;
    }
    .resume-watch-modal .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(229, 9, 20, 0.4);
    }
`;
document.head.appendChild(replyStyles);

/**
 * Xem chi tiết phim (Đã nâng cấp: Tự động nhớ tập đang xem dở)
 */
async function viewMovieDetail(movieId, updateHistory = true) {
  if (!movieId || movieId === "undefined" || movieId === "") {
    console.error("❌ viewMovieDetail: movieId is missing!");
    return;
  }
  
  // Reset trạng thái trước khi load phim mới
  currentMovieId = movieId;
  window.hasCheckedResumeHistory = false;
  window.hasResumeHistory = false;
  
  // Đóng modal resume và modal tiếp tục xem nếu đang mở
  closeResumeModal();
  const continueModal = document.getElementById("continueWatchingModal");
  if (continueModal) {
      continueModal.classList.remove("active");
  }
  
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
        
        // ✅ SỬA: Nếu có resumeFromTime từ click lịch sử thì ưu tiên dùng
        // Nếu không thì dùng thời gian từ Firestore
        let resumeTime = 0;
        let lastEp = data.lastEpisode || 0;
        
        if (window.resumeFromTime && window.resumeFromTime > 0) {
          // Người dùng click từ lịch sử - dùng thời gian được truyền vào
          resumeTime = window.resumeFromTime;
          lastEp = window.resumeFromEpisode || lastEp;
          console.log("📍 Resume từ click lịch sử:", resumeTime, "giây, tập:", lastEp + 1);
        } else if (data.lastTimeWatched && data.lastTimeWatched > 0) {
          // Không có resumeFromTime nhưng có thời gian trong Firestore
          resumeTime = data.lastTimeWatched;
          console.log("📍 Resume từ Firestore:", resumeTime, "giây, tập:", lastEp + 1);
        }
        
        // Gán episode (nếu có)
        if (lastEp !== undefined) {
          currentEpisode = lastEp;
          console.log(
            `🔄 Đã khôi phục: Bạn đang xem tập ${currentEpisode + 1}`,
          );
        }
        
        // ✅ Lưu resume time vào biến toàn cục để checkAndShowContinueWatchingModal sử dụng
        if (resumeTime > 0) {
          window.hasResumeHistory = true;
          window.resumeTimeData = {
            timeWatched: resumeTime,
            episodeIndex: currentEpisode,
            minutesWatched: Math.floor(resumeTime / 60)
          };
          
          // (Đã dời việc clear resumeFromTime sang hàm checkAndShowContinueWatchingModal)
        }
      }

      // Cập nhật lại thời gian "Vừa mới xem" lên đầu danh sách
      // ✅ Chỉ lưu episode, không lưu time ở đây (time sẽ được lưu khi xem)
      saveWatchHistory(movieId, currentEpisode);
    } catch (error) {
      console.error("Lỗi khôi phục lịch sử:", error);
    }
  }
  // 👆 HẾT PHẦN SỬA 👆

  // 3. Cập nhật lượt xem
  updateMovieViews(movieId);

  // 4. Điền thông tin vào giao diện (Redesign mới)
  const isFreeMovie = !movie.price || movie.price === 0;
  
  // Các phần tử cũ (vẫn giữ để tránh lỗi nếu có code khác dùng)
  if (document.getElementById("detailPoster")) document.getElementById("detailPoster").src = movie.posterUrl;
  if (document.getElementById("detailTitle")) document.getElementById("detailTitle").textContent = movie.title;
  // Cập nhật tên phim lên top bar player
  setTimeout(() => updatePlayerTopBar(), 100);
  // Hiển thị tên tiếng Anh nhỏ bên dưới (nếu có)
  const detailOriginEl = document.getElementById("detailOriginTitle");
  if (detailOriginEl) {
    if (movie.originTitle) {
      detailOriginEl.textContent = movie.originTitle;
      detailOriginEl.style.display = "";
    } else {
      detailOriginEl.style.display = "none";
    }
  }
  if (document.getElementById("detailYear")) document.getElementById("detailYear").textContent = movie.year || "N/A";
  if (document.getElementById("detailCountry")) document.getElementById("detailCountry").textContent = movie.country || "N/A";
  if (document.getElementById("detailCategory")) {
      document.getElementById("detailCategory").textContent = (movie.categories && movie.categories.length > 0) 
          ? movie.categories.join(', ') : (movie.category || "N/A");
  }
  if (document.getElementById("detailRating")) document.getElementById("detailRating").textContent = movie.rating || 0;
  if (document.getElementById("detailViews")) document.getElementById("detailViews").textContent = formatNumber(movie.views || 0);
  if (document.getElementById("detailDescription")) document.getElementById("detailDescription").textContent = movie.description || "Chưa có mô tả";

  // Hiển thị giá CRO
  const croPriceValue = document.getElementById("croPriceValue");
  const purchasePriceTag = document.getElementById("purchasePriceTag");
  const paymentActionBox = document.getElementById("paymentActionBox");
  const btnCroPrice = document.getElementById("btnCroPrice");

  if (!isFreeMovie) {
    if (croPriceValue) croPriceValue.textContent = movie.price;
    if (btnCroPrice) btnCroPrice.textContent = movie.price;
    if (purchasePriceTag) purchasePriceTag.classList.remove("hidden");
  } else {
    if (purchasePriceTag) purchasePriceTag.classList.add("hidden");
    if (paymentActionBox) paymentActionBox.classList.add("hidden");
  }

  // Render tags
  const tagsContainer = document.getElementById("detailTags");
  if (tagsContainer) {
    tagsContainer.innerHTML = (movie.tags || [])
        .map((tag) => {
            let tagClass = "";
            if (tag === "hot") tagClass = "hot";
            else if (tag === "mới") tagClass = "new";
            return `<span class="tag ${tagClass}">${tag}</span>`;
        })
        .join("");
  }

  // 5. Render danh sách tập
  if (currentEpisode >= 0) {
      currentEpisodePage = Math.floor(currentEpisode / EPISODES_PER_PAGE);
  } else {
      currentEpisodePage = 0;
  }
  
  renderEpisodes(movie.episodes || []);
  
  // 5.1 Render các tính năng mới
  if (movie.episodes && movie.episodes[currentEpisode]) {
      renderDetailVersions(movie.episodes[currentEpisode]);
  }
  renderRecommendedMovies(movie);
  renderMoviePartsSeries(movie);


  // 6. Kiểm tra lịch sử xem
  await checkAndShowContinueWatchingModal();

  // 7. Kiểm tra quyền xem và tải Video (Xử lý ẩn hiện paymentActionBox bên trong)
  await checkAndUpdateVideoAccess();

  // 8. Tải bình luận
  loadComments(movieId);
  // 9. Lắng nghe Reaction
  listenToReactions(movieId);

  // 10. Cập nhật giao diện Redesign mới
  updateDetailRedesignUI(movie);

  // 10.1 Render sidebar diễn viên
  renderDetailActorSidebar(movie);

  // 11. Chuyển trang
  showPage("movieDetail", false); // Không push state ở đây để tránh duplicate ?page=
  
  // 12. Cập nhật URL đẹp (Pretty URL) cho trang Xem phim
  let newUrl = window.location.href; // Mặc định tự động lấy url hiện tại
  if (movie && movie.title && updateHistory) {
      const slug = createSlug(movie.title || "video");
      let basePath = window.APP_BASE_PATH || "";
      const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
      newUrl = `${cleanBase}#/watch/${slug}-${movieId}`;
      console.log("🚀 Pushing Detail URL:", newUrl);
      history.pushState({ movieId: movieId, page: 'watch' }, movie.title, newUrl);
  }
  
  // 13. Cập nhật thẻ chia sẻ (Meta Data)
  if(movie && typeof updatePageMetadata === "function") {
      updatePageMetadata(
          "Xem phim " + movie.title + " - Trạm Phim", 
          movie.description || "Rạp Chiếu Phim Blockchain - Xem phim trực tuyến, thanh toán bằng CRO Token", 
          movie.posterUrl || movie.backgroundUrl || "https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico", 
          window.location.origin + window.location.pathname + newUrl.substring(newUrl.indexOf("#"))
      );
  }
}

/**
 * Cập nhật giao diện Redesign mới (Top bar, toolbar)
 */
function updateDetailRedesignUI(movie) {
    const topTitle = document.getElementById("redesignTopTitle");
    if (topTitle) {
        topTitle.textContent = `Xem phim ${movie.title}`;
    }

    // Cập nhật trạng thái nút Yêu thích
    const likeBtn = document.getElementById("btnLikeDetail");
    if (likeBtn && currentUser && currentUser.favorites) {
        const isLiked = currentUser.favorites.includes(movie.id);
        if (isLiked) {
            likeBtn.classList.add("active");
            likeBtn.style.color = "#e50914";
            likeBtn.innerHTML = '<i class="fas fa-heart" style="color: #e50914"></i> Đã thích';
        } else {
            likeBtn.classList.remove("active");
            likeBtn.style.color = "";
            likeBtn.innerHTML = '<i class="far fa-heart"></i> Yêu thích';
        }
    }
}

/**
 * Render sidebar diễn viên cho trang chi tiết phim
 */
function renderDetailActorSidebar(movie) {
    const grid = document.getElementById("detailActorGrid");
    if (!grid) return;

    if (!movie.cast && (!movie.castData || movie.castData.length === 0)) {
        grid.innerHTML = '<p style="color: #888; font-size: 13px; text-align: center;">Chưa có thông tin diễn viên.</p>';
        return;
    }

    // Ưu tiên dùng castData (mảng đối tượng ID & Name) để liên kết ID bền vững
    // Nếu chưa có castData (phim cũ), dùng cast (string) làm dự phòng (fallback)
    let actorsToRender = [];
    if (movie.castData && Array.isArray(movie.castData) && movie.castData.length > 0) {
        actorsToRender = movie.castData.map(a => ({ id: a.id, name: a.name }));
    } else if (movie.cast) {
        actorsToRender = movie.cast.split(",").map(n => ({ id: null, name: n.trim() })).filter(a => a.name);
    }

    grid.innerHTML = actorsToRender.map(actor => {
        const name = actor.name;
        // Tra cứu ảnh thật từ allActors
        let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=120&bold=true&font-size=0.35`;

        if (typeof allActors !== 'undefined' && allActors) {
            let dbActor = null;
            
            // 1. Ưu tiên tìm theo ID
            if (actor.id) {
                dbActor = allActors.find(a => a.id === actor.id);
            }
            
            // 2. Dự phòng tìm theo tên nếu không tìm thấy ID (Phòng hờ dữ liệu cũ hoặc lỗi ID)
            if (!dbActor) {
                const q = name.toLowerCase();
                dbActor = allActors.find(a => 
                    a.name.toLowerCase() === q || 
                    (a.altNames && a.altNames.some(alt => alt.toLowerCase() === q))
                );
            }
            
            if (dbActor && dbActor.avatar) {
                avatarUrl = dbActor.avatar;
            }
        }

        const safeName = name.replace(/'/g, "\\'");
        return `
            <div class="sidebar-actor-item" onclick="viewActorDetail('${safeName}')" title="${name}">
                <img src="${avatarUrl}" alt="${name}" loading="lazy">
                <span class="sidebar-actor-name">${name}</span>
            </div>
        `;
    }).join("");
}

// --- LOGIC ẨN HIỆN TOOLBAR TRONG CINEMA MODE ---
let cinemaHideTimeout = null;
let isMouseInToolbar = false;

function showCinemaControls() {
    if (!document.body.classList.contains("cinema-mode")) return;
    
    document.body.classList.add("controls-visible");
    
    // Reset timeout
    clearTimeout(cinemaHideTimeout);
    
    // Thời gian chờ: 5s cho mọi trường hợp đứng im, 2s nếu di chuyển ở vùng video
    const waitTime = isMouseInToolbar ? 5000 : 2000; 
    
    cinemaHideTimeout = setTimeout(() => {
        hideCinemaControls();
    }, waitTime);
}

function hideCinemaControls() {
    if (isMouseInToolbar) return; // Đang rê vào toolbar thì không ẩn
    document.body.classList.remove("controls-visible");
}

// Lắng nghe di chuyển chuột toàn trang
document.addEventListener("mousemove", () => {
    if (document.body.classList.contains("cinema-mode")) {
        showCinemaControls();
    }
});

// Sử dụng Event Delegation để theo dõi chuột vào/ra toolbar (Bền bỉ hơn trong SPA)
document.addEventListener("mouseover", (e) => {
    if (!document.body.classList.contains("cinema-mode")) return;
    
    const target = e.target.closest(".detail-top-bar, .detail-toolbar");
    if (target) {
        isMouseInToolbar = true;
        showCinemaControls(); // Hiện và đặt ngưỡng 5s
    }
});

document.addEventListener("mouseout", (e) => {
    if (!document.body.classList.contains("cinema-mode")) return;
    
    const target = e.target.closest(".detail-top-bar, .detail-toolbar");
    if (target) {
        // Kiểm tra xem chuột có thực sự rời khỏi vùng widget không (vào phần tử con thì không tính)
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !target.contains(relatedTarget)) {
            isMouseInToolbar = false;
            // Di chuột ra ngoài ẩn siêu nhanh (0.5s)
            clearTimeout(cinemaHideTimeout);
            cinemaHideTimeout = setTimeout(() => {
                hideCinemaControls();
            }, 500);
        }
    }
});

/**
 * Xử lý bật/tắt các switch trên thanh công cụ
 */
function toggleSwitch(id) {
    const sw = document.getElementById(id);
    if (!sw) return;

    const isOn = sw.classList.contains("on");
    if (isOn) {
        sw.classList.remove("on");
        sw.classList.add("off");
        sw.textContent = "OFF";
    } else {
        sw.classList.remove("off");
        sw.classList.add("on");
        sw.textContent = "ON";
    }

    // Xử lý logic riêng cho từng switch
    if (id === "swReaction") {
        const sidebar = document.getElementById("reactionSidebar");
        const playerSection = document.querySelector(".player-section");
        
        if (isOn) {
            if (sidebar) sidebar.classList.add("hidden");
            if (playerSection) playerSection.classList.remove("reaction-active");
        } else {
            if (sidebar) sidebar.classList.remove("hidden");
            if (playerSection) playerSection.classList.add("reaction-active");
        }
    } else if (id === "swCinemaMode") {
        const isActivating = !isOn;
        document.body.classList.toggle("cinema-mode", isActivating);
        
        if (isActivating) {
            // Hiện ngay lập tức khi vừa bật
            if (typeof showCinemaControls === 'function') {
                showCinemaControls();
            }
        } else {
            // Dọn dẹp khi tắt
            document.body.classList.remove("controls-visible");
            clearTimeout(cinemaHideTimeout);
        }
    } else if (id === "swAntiLe") {
        const isActivating = !isOn; // Trạng thái mới của Anti Lê
        const video = document.getElementById("html5Player");
        const container = document.getElementById("videoContainer");
        
        if (video && container) {
            if (isActivating) {
                // ON: Dùng custom controls (tắt native)
                video.controls = false;
                video.removeAttribute("controls");
                container.classList.remove("native-controls-active");
                // Đảm bảo custom controls hiển thị lại
                if (typeof showControls === 'function') {
                    showControls();
                }
            } else {
                // OFF: Dùng native controls (ẩn custom)
                video.controls = true;
                video.setAttribute("controls", "controls");
                container.classList.add("native-controls-active");
                // Ẩn custom controls đi
                if (typeof hideControls === 'function') {
                    hideControls();
                }
            }
        }
    }
}

/**
 * Gửi Reaction (Emoji floating)
 */
window.sendReaction = function(emoji) {
    console.log(`🎬 [ACTION] User clicked reaction: ${emoji}`);
    
    // 1. Hiển thị hiệu ứng bay lên NGAY LẬP TỨC (Local UI)
    if (window.showReactionOnScreen) {
        window.showReactionOnScreen(emoji);
    }

    // Guard: Bắt buộc phải có currentMovieId hợp lệ mới gửi lên Firestore
    if (!currentMovieId || currentMovieId === "undefined" || currentMovieId === "" || currentMovieId === null) {
        console.warn("⚠️ sendReaction: currentMovieId is invalid, skipping Firestore sync.");
        return;
    }

    // 2. Gửi lên Firestore để các user khác cùng xem (Realtime)
    if (db && currentUser) {
        try {
            db.collection("movies").doc(currentMovieId).collection("reactions").add({
                emoji: emoji,
                userId: currentUser.uid,
                userName: currentUser.displayName || "GUEST",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("✅ Reaction synced to Firestore");
        } catch (e) {
            console.error("❌ Lỗi gửi reaction Firestore:", e);
        }
    } else {
        console.log("ℹ️ User not logged in or DB not ready, reaction only showed locally.");
    }
};

/**
 * Lắng nghe Reactions từ Firestore (Realtime)
 */
let reactionUnsubscribe = null;
window.listenToReactions = function(movieId) {
    if (!db || !movieId || movieId === "" || movieId === "undefined") return;
    
    if (reactionUnsubscribe) reactionUnsubscribe();
    const startTime = firebase.firestore.Timestamp.now();
    console.log(`📡 Listening to reactions for: ${movieId}`);

    reactionUnsubscribe = db.collection("movies").doc(movieId).collection("reactions")
        .where("timestamp", ">", startTime)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    if (currentUser && data.userId === currentUser.uid) return;
                    if (window.showReactionOnScreen) window.showReactionOnScreen(data.emoji);
                }
            });
        }, err => console.error("❌ Lỗi listen reaction:", err));
};

/**
 * Hàm hiển thị Emoji trôi lên màn hình (Dùng chung cho cả local và realtime)
 */
window.showReactionOnScreen = function(emoji) {
    const container = document.getElementById("videoContainer");
    if (!container) {
        console.error("❌ showReactionOnScreen: videoContainer not found!");
        return;
    }

    const reaction = document.createElement("div");
    reaction.className = "floating-reaction";
    reaction.textContent = emoji;
    reaction.style.position = "absolute";
    reaction.style.zIndex = "9999";
    
    // Vị trí góc dưới bên phải (Cố định vùng này)
    // Random nhẹ để không bị chồng khít lên nhau hoàn toàn
    const rightOffset = 20 + Math.random() * 40; // 20px - 60px từ lề phải
    const bottomOffset = 60 + Math.random() * 20; // 60px - 80px từ dưới (trên thanh controls tí)
    
    reaction.style.right = rightOffset + "px";
    reaction.style.bottom = bottomOffset + "px";
    reaction.style.pointerEvents = "none"; 
    
    container.appendChild(reaction);
    console.log(`✨ [UI] Emoji added to DOM: ${emoji} at bottom-right`);

    // Xóa sau khi animation kết thúc (Animation CSS floatingUp xử lý bay lên)
    setTimeout(() => {
        if (reaction.parentNode) {
            reaction.remove();
        }
    }, 3000);
};

// --- LOGIC ĐIỀU KHIỂN VIDEO TÙY CHỈNH ---

// function togglePlay() { ... } // Gỡ bỏ bản cũ, dùng bản window.togglePlay ở cuối file

/**
 * Tua tới/lui (giây)
 */
function skipTime(seconds) {
    const html5Player = document.getElementById("html5Player");
    if (!html5Player.classList.contains("hidden")) {
        html5Player.currentTime += seconds;
    } else if (window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') {
        const currentTime = window.ytPlayer.getCurrentTime();
        window.ytPlayer.seekTo(currentTime + seconds, true);
    }
}

/**
 * Bật/Tắt âm thanh
 */
function toggleMute() {
    const html5Player = document.getElementById("html5Player");
    const volumeBtn = document.getElementById("volumeBtn");
    const icon = volumeBtn.querySelector("i");

    if (!html5Player.classList.contains("hidden")) {
        html5Player.muted = !html5Player.muted;
        icon.className = html5Player.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
    } else if (window.ytPlayer && typeof window.ytPlayer.isMuted === 'function') {
        if (window.ytPlayer.isMuted()) {
            window.ytPlayer.unMute();
            icon.className = "fas fa-volume-up";
        } else {
            window.ytPlayer.mute();
            icon.className = "fas fa-volume-mute";
        }
    }
}

/**
 * Mở/Đóng menu cài đặt
 */
function toggleSettingsMenu() {
    const menu = document.getElementById("settingsMenu");
    menu.classList.toggle("active");
    hideSubMenu(); // Đóng các submenu nếu đang mở
}

/**
 * Hiện submenu (Tốc độ, Màu, Chất lượng)
 */
function showSubMenu(type) {
    const menu = document.getElementById(type + "Menu");
    if (!menu) return;
    
    // Ẩn menu chính
    document.getElementById("settingsMenu").classList.remove("active");
    // Hiện submenu
    menu.classList.add("active");
}

/**
 * Ẩn tất cả submenu
 */
function hideSubMenu() {
    document.querySelectorAll(".settings-submenu").forEach(m => m.classList.remove("active"));
}

/**
 * Chỉnh tốc độ phát
 */
function setSpeed(rate) {
    const html5Player = document.getElementById("html5Player");
    const speedVal = document.getElementById("currentSpeedVal");
    
    if (!html5Player.classList.contains("hidden")) {
        html5Player.playbackRate = rate;
    } else if (window.ytPlayer && typeof window.ytPlayer.setPlaybackRate === 'function') {
        window.ytPlayer.setPlaybackRate(rate);
    }

    speedVal.textContent = rate === 1 ? "Chuẩn" : rate + "x";
    
    // Active UI
    document.querySelectorAll("#speedMenu .submenu-item").forEach(item => {
        item.classList.toggle("active", item.getAttribute("onclick").includes(rate));
    });
    
    hideSubMenu();
}

/**
 * Chỉnh màu phụ đề (Giả lập UI)
 */
function setSubtitleColor(color) {
    document.getElementById("currentColorVal").textContent = color.toUpperCase();
    showNotification(`Đã đổi màu phụ đề sang ${color}`, "info");
    hideSubMenu();
}

/**
 * Chỉnh chất lượng (HLS)
 */
function setQuality(level) {
    if (window.hlsInstance) {
        window.hlsInstance.currentLevel = level;
        const qualityVal = document.getElementById("currentQualityVal");
        qualityVal.textContent = level === -1 ? "Tự động" : window.hlsInstance.levels[level].height + "p";
    }
    hideSubMenu();
}

/**
 * Bật/Tắt Hình trong hình (PiP)
 */
async function togglePiP() {
    const html5Player = document.getElementById("html5Player");
    if (html5Player.classList.contains("hidden")) {
        showNotification("PiP chỉ hỗ trợ trình phát trực tiếp (M3U8/MP4)", "warning");
        return;
    }

    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await html5Player.requestPictureInPicture();
        }
    } catch (e) {
        console.error("Lỗi PiP:", e);
    }
}

// toggleFullscreen() - Đã gỡ bản cũ, dùng window.toggleFullscreen ở dòng dưới

// --- QUẢN LÝ ALBUM ---

/**
 * Mở modal Album
 */
async function openAlbumModal() {
    if (!currentUser) {
        showNotification("Vui lòng đăng nhập để sử dụng tính năng này!", "warning");
        openModal("authModal");
        return;
    }

    openModal("albumModal");
    loadUserAlbums();
}

/**
 * Load danh sách album của người dùng từ Firestore
 */
async function loadUserAlbums() {
    const container = document.getElementById("albumListContainer");
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';

    try {
        const snapshot = await db.collection("users").doc(currentUser.uid).collection("albums").get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; color: #888; padding: 20px;">
                    <i class="fas fa-folder-open" style="font-size: 30px; margin-bottom: 10px; display: block;"></i>
                    Bạn chưa có album nào.<br>Hãy tạo album đầu tiên bên dưới!
                </div>`;
            return;
        }

        let html = "";
        snapshot.forEach(doc => {
            const album = doc.data();
            const movieCount = album.movies ? album.movies.length : 0;
            const isInAlbum = album.movies && album.movies.some(m => m.id === currentMovieId);

            html += `
                <div class="album-item" onclick="addToAlbum('${doc.id}', '${album.name.replace(/'/g, "\\'")}')" 
                     style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; cursor: pointer; transition: 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-folder" style="color: var(--accent-primary);"></i>
                        <div>
                            <div style="font-weight: 600;">${album.name}</div>
                            <div style="font-size: 11px; color: #888;">${movieCount} phim</div>
                        </div>
                    </div>
                    ${isInAlbum ? '<i class="fas fa-check-circle" style="color: #4ade80;"></i>' : '<i class="far fa-circle" style="color: #444;"></i>'}
                </div>`;
        });
        container.innerHTML = html;

    } catch (error) {
        console.error("Lỗi load album:", error);
        container.innerHTML = '<div style="color: var(--error); text-align: center;">Lỗi khi tải danh sách album.</div>';
    }
}

/**
 * Tạo Album mới
 */
async function createNewAlbum() {
    const input = document.getElementById("newAlbumName");
    const name = input.value.trim();
    
    if (!name) {
        showNotification("Vui lòng nhập tên album!", "warning");
        return;
    }

    try {
        const newAlbumRef = db.collection("users").doc(currentUser.uid).collection("albums").doc();
        await newAlbumRef.set({
            name: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            movies: []
        });

        input.value = "";
        showNotification(`Đã tạo album "${name}"`, "success");
        loadUserAlbums(); // Refresh list

    } catch (error) {
        console.error("Lỗi tạo album:", error);
        showNotification("Không thể tạo album. Vui lòng thử lại!", "error");
    }
}

/**
 * Thêm phim hiện tại vào album
 */
async function addToAlbum(albumId, albumName) {
    if (!currentMovieId) return;

    try {
        const albumRef = db.collection("users").doc(currentUser.uid).collection("albums").doc(albumId);
        const doc = await albumRef.get();
        if (!doc.exists) return;

        const albumData = doc.data();
        let movies = albumData.movies || [];

        // Kiểm tra xem đã có trong album chưa
        const index = movies.findIndex(m => m.id === currentMovieId);
        
        if (index > -1) {
            // Nếu đã có thì xóa ra (Toggle functionality)
            movies.splice(index, 1);
            await albumRef.update({ movies: movies });
            showNotification(`Đã xóa khỏi album "${albumName}"`, "info");
        } else {
            // Nếu chưa có thì thêm vào
            const movie = allMovies.find(m => m.id === currentMovieId);
            movies.push({
                id: movie.id,
                title: movie.title,
                posterUrl: movie.posterUrl,
                addedAt: new Date().toISOString()
            });
            await albumRef.update({ movies: movies });
            showNotification(`Đã thêm vào album "${albumName}"`, "success");
        }

        loadUserAlbums(); // Refresh UI in modal

    } catch (error) {
        console.error("Lỗi cập nhật album:", error);
        showNotification("Có lỗi xảy ra khi cập nhật album!", "error");
    }
}

/**
 * Chia sẻ phim
 */
function shareMovie() {
    const movie = allMovies.find(m => m.id === currentMovieId);
    if (!movie) return;

    const url = window.location.href; // Hoặc logic tạo link share cụ thể
    if (navigator.share) {
        navigator.share({
            title: movie.title,
            text: `Đang xem phim ${movie.title} tại Trạm Phim. Xem ngay!`,
            url: url
        }).catch(console.error);
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showNotification("Đã copy link phim vào bộ nhớ tạm!", "success");
        });
    }
}

/**
 * Báo lỗi phim
 */
async function reportError() {
    if (!currentUser) {
        if (await customConfirm("Vui lòng đăng nhập để gửi báo cáo lỗi. Bạn có muốn đăng nhập ngay?", { title: "Chưa Đăng Nhập", type: "warning", confirmText: "Đăng nhập" })) {
            openModal("authModal");
        }
        return;
    }

    // -- CHỐNG SPAM (60 giây / 1 lần báo cáo) --
    const lastReportTime = localStorage.getItem("lastErrorReportTime_" + currentUser.uid);
    const now = Date.now();
    if (lastReportTime) {
        const diffSeconds = Math.floor((now - parseInt(lastReportTime)) / 1000);
        if (diffSeconds < 60) {
            showNotification(`Vui lòng đợi ${60 - diffSeconds} giây nữa để gửi báo cáo tiếp theo!`, "warning");
            return;
        }
    }

    if (!currentMovieId || !allMovies) return;

    const movie = allMovies.find(m => m.id === currentMovieId);
    if (!movie) return;

    // Xác định tập phim đang xem
    let episodeName = "Tập phim/Phim lẻ";
    if (movie.episodes && movie.episodes[currentEpisode]) {
        const ep = movie.episodes[currentEpisode];
        episodeName = String(ep.episodeNumber).toLowerCase().includes('tập') ? ep.episodeNumber : `Tập ${ep.episodeNumber}`;
    }

    // Yêu cầu nhập mô tả lỗi
    const errorResult = await customPrompt(`Hãy mô tả lỗi bạn gặp phải đối với phim "${movie.title}" - ${episodeName}:`, {
        isTextarea: true,
        placeholder: "Nhập chi tiết lỗi tại đây...",
        selectOptions: [
            { value: "load_slow", label: "Video giật lag / Load chậm" },
            { value: "broken_link", label: "Không xem được / Bị lỗi Play" },
            { value: "subtitle_error", label: "Lỗi phụ đề (lệch, sai, không hiện)" },
            { value: "audio_error", label: "Lỗi âm thanh (mất tiếng, rè)" },
            { value: "wrong_movie", label: "Sai phim / Sai tập" },
            { value: "other", label: "Khác" }
        ]
    });
    
    if (errorResult === null) return; // Nhấn hủy

    const errorType = errorResult.selectValue;
    const errorDesc = errorResult.textValue;

    if (!errorDesc || !errorDesc.trim()) {
        showNotification("Vui lòng nhập mô tả lỗi chi tiết để chúng tôi có thể khắc phục!", "warning");
        return;
    }

    try {
        showLoading(true, "Đang gửi báo cáo lỗi...");

        // 1. Lưu vào collection error_reports
        await db.collection("error_reports").add({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email || "Unknown User",
            movieId: currentMovieId,
            movieTitle: movie.title,
            episodeId: typeof currentEpisode !== 'undefined' ? currentEpisode : null,
            episodeName: episodeName,
            errorType: errorType,
            description: errorDesc.trim(),
            status: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Map label hiển thị trên thông báo Admin
        const typeLabels = {
            "load_slow": "Video giật lag",
            "broken_link": "Không xem được/Hỏng link",
            "subtitle_error": "Lỗi phụ đề",
            "audio_error": "Lỗi âm thanh",
            "wrong_movie": "Sai tập/Sai phim",
            "other": "Khác"
        };
        const typeName = typeLabels[errorType] || "Khác";

        // 2. Trực tiếp bắn thông báo cho tài khoản Admin
        await db.collection("notifications").add({
            isForAdmin: true,
            title: `Báo lỗi [${typeName}]: ${movie.title} - ${episodeName}`,
            message: `User ${currentUser.displayName || currentUser.email} báo lỗi: "${errorDesc.substring(0, 50)}${errorDesc.length > 50 ? '...' : ''}"`,
            type: "system",
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Cập nhật thời gian chống spam vào LocalStorage
        localStorage.setItem("lastErrorReportTime_" + currentUser.uid, Date.now());

        // 4. Hiển thị popup cảm ơn (như user yêu cầu)
        await customAlert("Cảm ơn bạn đã gửi lỗi, chúng tôi sẽ sớm khắc phục trong thời gian sớm nhất! Xin lỗi vì trải nghiệm không tốt này! 💛", "Gửi Hệ Thống Thành Công", "success");

    } catch (err) {
        console.error("Lỗi gửi báo cáo:", err);
        showNotification("Không thể gửi báo cáo lỗi lúc này!", "error");
    } finally {
        showLoading(false);
    }
}


// --- LOGIC THANH TIẾN TRÌNH (PROGRESS BAR) ---

/**
 * Cập nhật thanh tiến trình theo thời gian thực
 */
// Logic cũ đã được chuyển vào initCustomControls và updateCustomProgress

/**
 * Xử lý khi người dùng kéo hoặc click thanh tua
 */
// Logic cũ đã được chuyển vào initCustomControls

// function saveWatchProgressImmediate ... (Gỡ bỏ trùng lặp, dùng bản đầy đủ ở phía dưới)

/**
 * Đóng Modal Tiếp tục xem
 */
function closeResumeModal() {
    closeModal("resumeWatchModal");
}

/**
 * Khởi tạo các sự kiện cho trình phát tùy chỉnh
 */
// Logic cũ đã được chuyển vào initCustomControls

/**
 * Render danh sách tập phim
 */
function renderEpisodes(episodes) {
  const container = document.getElementById("episodesList");
  const section = document.getElementById("episodesSection");
  const pageSelect = document.getElementById("episodePageSelect");

  if (!episodes || episodes.length === 0) {
    section.classList.add("hidden");
    return;
  }

  if (episodes.length <= 1) {
    if (pageSelect) pageSelect.style.display = "none";
  }

  section.classList.remove("hidden");
  
  // --- LOGIC PHÂN TRANG ---
  const totalEpisodes = episodes.length;
  
  // Create pagination dropdown if needed
  if (totalEpisodes > EPISODES_PER_PAGE) { // EPISODES_PER_PAGE = 10 (global)
      if (pageSelect) {
          pageSelect.style.display = "block";
          pageSelect.innerHTML = "";
          
          const totalPages = Math.ceil(totalEpisodes / EPISODES_PER_PAGE);
          for(let i = 0; i < totalPages; i++) {
              const start = i * EPISODES_PER_PAGE + 1;
              const end = Math.min((i + 1) * EPISODES_PER_PAGE, totalEpisodes);
              const option = document.createElement("option");
              option.value = i;
              option.textContent = `Tập ${start} - ${end}`;
              if (i === currentEpisodePage) option.selected = true;
              pageSelect.appendChild(option);
          }
      }
  } else {
      if (pageSelect) pageSelect.style.display = "none";
      currentEpisodePage = 0;
  }

  // Slice episodes for current page
  const startIdx = currentEpisodePage * EPISODES_PER_PAGE;
  const endIdx = startIdx + EPISODES_PER_PAGE;
  const currentEpisodes = episodes.slice(startIdx, endIdx);

  container.innerHTML = currentEpisodes
    .map(
      (ep, index) => {
        const realIndex = startIdx + index;
        const isActive = realIndex === currentEpisode;
        const label = String(ep.episodeNumber).toLowerCase().includes("tập") ? ep.episodeNumber : `Tập ${ep.episodeNumber}`;
        return `
        <div class="episode-item ${isActive ? "active" : ""}" 
             data-index="${realIndex}"
             onclick="selectEpisode(${realIndex})">
            <span class="ep-number">${label}</span>
        </div>
    `;
      }
    )
    .join("");
}

/**
 * Chuyển trang danh sách tập phim
 */
function changeEpisodePage(pageIndex) {
    currentEpisodePage = parseInt(pageIndex);
    const movieId = currentMovieId;
    const movie = allMovies.find(m => m.id === movieId);
    if (movie) {
        renderEpisodes(movie.episodes || []);
    }
}

/**
 * Chọn tập phim
 */
function selectEpisode(index) {
  // ✅ RESET RESUME DATA: Khi chuyển tập mới, không dùng lại thời gian của tập cũ
  window.hasResumeHistory = false;
  window.resumeTimeData = null;
  
  currentEpisode = index;

  // Update active state
  document.querySelectorAll(".episode-item").forEach((el) => {
    el.classList.toggle("active", parseInt(el.dataset.index) === index);
  });
  // 👇 THÊM DÒNG NÀY: Lưu lịch sử xem ngay khi chọn tập 👇
  if (currentMovieId) {
    saveWatchHistory(currentMovieId, index);
  }
  
  // Update versions corresponding to this episode
  const movie = allMovies.find(m => m.id === currentMovieId);
  if (movie && movie.episodes && movie.episodes[index]) {
      renderDetailVersions(movie.episodes[index]);
  }

  // Update video if unlocked
  checkAndUpdateVideoAccess();
  
  // Cập nhật top bar player với tập mới
  updatePlayerTopBar();

  // Reset cờ thông báo đếm ngược cho tập mới
  isCountdownNotified = false;
}

/**
 * Kiểm tra và cập nhật quyền xem video
 */
async function checkAndUpdateVideoAccess() {
  const videoLocked = document.getElementById("videoLocked");
  const videoPlayer = document.getElementById("videoPlayer");
  const html5Player = document.getElementById("html5Player");
  const buyTicketBtn = document.getElementById("buyTicketBtn");
  const paymentActionBox = document.getElementById("paymentActionBox");

  let hasAccess = false;

  // Lấy thông tin phim hiện tại để kiểm tra giá
  const currentMovie = allMovies.find(m => m.id === currentMovieId);
  if (!currentMovie) return;
  
  const isFreeMovie = !currentMovie.price || currentMovie.price === 0;
  
  // 1. Admin luôn có quyền xem
  if (isAdmin) {
    hasAccess = true;
  }
  // 2. VIP luôn được xem
  else if (currentUser && currentUser.isVip === true) {
    hasAccess = true;
  }
  // 3. Phim miễn phí
  else if (isFreeMovie) {
    hasAccess = true;
  }
  // 4. Kiểm tra đã mua chưa (Dành cho Member thường xem phim trả phí)
  else if (currentUser && currentMovieId) {
    hasAccess = await checkMoviePurchased(currentMovieId);
  }

  // --- CẬP NHẬT UI THANH TOÁN ---
  if (paymentActionBox) {
      if (hasAccess || isFreeMovie) {
          paymentActionBox.classList.add("hidden");
      } else {
          paymentActionBox.classList.remove("hidden");
      }
  }

  if (buyTicketBtn) {
    if (hasAccess) {
        if (isAdmin) {
             buyTicketBtn.innerHTML = '<i class="fas fa-user-shield"></i> Quyền Admin';
             buyTicketBtn.disabled = true;
        } else if (currentUser && currentUser.isVip === true) {
             buyTicketBtn.innerHTML = '<i class="fas fa-crown"></i> Đặc quyền VIP';
             buyTicketBtn.disabled = true;
        } else if (isFreeMovie) {
             buyTicketBtn.innerHTML = '<i class="fas fa-play"></i> Xem Miễn Phí';
             buyTicketBtn.disabled = false;
        } else {
             buyTicketBtn.innerHTML = '<i class="fas fa-check"></i> Đã mua vé';
             buyTicketBtn.disabled = true;
             buyTicketBtn.classList.remove("btn-primary");
             buyTicketBtn.classList.add("btn-success");
        }
    } else {
        buyTicketBtn.innerHTML = `<i class="fas fa-ticket-alt"></i> Mua Vé Xem Phim (${currentMovie.price} CRO)`;
        buyTicketBtn.disabled = false;
        buyTicketBtn.classList.add("btn-primary");
        buyTicketBtn.classList.remove("btn-success");
    }
  }

  // --- CẬP NHẬT PLAYER UI ---
  if (hasAccess) {
    // Mở khóa giao diện
    if (videoLocked) videoLocked.classList.add("hidden");
    if (videoPlayer) videoPlayer.classList.remove("hidden");
    
    // Lưu trạng thái đang phát trước khi reload (để tự động phát tập mới nếu đang xem)
    const container = document.getElementById("videoContainer");
    const wasPlaying = container && container.classList.contains("playing");

    // Khởi tạo sự kiện cho trình phát tùy chỉnh (Sẽ gọi ở cuối sau khi xác định videoType)

    // 👇 LOGIC LOAD VIDEO 👇
    if (currentMovie.episodes && currentMovie.episodes[currentEpisode]) {
      const episode = currentMovie.episodes[currentEpisode];
      
      let videoType = "youtube";
      let videoSource = "";
      
      // LOGIC ĐA PHIÊN BẢN (MULTI-VERSION)
      if (episode.sources && Array.isArray(episode.sources) && episode.sources.length > 0) {
          const preferredLabel = localStorage.getItem("preferredSourceLabel");
          let sourceObj = episode.sources.find(s => s.label === preferredLabel);
          if (!sourceObj) sourceObj = episode.sources[0];
          
          videoType = sourceObj.type;
          videoSource = sourceObj.source;
      } else {
          videoType = episode.videoType || "youtube";
          videoSource = episode.videoSource || episode.youtubeId;
      }
      
      // --- FIX KKPHIM API FORMAT ---
      // Làm sạch link nếu API trả về dạng có gắn nhãn phía trước (VD: "Full|https://...")
      if (videoSource && typeof videoSource === 'string' && videoSource.includes("http") && !videoSource.startsWith("http")) {
          videoSource = videoSource.substring(videoSource.indexOf("http")).trim();
      }
      
      const iframePlayer = document.getElementById("videoPlayer");
      const html5Player = document.getElementById("html5Player");

      // Reset players
      iframePlayer.classList.add("hidden");
      iframePlayer.src = "";
      html5Player.classList.add("hidden");
      html5Player.pause();
      html5Player.src = "";
      
      if (window.hlsInstance) {
          window.hlsInstance.destroy();
          window.hlsInstance = null;
      }
      
      videoEl = null;
      currentVideoType = videoType;

      if (videoType === "youtube") {
          iframePlayer.classList.remove("hidden");
          
          const isModalActive = document.getElementById("continueWatchingModal")?.classList.contains("active");
          let autoplayParams = isModalActive ? "0" : "1";
          let params = `rel=0&enablejsapi=1&origin=${window.location.origin}&autoplay=${autoplayParams}`;
          
          // Chỉ thêm start time và autoplay nếu Modal KHÔNG ẩn
          if (!isModalActive && window.hasResumeHistory && window.resumeTimeData && window.resumeTimeData.timeWatched > 0) {
              params += `&start=${Math.floor(window.resumeTimeData.timeWatched)}`;
          }
          
          iframePlayer.src = `https://www.youtube.com/embed/${videoSource}?${params}`;
          
          iframePlayer.addEventListener('load', function() {
              // YouTube tracking đã được tích hợp vào initCustomControls mới
          });
          
      } else if (videoType === "embed") {
          // Xử lý link Embed trực tiếp (iframe URL)
          iframePlayer.classList.remove("hidden");
          
          let embedUrl = videoSource;
          // Nếu source chứa nguyên thẻ <iframe>, trích xuất link từ src="..."
          if (videoSource.includes("<iframe")) {
              const match = videoSource.match(/src="([^"]+)"/);
              if (match && match[1]) {
                  embedUrl = match[1];
              }
          }
          
          iframePlayer.src = embedUrl;
          currentVideoType = "embed";
          
      } else if (videoType === "hls") {
           // --- FIX EMBED IFRAME ---
           // Nhận diện link Iframe: 
           // 1. Chứa thẻ <iframe>, 2. Là một link Player có chứa parameters (vd: /player/?url=), 
           // 3. Hoặc link không đuôi chuẩn m3u8/mp4
           const isEmbedUrl = videoSource.includes("<iframe") || 
                              videoSource.includes("/player/?url=") || 
                              videoSource.includes("player.phimapi.com") || 
                              (videoSource.includes("http") && !videoSource.includes(".m3u8") && !videoSource.includes(".mp4"));
                              
           if (isEmbedUrl) {
               
               let embedUrl = videoSource;
               // Trích Regex lấy link trong src="..." nếu source chứa nguyên thẻ Iframe html
               if (videoSource.includes("<iframe")) {
                   const match = videoSource.match(/src="([^"]+)"/);
                   if (match && match[1]) {
                       embedUrl = match[1];
                   }
               }
               
               // Hiện Iframe và truyền thẻ vào
               iframePlayer.classList.remove("hidden");
               iframePlayer.src = embedUrl;
               // Cập nhật lại video type để custom control biết đường ẩn 
               currentVideoType = "embed"; 

           } else {
               // Chạy HLS M3U8 bình thường
               html5Player.classList.remove("hidden");
               const handleInitialPlayback = (player) => {
                   const isModalActive = document.getElementById("continueWatchingModal")?.classList.contains("active");
                   if (isModalActive) return; // Chờ người dùng click modal
                   
                    if (window.hasResumeHistory && window.resumeTimeData && window.resumeTimeData.timeWatched > 0) {
                        resumeVideoAtTime(window.resumeTimeData.timeWatched);
                    } else if (wasPlaying) {
                        // Tự động phát nếu tập trước đó đang phát
                        player.play().catch(e => console.log("Auto-play next ep blocked:", e));
                    } else {
                        player.play().catch(e => console.log("Auto-play blocked:", e));
                    }
               };

               if (Hls.isSupported()) {
                   const hls = new Hls();
                   window.hlsInstance = hls;
                   hls.loadSource(videoSource);
                   hls.attachMedia(html5Player);
                   hls.on(Hls.Events.MANIFEST_PARSED, function() {
                       handleInitialPlayback(html5Player);
                       populateQualityMenu(hls);
                   });
                    // Bắt lỗi HLS (Mạng yếu, 404, CORS, Server sập)
                    hls.on(Hls.Events.ERROR, function (event, data) {
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.error("HLS Network Error: " + data.details);
                                    autoReportVideoError("HLS_NETWORK", data.details);
                                    hls.startLoad(); 
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.error("HLS Media Error: " + data.details);
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    console.error("HLS Fatal Error: " + data.details);
                                    autoReportVideoError("HLS_FATAL", data.details);
                                    hls.destroy();
                                    break;
                            }
                        }
                    });
               } else if (html5Player.canPlayType('application/vnd.apple.mpegurl')) {
                   html5Player.src = videoSource;
                   html5Player.addEventListener('loadedmetadata', function() {
                       handleInitialPlayback(html5Player);
                   }, { once: true });
                    html5Player.onerror = function() {
                        const err = html5Player.error;
                        autoReportVideoError("NATIVE_HLS", `Error code: ${err ? err.code : 'unknown'}`);
                    };
               }
           }
      } else if (videoType === "mp4") {
          html5Player.classList.remove("hidden");
          html5Player.src = videoSource;
          
          const handleInitialPlayback = (player) => {
              const isModalActive = document.getElementById("continueWatchingModal")?.classList.contains("active");
              if (isModalActive) return; // Chờ người dùng click modal
              
               if (window.hasResumeHistory && window.resumeTimeData && window.resumeTimeData.timeWatched > 0) {
                   resumeVideoAtTime(window.resumeTimeData.timeWatched);
               } else if (wasPlaying) {
                   player.play().catch(e => console.log("Auto-play next ep blocked:", e));
               } else {
                   player.play().catch(e => console.log("Auto-play blocked:", e));
               }
          };
          
          html5Player.addEventListener('loadedmetadata', function() {
              handleInitialPlayback(html5Player);
          }, { once: true });
           html5Player.onerror = async function() {
               const err = html5Player.error;
               if (!currentMovie || !currentMovie.id) return;
               
               const episode = currentMovie.episodes && currentMovie.episodes[currentEpisode];
               const epName = episode 
                    ? (episode.name || episode.episodeNumber || `Tập ${currentEpisode + 1}`) 
                    : "Full";
               
               const errorKey = `reported_error_${currentMovie.id}_${currentEpisode}`;
               const lastReported = sessionStorage.getItem(errorKey);
               if (lastReported && (Date.now() - parseInt(lastReported) < 5 * 60 * 1000)) {
                   console.log("Đã báo lỗi MP4 gần đây, bỏ qua.");
                   return;
               }
               
               try {
                   const mId = currentMovie.id || currentMovieId || "unknown";
                   const eName = epName || "Full";
 
                   const checkQuery = await db.collection("error_reports")
                       .where("movieId", "==", mId)
                       .where("episodeName", "==", eName)
                       .where("status", "==", "pending")
                       .get();
                       
                   if (!checkQuery.empty) {
                       console.log("Tập phim này đã được báo lỗi MP4 và đang chờ xử lý. Bỏ qua.");
                       sessionStorage.setItem(errorKey, Date.now());
                       return;
                   }
 
                   const reportData = {
                       movieId: mId,
                       movieTitle: currentMovie.title || "Không rõ tên",
                       episodeName: eName,
                       errorType: "broken_link",
                       description: `[AUTO-DETECT] Lỗi tải Video (MP4): Error code ${err ? err.code : 'unknown'}\nVideo URL: ${videoSource}`,
                       userId: currentUser ? currentUser.uid : "anonymous",
                       userName: currentUser ? (currentUser.displayName || currentUser.email) : "Hệ thống tự động",
                       timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                       status: "pending"
                   };
                   
                   await db.collection("error_reports").add(reportData);
                   sessionStorage.setItem(errorKey, Date.now());
                   console.log("✅ Đã tự động báo lỗi link MP4 chết về Admin!");
               } catch (error) {
                   console.error("Lỗi auto-report MP4:", error);
               }
           };
      }

      const customControls = document.getElementById("customControls");
      const centerOverlay = document.getElementById("centerOverlay");
      if (customControls) {
        if (currentVideoType === "hls" || currentVideoType === "mp4") {
            customControls.classList.remove("hidden");
            if (centerOverlay) centerOverlay.classList.remove("hidden");
        } else {
            customControls.classList.add("hidden");
            if (centerOverlay) centerOverlay.classList.add("hidden");
        }
      }
      
      // ✅ KHỞI TẠO BỘ ĐIỀU KHIỂN TÙY CHỈNH (Sau khi đã xác định currentVideoType)
      if (typeof initCustomControls === 'function' && html5Player) {
          initCustomControls(html5Player);
      }
    }
  } else {
    // Khóa giao diện
    if (videoLocked) videoLocked.classList.remove("hidden");
    if (videoPlayer) videoPlayer.classList.add("hidden");
    if (html5Player) {
        html5Player.classList.add("hidden");
        html5Player.pause();
        html5Player.src = "";
    }
    
    // Cập nhật giá lên overlay khóa
    const lockedPrice = document.getElementById("lockedPrice");
    if (lockedPrice) {
        lockedPrice.textContent = `${currentMovie.price} CRO`;
    }
    
    const customControls = document.getElementById("customControls");
    if (customControls) customControls.classList.add("hidden");
  }
}

// --- CUSTOM VIDEO CONTROLS LOGIC ---
let videoEl = null;
let currentVideoType = "youtube"; // Track current video type: youtube, hls, mp4
let isDragging = false;
let hideControlsTimeout;
let lastSaveTime = 0; // Debounce save progress

// --- WATCH PROGRESS FUNCTIONS ---
let isAutoNexting = false; // Cờ chặn việc gọi handleAutoNext nhiều lần
let isCountdownNotified = false; // Cờ chặn việc hiện thông báo đếm ngược nhiều lần
let watchProgressInterval = null; // Interval for saving every 10 seconds

/**
 * Lưu thời gian xem phim vào Firestore (Mỗi 10 giây)
 */
async function saveWatchProgress(movieId, episodeIndex, currentTime, duration) {
    if (!currentUser || !db || !movieId) return;
    // Bỏ qua thời gian đầu video (0s - 1s) tránh việc load trang reset lịch sử vô ý
    if (currentTime <= 1 || duration <= 0) return;
    
    // Debounce: chỉ lưu mỗi 10 giây (đã sửa từ 30 giây)
    const now = Date.now();
    if (now - lastSaveTime < 10000) return;
    lastSaveTime = now;
    
    // Tính percentage
    const percentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
    
    try {
        if (!currentUser.uid || !movieId || movieId === "undefined") return;

        await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("watchProgress")
            .doc(movieId)
            .set({
                movieId: movieId,
                episodeIndex: episodeIndex,
                currentTime: currentTime,
                duration: duration,
                percentage: percentage,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        
        console.log(`✅ Đã lưu progress: ${movieId} - Tập ${episodeIndex + 1} - ${Math.round(currentTime)}s/${Math.round(duration)}s (${percentage}%)`);
        
        // ✅ CẬP NHẬT UI PROGRESS BAR NGAY LẬP TỨC
        if (typeof updateMovieProgressUI === 'function') {
            updateMovieProgressUI(movieId, percentage);
        }
        
        // ✅ CẬP NHẬT HISTORY
        if (currentUser && db && movieId && movieId !== "undefined") {
            const minutesWatched = Math.floor(currentTime / 60);
            db.collection("users").doc(currentUser.uid).collection("history").doc(movieId).set({
                movieId: movieId,
                lastEpisode: episodeIndex,
                lastMinutesWatched: minutesWatched,
                lastTimeWatched: currentTime,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastWatchedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true }).catch(err => console.error("Lỗi cập nhật history:", err));
        }
    } catch (error) {
        console.error("Lỗi lưu watch progress:", error);
    }
}

/**
 * Lưu thời gian xem NGAY LẬP TỨC (không debounce) - dùng cho pause, beforeunload
 */
async function saveWatchProgressImmediate(movieId, episodeIndex, currentTime, duration) {
    if (!currentUser || !db || !movieId || movieId.trim() === "") return;
    // Bỏ qua nếu thời gian bằng 0 để tránh vô tình reset lịch sử xem khi video vừa load
    if (currentTime === undefined || isNaN(currentTime) || currentTime <= 1 || duration === undefined || isNaN(duration) || duration <= 0) {
        return;
    }
    
    const percentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
    
    try {
        await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("watchProgress")
            .doc(movieId)
            .set({
                movieId: movieId,
                episodeIndex: episodeIndex,
                currentTime: currentTime,
                duration: duration,
                percentage: percentage,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        
        console.log(`✅ [IMMEDIATE] Đã lưu progress: ${movieId} - Tập ${episodeIndex + 1} - ${Math.round(currentTime)}s/${Math.round(duration)}s (${percentage}%)`);
        
        // ✅ CẬP NHẬT UI PROGRESS BAR NGAY LẬP TỨC
        if (typeof updateMovieProgressUI === 'function') {
            updateMovieProgressUI(movieId, percentage);
        }
        
        // ✅ CẬP NHẬT HISTORY
        if (currentUser && db && movieId && movieId !== "undefined") {
            const minutesWatched = Math.floor(currentTime / 60);
            await db.collection("users").doc(currentUser.uid).collection("history").doc(movieId).set({
                movieId: movieId,
                lastEpisode: episodeIndex,
                lastMinutesWatched: minutesWatched,
                lastTimeWatched: currentTime,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastWatchedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            console.log(`✅ [IMMEDIATE] Đã cập nhật history: ${movieId} - ${minutesWatched} phút`);
        }
    } catch (error) {
        console.error("Lỗi lưu watch progress immediate:", error);
    }
}

/**
 * Lấy thời gian xem đã lưu từ Firestore
 */
async function getWatchProgress(movieId) {
    if (!currentUser || !db || !movieId) return null;
    
    try {
        const doc = await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("watchProgress")
            .doc(movieId)
            .get();
        
        if (doc.exists) {
            const data = doc.data();
            console.log(`📺 Đã lấy progress: ${movieId} - ${data.percentage}% - Thời gian: ${data.currentTime}s`);
            return data;
        }
        return null;
    } catch (error) {
        console.error("Lỗi lấy watch progress:", error);
        return null;
    }
}

/**
 * Xóa thời gian xem (khi phim mới hoặc user xóa lịch sử)
 */
async function clearWatchProgress(movieId) {
    if (!currentUser || !db || !movieId) return;
    
    try {
        await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("watchProgress")
            .doc(movieId)
            .delete();
        console.log(`🗑️ Đã xóa progress: ${movieId}`);
    } catch (error) {
        console.error("Lỗi xóa watch progress:", error);
    }
}

function initCustomControls(video) {
    videoEl = video;
    const container = document.getElementById("videoContainer");
    let pendingResumeData = null; // Lưu data chờ resume
    
    // Update Duration
    video.addEventListener("loadedmetadata", async () => {
        document.getElementById("duration").textContent = formatTime(video.duration);
        document.getElementById("progressSlider").max = video.duration;
        
        // Đã chuyển sang hệ thống modal mới checkAndShowContinueWatchingModal
        // Không hiển thị modal cũ ở đây nữa
    });

    // ✅ CẬP NHẬT TIẾN TRÌNH (PROGRESS UPDATE)
    const updateCustomProgress = () => {
        if (isDragging) return;

        let current = 0;
        let total = 0;

        if (currentVideoType === 'youtube' && window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') {
            current = window.ytPlayer.getCurrentTime();
            total = window.ytPlayer.getDuration() || 0;
        } else if (video) {
            current = video.currentTime;
            total = video.duration || 0;
        }

        if (total > 0) {
            const progressSlider = document.getElementById("progressSlider");
            const progressBar = document.getElementById("progressBar");
            const currentTimeEl = document.getElementById("currentTime");
            const durationEl = document.getElementById("duration");

            if (progressSlider) {
                progressSlider.max = total;
                progressSlider.value = current;
            }
            if (progressBar) {
                const percent = (current / total) * 100;
                progressBar.style.width = percent + "%";
            }
            if (currentTimeEl) currentTimeEl.textContent = formatTime(current);
            if (durationEl) durationEl.textContent = formatTime(total);

            // Buffer bar (Chỉ cho HTML5)
            if (currentVideoType !== 'youtube' && video.buffered && video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const width = (bufferedEnd / total) * 100;
                const bufferBar = document.getElementById("bufferBar");
                if (bufferBar) bufferBar.style.width = `${width}%`;
            }

            // Save watch progress (debounced)
            if (currentMovieId) {
                saveWatchProgress(currentMovieId, currentEpisode, current, total);
                checkAutoNextCountdown(current, total);
            }
        }
    };

    // Khởi tạo Interval cho YouTube hoặc lắng nghe timeupdate cho HTML5
    if (currentVideoType === 'youtube') {
        if (window.customPlayerInterval) clearInterval(window.customPlayerInterval);
        window.customPlayerInterval = setInterval(updateCustomProgress, 1000);
    } else {
        video.addEventListener("timeupdate", updateCustomProgress);
    }

    // ✅ XỬ LÝ TUA PHIM (SEEKING)
    const slider = document.getElementById("progressSlider");
    if (slider) {
        slider.addEventListener("input", (e) => {
            isDragging = true;
            const time = parseFloat(e.target.value);
            const total = (currentVideoType === 'youtube' && window.ytPlayer) ? window.ytPlayer.getDuration() : video.duration;
            
            if (total > 0) {
                const percent = (time / total) * 100;
                document.getElementById("progressBar").style.width = `${percent}%`;
                document.getElementById("currentTime").textContent = formatTime(time);
            }
        });

        slider.addEventListener("change", (e) => {
            isDragging = false;
            const time = parseFloat(e.target.value);
            
            if (currentVideoType === 'youtube' && window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
                window.ytPlayer.seekTo(time, true);
            } else if (video) {
                video.currentTime = time;
            }
        });
    }

    // Handle Tooltip (Hover Progress)
    const progressContainer = document.getElementById("progressContainer");
    const tooltip = document.getElementById("progressTooltip");
    progressContainer.addEventListener("mousemove", (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const time = pos * video.duration;
        tooltip.style.left = `${e.clientX - rect.left}px`;
        tooltip.textContent = formatTime(time);
        tooltip.style.display = "block";
    });
    progressContainer.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });

    // Play/Pause Icon Update & Container State
    video.addEventListener("play", () => {
        updateDetailPlayButtonState("playing");
        container.classList.add("playing");
        container.classList.remove("paused");
    });
    video.addEventListener("pause", () => {
        updateDetailPlayButtonState("paused");
        container.classList.remove("playing");
        container.classList.add("paused");
        
        // Lưu progress ngay khi pause (KHÔNG debounce - lưu ngay lập tức)
        if (currentMovieId && video.duration > 0 && video.currentTime > 0) {
            saveWatchProgressImmediate(currentMovieId, currentEpisode, video.currentTime, video.duration);
        }
    });
    
    // Loading State
    video.addEventListener("waiting", () => updateDetailPlayButtonState("loading"));
    video.addEventListener("playing", () => updateDetailPlayButtonState("playing"));
    video.addEventListener("canplay", () => {
        if (video.paused) updateDetailPlayButtonState("paused");
        else updateDetailPlayButtonState("playing");
    });
    video.addEventListener("ended", () => {
        updateDetailPlayButtonState("paused");
        // Tự động chuyển tập nếu đang bật switch
        handleAutoNext();
    });

    // Volume Slider
    const volSlider = document.getElementById("volumeSlider");
    volSlider.addEventListener("input", (e) => {
        video.volume = e.target.value;
        updateVolumeIcon(video.volume);
    });

    // Show/Hide Controls on Hover/Activity
    container.addEventListener("mousemove", () => {
        showControls();
        resetHideTimer();
    });
    
    // Click anywhere on video container to toggle play (except on control buttons)
    container.addEventListener("click", (e) => {
        console.log("Video container clicked", { videoEl, target: e.target, classList: e.target.classList });
        
        // Don't toggle if clicking on control buttons or settings or center buttons
        const isControlBtn = e.target.closest('.control-btn');
        const isSettingsMenu = e.target.closest('.settings-menu');
        const isProgressContainer = e.target.closest('.video-progress-container');
        const isReactionSidebar = e.target.closest('.reaction-sidebar');
        const isEpisodePanel = e.target.closest('.player-episode-panel');
        const isCenterBtn = e.target.closest('.center-btn');
        
        // If clicking center button, reaction sidebar, or episode panel, let their own handlers work
        if (isCenterBtn || isReactionSidebar || isEpisodePanel) {
            console.log("Click on UI element, not toggling from container");
            return;
        }
        
        // Hiện controls và đặt timer ẩn sau 5s (cho cả PC và Mobile)
        showControls();
        resetHideTimer();
        
        if (!isControlBtn && !isSettingsMenu && !isProgressContainer) {
            // THEO YÊU CẦU: Chỉ cho phép chạm vào màn hình để play/pause KHI ĐANG KHÓA.
            // Khi không khóa, chạm vào màn hình chỉ để hiện controls.
            if (container.classList.contains("screen-locked")) {
                console.log("Calling togglePlay from container click (Screen Locked)");
                if (typeof togglePlay === 'function') togglePlay();
                else if (window.togglePlay) window.togglePlay();
            }
        }
    });
    
    // Touch listener cho Mobile - hiện controls khi chạm, ẩn sau 5s
    container.addEventListener("touchstart", (e) => {
        // Không xử lý nếu chạm vào nút điều khiển
        const isControlArea = e.target.closest('.control-btn') || 
                              e.target.closest('.settings-menu') || 
                              e.target.closest('.video-progress-container') ||
                              e.target.closest('.center-btn');
        if (isControlArea) return;
        
        showControls();
        resetHideTimer();
    }, { passive: true });
    
    // Save progress when leaving page (IMMEDIATE - không debounce)
    window.addEventListener("beforeunload", () => {
        if (currentMovieId && video.duration > 0 && video.currentTime > 0) {
            saveWatchProgressImmediate(currentMovieId, currentEpisode, video.currentTime, video.duration);
        }
    });
    
    // Khi video bắt đầu play → khởi tạo timer ẩn controls ngay
    video.addEventListener("play", () => {
        resetHideTimer();
    });
    
    // --- NGĂN CHẶN SAFARI URL BAR KHI CHẠM VÀO CONTROLS ---
    // Safari trên iOS tự động hiện thanh URL khi chạm vào mép trên/dưới.
    // Dùng preventDefault() trên các thanh công cụ để ngăn chặn hành vi này, 
    // trong khi vẫn cho phép click vào các nút bên trong hoạt động bình thường.
    function preventSafariUIRedraw(e) {
        // Chỉ áp dụng khi đang ở chế độ pseudo-fullscreen nằm ngang
        if (container.classList.contains("pseudo-fullscreen")) {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            
            // Nếu chạm vào thẻ input (ví dụ thanh tiến trình), để mặc định
            if (tagName === 'input') return;
            // BỎ QUA không chặn các phần tử có tương tác (nút bấm, link, thẻ input)
            let curr = target;
            let isInteractive = false;
            while (curr && curr !== e.currentTarget && curr !== document.body) {
                const tag = curr.tagName ? curr.tagName.toLowerCase() : '';
                if (
                    tag === 'button' || 
                    tag === 'a' || 
                    tag === 'input' ||
                    (curr.classList && (
                        curr.classList.contains('control-btn') ||
                        curr.classList.contains('episode-btn') ||
                        curr.classList.contains('settings-item') ||
                        curr.classList.contains('submenu-item') ||
                        curr.classList.contains('submenu-header') ||
                        curr.classList.contains('video-progress-container') ||
                        curr.classList.contains('ep-panel-item') ||
                        curr.classList.contains('episode-panel-close')
                    ))
                ) {
                    isInteractive = true;
                    break;
                }
                curr = curr.parentNode;
            }

            if (isInteractive) {
                return; // Cho phép trình duyệt tạo sự kiện click
            }

            // Chỉ chặn hành vi mặc định khi chạm vào khoảng trống/viền đen của thanh công cụ
            e.preventDefault(); 
        }
    }

    const topBar = document.getElementById("playerTopBar");
    const bottomControls = document.getElementById("customControls");
    const epPanel = document.getElementById("playerEpisodePanel");
    const reactionSidebar = document.getElementById("reactionSidebar");

    if (topBar) topBar.addEventListener("touchstart", preventSafariUIRedraw, { passive: false });
    if (bottomControls) bottomControls.addEventListener("touchstart", preventSafariUIRedraw, { passive: false });
    if (epPanel) epPanel.addEventListener("touchstart", preventSafariUIRedraw, { passive: false });
    if (reactionSidebar) reactionSidebar.addEventListener("touchstart", preventSafariUIRedraw, { passive: false });
    
    // Set initial state
    container.classList.add("paused");
    console.log("Custom controls initialized for video:", video);
}

function showControls() {
    const container = document.getElementById("videoContainer");
    if (container) {
        container.classList.remove("user-inactive");
        container.classList.remove("hide-cursor");
    }

    const controls = document.getElementById("customControls");
    const centerOverlay = document.getElementById("centerOverlay");
    const topBar = document.getElementById("playerTopBar");
    
    if(controls) controls.classList.add("show");
    if(centerOverlay) centerOverlay.style.opacity = "1";
    if(topBar) topBar.classList.add("show");

    // Nút khóa màn hình cũng hiện/ẩn cùng controls
    const lockBtn = document.getElementById("screenLockBtn");
    if (lockBtn) lockBtn.classList.add("show");
}

function hideControls() {
    const container = document.getElementById("videoContainer");
    
    // Không ẩn nếu settings menu đang mở hoặc episode panel đang mở
    const settingsMenu = document.getElementById("settingsMenu");
    const episodePanel = document.getElementById("playerEpisodePanel");
    
    // Kiểm tra menu cài đặt bằng class 'active' (đúng với logic toggle)
    const isSettingsActive = settingsMenu && settingsMenu.classList.contains('active');
    
    if (episodePanel && episodePanel.classList.contains('open')) return;
    if (isSettingsActive) return;

    if (container) {
        container.classList.add("user-inactive");
        container.classList.add("hide-cursor");
    }

    const controls = document.getElementById("customControls");
    const centerOverlay = document.getElementById("centerOverlay");
    const topBar = document.getElementById("playerTopBar");
    
    if (controls) controls.classList.remove("show");
    if (centerOverlay) centerOverlay.style.opacity = "0";
    if (topBar) topBar.classList.remove("show");

    // Nút khóa màn hình cũng ẩn cùng controls
    const lockBtn = document.getElementById("screenLockBtn");
    if (lockBtn) lockBtn.classList.remove("show");
}

function resetHideTimer() {
    clearTimeout(hideControlsTimeout);
    hideControlsTimeout = setTimeout(() => {
        // Kiểm tra xem video có đang phát không (Hỗ trợ cả HTML5 và YouTube)
        let isPaused = true;
        
        if (videoEl && !videoEl.paused) {
            isPaused = false;
        } else if (window.ytPlayer && typeof window.ytPlayer.getPlayerState === 'function') {
            // state 1 là đang phát (playing)
            if (window.ytPlayer.getPlayerState() === 1) isPaused = false;
        }
        
        if (!isPaused) hideControls();
    }, 5000); // Giữ nguyên 5 giây theo yêu cầu
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
}

// Update Play/Pause/Loading Icons
function updateDetailPlayButtonState(state) {
    const bottomIcon = document.querySelector("#playPauseBtn i");
    const centerIcon = document.querySelector("#centerOverlay .play-btn-large i");
    
    if (state === "loading") {
        if(bottomIcon) bottomIcon.className = "fas fa-spinner wp-spinner";
        if(centerIcon) centerIcon.className = "fas fa-spinner wp-spinner";
    } else if (state === "playing") {
        if(bottomIcon) bottomIcon.className = "fas fa-pause";
        if(centerIcon) centerIcon.className = "fas fa-pause";
    } else {
        // Paused or default
        if(bottomIcon) bottomIcon.className = "fas fa-play";
        if(centerIcon) centerIcon.className = "fas fa-play";
    }
}

function updatePlayIcons(isPlaying) {
   updateDetailPlayButtonState(isPlaying ? "playing" : "paused");
}
// Remove old updatePlayIcon function if exists custom logic


// --- EXPORTED FUNCTIONS (Attached to HTML) ---
window.togglePlay = function() {
    let video = videoEl;
    
    // Hỗ trợ trình phát YouTube
    if (currentVideoType === "youtube") {
        if (window.ytPlayer && typeof window.ytPlayer.getPlayerState === 'function') {
            const state = window.ytPlayer.getPlayerState();
            if (state === 1) { // 1 là playing
                window.ytPlayer.pauseVideo();
            } else {
                window.ytPlayer.playVideo();
            }
            return;
        }
    }
    
    // Hỗ trợ trình phát HTML5 (HLS/MP4)
    if (!video) {
        video = document.getElementById("html5Player");
    }
    
    if (!video) {
        console.error("No video element found!");
        return;
    }
    
    console.log("Toggling play, video:", video, "paused:", video.paused);
    
    if (video.paused) {
        video.play().catch(e => console.error("Play error:", e));
    } else {
        video.pause();
    }
};

// --- RESUME WATCH MODAL FUNCTIONS ---
let pendingResumeData = null;

function showResumeModal(progress) {
    const modal = document.getElementById("resumeWatchModal");
    if (!modal) return;
    
    // Tính lại percentage nếu không có
    const percentage = progress.percentage || (progress.duration > 0 ? Math.round((progress.currentTime / progress.duration) * 100) : 0);
    
    // Cập nhật thông tin
    document.getElementById("resumeWatchTime").textContent = formatTime(progress.currentTime);
    document.getElementById("resumeWatchPercent").textContent = percentage + "%";
    
    // Lưu data để xử lý khi user chọn
    pendingResumeData = { ...progress, percentage };
    
    // Hiển modal
    openModal("resumeWatchModal");
}

function closeResumeModal() {
    // Đóng cả modal cũ và modal mới
    closeModal("resumeWatchModal");
    closeModal("continueWatchingModal");
    pendingResumeData = null;
}

/**
 * Đóng modal tiếp tục xem
 */
function closeContinueWatchingModal() {
    closeModal("continueWatchingModal");
}

window.handleResumeChoice = function(continueWatching) {
    // Ẩn modal
    closeResumeModal();
    
    if (continueWatching && pendingResumeData && pendingResumeData.currentTime > 0) {
        // Tiếp tục từ vị trí đã lưu - sử dụng hàm resumeVideoAtTime
        resumeVideoAtTime(pendingResumeData.currentTime);
    } else {
        // Xem từ đầu - xóa progress đã lưu và phát lại từ đầu
        if (currentMovieId) {
            clearWatchProgress(currentMovieId);
            console.log("🗑️ Đã xóa progress, xem từ đầu");
        }
        
        // Reset video về 0 và phát lại từ đầu
        const video = document.getElementById("html5Player");
        if (video) {
            video.currentTime = 0;
            video.play().catch(e => console.error("Play error:", e));
            console.log("✅ Xem từ đầu - reset về 0 giây");
        }
    }
    
    // Reset
    pendingResumeData = null;
};

window.skipTime = function(seconds) {
    let video = videoEl;
    if (!video) {
        video = document.getElementById("html5Player");
    }
    if (!video) return;
    video.currentTime += seconds;
};

window.toggleMute = function() {
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    updateVolumeIcon(videoEl.muted ? 0 : videoEl.volume);
    document.getElementById("volumeSlider").value = videoEl.muted ? 0 : videoEl.volume;
};

function updateVolumeIcon(vol) {
    const icon = document.querySelector("#volumeBtn i");
    if (vol == 0) icon.className = "fas fa-volume-mute";
    else if (vol < 0.5) icon.className = "fas fa-volume-down";
    else icon.className = "fas fa-volume-up";
}

// Settings Menu
window.toggleSettingsMenu = function() {
    const menu = document.getElementById("settingsMenu");
    const speedMenu = document.getElementById("speedMenu");
    const qualityMenu = document.getElementById("qualityMenu");
    if (menu.style.display === "flex") {
        menu.style.display = "none";
        speedMenu.style.display = "none";
        if (qualityMenu) qualityMenu.style.display = "none";
    } else {
        menu.style.display = "flex";
    }
};

// --- SUBTITLE & SETTINGS LOGIC ---
const SUBTITLE_COLORS = {
    white: "#ffffff",
    yellow: "#ffeb3b",
    cyan: "#00ffff",
    green: "#4caf50"
};

function initSubtitleTracks(video) {
    const subtitleMenu = document.getElementById("subtitleMenu");
    if (!subtitleMenu) return; // Add menu structure later if needed
    // ... Implement fetch tracks logic or use textTracks API
}

window.showSubMenu = function(type) {
    document.getElementById("settingsMenu").style.display = "none";
    if (type === 'speed') {
        document.getElementById("speedMenu").style.display = "flex";
    } else if (type === 'color') {
        document.getElementById("colorMenu").style.display = "flex";
    } else if (type === 'quality') {
        document.getElementById("qualityMenu").style.display = "flex";
    }
};

window.hideSubMenu = function() {
    document.getElementById("speedMenu").style.display = "none";
    const colorMenu = document.getElementById("colorMenu");
    if (colorMenu) colorMenu.style.display = "none";
    const qualityMenu = document.getElementById("qualityMenu");
    if (qualityMenu) qualityMenu.style.display = "none";
    document.getElementById("settingsMenu").style.display = "flex";
};

// --- HLS QUALITY LOGIC ---
function populateQualityMenu(hls) {
    const qualityMenu = document.getElementById("qualityMenu");
    const qualityItem = document.getElementById("qualitySettingsItem");
    if (!qualityMenu || !hls || !hls.levels || hls.levels.length <= 1) return;

    // Show quality item in settings
    if (qualityItem) qualityItem.style.display = "flex";

    // Remove old dynamic items (keep header and auto)
    const existing = qualityMenu.querySelectorAll(".submenu-item:not([data-level='-1'])");
    existing.forEach(el => el.remove());

    // Sort levels by height (resolution) ascending
    const levels = hls.levels.map((level, index) => ({
        index: index,
        height: level.height,
        bitrate: level.bitrate
    })).sort((a, b) => a.height - b.height);

    // Add level options
    levels.forEach(level => {
        const item = document.createElement("div");
        item.className = "submenu-item";
        item.dataset.level = level.index;
        item.onclick = () => setQuality(level.index);

        const label = `${level.height}p`;
        const bitrate = Math.round(level.bitrate / 1000);
        item.innerHTML = `${label} <span class="quality-bitrate">${bitrate} kbps</span>`;
        qualityMenu.appendChild(item);
    });
}

function updateQualityDisplay(levelIndex) {
    const hls = window.hlsInstance;
    if (!hls) return;
    const label = document.getElementById("currentQualityVal");
    if (!label) return;

    if (hls.autoLevelEnabled || levelIndex === -1) {
        const currentLevel = hls.levels[hls.currentLevel];
        const h = currentLevel ? currentLevel.height : '?';
        label.textContent = `Tự động (${h}p)`;
    } else {
        const level = hls.levels[levelIndex];
        label.textContent = level ? `${level.height}p` : 'N/A';
    }

    // Update active class
    const qualityMenu = document.getElementById("qualityMenu");
    if (qualityMenu) {
        qualityMenu.querySelectorAll(".submenu-item").forEach(item => {
            item.classList.remove("active");
            const itemLevel = parseInt(item.dataset.level);
            if (hls.autoLevelEnabled && itemLevel === -1) {
                item.classList.add("active");
            } else if (!hls.autoLevelEnabled && itemLevel === levelIndex) {
                item.classList.add("active");
            }
        });
    }
}

window.setQuality = function(levelIndex) {
    const hls = window.hlsInstance;
    if (!hls) {
        showNotification("Chỉ hỗ trợ chọn chất lượng cho video HLS!", "warning");
        return;
    }

    hls.currentLevel = levelIndex; // -1 = auto
    
    updateQualityDisplay(levelIndex);
    window.hideSubMenu();
    window.toggleSettingsMenu();
};

window.setSubtitleColor = function(colorKey) {
    const video = document.getElementById("html5Player");
    const color = SUBTITLE_COLORS[colorKey];
    
    // Create or update dynamic style for cues
    let style = document.getElementById("custom-cue-style");
    if (!style) {
        style = document.createElement("style");
        style.id = "custom-cue-style";
        document.head.appendChild(style);
    }
    
    // Webkit specific for Chrome/Safari
    style.innerHTML = `
        video::cue {
            color: ${color} !important;
            background: rgba(0, 0, 0, 0.5) !important;
        }
    `;
    
    // Update active UI
    document.querySelectorAll("#colorMenu .submenu-item").forEach(item => {
        item.classList.remove("active");
        if(item.dataset.color === colorKey) item.classList.add("active");
    });
    
    document.getElementById("currentColorVal").textContent = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
    
    window.hideSubMenu();
    window.toggleSettingsMenu();
};

window.setSpeed = function(speed) {
    if (!videoEl) return;
    videoEl.playbackRate = speed;
    document.getElementById("currentSpeedVal").textContent = speed === 1 ? "Chuẩn" : `${speed}x`;
    
    // Update active class
    document.querySelectorAll("#speedMenu .submenu-item").forEach(item => {
        item.classList.remove("active");
        if (item.textContent.includes(speed.toString()) || (speed === 1 && item.textContent === "Chuẩn")) {
            item.classList.add("active");
        }
    });
    
    window.hideSubMenu();
    window.toggleSettingsMenu(); // Close all
};

window.togglePiP = async function() {
    if (!videoEl) return;
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await videoEl.requestPictureInPicture();
        }
    } catch (error) {
        console.error("PiP error:", error);
        showNotification("Trình duyệt không hỗ trợ PiP!", "error");
    }
};

/**
 * Bật/Tắt Toàn màn hình (Hỗ trợ cả PC, Mobile, Tablet)
 * Dùng Fullscreen API chuẩn + webkit fallback cho Safari
 */
window.toggleFullscreen = function() {
    const container = document.getElementById("videoContainer");
    const icon = document.querySelector("#fullscreenBtn i");
    if (!container) return;

    // Nhận diện iOS tinh vi hơn (bao gồm iPad hiển thị như Desktop Mac)
    const isIOS = [
      'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
      'iPad', 'iPhone', 'iPod'
    ].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    // Trạng thái hiện tại
    const isNativeFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    const isPseudoFullscreen = container.classList.contains("pseudo-fullscreen");

    if (!isNativeFullscreen && !isPseudoFullscreen) {
        // VÀO FULLSCREEN
        if (isIOS || (!container.requestFullscreen && !container.webkitRequestFullscreen)) {
            // Giả lập toàn màn hình cho iOS (giữ nguyên danh sách tập + tên phim)
            container.classList.add("pseudo-fullscreen");
            document.documentElement.classList.add("has-pseudo-fullscreen");
            document.body.classList.add("has-pseudo-fullscreen");
            if (icon) icon.className = "fas fa-compress";
            return;
        }

        // Native cho Android/Desktop PC
        if (container.requestFullscreen) {
            container.requestFullscreen().catch(err => {
                console.warn("Fullscreen API error:", err);
                // Fallback nếu lỗi (điển hình là Chrome/Safari rườm rà)
                container.classList.add("pseudo-fullscreen");
                document.documentElement.classList.add("has-pseudo-fullscreen");
                document.body.classList.add("has-pseudo-fullscreen");
                if (icon) icon.className = "fas fa-compress";
            });

        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen(); 
        }
        if (icon) icon.className = "fas fa-compress";
    } else {
        // THOÁT FULLSCREEN
        // Nếu đang khóa màn hình, không cho thoát
        if (container.classList.contains("screen-locked")) {
            return;
        }
        if (isPseudoFullscreen) {
            // Gỡ khóa màn hình nếu đang bật
            if (container.classList.contains("screen-locked")) {
                container.classList.remove("screen-locked");
                document.removeEventListener("touchmove", _blockTouch);
                document.removeEventListener("touchstart", _blockTouch);
                document.documentElement.style.overflow = "";
                document.body.style.overflow = "";
                document.body.style.position = "";
                document.body.style.width = "";
                document.body.style.height = "";
                const lockBtn = document.getElementById("screenLockBtn");
                if (lockBtn) {
                    const li = lockBtn.querySelector("i");
                    if (li) li.className = "fas fa-lock-open";
                }
            }
            container.classList.remove("pseudo-fullscreen");
            document.documentElement.classList.remove("has-pseudo-fullscreen");
            document.body.classList.remove("has-pseudo-fullscreen");
            if (icon) icon.className = "fas fa-expand";
            return;
        }

        if (document.exitFullscreen) {
            document.exitFullscreen().catch(e => console.log("Exit fullscreen:", e));
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        if (icon) icon.className = "fas fa-expand";
    }
};

// Lắng nghe phím ESC để thoát giả lập (nếu có dùng trên Desktop)
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        const container = document.getElementById("videoContainer");
        if (!container) return;
        // Nếu đang khóa màn hình, chặn ESC
        if (container.classList.contains("screen-locked")) return;
        const icon = document.querySelector("#fullscreenBtn i");
        if (container.classList.contains("pseudo-fullscreen")) {
            container.classList.remove("pseudo-fullscreen");
            document.documentElement.classList.remove("has-pseudo-fullscreen");
            document.body.classList.remove("has-pseudo-fullscreen");
            if (icon) icon.className = "fas fa-expand";
        }
    }
});

/**
 * Bật/Tắt khóa màn hình trong pseudo-fullscreen
 * Khi khóa: ẩn hết controls, chỉ giữ nút mở khóa
 * Ngăn chặn việc vô tình thoát fullscreen khi xem phim
 * Chặn touch event để trình duyệt không thể kéo thanh URL xuống
 */

// Hàm chặn touch di chuyển và chạm (ngăn cuộn trang -> ngăn thanh URL hiện)
function _blockTouch(e) {
    // Cho phép chạm vào nút khóa
    if (e.target.closest) {
        if (e.target.closest('#screenLockBtn')) return;
        
        // Nút danh sách tập: xử lý bằng touchstart trên mobile để nhạy hơn và chặn togglePlay
        const isEpisodeBtn = e.target.closest('#episodeListBtn');
        if (isEpisodeBtn) {
            if (e.type === 'touchstart') {
                if (typeof toggleEpisodePanel === 'function') {
                    toggleEpisodePanel();
                } else if (window.toggleEpisodePanel) {
                    window.toggleEpisodePanel();
                }
            }
            e.stopPropagation();
            e.preventDefault();
            return;
        }
        
        // Cho phép tương tác bên trong bảng chọn tập luôn
        if (e.target.closest('.player-episode-panel')) return;
        // Cho phép tương tác bên trong menu cài đặt
        if (e.target.closest('.settings-menu')) return;
        
        // Ngăn play/pause nếu vô tình chạm vào top bar hoặc các nút UI khác
        if (e.target.closest('.player-top-bar')) return;
    }
    
    // Nếu chạm vào màn hình đen hoặc video (không trúng các phần tử trên),
    // THEO YÊU CẦU: cho phép play/pause khi khóa màn hình bằng cách gọi luôn hàm
    // Chú ý: Chỉ phát/dừng khi chạm 1 ngón tay (không phải pinch-to-zoom)
    if (e.type === 'touchstart' && e.touches && e.touches.length === 1) {
        console.log("Tap to play/pause in locked mode");
        if (typeof togglePlay === 'function') togglePlay();
        else if (window.togglePlay) window.togglePlay();
    }
    
    e.preventDefault();
    e.stopPropagation();
}

window.toggleScreenLock = function() {
    const container = document.getElementById("videoContainer");
    const lockBtn = document.getElementById("screenLockBtn");
    if (!container || !lockBtn) return;

    const isLocked = container.classList.toggle("screen-locked");
    const lockIcon = lockBtn.querySelector("i");

    if (isLocked) {
        // Đã khóa - chặn mọi thao tác vuốt trên toàn bộ document
        if (lockIcon) lockIcon.className = "fas fa-lock";
        lockBtn.title = "Mở khóa màn hình";
        document.addEventListener("touchmove", _blockTouch, { passive: false });
        document.addEventListener("touchstart", _blockTouch, { passive: false });
        // Thêm khóa overflow cứng cho cả html
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
    } else {
        // Đã mở khóa - tháo chặn
        if (lockIcon) lockIcon.className = "fas fa-lock-open";
        lockBtn.title = "Khóa màn hình";
        document.removeEventListener("touchmove", _blockTouch);
        document.removeEventListener("touchstart", _blockTouch);
        // Khôi phục lại overflow cho body (vẫn giữ lại has-pseudo-fullscreen nếu đang fullscreen)
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.style.height = "";
    }
};

/**
 * PINCH-TO-FILL: Dùng 2 ngón tay để lắp đầy màn hình
 * Pinch ra xa (zoom out) → object-fit: cover (lắp đầy, cắt rìa)
 * Pinch vào trong (zoom in) → object-fit: contain (vừa vặn, có viền đen)
 */
(function() {
    let initialPinchDistance = 0;
    let isPinching = false;

    // Tính khoảng cách giữa 2 ngón tay
    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    document.addEventListener("touchstart", function(e) {
        if (e.touches.length !== 2) return;
        const container = document.getElementById("videoContainer");
        if (!container || !container.classList.contains("pseudo-fullscreen")) return;

        isPinching = true;
        initialPinchDistance = getPinchDistance(e.touches);
    }, { passive: true });

    document.addEventListener("touchmove", function(e) {
        if (!isPinching || e.touches.length !== 2) return;
        // Không preventDefault ở đây vì đã dùng passive: true
    }, { passive: true });

    document.addEventListener("touchend", function(e) {
        if (!isPinching) return;
        isPinching = false;

        const container = document.getElementById("videoContainer");
        if (!container || !container.classList.contains("pseudo-fullscreen")) return;

        // Nếu chỉ còn 1 ngón hoặc hết ngón → tính kết quả pinch
        // Lấy khoảng cách cuối cùng từ event trước đó
        if (e.changedTouches.length >= 1 && initialPinchDistance > 0) {
            // Tạm tính: nếu touchend thì dùng hướng ngược lại
            // Dùng cách đơn giản hơn: toggle khi phát hiện pinch 2 ngón
            container.classList.toggle("video-fill");
            
            // Hiện thông báo cho user biết
            const isFill = container.classList.contains("video-fill");
            if (typeof showNotification === "function") {
                showNotification(
                    isFill ? "📐 Lắp đầy màn hình" : "📐 Vừa vặn màn hình",
                    "info"
                );
            }
        }
        initialPinchDistance = 0;
    }, { passive: true });
})();

// Lắng nghe sự kiện fullscreenchange để đồng bộ icon
document.addEventListener("fullscreenchange", function() {
    const icon = document.querySelector("#fullscreenBtn i");
    if (icon) {
        icon.className = document.fullscreenElement ? "fas fa-compress" : "fas fa-expand";
    }
});
document.addEventListener("webkitfullscreenchange", function() {
    const icon = document.querySelector("#fullscreenBtn i");
    if (icon) {
        icon.className = document.webkitFullscreenElement ? "fas fa-compress" : "fas fa-expand";
    }
});

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

  // Kiểm tra phim miễn phí
  if (!movie.price || movie.price === 0) {
    showNotification("Phim này miễn phí! Không cần mua vé.", "info");
    checkAndUpdateVideoAccess();
    return;
  }

  // Hiển thị thông báo đang xử lý
  showNotification("Đang kết nối ví MetaMask...", "info");

  // Thực hiện thanh toán - payWithCRO sẽ tự động kết nối ví nếu chưa kết nối
  try {
    const txHash = await payWithCRO(movie.price, currentMovieId, movie.title);

    if (txHash) {
      // Thanh toán thành công - mở khóa video
      await checkAndUpdateVideoAccess();
    } else {
      // Thanh toán thất bại hoặc bị hủy
      showNotification("Thanh toán thất bại hoặc bị hủy. Vui lòng thử lại!", "warning");
    }
  } catch (error) {
    console.error("Lỗi thanh toán:", error);
    showNotification("Đã xảy ra lỗi khi thanh toán. Vui lòng thử lại!", "error");
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
                <div class="comment-actions">
                    <div class="comment-time">${timeDisplay}</div>
                    
                    <div class="comment-reaction-container">
                        <div class="reaction-picker" id="picker-${comment.id}">
                            <span class="reaction-emoji-item" onclick="toggleCommentReaction('${comment.id}', 'like', currentMovieId, 'commentsList')">👍</span>
                            <span class="reaction-emoji-item" onclick="toggleCommentReaction('${comment.id}', 'heart', currentMovieId, 'commentsList')">❤️</span>
                            <span class="reaction-emoji-item" onclick="toggleCommentReaction('${comment.id}', 'haha', currentMovieId, 'commentsList')">😂</span>
                            <span class="reaction-emoji-item" onclick="toggleCommentReaction('${comment.id}', 'wow', currentMovieId, 'commentsList')">😮</span>
                            <span class="reaction-emoji-item" onclick="toggleCommentReaction('${comment.id}', 'sad', currentMovieId, 'commentsList')">😢</span>
                            <span class="reaction-emoji-item" onclick="toggleCommentReaction('${comment.id}', 'angry', currentMovieId, 'commentsList')">😡</span>
                        </div>
                        <button class="btn-reaction-trigger ${((currentUser && comment.reactions && comment.reactions[currentUser.uid]) ? 'active' : '')}" 
                                onclick="toggleReactionPicker('${comment.id}')">
                            <i class="far fa-thumbs-up"></i> Thích
                        </button>
                    </div>

                    ${renderReactionSummaryHtml(comment.id, comment.reactionSummary)}

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
  if (!await customConfirm("Bạn có chắc muốn xóa bình luận này?", { title: "Xóa bình luận", type: "danger", confirmText: "Xóa" })) return;

  if (!db) return;

  try {
    await db.collection("comments").doc(commentId).delete();

    // Remove from DOM
    const commentEl = document.getElementById(`comment-${commentId}`);
    if (commentEl) {
      commentEl.remove();
      showNotification("Đã xóa bình luận", "success");
    }
  } catch (error) {
    console.error("Lỗi xóa comment:", error);
    showNotification("Lỗi xóa bình luận", "error");
  }
}

// --- GLOBAL FUNCTIONS FOR HTML5 CONTROLS ---


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

// ============================================
// WATCH HISTORY & NAVIGATION HANDLING
// ============================================

/**
 * Dừng video và lưu lịch sử khi rời khỏi trang chiếu phim
 */
async function handleMoviePageExit() {
    // Xóa class chế độ rạp phim khi rời trang (áp dụng cho mọi trường hợp)
    document.body.classList.remove("cinema-mode", "controls-visible");
    
    // Reset các nút switch về trạng thái mặc định
    const switches = ["swCinemaMode", "swReaction", "swStrange", "swNextEpisode", "swAntiLe"];
    switches.forEach(id => {
        const sw = document.getElementById(id);
        if (sw) {
            if (id === "swNextEpisode" || id === "swAntiLe") {
                sw.classList.remove("off");
                sw.classList.add("on");
                sw.textContent = "ON";
            } else {
                sw.classList.remove("on");
                sw.classList.add("off");
                sw.textContent = "OFF";
            }
        }
    });

    if (!currentMovieId || !currentUser) {
        stopVideo();
        return;
    }
    
    // Lấy thời gian hiện tại của video
    const currentVideoTime = getCurrentVideoTime();
    const currentVideoDuration = getCurrentVideoDuration();
    
    // Chỉ lưu nếu đã xem > 10 giây
    if (currentVideoTime > 10 && currentVideoDuration > 0) {
        // Lưu progress NGAY (không debounce)
        await saveWatchProgressImmediate(currentMovieId, currentEpisode, currentVideoTime, currentVideoDuration);
        
        // Cập nhật lịch sử với thời gian đã xem - LƯU LUÔN không cần kiểm tra phút
        await updateWatchHistoryWithTime(currentMovieId, currentEpisode, currentVideoTime);
        
        console.log(`📤 Đã lưu lịch sử khi rời đi: ${Math.floor(currentVideoTime / 60)} phút (${Math.round(currentVideoTime)} giây)`);
    }
    
    // Dừng video
    stopVideo();
}

/**
 * Lấy thời gian hiện tại của video đang chơi
 */
function getCurrentVideoTime() {
    // Kiểm tra YouTube player
    const iframePlayer = document.getElementById("videoPlayer");
    if (iframePlayer && iframePlayer.src && iframePlayer.src.includes('youtube.com/embed')) {
        // YouTube player - cần tracking riêng
        // Lưu ý: YouTube embed không dùng IFrame API nên không lấy được currentTime
        // Giải pháp: parse từ URL hoặc dùng default
        return window.currentVideoTime || 0;
    }
    
    // Kiểm tra HTML5 player - lấy thời gian bất kể video đang chơi hay dừng
    const html5Player = document.getElementById("html5Player");
    if (html5Player) {
        // Lấy thời gian hiện tại của video (không cần kiểm tra paused)
        const currentTime = html5Player.currentTime || 0;
        console.log("📍 HTML5 currentTime:", currentTime, "paused:", html5Player.paused);
        return currentTime;
    }
    
    return 0;
}

/**
 * Lấy tổng thời lượng video
 */
function getCurrentVideoDuration() {
    const html5Player = document.getElementById("html5Player");
    if (html5Player) {
        return html5Player.duration || 0;
    }
    return 0;
}

/**
 * Dừng video đang chơi
 */
function stopVideo() {
    // Dừng HTML5 player
    const html5Player = document.getElementById("html5Player");
    if (html5Player) {
        html5Player.pause();
    }
    
    // Dừng YouTube player (nếu có)
    if (window.ytPlayer && typeof window.ytPlayer.pauseVideo === 'function') {
        try {
            window.ytPlayer.pauseVideo();
        } catch(e) {}
    }
    
    // Clear Iframe src to completely stop background logic for embed types
    const iframePlayer = document.getElementById("videoPlayer");
    if (iframePlayer) {
        iframePlayer.src = "";
    }
    
    console.log("⏹️ Video đã dừng");
}

/**
 * Cập nhật lịch sử xem với thời gian đã xem (phút)
 */
async function updateWatchHistoryWithTime(movieId, episodeIndex, currentTime) {
    if (!currentUser || !db || !movieId) return;
    
    const minutesWatched = Math.floor(currentTime / 60);
    const percentage = Math.round((currentTime / 60) * 100); // Ước tính dựa trên 60 phút
    
    try {
        await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("history")
            .doc(movieId)
            .set({
                movieId: movieId,
                lastEpisode: episodeIndex,
                lastMinutesWatched: minutesWatched,
                lastTimeWatched: currentTime,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastWatchedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        
        console.log(`✅ Đã cập nhật lịch sử: ${movieId} - Tập ${episodeIndex + 1} - ${minutesWatched} phút`);
        
        // ✅ CẬP NHẬT UI PROGRESS BAR NGAY LẬP TỨC
        if (typeof updateMovieProgressUI === 'function') {
            updateMovieProgressUI(movieId, percentage);
        }
    } catch (error) {
        console.error("Lỗi cập nhật lịch sử:", error);
    }
}

/**
 * Kiểm tra và hiển thị modal hỏi xem tiếp khi vào trang phim
 * Chỉ hiện modal khi có lịch sử xem > 0
 * Returns: true nếu có history và đã hiển thị modal
 * NOTE: Chỉ hoạt động với video m3u8 và mp4, không hoạt động với YouTube
 */
async function checkAndShowContinueWatchingModal() {
    if (!currentUser || !currentMovieId || !db) return;
    
    // Kiểm tra nếu đã kiểm tra rồi thì bỏ qua
    if (window.hasCheckedResumeHistory) {
        console.log("⚠️ Đã kiểm tra lịch sử rồi, bỏ qua...");
        return;
    }
    window.hasCheckedResumeHistory = true;
    
    // Biến toàn cục để track có cần resume không
    window.hasResumeHistory = false;
    window.resumeTimeData = null;
    
    try {
        const doc = await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("history")
            .doc(currentMovieId)
            .get();
        
        if (doc.exists) {
            const data = doc.data();
            const minutesWatched = data.lastMinutesWatched || 0;
            const lastEpisode = data.lastEpisode || 0;
            const lastTimeWatched = data.lastTimeWatched || 0;
            
            // ✅ SỬA: Ưu tiên dùng resumeFromTime nếu có (từ click lịch sử)
            let timeToResume = 0;
            let resumeEpisode = lastEpisode;
            if (window.resumeFromTime && window.resumeFromTime > 0) {
                // Click từ lịch sử - dùng thời gian được truyền vào
                timeToResume = window.resumeFromTime;
                resumeEpisode = window.resumeFromEpisode || lastEpisode;
                console.log("⏳ Phát hiện click từ lịch sử, set resume data:", window.resumeFromTime, "tập:", resumeEpisode + 1);
                window.hasResumeHistory = true;
                window.resumeTimeData = {
                    timeWatched: window.resumeFromTime,
                    episodeIndex: resumeEpisode,
                    minutesWatched: Math.floor(window.resumeFromTime / 60)
                };
                
                if (currentEpisode !== resumeEpisode) {
                    selectEpisode(resumeEpisode);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
                // ✅ Xóa cờ sau khi đã sử dụng
                window.resumeFromTime = 0;
                window.resumeFromEpisode = 0;
                
                // ✅ Return sớm để checkAndUpdateVideoAccess xử lý resume
                // (Không hiển thị modal khi click từ lịch sử)
                return;
            }
            
            // ✅ Hiện modal cho TẤT CẢ thể loại Video (hls, mp4, youtube, embed...)
            if (lastTimeWatched > 10) {
                // Lưu data để sử dụng
                window.hasResumeHistory = true;
                window.resumeTimeData = {
                    timeWatched: lastTimeWatched,
                    episodeIndex: lastEpisode,
                    minutesWatched: minutesWatched
                };
                
                // Nếu đang ở tập khác với tập đã xem, chuyển tập
                if (currentEpisode !== lastEpisode) {
                    selectEpisode(lastEpisode);
                    // Đợi video load xong rồi mới hiển thị modal (1.5 giây)
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
                // Hiển thị modal hỏi xem tiếp
                showContinueWatchingModal(minutesWatched, lastEpisode, lastTimeWatched);
                return true;
            }
        }
    } catch (error) {
        console.error("Lỗi kiểm tra lịch sử:", error);
    }
    
    return false;
}

/**
 * Hiển thị modal hỏi xem tiếp
 */
function showContinueWatchingModal(minutesWatched, episodeIndex, timeWatched) {
    // Kiểm tra nếu modal đang hiển thị rồi thì không tạo lại
    let modal = document.getElementById("continueWatchingModal");
    if (modal && modal.classList.contains('active')) {
        console.log("⚠️ Modal đang hiển thị, bỏ qua...");
        return;
    }
    
    // Tạo modal nếu chưa tồn tại
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "continueWatchingModal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center; padding: 30px;">
                <h3 style="margin-bottom: 15px;">Tiếp tục xem?</h3>
                <p style="color: #888; margin-bottom: 20px;">
                    Bạn đã xem <span id="continueWatchMinutes" style="color: #fcd535; font-weight: bold;">0</span> phút 
                    tập <span id="continueWatchEpisode" style="color: #fcd535; font-weight: bold;">1</span>
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" onclick="handleContinueWatching(true)">
                        <i class="fas fa-play"></i> Xem tiếp
                    </button>
                    <button class="btn btn-secondary" onclick="handleContinueWatching(false)">
                        <i class="fas fa-redo"></i> Xem lại
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Cập nhật thông tin
    document.getElementById("continueWatchMinutes").textContent = minutesWatched;
    document.getElementById("continueWatchEpisode").textContent = episodeIndex + 1;
    
    // Lưu data để xử lý
    modal.dataset.timeWatched = timeWatched;
    modal.dataset.episodeIndex = episodeIndex;
    
    // Hiển thị modal
    openModal("continueWatchingModal");
}

window.handleContinueWatching = function(continueWatch) {
    const modal = document.getElementById("continueWatchingModal");
    if (!modal) return;
    
    const timeWatched = parseFloat(modal.dataset.timeWatched) || 0;
    const episodeIndex = parseInt(modal.dataset.episodeIndex) || 0;
    
    // Ẩn modal
    closeModal("continueWatchingModal");
    
    console.log("🎬 handleContinueWatching:", continueWatch, "timeWatched:", timeWatched, "episode:", episodeIndex);
    
    if (continueWatch && timeWatched > 0) {
        // ✅ Thêm delay nhỏ để modal đóng hoàn toàn trước khi resume
        setTimeout(() => {
            // Nếu cần chuyển tập, chuyển trước rồi mới phát
            if (currentEpisode !== episodeIndex) {
                console.log("🔄 Chuyển sang tập:", episodeIndex + 1);
                selectEpisode(episodeIndex);
                // Đợi video load xong rồi mới seek và phát
                setTimeout(() => {
                    resumeVideoAtTime(timeWatched);
                }, 2000);
            } else {
                // Đang ở đúng tập - KIỂM TRA TRỰC TIẾP player nào đang hiện
                const html5Player = document.getElementById("html5Player");
                const iframePlayer = document.getElementById("videoPlayer");
                
                console.log("▶️ Resume tại tập hiện tại, html5 visible:", html5Player && !html5Player.classList.contains('hidden'));
                
                // Kiểm tra player nào đang hiện
                if (html5Player && !html5Player.classList.contains('hidden')) {
                    // HTML5 Player (HLS/MP4) đang hiện - sử dụng resumeVideoAtTime
                    resumeVideoAtTime(timeWatched);
                } else {
                    // YouTube/Iframe đang hiện - reload với start parameter
                    reloadYouTubeWithStart(timeWatched);
                }
            }
        }, 100); // Delay nhỏ để modal kịp đóng
    } else {
        // Xem lại từ đầu - xóa progress và phát lại từ đầu
        clearWatchProgress(currentMovieId);
        
        // Reset video về 0 và phát lại từ đầu
        const html5Player = document.getElementById("html5Player");
        if (html5Player && !html5Player.classList.contains('hidden')) {
            html5Player.currentTime = 0;
            html5Player.play().catch(e => console.error("Play error:", e));
            console.log("✅ Xem từ đầu - reset về 0 giây");
        } else {
            // YouTube - reload về 0
            reloadYouTubeWithStart(0);
        }
    }
};

/**
 * Reload YouTube/iframe với thời gian bắt đầu cụ thể
 */
function reloadYouTubeWithStart(startTime) {
    const iframePlayer = document.getElementById("videoPlayer");
    if (!iframePlayer || !iframePlayer.src) {
        console.log("⚠️ iframePlayer không tồn tại hoặc chưa có src");
        return;
    }
    
    // Trích xuất video ID từ URL hiện tại
    const currentSrc = iframePlayer.src;
    let videoId = "";
    let embedUrl = "";
    
    // YouTube
    if (currentSrc.includes("youtube.com/embed/")) {
        const match = currentSrc.match(/youtube\.com\/embed\/([^?]+)/);
        if (match && match[1]) {
            videoId = match[1];
            // Xây dựng URL mới với start parameter
            let newUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1&origin=${window.location.origin}`;
            if (startTime > 0) {
                newUrl += `&start=${Math.floor(startTime)}`;
            }
            embedUrl = newUrl;
        }
    }
    // OK.RU
    else if (currentSrc.includes("ok.ru/videoembed/")) {
        const match = currentSrc.match(/ok\.ru\/videoembed\/([^?]+)/);
        if (match && match[1]) {
            embedUrl = `https://ok.ru/videoembed/${match[1]}?autoplay=1`;
        }
    }
    // Google Drive
    else if (currentSrc.includes("drive.google.com/file/d/")) {
        const match = currentSrc.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        if (match && match[1]) {
            embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
        }
    }
    
    if (embedUrl) {
        console.log("🔄 Reload iframe với start=", startTime, "URL:", embedUrl);
        iframePlayer.src = embedUrl;
    } else {
        console.log("⚠️ Không thể trích xuất video ID từ:", currentSrc);
    }
}

/**
 * Resume video at specific time (for both HTML5 and YouTube)
 */
function resumeVideoAtTime(timeWatched) {
    console.log("📍 Resume video at:", timeWatched, "seconds", "(" + formatTime(timeWatched) + ")");
    
    const html5Player = document.getElementById("html5Player");
    if (html5Player) {
        // HTML5 Player - đợi video ready rồi mới set time
        const doResume = () => {
            // Dừng video trước (nếu đang phát)
            html5Player.pause();
            // Đặt thời gian
            html5Player.currentTime = timeWatched;
            // Phát video
            html5Player.play().then(() => {
                console.log("✅ Tiếp tục xem HTML5 từ:", formatTime(timeWatched));
            }).catch(e => {
                console.error("Play error:", e);
            });
        };
        
        // Kiểm tra readyState - cần ít nhất HAVE_CURRENT_DATA (2) trở lên
        if (html5Player.readyState >= 2) {
            doResume();
        } else {
            // Video chưa ready, đợi event loadeddata
            html5Player.addEventListener('loadeddata', function onLoaded() {
                html5Player.removeEventListener('loadeddata', onLoaded);
                // Đợi thêm một chút để video ready hoàn toàn
                setTimeout(doResume, 100);
            }, { once: true });
        }
    } else {
        // YouTube Player
        seekYouTubeVideo(timeWatched);
    }
}

/**
 * Seek YouTube video to specific time
 */
function seekYouTubeVideo(time) {
    if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
        try {
            window.ytPlayer.seekTo(time, true);
            window.ytPlayer.playVideo();
        } catch(e) {
            console.error("YouTube seek error:", e);
        }
    }
}

// Override showPage to handle movie page exit
const originalShowPage = window.showPage;
window.showPage = async function(pageName, addToHistory = true) {
    // Nếu đang ở trang chi tiết phim và chuyển sang trang khác
    const movieDetailPage = document.getElementById("movieDetailPage");
    if (movieDetailPage && movieDetailPage.classList.contains("active") && pageName !== "movieDetail") {
        await handleMoviePageExit();
    }
    
    // Gọi hàm showPage gốc
    if (originalShowPage) {
        originalShowPage(pageName, addToHistory);
    } else {
        // Fallback nếu không có hàm gốc
        document.querySelectorAll(".page").forEach((page) => {
            page.classList.remove("active");
        });
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add("active");
        }
    }
};

// Thêm event listener cho Logo click
document.addEventListener("DOMContentLoaded", function() {
    const logoLink = document.querySelector('.nav-logo');
    if (logoLink) {
        logoLink.addEventListener("click", async function(e) {
            e.preventDefault();
            // Xử lý exit trước
            await handleMoviePageExit();
            // Sau đó chuyển về trang chủ
            showPage('home');
        });
    }
    
    // Thêm event listener cho navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener("click", async function(e) {
            // Chỉ xử lý nếu là link chuyển trang (có data-page)
            if (this.dataset.page) {
                const targetPage = this.dataset.page;
                const movieDetailPage = document.getElementById("movieDetailPage");
                
                if (movieDetailPage && movieDetailPage.classList.contains("active") && targetPage !== "movieDetail") {
                    await handleMoviePageExit();
                }
            }
        });
    });
    
    // Track YouTube video time
    window.currentVideoTime = 0;
    
    // YouTube API callback
    window.onYouTubeIframeAPIReady = function() {
        window.ytPlayer = new YT.Player('videoPlayer', {
            events: {
                'onStateChange': function(event) {
                    // Update UI (Load/Play/Pause)
                    if (event.data === YT.PlayerState.BUFFERING) {
                         if (typeof updateDetailPlayButtonState === 'function') updateDetailPlayButtonState("loading");
                    } else if (event.data === YT.PlayerState.PLAYING) {
                         if (typeof updateDetailPlayButtonState === 'function') updateDetailPlayButtonState("playing");
                    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                         if (typeof updateDetailPlayButtonState === 'function') updateDetailPlayButtonState("paused");
                         
                         // Tự động chuyển tập cho YouTube
                         if (event.data === YT.PlayerState.ENDED) {
                             handleAutoNext();
                         }
                    }

                    // Track time when playing
                    if (event.data === YT.PlayerState.PLAYING) {
                        window.ytPlayerInterval = setInterval(function() {
                            if (window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') {
                                window.currentVideoTime = window.ytPlayer.getCurrentTime();
                            }
                        }, 1000);
                    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                        if (window.ytPlayerInterval) {
                            clearInterval(window.ytPlayerInterval);
                        }
                    }
                }
            }
        });
    };
});

console.log("✅ Watch History & Navigation Handling Loaded");

// Logic YouTube time tracking cũ đã được loại bỏ để dùng initCustomControls mới

let functionYouTubeMessageHandler = function(event) {
    try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Kiểm tra xem có phải từ YouTube không
        if (data && data.info) {
            if (data.info.currentTime !== undefined) {
                window.currentVideoTime = data.info.currentTime;
                // Kiểm tra đếm ngược chuyển tập cho YouTube
                if (data.info.duration) {
                    checkAutoNextCountdown(data.info.currentTime, data.info.duration);
                }
            }
            
            // PlayerState ENDED (0) trong message data
            if (data.info.playerState === 0) {
                handleAutoNext();
            }
        }
    } catch (e) {
        // Ignore parse errors
    }
};

/**
 * Hàm trung tâm xử lý Tự động chuyển tập (Auto Next)
 */
function handleAutoNext() {
    if (isAutoNexting) return;

    const sw = document.getElementById("swNextEpisode");
    if (!sw || !sw.classList.contains("on")) {
        console.log("⏭️ Tự động chuyển tập đang OFF, dừng.");
        return;
    }

    if (!currentMovieId) return;

    // Tìm thông tin phim hiện tại
    const movie = allMovies.find(m => m.id === currentMovieId);
    if (!movie || !movie.episodes) return;

    const totalEpisodes = movie.episodes.length;
    const nextEpisodeIndex = currentEpisode + 1;

    if (nextEpisodeIndex < totalEpisodes) {
        console.log(`🎬 [AUTO-NEXT] Đang tự động chuyển sang tập ${nextEpisodeIndex + 1}...`);
        
        // Hiển thị thông báo nhỏ cho người dùng
        if (typeof showNotification === 'function') {
            showNotification(`Hết tập. Đang chuyển sang tập ${nextEpisodeIndex + 1}...`, "info");
        }

        isAutoNexting = true;
        // Đợi 1 chút để UI kịp xử lý rồi mới chuyển
        setTimeout(() => {
            isAutoNexting = false;
            selectEpisode(nextEpisodeIndex);
        }, 1500);
    } else {
        console.log("🎬 [AUTO-NEXT] Đã là tập cuối cùng, không thể chuyển tiếp.");
        if (typeof showNotification === 'function') {
            showNotification("Bạn đã xem hết tập cuối cùng của bộ phim này.", "info");
        }
    }
}

/**
 * Kiểm tra và hiển thị thông báo đếm ngược 10 giây trước khi chuyển tập
 */
function checkAutoNextCountdown(currentTime, duration) {
    if (isCountdownNotified || isAutoNexting) return;

    const sw = document.getElementById("swNextEpisode");
    if (!sw || !sw.classList.contains("on")) return;

    // Chỉ thực hiện nếu còn khoảng 10 giây (sai số 1s)
    const timeLeft = duration - currentTime;
    if (timeLeft <= 10 && timeLeft > 0) {
        if (!currentMovieId) return;

        const movie = allMovies.find(m => m.id === currentMovieId);
        if (!movie || !movie.episodes) return;

        const totalEpisodes = movie.episodes.length;
        const nextEpisodeIndex = currentEpisode + 1;

        if (nextEpisodeIndex < totalEpisodes) {
            isCountdownNotified = true;
            const msg = `Chuẩn bị chuyển sang tập ${nextEpisodeIndex + 1} sau 10 giây...`;
            console.log(`⏳ [COUNTDOWN] ${msg}`);
            
            if (typeof showNotification === 'function') {
                showNotification(msg, "info");
            }
        }
    }
}

// ============================================
// PLAYER TOP BAR & EPISODE PANEL
// ============================================

/**
 * Cập nhật thông tin phim trên Top Bar (tên + tập)
 */
function updatePlayerTopBar() {
    const titleEl = document.getElementById("topBarTitle");
    const episodeEl = document.getElementById("topBarEpisode");
    const episodeBtn = document.getElementById("episodeListBtn");
    
    if (!titleEl) return;
    
    // Lấy tên phim từ detailTitle nếu có
    const detailTitleEl = document.getElementById("detailTitle");
    if (detailTitleEl) {
        titleEl.textContent = detailTitleEl.textContent || "Đang tải...";
    }
    
    // Xác định tập hiện tại
    if (typeof currentEpisode !== 'undefined' && currentEpisode !== null) {
        const epIndex = parseInt(currentEpisode);
        // Kiểm tra có phải phim bộ không
        const movieData = (typeof allMovies !== 'undefined') ? allMovies.find(m => m.id === currentMovieId) : null;
        if (movieData && movieData.type === 'series') {
            episodeEl.textContent = `Tập ${epIndex + 1}`;
            if (episodeBtn) episodeBtn.style.display = 'flex';
        } else {
            episodeEl.textContent = 'Phim lẻ';
            if (episodeBtn) episodeBtn.style.display = 'none';
        }
    }
}

/**
 * Render danh sách tập vào Episode Panel
 */
function renderEpisodePanel() {
    const panelList = document.getElementById("episodePanelList");
    if (!panelList) return;
    
    panelList.innerHTML = '';
    
    // Lấy danh sách tập từ dữ liệu phim hiện tại
    const movieData = (typeof allMovies !== 'undefined') ? allMovies.find(m => m.id === currentMovieId) : null;
    if (!movieData || !movieData.episodes || movieData.episodes.length === 0) {
        panelList.innerHTML = '<div style="color: rgba(255,255,255,0.5); padding: 16px; text-align: center;">Không có tập nào</div>';
        return;
    }
    
    const currentEpIndex = parseInt(currentEpisode) || 0;
    
    movieData.episodes.forEach((ep, index) => {
        const item = document.createElement('div');
        item.className = 'ep-panel-item' + (index === currentEpIndex ? ' active' : '');
        
        // Tên tập: Nếu có title thì dùng, không thì "Tập X"
        const epName = ep.title || `Tập ${index + 1}`;
        
        item.innerHTML = `
            <span class="ep-panel-num">${index + 1}</span>
            <span>${epName}</span>
        `;
        
        const changeEpHandler = (e) => {
            e.stopPropagation();
            if (e.type === 'touchstart') {
                // Ngăn click event sinh ra kép
                e.preventDefault();
            }
            // Đóng panel
            toggleEpisodePanel();
            // Chuyển tập
            if (typeof selectEpisode === 'function') {
                selectEpisode(index);
            } else if (typeof window.selectEpisode === 'function') {
                window.selectEpisode(index);
            }
        };
        
        item.addEventListener('click', changeEpHandler);
        item.addEventListener('touchstart', changeEpHandler, {passive: false});
        
        panelList.appendChild(item);
    });
    
    // Cuộn đến tập đang xem
    setTimeout(() => {
        const activeItem = panelList.querySelector('.ep-panel-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, 100);
}

/**
 * Mở/Đóng Episode Panel (slide-in từ phải)
 */
window.toggleEpisodePanel = function() {
    const panel = document.getElementById("playerEpisodePanel");
    if (!panel) return;
    
    const isOpen = panel.classList.contains('open');
    
    if (isOpen) {
        panel.classList.remove('open');
    } else {
        // Render danh sách tập trước khi mở
        renderEpisodePanel();
        panel.classList.add('open');
        // Giữ controls hiện khi panel mở
        showControls();
    }
};

// ============================================
// VIEW MOVIE FROM HISTORY (With Resume Time)
// ============================================

/**
 * Xem phim từ lịch sử - chuyển đến phim và chiếu đúng phút đã lưu
 */
window.viewMovieFromHistory = async function(movieId, episodeIndex, timeWatched) {
    // Đóng modal library trước
    closeModal("libraryModal");
    
    // Đặt biến toàn cục để lưu thời gian cần resume
    window.resumeFromTime = timeWatched;
    window.resumeFromEpisode = episodeIndex;
    
    // Gọi hàm viewMovieDetail bình thường
    await viewMovieDetail(movieId);
    
    // Sau khi video load xong, sẽ tự động hiện modal hỏi xem tiếp
    // (Vì checkAndShowContinueWatchingModal đã được gọi trong viewMovieDetail)
};

// ============================================
// MOBILE LANDSCAPE FULLSCREEN HANDLING
// ============================================
// Đã gỡ bỏ: Tính năng tự động xoay ngang bật fullscreen
// Giữ lại biến để tránh lỗi reference
let userHasExitedLandscape = false;
function handleOrientationChange() { /* Đã vô hiệu hóa */ }
// Không đăng ký listener orientationchange và resize nữa

/**
 * Helper: Lưu tự động thời gian xem mới nhất của trang hiện tại
 */
window.saveCurrentWatchProgressImmediate = function() {
    if (!currentMovieId || typeof currentEpisode === 'undefined') return;
    let currentTime = 0;
    let duration = 0;
    
    const html5Player = document.getElementById("html5Player");
    if (html5Player && !html5Player.classList.contains('hidden') && html5Player.duration > 0) {
        currentTime = html5Player.currentTime;
        duration = html5Player.duration;
    } else if (window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') {
        try {
            currentTime = window.ytPlayer.getCurrentTime() || 0;
            duration = window.ytPlayer.getDuration() || 0;
        } catch(e) {}
    }
    
    if (currentTime > 0 && duration > 0) {
        saveWatchProgressImmediate(currentMovieId, currentEpisode, currentTime, duration);
    }
};

// Đảm bảo lưu lịch sử trước khi người dùng đóng trình duyệt hoặc load lại trang
window.addEventListener("beforeunload", () => {
    const detailPage = document.getElementById("page-detail"); // ID của detail section
    if (detailPage && !detailPage.classList.contains("hidden")) {
        window.saveCurrentWatchProgressImmediate();
    }
});

/**
 * Quay lại từ trang chi tiết
 */
function goBackFromDetail() {
    console.log("🔙 Đang xử lý quay lại từ Detail...");
    
    // Lưu thời gian xem chính xác trước khi thoát
    window.saveCurrentWatchProgressImmediate();
    
    // Ưu tiên dùng History Back để giữ trạng thái cuộn/lọc trang trước
    if (window.history.length > 1) {
        window.history.back();
        return;
    }

    // Fallback nếu không có lịch sử (Vào trực tiếp link)
    let targetPage = 'home';
    if (typeof currentMovieId !== 'undefined' && currentMovieId) {
        const movie = (typeof allMovies !== 'undefined') ? allMovies.find(m => m.id === currentMovieId) : null;
        if (movie) {
            if (movie.type === 'series') targetPage = 'seriesMovies';
            else if (movie.type === 'single') targetPage = 'singleMovies';
        }
    }
    showPage(targetPage);
}

/* --- TÍNH NĂNG MỚI: PHÂN TRANG & LIÊN QUAN --- */

/**
 * Render nút chọn phiên bản (Vietsub/Thuyết minh)
 */
/**
 * Render phim đề xuất (dựa trên thể loại/tags) - Hiển thị dưới cùng
 */
function renderRecommendedMovies(movie) {
  const container = document.getElementById("recommendedMoviesContainer");
  const list = document.getElementById("recommendedMoviesList");
  if (!container || !list) return;

  list.innerHTML = "";
  container.style.display = "none";
  
  if (!allMovies || allMovies.length === 0) return;

  // Safely parse category string or array into an array of lowercase strings
  const parseCategories = (cat) => {
      if (!cat) return [];
      if (typeof cat === 'string') {
          // Phân tách chuỗi bằng dấu phẩy, loại bỏ khoảng trắng dư và chuyển thành in thường
          return cat.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
      }
      if (Array.isArray(cat)) {
          return cat.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean).map(c => String(c).trim().toLowerCase());
      }
      return [];
  };

  const parseTags = (tags) => {
      if (!tags) return [];
      if (typeof tags === 'string') return tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (Array.isArray(tags)) return tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
      return [];
  };

  // Lấy danh sách thể loại và tags của phim hiện tại
  const currentCategories = parseCategories(movie.category);
  const currentTags = parseTags(movie.tags);

  if (currentCategories.length === 0 && currentTags.length === 0) return;

  // Tiêu chí: có chung ít nhất 1 thể loại hoặc tag
  let recommended = allMovies.reduce((acc, m) => {
      if (m.id === movie.id) return acc;
      
      const mCategories = parseCategories(m.category);
      const mTags = parseTags(m.tags);

      // Đếm số lượng thể loại và tag trùng khớp
      const commonCategoryCount = mCategories.filter(c => currentCategories.includes(c)).length;
      const commonTagCount = mTags.filter(t => currentTags.includes(t)).length;

      const score = commonCategoryCount + commonTagCount;

      if (score > 0) {
          acc.push({ movie: m, score: score });
      }
      return acc;
  }, []);

  // Sắp xếp theo điểm số (nhiều điểm chung hơn sẽ lên đầu)
  // Nếu điểm bằng nhau, xáo trộn ngẫu nhiên để danh sách đa dạng
  recommended.sort((a, b) => {
      if (b.score !== a.score) {
          return b.score - a.score;
      }
      return 0.5 - Math.random();
  });

  // Chỉ lấy đối tượng movie
  recommended = recommended.map(item => item.movie);

  // Giới hạn số lượng hiển thị (VD: 15 phim)
  recommended = recommended.slice(0, 15);

  if (recommended.length > 0) {
      container.style.display = "block";
      recommended.forEach(m => {
          const item = document.createElement("div");
          item.className = "related-part-item";
          item.style.minWidth = "110px";
          item.style.width = "110px";
          item.style.cursor = "pointer";
          item.style.textAlign = "center";
          
          item.innerHTML = `
              <div style="position: relative; aspect-ratio: 2/3; overflow: hidden; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 5px;">
                  <img src="${m.posterUrl || m.backgroundUrl || ''}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onerror="this.src='https://placehold.co/200x300/1a1a2e/FFF?text=No+Image'">
              </div>
              <div style="font-size: 0.8rem; line-height: 1.2; color: #ccc; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</div>
          `;
          
          item.onclick = () => {
              viewMovieIntro(m.id);
          };
          list.appendChild(item);
      });
  }
}

/**
 * Render danh sách các phiên bản phim (Vietsub, Thuyết minh...) - Bản Modern
 */
function renderDetailVersions(episode) {
  const row = document.getElementById("movieExtraControlsRow");
  const list = document.getElementById("versionListModern");
  if (!row || !list) return;

  list.innerHTML = "";
  // row.style.display handles overall visibility (if both parts and versions exist or just one)

  if (!episode) return;

  let sources = [];
  if (episode.sources && Array.isArray(episode.sources) && episode.sources.length > 0) {
      sources = episode.sources;
  } else if (episode.videoType) {
      sources = [{ label: "Bản gốc", type: episode.videoType, source: episode.videoSource || episode.youtubeId }];
  }

  if (sources.length > 0) {
      row.style.display = "block";
      const preferredLabel = localStorage.getItem("preferredSourceLabel");
      
      sources.forEach((src) => {
          const btn = document.createElement("button");
          const isActive = (src.label === preferredLabel) || (!preferredLabel && sources.indexOf(src) === 0);
          
          btn.className = `version-btn-modern ${isActive ? 'active' : ''}`;
          btn.innerHTML = `<i class="fas fa-desktop"></i> <span>${src.label}</span>`;
          
          btn.onclick = () => {
              if (src.label === preferredLabel) return; 
              localStorage.setItem("preferredSourceLabel", src.label);
              
              if (currentMovieId) {
                 const video = document.getElementById("html5Player");
                 let time = (!video.classList.contains("hidden")) ? video.currentTime : 0;
                 saveWatchProgressImmediate(currentMovieId, currentEpisode, time, 0);
              }
              
              setTimeout(() => {
                  viewMovieDetail(currentMovieId);
              }, 50);
          };
          list.appendChild(btn);
      });
  }
}

/**
 * Render Dropdown chọn Phần/Mùa phim - Bản Modern
 */
function renderMoviePartsSeries(movie) {
    const row = document.getElementById("movieExtraControlsRow");
    const menu = document.getElementById("partDropdownMenu");
    const currentName = document.getElementById("currentPartName");
    const chevron = document.getElementById("partChevron");
    const partSelector = document.getElementById("partSelector");
    const divider = document.querySelector(".divider-vertical");
    
    if (!row || !menu || !currentName) return;

    menu.innerHTML = "";
    if (chevron) chevron.style.display = "none";
    
    // Kiểm tra xem phim có được set tên phần cụ thể không
    const hasPartData = movie.part && movie.part !== "(Trống)" && movie.part.trim() !== "";
    const hasSeriesId = movie.seriesId && movie.seriesId.trim() !== "";
    
    if (!hasPartData && !hasSeriesId) {
        // Nếu không có cả tên phần lẫn mã bộ phim: Xóa tên hiển thị và tắt gom nhóm
        currentName.textContent = ""; 
        if (partSelector) partSelector.style.opacity = "0.5";
        if (divider) divider.style.display = "none";
        return;
    }

    // Hiển thị nhãn hiện tại
    currentName.textContent = movie.part || "Phần 1";
    if (partSelector) partSelector.style.opacity = "1";
    if (divider) divider.style.display = "block";

    if (!allMovies || allMovies.length === 0) return;

    let seriesMovies = [];

    if (hasSeriesId) {
        // ƯU TIÊN 1: Gom nhóm theo Mã Bộ Phim (Chính xác tuyệt đối)
        seriesMovies = allMovies.filter(m => m.seriesId === movie.seriesId);
    } else {
        // ƯU TIÊN 2: Logic cũ - Tìm theo tên gốc (Fallback)
        let baseTitle = movie.title.split(":")[0].split("-")[0].trim();
        baseTitle = baseTitle.replace(/(\s+)(\d+|I|II|III|IV|V)+$/i, "").trim();
        
        if (baseTitle.length >= 2) {
            seriesMovies = allMovies.filter(m => 
                m.title.toLowerCase().includes(baseTitle.toLowerCase())
            );
        }
    }

    // Chỉ hiện dropdown nếu có từ 2 phim trở lên trong bộ
    if (seriesMovies.length > 1) {
        row.style.display = "block";
        if (chevron) chevron.style.display = "inline-block";

        seriesMovies.sort((a, b) => {
            const getPartNum = (m) => {
                // Ưu tiên lấy số từ trường .part, nếu không có mới tìm trong .title
                const match = (m.part || m.title).match(/\d+/);
                return match ? parseInt(match[0]) : 0;
            };
            return getPartNum(a) - getPartNum(b);
        });

        seriesMovies.forEach(m => {
            const item = document.createElement("div");
            item.className = `part-dropdown-item ${m.id === movie.id ? 'active' : ''}`;
            
            // Hiển thị tên phần: Ưu tiên .part, sau đó đến .title rút gọn
            let partText = m.part;
            if (!partText || partText === "(Trống)") {
                // Nếu không có phần nhưng cùng seriesId, cố gắng lấy phần khác biệt của tiêu đề
                partText = m.title;
                if (!hasSeriesId) {
                    // Nếu là lọc theo tên, xóa bớt tên gốc cho gọn
                    let baseTitle = movie.title.split(":")[0].split("-")[0].trim();
                    baseTitle = baseTitle.replace(/(\s+)(\d+|I|II|III|IV|V)+$/i, "").trim();
                    partText = m.title.replace(baseTitle, "").trim() || "Phần 1";
                }
            }
            
            item.textContent = partText;
            
            item.onclick = (e) => {
                e.stopPropagation();
                if (m.id !== movie.id) {
                    viewMovieDetail(m.id);
                }
                menu.classList.remove("active");
            };
            
            menu.appendChild(item);
        });
    }
}

/**
 * Toggle Dropdown chọn phần
 */
window.togglePartDropdown = function(event) {
    event.stopPropagation();
    const menu = document.getElementById("partDropdownMenu");
    if (!menu || menu.innerHTML.trim() === "") return; // Nếu không có phần khác thì không đổ ra gì

    const isActive = menu.classList.contains("active");
    // Đóng tất cả dropdown khác (nếu có)
    document.querySelectorAll(".part-dropdown-menu").forEach(m => m.classList.remove("active"));
    
    if (!isActive) {
        menu.classList.add("active");
    }
};

// Đóng dropdown khi click ra ngoài
document.addEventListener("click", () => {
    document.querySelectorAll(".part-dropdown-menu").forEach(m => m.classList.remove("active"));
});

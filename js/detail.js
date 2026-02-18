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
async function viewMovieDetail(movieId) {
  // Reset cờ kiểm tra lịch sử
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
          
          // ✅ Clear resumeFromTime sau khi đã sử dụng để tránh ảnh hưởng lần sau
          window.resumeFromTime = 0;
          window.resumeFromEpisode = 0;
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
  // Hiển thị giá phim - nếu miễn phí thì hiển thị "Miễn phí", có giá thì thêm "CRO"
  const priceDisplay = !movie.price || movie.price === 0 
    ? "Miễn phí" 
    : `${movie.price} CRO`;
  document.getElementById("detailPrice").textContent = priceDisplay;

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
  // Tính toán trang hiện tại chứa tập đang xem
  if (currentEpisode >= 0) {
      currentEpisodePage = Math.floor(currentEpisode / EPISODES_PER_PAGE);
  } else {
      currentEpisodePage = 0;
  }
  
  renderEpisodes(movie.episodes || []);
  
  // 5.1 Render các tính năng mới (Versions & Related Parts)
  if (movie.episodes && movie.episodes[currentEpisode]) {
      renderDetailVersions(movie.episodes[currentEpisode]);
  }
  renderRelatedParts(movie);

  // 6. Kiểm tra có lịch sử xem không TRƯỚC KHI load video (để set flag hasResumeHistory)
  await checkAndShowContinueWatchingModal();

  // 7. Kiểm tra quyền xem và tải Video
  await checkAndUpdateVideoAccess();

  // 8. Tải bình luận
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
  const pageSelect = document.getElementById("episodePageSelect");

  if (!episodes || episodes.length <= 1) {
    if (pageSelect) pageSelect.style.display = "none";
    
    // Vẫn hiện nếu chỉ có 1 tập để user biết
    if (!episodes || episodes.length === 0) {
        section.classList.add("hidden");
        return;
    }
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
        // Calculate real index in the full array
        const realIndex = startIdx + index;
        return `
        <div class="episode-item ${realIndex === currentEpisode ? "active" : ""}" 
             onclick="selectEpisode(${realIndex})">
            <div class="episode-number">Tập ${ep.episodeNumber}</div>
            <div class="episode-title">${ep.title || ""}</div>
            <small class="text-muted">${ep.duration || ""} • ${ep.quality || "HD"}</small>
        </div>
    `;
      }
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
  
  // Update versions corresponding to this episode
  const movie = allMovies.find(m => m.id === currentMovieId);
  if (movie && movie.episodes && movie.episodes[index]) {
      renderDetailVersions(movie.episodes[index]);
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

  // Lấy thông tin phim hiện tại để kiểm tra giá
  const currentMovie = allMovies.find(m => m.id === currentMovieId);
  const isFreeMovie = !currentMovie?.price || currentMovie.price === 0;
  
  // Cập nhật thông tin phim trong giao diện khóa
  const lockedMovieTitle = document.getElementById("lockedMovieTitle");
  const lockedPrice = document.getElementById("lockedPrice");
  if (lockedMovieTitle && currentMovie) {
    lockedMovieTitle.textContent = currentMovie.title || "Phim";
  }
  if (lockedPrice && currentMovie) {
    if (!currentMovie.price || currentMovie.price === 0) {
      lockedPrice.textContent = "Miễn phí";
    } else {
      lockedPrice.textContent = `${currentMovie.price} CRO`;
    }
  }

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
  }
  // 👇 THÊM: Phim miễn phí - ai cũng được xem (không cần đăng nhập) 👇
  else if (isFreeMovie) {
    hasAccess = true;
    
    // Cập nhật nút cho phim miễn phí
    if (buyTicketBtn) {
      buyTicketBtn.innerHTML = '<i class="fas fa-play"></i> Xem Miễn Phí';
      buyTicketBtn.classList.add("btn-success");
      buyTicketBtn.classList.remove("btn-primary");
      buyTicketBtn.disabled = false;
    }
  }
  else if (currentUser && currentMovieId) {
    // Kiểm tra đã mua chưa
    hasAccess = await checkMoviePurchased(currentMovieId);
  }

  if (hasAccess) {
    // Mở khóa giao diện (Code cũ)
    videoLocked.classList.add("hidden");
    videoPlayer.classList.remove("hidden");
    
    // Hiển thị nút phù hợp với loại phim
    if (isFreeMovie) {
      buyTicketBtn.innerHTML = '<i class="fas fa-play"></i> Xem Miễn Phí';
      buyTicketBtn.disabled = false;
      buyTicketBtn.classList.remove("btn-primary");
      buyTicketBtn.classList.add("btn-success");
    } else {
      buyTicketBtn.innerHTML = '<i class="fas fa-check"></i> Đã mua vé';
      buyTicketBtn.disabled = true;
      buyTicketBtn.classList.remove("btn-primary");
      buyTicketBtn.classList.add("btn-success");
    }

    // 👇 LOGIC HYBRID PLAYER (SỬA Ở ĐÂY) 👇
    const movie = allMovies.find((m) => m.id === currentMovieId);
    if (movie && movie.episodes && movie.episodes[currentEpisode]) {
      const episode = movie.episodes[currentEpisode];
      
      let videoType = "youtube";
      let videoSource = "";
      
      // LOGIC ĐA PHIÊN BẢN (MULTI-VERSION)
      if (episode.sources && Array.isArray(episode.sources) && episode.sources.length > 0) {
          const preferredLabel = localStorage.getItem("preferredSourceLabel");
          // Tìm source theo label
          let sourceObj = episode.sources.find(s => s.label === preferredLabel);
          
          // Nếu không tìm thấy, lấy cái đầu tiên
          if (!sourceObj) sourceObj = episode.sources[0];
          
          videoType = sourceObj.type;
          videoSource = sourceObj.source;
          
          console.log(`🎬 Đang phát phiên bản: ${sourceObj.label} (${videoType})`);
      } else {
          // Fallback: Dữ liệu cũ
          videoType = episode.videoType || "youtube";
          videoSource = episode.videoSource || episode.youtubeId;
      }
      
      const iframePlayer = document.getElementById("videoPlayer");
      const html5Player = document.getElementById("html5Player");

      // Reset players
      iframePlayer.classList.add("hidden");
      iframePlayer.src = "";
      html5Player.classList.add("hidden");
      html5Player.pause();
      html5Player.src = "";
      
      // Clear HLS instance if exists
      if (window.hlsInstance) {
          window.hlsInstance.destroy();
          window.hlsInstance = null;
      }
      
      // Reset video element reference for custom controls
      videoEl = null;
      currentVideoType = videoType; // Store current video type

      if (videoType === "youtube") {
          // --- YOUTUBE PLAYER ---
          iframePlayer.classList.remove("hidden");
          
          let embedUrl = "";
          // Xử lý các dạng link đặc biệt (OK.RU, GDrive...)
          if (videoSource.includes("ok.ru")) {
            const id = videoSource.split("/").pop();
            embedUrl = `https://ok.ru/videoembed/${id}`;
          } else if (videoSource.length > 25) { // GDrive
            embedUrl = `https://drive.google.com/file/d/${videoSource}/preview`;
          } else {
            // Xây dựng URL với các tham số
            let params = "rel=0&enablejsapi=1&origin=" + window.location.origin;
            
            // ✅ SỬA: Luôn auto-play, nhưng nếu có resume time thì start từ vị trí đó
            // (Trước đây đang set autoplay=0 khi có history, làm video không tự phát)
            params += `&autoplay=1`;
            
            // Nếu có lịch sử resume, thêm tham số start để bắt đầu từ vị trí đã lưu
            if (window.hasResumeHistory && window.resumeTimeData && window.resumeTimeData.timeWatched > 0) {
                params += `&start=${Math.floor(window.resumeTimeData.timeWatched)}`;
                console.log("▶️ YouTube sẽ bắt đầu từ:", window.resumeTimeData.timeWatched, "giây");
            }
            
            embedUrl = `https://www.youtube.com/embed/${videoSource}?${params}`;
          }
          iframePlayer.src = embedUrl;
          
          // ✅ XỬ LÝ RESUME KHI YOUTUBE IFRAME LOAD
          const pendingYoutubeResume = window.resumeTimeData ? window.resumeTimeData.timeWatched : 0;
          if (pendingYoutubeResume > 0) {
              console.log("🎬 [YouTube] Chuẩn bị resume sau khi load:", pendingYoutubeResume);
          }
          
          // Bắt đầu tracking YouTube time sau khi iframe load
          // Đợi iframe load xong rồi mới tracking
          iframePlayer.addEventListener('load', function() {
              console.log("🎥 YouTube iframe loaded, bắt đầu tracking...");
              
              // ✅ SỬ DỤNG YOUTUBE API ĐỂ SEEK SAU KHI VIDEO READY
              if (pendingYoutubeResume > 0) {
                  // Đợi YouTube API ready và video ready
                  const trySeek = () => {
                      if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
                          try {
                              window.ytPlayer.seekTo(pendingYoutubeResume, true);
                              window.ytPlayer.playVideo();
                              console.log("🎬 [YouTube] Đã seek đến:", pendingYoutubeResume);
                          } catch(e) {
                              console.log("⚠️ YouTube seek error, thử lại...", e);
                              setTimeout(trySeek, 500);
                          }
                      } else {
                          // YouTube API chưa ready, đợi thêm
                          console.log("⏳ YouTube API chưa ready, đợi...");
                          setTimeout(trySeek, 500);
                      }
                  };
                  // Bắt đầu thử seek sau 1 giây
                  setTimeout(trySeek, 1000);
              }
              
              startYouTubeTimeTracking();
          });
          // Fallback nếu onload không hoạt động - thử sau 3 giây
          setTimeout(function() {
              if (!youTubeTimeTrackingInterval) {
                  console.log("🎥 Fallback: bắt đầu tracking...");
                  startYouTubeTimeTracking();
              }
          }, 3000);
          
      } else if (videoType === "hls") {
          // --- HLS PLAYER ---
          html5Player.classList.remove("hidden");
          
          // ✅ XỬ LÝ RESUME TỪ LỊCH SỬ - Lưu thời gian cần resume trước
          let pendingHlsResume = null;
          if (window.resumeFromTime && window.resumeFromTime > 0) {
              pendingHlsResume = window.resumeFromTime;
              console.log("🎬 [HLS] Chuẩn bị resume:", pendingHlsResume, "giây");
              // Clear variables
              window.resumeFromTime = 0;
              window.resumeFromEpisode = 0;
              window.hasResumeHistory = false;
          }
          
          if (Hls.isSupported()) {
              const hls = new Hls();
              window.hlsInstance = hls; // Lưu global để destroy sau này
              hls.loadSource(videoSource);
              hls.attachMedia(html5Player);
              hls.on(Hls.Events.MANIFEST_PARSED, function() {
                  // ✅ XỬ LÝ RESUME
                  if (pendingHlsResume) {
                      console.log("🎬 [HLS] Thực hiện resume:", pendingHlsResume);
                      setTimeout(() => {
                          resumeVideoAtTime(pendingHlsResume);
                      }, 100);
                      pendingHlsResume = null;
                  } else {
                      // Chỉ auto-play nếu KHÔNG có lịch sử resume
                      if (!window.hasResumeHistory) {
                          html5Player.play().catch(e => console.log("Auto-play blocked:", e));
                      } else {
                          console.log("⏸️ Bỏ qua auto-play vì có lịch sử resume");
                      }
                  }
                  // Populate quality menu from HLS levels
                  populateQualityMenu(hls);
              });
              // Listen for level switching to update UI
              hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
                  updateQualityDisplay(data.level);
              });
          } else if (html5Player.canPlayType('application/vnd.apple.mpegurl')) {
              // Safari Native HLS
              html5Player.src = videoSource;
              html5Player.addEventListener('loadedmetadata', function() {
                  // ✅ XỬ LÝ RESUME TỪ LỊCH SỬ cho Safari
                  if (pendingHlsResume) {
                      setTimeout(() => {
                          resumeVideoAtTime(pendingHlsResume);
                      }, 100);
                      pendingHlsResume = null;
                  } else if (!window.hasResumeHistory) {
                      html5Player.play();
                  }
              });
          }
          
      } else if (videoType === "mp4") {
          // --- MP4 PLAYER ---
          html5Player.classList.remove("hidden");
          html5Player.src = videoSource;
          
          // ✅ XỬ LÝ RESUME TỪ LỊCH SỬ - Auto seek đến phút đã xem
          if (window.resumeFromTime && window.resumeFromTime > 0) {
              const timeToResume = window.resumeFromTime;
              console.log("🎬 [MP4] Resume từ lịch sử:", timeToResume, "giây");
              
              // Clear resume variables
              window.resumeFromTime = 0;
              window.resumeFromEpisode = 0;
              window.hasResumeHistory = false;
              
              // Đợi video ready rồi resume
              html5Player.addEventListener('loadedmetadata', function onLoaded() {
                  html5Player.removeEventListener('loadedmetadata', onLoaded);
                  setTimeout(() => {
                      resumeVideoAtTime(timeToResume);
                  }, 100);
              }, { once: true });
          } else {
              // Chỉ auto-play nếu KHÔNG có lịch sử resume
              if (!window.hasResumeHistory) {
                  html5Player.play().catch(e => console.log("Auto-play blocked:", e));
              } else {
                  console.log("⏸️ Bỏ qua auto-play vì có lịch sử resume");
              }
          }
      }
      // --- XỬ LÝ HIỂN THỊ CUSTOM CONTROLS VÀ CENTER OVERLAY ---
      const customControls = document.getElementById("customControls");
      const centerOverlay = document.getElementById("centerOverlay");
      
      if (customControls) {
        if (videoType === "hls" || videoType === "mp4") {
            customControls.classList.remove("hidden");
            if (centerOverlay) centerOverlay.classList.remove("hidden");
            initCustomControls(html5Player);
        } else {
            customControls.classList.add("hidden");
            // Ẩn center overlay khi là YouTube (YouTube có nút play riêng)
            if (centerOverlay) centerOverlay.classList.add("hidden");
        }
      }
    }
  } else {
    // Khóa video (Logic cũ giữ nguyên)
    const videoLocked = document.getElementById("videoLocked");
    const videoPlayer = document.getElementById("videoPlayer");
    const html5Player = document.getElementById("html5Player");
    
    videoLocked.classList.remove("hidden");
    
    videoPlayer.classList.add("hidden");
    videoPlayer.src = "";
    
    if(html5Player) {
        html5Player.classList.add("hidden");
        html5Player.pause();
        html5Player.src = "";
    }
    
    const customControls = document.getElementById("customControls");
    if(customControls) customControls.classList.add("hidden");

    buyTicketBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Mua Vé Ngay';
    buyTicketBtn.disabled = false;
    buyTicketBtn.classList.add("btn-primary");
    buyTicketBtn.classList.remove("btn-success");
  }
}

// --- CUSTOM VIDEO CONTROLS LOGIC ---
let videoEl = null;
let currentVideoType = "youtube"; // Track current video type: youtube, hls, mp4
let isDragging = false;
let hideControlsTimeout;
let lastSaveTime = 0; // Debounce save progress

// --- WATCH PROGRESS FUNCTIONS ---
let watchProgressInterval = null; // Interval for saving every 10 seconds

/**
 * Lưu thời gian xem phim vào Firestore (Mỗi 10 giây)
 */
async function saveWatchProgress(movieId, episodeIndex, currentTime, duration) {
    if (!currentUser || !db || !movieId) return;
    if (currentTime <= 0 || duration <= 0) return;
    
    // Debounce: chỉ lưu mỗi 10 giây (đã sửa từ 30 giây)
    const now = Date.now();
    if (now - lastSaveTime < 10000) return;
    lastSaveTime = now;
    
    // Tính percentage
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
        
        console.log(`✅ Đã lưu progress: ${movieId} - Tập ${episodeIndex + 1} - ${Math.round(currentTime)}s/${Math.round(duration)}s (${percentage}%)`);
        
        // ✅ CẬP NHẬT UI PROGRESS BAR NGAY LẬP TỨC
        if (typeof updateMovieProgressUI === 'function') {
            updateMovieProgressUI(movieId, percentage);
        }
        
        // ✅ CẬP NHẬT HISTORY: Lưu thời gian xem vào collection history để hiển thị trong "Lịch sử đã xem"
        // Gọi trực tiếp Firestore update để tránh vấn đề async/await trong debounce
        if (currentUser && db && movieId) {
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
    if (!currentUser || !db || !movieId) return;
    if (currentTime <= 0 || duration <= 0) return;
    
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
        
        // ✅ CẬP NHẬT HISTORY: Lưu thời gian xem vào collection history (dùng await vì function này là async)
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

    // Update Time & Progress
    video.addEventListener("timeupdate", () => {
        if (!isDragging) {
            const percent = (video.currentTime / video.duration) * 100;
            document.getElementById("progressBar").style.width = `${percent}%`;
            document.getElementById("progressSlider").value = video.currentTime;
            document.getElementById("currentTime").textContent = formatTime(video.currentTime);
        }
        // Buffer bar
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const duration = video.duration;
            const width = (bufferedEnd / duration) * 100;
            document.getElementById("bufferBar").style.width = `${width}%`;
        }
        
        // Save watch progress (debounced in function)
        if (currentMovieId && video.duration > 0) {
            saveWatchProgress(currentMovieId, currentEpisode, video.currentTime, video.duration);
        }
    });

    // Handle User Seek (Input Range)
    const slider = document.getElementById("progressSlider");
    slider.addEventListener("input", (e) => {
        isDragging = true;
        const time = parseFloat(e.target.value);
        const percent = (time / video.duration) * 100;
        document.getElementById("progressBar").style.width = `${percent}%`;
        document.getElementById("currentTime").textContent = formatTime(time);
    });
    slider.addEventListener("change", (e) => {
        isDragging = false;
        video.currentTime = parseFloat(e.target.value);
    });

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
        updatePlayIcons(true);
        container.classList.add("playing");
        container.classList.remove("paused");
    });
    video.addEventListener("pause", () => {
        updatePlayIcons(false);
        container.classList.remove("playing");
        container.classList.add("paused");
        
        // Lưu progress ngay khi pause (KHÔNG debounce - lưu ngay lập tức)
        if (currentMovieId && video.duration > 0 && video.currentTime > 0) {
            saveWatchProgressImmediate(currentMovieId, currentEpisode, video.currentTime, video.duration);
        }
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
        const isCenterBtn = e.target.closest('.center-btn');
        
        // If clicking center button, let the button's onclick handle it
        if (isCenterBtn) {
            console.log("Click on center button, not toggling from container");
            return;
        }
        
        if (!isControlBtn && !isSettingsMenu && !isProgressContainer) {
            console.log("Calling togglePlay, videoEl:", videoEl);
            togglePlay();
        }
    });
    
    // Save progress when leaving page (IMMEDIATE - không debounce)
    window.addEventListener("beforeunload", () => {
        if (currentMovieId && video.duration > 0 && video.currentTime > 0) {
            saveWatchProgressImmediate(currentMovieId, currentEpisode, video.currentTime, video.duration);
        }
    });
    
    // Set initial state
    container.classList.add("paused");
    console.log("Custom controls initialized for video:", video);
}

function showControls() {
    const controls = document.getElementById("customControls");
    if(controls) controls.classList.add("show");
    document.getElementById("videoContainer").style.cursor = "default";
}

function hideControls() {
    const controls = document.getElementById("customControls");
    // Không ẩn nếu đang hover vào controls hoặc settings menu đang mở
    const settingsMenu = document.getElementById("settingsMenu");
    
    // Logic mới: Chỉ ẩn bottom bar, center overlay follow theo Play State & Hover (CSS handled)
    if (controls && (!settingsMenu || settingsMenu.style.display === 'none')) {
        controls.classList.remove("show");
        document.getElementById("videoContainer").style.cursor = "none";
    }
}

function resetHideTimer() {
    clearTimeout(hideControlsTimeout);
    hideControlsTimeout = setTimeout(() => {
        if (videoEl && !videoEl.paused) hideControls();
    }, 3000);
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
}

function updatePlayIcons(isPlaying) {
    const bottomIcon = document.querySelector("#playPauseBtn i");
    const centerIcon = document.querySelector("#centerOverlay .play-btn-large i");
    
    if (isPlaying) {
        if(bottomIcon) bottomIcon.className = "fas fa-pause";
        if(centerIcon) centerIcon.className = "fas fa-pause";
    } else {
        if(bottomIcon) bottomIcon.className = "fas fa-play";
        if(centerIcon) centerIcon.className = "fas fa-play";
    }
}
// Remove old updatePlayIcon function if exists custom logic


// --- EXPORTED FUNCTIONS (Attached to HTML) ---
window.togglePlay = function() {
    // Don't toggle if YouTube (center overlay should be hidden anyway)
    if (currentVideoType === "youtube") {
        console.log("TogglePlay: YouTube player, skipping");
        return;
    }
    
    // Try to get videoEl, if null try to get from DOM
    let video = videoEl;
    if (!video) {
        video = document.getElementById("html5Player");
        console.log("Got video from DOM:", video);
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
    modal.classList.add("active");
}

function closeResumeModal() {
    // Đóng cả modal cũ và modal mới
    const oldModal = document.getElementById("resumeWatchModal");
    if (oldModal) {
        oldModal.classList.remove("active");
    }
    const newModal = document.getElementById("continueWatchingModal");
    if (newModal) {
        newModal.classList.remove("active");
    }
    pendingResumeData = null;
}

/**
 * Đóng modal tiếp tục xem
 */
function closeContinueWatchingModal() {
    const modal = document.getElementById("continueWatchingModal");
    if (modal) {
        modal.classList.remove("active");
    }
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

window.toggleFullscreen = function() {
    const container = document.getElementById("videoContainer");
    const icon = document.querySelector("#fullscreenBtn i");
    const customControls = document.getElementById("customControls");
    const centerOverlay = document.getElementById("centerOverlay");
    
    // Kiểm tra xem có đang ở chế độ "CSS fullscreen" (landscape mode) không
    const isLandscapeMode = container && container.classList.contains("landscape-mode");
    
    // Nếu đang ở landscape mode - chỉ cần thoát ra (như bình thường)
    if (isLandscapeMode) {
        // Đánh dấu người dùng đã thoát thủ công
        userHasExitedLandscape = true;
        
        // Thoát khỏi chế độ landscape fullscreen CSS
        container.classList.remove("landscape-mode");
        
        // Reset styles về như chế độ portrait
        container.style.position = "";
        container.style.width = "";
        container.style.height = "";
        container.style.top = "";
        container.style.left = "";
        container.style.zIndex = "";
        container.style.paddingTop = "";
        
        // Reset controls
        if (customControls) {
            customControls.classList.remove("show");
            customControls.style.opacity = "";
        }
        if (centerOverlay) {
            centerOverlay.style.opacity = "";
        }
        
        // Cập nhật icon
        if (icon) icon.className = "fas fa-expand";
        
        // Cũng thoát khỏi browser fullscreen nếu đang bật
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.log("Exit fullscreen error:", e));
        } else if (document.webkitFullscreenElement) {
            document.webkitExitFullscreen();
        }
        
        return;
    }
    
    // Chế độ bình thường (portrait) - sử dụng browser Fullscreen API
    if (!document.fullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        if(icon) icon.className = "fas fa-compress";
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        if(icon) icon.className = "fas fa-expand";
    }
};

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
    if (!currentMovieId || !currentUser) return;
    
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
                
                // Nếu đang ở tập khác với tập đã xem, chuyển tập
                if (currentEpisode !== resumeEpisode) {
                    selectEpisode(resumeEpisode);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
                // ✅ Return sớm để checkAndUpdateVideoAccess xử lý resume
                // (Không hiển thị modal khi click từ lịch sử)
                return;
            }
            
            // ✅ Chỉ hiện modal cho video KHÔNG PHẢI YouTube
            // Lấy video type của tập hiện tại
            const movieForCheck = allMovies.find((m) => m.id === currentMovieId);
            let isHtml5Video = false;
            if (movieForCheck && movieForCheck.episodes && movieForCheck.episodes[currentEpisode]) {
                const videoType = movieForCheck.episodes[currentEpisode].videoType || "youtube";
                isHtml5Video = (videoType === "hls" || videoType === "mp4");
                console.log("📺 Video type hiện tại:", videoType, "-> isHtml5Video:", isHtml5Video);
            }
            
            // Chỉ hiện modal nếu đã xem > 10 giây VÀ là video m3u8/mp4
            if (lastTimeWatched > 10 && isHtml5Video) {
                // Lưu data để sử dụng
                window.hasResumeHistory = true;
                window.resumeTimeData = {
                    timeWatched: lastTimeWatched,
                    episodeIndex: lastEpisode,
                    minutesWatched: minutesWatched
                };
                
                // Nếu đang ở t với tậập khácp đã xem, chuyển tập
                if (currentEpisode !== lastEpisode) {
                    selectEpisode(lastEpisode);
                    // Đợi video load xong rồi mới hiển thị modal (1.5 giây)
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
                // Hiển thị modal hỏi xem tiếp
                showContinueWatchingModal(minutesWatched, lastEpisode, lastTimeWatched);
                return true;
            } else if (lastTimeWatched > 10 && !isHtml5Video) {
                // YouTube video - vẫn lưu history nhưng không hiện modal
                // Set resume data để YouTube xử lý resume (nếu cần)
                window.hasResumeHistory = true;
                window.resumeTimeData = {
                    timeWatched: lastTimeWatched,
                    episodeIndex: lastEpisode,
                    minutesWatched: minutesWatched
                };
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
    modal.classList.add("active");
}

window.handleContinueWatching = function(continueWatch) {
    const modal = document.getElementById("continueWatchingModal");
    if (!modal) return;
    
    const timeWatched = parseFloat(modal.dataset.timeWatched) || 0;
    const episodeIndex = parseInt(modal.dataset.episodeIndex) || 0;
    
    // Ẩn modal
    modal.classList.remove("active");
    
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
window.showPage = async function(pageName) {
    // Nếu đang ở trang chi tiết phim và chuyển sang trang khác
    const movieDetailPage = document.getElementById("movieDetailPage");
    if (movieDetailPage && movieDetailPage.classList.contains("active") && pageName !== "movieDetail") {
        await handleMoviePageExit();
    }
    
    // Gọi hàm showPage gốc
    if (originalShowPage) {
        originalShowPage(pageName);
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

// ============================================
// YOUTUBE TIME TRACKING
// ============================================

let youTubeTimeTrackingInterval = null;

/**
 * Bắt đầu tracking thời gian YouTube video
 * Sử dụng postMessage API để giao tiếp với YouTube iframe
 */
function startYouTubeTimeTracking() {
    // Clear interval cũ nếu có
    if (youTubeTimeTrackingInterval) {
        clearInterval(youTubeTimeTrackingInterval);
    }
    
    const iframePlayer = document.getElementById("videoPlayer");
    if (!iframePlayer || !iframePlayer.src || !iframePlayer.src.includes('youtube.com/embed')) {
        return;
    }
    
    console.log("🎥 Bắt đầu tracking YouTube time...");
    
    // Thiết lập interval để polling thời gian
    youTubeTimeTrackingInterval = setInterval(function() {
        try {
            if (iframePlayer && iframePlayer.contentWindow) {
                iframePlayer.contentWindow.postMessage(
                    JSON.stringify({ 
                        event: "listening", 
                        id: Math.random().toString(36).substring(7),
                        "timestamp": Date.now()
                    }),
                    "*"
                );
            }
        } catch (e) {
            // Ignore cross-origin errors
        }
    }, 1000);
    
    // Lắng nghe message từ YouTube
    window.addEventListener('message', functionYouTubeMessageHandler);
}

let functionYouTubeMessageHandler = function(event) {
    try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Kiểm tra xem có phải từ YouTube không
        if (data && data.info && data.info.currentTime) {
            window.currentVideoTime = data.info.currentTime;
        }
    } catch (e) {
        // Ignore parse errors
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

// Biến để track trạng thái người dùng đã thoát thủ công chưa
let userHasExitedLandscape = false;

/**
 * Xử lý sự kiện xoay màn hình trên mobile và tablet
 */
function handleOrientationChange() {
    const videoContainer = document.getElementById("videoContainer");
    const customControls = document.getElementById("customControls");
    const centerOverlay = document.getElementById("centerOverlay");
    const icon = document.querySelector("#fullscreenBtn i");
    
    if (!videoContainer) return;
    
    // Kiểm tra nếu đang ở landscape mode và màn hình nhỏ (mobile + tablet)
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobileOrTablet = window.innerWidth <= 1024;
    
    if (isLandscape && isMobileOrTablet) {
        // Chỉ vào landscape mode nếu người dùng CHƯA thoát thủ công
        if (!videoContainer.classList.contains("landscape-mode") && !userHasExitedLandscape) {
            videoContainer.classList.add("landscape-mode");
            
            // Hiển thị controls
            if (customControls) {
                customControls.classList.add("show");
                customControls.style.display = "flex";
                customControls.style.opacity = "1";
            }
            if (centerOverlay) {
                centerOverlay.style.display = "flex";
                centerOverlay.style.opacity = "1";
            }
            // Update icon
            if (icon) icon.className = "fas fa-compress";
        }
    } else {
        // Thoát khỏi landscape mode - reset mọi thứ
        if (videoContainer.classList.contains("landscape-mode")) {
            videoContainer.classList.remove("landscape-mode");
            
            // Reset styles
            videoContainer.style.position = "";
            videoContainer.style.width = "";
            videoContainer.style.height = "";
            videoContainer.style.top = "";
            videoContainer.style.left = "";
            videoContainer.style.zIndex = "";
            
            // Reset controls opacity (để CSS xử lý)
            if (customControls) {
                customControls.style.opacity = "";
            }
            if (centerOverlay) {
                centerOverlay.style.opacity = "";
            }
            // Update icon
            if (icon) icon.className = "fas fa-expand";
        }
        // Reset flag khi xoay về portrait
        userHasExitedLandscape = false;
    }
}

// Lắng nghe sự kiện orientation change và resize
if (window.addEventListener) {
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
    
    // Lắng nghe sự kiện fullscreen thay đổi (browser native fullscreen)
    document.addEventListener("fullscreenchange", function() {
        const icon = document.querySelector("#fullscreenBtn i");
        if (document.fullscreenElement) {
            if (icon) icon.className = "fas fa-compress";
        } else {
            if (icon) icon.className = "fas fa-expand";
        }
    });
    document.addEventListener("webkitfullscreenchange", function() {
        const icon = document.querySelector("#fullscreenBtn i");
        if (document.webkitFullscreenElement) {
            if (icon) icon.className = "fas fa-compress";
        } else {
            if (icon) icon.className = "fas fa-expand";
        }
    });
    
    // Kiểm tra ngay khi trang load
    handleOrientationChange();
}

/**
 * Quay lại từ trang chi tiết
 */
function goBackFromDetail() {
    console.log("🔙 Đang xử lý quay lại từ Detail...");
    
    // Nếu có trang trước và không phải là trang hiện tại
    const previousPage = document.referrer;
    if (previousPage && previousPage !== window.location.href && previousPage.includes(window.location.hostname)) {
        window.history.back();
        return;
    }
    
    // Nếu history có nhiều hơn 1 trang
    if (history.length > 1) {
        history.back();
        return;
    }
    
    // Mặc định: quay về trang chủ
    showPage('home');
}

/* --- TÍNH NĂNG MỚI: PHÂN TRANG & LIÊN QUAN --- */

/**
 * Render nút chọn phiên bản (Vietsub/Thuyết minh)
 */
function renderDetailVersions(episode) {
  const container = document.getElementById("versionContainer");
  const list = document.getElementById("versionList");
  if (!container || !list) return;

  list.innerHTML = "";
  container.style.display = "none";

  if (!episode) return;

  let sources = [];
  if (episode.sources && Array.isArray(episode.sources) && episode.sources.length > 0) {
      sources = episode.sources;
  } else if (episode.videoType) {
      // Data cũ
      sources = [{ label: "Bản gốc", type: episode.videoType, source: episode.videoSource || episode.youtubeId }];
  }

  if (sources.length > 0) { // Luôn hiện nếu có source (kể cả 1 source để user biết bản gì)
      container.style.display = "block";
      const preferredLabel = localStorage.getItem("preferredSourceLabel");
      
      sources.forEach((src) => {
          const btn = document.createElement("button");
          // Logic active: Nếu label trùng preferred HOẶC (chưa có preferred và là cái đầu tiên)
          const isActive = (src.label === preferredLabel) || (!preferredLabel && sources.indexOf(src) === 0);
          
          btn.className = `btn btn-sm ${isActive ? 'btn-danger' : 'btn-outline-secondary'} text-white`;
          btn.style.minWidth = "80px";
          btn.textContent = src.label;
          
          btn.onclick = () => {
              if (src.label === preferredLabel) return; 
              
              localStorage.setItem("preferredSourceLabel", src.label);
              
              // Force save progress trước khi reload
              if (currentMovieId) {
                 const video = document.getElementById("html5Player");
                 let time = (!video.classList.contains("hidden")) ? video.currentTime : 0;
                 saveWatchProgressImmediate(currentMovieId, currentEpisode, time, 0);
              }
              
              // Reload page safely (SPA style)
              setTimeout(() => {
                  viewMovieDetail(currentMovieId);
              }, 50);
          };
          list.appendChild(btn);
      });
  }
}

/**
 * Render phần phim liên quan (Cùng tên hoặc Series)
 */
function renderRelatedParts(movie) {
  const container = document.getElementById("relatedPartsContainer");
  const list = document.getElementById("relatedPartsList");
  if (!container || !list) return;

  list.innerHTML = "";
  container.style.display = "none";
  
  if (!allMovies || allMovies.length === 0) return;

  // Lấy tên gốc (Bỏ phần số cuối: "Lật Mặt 6" -> "Lật Mặt")
  // Regex: Bỏ "Phần X", "Tập X", hoặc số ở cuối string
  let cleanName = movie.title.split(":")[0].split("-")[0].trim();
  cleanName = cleanName.replace(/(\s+)(\d+|I|II|III|IV|V)+$/i, "").trim();
  
  if (cleanName.length < 3) return; // Tên quá ngắn dễ trùng bậy

  // Lọc phim liên quan
  const related = allMovies.filter(m => 
      m.id !== movie.id && 
      m.title.toLowerCase().includes(cleanName.toLowerCase())
  );

  if (related.length > 0) {
      container.style.display = "block";
      related.forEach(m => {
          const item = document.createElement("div");
          item.className = "related-part-item";
          item.style.minWidth = "110px";
          item.style.width = "110px";
          item.style.cursor = "pointer";
          item.style.textAlign = "center";
          
          item.innerHTML = `
              <div style="position: relative; aspect-ratio: 2/3; overflow: hidden; border-radius: 8px; border: 1px solid #333; margin-bottom: 5px;">
                  <img src="${m.poster}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              </div>
              <div style="font-size: 0.8rem; line-height: 1.2; color: #ccc; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${m.title}</div>
          `;
          
          item.onclick = () => {
              showPage('watch'); 
              viewMovieDetail(m.id);
          };
          list.appendChild(item);
      });
  }
}

/**
 * Đổi trang danh sách tập
 */
function changeEpisodePage(pageIndex) {
    currentEpisodePage = parseInt(pageIndex);
    const movie = allMovies.find(m => m.id === currentMovieId);
    if (movie) renderEpisodes(movie.episodes);
}

/**
 * LOGIC TRANG GIỚI THIỆU PHIM (INTRO PAGE)
 */

let currentIntroMovieId = null;

/**
 * Hiển thị trang giới thiệu phim
 */
// Thêm tham số updateHistory = true (Mặc định là có push history)
async function viewMovieIntro(movieId, updateHistory = true) {
    currentIntroMovieId = movieId;
    console.log("🎬 Đang mở trang giới thiệu phim:", movieId, "| updateHistory:", updateHistory);

    // 1. Tải HTML nếu chưa có
    const introContainer = document.getElementById("movieIntroPage");
    if (!introContainer) {
        console.error("❌ Không tìm thấy container #movieIntroPage");
        return;
    }
    
    console.log("📄 Container innerHTML trước khi load:", introContainer.innerHTML.length, "chars");
    
    // Kiểm tra xem đã load chưa, nếu chưa thì load
    if (introContainer.innerHTML.trim().length < 10) {
        console.log("📥 Đang load intro.html...");
        await loadComponent("movieIntroPage", "./components/intro.html");
        console.log("✅ Đã load intro.html, container content length:", document.getElementById("movieIntroPage")?.innerHTML.length);
    
    // Gán sự kiện cho nút quay lại sau khi load HTML
    setTimeout(() => {
        const backBtn = document.getElementById('introBackBtn');
        if (backBtn) {
            backBtn.onclick = function(e) {
                e.preventDefault();
                goBackFromIntro();
            };
            console.log("✅ Đã gán sự kiện cho nút quay lại");
        }
    }, 100);
    } else {
        console.log("✅ Intro.html đã được load sẵn");
    }

    // 2. Lấy dữ liệu phim
    console.log("🔍 Tìm phim trong allMovies, số lượng:", allMovies.length);
    let movie = allMovies.find((m) => m.id === movieId);
    console.log("🔍 Phim tìm thấy trong allMovies:", movie ? movie.title : "KHÔNG TÌM THẤY");
    
    if (!movie && db) {
        try {
            console.log("🔍 Đang tìm trong Firestore...");
            const doc = await db.collection("movies").doc(movieId).get();
            if (doc.exists) {
                movie = { id: doc.id, ...doc.data() };
                console.log("✅ Tìm thấy trong Firestore:", movie.title);
            }
        } catch (e) {
            console.error("❌ Lỗi Firestore:", e);
        }
    }

    if (!movie) {
        showNotification("Không tìm thấy phim!", "error");
        console.error("❌ KHÔNG TÌM THẤY PHIM với ID:", movieId);
        return;
    }

    console.log("✅ Đang hiển thị thông tin phim:", movie.title);

    // 3. Populate dữ liệu vào giao diện Intro
    
    // -- Background & Poster
    const bgImage = document.getElementById("introBgImage");
    const poster = document.getElementById("introPoster");
    // Nếu có ảnh nền riêng thì dùng, không thì dùng Poster, hoặc ảnh mặc định
    const bgUrl = movie.backgroundUrl || movie.posterUrl || "https://placehold.co/1920x1080/1a1a1a/FFF";
    
    if (bgImage) bgImage.style.backgroundImage = `url('${bgUrl}')`;
    if (poster) poster.src = movie.posterUrl;

    // -- Info Basic
    setTextContent("introTitle", movie.title);
    setTextContent("introYear", movie.year || "2024");
    setTextContent("introDuration", movie.duration || "N/A");
    setTextContent("introAge", movie.ageLimit || "T13");
    setTextContent("introQuality", movie.quality || "HD");
    setTextContent("introCountry", movie.country || "Quốc tế");
    setTextContent("introCategory", movie.category || "Phim lẻ");
    setTextContent("introRating", movie.rating || "N/A");
    
    // -- Info New Fields (Cast, Version)
    setTextContent("introCast", movie.cast || "Đang cập nhật...");
    setTextContent("introCast", movie.cast || "Đang cập nhật...");
    
    // -- Versions (Dynamic Buttons)
    const versionContainer = document.getElementById("introVersionList");
    if (versionContainer) {
        versionContainer.innerHTML = "";
        let sources = [];
        
        // Lấy sources từ tập đầu tiên (giả định các tập giống nhau về versions)
        if (movie.episodes && movie.episodes.length > 0) {
            const firstEp = movie.episodes[0];
            if (firstEp.sources && Array.isArray(firstEp.sources) && firstEp.sources.length > 0) {
                sources = firstEp.sources;
            } else {
                // Dữ liệu cũ -> Coi là Mặc định
                 sources = [{ label: "Mặc định", type: "mixed", source: "" }];
            }
        }
        
        if (sources.length === 0) {
             versionContainer.innerHTML = '<span class="info-value">Đang cập nhật...</span>';
        } else {
            // Render buttons
            sources.forEach((src, index) => {
                const btn = document.createElement("button");
                btn.className = "btn btn-sm btn-outline-light version-btn";
                btn.style.marginRight = "5px";
                btn.style.marginBottom = "5px";
                btn.textContent = src.label;
                btn.onclick = () => selectIntroVersion(src.label, index);
                versionContainer.appendChild(btn);
            });
            
            // Chọn mặc định (ưu tiên cái đã lưu)
            const savedLabel = localStorage.getItem("preferredSourceLabel");
            let defaultIndex = sources.findIndex(s => s.label === savedLabel);
            if (defaultIndex === -1) defaultIndex = 0;
            
            // Delay 1 chút để đảm bảo DOM đã render
            setTimeout(() => {
                selectIntroVersion(sources[defaultIndex].label, defaultIndex);
            }, 50);
        }
    }
    
    // -- Description
    setTextContent("introDesc", movie.description || "Chưa có mô tả cho bộ phim này.");

    // -- Tags
    const tagsContainer = document.getElementById("introTags");
    if (tagsContainer) {
        tagsContainer.innerHTML = (movie.tags || [])
            .map(tag => `<span class="intro-tag">${tag}</span>`)
            .join("");
    }

    // -- Nút Like (Update trạng thái)
    updateIntroLikeButton(movieId);

    // 4. Load Bình luận Intro
    loadIntroComments(movieId);

    // 5. Chuyển trang
    console.log("📌 Đang gọi showPage('movieIntro')...");
    showPage("movieIntro");
    
    // Thay đổi URL sử dụng History API (Chỉ làm khi updateHistory = true)
    if (movie && movie.title && updateHistory) {
        const slug = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const newUrl = `/intro/${slug}-${movieId}`;
        history.pushState({ movieId: movieId, page: 'intro' }, movie.title, newUrl);
        console.log("✅ Đã thay đổi URL thành:", newUrl);
    }
    
    // Kiểm tra xem page đã active chưa
    const movieIntroPage = document.getElementById("movieIntroPage");
    console.log("📌 movieIntroPage class:", movieIntroPage?.className);
    console.log("✅ Đã chuyển sang trang movieIntro");
    
    // Cuộn lên đầu
    window.scrollTo(0, 0);
}

/**
 * Hàm hỗ trợ gán text an toàn
 */
function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

/**
 * Xử lý nút "Xem Ngay" từ Intro
 */
function playMovieFromIntro() {
    if (currentIntroMovieId) {
        // Thay đổi URL trước khi chuyển trang
        const movie = allMovies.find(m => m.id === currentIntroMovieId);
        if (movie) {
            const slug = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const newUrl = `/watch/${slug}-${currentIntroMovieId}`;
            history.pushState({ movieId: currentIntroMovieId, page: 'watch' }, movie.title, newUrl);
        }
        
        // Lưu phiên bản đã chọn (nếu có)
        const selectedBtn = document.querySelector(".version-btn.active");
        if (selectedBtn) {
            localStorage.setItem("preferredSourceLabel", selectedBtn.textContent);
        }

        // Chuyển sang trang Detail/Player cũ
        viewMovieDetail(currentIntroMovieId);
    }
}

/**
 * Chọn phiên bản phim (Vietsub/Thuyết minh)
 */
function selectIntroVersion(label, index) {
    const mapLabel = label || ""; // Fallback nếu label null
    
    // Update UI
    const buttons = document.querySelectorAll(".version-btn");
    buttons.forEach(btn => {
        if (btn.textContent === mapLabel) btn.classList.add("active", "btn-primary");
        else {
            btn.classList.remove("active", "btn-primary");
            // btn.classList.add("btn-outline-light"); // Giữ style cũ
        }
    });
    
    console.log("🎬 Đã chọn phiên bản:", mapLabel);
    localStorage.setItem("preferredSourceLabel", mapLabel);
}

/**
 * Xử lý nút "Yêu thích" từ Intro
 */
async function toggleFavoriteFromIntro() {
    if (!currentUser) {
        showNotification("Vui lòng đăng nhập để lưu phim!", "warning");
        return;
    }
    if (currentIntroMovieId) {
        await toggleFavorite(currentIntroMovieId);
        updateIntroLikeButton(currentIntroMovieId);
    }
}

/**
 * Cập nhật giao diện nút Like tại Intro
 */
function updateIntroLikeButton(movieId) {
    const btn = document.getElementById("introLikeBtn");
    if (!btn) return;

    let isLiked = false;
    if (currentUser && currentUser.favorites) {
        isLiked = currentUser.favorites.includes(movieId);
    }

    if (isLiked) {
        btn.innerHTML = '<i class="fas fa-check"></i> Đã thích';
        btn.classList.add("btn-success"); // Xanh hoặc đỏ tùy theme
    } else {
        btn.innerHTML = '<i class="far fa-heart"></i> Yêu thích';
        btn.classList.remove("btn-success");
    }
}

/**
 * Chia sẻ phim
 */
function shareMovieIntro() {
    // Tạo link (Giả lập, thực tế cần routing server-side hoặc hash)
    const url = window.location.origin + "?movie=" + currentIntroMovieId;
    
    navigator.clipboard.writeText(url).then(() => {
        showNotification("Đã copy link phim!", "success");
    }).catch(() => {
        showNotification("Lỗi copy link", "error");
    });
}

/**
 * Load bình luận cho trang Intro
 * (Tái sử dụng logic comments của detail.js nhưng render vào chỗ khác)
 */
async function loadIntroComments(movieId) {
    const container = document.getElementById("introCommentsContainer");
    if (!container) return;

    // Reset
    container.innerHTML = '<div class="text-center text-muted">Đang tải bình luận...</div>';

    // Copy lại form bình luận từ Detail (nếu muốn) hoặc chỉ hiện danh sách
    // Ở đây ta sẽ clone lại Logic load comment từ Database
    // VÌ logic comment khá phức tạp, ta có thể gọi hàm loadComments(movieId) của detail.js 
    // NHƯNG cần sửa hàm đó để target đúng container.
    // -> GIẢI PHÁP: Ta sẽ Insert HTML Comment Form vào introCommentsContainer rồi gọi hàm cũ.
    
    const commentHTML = `
        <div class="comment-form" id="introCommentForm">
            <div class="rating-input">
                <label>Đánh giá:</label>
                <div class="rating-stars" id="introRatingStars">
                    <i class="fas fa-star" data-value="1"></i>
                    <i class="fas fa-star" data-value="2"></i>
                    <i class="fas fa-star" data-value="3"></i>
                    <i class="fas fa-star" data-value="4"></i>
                    <i class="fas fa-star" data-value="5"></i>
                </div>
            </div>
            <textarea class="form-textarea" id="introCommentContent" placeholder="Viết cảm nghĩ của bạn về phim này..."></textarea>
            <button class="btn btn-primary" style="margin-top:10px;" onclick="submitIntroComment()">Gửi bình luận</button>
        </div>
        <div id="introCommentsList" class="comments-list"></div>
    `;
    
    container.innerHTML = commentHTML;
    
    // Init Star Rating cho Intro
    initStarRating("introRatingStars");
    
    // Load list comment
    await loadCommentsToContainer(movieId, "introCommentsList");
}

/**
 * Hàm mới: Load comments vào container cụ thể (Tách từ detail.js nếu cần)
 * Tạm thời ta dùng lại hàm loadComments của detail.js nhưng cần override ID 
 * -> Để đơn giản, ta sẽ copy logic loadComments sang đây và sửa ID target.
 */
async function loadCommentsToContainer(movieId, targetId) {
    if (!db) return;
    const list = document.getElementById(targetId);
    
    try {
        const snapshot = await db.collection("comments")
            .where("movieId", "==", movieId)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();

        if (snapshot.empty) {
            list.innerHTML = '<p class="text-muted">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
            return;
        }

        list.innerHTML = snapshot.docs.map(doc => {
            const c = doc.data();
            const date = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : "";
            // Stars
            const stars = Array(5).fill(0).map((_, i) => 
                `<i class="fas fa-star ${i < c.rating ? 'text-warning' : 'text-muted'}"></i>`
            ).join("");
            
            return `
                <div class="comment-item">
                    <div class="comment-header">
                        <strong>${c.userName}</strong>
                        <span class="comment-stars">${stars}</span>
                        <small class="text-muted ml-auto">${date}</small>
                    </div>
                    <div class="comment-body">${c.content}</div>
                </div>
            `;
        }).join("");
        
    } catch (e) {
        console.error("Lỗi load comment intro:", e);
        list.innerHTML = "Lỗi tải bình luận.";
    }
}

/**
 * Gửi comment từ Intro
 */
async function submitIntroComment() {
    const content = document.getElementById("introCommentContent").value;
    // Lấy rating từ UI (cần biến global hoặc DOM check class active)
    // Giả sử ta dùng biến global currentRating (của detail.js) hoặc check DOM
    const stars = document.querySelectorAll("#introRatingStars .fa-star.active");
    const rating = stars.length || 5; 

    if (!content.trim()) {
        showNotification("Vui lòng nhập nội dung!", "warning");
        return;
    }
    
    await submitCommentData(currentIntroMovieId, content, rating);
    
    // Reload
    loadCommentsToContainer(currentIntroMovieId, "introCommentsList");
    document.getElementById("introCommentContent").value = "";
    showNotification("Đã gửi bình luận!", "success");
}

// Logic Star Rating riêng cho Intro
function initStarRating(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    const stars = container.querySelectorAll(".fa-star");
    stars.forEach((star, index) => {
        star.onclick = () => {
            // Reset hết
            stars.forEach(s => s.classList.remove("active", "text-warning"));
            // Active đến index chọn
            for(let i=0; i<=index; i++) {
                stars[i].classList.add("active", "text-warning");
            }
        };
    });
}

/**
 * Quay lại từ trang giới thiệu
 */
function goBackFromIntro() {
    console.log("🔙 Đang xử lý nút quay lại...");
    console.log("🔙 History length:", history.length);
    console.log("🔙 Referrer:", document.referrer);
    
    // Kiểm tra xem có URL trước đó không
    const previousPage = document.referrer;
    
    // Nếu có trang trước và không phải là trang hiện tại
    if (previousPage && previousPage !== window.location.href && previousPage.includes(window.location.hostname)) {
        console.log("🔙 Quay lại trang trước:", previousPage);
        window.history.back();
        return;
    }
    
    // Nếu history có nhiều hơn 1 trang
    if (history.length > 1) {
        console.log("🔙 Dùng history.back()");
        history.back();
        return;
    }
    
    // Mặc định: quay về trang chủ
    console.log("🔙 Về trang chủ");
    showPage('home');
}

// Đảm bảo nút quay lại được gán sự kiện
function setupBackButton() {
    const backBtn = document.getElementById('introBackBtn');
    if (backBtn) {
        backBtn.onclick = function(e) {
            e.preventDefault();
            goBackFromIntro();
        };
    }
}

// ============================================
// SAMPLE DATA (Dữ liệu mẫu khi chưa có Firebase)
// ============================================
const SAMPLE_CATEGORIES = [
  { id: "action", name: "Hành động", slug: "hanh-dong" },
  { id: "comedy", name: "Hài hước", slug: "hai-huoc" },
  { id: "horror", name: "Kinh dị", slug: "kinh-di" },
  { id: "romance", name: "Tình cảm", slug: "tinh-cam" },
  { id: "scifi", name: "Khoa học viễn tưởng", slug: "khoa-hoc-vien-tuong" },
  { id: "animation", name: "Hoạt hình", slug: "hoat-hinh" },
  { id: "drama", name: "Chính kịch", slug: "chinh-kich" },
  { id: "thriller", name: "Giật gân", slug: "giat-gan" },
];

const SAMPLE_COUNTRIES = [
  { id: "vn", name: "Việt Nam", code: "VN" },
  { id: "us", name: "Mỹ", code: "US" },
  { id: "kr", name: "Hàn Quốc", code: "KR" },
  { id: "jp", name: "Nhật Bản", code: "JP" },
  { id: "cn", name: "Trung Quốc", code: "CN" },
  { id: "th", name: "Thái Lan", code: "TH" },
  { id: "uk", name: "Anh", code: "UK" },
  { id: "fr", name: "Pháp", code: "FR" },
];

const SAMPLE_MOVIES = [
  {
    id: "movie1",
    title: "Người Nhện: Du Hành Vũ Trụ",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    description: "Miles Morales trở lại trong cuộc phiêu lưu xuyên đa vũ trụ...",
    price: 15,
    status: "public",
    category: "Hoạt hình",
    country: "Mỹ",
    year: 2023,
    views: 15420,
    rating: 9.2,
    episodes: [],
    createdAt: new Date("2024-01-15"),
  }
];

/**
 * Danh sách diễn viên (Actors) kèm Caching
 */
async function loadActors(remoteTimestamp) {
  try {
    const localTS = getCacheTimestamp("actors");
    
    // Nếu có timestamp hợp lệ và remote khớp với local -> Load từ cache
    if (remoteTimestamp && localTS === remoteTimestamp) {
        const cached = loadFromCache("actors");
        if (cached) {
            allActors = cached;
            console.log("📦 Loaded Actors from Cache (0 reads)");
            return;
        }
    }

    // Nếu không có cache hoặc data đã cũ -> Fetch từ Firestore
    const snapshot = await db.collection("actors").get();
    allActors = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    // Lưu lại cache và cập nhật timestamp local
    saveToCache("actors", allActors);
    if (remoteTimestamp) setCacheTimestamp("actors", remoteTimestamp);
    console.log("🌐 Fetched Actors from Firestore");

  } catch (error) {
    console.error("Lỗi load diễn viên:", error);
    allActors = [];
  }
}

let currentSyncData = null; // Lưu trữ timestamp hiện tại để so sánh

/**
 * Load dữ liệu ban đầu kèm theo cơ chế Metadata Sync Caching
 */
async function loadInitialData() {
  try {
    console.log("🔄 Đang kiểm tra Metadata Sync...");
    
    // 1. Đọc document sync để kiểm tra thay đổi
    if (db) {
        try {
            const syncDoc = await db.collection("configs").doc("sync").get();
            if (syncDoc.exists) {
                currentSyncData = syncDoc.data();
            } else {
                console.log("ℹ️ configs/sync chưa tồn tại, sẽ khởi tạo sau khi load.");
            }
        } catch (e) {
            console.warn("⚠️ Không thể đọc configs/sync, chuyển sang mode load mặc định.", e);
        }
    }

    // 2. Chạy load song song các collection
    await Promise.all([
      loadCategories(currentSyncData?.categories),
      loadCountries(currentSyncData?.countries),
      loadMovies(currentSyncData?.movies),
      loadActors(currentSyncData?.actors)
    ]);

    // Populate filter dropdowns
    populateFilters();
    
    // Cập nhật watch progress nếu đã đăng nhập
    if (currentUser) {
      await updateAllWatchProgress();
    }

    // 3. Nếu Admin chưa tạo sync doc, hãy tạo nó
    if (db && !currentSyncData && (typeof isAdmin !== 'undefined' && isAdmin)) {
        initializeSyncConfig();
    }

    // 4. Kích hoạt listener để nhận cập nhật real-time từ Admin mà không cần F5
    startMetadataSyncListener();

  } catch (error) {
    console.error("Lỗi load dữ liệu:", error);
  }
}

/**
 * Lắng nghe thay đổi Metadata từ Admin để cập nhật cache và UI tức thì
 */
function startMetadataSyncListener() {
    if (!db) return;
    
    // Đăng ký listener trên document sync
    db.collection("configs").doc("sync").onSnapshot(snapshot => {
        if (!snapshot.exists) return;
        
        const newData = snapshot.data();
        
        // Nếu đây là lần đầu (snapshot lúc vừa gán listener), bỏ qua vì loadInitialData đã làm rồi
        if (!currentSyncData) {
            currentSyncData = newData;
            return;
        }

        // So sánh timestamp để biết collection nào cần load lại
        
        // 1. Phim & Tập phim
        if (newData.movies !== currentSyncData.movies) {
            console.log("🔔 [Sync] Phát hiện dữ liệu Phim thay đổi, đang cập nhật...");
            loadMovies(newData.movies).then(() => {
                // Cập nhật UI Home nếu đang ở Home
                if (typeof renderMovies === 'function') renderMovies();
                // Cập nhật UI Admin nếu đang mở Admin
                if (typeof renderAdminMoviesList === 'function' && typeof allMovies !== 'undefined') {
                    renderAdminMoviesList(allMovies);
                }
                // Cập nhật trang chi tiết nếu đang xem phim đó
                if (typeof currentMovieId !== 'undefined' && currentMovieId) {
                    const updatedMovie = allMovies.find(m => m.id === currentMovieId);
                    if (updatedMovie && typeof updateDetailRedesignUI === 'function') {
                        updateDetailRedesignUI(updatedMovie);
                        console.log("✅ [Sync] Đã cập nhật thông tin phim lên màn hình.");
                    }
                }
            });
        }

        // 2. Diễn viên
        if (newData.actors !== currentSyncData.actors) {
            console.log("🔔 [Sync] Phát hiện dữ liệu Diễn viên thay đổi...");
            loadActors(newData.actors).then(() => {
                if (typeof renderAdminActors === 'function') renderAdminActors();
                if (typeof renderActorsPage === 'function') renderActorsPage();
            });
        }

        // 3. Thể loại & Quốc gia
        if (newData.categories !== currentSyncData.categories || newData.countries !== currentSyncData.countries) {
            console.log("🔔 [Sync] Phát hiện Thể loại/Quốc gia thay đổi...");
            Promise.all([
                loadCategories(newData.categories),
                loadCountries(newData.countries)
            ]).then(() => {
                populateFilters();
                if (typeof populateAdminMovieFilters === 'function') populateAdminMovieFilters();
                if (typeof renderAdminCountries === 'function') renderAdminCountries();
            });
        }

        // Cập nhật timestamp hiện tại
        currentSyncData = newData;
    }, error => {
        console.error("❌ [Sync] Lỗi Listener:", error);
    });
}

/**
 * Khởi tạo document sync mặc định (Admin only)
 */
async function initializeSyncConfig() {
    if (!db) return;
    try {
        const now = Date.now();
        await db.collection("configs").doc("sync").set({
            movies: now,
            actors: now,
            categories: now,
            countries: now,
            lastUpdated: now
        });
        console.log("✅ Đã khởi tạo configs/sync");
    } catch (e) {
        console.error("Lỗi khởi tạo sync config:", e);
    }
}
/**
 * Load danh sách thể loại kèm Caching
 */
async function loadCategories(remoteTimestamp) {
  try {
    const localTS = getCacheTimestamp("categories");
    if (remoteTimestamp && localTS === remoteTimestamp) {
        const cached = loadFromCache("categories");
        if (cached) {
            allCategories = cached;
            console.log("📦 Loaded Categories from Cache (0 reads)");
            return;
        }
    }

    if (db) {
      const snapshot = await db.collection("categories").get();
      if (!snapshot.empty) {
        allCategories = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        saveToCache("categories", allCategories);
        if (remoteTimestamp) setCacheTimestamp("categories", remoteTimestamp);
        console.log("🌐 Fetched Categories from Firestore");
      } else {
        allCategories = SAMPLE_CATEGORIES;
        await initializeSampleCategories();
      }
    } else {
      allCategories = SAMPLE_CATEGORIES;
    }
  } catch (error) {
    console.error("Lỗi load categories:", error);
    allCategories = SAMPLE_CATEGORIES;
  }
}
/**
 * Load danh sách quốc gia kèm Caching
 */
async function loadCountries(remoteTimestamp) {
  try {
    const localTS = getCacheTimestamp("countries");
    if (remoteTimestamp && localTS === remoteTimestamp) {
        const cached = loadFromCache("countries");
        if (cached) {
            allCountries = cached;
            console.log("📦 Loaded Countries from Cache (0 reads)");
            return;
        }
    }

    if (db) {
      const snapshot = await db.collection("countries").get();
      if (!snapshot.empty) {
        allCountries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        saveToCache("countries", allCountries);
        if (remoteTimestamp) setCacheTimestamp("countries", remoteTimestamp);
        console.log("🌐 Fetched Countries from Firestore");
      } else {
        allCountries = SAMPLE_COUNTRIES;
        await initializeSampleCountries();
      }
    } else {
      allCountries = SAMPLE_COUNTRIES;
    }
  } catch (error) {
    console.error("Lỗi load countries:", error);
    allCountries = SAMPLE_COUNTRIES;
  }
}

/**
 * Load danh sách phim kèm Caching
 */
async function loadMovies(remoteTimestamp) {
  try {
    const localTS = getCacheTimestamp("movies");
    if (remoteTimestamp && localTS === remoteTimestamp) {
        const cached = loadFromCache("movies");
        if (cached) {
            allMovies = cached;
            console.log("📦 Loaded Movies from Cache (0 reads)");
            renderAllInitialMovies(); // Chạy hàm render
            return;
        }
    }

    if (db) {
      const snapshot = await db
        .collection("movies")
        .where("status", "==", "public")
        .orderBy("createdAt", "desc")
        .get();

      if (!snapshot.empty) {
        allMovies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        saveToCache("movies", allMovies);
        if (remoteTimestamp) setCacheTimestamp("movies", remoteTimestamp);
        console.log(`🌐 Fetched ${allMovies.length} Movies from Firestore`);
      } else {
        allMovies = SAMPLE_MOVIES;
        await initializeSampleMovies();
      }
    } else {
      allMovies = SAMPLE_MOVIES;
    }

    renderAllInitialMovies();

  } catch (error) {
    console.error("Lỗi load movies:", error);
    allMovies = SAMPLE_MOVIES;
    renderAllInitialMovies();
  }
}

/**
 * Hàm gom nhóm các lệnh render phim ban đầu
 */
function renderAllInitialMovies() {
    renderFeaturedMovies();
    renderNewMovies();
    renderAllMovies();
    renderCountrySections();
    renderBannerSlider();
}

/**
 * Khởi tạo sample categories trong Firestore
 */
async function initializeSampleCategories() {
  if (!db) return;

  try {
    const batch = db.batch();
    SAMPLE_CATEGORIES.forEach((cat) => {
      const ref = db.collection("categories").doc(cat.id);
      batch.set(ref, cat);
    });
    await batch.commit();
    console.log("✅ Đã khởi tạo sample categories");
  } catch (error) {
    console.error("Lỗi khởi tạo categories:", error);
  }
}

/**
 * Khởi tạo sample countries trong Firestore
 */
async function initializeSampleCountries() {
  if (!db) return;

  try {
    const batch = db.batch();
    SAMPLE_COUNTRIES.forEach((country) => {
      const ref = db.collection("countries").doc(country.id);
      batch.set(ref, country);
    });
    await batch.commit();
    console.log("✅ Đã khởi tạo sample countries");
  } catch (error) {
    console.error("Lỗi khởi tạo countries:", error);
  }
}

/**
 * Khởi tạo sample movies trong Firestore
 */
async function initializeSampleMovies() {
  if (!db) return;

  try {
    const batch = db.batch();
    SAMPLE_MOVIES.forEach((movie) => {
      const ref = db.collection("movies").doc(movie.id);
      batch.set(ref, {
        ...movie,
        createdAt: firebase.firestore.Timestamp.fromDate(movie.createdAt),
      });
    });
    await batch.commit();
    console.log("✅ Đã khởi tạo sample movies");
  } catch (error) {
    console.error("Lỗi khởi tạo movies:", error);
  }
}

/**
 * Cập nhật thanh watch progress cho tất cả phim đã xem
 * Gọi hàm này sau khi đăng nhập và sau khi load movies
 */
async function updateAllWatchProgress() {
  if (!currentUser || !db) {
    console.log("⏳ updateAllWatchProgress: Chưa đăng nhập hoặc chưa có DB");
    return;
  }
  
  if (!allMovies || allMovies.length === 0) {
    console.log("⏳ updateAllWatchProgress: Chưa có movies");
    return;
  }
  
  try {
    // Lấy tất cả watch progress của user từ collection "watchProgress" (có duration chính xác)
    const snapshot = await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("watchProgress")
      .get();
    
    if (snapshot.empty) {
      console.log("⏳ updateAllWatchProgress: Không có watch progress");
      return;
    }
    
    console.log("📊 Tìm thấy", snapshot.size, "watch progress từ Firestore");
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const movieId = data.movieId;
      const percentage = data.percentage || 0;
      const currentTime = data.currentTime || 0;
      const duration = data.duration || 0;
      
      // Chỉ hiển thị thanh progress khi đã xem > 0
      if (percentage <= 0 && currentTime <= 0) return;
      
      // Sử dụng percentage từ watchProgress (đã tính dựa trên duration thực tế của video)
      // Nếu không có thì tính lại từ movie data
      let finalPercentage = percentage;
      
      if (finalPercentage <= 0 && currentTime > 0) {
        const movie = allMovies.find(m => m.id === movieId);
        if (movie && movie.duration) {
          const durationMinutes = parseInt(movie.duration.replace(/\D/g, '')) || 60;
          finalPercentage = Math.min(Math.round((currentTime / 60 / durationMinutes) * 100), 100);
        }
      }
      
      console.log(`🎬 MovieID: ${movieId}, Time: ${Math.round(currentTime)}s, Duration: ${Math.round(duration)}s, Percentage: ${finalPercentage}%`);
      
      updateMovieProgressUI(movieId, finalPercentage);
    });
    
    console.log("✅ Hoàn tất cập nhật watch progress");
  } catch (error) {
    console.error("Lỗi cập nhật watch progress:", error);
  }
}

/**
 * Cập nhật UI progress bar cho một phim cụ thể
 * @param {string} movieId - ID của phim
 * @param {number} percentage - Phần trăm đã xem (0-100)
 */
function updateMovieProgressUI(movieId, percentage) {
  if (!movieId || percentage <= 0) return;
  
  // Tìm progress bar
  const progressBar = document.getElementById(`progress-${movieId}`);
  if (!progressBar) return;
  
  const bar = progressBar.querySelector('.watch-progress-bar');
  if (!bar) return;
  
  // Cập nhật width
  bar.style.width = `${percentage}%`;
  progressBar.style.display = 'block';
  
  // Thêm class has-watched
  const movieCard = progressBar.closest('.movie-card');
  if (movieCard) {
    movieCard.classList.add('has-watched');
  }
  
  console.log(`✅ Đã cập nhật progress UI cho ${movieId}: ${percentage}%`);
}
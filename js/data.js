/**
 * Load dữ liệu ban đầu
 */
async function loadInitialData() {
  try {
    // Load categories
    await loadCategories();

    // Load countries
    await loadCountries();

    // Load movies
    await loadMovies();

    // Populate filter dropdowns
    populateFilters();
  } catch (error) {
    console.error("Lỗi load dữ liệu:", error);
  }
}
/**
 * Load danh sách thể loại
 */
async function loadCategories() {
  try {
    if (db) {
      const snapshot = await db.collection("categories").get();
      if (!snapshot.empty) {
        allCategories = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } else {
        // Sử dụng sample data và tạo trong Firestore
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
 * Load danh sách quốc gia
 */
async function loadCountries() {
  try {
    if (db) {
      const snapshot = await db.collection("countries").get();
      if (!snapshot.empty) {
        allCountries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
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
 * Load danh sách phim
 */
async function loadMovies() {
  try {
    if (db) {
      const snapshot = await db
        .collection("movies")
        .where("status", "==", "public")
        .orderBy("createdAt", "desc")
        .get();

      if (!snapshot.empty) {
        allMovies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } else {
        allMovies = SAMPLE_MOVIES;
        await initializeSampleMovies();
      }
    } else {
      allMovies = SAMPLE_MOVIES;
    }

    // Render movies
    renderFeaturedMovies();
    renderNewMovies();
    renderAllMovies();
  } catch (error) {
    console.error("Lỗi load movies:", error);
    allMovies = SAMPLE_MOVIES;
    renderFeaturedMovies();
    renderNewMovies();
    renderAllMovies();
  }
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

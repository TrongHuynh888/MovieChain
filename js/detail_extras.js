
/* --- TÍNH NĂNG MỚI: PHÂN TRANG & LIÊN QUAN --- */
let currentEpisodePage = 0;
const EPISODES_PER_PAGE = 10;

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
              
              // Reload page
              setTimeout(() => location.reload(), 100);
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

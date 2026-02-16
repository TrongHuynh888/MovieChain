/**
 * WATCH PARTY MODULE (MASTER VERSION - INTERNET READY)
 * - Đã tích hợp sẵn API Key Metered của bạn để xuyên tường lửa 4G/Wifi
 * - Fix triệt để lỗi Mic/Loa và Avatar
 */

let currentRoomId = null;
let roomUnsubscribe = null;
let chatUnsubscribe = null;
let membersUnsubscribe = null;
let player = null;
let isHost = false;
let lastSyncTime = 0;
const SYNC_THRESHOLD = 2;
let latestRoomData = null;

// --- VOICE CHAT VARIABLES ---
let myPeer = null;
let myStream = null;
let peers = {};
let isMicEnabled = false; // Mặc định tắt Mic
let globalAudioContext = null;

// QUẢN LÝ ÂM THANH
let isDeafened = false; // Mặc định nghe được
let localMutedPeers = new Set();

// API KEY CỦA BẠN (Đã điền sẵn)
const METERED_API_KEY = "XdPnoCY8k0fnWLdeEczCipMdUx8zgEbQHbdbjyKMPVgNNQYk";
const APP_NAME = "moviechain";

// ==========================================
// 1. MODULE LOADER
// ==========================================
async function initWatchPartyModule() {
  console.log("🚀 Đang tải module Watch Party (Internet Version)...");

  if (!document.getElementById("watchPartyPage")) {
    try {
      const response = await fetch("./components/watch-party.html");
      if (!response.ok) throw new Error("Không tìm thấy file giao diện");
      const html = await response.text();
      document
        .getElementById("mainContent")
        .insertAdjacentHTML("beforeend", html);
    } catch (error) {
      console.error("Lỗi tải Watch Party:", error);
      return;
    }
  }

  const navMenu = document.getElementById("navMenu");
  if (!navMenu.querySelector('[data-page="watchParty"]')) {
    const link = document.createElement("a");
    link.href = "#";
    link.className = "nav-link";
    link.dataset.page = "watchParty";
    link.innerHTML = '<i class="fas fa-users"></i> Xem Chung';
    link.onclick = (e) => {
      e.preventDefault();
      loadRooms();
      showPage("watchParty");
    };
    const adminLink = document.getElementById("adminNavLink");
    navMenu.insertBefore(link, adminLink);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const inviteRoomId = urlParams.get("room");
  if (inviteRoomId) {
    setTimeout(() => {
      showPage("watchParty");
      joinRoom(inviteRoomId, "public");
    }, 2000);
  }
}

initWatchPartyModule();

// ==========================================
// 2. CORE LOGIC (ROOMS)
// ==========================================
async function loadRooms() {
  const container = document.getElementById("roomList");
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const snapshot = await db
      .collection("watchRooms")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    container.innerHTML = "";
    if (snapshot.empty) {
      container.innerHTML =
        '<p class="text-center text-muted">Chưa có phòng nào. Hãy tạo phòng mới!</p>';
      return;
    }

    snapshot.forEach((doc) => {
      const room = doc.data();
      const isPrivate = room.type === "private";
      const count = room.memberCount || 0;

      let deleteBtn = "";
      if (currentUser && (currentUser.uid === room.hostId || isAdmin)) {
        deleteBtn = `<button class="btn-delete-room" onclick="event.stopPropagation(); deleteRoom('${doc.id}', '${room.hostId}')"><i class="fas fa-trash"></i></button>`;
      }

      const html = `
                <div class="card" style="position:relative; min-height: 180px; display:flex; flex-direction:column; justify-content:space-between;">
                    ${deleteBtn}
                    <div class="card-body">
                        <div class="mb-2" style="display:flex; align-items:center; gap:10px;">
                            <span class="status-badge active" style="background:#e50914">LIVE</span>
                            ${isPrivate ? '<i class="fas fa-lock text-warning"></i>' : '<i class="fas fa-globe-asia text-success"></i>'}
                        </div>
                        <h4 style="margin-bottom:5px; font-size:16px; padding-right: 25px;">${room.name}</h4>
                        <p class="text-muted" style="font-size:13px; margin-bottom:10px;">
                            <i class="fas fa-film"></i> ${room.movieTitle}
                        </p>
                        <div class="flex-between" style="margin-top:auto;">
                            <span class="text-muted" style="font-size:12px"><i class="fas fa-user"></i> ${count} người</span>
                            <button class="btn btn-primary btn-sm" onclick="joinRoom('${doc.id}', '${room.type}')">Vào xem <i class="fas fa-sign-in-alt"></i></button>
                        </div>
                    </div>
                </div>`;
      container.innerHTML += html;
    });
  } catch (error) {
    console.error("Lỗi load phòng:", error);
  }
}

async function deleteRoom(roomId, hostId) {
  if (!currentUser) return;
  const isOwner = currentUser.uid === hostId;
  if (!isOwner && !isAdmin) {
    showNotification("Bạn không có quyền xóa phòng này!", "error");
    return;
  }
  if (!confirm("⚠️ BẠN CÓ CHẮC MUỐN GIẢI TÁN PHÒNG NÀY?")) return;
  try {
    showLoading(true);
    await db.collection("watchRooms").doc(roomId).delete();
    showNotification("Đã giải tán phòng!", "success");
    loadRooms();
  } catch (error) {
    console.error(error);
  } finally {
    showLoading(false);
  }
}

function openCreateRoomModal() {
  if (!currentUser) {
    showNotification("Vui lòng đăng nhập!", "warning");
    openAuthModal();
    return;
  }
  document.getElementById("roomNameInput").value = "";
  document.getElementById("roomPassword").value = "";
  document.getElementById("roomType").value = "public";
  toggleRoomPass();

  let allowedMovies = [];
  if (isAdmin || (currentUser && currentUser.isVip === true)) {
    allowedMovies = allMovies;
  } else {
    const purchased = currentUser.purchasedMovies || [];
    allowedMovies = allMovies.filter((movie) => {
      return !movie.price || movie.price === 0 || purchased.includes(movie.id);
    });
  }

  const uniqueMovies = [
    ...new Map(allowedMovies.map((item) => [item.id, item])).values(),
  ];
  const select = document.getElementById("roomMovieSelect");
  select.innerHTML =
    uniqueMovies.length === 0
      ? '<option value="">-- Bạn chưa sở hữu phim nào --</option>'
      : '<option value="">-- Chọn phim --</option>' +
        uniqueMovies
          .map((m) => `<option value="${m.id}">${m.title}</option>`)
          .join("");

  document.getElementById("roomEpisodeGroup").classList.add("hidden");
  openModal("createRoomModal");
}

function updateEpisodeSelect() {
  const movieId = document.getElementById("roomMovieSelect").value;
  const epGroup = document.getElementById("roomEpisodeGroup");
  const epSelect = document.getElementById("roomEpisodeSelect");
  const movie = allMovies.find((m) => m.id === movieId);
  if (movie && movie.episodes && movie.episodes.length > 0) {
    epGroup.classList.remove("hidden");
    epSelect.innerHTML = movie.episodes
      .map(
        (ep, idx) => `<option value="${idx}">Tập ${ep.episodeNumber}</option>`,
      )
      .join("");
  } else {
    epGroup.classList.add("hidden");
  }
}

function toggleRoomPass() {
  const type = document.getElementById("roomType").value;
  const passGroup = document.getElementById("roomPassGroup");
  passGroup.classList.toggle("hidden", type !== "private");
}

async function handleCreateRoom(e) {
  e.preventDefault();
  const name = document.getElementById("roomNameInput").value;
  const movieId = document.getElementById("roomMovieSelect").value;
  const epIndex = document.getElementById("roomEpisodeSelect").value || 0;
  const type = document.getElementById("roomType").value;
  const password = document.getElementById("roomPassword").value;
  
  const movie = allMovies.find((m) => m.id === movieId);
  const episode = movie.episodes[epIndex];
  
  // Lấy thông tin video (Hỗ trợ Hybrid)
  const videoType = episode.videoType || "youtube";
  const videoSource = episode.videoSource || episode.youtubeId;

  try {
    showLoading(true);
    const roomRef = await db.collection("watchRooms").add({
      name,
      hostId: currentUser.uid,
      hostName: currentUser.displayName || "User",
      movieId,
      movieTitle: movie.title,
      episodeIndex: parseInt(epIndex),
      videoType,   // Thêm trường này
      videoSource, // Thêm trường này
      videoId: videoType === 'youtube' ? videoSource : '', // Giữ lại để tương thích cũ
      type,
      password,
      status: "paused",
      currentTime: 0,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      memberCount: 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      bannedUsers: [],
    });
    closeModal("createRoomModal");
    showLoading(false);
    joinRoom(roomRef.id, type, password);
  } catch (error) {
    console.error(error);
    showLoading(false);
  }
}

// ==========================================
// 3. JOIN ROOM & LOGIC
// ==========================================
async function joinRoom(roomId, type, passwordInput = null) {
  if (!currentUser) {
    showNotification("Đăng nhập để vào phòng!", "warning");
    openAuthModal();
    return;
  }
  try {
    showLoading(true);
    const roomRef = db.collection("watchRooms").doc(roomId);
    const doc = await roomRef.get();
    if (!doc.exists) {
      showLoading(false);
      alert("Phòng không tồn tại!");
      return;
    }

    const data = doc.data();
    if (data.bannedUsers?.includes(currentUser.uid)) {
      showLoading(false);
      alert("BẠN ĐÃ BỊ CẤM!");
      return;
    }
    if (data.type === "private" && currentUser.uid !== data.hostId) {
      if (!passwordInput) passwordInput = prompt("🔒 Nhập mật khẩu:");
      if (passwordInput !== data.password) {
        showLoading(false);
        alert("Sai mật khẩu!");
        return;
      }
    }

    currentRoomId = roomId;
    document.getElementById("partyLobby").classList.add("hidden");
    document.getElementById("partyRoom").classList.remove("hidden");
    // 👇 THÊM DÒNG NÀY ĐỂ KHÓA CUỘN TRANG WEB
    document.body.classList.add("watch-party-active");
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";

    showLoading(false);

    roomUnsubscribe = roomRef.onSnapshot(async (docSnapshot) => {
      if (!docSnapshot.exists) {
        leaveRoom();
        return;
      }
      const roomData = docSnapshot.data();
      latestRoomData = roomData;
      if (roomData.bannedUsers?.includes(currentUser.uid)) {
        leaveRoom();
        return;
      }
      updateRoomUI(roomData);
      handleSync(roomData);
    });

    await setupMemberAndChat(roomId, roomRef);
    try {
      initVoiceChat();
    } catch (err) {
      console.warn(err);
    }
  } catch (error) {
    console.error(error);
    showLoading(false);
  }
}

// 👇 Tìm và thay thế toàn bộ hàm setupMemberAndChat cũ bằng hàm này
async function setupMemberAndChat(roomId, roomRef) {
  // 1. Thêm bản thân vào danh sách thành viên
  await roomRef
    .collection("members")
    .doc(currentUser.uid)
    .set({
      name: currentUser.displayName || "User",
      avatar: currentUser.photoURL || "",
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      isChatBanned: false,
      isMicMuted: false,
      isMicBanned: false,
    });

  await roomRef.update({
    memberCount: firebase.firestore.FieldValue.increment(1),
  });

  // Biến lưu trạng thái cũ để so sánh (tránh thông báo lặp lại)
  let wasChatBanned = false;

  // 2. Lắng nghe thay đổi của phòng
  membersUnsubscribe = roomRef.collection("members").onSnapshot((snapshot) => {
    // Cập nhật số lượng
    const countEl = document.getElementById("memberCount");
    if (countEl) countEl.textContent = snapshot.size;

    // Vẽ lại danh sách thành viên
    renderMembersList(snapshot);

    // --- KIỂM TRA TRẠNG THÁI CỦA MÌNH ---
    const myDoc = snapshot.docs.find((d) => d.id === currentUser.uid);

    // A. LOGIC KICK (Đã hoạt động tốt)
    if (!myDoc && currentRoomId) {
      console.warn("🚫 Phát hiện bị Kick khỏi phòng!");
      leaveRoom(true);
      alert("⚠️ BẠN ĐÃ BỊ MỜI RA KHỎI PHÒNG!");
      return;
    }

    // B. LOGIC CẤM CHAT & MIC (FIX MỚI)
    if (myDoc) {
      const myData = myDoc.data();
      const chatInput = document.getElementById("chatInput");
      const chatBtn = document.querySelector("#chatForm button"); // Nút gửi

      // --- XỬ LÝ CẤM CHAT ---
      if (myData.isChatBanned) {
        // Nếu mới bị cấm lần đầu thì hiện thông báo
        if (!wasChatBanned) {
          showNotification("⛔ QUẢN TRỊ VIÊN ĐÃ CẤM BẠN CHAT!", "error");
          wasChatBanned = true;
        }

        // 🔥 KHÓA CỨNG Ô NHẬP LIỆU 🔥
        if (chatInput) {
          chatInput.disabled = true; // Không cho nhập
          chatInput.value = ""; // Xóa chữ đang nhập dở
          chatInput.placeholder = "⛔ Bạn đang bị cấm chat!";
          chatInput.style.backgroundColor = "#2a0000"; // Đổi nền đỏ tối cảnh báo
          chatInput.style.color = "#ff4444";
          chatInput.style.cursor = "not-allowed";
        }
        if (chatBtn) {
          chatBtn.disabled = true;
          chatBtn.style.opacity = "0.5";
        }
      } else {
        // Nếu được mở cấm
        if (wasChatBanned) {
          showNotification("✅ Bạn đã được mở Chat.", "success");
          wasChatBanned = false;
        }

        // MỞ LẠI Ô NHẬP LIỆU
        if (chatInput) {
          chatInput.disabled = false;
          chatInput.placeholder = "Nhập tin nhắn...";
          chatInput.style.backgroundColor = ""; // Trả về màu gốc
          chatInput.style.color = "";
          chatInput.style.cursor = "text";
        }
        if (chatBtn) {
          chatBtn.disabled = false;
          chatBtn.style.opacity = "1";
        }
      }

      // --- XỬ LÝ CẤM MIC (Giữ nguyên) ---
      if (myData.isMicBanned && isMicEnabled) {
        if (myStream && myStream.getAudioTracks()[0]) {
          myStream.getAudioTracks()[0].enabled = false;
        }
        isMicEnabled = false;
        updateMicUI(false);
        showNotification("⛔ QUẢN TRỊ VIÊN ĐÃ TẮT MIC CỦA BẠN!", "warning");
        roomRef
          .collection("members")
          .doc(currentUser.uid)
          .update({ isMicMuted: true });
      }
    }
  });

  loadChat(roomId);
  sendSystemMessage(`${currentUser.displayName} đã vào phòng 👋`);
}

function updateRoomUI(data) {
  document.getElementById("roomTitleDisplay").textContent = data.name;
  isHost = currentUser.uid === data.hostId;
  document.getElementById("hostControls").style.display = isHost
    ? "flex"
    : "none";
  
  // Khởi tạo Hybrid Player (YouTube hoặc HTML5)
  // Chỉ init nếu chưa có player HOẶC loại video thay đổi
  if (!player || (player.videoType && player.videoType !== (data.videoType || "youtube"))) {
      initHybridPlayer(data);
  }
}

// --- RENDER DANH SÁCH THÀNH VIÊN (FULL CHỨC NĂNG ADMIN) ---
// --- RENDER DANH SÁCH THÀNH VIÊN (ĐÃ XÓA STYLE CỨNG ĐỂ CSS HOẠT ĐỘNG) ---
// --- RENDER DANH SÁCH THÀNH VIÊN (BẢN FINAL FIX MÀU CHỮ) ---
function renderMembersList(snapshot) {
  const list = document.getElementById("memberList");
  if (!list) return;
  list.innerHTML = "";

  snapshot.forEach((doc) => {
    const m = doc.data();
    const uid = doc.id;
    const isMe = uid === currentUser.uid;
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || "U")}&background=random&color=fff`;

    // Icon Mic & Ban
    const micIcon = m.isMicMuted
      ? '<i class="fas fa-microphone-slash mic-off" style="color:#ff4444"></i>'
      : '<i class="fas fa-microphone mic-on" style="color:#00ff6a"></i>';
    const chatBanIcon = m.isChatBanned
      ? '<i class="fas fa-comment-slash" style="color:#ff4444; margin-left:5px;" title="Bị cấm chat"></i>'
      : "";

    // Nút chức năng
    let actionButtons = "";
    if (!isMe) {
      const isMuted = localMutedPeers.has(uid);
      actionButtons += `<button class="btn-icon-small ${isMuted ? "active" : ""}" onclick="toggleLocalVolume('${uid}')"><i class="fas ${isMuted ? "fa-volume-mute" : "fa-volume-up"}"></i></button>`;
    }

    if ((isHost || (typeof isAdmin !== "undefined" && isAdmin)) && !isMe) {
      actionButtons += `
            <div class="admin-actions" style="display:flex; gap:5px; margin-left:5px;">
                <button class="btn-icon-small" onclick="toggleChatBan('${uid}', ${!m.isChatBanned})"><i class="fas fa-comment-${m.isChatBanned ? "slash" : "dots"}"></i></button>
                <button class="btn-icon-small" onclick="toggleMicBan('${uid}', ${!m.isMicBanned})"><i class="fas fa-microphone-${m.isMicBanned ? "slash" : "lines"}"></i></button>
                <button class="btn-icon-small danger" onclick="kickUser('${uid}', '${m.name}')"><i class="fas fa-sign-out-alt"></i></button>
            </div>`;
    }

    // 👇 CHỖ SỬA QUAN TRỌNG NHẤT: Thêm class "role-host" thay vì style cứng
    const roleHtml =
      uid === latestRoomData?.hostId
        ? '<span class="role-host">👑 Chủ phòng</span>'
        : '<span class="role-member">Thành viên</span>';

    list.innerHTML += `
            <div class="member-item" id="member-row-${uid}">
                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width: 0;">
                    <div style="position:relative; flex-shrink: 0;">
                        <img src="${m.avatar || defaultAvatar}" class="member-avatar avatar-img">
                        ${m.isSpeaking ? '<div class="speaking-indicator"></div>' : ""}
                    </div>
                    <div class="member-info">
                        <div class="member-name-row">
                            <span class="member-name">${m.name}</span> 
                            ${micIcon} ${chatBanIcon}
                        </div>
                        <span class="member-role">${roleHtml}</span>
                    </div>
                </div>
                <div class="member-actions">${actionButtons}</div>
            </div>`;
  });
}

// ==========================================
// 4. AUDIO & PEERJS (MASTER FIX)
// ==========================================

function toggleLocalVolume(peerId) {
  if (localMutedPeers.has(peerId)) localMutedPeers.delete(peerId);
  else localMutedPeers.add(peerId);

  const audio = document.getElementById("audio-" + peerId);
  if (audio) audio.muted = isDeafened || localMutedPeers.has(peerId);

  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .get()
    .then(renderMembersList);
}

function toggleDeafen() {
  isDeafened = !isDeafened;
  document.getElementById("myDeafenBtn").innerHTML = isDeafened
    ? '<i class="fas fa-headphones-alt slash"></i>'
    : '<i class="fas fa-headphones"></i>';
  document.getElementById("myDeafenBtn").classList.toggle("active", isDeafened);

  document.querySelectorAll("audio").forEach((a) => {
    const peerId = a.id.replace("audio-", "");
    a.muted = isDeafened || localMutedPeers.has(peerId);
    if (!a.muted) a.play().catch((e) => {});
  });
}

function initVoiceChat() {
  if (typeof Peer === "undefined") {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    script.onload = startPeerConnection;
    document.head.appendChild(script);
  } else {
    startPeerConnection();
  }
}

// --- HÀM LẤY SERVER XỊN (Tự động dùng Key của bạn) ---
async function getTurnCredentials() {
  try {
    console.log("🔄 Đang lấy Server xuyên tường lửa...");
    const response = await fetch(
      `https://${APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`,
    );
    if (!response.ok) throw new Error("API Metered lỗi");
    const iceServers = await response.json();
    console.log("✅ Đã có Server xịn!");
    return iceServers;
  } catch (error) {
    console.error("⚠️ Lỗi lấy Server (Dùng tạm Google):", error);
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ];
  }
}

async function startPeerConnection() {
  addMicButtonToUI();
  if (!globalAudioContext)
    globalAudioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
  if (globalAudioContext.state === "suspended") globalAudioContext.resume();

  // Kiểm tra HTTPS - getUserMedia yêu cầu Secure Context trên mobile
  const isSecure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!isSecure) {
    console.warn("⚠️ Không phải HTTPS - Mic có thể bị block trên mobile!");
    showNotification("⚠️ Voice Chat cần HTTPS để hoạt động trên mobile. Hãy dùng HTTPS hoặc localhost!", "warning");
  }

  try {
    // Kiểm tra trình duyệt có hỗ trợ getUserMedia không
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showNotification("Trình duyệt không hỗ trợ Voice Chat!", "error");
      return;
    }

    // 🔥 CHẠY SONG SONG: Vừa xin Mic, vừa lấy Server (Không chờ nhau -> Không lag)
    const streamPromise = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const serverPromise = getTurnCredentials();

    // Đợi cả 2 xong
    const [stream, iceServers] = await Promise.all([
      streamPromise,
      serverPromise,
    ]);

    myStream = stream;
    isMicEnabled = false;
    if (myStream.getAudioTracks()[0])
      myStream.getAudioTracks()[0].enabled = false;
    updateMicUI(false);

    monitorAudioLevel(stream, currentUser.uid);

    // Tạo Peer với Server xịn vừa lấy được
    myPeer = new Peer(currentUser.uid, {
      config: {
        iceServers: iceServers, // 👉 Đây là chìa khóa để xem từ xa
        iceTransportPolicy: "all",
      },
      debug: 1,
    });

    myPeer.on("open", (id) => {
      console.log("✅ Kết nối Peer thành công:", id);
      showNotification("Đã kết nối Voice Chat", "success");
      connectToAllPeers();
    });

    myPeer.on("call", (call) => {
      call.answer(myStream);
      call.on("stream", (remoteStream) => {
        addAudioStream(remoteStream, call.peer);
      });
    });

    myPeer.on("error", (err) => {
      console.warn("Lỗi Peer:", err);
      if (err.type === "disconnected" || err.type === "network") {
        setTimeout(() => {
          if (myPeer && !myPeer.destroyed) myPeer.reconnect();
        }, 3000);
      }
    });
  } catch (err) {
    console.error("Lỗi Mic:", err);
    // Thông báo chi tiết hơn tùy loại lỗi
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      if (!isSecure) {
        showNotification("Mic bị chặn vì không dùng HTTPS! Hãy truy cập qua https:// hoặc localhost", "error");
      } else {
        showNotification("Bạn đã từ chối quyền Micro. Vui lòng cấp quyền trong cài đặt trình duyệt!", "error");
      }
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      showNotification("Không tìm thấy Micro trên thiết bị!", "error");
    } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      showNotification("Micro đang được ứng dụng khác sử dụng!", "error");
    } else {
      showNotification("Lỗi kết nối Micro: " + (err.message || err.name), "error");
    }
  }
}

function connectToAllPeers() {
  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .get()
    .then((snap) => {
      snap.forEach((doc) => {
        if (doc.id !== currentUser.uid) {
          const call = myPeer.call(doc.id, myStream);
          if (call) {
            call.on("stream", (remoteStream) => {
              addAudioStream(remoteStream, doc.id);
            });
          }
        }
      });
    });
}

function addAudioStream(stream, peerId) {
  const old = document.getElementById("audio-" + peerId);
  if (old) old.remove();

  const audio = document.createElement("audio");
  audio.srcObject = stream;
  audio.id = "audio-" + peerId;
  audio.autoplay = true;
  audio.playsInline = true;
  audio.controls = false;

  // 👇 FIX: Không dùng display:none để tránh bị trình duyệt chặn
  let container = document.getElementById("audioContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "audioContainer";
    container.style.cssText =
      "position:fixed; bottom:0; right:0; width:1px; height:1px; opacity:0; pointer-events:none; z-index:-1;";
    document.body.appendChild(container);
  }
  container.appendChild(audio);

  monitorAudioLevel(stream, peerId);

  audio.addEventListener("loadedmetadata", () => {
    audio.muted = isDeafened || localMutedPeers.has(peerId);
    if (!audio.muted) audio.play().catch((e) => {});
  });
}

// 👇 HÀM MONITOR BẤT TỬ (ĐẢM BẢO AVATAR NHÁY)
function monitorAudioLevel(stream, peerId) {
  try {
    if (!globalAudioContext)
      globalAudioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
    if (globalAudioContext.state === "suspended")
      globalAudioContext.resume().catch(() => {});

    const ctx = globalAudioContext;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();

    const gainZero = ctx.createGain();
    gainZero.gain.value = 0.001;
    source.connect(gainZero);
    gainZero.connect(ctx.destination);

    source.connect(analyser);
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const check = () => {
      const row = document.getElementById(`member-row-${peerId}`);
      if (!row) {
        requestAnimationFrame(check);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;

      const avatar = row.querySelector(".avatar-img");
      if (avg > 3) {
        if (avatar) avatar.classList.add("is-speaking");
        row.classList.add("is-speaking");
      } else {
        if (avatar) avatar.classList.remove("is-speaking");
        row.classList.remove("is-speaking");
      }
      requestAnimationFrame(check);
    };
    check();
  } catch (e) {
    console.warn(e);
  }
}

function addMicButtonToUI() {
  const header = document.querySelector(".room-header-bar");
  if (!header) return;

  if (document.getElementById("myMicBtn"))
    document.getElementById("myMicBtn").remove();
  if (document.getElementById("myDeafenBtn"))
    document.getElementById("myDeafenBtn").remove();

  const micBtn = document.createElement("button");
  micBtn.id = "myMicBtn";
  micBtn.className = "btn-mic-toggle active";
  micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  micBtn.onclick = toggleMyMic;

  const deafenBtn = document.createElement("button");
  deafenBtn.id = "myDeafenBtn";
  deafenBtn.className = "btn-deafen-toggle";
  deafenBtn.innerHTML = '<i class="fas fa-headphones"></i>';
  deafenBtn.onclick = toggleDeafen;

  header.insertBefore(deafenBtn, header.firstChild);
  header.insertBefore(micBtn, header.firstChild);
}

function toggleMyMic() {
  if (globalAudioContext?.state === "suspended") globalAudioContext.resume();
  if (!myStream) {
    showNotification("Đang kết nối Mic...", "info");
    return;
  }
  isMicEnabled = !isMicEnabled;
  if (myStream.getAudioTracks()[0])
    myStream.getAudioTracks()[0].enabled = isMicEnabled;
  updateMicUI(isMicEnabled);
  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(currentUser.uid)
    .update({ isMicMuted: !isMicEnabled });
}

function updateMicUI(enabled) {
  const btn = document.getElementById("myMicBtn");
  if (!btn) return;
  if (enabled) {
    btn.innerHTML = '<i class="fas fa-microphone"></i>';
    btn.classList.remove("active");
  } else {
    btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    btn.classList.add("active");
  }
}

// ==========================================
// 5. CÁC HÀM KHÁC (CHAT, PLAYER...)
// ==========================================
function loadChat(roomId) {
  chatUnsubscribe = db
    .collection("watchRooms")
    .doc(roomId)
    .collection("chat")
    .orderBy("createdAt", "asc")
    .onSnapshot((snapshot) => {
      const container = document.getElementById("chatMessages");
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added")
          renderMessage(change.doc.data(), container);
      });
      // Cuộn mượt xuống cuối
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    });
}
// 👇 Tìm và thay thế toàn bộ hàm sendChatMessage cũ
async function sendChatMessage(e) {
  if (e) e.preventDefault();

  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  // 1. KIỂM TRA NHANH: Nếu ô nhập đang bị khóa -> Chặn luôn
  if (input.disabled) {
    showNotification("⛔ BẠN ĐANG BỊ CẤM CHAT!", "error");
    return;
  }

  // 2. KIỂM TRA KỸ (SERVER-SIDE CHECK): Lấy dữ liệu mới nhất từ DB để chắc chắn
  try {
    const memberDoc = await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(currentUser.uid)
      .get();

    // Nếu trên Server ghi là đang bị cấm -> Chặn ngay lập tức
    if (memberDoc.exists && memberDoc.data().isChatBanned) {
      showNotification("⛔ BẠN ĐANG BỊ CẤM CHAT!", "error");

      // Khóa lại giao diện ngay (đề phòng giao diện chưa kịp cập nhật)
      input.disabled = true;
      input.value = "";
      input.placeholder = "⛔ Bạn đang bị cấm chat!";
      return; // 🛑 DỪNG LẠI, KHÔNG GỬI
    }
  } catch (err) {
    console.log("Lỗi kiểm tra quyền chat:", err);
    // Nếu lỗi mạng, có thể cho qua hoặc chặn tùy bạn, ở đây ta cứ để code chạy tiếp
  }

  // 3. GỬI TIN NHẮN (Khi đã vượt qua mọi kiểm tra)
  try {
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("chat")
      .add({
        userId: currentUser.uid,
        userName: currentUser.displayName,
        content: text,
        type: "text",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    input.value = "";
    // Scroll xuống cuối
    // ... sau đoạn input.value = "";
    const container = document.getElementById("chatMessages");
    if (container) {
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  } catch (e) {
    console.error("Lỗi gửi tin nhắn:", e);
    showNotification("Không thể gửi tin nhắn", "error");
  }
}
// ==========================================
// HYBRID PLAYER LOGIC (YOUTUBE + HLS/MP4)
// ==========================================

function initHybridPlayer(data) {
  const container = document.getElementById("partyPlayer");
  
  // 1. Dọn dẹp player cũ
  if (player && typeof player.destroy === "function") {
      try { player.destroy(); } catch(e){}
  }
  if (window.hlsInstance) {
      window.hlsInstance.destroy();
      window.hlsInstance = null;
  }
  player = null;
  container.innerHTML = "";

  // 2. Xác định loại video
  const type = data.videoType || "youtube";
  const source = data.videoSource || data.videoId;

  console.log("🎬 Init Player:", type, source);

  if (type === "youtube") {
      // --- YOUTUBE PLAYER ---
      container.innerHTML = '<div id="ytPlayerTarget"></div>';
      initYouTubePlayerLegacy(source);
  } else {
      // --- HTML5 PLAYER (HLS/MP4) ---
      initHTML5Player(type, source, data);
  }
}

function initHTML5Player(type, source, initialData) {
    const container = document.getElementById("partyPlayer");
    const video = document.createElement("video");
    video.id = "partyHtml5Player";
    video.controls = true;
    video.playsInline = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.backgroundColor = "#000";
    
    container.appendChild(video);
    player = video; // Gán vào biến toàn cục
    player.videoType = type; // Đánh dấu loại
    video.controls = false; // Tắt native controls, dùng custom

    // Load Source
    if (type === "hls" && Hls.isSupported()) {
        const hls = new Hls();
        window.hlsInstance = hls;
        hls.loadSource(source);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (initialData.status === "playing") {
                video.currentTime = initialData.currentTime || 0;
                video.play().catch(e => console.log("Auto-play blocked", e));
            }
            // Populate quality menu sau khi manifest parse xong
            wpPopulateQuality(hls);
        });
        // Lắng nghe chuyển level để update UI
        hls.on(Hls.Events.LEVEL_SWITCHED, (evt, data) => {
            wpUpdateQualityDisplay(data.level);
        });
    } else {
        // MP4 hoặc Native HLS (Safari)
        video.src = source;
        if (initialData.status === "playing") {
             video.currentTime = initialData.currentTime || 0;
             video.play().catch(e => console.log("Auto-play blocked", e));
        }
    }

    // --- EVENTS CHO HOST (SYNC) ---
    if (isHost) {
        // Debounce simple
        let seeking = false;
        
        video.addEventListener("play", () => updateRoomState("playing", video.currentTime));
        video.addEventListener("pause", () => updateRoomState("paused", video.currentTime));
        
        video.addEventListener("seeking", () => { seeking = true; });
        video.addEventListener("seeked", () => { 
            seeking = false;
            updateRoomState("buffering", video.currentTime); 
        });
        
        // Sync định kỳ mỗi 5s để đảm bảo chính xác
        setInterval(() => {
            if(!video.paused && !seeking) updateRoomState("playing", video.currentTime);
        }, 5000);
    }

    // --- INIT CUSTOM CONTROLS ---
    initWpCustomControls(video);
}

function initYouTubePlayerLegacy(videoId) {
  let finalId = videoId;
  if (!videoId) return;
  if (videoId.includes("v=")) finalId = videoId.split("v=")[1].split("&")[0];
  else if (videoId.includes("youtu.be/")) finalId = videoId.split("youtu.be/")[1].split("?")[0];

  const create = () => {
    player = new YT.Player("ytPlayerTarget", {
      height: "100%",
      width: "100%",
      videoId: finalId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange },
    });
    player.videoType = "youtube"; // Đánh dấu
  };

  if (window.YT && window.YT.Player) create();
  else {
    window.onYouTubeIframeAPIReady = create;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }
}

function onPlayerReady() {
  if (latestRoomData) {
      // Seek đến đúng giờ
      if (Math.abs(player.getCurrentTime() - latestRoomData.currentTime) > 2) {
          player.seekTo(latestRoomData.currentTime, true);
      }
      if (latestRoomData.status === "playing") player.playVideo();
  }
}

const onPlayerStateChange = (event) => {
  if (!isHost) return;
  if (event.data === 1) updateRoomState("playing", player.getCurrentTime());
  else if (event.data === 2) updateRoomState("paused", player.getCurrentTime());
};

async function updateRoomState(status, time) {
  if (Date.now() - lastSyncTime < 500) return;
  lastSyncTime = Date.now();
  await db.collection("watchRooms").doc(currentRoomId).update({ 
      status, 
      currentTime: time,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function handleSync(data) {
  if (isHost) return; // Host không cần sync ngược (trừ khi có tính năng cướp host)
  if (!player) return;

  const currentType = player.videoType || (player.playVideo ? "youtube" : "html5");

  if (currentType === "youtube" && player.getPlayerState) {
      // --- SYNC YOUTUBE ---
      const ytTime = player.getCurrentTime();
      const diff = Math.abs(ytTime - data.currentTime);
      
      if (diff > SYNC_THRESHOLD) player.seekTo(data.currentTime, true);
      
      const ytState = player.getPlayerState();
      if (data.status === "playing" && ytState !== 1) player.playVideo();
      else if (data.status === "paused" && ytState !== 2) player.pauseVideo();

  } else if (currentType === "html5" || player.tagName === "VIDEO") {
      // --- SYNC HTML5 ---
      const vidTime = player.currentTime;
      const diff = Math.abs(vidTime - data.currentTime);
      
      if (diff > SYNC_THRESHOLD) {
          console.log("🔄 Syncing time:", vidTime, "->", data.currentTime);
          player.currentTime = data.currentTime;
      }
      
      if (data.status === "playing" && player.paused) {
          player.play().catch(e => console.log("Sync play failed:", e));
      } else if (data.status === "paused" && !player.paused) {
          player.pause();
      }
  }
}
// Thay thế toàn bộ hàm leaveRoom cũ
async function leaveRoom(isKicked = false) {
  // 1. Gửi thông báo Chat (Nếu tự rời đi)
  if (!isKicked && currentRoomId) {
    try {
      // Gửi nhanh tin nhắn báo rời
      await db
        .collection("watchRooms")
        .doc(currentRoomId)
        .collection("chat")
        .add({
          content: `${currentUser.displayName} đã rời phòng 🚪`,
          type: "system",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
      console.log("Không gửi được tn rời phòng");
    }
  }

  // 2. Dọn dẹp Voice Chat & Âm thanh (QUAN TRỌNG: FIX LỖI NGHE TIẾNG)
  if (myPeer) {
    myPeer.destroy();
    myPeer = null;
  }
  if (myStream) {
    myStream.getTracks().forEach((track) => track.stop());
    myStream = null;
  }

  // Xóa sạch các thẻ Audio của người khác
  document.querySelectorAll("audio").forEach((el) => el.remove());
  const audioContainer = document.getElementById("audioContainer");
  if (audioContainer) audioContainer.innerHTML = "";

  // 3. Hủy lắng nghe Firebase
  if (roomUnsubscribe) roomUnsubscribe();
  if (chatUnsubscribe) chatUnsubscribe();
  if (membersUnsubscribe) membersUnsubscribe();

  // 4. Dọn dẹp Player
  if (player && typeof player.destroy === "function") {
    try {
      player.destroy();
    } catch (e) {}
  }
  player = null;
  document.getElementById("partyPlayer").innerHTML = ""; // Xóa trắng iframe

  // 5. Xóa tên khỏi danh sách thành viên (Nếu không phải bị kick)
  if (!isKicked && currentRoomId) {
    try {
      await db
        .collection("watchRooms")
        .doc(currentRoomId)
        .collection("members")
        .doc(currentUser.uid)
        .delete();
      await db
        .collection("watchRooms")
        .doc(currentRoomId)
        .update({
          memberCount: firebase.firestore.FieldValue.increment(-1),
        });
    } catch (e) {
      console.log("Lỗi xóa user:", e);
    }
  }

  // 6. Reset giao diện
  currentRoomId = null;
  document.getElementById("partyRoom").classList.add("hidden");
  document.getElementById("partyLobby").classList.remove("hidden");
  // 👇 THÊM DÒNG NÀY ĐỂ MỞ KHÓA CUỘN LẠI
  document.body.classList.remove("watch-party-active");
  // Hiện lại Footer
  const footer = document.querySelector("footer");
  if (footer) footer.style.display = "block";

  console.log("✅ Đã thoát phòng sạch sẽ.");
}
function renderMessage(msg, c) {
  const div = document.createElement("div");
  if (msg.type === "system") {
    div.className = "chat-msg system";
    div.textContent = msg.content;
  } else {
    div.className = `chat-msg ${msg.userId === currentUser.uid ? "me" : ""}`;
    div.innerHTML = `<span class="author">${msg.userId === currentUser.uid ? "" : msg.userName + ":"}</span> <span class="text">${msg.content}</span>`;
  }
  c.appendChild(div);
}
function sendSystemMessage(t) {
  db.collection("watchRooms").doc(currentRoomId).collection("chat").add({
    content: t,
    type: "system",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
function kickUser(uid, name) {
  if (!confirm("KICK " + name + "?")) return;
  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(uid)
    .delete();
}

// --- GLOBAL CLICK LISTENER: FORCE WAKE UP AUDIO ---
document.addEventListener("click", () => {
  if (globalAudioContext && globalAudioContext.state === "suspended")
    globalAudioContext.resume();
  document.querySelectorAll("audio").forEach((a) => {
    if (a.paused && !a.muted) a.play().catch((e) => {});
  });
});
document.addEventListener(
  "touchstart",
  () => {
    if (globalAudioContext && globalAudioContext.state === "suspended")
      globalAudioContext.resume();
  },
  { passive: true },
);
// ==========================================
// 6. CÁC TIỆN ÍCH UI (TAB, EMOJI, COPY LINK) - BỔ SUNG
// ==========================================

// 1. Chuyển Tab (Chat <-> Thành viên)
function switchRoomTab(tabName) {
  // Xóa active cũ
  document
    .querySelectorAll(".room-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".room-tab-content")
    .forEach((c) => c.classList.remove("active"));

  // Active tab vừa bấm
  event.currentTarget.classList.add("active");

  // Hiện nội dung tương ứng
  if (tabName === "chat") {
    document.getElementById("tabChat").classList.add("active");
  } else {
    document.getElementById("tabMembers").classList.add("active");
  }
}

// 2. Copy Link mời bạn bè
function copyRoomLink() {
  const url = window.location.href;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      showNotification("Đã copy link phòng! Gửi cho bạn bè ngay.", "success");
    })
    .catch(() => {
      showNotification("Lỗi copy link", "error");
    });
}

// 3. Thả tim/Emoji bay bay
function sendReaction(emoji) {
  // Hiển thị ngay trên máy mình
  showFloatingEmoji(emoji);

  // Gửi qua chat để người khác cũng thấy
  db.collection("watchRooms").doc(currentRoomId).collection("chat").add({
    userId: currentUser.uid,
    content: emoji,
    type: "reaction",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function showFloatingEmoji(char) {
  const container = document.getElementById("floatingEmojis");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "float-icon";
  el.textContent = char;
  el.style.left = Math.random() * 80 + 10 + "%"; // Random vị trí ngang
  container.appendChild(el);

  // Tự xóa sau 3 giây
  setTimeout(() => el.remove(), 3000);
}

// 4. Xử lý hiển thị tin nhắn Emoji từ người khác
// (Tìm hàm renderMessage cũ và thay thế, hoặc để đoạn này đè lên cũng được)
const originalRenderMessage = renderMessage; // Lưu hàm cũ
renderMessage = function (msg, container) {
  if (msg.type === "reaction") {
    showFloatingEmoji(msg.content);
    return; // Không hiện reaction vào khung chat cho đỡ rác
  }
  // Nếu là tin nhắn thường thì gọi hàm cũ
  originalRenderMessage(msg, container);
};
// ============================================================
// PHẦN BỔ SUNG: LOGIC QUẢN TRỊ & FIX TAB (DÁN VÀO CUỐI FILE)
// ============================================================

// 1. FIX LỖI CHUYỂN TAB (PC & MOBILE)
// Gán vào window để đảm bảo gọi được từ HTML
window.switchRoomTab = function (tabName) {
  console.log("Đang chuyển sang tab:", tabName);

  // Xóa active cũ
  document
    .querySelectorAll(".room-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".room-tab-content")
    .forEach((c) => c.classList.remove("active"));

  // Active tab button vừa bấm
  // (Tìm nút có data-tab tương ứng hoặc dựa vào event)
  const btns = document.querySelectorAll(".room-tab");
  btns.forEach((btn) => {
    if (
      btn.textContent
        .toLowerCase()
        .includes(tabName === "chat" ? "chat" : "thành viên")
    ) {
      btn.classList.add("active");
    }
  });

  // Hiện nội dung
  if (tabName === "chat") {
    const chatTab = document.getElementById("tabChat");
    if (chatTab) chatTab.classList.add("active");
  } else {
    const memberTab = document.getElementById("tabMembers");
    if (memberTab) memberTab.classList.add("active");
  }
};

// 2. LOGIC CẤM CHAT (Ban Chat)
window.toggleChatBan = async function (uid, shouldBan) {
  if (!currentRoomId) return;
  try {
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(uid)
      .update({
        isChatBanned: shouldBan,
      });
    showNotification(
      shouldBan ? "Đã cấm chat thành viên này" : "Đã mở chat",
      "success",
    );
  } catch (e) {
    console.error("Lỗi cấm chat:", e);
    showNotification("Lỗi: Không thể cấm chat", "error");
  }
};

// 3. LOGIC CẤM MIC (Ban Mic)
window.toggleMicBan = async function (uid, shouldBan) {
  if (!currentRoomId) return;
  try {
    // Cập nhật trạng thái cấm mic VÀ ép tắt mic luôn (isMicMuted = true)
    const updateData = { isMicBanned: shouldBan };
    if (shouldBan) updateData.isMicMuted = true;

    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(uid)
      .update(updateData);
    showNotification(
      shouldBan ? "Đã khóa Mic thành viên này" : "Đã mở khóa Mic",
      "success",
    );
  } catch (e) {
    console.error("Lỗi cấm mic:", e);
  }
};

// 4. CSS BỔ SUNG CHO NÚT BẤM (Dùng JS chèn CSS cho tiện)
const styleAdmin = document.createElement("style");
styleAdmin.innerHTML = `
    .btn-icon-small {
        width: 28px; height: 28px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.1);
        color: #fff;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: 0.2s;
    }
    .btn-icon-small:hover { background: rgba(255,255,255,0.2); }
    .btn-icon-small.active { background: #ff4444; color: white; }
    .btn-icon-small.danger { background: rgba(255,0,0,0.2); color: #ff4444; }
    .btn-icon-small.danger:hover { background: #ff4444; color: white; }
    
    /* Active class cho Tab Content */
    .room-tab-content { display: none !important; height: 100%; }
    .room-tab-content.active { display: flex !important; flex-direction: column; }
`;
document.head.appendChild(styleAdmin);
// ============================================================
// PHẦN BỔ SUNG CUỐI CÙNG: PLAYER & KICK (DÁN NỐI TIẾP)
// ============================================================

// 1. Hàm Kick (Đuổi thành viên) - Trước đó bạn bị thiếu hàm này
window.kickUser = async function (uid, name) {
  if (!currentRoomId) return;
  if (!confirm(`Bạn có chắc muốn mời ${name} ra khỏi phòng?`)) return;

  try {
    // 1. Gửi thông báo lên kênh Chat trước
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("chat")
      .add({
        content: `🚫 ${name} đã bị mời ra khỏi phòng.`,
        type: "system",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // 2. Xóa thành viên (Code bên phía nạn nhân sẽ tự bắt sự kiện này và thoát)
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(uid)
      .delete();

    // 3. Giảm số lượng
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .update({
        memberCount: firebase.firestore.FieldValue.increment(-1),
      });

    showNotification(`Đã mời ${name} ra khỏi phòng`, "success");
  } catch (e) {
    console.error("Lỗi kick user:", e);
  }
};

// Đảm bảo nút "Rời phòng" trong HTML gọi đúng hàm
// Bạn hãy tìm nút "Rời phòng" trong file HTML (hoặc JS tạo ra nó) và đảm bảo nó là onclick="leaveRoom()"
// Nếu nút đó có ID là "btnLeaveRoom", thêm dòng này vào cuối file JS:
setTimeout(() => {
  const btnLeave =
    document.getElementById("btnLeaveRoom") ||
    document.querySelector(".btn-leave-room");
  if (btnLeave) btnLeave.onclick = () => leaveRoom();
}, 2000);

// 2. Các hàm điều khiển Player (Play, Pause, Tua) - Gán vào window để HTML gọi được
// 2. Các hàm điều khiển Player (Play, Pause, Tua) - Gán vào window để HTML gọi được
window.syncPlay = function () {
  if (!isHost) {
    showNotification("Chỉ chủ phòng mới được bấm Play!", "warning");
    return;
  }
  if (!player) return;

  if (typeof player.playVideo === "function") { // YouTube
    player.playVideo();
    updateRoomState("playing", player.getCurrentTime());
  } else { // HTML5
    player.play().catch(e=>{});
  }
};

window.syncPause = function () {
  if (!isHost) {
    showNotification("Chỉ chủ phòng mới được bấm Pause!", "warning");
    return;
  }
  if (!player) return;

  if (typeof player.pauseVideo === "function") { // YouTube
    player.pauseVideo();
    updateRoomState("paused", player.getCurrentTime());
  } else { // HTML5
    player.pause();
  }
};

window.syncSeek = function (seconds) {
  if (!isHost) {
    showNotification("Chỉ chủ phòng mới được tua!", "warning");
    return;
  }
  if (!player) return;

  let currentTime = 0;
  if (typeof player.getCurrentTime === "function") { // YouTube
      currentTime = player.getCurrentTime();
  } else { // HTML5
      currentTime = player.currentTime;
  }

  const newTime = currentTime + seconds;
  
  if (typeof player.seekTo === "function") { // YouTube
    player.seekTo(newTime, true);
  } else { // HTML5
    player.currentTime = newTime;
  }
  
  updateRoomState("buffering", newTime);
};

// Hàm cập nhật trạng thái phòng lên Firebase (Hỗ trợ cho Player)
async function updateRoomState(status, time) {
  if (!currentRoomId) return;
  // Debounce: Tránh gửi quá nhiều request cùng lúc
  if (Date.now() - lastSyncTime < 500) return;
  lastSyncTime = Date.now();

  try {
    await db.collection("watchRooms").doc(currentRoomId).update({
      status: status,
      currentTime: time,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Lỗi sync:", e);
  }
}

// ==========================================
// WATCH PARTY - CUSTOM VIDEO CONTROLS LOGIC
// ==========================================
let wpHideTimer = null;

function initWpCustomControls(video) {
    const container = document.getElementById("wpVideoContainer");
    if (!container) return;

    // Duration
    video.addEventListener("loadedmetadata", () => {
        const dur = document.getElementById("wpDuration");
        if (dur) dur.textContent = wpFormatTime(video.duration);
        const slider = document.getElementById("wpProgressSlider");
        if (slider) slider.max = video.duration;
    });

    // Time Update
    video.addEventListener("timeupdate", () => {
        if (!video.duration) return;
        const pct = (video.currentTime / video.duration) * 100;
        const bar = document.getElementById("wpProgressBar");
        if (bar) bar.style.width = `${pct}%`;
        const slider = document.getElementById("wpProgressSlider");
        if (slider) slider.value = video.currentTime;
        const ct = document.getElementById("wpCurrentTime");
        if (ct) ct.textContent = wpFormatTime(video.currentTime);

        // Buffer
        if (video.buffered.length > 0) {
            const buf = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
            const bufBar = document.getElementById("wpBufferBar");
            if (bufBar) bufBar.style.width = `${buf}%`;
        }
    });

    // Seek (Host only via slider)
    const slider = document.getElementById("wpProgressSlider");
    if (slider) {
        slider.addEventListener("change", (e) => {
            if (!isHost) {
                showNotification("Chỉ chủ phòng mới được tua!", "warning");
                return;
            }
            video.currentTime = parseFloat(e.target.value);
            updateRoomState("buffering", video.currentTime);
        });
    }

    // Play/Pause state for center overlay
    video.addEventListener("play", () => {
        container.classList.add("playing");
        container.classList.remove("paused");
        wpUpdatePlayIcons(true);
    });
    video.addEventListener("pause", () => {
        container.classList.remove("playing");
        container.classList.add("paused");
        wpUpdatePlayIcons(false);
    });

    // Volume
    const volSlider = document.getElementById("wpVolumeSlider");
    if (volSlider) {
        volSlider.addEventListener("input", (e) => {
            video.volume = e.target.value;
            wpUpdateVolumeIcon(video.volume);
        });
    }

    // Show/Hide on hover
    container.addEventListener("mousemove", () => {
        clearTimeout(wpHideTimer);
        wpHideTimer = setTimeout(() => {
            // Auto-hide handled by CSS (playing state)
        }, 3000);
    });

    // Set initial state
    container.classList.add("paused");

    // Populate quality if HLS
    if (window.hlsInstance) {
        wpPopulateQuality(window.hlsInstance);
        window.hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (evt, data) => {
            wpUpdateQualityDisplay(data.level);
        });
    }
}

function wpFormatTime(s) {
    if (!s || isNaN(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m < 10 ? "0" + m : m}:${sec < 10 ? "0" + sec : sec}`;
}

function wpUpdatePlayIcons(isPlaying) {
    const icon = isPlaying ? "fas fa-pause" : "fas fa-play";
    const center = document.querySelector("#wpPlayIcon");
    const bottom = document.querySelector("#wpPlayPauseBtn i");
    if (center) center.className = icon;
    if (bottom) bottom.className = icon;
}

function wpUpdateVolumeIcon(vol) {
    const icon = document.querySelector("#wpVolumeBtn i");
    if (!icon) return;
    if (vol == 0) icon.className = "fas fa-volume-mute";
    else if (vol < 0.5) icon.className = "fas fa-volume-down";
    else icon.className = "fas fa-volume-up";
}

window.wpToggleMute = function() {
    if (!player || !player.tagName) return;
    player.muted = !player.muted;
    wpUpdateVolumeIcon(player.muted ? 0 : player.volume);
    const slider = document.getElementById("wpVolumeSlider");
    if (slider) slider.value = player.muted ? 0 : player.volume;
};

// --- Settings ---
window.wpToggleSettings = function() {
    const menu = document.getElementById("wpSettingsMenu");
    if (!menu) return;
    if (menu.style.display === "flex") {
        menu.style.display = "none";
    } else {
        menu.style.display = "flex";
    }
};

window.wpShowSubMenu = function(type) {
    document.getElementById("wpSettingsMenu").style.display = "none";
    if (type === 'speed') document.getElementById("wpSpeedMenu").style.display = "flex";
    else if (type === 'quality') document.getElementById("wpQualityMenu").style.display = "flex";
    else if (type === 'color') document.getElementById("wpColorMenu").style.display = "flex";
};

window.wpHideSubMenu = function() {
    const speed = document.getElementById("wpSpeedMenu");
    const quality = document.getElementById("wpQualityMenu");
    const color = document.getElementById("wpColorMenu");
    if (speed) speed.style.display = "none";
    if (quality) quality.style.display = "none";
    if (color) color.style.display = "none";
    document.getElementById("wpSettingsMenu").style.display = "flex";
};

window.wpSetSpeed = function(rate) {
    if (!isHost) { showNotification("Chỉ chủ phòng mới đổi tốc độ!", "warning"); return; }
    if (!player || !player.tagName) return;
    player.playbackRate = rate;
    const label = document.getElementById("wpSpeedVal");
    if (label) label.textContent = rate === 1 ? "Chuẩn" : rate + "x";
    
    document.querySelectorAll("#wpSpeedMenu .submenu-item").forEach(item => {
        item.classList.remove("active");
        if (item.textContent.includes(rate === 1 ? "Chuẩn" : rate + "x")) item.classList.add("active");
    });
    wpHideSubMenu();
    wpToggleSettings();
};

// --- Quality (HLS only) ---
function wpPopulateQuality(hls) {
    const menu = document.getElementById("wpQualityMenu");
    const item = document.getElementById("wpQualityItem");
    if (!menu || !hls || !hls.levels || hls.levels.length <= 1) return;
    if (item) item.style.display = "flex";
    
    const existing = menu.querySelectorAll(".submenu-item:not([data-level='-1'])");
    existing.forEach(el => el.remove());
    
    const levels = hls.levels.map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate }))
        .sort((a, b) => a.height - b.height);
    
    levels.forEach(level => {
        const el = document.createElement("div");
        el.className = "submenu-item";
        el.dataset.level = level.index;
        el.onclick = () => wpSetQuality(level.index);
        el.innerHTML = `${level.height}p <span class="quality-bitrate">${Math.round(level.bitrate/1000)} kbps</span>`;
        menu.appendChild(el);
    });
}

function wpUpdateQualityDisplay(levelIndex) {
    const hls = window.hlsInstance;
    if (!hls) return;
    const label = document.getElementById("wpQualityVal");
    if (!label) return;
    if (hls.autoLevelEnabled || levelIndex === -1) {
        const cur = hls.levels[hls.currentLevel];
        label.textContent = `Tự động (${cur ? cur.height : '?'}p)`;
    } else {
        const lv = hls.levels[levelIndex];
        label.textContent = lv ? `${lv.height}p` : 'N/A';
    }
}

window.wpSetQuality = function(levelIndex) {
    // Mở cho tất cả user vì mạng mỗi người khác nhau
    const hls = window.hlsInstance;
    if (!hls) return;
    hls.currentLevel = levelIndex;
    wpUpdateQualityDisplay(levelIndex);
    wpHideSubMenu();
    wpToggleSettings();
};

// --- Subtitle Color (All users) ---
window.wpSetSubtitleColor = function(color) {
    // Áp dụng màu cho phụ đề của video
    if (player && player.tagName === "VIDEO" && player.textTracks) {
        for (let i = 0; i < player.textTracks.length; i++) {
            const track = player.textTracks[i];
            if (track.cues) {
                for (let j = 0; j < track.cues.length; j++) {
                    track.cues[j].snapToLines = false;
                    track.cues[j].line = 90;
                }
            }
        }
    }

    // Lưu màu vào CSS variable cho video
    const container = document.getElementById("wpVideoContainer");
    if (container) {
        container.style.setProperty("--subtitle-color", color);
    }

    // Áp màu trực tiếp qua style tag
    let styleTag = document.getElementById("wp-subtitle-style");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "wp-subtitle-style";
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
        #partyHtml5Player::cue {
            color: ${color} !important;
            background: rgba(0,0,0,0.5) !important;
        }
    `;

    // Update UI
    const label = document.getElementById("wpColorVal");
    const names = { white: "Trắng", yellow: "Vàng", cyan: "Xanh dương", green: "Xanh lá" };
    if (label) label.textContent = names[color] || color;

    // Mark active
    document.querySelectorAll("#wpColorMenu .submenu-item").forEach(item => {
        item.classList.toggle("active", item.dataset.color === color);
    });

    wpHideSubMenu();
    wpToggleSettings();
};

// --- Fullscreen (All users) ---
window.wpToggleFullscreen = function() {
    const container = document.getElementById("wpVideoContainer");
    const icon = document.querySelector("#wpFullscreenBtn i");
    if (!document.fullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        if (icon) icon.className = "fas fa-compress";
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        if (icon) icon.className = "fas fa-expand";
    }
};

// Update syncPlay to also toggle pause (for center button)
const _originalSyncPlay = window.syncPlay;
window.syncPlay = function() {
    if (!isHost) { showNotification("Chỉ chủ phòng mới được điều khiển!", "warning"); return; }
    if (!player) return;
    
    if (player.tagName === "VIDEO") {
        if (player.paused) {
            player.play().catch(e => {});
        } else {
            player.pause();
        }
    } else if (typeof player.playVideo === "function") {
        // YouTube
        const state = player.getPlayerState();
        if (state === 1) { // Playing
            player.pauseVideo();
            updateRoomState("paused", player.getCurrentTime());
        } else {
            player.playVideo();
            updateRoomState("playing", player.getCurrentTime());
        }
    }
};

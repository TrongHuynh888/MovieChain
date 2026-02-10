/**
 * WATCH PARTY MODULE (FIXED: AUDIO & AVATAR)
 * Sửa lỗi: Loa tổng, Loa thành viên, Avatar mặc định
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
let isMicEnabled = false; // Mặc định là TẮT MIC (false)
let globalAudioContext = null; // Singleton AudioContext

// QUẢN LÝ ÂM THANH
let isDeafened = false; // // Mặc định là TẮT LOA (true)
let localMutedPeers = new Set(); // Danh sách ID những người mình tắt tiếng riêng lẻ

// ==========================================
// 1. MODULE LOADER
// ==========================================
async function initWatchPartyModule() {
  console.log("🚀 Đang tải module Watch Party...");

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
      if (currentUser) {
        const isOwner = currentUser.uid === room.hostId;
        if (isOwner || isAdmin) {
          deleteBtn = `<button class="btn-delete-room" onclick="event.stopPropagation(); deleteRoom('${doc.id}', '${room.hostId}')" title="Giải tán phòng"><i class="fas fa-trash"></i></button>`;
        }
      }

      const html = `
                <div class="card" style="position:relative; min-height: 180px; display:flex; flex-direction:column; justify-content:space-between;">
                    ${deleteBtn}
                    <div class="card-body">
                        <div class="mb-2" style="display:flex; align-items:center; gap:10px;">
                            <span class="status-badge active" style="background:#e50914">LIVE</span>
                            ${isPrivate ? '<i class="fas fa-lock text-warning" title="Riêng tư"></i>' : '<i class="fas fa-globe-asia text-success" title="Công khai"></i>'}
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
    showLoading(true, "Đang giải tán phòng...");
    await db.collection("watchRooms").doc(roomId).delete();
    showNotification("Đã giải tán phòng thành công!", "success");
    loadRooms();
  } catch (error) {
    console.error("Lỗi xóa phòng:", error);
    showNotification("Có lỗi xảy ra", "error");
  } finally {
    showLoading(false);
  }
}

// ... (Các hàm tạo phòng giữ nguyên như cũ) ...
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
      const isFree = !movie.price || movie.price === 0;
      const isPurchased = purchased.includes(movie.id);
      return isFree || isPurchased;
    });
  }

  const uniqueMovies = [
    ...new Map(allowedMovies.map((item) => [item.id, item])).values(),
  ];
  const select = document.getElementById("roomMovieSelect");
  if (uniqueMovies.length === 0) {
    select.innerHTML =
      '<option value="">-- Bạn chưa sở hữu phim nào --</option>';
  } else {
    select.innerHTML =
      '<option value="">-- Chọn phim --</option>' +
      uniqueMovies
        .map(
          (m) =>
            `<option value="${m.id}">${m.title} ${m.price > 0 && !currentUser.isVip ? "(Đã mua)" : ""}</option>`,
        )
        .join("");
  }

  document.getElementById("roomEpisodeGroup").classList.add("hidden");
  document.getElementById("roomEpisodeSelect").innerHTML = "";
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
        (ep, idx) =>
          `<option value="${idx}">Tập ${ep.episodeNumber}: ${ep.title || ""}</option>`,
      )
      .join("");
  } else {
    epGroup.classList.add("hidden");
  }
}

function toggleRoomPass() {
  const type = document.getElementById("roomType").value;
  const passGroup = document.getElementById("roomPassGroup");
  if (type === "private") passGroup.classList.remove("hidden");
  else passGroup.classList.add("hidden");
}

async function handleCreateRoom(e) {
  e.preventDefault();
  const name = document.getElementById("roomNameInput").value;
  const movieId = document.getElementById("roomMovieSelect").value;
  const epIndex = document.getElementById("roomEpisodeSelect").value || 0;
  const type = document.getElementById("roomType").value;
  const password = document.getElementById("roomPassword").value;

  const movie = allMovies.find((m) => m.id === movieId);
  let videoId = movie.episodes[epIndex].youtubeId;

  try {
    showLoading(true, "Đang tạo phòng...");
    const roomRef = await db.collection("watchRooms").add({
      name: name,
      hostId: currentUser.uid,
      hostName:
        currentUser.displayName || currentUser.email.split("@")[0] || "User",
      movieId: movieId,
      movieTitle: movie.title,
      episodeIndex: parseInt(epIndex),
      videoId: videoId,
      type: type,
      password: password,
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
    console.error("Lỗi tạo phòng:", error);
    showLoading(false);
  }
}

// ==========================================
// 3. JOIN ROOM & LOGIC BẢO MẬT
// ==========================================
async function joinRoom(roomId, type, passwordInput = null) {
  if (!currentUser) {
    showNotification("Đăng nhập để vào phòng!", "warning");
    openAuthModal();
    return;
  }

  try {
    showLoading(true, "Đang kiểm tra phòng...");
    const roomRef = db.collection("watchRooms").doc(roomId);
    const doc = await roomRef.get();

    if (!doc.exists) {
      showLoading(false);
      alert("Phòng không tồn tại!");
      return;
    }
    const data = doc.data();

    if (data.bannedUsers && data.bannedUsers.includes(currentUser.uid)) {
      showLoading(false);
      alert("⛔ BẠN ĐÃ BỊ CẤM KHỎI PHÒNG NÀY!");
      return;
    }

    if (data.type === "private" && currentUser.uid !== data.hostId) {
      if (!passwordInput) {
        passwordInput = prompt("🔒 Phòng này cần mật khẩu:");
        if (passwordInput === null) {
          showLoading(false);
          return;
        }
      }
      if (passwordInput !== data.password) {
        showLoading(false);
        alert("⛔ Sai mật khẩu!");
        return;
      }
    }

    currentRoomId = roomId;

    document.getElementById("partyLobby").classList.add("hidden");
    document.getElementById("partyRoom").classList.remove("hidden");
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";
    const inviteBtn = document.getElementById("roomInviteBtn");
    if (inviteBtn)
      inviteBtn.innerHTML = `<i class="fas fa-link"></i> Mời bạn bè (Copy Link)`;

    showLoading(false);

    roomUnsubscribe = roomRef.onSnapshot(async (docSnapshot) => {
      if (!docSnapshot.exists) {
        alert("Phòng đã giải tán!");
        leaveRoom();
        return;
      }
      const roomData = docSnapshot.data();
      latestRoomData = roomData;

      if (
        roomData.bannedUsers &&
        roomData.bannedUsers.includes(currentUser.uid)
      ) {
        alert("Bạn vừa bị Admin cấm khỏi phòng!");
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
      console.warn("Không thể khởi động Voice Chat:", err);
    }
  } catch (error) {
    console.error(error);
    showLoading(false);
    showNotification("Lỗi vào phòng", "error");
  }
}

async function setupMemberAndChat(roomId, roomRef) {
  await roomRef
    .collection("members")
    .doc(currentUser.uid)
    .set({
      name:
        currentUser.displayName || currentUser.email.split("@")[0] || "User",
      avatar: currentUser.photoURL || "",
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      isChatBanned: false,
      isMicMuted: false,
      isMicBanned: false,
      peerId: currentUser.uid,
    });

  await roomRef.update({
    memberCount: firebase.firestore.FieldValue.increment(1),
  });

  membersUnsubscribe = roomRef.collection("members").onSnapshot((snapshot) => {
    document.getElementById("memberCount").textContent = snapshot.size;
    renderMembersList(snapshot);

    let amIHere = false;
    let myData = null;
    snapshot.forEach((doc) => {
      if (doc.id === currentUser.uid) {
        amIHere = true;
        myData = doc.data();
      }
    });

    if (!amIHere && currentRoomId) {
      alert("Bạn đã bị mời ra khỏi phòng!");
      leaveRoom();
      return;
    }

    // Logic bị Host cấm Mic
    if (myData && myData.isMicBanned) {
      if (isMicEnabled) {
        if (myStream) myStream.getAudioTracks()[0].enabled = false;
        isMicEnabled = false;
        updateMicUI(false);
        showNotification("Host đã tắt mic của bạn!", "warning");
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
  const controls = document.getElementById("hostControls");
  if (isHost) controls.style.display = "flex";
  else controls.style.display = "none";
  if (!player) initYouTubePlayer(data.videoId);
}

// ==========================================
// 4. RENDER MEMBERS & AUDIO CONTROLS (FIXED AVATAR)
// ==========================================
function renderMembersList(snapshot) {
  const list = document.getElementById("memberList");
  list.innerHTML = "";

  snapshot.forEach((doc) => {
    const m = doc.data();
    const uid = doc.id;
    const isMe = uid === currentUser.uid;

    // 👇 FIX AVATAR MẶC ĐỊNH 👇
    // 1. Tạo Avatar mặc định
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || "User")}&background=random&color=fff&size=150`;

    // 2. Xác định Avatar chính thức (SỬA TÊN BIẾN Ở ĐÂY CHO KHỚP)
    // 👇 Đổi 'finalAvatar' thành 'avatarUrl' 👇
    let avatarUrl = m.avatar && m.avatar.length > 5 ? m.avatar : defaultAvatar;

    // Icon trạng thái Mic
    const micIcon = m.isMicMuted
      ? '<i class="fas fa-microphone-slash mic-status mic-off" title="Mic đang tắt"></i>'
      : '<i class="fas fa-microphone mic-status mic-on" title="Mic đang bật"></i>';

    const banIcon = m.isMicBanned
      ? '<i class="fas fa-lock" style="color:#ff4444; font-size:10px; margin-left:5px;" title="Bị Host cấm nói"></i>'
      : "";

    // Nút tắt tiếng Local
    let volumeBtn = "";
    if (!isMe) {
      const isLocalMuted = localMutedPeers.has(uid);
      // 👇 LOGIC MỚI: Xử lý Class và Icon 👇
      const stateClass = isLocalMuted ? "muted" : ""; // Nếu tắt thì thêm class muted
      const iconClass = isLocalMuted ? "fa-volume-mute" : "fa-volume-up"; // Mute = icon gạch chéo
      const title = isLocalMuted
        ? "Bật tiếng người này"
        : "Tắt tiếng người này";

      volumeBtn = `
                <button class="btn-volume-local ${stateClass}" 
                        onclick="toggleLocalVolume('${uid}')" 
                        title="${title}">
                    <i class="fas ${iconClass}"></i>
                </button>
            `;
    }

    let controls = "";
    if ((isHost || isAdmin) && !isMe) {
      const micBanBtnIcon = m.isMicBanned ? "slash" : "lines";
      const micBanTitle = m.isMicBanned ? "Cho phép nói" : "Cấm nói (Mute)";

      controls = `
                <div class="member-controls">
                    <button class="btn-mod" onclick="toggleChatBan('${uid}', ${!m.isChatBanned})" title="${m.isChatBanned ? "Mở chat" : "Cấm chat"}">
                        <i class="fas fa-comment-${m.isChatBanned ? "slash" : "dots"}"></i>
                    </button>
                    <button class="btn-mod" onclick="toggleMicBan('${uid}', ${!m.isMicBanned})" title="${micBanTitle}">
                        <i class="fas fa-microphone-${micBanBtnIcon}"></i>
                    </button>
                    <button class="btn-mod kick" onclick="kickUser('${uid}', '${m.name}')" title="Mời ra">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                    <button class="btn-mod ban" onclick="banUser('${uid}', '${m.name}')" title="Cấm vĩnh viễn">
                        <i class="fas fa-ban"></i>
                    </button>
                </div>
            `;
    }

    list.innerHTML += `
            <div class="member-item" id="member-row-${uid}">
                <div style="position:relative;">
                    <img src="${avatarUrl}" class="member-avatar avatar-img" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                </div>
                
                <div class="member-info">
                    <div style="display:flex; align-items:center;">
                        <span class="member-name">${m.name}</span>
                        ${micIcon} ${banIcon}
                        <span class="speaking-indicator"></span>
                    </div>
                    <span class="member-role">${isMe ? "Bạn" : uid === latestRoomData?.hostId ? "👑 Chủ phòng" : "Thành viên"}</span>
                </div>
                ${volumeBtn}
                ${controls}
            </div>`;
  });
}

// ==========================================
// 5. AUDIO LOGIC (FIXED PLAY/PAUSE)
// ==========================================

// 👇 FIX: Hàm bật/tắt tiếng riêng lẻ (Có thêm .play())
// 👇 CẬP NHẬT: Đổi màu và Icon khi bấm 👇
function toggleLocalVolume(peerId) {
  const audioEl = document.getElementById("audio-" + peerId);

  if (localMutedPeers.has(peerId)) {
    // Đang tắt -> Bật lại
    localMutedPeers.delete(peerId);
    if (!isDeafened && audioEl) {
      audioEl.muted = false;
      audioEl.play().catch((e) => console.warn("Lỗi auto-play:", e));
    }
  } else {
    // Đang bật -> Tắt
    localMutedPeers.add(peerId);
    if (audioEl) audioEl.muted = true;
  }

  // Cập nhật giao diện nút bấm ngay lập tức
  const btn = document.querySelector(
    `button[onclick="toggleLocalVolume('${peerId}')"]`,
  );
  if (btn) {
    if (localMutedPeers.has(peerId)) {
      // Chuyển sang trạng thái TẮT
      btn.classList.add("muted"); // Thêm class đỏ
      btn.innerHTML = '<i class="fas fa-volume-mute"></i>'; // Icon loa gạch chéo
      btn.title = "Bật tiếng người này";
    } else {
      // Chuyển sang trạng thái BẬT
      btn.classList.remove("muted"); // Xóa class đỏ -> Về xanh dương mặc định
      btn.innerHTML = '<i class="fas fa-volume-up"></i>'; // Icon loa thường
      btn.title = "Tắt tiếng người này";
    }
  }
}

// 👇 FIX: Hàm bật/tắt loa tổng (Có thêm .play())
function toggleDeafen() {
  isDeafened = !isDeafened;

  // 1. Cập nhật nút bấm
  const btn = document.getElementById("myDeafenBtn");
  if (btn) {
    if (isDeafened) {
      btn.innerHTML =
        '<i class="fas fa-headphones-alt" style="text-decoration: line-through;"></i>';
      btn.classList.add("active");
    } else {
      btn.innerHTML = '<i class="fas fa-headphones"></i>';
      btn.classList.remove("active");
    }
  }

  // 2. Tìm tất cả audio và xử lý
  const allAudios = document.querySelectorAll("#audioContainer audio");
  allAudios.forEach((audio) => {
    const peerId = audio.id.replace("audio-", "");

    if (isDeafened) {
      audio.muted = true;
    } else {
      // Nếu bỏ Deafen -> Bật lại (trừ khi đang bị Mute riêng)
      if (localMutedPeers.has(peerId)) {
        audio.muted = true;
      } else {
        audio.muted = false;
        // 👇 QUAN TRỌNG: Gọi play() lại để đánh thức luồng âm thanh
        audio.play().catch((e) => console.warn("Lỗi resume audio:", e));
      }
    }
  });

  showNotification(
    isDeafened ? "Đã tắt âm thanh phòng 🔇" : "Đã bật âm thanh phòng 🔊",
    "info",
  );
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

function startPeerConnection() {
  addMicButtonToUI(); // Hiện nút Mic

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn("Trình duyệt không hỗ trợ Voice Chat");
    return;
  }

  // 👇 FIX: Thêm echoCancellation để chống vang tiếng
  navigator.mediaDevices
    .getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
    .then((stream) => {
      myStream = stream;

      // Mặc định vào phòng là TẮT MIC ngay lập tức
      isMicEnabled = false;
      if (myStream.getAudioTracks().length > 0) {
        myStream.getAudioTracks()[0].enabled = false;
      }

      updateMicUI(false); // Icon màu đỏ (Tắt)

      // Khởi động bộ phân tích âm thanh (để Avatar nhấp nháy khi nói)
      monitorAudioLevel(stream, currentUser.uid);

      // Tạo kết nối PeerJS
      myPeer = new Peer(currentUser.uid, {
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
          ],
        },
      });

      myPeer.on("open", (id) => {
        console.log("✅ Đã kết nối Voice Chat ID:", id);
        connectToAllPeers();
      });

      // Khi có người gọi đến (Nghe tiếng người khác)
      myPeer.on("call", (call) => {
        call.answer(myStream); // Trả lời bằng stream của mình
        const audio = document.createElement("audio");
        const callerId = call.peer;

        call.on("stream", (userAudioStream) => {
          addAudioStream(audio, userAudioStream, callerId);
        });
      });

      myPeer.on("error", (err) => {
        console.warn("Lỗi PeerJS:", err);
        // Nếu lỗi trùng ID, thử kết nối lại
        if (err.type === "unavailable-id") {
          myPeer.reconnect();
        }
      });
    })
    .catch((err) => {
      console.error("Không lấy được quyền Mic:", err);
      showNotification("Vui lòng CHO PHÉP quyền Micro để nói chuyện!", "error");
    });
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
          const audio = document.createElement("audio");
          const receiverId = doc.id;
          call.on("stream", (stream) =>
            addAudioStream(audio, stream, receiverId),
          );
        }
      });
    });
}
// 👇 HÀM MỚI: Phân tích âm lượng để tạo hiệu ứng nói 👇
function monitorAudioLevel(stream, peerId) {
  try {
    // 👇 FIX: Dùng Singleton AudioContext để tránh lỗi giới hạn (max 6 context)
    if (!globalAudioContext) {
      globalAudioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }
    if (globalAudioContext.state === "suspended") globalAudioContext.resume();

    const audioContext = globalAudioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    source.connect(analyser);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      // Tìm dòng thành viên tương ứng
      const memberRow = document.getElementById(`member-row-${peerId}`);
      if (!memberRow) {
        // Nếu người dùng đã rời phòng -> Dừng kiểm tra để đỡ lag
        audioContext.close();
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // Tính âm lượng trung bình
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Ngưỡng phát hiện nói (10 là vừa phải)
      const speakingThreshold = 10;
      const avatar = memberRow.querySelector(".avatar-img");

      if (average > speakingThreshold) {
        // Đang nói -> Thêm class hiệu ứng
        if (avatar) avatar.classList.add("is-speaking");
        memberRow.classList.add("is-speaking");
      } else {
        // Im lặng -> Gỡ class
        if (avatar) avatar.classList.remove("is-speaking");
        memberRow.classList.remove("is-speaking");
      }

      requestAnimationFrame(checkVolume);
    };

    checkVolume(); // Bắt đầu vòng lặp
  } catch (e) {
    console.warn("Audio Context Error:", e);
  }
}
function addAudioStream(audio, stream, peerId) {
  audio.srcObject = stream;
  audio.id = "audio-" + peerId;

  // 👇 FIX QUAN TRỌNG CHO MOBILE & CHROME 👇
  audio.autoplay = true;
  audio.playsInline = true; // Bắt buộc cho iOS/Android để không bị fullscreen
  audio.controls = false; // Ẩn control mặc định

  // Kích hoạt phân tích âm thanh (để avatar nháy)
  monitorAudioLevel(stream, peerId);

  // Xử lý sự kiện khi audio sẵn sàng
  audio.addEventListener("loadedmetadata", () => {
    // Nếu đang bật chế độ "Tắt Loa" hoặc đã mute riêng người này
    if (isDeafened || localMutedPeers.has(peerId)) {
      audio.muted = true;
    } else {
      audio.muted = false;
      // Cố gắng phát âm thanh
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Autoplay bị chặn, cần tương tác người dùng:", error);
          // Nếu bị chặn, hiện thông báo nhỏ nhắc người dùng
          showNotification("Chạm vào màn hình để nghe tiếng 🔊", "info");

          // Thêm sự kiện chạm bất kỳ đâu để "mở khóa" âm thanh
          const resumeAudio = () => {
            audio.play();
            document.removeEventListener("click", resumeAudio);
            document.removeEventListener("touchstart", resumeAudio);
          };
          document.addEventListener("click", resumeAudio);
          document.addEventListener("touchstart", resumeAudio);
        });
      }
    }
  });

  let container = document.getElementById("audioContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "audioContainer";
    // 👇 Dùng opacity 0 + pointer-events none thay vì ẩn hẳn
    // Một số trình duyệt sẽ tắt tiếng nếu element bị display:none hoặc nằm quá xa
    container.style.position = "absolute";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    container.style.height = "1px";
    container.style.width = "1px";
    container.style.overflow = "hidden";
    document.body.appendChild(container);
  }

  // Xóa audio cũ của user này nếu có (tránh duplicate)
  const oldAudio = document.getElementById("audio-" + peerId);
  if (oldAudio) oldAudio.remove();

  container.appendChild(audio);
}

function addMicButtonToUI() {
  const headerBar = document.querySelector(".room-header-bar");
  const oldMic = document.getElementById("myMicBtn");
  if (oldMic) oldMic.remove();
  const oldDeafen = document.getElementById("myDeafenBtn");
  if (oldDeafen) oldDeafen.remove();

  const micBtn = document.createElement("button");
  micBtn.id = "myMicBtn";
  micBtn.className = "btn-mic-toggle";
  micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
  micBtn.onclick = toggleMyMic;

  const deafenBtn = document.createElement("button");
  deafenBtn.id = "myDeafenBtn";
  deafenBtn.className = "btn-deafen-toggle";
  deafenBtn.title = "Tắt/Bật tất cả âm thanh (Deafen)";
  deafenBtn.onclick = toggleDeafen;

  // Kiểm tra trạng thái mặc định để set Icon và Màu
  if (isDeafened) {
    deafenBtn.innerHTML =
      '<i class="fas fa-headphones-alt" style="text-decoration: line-through;"></i>';
    deafenBtn.classList.add("active"); // Thêm class active để nút chuyển màu vàng
  } else {
    deafenBtn.innerHTML = '<i class="fas fa-headphones"></i>';
  }

  headerBar.insertBefore(deafenBtn, headerBar.firstChild);
  headerBar.insertBefore(micBtn, headerBar.firstChild);
}

function toggleMyMic() {
  // 👇 FIX QUAN TRỌNG: Đánh thức bộ xử lý âm thanh ngay khi bấm nút
  if (globalAudioContext && globalAudioContext.state === "suspended") {
    globalAudioContext.resume().then(() => {
      console.log("🔊 AudioContext đã được đánh thức!");
    });
  }

  db.collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(currentUser.uid)
    .get()
    .then((doc) => {
      const data = doc.data();
      // Kiểm tra xem có bị Host cấm nói không
      if (doc.exists && data.isMicBanned) {
        showNotification("Host đã khóa Mic của bạn!", "error");
        return;
      }

      // Kiểm tra xem đã lấy được quyền Mic chưa
      if (!myStream) {
        showNotification(
          "Chưa kết nối được Micro. Hãy thử tải lại trang!",
          "error",
        );
        // Thử khởi động lại Peer nếu mất kết nối
        initVoiceChat();
        return;
      }

      // Đảo ngược trạng thái Mic (Bật <-> Tắt)
      isMicEnabled = !isMicEnabled;

      // Bật/Tắt track âm thanh thực tế
      const audioTrack = myStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMicEnabled;
      }

      // Cập nhật giao diện nút Mic
      updateMicUI(isMicEnabled);

      // Cập nhật trạng thái lên Server để người khác thấy
      db.collection("watchRooms")
        .doc(currentRoomId)
        .collection("members")
        .doc(currentUser.uid)
        .update({
          isMicMuted: !isMicEnabled,
        });

      // Thông báo nhỏ cho người dùng biết
      if (isMicEnabled) {
        showNotification("Micro đang bật 🎙️", "success");
      }
    })
    .catch((err) => {
      console.error("Lỗi toggle Mic:", err);
    });
}

function updateMicUI(enabled) {
  const btn = document.getElementById("myMicBtn");
  if (btn) {
    if (enabled) {
      btn.innerHTML = '<i class="fas fa-microphone"></i>';
      btn.classList.remove("active");
    } else {
      btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
      btn.classList.add("active");
    }
  }
}

// --- LOGIC QUẢN LÝ ---
async function kickUser(uid, name) {
  if (!confirm(`Mời ${name} ra khỏi phòng?`)) return;
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(uid)
    .delete();
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
}

async function banUser(uid, name) {
  if (!confirm(`⚠️ CẤM VĨNH VIỄN ${name}?`)) return;
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .update({ bannedUsers: firebase.firestore.FieldValue.arrayUnion(uid) });
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(uid)
    .delete();
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
}

async function toggleChatBan(uid, ban) {
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(uid)
    .update({ isChatBanned: ban });
}

async function toggleMicBan(uid, shouldBan) {
  const updateData = { isMicBanned: shouldBan };
  if (shouldBan) {
    updateData.isMicMuted = true;
  }
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(uid)
    .update(updateData);
  showNotification(`Đã ${shouldBan ? "CẤM" : "CHO PHÉP"} thành viên bật mic.`);
}

// ==========================================
// 6. CÁC HÀM KHÁC
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
      container.scrollTop = container.scrollHeight;
    });
}

async function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  const memberDoc = await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .collection("members")
    .doc(currentUser.uid)
    .get();
  if (memberDoc.exists && memberDoc.data().isChatBanned) {
    showNotification("⛔ Bạn đã bị cấm chat!", "error");
    return;
  }

  await db.collection("watchRooms").doc(currentRoomId).collection("chat").add({
    userId: currentUser.uid,
    userName: currentUser.displayName,
    content: text,
    type: "text",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  input.value = "";
}

function initYouTubePlayer(videoId) {
  const container = document.getElementById("partyPlayer");
  container.innerHTML = '<div id="ytPlayerTarget"></div>';
  let finalId = videoId.includes("youtu.be/")
    ? videoId.split("youtu.be/")[1].split("?")[0]
    : videoId;
  if (videoId.includes("v=")) finalId = videoId.split("v=")[1].split("&")[0];

  const createPlayer = () => {
    player = new YT.Player("ytPlayerTarget", {
      height: "100%",
      width: "100%",
      videoId: finalId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });
  };
  if (window.YT && window.YT.Player) createPlayer();
  else {
    window.onYouTubeIframeAPIReady = createPlayer;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }
}
function onPlayerReady() {
  if (!isHost && latestRoomData) {
    player.seekTo(latestRoomData.currentTime || 0, true);
    if (latestRoomData.status === "playing") player.playVideo();
  }
}
function onPlayerError() {
  showNotification("Lỗi phát video.", "error");
}
const onPlayerStateChange = (event) => {
  if (!isHost) return;
  if (event.data === YT.PlayerState.PLAYING)
    updateRoomState("playing", player.getCurrentTime());
  else if (event.data === YT.PlayerState.PAUSED)
    updateRoomState("paused", player.getCurrentTime());
};
async function updateRoomState(status, time) {
  if (!currentRoomId || !isHost) return;
  const now = Date.now();
  if (now - lastSyncTime < 500) return;
  lastSyncTime = now;
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .update({ status: status, currentTime: time });
}
function handleSync(data) {
  if (!isHost && player && typeof player.getPlayerState === "function") {
    if (Math.abs(player.getCurrentTime() - data.currentTime) > SYNC_THRESHOLD)
      player.seekTo(data.currentTime, true);
    if (data.status === "playing" && player.getPlayerState() !== 1)
      player.playVideo();
    else if (data.status === "paused" && player.getPlayerState() !== 2)
      player.pauseVideo();
  }
}
function syncPlay() {
  if (player) player.playVideo();
}
function syncPause() {
  if (player) player.pauseVideo();
}
function syncSeek(s) {
  if (player) player.seekTo(player.getCurrentTime() + s, true);
}

async function leaveRoom() {
  if (myPeer) myPeer.destroy();
  if (myStream) myStream.getTracks().forEach((track) => track.stop());
  if (roomUnsubscribe) roomUnsubscribe();
  if (chatUnsubscribe) chatUnsubscribe();
  if (membersUnsubscribe) membersUnsubscribe();
  if (player && player.destroy) player.destroy();
  player = null;
  if (currentRoomId) {
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .collection("members")
      .doc(currentUser.uid)
      .delete();
    await db
      .collection("watchRooms")
      .doc(currentRoomId)
      .update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
  }
  currentRoomId = null;
  document.getElementById("partyRoom").classList.add("hidden");
  document.getElementById("partyLobby").classList.remove("hidden");
  const footer = document.querySelector("footer");
  if (footer) footer.style.display = "block";
}

function renderMessage(msg, container) {
  if (msg.type === "reaction") {
    showFloatingEmoji(msg.content);
    return;
  }
  const div = document.createElement("div");
  if (msg.type === "system") {
    div.className = "chat-msg system";
    div.textContent = msg.content;
  } else {
    const isMe = msg.userId === currentUser.uid;
    div.className = `chat-msg ${isMe ? "me" : ""}`;
    div.innerHTML = `<span class="author">${isMe ? "" : msg.userName + ":"}</span><span class="text">${escapeHtml(msg.content)}</span>`;
  }
  container.appendChild(div);
}
function sendReaction(e) {
  showFloatingEmoji(e);
  db.collection("watchRooms").doc(currentRoomId).collection("chat").add({
    userId: currentUser.uid,
    content: e,
    type: "reaction",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
function sendSystemMessage(t) {
  db.collection("watchRooms").doc(currentRoomId).collection("chat").add({
    content: t,
    type: "system",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
function showFloatingEmoji(e) {
  const c = document.getElementById("floatingEmojis");
  if (!c) return;
  const el = document.createElement("div");
  el.className = "float-icon";
  el.textContent = e;
  el.style.left = Math.random() * 80 + "%";
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
function copyRoomLink() {
  navigator.clipboard.writeText(
    `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`,
  );
  showNotification("Đã copy link!", "success");
}
function switchRoomTab(tab) {
  document
    .querySelectorAll(".room-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".room-tab-content")
    .forEach((c) => c.classList.remove("active"));
  event.target.closest(".room-tab").classList.add("active");
  document
    .getElementById(tab === "chat" ? "tabChat" : "tabMembers")
    .classList.add("active");
}
function escapeHtml(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
  let videoId = movie.episodes[epIndex].youtubeId;

  try {
    showLoading(true);
    const roomRef = await db.collection("watchRooms").add({
      name,
      hostId: currentUser.uid,
      hostName: currentUser.displayName || "User",
      movieId,
      movieTitle: movie.title,
      episodeIndex: parseInt(epIndex),
      videoId,
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

async function setupMemberAndChat(roomId, roomRef) {
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

  membersUnsubscribe = roomRef.collection("members").onSnapshot((snapshot) => {
    document.getElementById("memberCount").textContent = snapshot.size;
    renderMembersList(snapshot);

    const myData = snapshot.docs.find((d) => d.id === currentUser.uid)?.data();
    if (myData && myData.isMicBanned && isMicEnabled) {
      if (myStream) myStream.getAudioTracks()[0].enabled = false;
      isMicEnabled = false;
      updateMicUI(false);
      showNotification("Host đã tắt mic của bạn", "warning");
      roomRef
        .collection("members")
        .doc(currentUser.uid)
        .update({ isMicMuted: true });
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
  if (!player) initYouTubePlayer(data.videoId);
}

function renderMembersList(snapshot) {
  const list = document.getElementById("memberList");
  list.innerHTML = "";
  snapshot.forEach((doc) => {
    const m = doc.data();
    const uid = doc.id;
    const isMe = uid === currentUser.uid;
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || "U")}&background=random&color=fff`;

    const micIcon = m.isMicMuted
      ? '<i class="fas fa-microphone-slash mic-off"></i>'
      : '<i class="fas fa-microphone mic-on"></i>';

    list.innerHTML += `
            <div class="member-item" id="member-row-${uid}">
                <img src="${m.avatar || defaultAvatar}" class="member-avatar avatar-img">
                <div class="member-info">
                    <div><span class="member-name">${m.name}</span> ${micIcon}</div>
                    <span class="member-role">${uid === latestRoomData?.hostId ? "👑 Host" : "Member"}</span>
                </div>
                ${
                  !isMe
                    ? `<button class="btn-volume-local" onclick="toggleLocalVolume('${uid}')">
                    <i class="fas ${localMutedPeers.has(uid) ? "fa-volume-mute" : "fa-volume-up"}"></i>
                </button>`
                    : ""
                }
                ${isHost && !isMe ? `<button class="btn-mod" onclick="kickUser('${uid}','${m.name}')"><i class="fas fa-sign-out-alt"></i></button>` : ""}
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

  try {
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
    showNotification("Vui lòng cho phép quyền Micro!", "error");
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
      container.scrollTop = container.scrollHeight;
    });
}
async function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
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
  let finalId = videoId;
  if (videoId.includes("v=")) finalId = videoId.split("v=")[1].split("&")[0];
  else if (videoId.includes("youtu.be/"))
    finalId = videoId.split("youtu.be/")[1].split("?")[0];

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
  if (!isHost && latestRoomData) {
    player.seekTo(latestRoomData.currentTime || 0, true);
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
  await db
    .collection("watchRooms")
    .doc(currentRoomId)
    .update({ status, currentTime: time });
}
function handleSync(data) {
  if (!isHost && player && player.getPlayerState) {
    if (Math.abs(player.getCurrentTime() - data.currentTime) > 2)
      player.seekTo(data.currentTime, true);
    if (data.status === "playing" && player.getPlayerState() !== 1)
      player.playVideo();
    else if (data.status === "paused" && player.getPlayerState() !== 2)
      player.pauseVideo();
  }
}
async function leaveRoom() {
  if (myPeer) myPeer.destroy();
  if (myStream) myStream.getTracks().forEach((t) => t.stop());
  if (roomUnsubscribe) roomUnsubscribe();
  if (chatUnsubscribe) chatUnsubscribe();
  if (membersUnsubscribe) membersUnsubscribe();
  currentRoomId = null;
  document.getElementById("partyRoom").classList.add("hidden");
  document.getElementById("partyLobby").classList.remove("hidden");
  const footer = document.querySelector("footer");
  if (footer) footer.style.display = "block";
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

// LOGIC XỬ LÝ TRANG NÂNG CẤP
console.log("💎 Upgrade Module Loaded");

function openPaymentQRModal(type = "vip") {
  if (!currentUser) {
    showNotification("Vui lòng đăng nhập để nâng cấp!", "warning");
    openAuthModal();
    return;
  }

  const qrImage = document.getElementById("vietqrImage");
  const amountEl = document.getElementById("paymentAmount");
  const memoEl = document.getElementById("paymentMemo");

  const BANK_ID = "VBA"; // Agribank MÃ NGÂN HÀNG VIẾT TẮT QR
  const ACCOUNT_NO = "88880384495717"; // Thay số TK của bạn vào đây
  const TEMPLATE = "compact";

  let amount = 99000;
  let content = `VIP ${currentUser.email.split("@")[0]}`;

  if (type === "lifetime") {
    amount = 999000;
    content = `LIFETIME ${currentUser.email.split("@")[0]}`;
  }

  amountEl.textContent = formatNumber(amount) + "đ";
  memoEl.textContent = content;

  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;
  qrImage.src = qrUrl;

  openModal("paymentQRModal");
}

function confirmPayment() {
  showLoading(true, "Đang kiểm tra giao dịch...");
  setTimeout(() => {
    showLoading(false);
    closeModal("paymentQRModal");
    alert("🎉 Cảm ơn bạn! Hệ thống sẽ kích hoạt VIP sau 1-2 phút.");
    showNotification("Yêu cầu nâng cấp đã được gửi!", "success");
  }, 2000);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showNotification("Đã sao chép số tài khoản", "info");
}

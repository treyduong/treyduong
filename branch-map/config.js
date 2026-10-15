/*
 * CẤU HÌNH ỨNG DỤNG — chỉnh file này để đổi thương hiệu & nguồn dữ liệu.
 * Không cần sửa app.js.
 */
window.APP_CONFIG = {
  // Tên hiển thị trên thanh tiêu đề và tab trình duyệt
  brandName: "Mạng lưới Chi nhánh",
  brandTagline: "Bản đồ chi nhánh & phòng giao dịch toàn quốc",
  // Đường dẫn logo (để "" nếu không dùng). Ví dụ: "assets/logo.png"
  logoUrl: "",

  // Màu thương hiệu
  primaryColor: "#1434a4",   // Chi nhánh
  secondaryColor: "#e8222d", // Phòng giao dịch
  tertiaryColor: "#0f9d58",  // Loại khác (ATM, trụ sở...)

  // Nguồn dữ liệu: file CSV trong repo, HOẶC link Google Sheets
  // "File > Share > Publish to web > CSV" (dạng .../pub?output=csv)
  dataUrl: "data/branches.csv",

  // Hiển thị dải cảnh báo "dữ liệu mẫu" (tắt khi đã nhập dữ liệu thật)
  showSampleBanner: true,

  // Chế độ Tour: số giây dừng ở mỗi điểm
  tourIntervalSeconds: 6,

  // Hotline chung hiển thị ở chân danh sách (để "" nếu không dùng)
  hotline: "1900 0000"
};

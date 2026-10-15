/*
 * 34 đơn vị hành chính cấp tỉnh của Việt Nam (hiệu lực từ 01/07/2025,
 * theo Nghị quyết 202/2025/QH15). `merged` = các tỉnh cũ được hợp nhất vào.
 * `center` = tọa độ trung tâm hành chính, dùng khi tỉnh chưa có chi nhánh.
 */
window.VN_PROVINCES = [
  // ---------- Miền Bắc ----------
  { name: "Hà Nội", region: "Bắc", center: [21.0285, 105.8542], merged: [] },
  { name: "Hải Phòng", region: "Bắc", center: [20.8449, 106.6881], merged: ["Hải Dương"] },
  { name: "Quảng Ninh", region: "Bắc", center: [20.9599, 107.0425], merged: [] },
  { name: "Cao Bằng", region: "Bắc", center: [22.6657, 106.2577], merged: [] },
  { name: "Lạng Sơn", region: "Bắc", center: [21.8537, 106.7615], merged: [] },
  { name: "Lai Châu", region: "Bắc", center: [22.3964, 103.4582], merged: [] },
  { name: "Điện Biên", region: "Bắc", center: [21.3860, 103.0230], merged: [] },
  { name: "Sơn La", region: "Bắc", center: [21.3256, 103.9188], merged: [] },
  { name: "Tuyên Quang", region: "Bắc", center: [21.8237, 105.2140], merged: ["Hà Giang"] },
  { name: "Lào Cai", region: "Bắc", center: [21.7229, 104.9113], merged: ["Yên Bái"] },
  { name: "Thái Nguyên", region: "Bắc", center: [21.5942, 105.8482], merged: ["Bắc Kạn"] },
  { name: "Phú Thọ", region: "Bắc", center: [21.3227, 105.4019], merged: ["Vĩnh Phúc", "Hòa Bình"] },
  { name: "Bắc Ninh", region: "Bắc", center: [21.2731, 106.1946], merged: ["Bắc Giang"] },
  { name: "Hưng Yên", region: "Bắc", center: [20.6464, 106.0511], merged: ["Thái Bình"] },
  { name: "Ninh Bình", region: "Bắc", center: [20.2506, 105.9745], merged: ["Hà Nam", "Nam Định"] },

  // ---------- Miền Trung & Tây Nguyên ----------
  { name: "Thanh Hóa", region: "Trung", center: [19.8067, 105.7852], merged: [] },
  { name: "Nghệ An", region: "Trung", center: [18.6796, 105.6813], merged: [] },
  { name: "Hà Tĩnh", region: "Trung", center: [18.3428, 105.9057], merged: [] },
  { name: "Quảng Trị", region: "Trung", center: [17.4689, 106.6223], merged: ["Quảng Bình"] },
  { name: "Huế", region: "Trung", center: [16.4637, 107.5909], merged: [] },
  { name: "Đà Nẵng", region: "Trung", center: [16.0544, 108.2022], merged: ["Quảng Nam"] },
  { name: "Quảng Ngãi", region: "Trung", center: [15.1214, 108.8044], merged: ["Kon Tum"] },
  { name: "Gia Lai", region: "Trung", center: [13.7765, 109.2237], merged: ["Bình Định"] },
  { name: "Đắk Lắk", region: "Trung", center: [12.6667, 108.0500], merged: ["Phú Yên"] },
  { name: "Khánh Hòa", region: "Trung", center: [12.2388, 109.1967], merged: ["Ninh Thuận"] },
  { name: "Lâm Đồng", region: "Trung", center: [11.9404, 108.4583], merged: ["Đắk Nông", "Bình Thuận"] },

  // ---------- Miền Nam ----------
  { name: "TP. Hồ Chí Minh", region: "Nam", center: [10.7769, 106.7009], merged: ["Bình Dương", "Bà Rịa - Vũng Tàu"] },
  { name: "Đồng Nai", region: "Nam", center: [10.9574, 106.8427], merged: ["Bình Phước"] },
  { name: "Tây Ninh", region: "Nam", center: [10.5360, 106.4137], merged: ["Long An"] },
  { name: "Cần Thơ", region: "Nam", center: [10.0452, 105.7469], merged: ["Sóc Trăng", "Hậu Giang"] },
  { name: "Vĩnh Long", region: "Nam", center: [10.2537, 105.9722], merged: ["Bến Tre", "Trà Vinh"] },
  { name: "Đồng Tháp", region: "Nam", center: [10.3600, 106.3600], merged: ["Tiền Giang"] },
  { name: "Cà Mau", region: "Nam", center: [9.1769, 105.1524], merged: ["Bạc Liêu"] },
  { name: "An Giang", region: "Nam", center: [10.0125, 105.0809], merged: ["Kiên Giang"] }
];

window.VN_REGIONS = {
  "Bắc": "Miền Bắc",
  "Trung": "Miền Trung & Tây Nguyên",
  "Nam": "Miền Nam"
};

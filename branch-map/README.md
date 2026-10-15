# Bản đồ Chi nhánh toàn quốc

Web tĩnh (HTML/CSS/JS thuần, không cần build) hiển thị mạng lưới chi nhánh /
phòng giao dịch trên bản đồ Việt Nam, theo **34 tỉnh/thành mới (từ 01/07/2025)**.

## Tính năng
- Bản đồ Leaflet, gom cụm marker, 3 lớp nền (đường phố / OSM / vệ tinh)
- Tìm kiếm không dấu (tên, địa chỉ, tỉnh mới **và tỉnh cũ**, dịch vụ)
- Lọc theo miền, 34 tỉnh/thành, loại điểm; tab "Theo tỉnh/thành" có số lượng
- Trang chi tiết: ảnh, địa chỉ, điện thoại, giờ làm việc, dịch vụ, chỉ đường Google Maps, chia sẻ link, 3 điểm gần nhất
- **Tour** tự động chạy qua từng điểm (theo bộ lọc hiện tại), có Trước/Tiếp/Dừng
- **Gần tôi**: định vị và sắp xếp theo khoảng cách
- Link trực tiếp: `/#id=cn-hoan-kiem` hoặc `/#tinh=Đà Nẵng`
- Nhãn Quần đảo Hoàng Sa, Trường Sa (Việt Nam)
- Giao diện mobile dạng bottom-sheet; phím tắt `/` tìm kiếm, `Esc` quay lại

## Cập nhật dữ liệu
Sửa `data/branches.csv` (mở bằng Excel/Google Sheets, lưu **CSV UTF-8**). Cột:

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| id | nên có | mã duy nhất, dùng cho link chia sẻ |
| name | ✔ | tên điểm |
| type | | vd. `Chi nhánh`, `Phòng giao dịch`, `ATM` — tự gán màu |
| province | ✔ | tỉnh/thành **mới hoặc cũ** đều được (vd. "Bình Dương" tự quy về TP. Hồ Chí Minh) |
| old_province | | tỉnh cũ trước sáp nhập (hiển thị "trước đây: …") |
| address | | |
| lat, lng | ✔ | tọa độ thập phân (Google Maps → chuột phải → copy tọa độ) |
| phone, hours, manager, email | | `hours` dùng `;` để xuống dòng |
| services | | ngăn cách bằng `;` |
| image | | URL ảnh (https://…) hoặc `assets/img/abc.jpg` |
| note | | ghi chú nội bộ |

**Dùng Google Sheets làm nguồn trực tiếp:** File → Share → Publish to web → chọn
sheet → CSV → dán link `.../pub?output=csv` vào `dataUrl` trong `config.js`.
Sửa sheet là web cập nhật, không cần deploy lại.

Thương hiệu (tên, logo, màu, hotline, tốc độ tour) chỉnh trong `config.js`.
Khi đã dùng dữ liệu thật, đặt `showSampleBanner: false`.

## Chạy thử & deploy
- Local: `npx serve branch-map` (không mở trực tiếp file:// vì trình duyệt chặn đọc CSV).
- Netlify: kết nối repo → Netlify tự đọc `netlify.toml` (publish = `branch-map`).
  Hoặc kéo-thả thư mục `branch-map` vào https://app.netlify.com/drop.
- Nếu là site nội bộ: bật **Password protection** (Site settings → Access control)
  hoặc Netlify Identity.

Thư viện đã đóng gói sẵn trong `vendor/` (Leaflet 1.9.4, MarkerCluster 1.5.3,
PapaParse 5.4.1). Bản đồ nền tải từ CARTO/OSM/Esri nên cần Internet.

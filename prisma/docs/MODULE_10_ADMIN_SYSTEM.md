# 📌 MODULE 10: ADMIN & SYSTEM (Quản trị hệ thống & Bảng vẽ)

## 1. Giới thiệu tổng quan

Module **Admin & System** quản lý các hoạt động nhật ký quản trị, cấu hình vận hành hệ thống và dữ liệu tương tác bảng vẽ trực tuyến:
- **Nhật ký Quản trị (AdminLog):** Ghi nhận chi tiết lịch sử thao tác của các Admin (Audit Trail) nhằm phục vụ bảo mật, truy vết sự cố và minh bạch thông tin.
- **Cấu hình Hệ thống (SystemConfig):** Cung cấp các tham số vận hành linh hoạt dạng Key-Value (tỷ lệ hoa hồng, chế độ bảo trì, kích thước file tối đa...) cho phép cập nhật tức thì từ trang Admin.
- **Trạng thái Bảng vẽ (WhiteboardState):** Lưu trữ các snapshot nét vẽ (Canvas Drawing Data) của Bảng vẽ điện tử trực tuyến trong lớp học, cho phép đồng bộ real-time qua WebSockets và lưu vết bài giảng.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 10)

```
  +-----------------------------------+        +-----------------------------------+
  |               users               |        |           class_sessions          |
  +-----------------------------------+        +-----------------------------------+
  | PK  | user_id (UUID)              |        | PK  | session_id (UUID)           |
  +-----------------------------------+        +-----------------------------------+
    |                   |                        |
    | (1 - N)           | (1 - N)                | (1 - N)
    v                   v                        v
  +-------------------+ +-----------------------------------+
  |    admin_logs     | |         whiteboard_states         |
  +-------------------+ +-----------------------------------+
  | PK | log_id       | | PK | state_id (UUID)              |
  | FK | admin_id     | | FK | session_id -> sessions       |
  |    | action       | |    | drawing_data_json (Json)     |
  |    | target_type  | |    | timestamp (Timestamptz)      |
  |    | target_id    | | FK | created_by -> users          |
  |    | details_json | +-----------------------------------+
  |    | ip_address   |
  +-------------------+
                                               +-----------------------------------+
                                               |           system_configs          |
                                               +-----------------------------------+
                                               | PK | config_key (String)          |
                                               |    | config_value (String?)       |
                                               |    | description (String?)        |
                                               |    | updated_at (Timestamptz)     |
                                               +-----------------------------------+
```

---

## 3. Chi tiết các Bảng dữ liệu (Models)

### 3.1. Bảng `admin_logs` (Nhật ký thao tác Admin)

> **Mô tả:** Ghi vết mọi hành động quản trị viên tác động lên hệ thống (Audit Log / Audit Trail).

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `log_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bản ghi log. |
| `admin_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Tài khoản Admin thực hiện hành động. |
| `action` | `String` | Bắt buộc | Tên thao tác (VD: `APPROVE_TUTOR`, `SUSPEND_USER`, `REFUND_BOOKING`). |
| `target_type` | `String` | Bắt buộc | Loại đối tượng bị tác động (`USER`, `TUTOR_PROFILE`, `BOOKING`...). |
| `target_id` | `String?` | `@db.Uuid` | Mã ID của đối tượng bị tác động. |
| `details_json` | `Json?` | Tùy chọn | Dữ liệu chi tiết trước và sau khi Admin thay đổi. |
| `ip_address` | `String?` | Tùy chọn | Địa chỉ IP của Admin khi gửi request. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm thực hiện hành động. |

---

### 3.2. Bảng `system_configs` (Tham số cấu hình hệ thống)

> **Mô tả:** Quản lý các tham số vận hành linh hoạt dưới dạng cặp Khóa - Giá trị (Key-Value).

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `config_key` | `String` | `@id` | Khóa chính đại diện tên cấu hình (VD: `COMMISSION_RATE`, `MAX_FILE_SIZE_MB`). |
| `config_value` | `String?` | Tùy chọn | Giá trị cấu hình dưới dạng chuỗi (VD: `15.0`, `50`, `false`). |
| `description` | `String?` | Tùy chọn | Giải thích ý nghĩa của tham số cấu hình. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm cập nhật giá trị gần nhất. |

---

### 3.3. Bảng `whiteboard_states` (Trạng thái Bảng vẽ điện tử)

> **Mô tả:** Lưu snapshot dữ liệu nét vẽ (Canvas / Drawing Data) của Bảng vẽ trực tuyến trong lớp học.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `state_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh trạng thái nét vẽ. |
| `session_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `class_sessions` | Liên kết tới Buổi học trực tuyến (`onDelete: Cascade`). |
| `drawing_data_json` | `Json` | Bắt buộc | Dữ liệu mảng JSON chứa nét vẽ, tọa độ, hình dáng, màu sắc. |
| `timestamp` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm ghi nhận nét vẽ. |
| `created_by` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người thực hiện nét vẽ (Gia sư hoặc Học sinh). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bản ghi. |

---

## 4. Luồng xử lý Quản trị & Đồng bộ Bảng vẽ (Workflows)

```
=================== LUỒNG NHẬT KÝ ADMIN (AUDIT TRAIL) ===================
[Admin bấm Duyệt hồ sơ Gia sư]
        ↓
1. Backend cập nhật `tutor_profiles.verified_status = approved`
        ↓
2. Tự động chèn 1 bản ghi vào `admin_logs`:
   (admin_id, action = "APPROVE_TUTOR", target_type = "TUTOR_PROFILE", ip_address)

=================== LUỒNG BẢNG VẼ TRỰC TUYẾN (WHITEBOARD SYNC) ===================
[Gia sư / Học sinh vẽ trên Canvas trong lớp học]
        ↓
1. Client gửi nét vẽ qua Socket.IO (Event: draw_element)
        ↓
2. Server Broadcast nét vẽ thời gian thực cho người còn lại trong phòng
        ↓
3. Định kỳ N giây / Khi kết thúc buổi → Lưu Snapshot JSON vào `whiteboard_states`
```

---

## 5. Giải thích Lý do Thiết kế & Điểm "ăn điểm" với Giáo viên

1. **Tại sao cần bảng `admin_logs` (Audit Log)?**
   * **Bảo mật & Tính minh bạch (Non-repudiation):** Mọi hành động nhạy cảm như duyệt tiền rút, khóa tài khoản hoặc thay đổi cấu hình đều được ghi nhận chi tiết kèm IP và timestamp. Giúp truy vết nguyên nhân nếu xảy ra sai sót hoặc hành vi gian lận.

2. **Mô hình Key-Value của `system_configs` mang lại lợi ích gì?**
   * **Động & Linh hoạt (Zero-downtime configuration):** Admin có thể điều chỉnh tỷ lệ hoa hồng chiết khấu, bật/tắt chế độ bảo trì hoặc giới hạn dung lượng file upload ngay trên màn hình Admin mà **không cần sửa code hay khởi động lại server**.

3. **Dữ liệu bảng vẽ `whiteboard_states` được đồng bộ và lưu trữ ra sao?**
   * **Kết hợp WebSockets + PostgreSQL JSON:** Trong quá trình giảng dạy, nét vẽ được truyền qua WebSocket (Socket.IO) để đạt độ trễ cực thấp (<50ms). Khi buổi học kết thúc, snapshot JSON được ghi vào `whiteboard_states` giúp học sinh xem lại bài học như một bài giảng tương tác.

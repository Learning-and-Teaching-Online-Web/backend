# 📌 MODULE 5: CLASS SESSION & ATTENDANCE (Buổi học & Điểm danh)

## 1. Giới thiệu tổng quan
Module **Class Session & Attendance** quản lý quá trình diễn ra các buổi học thực tế được phát sinh sau khi học sinh đặt lịch thành công (`Booking confirmed` ở Module 4):
- **Buổi học (ClassSession):** Đại diện cho từng buổi học cụ thể (VD: Buổi 1, Buổi 2...), theo dõi phòng học trực tuyến (room_id), tiêu đề bài học, thời gian bắt đầu/kết thúc thực tế và lưu ảnh chụp bảng vẽ điện tử (whiteboard).
- **Điểm danh (Attendance):** Ghi nhận sự tham gia của từng đối tượng (cả Gia sư và Học sinh) bao gồm thời điểm join/out phòng học và tổng số phút có mặt.
- **Ghi hình buổi học (SessionRecording):** Lưu các tệp video/audio ghi lại buổi học để học sinh xem lại bài giảng bất cứ lúc nào.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 5)

```
        +-----------------------+
        |     SessionStatus     | (ENUM: scheduled, ongoing, completed, cancelled, no_show)
        +-----------------------+
                    |
                    v
        +-----------------------+
        |   AttendanceStatus    | (ENUM: present, absent, late, excused)
        +-----------------------+
                    |
                    v
        +-----------------------+
        |   AttendanceMethod    | (ENUM: manual, auto, self)
        +-----------------------+
                    |
                    v
  +-----------------------------------+
  |          class_sessions           |
  +-----------------------------------+
  | PK  | session_id (UUID)           |
  | FK  | booking_id -> bookings      |
  |     | room_id (String)            |
  |     | title (String?)             |
  |     | scheduled_start (Timestamptz|
  |     | scheduled_end (Timestamptz) |
  |     | actual_start (Timestamptz?) |
  |     | actual_end (Timestamptz?)   |
  |     | status (SessionStatus)      |
  |     | whiteboard_snapshot (String?|
  |     | notes (String?)             |
  +-----------------------------------+
        |                       |
        | (1 - N)               | (1 - N)
        v                       v
+-------------------+   +-------------------+
|    attendances    |   | session_recordings|
+-------------------+   +-------------------+
| PK | attendance_id|   | PK | recording_id |
| FK | session_id   |   | FK | session_id   |
| FK | user_id      |   |    | file_url     |
|    | check_in_time|   |    | file_size_mb |
|    | check_out_tim|   |    | duration_sec |
|    | duration_min |   | FK | recorded_by  |
|    | status       |   |    | is_processed |
|    | method       |   |    | expires_at   |
+-------------------+   +-------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `SessionStatus` (Trạng thái buổi học)
*   `scheduled`: Đã lên lịch (Buổi học vừa được hệ thống khởi tạo tự động từ Booking, chưa tới giờ học).
*   `ongoing`: Đang diễn ra (Gia sư đã vào phòng học và bấm nút bắt đầu buổi học).
*   `completed`: Đã hoàn thành (Dạy xong đúng thời lượng, gia sư bấm kết thúc).
*   `cancelled`: Đã hủy (Buổi học bị hủy do xin nghỉ hoặc gia sư bận đột xuất).
*   `no_show`: Vắng mặt (Đến giờ học quá X phút timeout nhưng 1 trong 2 bên không vào phòng).

### 3.2. `AttendanceStatus` (Trạng thái điểm danh)
*   `present`: Có mặt đúng giờ.
*   `absent`: Vắng mặt hoàn toàn.
*   `late`: Đi muộn (vào phòng trễ hơn so với giờ bắt đầu quy định).
*   `excused`: Vắng có lý do (đã báo trước và được xác nhận).

### 3.3. `AttendanceMethod` (Phương thức điểm danh)
*   `manual`: Điểm danh thủ công (Gia sư đánh tích có mặt cho học sinh trên UI).
*   `auto`: Tự động (Hệ thống WebRTC/Socket tự ghi nhận khi học sinh kết nối vào phòng).
*   `self`: Tự điểm danh (Học sinh tự nhấn nút Check-in).

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `class_sessions` (Buổi học thực tế)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `session_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh buổi học. |
| `booking_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `bookings` | Liên kết tới đơn Đặt lịch (`onDelete: Cascade`). |
| `room_id` | `String` | Bắt buộc | Mã phòng học trực tuyến (Video call / WebRTC Room ID) để đôi bên join vào. |
| `title` | `String?` | Tùy chọn | Tiêu đề nội dung buổi học (VD: "Buổi 1: Giới hạn hàm số"). |
| `scheduled_start` | `DateTime` | `@db.Timestamptz` | Thời gian bắt đầu buổi học theo lịch hẹn ban đầu. |
| `scheduled_end` | `DateTime` | `@db.Timestamptz` | Thời gian kết thúc buổi học theo lịch hẹn ban đầu. |
| `actual_start` | `DateTime?` | `@db.Timestamptz` | Thời điểm thực tế Gia sư bấm "Bắt đầu buổi học". |
| `actual_end` | `DateTime?` | `@db.Timestamptz` | Thời điểm thực tế Gia sư bấm "Kết thúc buổi học". |
| `status` | `SessionStatus` | `@default(scheduled)` | Trạng thái tiến độ buổi học (`scheduled` → `ongoing` → `completed`). |
| `whiteboard_snapshot` | `String?` | Tùy chọn | URL ảnh chụp bảng vẽ điện tử khi buổi học kết thúc (cho học sinh ôn bài). |
| `notes` | `String?` | Tùy chọn | Ghi chú, nhận xét của gia sư sau buổi học. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày khởi tạo buổi học. |

---

### 4.2. Bảng `attendances` (Lịch sử điểm danh)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `attendance_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính cho bản ghi điểm danh. |
| `session_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `class_sessions` | Liên kết tới Buổi học (`onDelete: Cascade`). |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người được điểm danh (Gia sư hoặc Học sinh). |
| `check_in_time` | `DateTime?` | `@db.Timestamptz` | Thời điểm thực tế user join vào phòng học. |
| `check_out_time` | `DateTime?` | `@db.Timestamptz` | Thời điểm thực tế user rời khỏi phòng học. |
| `duration_minutes` | `Int?` | `@db.SmallInt` | Tổng số phút thực tế ngồi trong lớp học. |
| `status` | `AttendanceStatus` | `@default(absent)` | Kết quả điểm danh (`present`, `absent`, `late`, `excused`). |
| `method` | `AttendanceMethod?` | `@default(manual)` | Cách thức ghi nhận điểm danh. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bản ghi điểm danh. |

---

### 4.3. Bảng `session_recordings` (Video ghi hình buổi học)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `recording_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính tệp video ghi hình. |
| `session_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `class_sessions` | Liên kết tới Buổi học (`onDelete: Cascade`). |
| `file_url` | `String` | Bắt buộc | URL xem/tải video bài giảng lưu trên Cloud Storage. |
| `file_size_mb` | `Decimal?` | `@db.Decimal(8, 2)` | Dung lượng tệp video (MB). |
| `duration_seconds` | `Int?` | Tùy chọn | Độ dài video tính bằng giây. |
| `recorded_by` | `String` | `@db.Uuid`, Khóa ngoại -> `users` | Người thực hiện bấm ghi hình. |
| `is_processed` | `Boolean` | `@default(false)` | Trạng thái encode video (`false` = đang xử lý, `true` = đã sẵn sàng xem). |
| `expires_at` | `DateTime?` | `@db.Timestamptz` | Ngày video hết hạn lưu trữ (tự động dọn dẹp bộ nhớ Cloud). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo bản ghi ghi hình. |

---

## 5. Luồng hoạt động tổng thể Module 5 (Kịch bản thực tế 5 bước)

```
[Booking confirmed ở Module 4]
        ↓
[1. TỰ ĐỘNG KHỞI TẠO] ──> Hệ thống tạo N ClassSession (status = scheduled)
        ↓
[2. BẮT ĐẦU BUỔI HỌC] ──> Gia sư bấm "Bắt đầu" → ClassSession.status = ongoing
                            ClassSession.actual_start = now()
        ↓
[3. ĐIỂM DANH] ─────────> Học sinh & Gia sư join room
                            Attendance (user_id) → check_in_time = now(), status = present
        ↓
[4. KẾT THÚC BUỔI HỌC] ─> Gia sư bấm "Kết thúc" → ClassSession.status = completed
                            ClassSession.actual_end = now()
                            Lưu ảnh bảng vẽ → whiteboard_snapshot
        ↓
[5. XỬ LÝ GHI HÌNH] ────> Video được đẩy lên Cloud → SessionRecording.is_processed = true
                            Học sinh xem lại bài giảng trên ứng dụng
```

---

## 6. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật với Giáo viên

1. **Tại sao thiết kế cặp `scheduled_start/end` và `actual_start/end` song song?**
   * **Đánh giá uy tín & Xử lý tranh chấp:** `scheduled` là giờ hẹn trong hợp đồng đặt lịch, `actual` là giờ thực tế gia sư bấm dạy. Nếu gia sư liên tục bắt đầu trễ 20-30 phút so với giờ hẹn, hệ thống dựa vào dữ liệu này để cảnh báo gia sư hoặc hoàn lại một phần học phí cho học sinh.

2. **Tại sao điểm danh cả Gia sư lẫn Học sinh vào bảng `attendances`?**
   * **Tính công bằng 2 chiều:** Để đảm bảo quyền lợi, hệ thống cần đối soát cả hai phía. Ví dụ: Nếu học sinh vào lớp đúng giờ nhưng gia sư không vào (`Attendance.gia_su = absent`) → Hệ thống tự động hoàn tiền. Nếu gia sư vào dạy đủ giờ mà học sinh bỏ học (`Attendance.hoc_sinh = absent`) → Gia sư vẫn được nhận tiền buổi học đó.

3. **Thuộc tính `is_processed` và `expires_at` trong `session_recordings` giải quyết bài toán gì?**
   * **Trải nghiệm người dùng:** Video bài giảng cần vài phút để xử lý/chuyển mã (encoding/rendering). Thuộc tính `is_processed = false` giúp giao diện hiển thị thông báo *"Video đang được xử lý, vui lòng quay lại sau"* thay vì bị lỗi khi học sinh nhấn vào xem ngay.
   * **Tối ưu chi phí lưu trữ:** `expires_at` quy định thời hạn lưu trữ video (ví dụ: tự động xóa sau 6 tháng) giúp hệ thống không bị quá tải bộ nhớ lưu trữ Cloud.

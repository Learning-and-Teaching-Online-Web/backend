# 📌 MODULE 3: COURSE & SCHEDULE (Khóa học & Lịch giảng dạy)

## 1. Giới thiệu tổng quan
Module **Course & Schedule** quản lý các khóa học do Gia sư phát hành và lịch học chi tiết của từng khóa:
- **Khóa học (Course):** Đăng bán nội dung giảng dạy (Toán 12, IELTS, Tiếng Anh giao tiếp...), quy định học phí, thời lượng mỗi buổi, số lượng học sinh tối đa, tổng số buổi học (`total_sessions`), ngày học trong tuần (`course_days`) và giờ bắt đầu (`schedule_time`).
- **Ngày học trong tuần (CourseDay):** Lưu thông tin các ngày trong tuần gia sư dạy khóa học này (tái sử dụng enum `DayOfWeek`: mon, tue, wed, thu, fri, sat, sun).
- **Lịch giảng dạy chi tiết (CourseSchedule):** Từng buổi học cụ thể được backend tự động khởi tạo từ thông số của khóa học (từ buổi 1 đến buổi `total_sessions`). Khóa học hoàn thành khi tất cả các buổi học chuyển sang trạng thái `completed`.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 3)

```
        +-----------------------+
        |     CourseStatus      | (ENUM: draft, published, hidden, archived)
        +-----------------------+
                    |
                    v
  +-----------------------------------+
  |              courses              |
  +-----------------------------------+
  | PK  | course_id (UUID)            |
  | FK  | tutor_id -> tutor_profiles  |
  | FK  | subject_id -> subjects      |
  |     | title (String)              |
  |     | price (Decimal)             |
  |     | type (CourseType)           | (online, offline, video)
  |     | start_date (Date?)          |
  |     | schedule_time (String?)     | (VD: "07:00", "19:30")
  |     | duration_minutes (SmallInt) |
  |     | max_students (SmallInt)     | (1 = 1-1, >1 = dạy nhóm)
  |     | total_sessions (SmallInt)   | (Tổng số buổi học của khóa)
  |     | level (String?)             |
  |     | status (CourseStatus)       |
  |     | thumbnail_url (String?)     |
  +-----------------------------------+
        |                       |
        | (1 - N)               | (1 - N)
        v                       v
  +-------------------+   +-----------------------------------+
  |    course_days    |   |          course_schedules         |
  +-------------------+   +-----------------------------------+
  | PK | id (UUID)    |   | PK  | schedule_id (UUID)          |
  | FK | course_id    |   | FK  | course_id -> courses        |
  |    | day_of_week  |   |     | session_number (SmallInt)   | (Buổi 1, 2, ..., total_sessions)
  |    | (DayOfWeek)  |   |     | start_time (Timestamptz)    |
  +-------------------+   |     | end_time (Timestamptz)      |
                          |     | booked_count (SmallInt)     | (Số chỗ đã đặt)
                          |     | max_slot (SmallInt)         |
                          |     | status (SessionStatus)      | (upcoming, completed, cancelled)
                          +-----------------------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `CourseStatus` (Trạng thái khóa học)
*   `draft`: Bản nháp. Gia sư đang soạn thông tin, chưa công khai trên hệ thống.
*   `published`: Đã xuất bản. Khóa học hiển thị trên danh sách tìm kiếm, học sinh có thể xem và đặt lịch.
*   `hidden`: Tạm ẩn. Gia sư tạm thời ngưng nhận học sinh mới mà không cần xóa khóa học.
*   `archived`: Đã lưu trữ. Khóa học đã kết thúc hoàn toàn (tất cả các buổi đã hoàn thành).

### 3.2. `CourseType` (Phân loại khóa học)
*   `online`: Khóa học trực tuyến live với Gia sư theo lịch học cố định.
*   `offline`: Dạy trực tiếp tại nhà/trung tâm theo lịch.
*   `video`: Khóa học video quay sẵn (pre-recorded) cho học sinh tự học.

### 3.3. `SessionStatus` (Trạng thái buổi học)
*   `upcoming`: Buổi học sắp diễn ra.
*   `completed`: Buổi học đã dạy xong thành công.
*   `cancelled`: Buổi học bị hủy do sự cố hoặc báo hoãn.

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `courses` (Khóa học)
Lưu thông tin tổng quan của từng khóa học do gia sư tạo ra.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `course_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh khóa học. |
| `tutor_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Liên kết tới Gia sư tạo khóa học (`onDelete: Cascade`). |
| `title` | `String` | Bắt buộc | Tên khóa học (VD: "Toán 12 Luyện thi THPT Quốc Gia 9+"). |
| `subject_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `subjects` | Khóa ngoại liên kết tới danh mục Môn học. |
| `description` | `String?` | Tùy chọn | Mô tả chi tiết đề cương, mục tiêu khóa học. |
| `price` | `Decimal` | `@db.Decimal(10, 2)` | Học phí trọn gói khóa học (VND). |
| `type` | `CourseType` | `@default(online)` | Loại khóa học (`online` live, `offline` trực tiếp hoặc `video` tự học). |
| `start_date` | `DateTime?` | `@db.Date` | Ngày bắt đầu / khai giảng khóa Online. |
| `schedule_time` | `String?` | Tùy chọn | Giờ bắt đầu mỗi buổi học (VD: `"07:00"`, `"19:30"`). |
| `duration_minutes` | `Int` | `@db.SmallInt`, `@default(60)` | Thời lượng mỗi buổi học tính bằng phút (60, 90, 120 phút). |
| `max_students` | `Int` | `@db.SmallInt`, `@default(1)` | Số lượng học sinh tối đa (`1` = 1 kèm 1, `>1` = Lớp nhóm). |
| `total_sessions` | `Int` | `@db.SmallInt`, `@default(1)` | Tổng số buổi học trong toàn bộ khóa (VD: 10 buổi, 20 buổi). |
| `level` | `String?` | Tùy chọn | Trình độ khóa học (VD: "Cơ bản", "Nâng cao"). |
| `status` | `CourseStatus` | `@default(draft)` | Trạng thái khóa học (`draft`, `published`, `hidden`, `archived`). |
| `thumbnail_url` | `String?` | Tùy chọn | URL ảnh đại diện khóa học. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo khóa học. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật gần nhất. |

---

### 4.2. Bảng `course_days` (Ngày học trong tuần)
Lưu các ngày học trong tuần của khóa học (tái sử dụng enum `DayOfWeek`).

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Liên kết tới khóa học tương ứng (`onDelete: Cascade`). |
| `day_of_week` | `DayOfWeek` | Bắt buộc | Ngày học trong tuần (`mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`). |

---

### 4.3. Bảng `course_schedules` (Lịch & Các buổi học chi tiết)
Lưu từng buổi học cụ thể của khóa Online do Backend tự động tạo.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `schedule_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính định danh buổi học. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Liên kết tới khóa học tương ứng (`onDelete: Cascade`). |
| `session_number` | `Int` | `@db.SmallInt`, `@default(0)` | Thứ tự buổi học trong khóa (1, 2, ..., `total_sessions`). |
| `start_time` | `DateTime` | `@db.Timestamptz` | Thời gian bắt đầu buổi học cụ thể. |
| `end_time` | `DateTime` | `@db.Timestamptz` | Thời gian kết thúc buổi học. |
| `booked_count` | `Int` | `@db.SmallInt`, `@default(0)` | Số học sinh đã đăng ký buổi này. |
| `max_slot` | `Int` | `@db.SmallInt`, `@default(1)` | Số chỗ tối đa (bằng `max_students` của khóa học). |
| `status` | `SessionStatus` | `@default(upcoming)` | Trạng thái buổi học (`upcoming`, `completed`, `cancelled`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo buổi học. |

---

## 5. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật

1. **Khóa học tính theo số buổi (`total_sessions`) và sinh lịch tự động như thế nào?**
   * Khi Gia sư tạo khóa học chọn ngày dạy trong tuần (VD: Thứ 2 - Thứ 4 - Thứ 6 qua `course_days`), thời gian học (`schedule_time`) và số buổi (`total_sessions = 20`), Backend sẽ dựa trên `start_date` tự động tạo 20 bản ghi buổi học cụ thể (`CourseSchedule`) kèm theo `session_number` từ 1 tới 20.

2. **Cách theo dõi tiến độ hoàn thành khóa học?**
   * Mỗi khi gia sư hoàn thành 1 buổi dạy, trạng thái `SessionStatus` của buổi đó chuyển thành `completed`. Khi tất cả `total_sessions` buổi đều có trạng thái `completed`, khóa học tự động chuyển trạng thái `status = archived`.

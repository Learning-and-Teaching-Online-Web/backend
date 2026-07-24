# 📌 MODULE 3: COURSE & SCHEDULE (Khóa học & Lịch giảng dạy)

## 1. Giới thiệu tổng quan
Module **Course & Schedule** quản lý các khóa học do Gia sư phát hành và lịch học chi tiết của từng khóa:
- **Khóa học (Course):** Đăng bán nội dung giảng dạy (Toán 12, IELTS, Tiếng Anh giao tiếp...), quy định học phí, thời lượng mỗi buổi, số lượng học sinh tối đa (dạy 1-1 hay dạy nhóm).
- **Lịch giảng dạy (CourseSchedule):** Tạo các slot khung giờ học cụ thể (VD: Thứ 2 từ 19h00-20h30), hỗ trợ cấu hình lịch lặp lại hàng tuần (`is_recurring`).

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
  |     | title (String)              |
  |     | subject (String)            |
  |     | price (Decimal)             |
  |     | duration_minutes (SmallInt) |
  |     | max_students (SmallInt)     | (1 = 1-1, >1 = dạy nhóm)
  |     | total_sessions (SmallInt)   |
  |     | status (CourseStatus)       |
  |     | tags (Json)                 |
  +-----------------------------------+
                    |
                    | (1 - N)
                    v
  +-----------------------------------+
  |          course_schedules         |
  +-----------------------------------+
  | PK  | schedule_id (UUID)          |
  | FK  | course_id -> courses        |
  |     | start_time (Timestamptz)    |
  |     | end_time (Timestamptz)      |
  |     | is_recurring (Boolean)      | (Lịch lặp lại tuần)
  |     | day_of_week (SmallInt?)     | (0=CN, 1=T2, ..., 6=T7)
  |     | recurrence_end (Date?)      |
  |     | is_booked (Boolean)         |
  |     | max_slot (SmallInt)         |
  +-----------------------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `CourseStatus` (Trạng thái khóa học)
*   `draft`: Bản nháp. Gia sư đang soạn thông tin, chưa công khai trên hệ thống.
*   `published`: Đã xuất bản. Khóa học hiển thị trên danh sách tìm kiếm, học sinh có thể xem và chọn lịch học.
*   `hidden`: Tạm ẩn. Gia sư tạm thời ngưng nhận học sinh mới mà không cần xóa khóa học.
*   `archived`: Đã lưu trữ. Khóa học đã kết thúc hoàn toàn, chỉ giữ lại để xem thống kê/lịch sử.

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `courses` (Khóa học)
Lưu thông tin tổng quan của từng khóa học do gia sư tạo ra.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `course_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh khóa học. |
| `tutor_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Liên kết tới Gia sư tạo khóa học (`onDelete: Cascade` - xóa gia sư xóa toàn bộ khóa học). |
| `title` | `String` | Bắt buộc | Tên khóa học (VD: "Toán 12 Luyện thi THPT Quốc Gia 9+"). |
| `subject` | `String` | Bắt buộc | Môn học chính (VD: "Toán", "Vật Lý", "Tiếng Anh") dùng để lọc & tìm kiếm. |
| `description` | `String?` | Tùy chọn | Mô tả chi tiết đề cương, mục tiêu và cam kết chất lượng của khóa học. |
| `price` | `Decimal` | `@db.Decimal(10, 2)` | Học phí trọn gói khóa học (dùng `Decimal` đảm bảo chính xác về số tiền). |
| `duration_minutes` | `Int` | `@db.SmallInt`, `@default(60)` | Thời lượng mỗi buổi học tính bằng phút (VD: 60 phút, 90 phút). |
| `max_students` | `Int` | `@db.SmallInt`, `@default(1)` | Số lượng học sinh tối đa (`1` = Lớp gia sư 1 kèm 1, `>1` = Lớp học nhóm từ 2-5 học sinh). |
| `total_sessions` | `Int` | `@db.SmallInt`, `@default(1)` | Tổng số buổi học cấu thành khóa học (VD: khóa 10 buổi, 12 buổi). |
| `level` | `String?` | Tùy chọn | Trình độ khóa học (VD: "Cơ bản", "Nâng cao", "Luyện thi Cấp tốc"). |
| `status` | `CourseStatus` | `@default(draft)` | Trạng thái hiển thị của khóa học (`draft`, `published`, `hidden`, `archived`). |
| `thumbnail_url` | `String?` | Tùy chọn | URL ảnh minh họa khóa học hiển thị ở giao diện trang chủ / tìm kiếm. |
| `tags` | `Json?` | Mặc định `[]`, Index GIN | Mảng JSON chứa các từ khóa tìm kiếm (VD: `["Lớp 12", "Ôn thi Đại học", "SGK Mới"]`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo khóa học. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật thông tin khóa học gần nhất. |

---

### 4.2. Bảng `course_schedules` (Lịch & Khung giờ giảng dạy)
Lưu các khung giờ học khả dụng để học sinh lựa chọn khi đặt chỗ (Booking).

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `schedule_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh khung giờ. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Liên kết tới khóa học tương ứng (`onDelete: Cascade`). |
| `start_time` | `DateTime` | `@db.Timestamptz` | Thời gian bắt đầu buổi học (có lưu kèm múi giờ). |
| `end_time` | `DateTime` | `@db.Timestamptz` | Thời gian kết thúc buổi học. |
| `is_recurring` | `Boolean` | `@default(false)` | Cờ đánh dấu lịch lặp lại hàng tuần (`true` = lặp lại vào thứ chỉ định, `false` = lịch dạy 1 buổi cố định). |
| `day_of_week` | `Int?` | `@db.SmallInt` | Thứ trong tuần nếu lịch lặp lại (`0` = Chủ Nhật, `1` = Thứ 2, `2` = Thứ 3, ..., `6` = Thứ 7). |
| `recurrence_end` | `DateTime?` | `@db.Date` | Ngày hết hạn của chuỗi lịch lặp lại. |
| `is_booked` | `Boolean` | `@default(false)` | Cờ đánh dấu slot này đã được đặt đủ chỗ chưa (`true` = hết chỗ, không thể đặt thêm). |
| `max_slot` | `Int` | `@db.SmallInt`, `@default(1)` | Số lượng chỗ tối đa cho slot này (bằng `max_students` của khóa học). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo slot lịch. |

---

## 5. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật Module 3 với Giáo viên

1. **Ý nghĩa của cột `max_students` trong bảng `courses` là gì?**
   * **Linh hoạt mô hình dạy:** Cho phép hệ thống hỗ trợ cả 2 mô hình kinh doanh gia sư: **Dạy 1 kèm 1** (`max_students = 1`) và **Dạy nhóm nhỏ** (`max_students = 2 -> 10`). Việc đặt sẵn cột này giúp Backend xử lý logic kiểm tra còn chỗ (`slot`) dễ dàng.

2. **Tại sao thiết kế cơ chế Lịch lặp lại (`is_recurring`, `day_of_week`)?**
   * **Tiết kiệm thời gian cho Gia sư:** Thay vì Gia sư phải tạo 12 slot riêng lẻ cho khóa học 12 buổi, Gia sư chỉ cần tạo 1 slot cố định (VD: Thứ 2 từ 19h-21h, lặp lại trong 3 tháng). Backend sẽ dựa vào các thông số này để tự động sinh ra các buổi học thực tế (`class_sessions`).

3. **Luồng liên kết từ Khóa học -> Khung giờ -> Đặt lịch (Booking) hoạt động ra sao?**
   ```
   [1. Gia sư tạo Course] -> [2. Gia sư tạo CourseSchedule slots]
                                          |
                                          v
                                [3. Học sinh chọn Slot] -> [4. Tạo Booking ở Module 4]
   ```

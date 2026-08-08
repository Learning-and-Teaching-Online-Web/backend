# 📌 MODULE 12: GIA SƯ OFFLINE & BẢNG GIÁ THAM KHẢO

## 1. Giới thiệu tổng quan

Module **Gia sư Offline & Bảng giá tham khảo** quản lý tính năng tìm và chọn gia sư dạy trực tiếp tại nhà/trung tâm:
- **Yêu cầu mở lớp (ClassRequest):** Phụ huynh/Học viên đăng yêu cầu tìm gia sư offline (lớp, môn, số buổi/tuần, địa chỉ, mức lương mong muốn, yêu cầu gia sư). Admin tiếp nhận, kiểm tra và duyệt mở lớp.
- **Ứng tuyển nhận lớp (ClassApplication):** Gia sư đăng ký ứng tuyển nhanh cho các lớp offline đang mở (`OPEN`). Admin duyệt và chọn gia sư phù hợp.
- **Bảng giá tham khảo (ReferencePrice):** Lưu trữ bảng giá mức lương gia sư tham khảo theo khối lớp và số buổi/tuần, giúp phụ huynh và gia sư có căn cứ tham chiếu mức học phí hợp lý.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 12)

```
        +-----------------------+
        |  ClassRequestStatus   | (ENUM: PENDING_ADMIN, WAITING_TUTOR_CONFIRM, OPEN, ASSIGNED, REJECTED, CANCELLED)
        +-----------------------+
                    |
                    v
  +-----------------------------------+
  |           class_requests          |
  +-----------------------------------+
  | PK  | request_id (UUID)           |
  | UNQ | code (String?)              | (VD: "MS: 89513")
  | FK  | student_id -> student_prof  |
  | FK  | grade_id -> grades          |
  | FK  | subject_id -> subjects      |
  |     | student_name, phone, email  |
  |     | address_detail, district    |
  |     | province                    |
  |     | subject_name, num_students  |
  |     | sessions_per_week, study_time|
  |     | tutor_requirement           |
  | FK  | selected_tutor_id -> tutor  |
  |     | academic_level              |
  |     | selected_tutor_code         |
  |     | desired_price (Decimal)     |
  |     | commission_rate (Decimal)   | (Mặc định 35%)
  |     | fee_amount (Decimal?)       |
  |     | other_requirements          |
  |     | status (ClassRequestStatus) |
  | FK  | assigned_tutor_id -> tutor  |
  |     | payment_deadline (DateTime?)|
  +-----------------------------------+
                    |
                    | (1 - N)
                    v
  +-----------------------------------+
  |         class_applications        |
  +-----------------------------------+
  | PK  | application_id (UUID)       |
  | FK  | class_request_id -> requests|
  | FK  | tutor_id -> tutor_profiles  |
  |     | applicant_phone (String)    |
  |     | available_from (Date?)      |
  |     | notes (String?)             |
  |     | status (ApplicationStatus)  | (PENDING, APPROVED, REJECTED)
  +-----------------------------------+

  +-----------------------------------+
  |         reference_prices          |
  +-----------------------------------+
  | PK  | price_id (UUID)             |
  |     | grade_group (String)        | (VD: "LỚP 1, 2, 3, 4")
  |     | sessions_per_week (Int)     | (2, 3, 4, 5)
  |     | student_tutor_price (String)| (VD: "600 - 700")
  |     | teacher_tutor_price (String)| (VD: "1100 - 1300")
  +-----------------------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `ClassRequestStatus` (Trạng thái yêu cầu lớp offline)
*   `PENDING_ADMIN`: Mới tạo, chờ Admin kiểm tra và duyệt mở lớp.
*   `WAITING_TUTOR_CONFIRM`: Học viên điền mã gia sư chọn trước, chờ Admin liên hệ gia sư.
*   `OPEN`: Lớp chưa giao / Đang cần gia sư (hiển thị danh sách công khai cho gia sư ứng tuyển).
*   `ASSIGNED`: Đã giao lớp cho gia sư thành công.
*   `REJECTED`: Admin từ chối yêu cầu.
*   `CANCELLED`: Học viên hủy yêu cầu.

### 3.2. `ClassApplicationStatus` (Trạng thái ứng tuyển lớp)
*   `PENDING`: Đã gửi đơn ứng tuyển, chờ Admin duyệt.
*   `APPROVED`: Được Admin duyệt và giao lớp.
*   `REJECTED`: Bị từ chối ứng tuyển.

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `class_requests` (Yêu cầu tìm gia sư offline)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `request_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh yêu cầu. |
| `code` | `String?` | `@unique` | Mã lớp học hiển thị (VD: `"MS: 89513"`). |
| `student_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `student_profiles` | Liên kết tới hồ sơ học sinh (nếu đã đăng nhập). |
| `student_name` | `String` | Bắt buộc | Họ tên học viên / phụ huynh liên hệ. |
| `phone` | `String` | Bắt buộc | Số điện thoại liên hệ. |
| `email` | `String?` | Tùy chọn | Email liên hệ. |
| `address_detail` | `String` | Bắt buộc | Địa chỉ chi tiết (VD: "Số 123 Đường Tỉnh Lộ 43, Phường Bình Chiểu"). |
| `district` | `String?` | Tùy chọn | Quận / Huyện (VD: "Q. Thủ Đức"). |
| `province` | `String?` | Tùy chọn | Tỉnh / Thành phố (VD: "TP. Hồ Chí Minh"). |
| `grade_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `grades` | Khối lớp cần dạy (đã chuẩn hóa). |
| `subject_name` | `String` | Bắt buộc | Môn học cần gia sư (VD: "Toán", "Tiếng Anh"). |
| `subject_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `subjects` | Khóa ngoại tới môn học chuẩn hóa. |
| `num_students` | `Int` | `@default(1)` | Số lượng học sinh học cùng lớp. |
| `academic_level` | `String?` | Tùy chọn | Học lực hiện tại / thông tin bổ sung của học sinh. |
| `sessions_per_week` | `Int` | `@default(2)` | Số buổi học mỗi tuần (VD: 2 buổi/tuần). |
| `study_time` | `String?` | Tùy chọn | Khung giờ học (VD: "120 phút/buổi, các tối T2-T4 từ 18h-20h"). |
| `tutor_requirement` | `String?` | Tùy chọn | Yêu cầu đối với gia sư (VD: "Sinh viên Sư phạm Toán", "Giáo viên"). |
| `selected_tutor_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Gia sư được học viên chọn trước (nếu có). |
| `selected_tutor_code` | `String?` | Tùy chọn | Mã số gia sư học viên điền thủ công. |
| `desired_price` | `Decimal` | `@db.Decimal(12, 2)`, `@default(0)` | Mức lương mong muốn (VNĐ/tháng). |
| `commission_rate` | `Decimal` | `@db.Decimal(5, 2)`, `@default(35)` | Phí nhận lớp của trung tâm (%). |
| `other_requirements` | `String?` | Tùy chọn | Các yêu cầu khác. |
| `status` | `ClassRequestStatus` | `@default(PENDING_ADMIN)` | Trạng thái của lớp (`PENDING_ADMIN`, `OPEN`, `ASSIGNED`...). |
| `assigned_tutor_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Gia sư chính thức được giao lớp. |
| `payment_deadline` | `DateTime?` | `@db.Timestamptz` | Hạn thanh toán phí nhận lớp (sau khi xác nhận + 48 giờ). |
| `fee_amount` | `Decimal?` | `@db.Decimal(12, 2)` | Số tiền phí nhận lớp (= `desired_price` * `commission_rate` / 100). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo yêu cầu. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật gần nhất. |

---

### 4.2. Bảng `class_applications` (Đơn ứng tuyển nhận lớp offline)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `application_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính đơn ứng tuyển. |
| `class_request_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `class_requests` | Liên kết tới lớp học offline (`onDelete: Cascade`). |
| `tutor_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Gia sư đăng ký ứng tuyển (`onDelete: SetNull`). |
| `applicant_phone` | `String` | Bắt buộc | Số điện thoại gia sư ứng tuyển. |
| `available_from` | `DateTime?` | `@db.Date` | Ngày sớm nhất có thể nhận lớp. |
| `notes` | `String?` | Tùy chọn | Ghi chú từ gia sư khi ứng tuyển. |
| `status` | `ClassApplicationStatus` | `@default(PENDING)` | Trạng thái ứng tuyển (`PENDING`, `APPROVED`, `REJECTED`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày gửi đơn ứng tuyển. |

---

### 4.3. Bảng `reference_prices` (Bảng giá tham khảo)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `price_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính bảng giá. |
| `grade_group` | `String` | Bắt buộc | Nhóm khối lớp (VD: "LỚP 1, 2, 3, 4", "LỚP 9, 10, 11, 12"). |
| `sessions_per_week` | `Int` | Bắt buộc | Số buổi học trong 1 tuần (2, 3, 4, 5 buổi/tuần). |
| `student_tutor_price` | `String` | Bắt buộc | Khung giá tham khảo cho Gia sư Sinh viên (VD: "600 - 700" k/tháng). |
| `teacher_tutor_price` | `String` | Bắt buộc | Khung giá tham khảo cho Gia sư Giáo viên (VD: "1100 - 1300" k/tháng). |

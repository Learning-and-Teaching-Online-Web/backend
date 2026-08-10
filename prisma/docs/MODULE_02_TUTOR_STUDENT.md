# 📌 MODULE 2: TUTOR & STUDENT PROFILE (Hồ sơ Gia sư & Học sinh)

## 1. Giới thiệu tổng quan
Module **Tutor & Student Profile** mở rộng thông tin chi tiết cho từng nhóm đối tượng người dùng:
- **Gia sư (Tutor):** Lưu kinh nghiệm, bằng cấp chứng chỉ, học phí, môn dạy, vị trí nhận dạy offline, trạng thái kiểm duyệt từ Admin.
- **Học sinh (Student):** Lưu cấp học, mục tiêu học tập, môn học mong muốn, ngân sách (min-max) để làm đầu vào cho thuật toán **AI Matching**.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 2)

```
        +-----------------------+
        |     TeachingMode      | (ENUM: online, offline, both)
        +-----------------------+
                    |
                    v
        +-----------------------+
        |  VerificationStatus   | (ENUM: pending, approved, rejected)
        +-----------------------+
                    |
      +-------------+-------------+
      |                           |
      v                           v
+-------------------+   +-------------------+
|   tutor_profiles  |   |  student_profiles |
+-------------------+   +-------------------+
| PK | tutor_id     |   | PK | student_id   |
| FK | user_id (1-1)|   | FK | user_id (1-1)| 
|    | tutor_code   |   |    | full_name    |
|    | full_name    |   |    | phone        |
|    | phone        |   |    | avatar_url   |
|    | avatar_url   |   |    | date_of_birth|
|    | date_of_birth|   |    | gender       |
|    | gender       |   |    | address_dtl  |
|    | hometown     |   | FK | grade_id     |
|    | curr_address |   |    | academic_lvl |
|    | university   |   +-------------------+
|    | major        |
|    | current_role |
|    | min_salary   |
|    | exp_years    |
|    | rating       |
|    | teach_mode   |
|    | verify_stat  |
+-------------------+
          |
          | (1 - N)
          v
+-------------------+
| tutor_certificates|
+-------------------+
| PK | cert_id      |
| FK | tutor_id     |
|    | title        |
|    | file_url     |
| FK | admin_id     |
|    | status       |
+-------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `TeachingMode` (Hình thức giảng dạy)
*   `online`: Dạy trực tuyến qua các nền tảng video call & bảng vẽ điện tử.
*   `offline`: Dạy trực tiếp tại nhà học sinh hoặc địa điểm hẹn trước.
*   `both`: Gia sư sẵn sàng dạy cả hình thức online và offline.

### 3.2. `VerificationStatus` (Trạng thái xét duyệt)
*   `pending`: Đang chờ Admin kiểm tra hồ sơ / bằng cấp.
*   `approved`: Đã được Admin phê duyệt, gia sư được phép mở lớp / bằng cấp hợp lệ.
*   `rejected`: Hồ sơ / Bằng cấp không đạt yêu cầu (Admin ghi rõ lý do từ chối vào `admin_note`).

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `tutor_profiles` (Hồ sơ gia sư)
Tách riêng khỏi `users` để tối ưu kích thước bảng `users` và chứa các thuộc tính nghiệp vụ đặc thù của người dạy.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `tutor_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh hồ sơ gia sư. |
| `user_id` | `String` (UUID) | `@unique`, Khóa ngoại -> `users` | Liên kết 1-1 với tài khoản User. Xóa User thì tự động xóa hồ sơ gia sư (`onDelete: Cascade`). |
| `tutor_code` | `String?` | `@unique` | Mã số gia sư cấp tự động (VD: GS7650). |
| `full_name` | `String` | `@default("")` | Họ và tên đầy đủ của gia sư. |
| `phone` | `String?` | Tùy chọn | Số điện thoại liên hệ. |
| `avatar_url` | `String?` | Tùy chọn | Đường dẫn ảnh đại diện. |
| `date_of_birth` | `DateTime?` | `@db.Date` | Ngày tháng năm sinh. |
| `gender` | `String?` | Tùy chọn | Giới tính ("male", "female", "other"). |
| `hometown` | `String?` | Tùy chọn | Nguyên quán (Tỉnh / Thành). |
| `current_address` | `String?` | Tùy chọn | Địa chỉ hiện tại (Số nhà, đường, phường, quận...). |
| `id_card_front_url` | `String?` | Tùy chọn | Đường dẫn ảnh CCCD mặt trước. |
| `university` | `String?` | Tùy chọn | Trường đại học / cao đẳng đang học hoặc đã tốt nghiệp. |
| `major` | `String?` | Tùy chọn | Ngành học (VD: Sư phạm Toán). |
| `graduation_year` | `Int?` | Tùy chọn | Năm tốt nghiệp (VD: 2024). |
| `current_role` | `String?` | Tùy chọn | Hiện là (Sinh viên, Giáo viên, Cử nhân, Kỹ sư...). |
| `min_salary_requirement` | `String?` | Tùy chọn | Yêu cầu lương tối thiểu. |
| `experience_years` | `Int?` | `@db.SmallInt`, Mặc định `0` | Số năm kinh nghiệm dạy học. |
| `rating` | `Decimal?` | `@db.Decimal(2, 1)`, Mặc định `0` | Điểm đánh giá trung bình từ 0.0 đến 5.0. |
| `review_count` | `Int` | Mặc định `0` | Tổng số lượng đánh giá nhận được. |
| `teaching_mode` | `TeachingMode` | `@default(both)` | Hình thức nhận dạy (online, offline, both). |
| `verified_status` | `VerificationStatus` | `@default(pending)` | Trạng thái xét duyệt hồ sơ từ Admin. |
| `is_featured` | `Boolean` | `@default(false)` | Cờ đánh dấu gia sư xuất sắc / nổi bật. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo hồ sơ gia sư. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật hồ sơ gần nhất. |

---

### 4.2. Bảng `student_profiles` (Hồ sơ học sinh)
Lưu thông tin nhu cầu học tập làm đầu vào cho thuật toán AI gợi ý (AI Matching).

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `student_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất cho hồ sơ học sinh. |
| `user_id` | `String` (UUID) | `@unique`, Khóa ngoại -> `users` | Liên kết 1-1 với tài khoản User. |
| `full_name` | `String` | `@default("")` | Họ và tên đầy đủ của học sinh. |
| `phone` | `String?` | Tùy chọn | Số điện thoại liên hệ. |
| `avatar_url` | `String?` | Tùy chọn | Đường dẫn ảnh đại diện. |
| `date_of_birth` | `DateTime?` | `@db.Date` | Ngày tháng năm sinh. |
| `gender` | `String?` | Tùy chọn | Giới tính ("male", "female", "other"). |
| `address_detail` | `String?` | Tùy chọn | Địa chỉ chi tiết (Số nhà, đường...). |
| `province` | `String?` | Tùy chọn | Tỉnh / Thành phố. |
| `district` | `String?` | Tùy chọn | Quận / Huyện. |
| `grade_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `grades` | Liên kết tới khối lớp đang học. |
| `academic_level` | `String?` | Tùy chọn | Học lực hiện tại ("Giỏi", "Khá", "Trung bình"). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo hồ sơ học sinh. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật hồ sơ gần nhất. |

---

### 4.3. Bảng `tutor_certificates` (Bằng cấp & Chứng chỉ gia sư)
Lưu các minh chứng trình độ chuyên môn do gia sư upload.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `cert_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính định danh chứng chỉ. |
| `tutor_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Liên kết tới gia sư sở hữu. |
| `title` | `String` | Bắt buộc | Tên chứng chỉ / bằng cấp (VD: "Bằng Cử nhân Sư phạm Toán", "IELTS 8.0"). |
| `file_url` | `String` | Bắt buộc | URL dẫn tới file scan ảnh/PDF bằng cấp lưu trên Cloud Storage. |
| `file_type` | `String?` | Tùy chọn | Định dạng file (`application/pdf`, `image/jpeg`...). |
| `issued_by` | `String?` | Tùy chọn | Đơn vị / Trường cấp (VD: "ĐH Sư phạm Hà Nội", "IDP Education"). |
| `issued_date` | `DateTime?` | `@db.Date` | Ngày được cấp bằng. |
| `expiry_date` | `DateTime?` | `@db.Date` | Ngày hết hạn của chứng chỉ (nếu có, VD: IELTS/TOEIC có hiệu lực 2 năm). |
| `verified_by_admin` | `String?` | `@db.Uuid`, Khóa ngoại -> `users` | Ghi nhận ID của Admin đã tiến hành duyệt bằng cấp này. |
| `status` | `VerificationStatus` | `@default(pending)` | Trạng thái phê duyệt chứng chỉ (`pending`, `approved`, `rejected`). |
| `admin_note` | `String?` | Tùy chọn | Ghi chú phản hồi từ Admin (bắt buộc khi từ chối để gia sư biết lý do chỉnh sửa lại). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày upload bằng cấp. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật trạng thái duyệt. |

---

## 5. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật Module 2 với Giáo viên

1. **Tại sao tách riêng `tutor_profiles` và `student_profiles` thành 2 bảng độc lập?**
   * **Chuẩn hóa dữ liệu:** Giúp bảng `users` gọn nhẹ. Không bị tình trạng "cột thừa" (null value) lớn (ví dụ: Học sinh không cần thuộc tính `hourly_rate`, `experience_years`, `education`; ngược lại Gia sư không cần `grade_level`, `budget_max`).
   * **Dễ mở rộng:** Khi muốn bổ sung tính năng riêng cho Gia sư hoặc Học sinh, ta chỉ cần sửa bảng tương ứng mà không làm ảnh hưởng đến tài khoản User chung.

2. **Tại sao dùng kiểu JSON (`Json`) cho môn học (`subjects`, `preferred_subjects`)?**
   * Dữ liệu môn học của gia sư thuộc dạng danh sách động (có gia sư dạy 1 môn, có gia sư dạy 3-4 môn). Dùng kiểu JSON giúp lưu trữ linh hoạt mảng dữ liệu mà không cần tạo thêm bảng trung gian nhiều-nhiều phức tạp khi ở quy mô vừa và nhỏ.
   * PostgreSQL hỗ trợ đánh chỉ mục GIN (`@@index([subjects], type: Gin)`) giúp truy vấn tìm gia sư theo môn dạy bằng JSON vẫn đạt tốc độ cực nhanh.

3. **Lưu vết duyệt chứng chỉ bằng `verified_by_admin` và `admin_note` để làm gì?**
   * **Tính minh bạch và Audit:** Hệ thống quản trị cần biết chính xác Admin nào đã phê duyệt chứng chỉ này nhằm nâng cao trách nhiệm kiểm duyệt.
   * **Trải nghiệm gia sư:** Khi từ chối (`rejected`), cột `admin_note` truyền đạt nguyên nhân (VD: "Ảnh bằng cấp bị mờ, vui lòng chụp lại rõ nét hơn") giúp gia sư cập nhật lại dễ dàng.

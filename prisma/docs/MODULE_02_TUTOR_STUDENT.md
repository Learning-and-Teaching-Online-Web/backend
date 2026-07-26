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
|    | bio          |   |    | grade_level  |
|    | education    |   |    | goals        |
|    | experience   |   |    | pref_subjects|
|    | hourly_rate  |   |    | pref_mode    |
|    | subjects     |   |    | budget_min   |
|    | rating       |   |    | budget_max   |
+-------------------+   +-------------------+
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
| `bio` | `String?` | Tùy chọn | Giới thiệu chi tiết về phương pháp dạy, thế mạnh cá nhân. |
| `education` | `String?` | Tùy chọn | Trình độ học vấn (VD: Thạc sĩ Toán học - ĐH Sư Phạm TP.HCM). |
| `experience_years` | `Int?` | `@db.SmallInt`, Mặc định `0` | Số năm kinh nghiệm giảng dạy (dùng `SmallInt` tiết kiệm dung lượng). |
| `hourly_rate` | `Decimal` | `@db.Decimal(10, 2)` | Mức học phí đề xuất trên 1 giờ dạy (VD: `250000.00` VND). Dùng `Decimal` đảm bảo chính xác khi tính toán doanh thu. |
| `subjects` | `Json` | Mặc định `[]`, Index GIN | Mảng JSON lưu danh sách môn học dạy được (VD: `["Toán", "Vật Lý"]`). |
| `specialties` | `Json?` | Mặc định `[]` | Mảng JSON lưu chuyên môn sâu (VD: `["Luyện thi ĐH 9+", "IELTS Speaking 8.0"]`). |
| `rating` | `Decimal?` | `@db.Decimal(2, 1)`, Mặc định `0` | Điểm đánh giá trung bình từ 0.0 đến 5.0 (tự động tính từ các bài review của học sinh). |
| `review_count` | `Int` | Mặc định `0` | Tổng số lượng đánh giá nhận được (lưu sẵn để tăng tốc hiển thị không cần COUNT liên tục). |
| `teaching_mode` | `TeachingMode` | `@default(both)` | Hình thức nhận dạy (online, offline, both). |
| `province` | `String?` | Tùy chọn | Tỉnh / Thành phố nhận dạy offline. |
| `district` | `String?` | Tùy chọn | Quận / Huyện nhận dạy offline (dùng tìm kiếm gia sư quanh khu vực). |
| `verified_status` | `VerificationStatus` | `@default(pending)` | Trạng thái xét duyệt hồ sơ từ Admin. |
| `is_featured` | `Boolean` | `@default(false)` | Cờ đánh dấu gia sư xuất sắc / nổi bật để ưu tiên đề xuất trên trang chủ. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo hồ sơ gia sư. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật hồ sơ gần nhất. |

---

### 4.2. Bảng `student_profiles` (Hồ sơ học sinh)
Lưu thông tin nhu cầu học tập làm đầu vào cho thuật toán AI gợi ý (AI Matching).

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `student_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất cho hồ sơ học sinh. |
| `user_id` | `String` (UUID) | `@unique`, Khóa ngoại -> `users` | Liên kết 1-1 với tài khoản User. |
| `grade_level` | `String?` | Tùy chọn | Cấp học hiện tại (VD: "Lớp 12", "Sinh viên năm 1", "Người đi làm"). |
| `learning_goals` | `String?` | Tùy chọn | Mục tiêu học tập (VD: "Thi đỗ Đại học Bách Khoa", "Giao tiếp Tiếng Anh"). |
| `preferred_subjects` | `Json?` | Mặc định `[]` | Danh sách môn học muốn tìm gia sư (dùng cho AI matching). |
| `preferred_mode` | `TeachingMode?` | Tùy chọn | Hình thức mong muốn học (online hay offline). |
| `budget_min` | `Decimal?` | `@db.Decimal(10, 2)` | Mức chi trả tối thiểu / giờ học. |
| `budget_max` | `Decimal?` | `@db.Decimal(10, 2)` | Mức chi trả tối đa / giờ học (AI lọc gia sư có `hourly_rate` phù hợp với khoảng ngân sách này). |
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

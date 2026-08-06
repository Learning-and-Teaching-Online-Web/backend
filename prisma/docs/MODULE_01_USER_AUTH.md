# 📌 MODULE 1: USER & AUTHENTICATION (Nguồn người dùng & Xác thực)

## 1. Giới thiệu tổng quan
Module **User & Auth** đóng vai trò là "xương sống" cho toàn bộ hệ thống. Tất cả mọi thực thể trong hệ thống như Gia sư (Tutor), Học sinh (Student), Đặt lịch (Booking), Tin nhắn (Message), Bài viết (Article)... đều liên kết trực tiếp hoặc gián tiếp tới tài khoản người dùng tại module này.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 1)

```
        +-----------------------+
        |       UserRole        | (ENUM: student, tutor, admin)
        +-----------------------+
                    |
                    v
        +-----------------------+
        |      UserStatus       | (ENUM: active, suspended, deleted)
        +-----------------------+
                    |
                    v
  +-----------------------------------+
  |               users               |
  +-----------------------------------+
  | PK  | user_id (UUID)              | <-----+ (1 - 1) TutorProfile
  | UNQ | email (Citext)              | <-----+ (1 - 1) StudentProfile
  |     | full_name (String)          | <-----+ (1 - 1) Wallet
  |     | phone (String?)             | <-----+ (1 - N) Booking
  |     | avatar_url (String?)        | <-----+ (1 - N) Transaction
  |     | date_of_birth (Date?)       | <-----+ (1 - N) Payout (processed_by)
  |     | gender (String?)            | <-----+ (1 - N) Article (author_id)
  |     | bio (String?)               | <-----+ (1 - N) ArticleComment
  |     | role (UserRole)             | <-----+ (1 - N) CourseComment
  |     | status (UserStatus)         |
  |     | email_verified (Boolean)    |
  |     | social_provider (String?)   |
  |     | social_id (String?)         |
  |     | created_at (Timestamptz)    |
  |     | updated_at (Timestamptz)    |
  |     | last_login_at (Timestamptz) |
  +-----------------------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `UserRole` (Phân quyền người dùng)
*   **Mục đích:** Xác định vai trò của người dùng trong hệ thống để thực hiện phân quyền (RBAC - Role-Based Access Control).
*   **Các giá trị:**
    *   `student`: Học sinh / Phụ huynh (Có quyền tìm kiếm gia sư, đăng ký khóa học, đặt lịch, làm bài kiểm tra, bình luận).
    *   `tutor`: Gia sư (Có quyền tạo khóa học, quản lý lịch dạy, điểm danh, tạo quiz, nhận tiền rút về ngân hàng).
    *   `admin`: Quản trị viên (Có quyền duyệt hồ sơ gia sư, duyệt bằng cấp, quản lý cấu hình hệ thống, xem log hoạt động).

### 3.2. `UserStatus` (Trạng thái tài khoản)
*   **Mục đích:** Quản lý vòng đời tài khoản của người dùng.
*   **Các giá trị:**
    *   `active`: Tài khoản đang hoạt động bình thường.
    *   `suspended`: Tài khoản bị tạm khóa (do vi phạm chính sách hoặc đang chờ kiểm tra).
    *   `deleted`: Xóa mềm (Soft delete) — đánh dấu đã xóa nhưng vẫn giữ lại thông tin lịch sử giao dịch/học tập nhằm phục vụ đối soát.

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `users` (Thông tin tài khoản người dùng)
Bảng chính lưu trữ thông tin đăng nhập và hồ sơ cơ bản của người dùng.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `user_id` | `String` (UUID) | `@id` | Khóa chính ngẫu nhiên duy nhất định danh người dùng. |
| `email` | `String` | `@unique`, `@db.Citext` | Email đăng nhập. Kỹ thuật `@db.Citext` giúp không phân biệt hoa/thường (VD: `NguoiDung@gmail.com` đồng nhất với `nguoidung@gmail.com`). |
| `password` | `String?` | Tùy chọn | Mật khẩu người dùng (đã được mã hóa bcrypt). |
| `role` | `UserRole` | `@default(student)` | Vai trò người dùng (mặc định đăng ký mới là học sinh). |
| `status` | `UserStatus` | `@default(active)` | Trạng thái tài khoản. |
| `email_verified` | `Boolean` | `@default(false)` | Trạng thái xác thực email khi đăng ký. |
| `social_provider` | `String?` | Tùy chọn | Nhà cung cấp đăng nhập mạng xã hội (Google, Facebook...). |
| `social_id` | `String?` | Tùy chọn | ID duy nhất do Google/Facebook trả về để liên kết tài khoản. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày giờ tạo tài khoản (lưu kèm giờ chuẩn quốc tế/múi giờ). |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày giờ cập nhật thông tin tài khoản gần nhất. |
| `last_login_at` | `DateTime?` | `@db.Timestamptz` | Ngày giờ đăng nhập gần nhất. |

---

## 5. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật với Giáo viên

1. **Tại sao dùng UUID thay vì ID tự tăng (1, 2, 3...)?**
   * **Bảo mật:** Tránh việc người dùng đoán được số lượng user hoặc dò quét URL.
   * **Phân tán & Mở rộng:** UUID có thể sinh an toàn ở bất kỳ Server nào mà không lo trùng lặp khi mở rộng cơ sở dữ liệu.

2. **Tại sao chọn kiểu `@db.Citext` cho Email?**
   * Thông thường `Standard String` phân biệt chữ hoa chữ thường. Kiểu `citext` trong PostgreSQL giúp giải quyết triệt để vấn đề này ở cấp độ cơ sở dữ liệu.

3. **Tại sao giữ thuộc tính `email_verified` khi dùng Nodemailer?**
   * Thuộc tính `email_verified` chính là nơi lưu giữ duy nhất trạng thái tài khoản đã sẵn sàng hoạt động hay chưa sau khi gửi email xác thực.

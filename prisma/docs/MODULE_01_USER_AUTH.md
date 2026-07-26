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
  |     | phone (String?)             | <-----+ (1 - N) UserAddress
  |     | avatar_url (String?)        | <-----+ (1 - N) Booking
  |     | date_of_birth (Date?)       | <-----+ (1 - N) Message
  |     | gender (String?)            | <-----+ (1 - N) Attendance
  |     | bio (String?)               |
  |     | role (UserRole)             |
  |     | status (UserStatus)         |
  |     | email_verified (Boolean)    |
  |     | social_provider (String?)   |
  |     | social_id (String?)         |
  |     | created_at (Timestamptz)    |
  |     | updated_at (Timestamptz)    |
  |     | last_login_at (Timestamptz) |
  +-----------------------------------+
                    |
                    | (1 - N)
                    v
  +-----------------------------------+
  |          user_addresses           |
  +-----------------------------------+
  | PK  | address_id (UUID)           |
  | FK  | user_id (UUID) -> users     |
  |     | province (String?)          |
  |     | district (String?)          |
  |     | ward (String?)              |
  |     | detail (String?)            |
  |     | is_default (Boolean)        |
  |     | created_at (Timestamptz)    |
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
| `full_name` | `String` | Bắt buộc | Họ và tên đầy đủ của người dùng. |
| `phone` | `String?` | Tùy chọn | Số điện thoại liên hệ hoặc xác thực OTP. |
| `avatar_url` | `String?` | Tùy chọn | Đường dẫn ảnh đại diện (lưu trên Cloud Storage như S3/Supabase Storage). |
| `date_of_birth` | `DateTime?` | `@db.Date` | Ngày tháng năm sinh (chỉ lưu ngày, phục vụ tính tuổi hoặc gợi ý lớp học phù hợp). |
| `gender` | `String?` | Tùy chọn | Giới tính người dùng (`male`, `female`, `other`). |
| `bio` | `String?` | Tùy chọn | Đoạn giới thiệu ngắn bản thân hiển thị trên trang cá nhân. |
| `role` | `UserRole` | `@default(student)` | Vai trò người dùng (mặc định đăng ký mới là học sinh). |
| `status` | `UserStatus` | `@default(active)` | Trạng thái tài khoản. |
| `email_verified` | `Boolean` | `@default(false)` | Trạng thái xác thực email khi đăng ký (Backend gửi link qua Nodemailer -> Người dùng click -> Cập nhật thành `true`). |
| `social_provider` | `String?` | Tùy chọn | Nhà cung cấp đăng nhập mạng xã hội (Google, Facebook...). |
| `social_id` | `String?` | Tùy chọn | ID duy nhất do Google/Facebook trả về để liên kết tài khoản. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày giờ tạo tài khoản (lưu kèm giờ chuẩn quốc tế/múi giờ). |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày giờ cập nhật thông tin tài khoản gần nhất. |
| `last_login_at` | `DateTime?` | `@db.Timestamptz` | Ngày giờ đăng nhập gần nhất (dùng theo dõi người dùng có hay hoạt động không). |

---

### 4.2. Bảng `user_addresses` (Địa chỉ người dùng)
Tách thành bảng riêng theo chuẩn chuẩn hóa dữ liệu 1-N (Một người dùng có thể có nhiều địa chỉ: Địa chỉ nhà, địa chỉ cơ quan, địa chỉ lớp học offline...).

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `address_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính tự động sinh cho địa chỉ. |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại | Liên kết tới `users.user_id`. Tự động xóa địa chỉ khi User bị xóa (`onDelete: Cascade`). |
| `province` | `String?` | Tùy chọn | Tỉnh / Thành phố (VD: TP. Hồ Chí Minh, Hà Nội). |
| `district` | `String?` | Tùy chọn | Quận / Huyện (VD: Quận 1, Cầu Giấy). |
| `ward` | `String?` | Tùy chọn | Phường / Xã (VD: Phường Bến Nghé). |
| `detail` | `String?` | Tùy chọn | Địa chỉ cụ thể số nhà, tên đường. |
| `is_default` | `Boolean` | `@default(false)` | Đánh dấu địa chỉ mặc định để ưu tiên chọn khi đặt lịch dạy offline. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm thêm địa chỉ. |

---

## 5. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật với Giáo viên

1. **Tại sao dùng UUID thay vì ID tự tăng (1, 2, 3...)?**
   * **Bảo mật:** Tránh việc người dùng đoán được số lượng user hoặc dò quét URL (VD: `/api/users/1`, `/api/users/2`).
   * **Phân tán & Mở rộng:** UUID có thể sinh an toàn ở bất kỳ Server nào mà không lo trùng lặp khi mở rộng cơ sở dữ liệu.

2. **Tại sao chọn kiểu `@db.Citext` cho Email?**
   * Thông thường `Standard String` phân biệt chữ hoa chữ thường. Nếu người dùng đăng ký `NguoiDung@gmail.com` nhưng khi đăng nhập gõ `nguoidung@gmail.com` có thể bị lỗi không tìm thấy. Kiểu `citext` trong PostgreSQL giúp giải quyết triệt để vấn đề này ở cấp độ cơ sở dữ liệu.

3. **Tại sao giữ thuộc tính `email_verified` khi dùng Nodemailer?**
   * Vì hệ thống tự phát triển tính năng xác thực qua email bằng Nodemailer (không phụ thuộc dịch vụ ngoài), thuộc tính `email_verified` chính là nơi lưu giữ duy nhất trạng thái tài khoản đã sẵn sàng hoạt động hay chưa.

4. **Tại sao tách riêng `user_addresses`?**
   * Đảm bảo chuẩn hóa cơ sở dữ liệu (Tránh lưu mảng địa chỉ phức tạp vào 1 ô dữ liệu trong bảng `users`).
   * Phục vụ tìm kiếm gia sư theo khu vực địa lý (Tỉnh/Thành phố, Quận/Huyện) hiệu quả nhờ đánh Index `idx_user_addresses_user`.

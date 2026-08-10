# 📌 MODULE 1: USER & AUTHENTICATION (Tài khoản người dùng & Xác thực)

## 1. Giới thiệu tổng quan
Module **User & Auth** đóng vai trò là "xương sống" cho toàn bộ hệ thống. Tất cả mọi thực thể trong hệ thống như Gia sư (TutorProfile), Học sinh (StudentProfile), Quản trị viên (AdminProfile), Đặt lịch (Booking), Tin nhắn (Message), Bài viết (Article)... đều liên kết trực tiếp hoặc gián tiếp tới tài khoản người dùng tại module này.

Module 1 bao gồm 3 bảng chính:
- **`users`**: Lưu trữ thông tin tài khoản, xác thực, phân quyền và các token xác minh/đặt lại mật khẩu.
- **`admin_profiles`**: Lưu trữ hồ sơ thông tin cá nhân dành riêng cho tài khoản Quản trị viên (Admin).
- **`refresh_tokens`**: Quản lý danh sách Refresh Token phục vụ gia hạn và thu hồi phiên đăng nhập JWT.

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
  | PK  | user_id (UUID)              | <-----+ (1 - 1) AdminProfile
  | UNQ | email (Citext)              | <-----+ (1 - 1) TutorProfile
  |     | password (String?)          | <-----+ (1 - 1) StudentProfile
  |     | role (UserRole)             | <-----+ (1 - 1) Wallet
  |     | status (UserStatus)         | <-----+ (1 - N) RefreshToken
  |     | email_verified (Boolean)    | <-----+ (1 - N) Booking
  |     | social_provider (String?)   | <-----+ (1 - N) Transaction
  |     | social_id (String?)         | <-----+ (1 - N) Article
  |     | verification_token (Str?)   |
  |     | ver_token_expires (Tz?)     |
  |     | reset_token (String?)       |
  |     | reset_token_expires (Tz?)   |
  |     | created_at (Timestamptz)    |
  |     | updated_at (Timestamptz)    |
  |     | last_login_at (Timestamptz) |
  +-----------------------------------+
       |              |
       | (1 - 1)      | (1 - N)
       v              v
+----------------+  +-------------------+
| admin_profiles |  |   refresh_tokens  |
+----------------+  +-------------------+
| PK | admin_id  |  | PK  | token_id    |
| FK | user_id   |  | FK  | user_id     |
|    | full_name |  | UNQ | token       |
|    | phone     |  |     | expires_at  |
|    | avatar_url|  |     | created_at  |
|    | dob,gender|  +-------------------+
|    | cccd      |
|    | position  |
+----------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `UserRole` (Phân quyền người dùng)
* **Mục đích:** Xác định vai trò của người dùng trong hệ thống để thực hiện phân quyền (RBAC - Role-Based Access Control).
* **Các giá trị:**
  * `student`: Học sinh / Phụ huynh (Có quyền tìm kiếm gia sư, đăng ký khóa học, đặt lịch, làm bài kiểm tra, bình luận, chat).
  * `tutor`: Gia sư (Có quyền tạo khóa học, quản lý lịch dạy, điểm danh, tạo quiz, nhận tiền rút về ngân hàng).
  * `admin`: Quản trị viên (Có quyền duyệt hồ sơ gia sư, duyệt bằng cấp, quản lý cấu hình hệ thống, xem log hoạt động).

### 3.2. `UserStatus` (Trạng thái tài khoản)
* **Mục đích:** Quản lý vòng đời tài khoản của người dùng.
* **Các giá trị:**
  * `active`: Tài khoản đang hoạt động bình thường.
  * `suspended`: Tài khoản bị tạm khóa (do vi phạm quy định hoặc đang chờ xác minh).
  * `deleted`: Đã xóa tài khoản (Soft delete) — đánh dấu đã xóa nhưng vẫn giữ lại thông tin lịch sử giao dịch/học tập nhằm phục vụ đối soát.

### 3.3. `AdminPosition` (Vị trí / Chức vụ Quản trị viên)
* **Mục đích:** Phân loại chức vụ chuyên môn của các nhân viên Quản trị viên trong hệ thống.
* **Các giá trị:**
  * `super_admin`: Quản trị viên hệ thống (Quản lý toàn bộ hệ thống).
  * `moderator`: Kiểm duyệt viên (Duyệt hồ sơ gia sư, bằng cấp, khóa học).
  * `customer_support`: Chăm sóc & Hỗ trợ khách hàng.
  * `content_manager`: Quản lý nội dung bài viết và truyền thông.
  * `financial_manager`: Quản lý tài chính & xử lý rút tiền (Payouts).

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `users` (Thông tin tài khoản người dùng)
Bảng trung tâm lưu trữ thông tin đăng nhập, xác thực và trạng thái tài khoản.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `user_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính ngẫu nhiên duy nhất định danh người dùng. |
| `email` | `String` | `@unique`, `@db.Citext` | Email đăng nhập. Kỹ thuật `@db.Citext` giúp không phân biệt chữ hoa/thường. |
| `password` | `String?` | Tùy chọn | Mật khẩu người dùng (đã được băm bằng bcrypt). Nullable đối với tài khoản đăng nhập qua MXH. |
| `role` | `UserRole` | `@default(student)` | Vai trò người dùng (mặc định đăng ký mới là `student`). |
| `status` | `UserStatus` | `@default(active)` | Trạng thái tài khoản (`active`, `suspended`, `deleted`). |
| `email_verified` | `Boolean` | `@default(false)` | Trạng thái xác thực email sau khi đăng ký. |
| `social_provider` | `String?` | Tùy chọn | Nhà cung cấp đăng nhập mạng xã hội (`google`, `facebook`...). |
| `social_id` | `String?` | Tùy chọn | ID duy nhất do Google/Facebook trả về để liên kết tài khoản. |
| `verification_token` | `String?` | Tùy chọn | Token ngẫu nhiên gửi qua email dùng để xác minh tài khoản khi đăng ký. |
| `verification_token_expires` | `DateTime?` | `@db.Timestamptz` | Thời gian hết hạn của token xác minh email (24 giờ). |
| `reset_token` | `String?` | Tùy chọn | Token ngẫu nhiên dùng cho luồng đặt lại mật khẩu khi quên mật khẩu. |
| `reset_token_expires` | `DateTime?` | `@db.Timestamptz` | Thời gian hết hạn của token đặt lại mật khẩu (2 giờ). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày giờ tạo tài khoản (lưu kèm múi giờ). |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày giờ cập nhật thông tin tài khoản gần nhất. |
| `last_login_at` | `DateTime?` | `@db.Timestamptz` | Ngày giờ đăng nhập gần nhất. |

---

### 4.2. Bảng `admin_profiles` (Hồ sơ Quản trị viên)
Lưu trữ thông tin cá nhân của Quản trị viên (Admin), tách biệt khỏi bảng `users`.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `admin_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh hồ sơ Admin. |
| `user_id` | `String` (UUID) | `@unique`, Khóa ngoại -> `users` | Khóa ngoại liên kết 1-1 với `users.user_id` (`onDelete: Cascade`). |
| `full_name` | `String` | Bắt buộc | Họ và tên đầy đủ của Quản trị viên. |
| `phone` | `String?` | Tùy chọn | Số điện thoại liên hệ. |
| `avatar_url` | `String?` | Tùy chọn | Đường dẫn ảnh đại diện. |
| `date_of_birth` | `DateTime?` | `@db.Date` | Ngày tháng năm sinh. |
| `gender` | `String?` | Tùy chọn | Giới tính (`male`, `female`, `other`). |
| `cccd` | `String?` | Tùy chọn | Căn cước công dân của Quản trị viên. |
| `position` | `AdminPosition?` | Tùy chọn | Vị trí / Chức vụ nhân viên Quản trị viên (`super_admin`, `moderator`, `customer_support`, `content_manager`, `financial_manager`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo hồ sơ Quản trị viên. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm cập nhật thông tin mới nhất. |

---

### 4.3. Bảng `refresh_tokens` (Quản lý Refresh Token)
Lưu trữ Refresh Token của người dùng phục vụ gia hạn phiên đăng nhập JWT và đăng xuất an toàn.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `token_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh bản ghi refresh token. |
| `user_id` | `String` (UUID) | Khóa ngoại -> `users` | Liên kết tới người dùng sở hữu token (`onDelete: Cascade`). |
| `token` | `String` | `@unique` | Chuỗi Refresh Token JWT duy nhất cấp cho client. |
| `expires_at` | `DateTime` | `@db.Timestamptz` | Thời gian hết hạn của Refresh Token (VD: 7 ngày). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm khởi tạo Refresh Token. |

---

## 5. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật với Giáo viên

1. **Tại sao dùng UUID thay vì ID tự tăng (1, 2, 3...)?**
   * **Bảo mật:** Tránh việc người dùng đoán được số lượng user hoặc dò quét URL (Enumeration Attacks).
   * **Phân tán & Mở rộng:** UUID có thể sinh an toàn ở bất kỳ Server nào mà không lo trùng lặp khi mở rộng cơ sở dữ liệu.

2. **Tại sao chọn kiểu `@db.Citext` cho Email?**
   * Thông thường `Standard String` phân biệt chữ hoa chữ thường. Kiểu `citext` trong PostgreSQL giúp giải quyết triệt để vấn đề này ở cấp độ cơ sở dữ liệu (VD: `NguoiDung@gmail.com` đồng nhất với `nguoidung@gmail.com`).

3. **Tại sao tách riêng thông tin Hồ sơ (`AdminProfile`, `TutorProfile`, `StudentProfile`) khỏi `users`?**
   * **Tối ưu hóa dung lượng & hiệu năng:** Bảng `users` giữ vị trí trung tâm chỉ tập trung vào xác thực và phân quyền.
   * **Tránh cột dư thừa (Null values):** Mỗi nhóm vai trò (Student, Tutor, Admin) có các thông tin đặc thù khác nhau. Việc tách bảng giúp cấu trúc cơ sở dữ liệu đạt chuẩn chuẩn hóa (Normalization) cao.

4. **Cơ chế xác thực Email & Đặt lại mật khẩu an toàn với Token:**
   * Lưu `verification_token` (hạn 24h) và `reset_token` (hạn 2h) trực tiếp với mốc thời gian hết hạn giúp hệ thống tự động từ chối các link quá hạn, tăng cường bảo mật đối với các thao tác nhạy cảm.

5. **Cơ chế Quản lý Phiên làm việc JWT với Bảng `refresh_tokens`:**
   * Hệ thống kết hợp **Access Token** ngắn hạn (2 giờ) và **Refresh Token** dài hạn (7 ngày).
   * Bảng `refresh_tokens` lưu trong DB cho phép thu hồi token (Revocation) ngay lập tức khi người dùng Đăng xuất (Sign out) hoặc Đặt lại mật khẩu (Reset password), ngăn chặn kẻ xấu lợi dụng token cũ.

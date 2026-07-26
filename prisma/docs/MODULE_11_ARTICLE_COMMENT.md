# 📌 MODULE 11: ARTICLE & COMMENT (Bài viết & Bình luận)

## 1. Giới thiệu tổng quan

Module **Article & Comment** cung cấp tính năng xuất bản bài viết blog tin tức, chia sẻ kinh nghiệm học tập và hệ thống bình luận trao đổi công khai:
- **Bài viết tin tức (Article):** Quản lý bài viết blog tin tức giáo dục, mẹo luyện thi và thông báo hệ thống. Hỗ trợ định dạng bài viết Rich Text Block JSON linh hoạt (`content`) và lưu tổng số bình luận `commentsCount` denormalized để tối ưu tốc độ tải danh sách bài viết.
- **Bình luận bài viết (ArticleComment):** Quản lý ý kiến, thảo luận của người dùng bên dưới từng bài viết blog.
- **Thảo luận khóa học (CourseComment):** Cho phép học sinh, gia sư và người truy cập trao đổi, hỏi đáp thắc mắc công khai trên trang chi tiết Khóa học trước khi đăng ký.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 11)

```
  +-----------------------------------+        +-----------------------------------+
  |               users               |        |              courses              |
  +-----------------------------------+        +-----------------------------------+
  | PK  | user_id (UUID)              |        | PK  | course_id (UUID)            |
  +-----------------------------------+        +-----------------------------------+
    |                   |                        |
    | (1 - N)           | (1 - N)                | (1 - N)
    v                   v                        v
  +-------------------+ +-----------------------------------+
  |  article_comments | |          course_comments          |
  +-------------------+ +-----------------------------------+
  | PK | comment_id   | | PK | comment_id (UUID)            |
  | FK | article_id   | | FK | course_id -> courses         |
  | FK | user_id      | | FK | user_id -> users             |
  |    | content      | |    | content (String)             |
  |    | created_at   | |    | rating (SmallInt?)           |
  +-------------------+ |    | created_at / updated_at      |
    ^                   +-----------------------------------+
    | (1 - N)
  +-----------------------------------+
  |             articles              |
  +-----------------------------------+
  | PK  | id (UUID)                   |
  |     | title (String)              |
  |     | excerpt (String)            |
  |     | content (Json RichText)     |
  |     | published_at (DateTime?)    |
  |     | author (String)             |
  |     | commentsCount (Int)         |
  |     | category (String)           |
  |     | imageType (String)          |
  |     | tags (Json)                 |
  +-----------------------------------+
```

---

## 3. Chi tiết các Bảng dữ liệu (Models)

### 3.1. Bảng `articles` (Bài viết tin tức / Blog)

> **Mô tả:** Quản lý danh mục bài viết kinh nghiệm ôn thi, mẹo học tập và thông báo của hệ thống.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bài viết. |
| `title` | `String` | Bắt buộc | Tiêu đề bài viết (VD: "Bí quyết đạt 8.0 IELTS trong 6 tháng"). |
| `excerpt` | `String` | Bắt buộc | Đoạn trích dẫn ngắn / Tóm tắt nội dung bài viết. |
| `content` | `Json` | Bắt buộc | Nội dung chi tiết bài viết dưới dạng mảng JSON Rich Text Blocks. |
| `published_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm xuất bản bài viết (hỗ trợ sắp xếp & lọc theo khoảng thời gian). |
| `author` | `String` | Bắt buộc | Tên tác giả hoặc nguồn đăng bài (VD: "Ban biên tập Gia sư AI"). |
| `commentsCount` | `Int` | `@default(0)` | Tổng số lượng bình luận của bài viết (lưu denormalized). |
| `category` | `String` | Bắt buộc | Phân loại danh mục bài viết (`Kinh nghiệm ôn thi`, `Tin tức`...). |
| `imageType` | `String` | Bắt buộc | Phân loại ảnh đại diện / Banner bài viết. |
| `tags` | `Json` | Bắt buộc | Mảng JSON chứa các thẻ tag tìm kiếm (VD: `["IELTS", "Toán 12"]`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bài viết. |

---

### 3.2. Bảng `article_comments` (Bình luận bài viết)

> **Mô tả:** Quản lý bình luận của người dùng bên dưới các bài viết tin tức.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `comment_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bình luận. |
| `article_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `articles` | Liên kết bài viết gốc (`onDelete: Cascade`). |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người gửi bình luận (`onDelete: Cascade`). |
| `content` | `String` | Bắt buộc | Nội dung văn bản bình luận. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm gửi bình luận. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm chỉnh sửa bình luận. |

---

### 3.3. Bảng `course_comments` (Thảo luận trên trang Khóa học)

> **Mô tả:** Quản lý thắc mắc, bình luận thảo luận công khai trên trang thông tin Khóa học.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `comment_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bình luận khóa học. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Liên kết Khóa học (`onDelete: Cascade`). |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người gửi bình luận/thắc mắc (`onDelete: Cascade`). |
| `content` | `String` | Bắt buộc | Nội dung văn bản thắc mắc hoặc câu hỏi cần giải đáp. |
| `rating` | `Int?` | `@db.SmallInt` | Điểm số đánh giá tùy chọn (1 đến 5 sao). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm gửi bình luận. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm cập nhật bình luận. |

---

## 4. Luồng xử lý Bài viết & Thảo luận (Workflows)

```
=================== LUỒNG BÀI VIẾT BLOG ===================
[Admin đăng bài viết tin tức]
        ↓
1. Lưu bài viết vào `articles` (content = Rich Text JSON)
        ↓
[Học sinh vào đọc bài viết & Viết bình luận]
        ↓
2. Chèn 1 bản ghi vào `article_comments`
3. Cập nhật `articles.commentsCount += 1`

=================== LUỒNG THẢO LUẬN KHÓA HỌC ===================
[Học sinh xem thông tin Khóa học trên Website]
        ↓
4. Học sinh đặt câu hỏi thắc mắc công khai trên trang khóa học
        ↓
5. Lưu bản ghi vào `course_comments` (Gia sư / Admin vào trả lời thắc mắc)
```

---

## 5. Giải thích Lý do Thiết kế & Điểm "ăn điểm" với Giáo viên

1. **Tại sao cột `content` trong `articles` lại dùng kiểu `Json`?**
   * **Hỗ trợ Rich Text Editor (EditorJS / Block-based editor):** Giúp lưu trữ bài viết dạng các khối (blocks: đoạn văn, hình ảnh, tiêu đề, trích dẫn, code snippet) một cách linh hoạt, dễ dàng thay đổi thứ tự và chống được các cuộc tấn công chèn mã độc (XSS Attack).

2. **Sự khác biệt giữa `Review` (Module 7) và `CourseComment` (Module 11)?**
   * **Bảo mật & Tính xác thực của Đánh giá:** Bảng `Review` yêu cầu **Học sinh phải đặt lịch và học xong (`booking_id @unique`)** mới được phép viết đánh giá chất lượng dạy học. Còn `CourseComment` là phần **thảo luận công khai** dành cho bất kỳ ai đang tìm hiểu khóa học có thể gửi thắc mắc cho Gia sư trước khi quyết định đặt lịch.

3. **Lợi ích của cột `commentsCount` trong `articles`?**
   * **Lưu Denormalized Count:** Giúp trang danh sách tin tức/blog hiển thị số lượng bình luận ngay lập tức mà không cần phải gọi câu lệnh `COUNT(*)` tốn chi phí tính toán qua bảng `article_comments`.

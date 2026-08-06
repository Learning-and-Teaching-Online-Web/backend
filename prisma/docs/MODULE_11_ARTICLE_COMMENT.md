# 📌 MODULE 11: ARTICLE & COMMENT (Bài viết & Bình luận)

## 1. Giới thiệu tổng quan

Module **Article & Comment** cung cấp tính năng xuất bản bài viết blog tin tức, chia sẻ kinh nghiệm học tập và hệ thống bình luận trao đổi công khai:
- **Danh mục bài viết (ArticleCategory):** Bảng quản lý danh mục động do Admin thêm/sửa/xóa trực tiếp.
- **Bài viết tin tức (Article):** Quản lý bài viết blog tin tức giáo dục, mẹo luyện thi và thông báo hệ thống. Hỗ trợ liên kết tới tác giả `User` (`author_id`), danh mục `ArticleCategory` (`category_id`), đường dẫn SEO (`slug`), ảnh đại diện (`thumbnail_url`), nội dung Rich Text Block JSON linh hoạt (`content`) và lưu tổng số bình luận `commentsCount` denormalized.
- **Bình luận bài viết (ArticleComment):** Quản lý ý kiến, thảo luận của người dùng bên dưới từng bài viết blog (hỗ trợ kiểm duyệt `is_visible`).
- **Thảo luận khóa học (CourseComment):** Cho phép học sinh, gia sư và người truy cập trao đổi, hỏi đáp thắc mắc công khai trên trang chi tiết Khóa học trước khi đăng ký (hỗ trợ kiểm duyệt `is_visible`).

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 11)

```
  +-----------------------------------+        +-----------------------------------+
  |               users               |        |        article_categories         |
  +-----------------------------------+        +-----------------------------------+
  | PK  | user_id (UUID)              |        | PK  | category_id (UUID)          |
  +-----------------------------------+        | UNQ | name, slug (String)         |
    |                   |                      +-----------------------------------+
    | (1 - N)           | (1 - N)                                | (1 - N)
    v                   v                                        v
  +-------------------+ +-----------------------------------+  +--------------------+
  |  article_comments | |          course_comments          |  |      articles      |
  +-------------------+ +-----------------------------------+  +--------------------+
  | PK | comment_id   | | PK | comment_id (UUID)            |  | PK  | id (UUID)    |
  | FK | article_id   | | FK | course_id -> courses         |  | UNQ | slug (Str?)  |
  | FK | user_id      | | FK | user_id -> users             |  |     | title (Str)  |
  |    | content      | |    | content (String)             |  |     | excerpt      |
  |    | is_visible   | |    | rating (SmallInt?)           |  |     | content (Json|
  |    | created_at   | |    | is_visible (Boolean)         |  |     | thumbnail_url|
  +-------------------+ |    | created_at / updated_at      |  | FK  | author_id    |
    ^                   +-----------------------------------+  | FK  | category_id  |
    | (1 - N)                                                  |     | commentsCount|
    +----------------------------------------------------------+     | tags (Json)  |
                                                                     +--------------------+
```

---

## 3. Chi tiết các Bảng dữ liệu (Models)

### 3.1. Bảng `article_categories` (Danh mục bài viết)

> **Mô tả:** Danh mục bài viết do Admin tạo và quản lý trên giao diện.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `category_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh danh mục. |
| `name` | `String` | `@unique` | Tên danh mục (VD: "Bí quyết ôn thi", "Tin tức giáo dục"). |
| `slug` | `String` | `@unique` | Đường dẫn thân thiện SEO (VD: `"bi-quyet-on-thi"`). |
| `description` | `String?` | Tùy chọn | Mô tả ngắn về danh mục. |
| `order_index` | `Int` | `@default(0)` | Thứ tự sắp xếp hiển thị. |
| `is_active` | `Boolean` | `@default(true)` | Trạng thái kích hoạt (ẩn/hiện danh mục). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo danh mục. |

---

### 3.2. Bảng `articles` (Bài viết tin tức / Blog)

> **Mô tả:** Quản lý bài viết kinh nghiệm ôn thi, mẹo học tập và thông báo của hệ thống.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bài viết. |
| `title` | `String` | Bắt buộc | Tiêu đề bài viết (VD: "Bí quyết đạt 8.0 IELTS trong 6 tháng"). |
| `slug` | `String?` | `@unique` | Đường dẫn chuẩn SEO (VD: `"bi-quyet-dat-8-0-ielts"`). |
| `excerpt` | `String` | Bắt buộc | Đoạn trích dẫn ngắn / Tóm tắt nội dung bài viết. |
| `content` | `Json` | Bắt buộc | Nội dung chi tiết bài viết dạng mảng JSON Rich Text Blocks. |
| `thumbnail_url` | `String?` | Tùy chọn | Đường dẫn URL ảnh đại diện bài viết. |
| `imageType` | `String?` | Tùy chọn | Giữ lại trường cũ tránh mất dữ liệu. |
| `published_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm xuất bản bài viết. |
| `author` | `String?` | Tùy chọn | Giữ lại tên tác giả chuỗi cũ. |
| `author_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `users` | Gia sư / Admin đăng bài viết này. |
| `category` | `String?` | Tùy chọn | Giữ lại tên danh mục chuỗi cũ. |
| `category_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `article_categories` | Khóa ngoại liên kết danh mục chuẩn hóa. |
| `commentsCount` | `Int` | `@default(0)` | Tổng số lượng bình luận của bài viết (lưu denormalized). |
| `tags` | `Json` | Bắt buộc | Mảng JSON chứa các thẻ tag tìm kiếm (VD: `["IELTS", "Toán 12"]`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bài viết. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm cập nhật bài viết gần nhất. |

---

### 3.3. Bảng `article_comments` (Bình luận bài viết)

> **Mô tả:** Quản lý bình luận của người dùng bên dưới các bài viết tin tức.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `comment_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bình luận. |
| `article_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `articles` | Liên kết bài viết gốc (`onDelete: Cascade`). |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người gửi bình luận (`onDelete: Cascade`). |
| `content` | `String` | Bắt buộc | Nội dung văn bản bình luận. |
| `is_visible` | `Boolean` | `@default(true)` | Trạng thái hiển thị (`true` = công khai, `false` = ẩn do vi phạm quy chuẩn). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm gửi bình luận. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm chỉnh sửa bình luận. |

---

### 3.4. Bảng `course_comments` (Thảo luận trên trang Khóa học)

> **Mô tả:** Quản lý thắc mắc, bình luận thảo luận công khai trên trang thông tin Khóa học.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `comment_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bình luận khóa học. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Liên kết Khóa học (`onDelete: Cascade`). |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người gửi bình luận/thắc mắc (`onDelete: Cascade`). |
| `content` | `String` | Bắt buộc | Nội dung văn bản thắc mắc hoặc câu hỏi cần giải đáp. |
| `rating` | `Int?` | `@db.SmallInt` | Điểm số đánh giá tùy chọn (giữ lại hỗ trợ dữ liệu cũ). |
| `is_visible` | `Boolean` | `@default(true)` | Trạng thái hiển thị (`true` = công khai, `false` = ẩn do vi phạm quy chuẩn). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm gửi bình luận. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm cập nhật bình luận. |

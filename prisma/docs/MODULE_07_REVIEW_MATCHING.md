# 📌 MODULE 7: REVIEW, FAVORITE & MATCHING (Đánh giá, Yêu thích & Gợi ý AI)

## 1. Giới thiệu tổng quan

Module **Review, Favorite & Matching** quản lý chất lượng dịch vụ, tương tác yêu thích và thuật toán gợi ý thông minh trong hệ thống:
- **Đánh giá (Review):** Học sinh viết bài đánh giá và chấm điểm chất lượng gia sư sau khi hoàn thành khóa học/booking. Đánh giá tổng hợp sẽ tự động cập nhật lại `rating` và `review_count` trong hồ sơ gia sư.
- **Yêu thích (Favorite):** Danh sách lưu gia sư ưu tiên (Wishlist / Bookmark) giúp học sinh dễ dàng theo dõi và đặt lịch sau.
- **Nhật ký AI Matching (MatchingLog):** Ghi vết lịch sử đề xuất của thuật toán AI Matching giữa Học sinh và Gia sư. Phục vụ việc đánh giá hiệu quả mô hình (CTR - Click-Through Rate & Conversion Rate).

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 7)

```
  +-----------------------------------+        +-----------------------------------+
  |             bookings              |        |         student_profiles          |
  +-----------------------------------+        +-----------------------------------+
  | PK  | booking_id (UUID)           |        | PK  | student_id (UUID)           |
  +-----------------------------------+        +-----------------------------------+
                    | (1 - 1)                                   |
                    v                                           | (1 - N)
  +-----------------------------------+                         |
  |              reviews              | <-----------------------+
  +-----------------------------------+                         |
  | PK  | review_id (UUID)            |                         |
  | FK  | booking_id (UUID) [@unique] |                         |
  | FK  | student_id -> student       |                         |
  | FK  | tutor_id -> tutor           |                         |
  |     | rating (SmallInt 1-5)       |                         |
  |     | professionalism (1-5)       |                         |
  |     | communication (1-5)         |                         |
  |     | punctuality (1-5)           |                         |
  |     | comment (String?)           |                         |
  |     | is_visible (Boolean)        |                         |
  +-----------------------------------+                         |
                    ^                                           |
                    | (1 - N)                                   v
  +-----------------------------------+        +-----------------------------------+
  |          tutor_profiles           | <----- |             favorites             |
  +-----------------------------------+ (1-N)  +-----------------------------------+
  | PK  | tutor_id (UUID)             |        | PK  | favorite_id (UUID)          |
  |     | rating (Decimal 2,1)        |        | FK  | student_id -> student       |
  |     | review_count (Int)          |        | FK  | tutor_id -> tutor           |
  +-----------------------------------+        |     | @@unique([student, tutor])  |
                    ^                          +-----------------------------------+
                    | (1 - N)                                   ^
                    +-------------------+                       | (1 - N)
                                        |                       |
                               +-----------------------------------+
                               |           matching_logs           |
                               +-----------------------------------+
                               | PK  | log_id (UUID)               |
                               | FK  | student_id -> student       |
                               | FK  | tutor_id -> tutor           |
                               |     | match_score (Decimal 5,2)   |
                               |     | algorithm_version (String?) |
                               |     | factors_json (Json?)        |
                               |     | is_clicked (Boolean)        |
                               |     | is_booked (Boolean)         |
                               +-----------------------------------+
```

---

## 3. Chi tiết các Bảng dữ liệu (Models)

### 3.1. Bảng `reviews` (Đánh giá gia sư)

> **Mô tả:** Đánh giá chất lượng giảng dạy của gia sư từ học sinh sau khi hoàn tất khóa học.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `review_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bài đánh giá. |
| `booking_id` | `String` (UUID) | `@unique`, `@db.Uuid`, Khóa ngoại -> `bookings` | FK 1-1 với `bookings.booking_id`. Đảm bảo 1 booking chỉ được đánh giá 1 lần. |
| `student_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `student_profiles` | Học sinh thực hiện viết đánh giá. |
| `tutor_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Gia sư nhận bài đánh giá. |
| `rating` | `Int` | `@db.SmallInt` | Điểm số đánh giá tổng thể (thang điểm 1 đến 5 sao). |
| `professionalism` | `Int?` | `@db.SmallInt` | Điểm tiêu chí: Trình độ chuyên môn & Phương pháp giảng dạy (1-5 sao). |
| `communication` | `Int?` | `@db.SmallInt` | Điểm tiêu chí: Khả năng giao tiếp & Truyền đạt kiến thức (1-5 sao). |
| `punctuality` | `Int?` | `@db.SmallInt` | Điểm tiêu chí: Sự đúng giờ & Tác phong làm việc (1-5 sao). |
| `comment` | `String?` | Tùy chọn | Nhận xét chi tiết bằng văn bản của học sinh. |
| `is_visible` | `Boolean` | `@default(true)` | Trạng thái hiển thị (`true` = công khai, `false` = tạm ẩn do vi phạm quy chuẩn). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo đánh giá. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm chỉnh sửa đánh giá gần nhất. |

---

### 3.2. Bảng `favorites` (Gia sư yêu thích)

> **Mô tả:** Danh sách gia sư yêu thích (Bookmark / Wishlist) của học sinh để tiện theo dõi và đặt lịch sau.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `favorite_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh mục yêu thích. |
| `student_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `student_profiles` | Học sinh bấm lưu yêu thích. |
| `tutor_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Gia sư được học sinh bấm lưu. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm thả tim / lưu gia sư. |

> 💡 **Ràng buộc:** `@@unique([student_id, tutor_id])` — Đảm bảo 1 học sinh không thể bấm thả tim 1 gia sư 2 lần.

---

### 3.3. Bảng `matching_logs` (Nhật ký AI Matching)

> **Mô tả:** Lưu lịch sử các kết quả gia sư do Thuật toán **AI Matching** tính toán và gợi ý cho Học sinh. Phục vụ đánh giá hiệu quả mô hình AI.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `log_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh log gợi ý AI. |
| `student_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `student_profiles` | Học sinh nhận danh sách gợi ý. |
| `tutor_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Gia sư được thuật toán AI đề xuất. |
| `match_score` | `Decimal?` | `@db.Decimal(5, 2)` | Độ phù hợp tính bằng % do AI dự đoán (VD: `95.50`%). |
| `algorithm_version` | `String?` | Tùy chọn | Phiên bản thuật toán AI Matching (VD: `v1.0-content-based`, `v2.0-hybrid`). |
| `factors_json` | `Json?` | Tùy chọn | Mảng JSON lưu nguyên nhân/trọng số AI chọn gia sư này (VD: `{"subject_match": 1.0, "location_match": 0.9}`). |
| `is_clicked` | `Boolean` | `@default(false)` | Học sinh có bấm vào xem chi tiết hồ sơ gia sư này không (`false` / `true`). |
| `is_booked` | `Boolean` | `@default(false)` | Học sinh có tiến hành đặt lịch thành công sau gợi ý không (`false` / `true`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm gợi ý được hiển thị cho học sinh. |

---

## 4. Luồng xử lý Đánh giá & AI Matching

```
[Học sinh hoàn thành khóa học]
        ↓
1. Học sinh gửi Review (rating = 5, comment = "Thầy dạy dễ hiểu")
        ↓
2. Trigger / Server Code tự động tính lại trung bình:
   TutorProfile.rating = (Tổng rating / review_count)
   TutorProfile.review_count += 1
        ↓
[Học sinh mới đăng ký nhu cầu học]
        ↓
3. AI Matching nhận dữ liệu StudentProfile (môn học, ngân sách, vị trí)
   tính toán Match Score với các TutorProfile
        ↓
4. Lưu danh sách gợi ý vào `matching_logs` (match_score = 95.5%)
        ↓
5. Học sinh bấm vào xem (is_clicked = true) → Đặt lịch (is_booked = true)
```

---

## 5. Giải thích Lý do Thiết kế & Điểm "ăn điểm" với Giáo viên

1. **Tại sao bảng `reviews` có ràng buộc `@unique` ở cột `booking_id`?**
   * **Đảm bảo tính trung thực của đánh giá (Verified Reviews):** Chỉ những học sinh đã thực sự đặt lịch và hoàn thành khóa học mới được phép viết đánh giá. Mỗi hợp đồng đặt lịch chỉ được viết đúng 1 bài review, ngăn chặn triệt để tình trạng spam hoặc dội đánh giá giả (fake reviews).

2. **Tại sao phân chia nhiều tiêu chí (`professionalism`, `communication`, `punctuality`)?**
   * **Đánh giá đa chiều:** Giúp học sinh mới dễ dàng nhận biết điểm mạnh thực sự của từng gia sư (VD: Gia sư A chuyên môn giỏi nhưng gia sư B truyền đạt hay hơn và đúng giờ hơn).

3. **Ý nghĩa của hai cột `is_clicked` và `is_booked` trong `matching_logs`?**
   * **Đo lường hiệu quả mô hình AI (Machine Learning Evaluation):** Dữ liệu thu thập từ hai cột này giúp tính toán tỷ lệ Click-Through-Rate (CTR) và Conversion Rate (CR) thực tế. Từ đó team phát triển có thể tiến hành A/B Testing để tối ưu hóa trọng số thuật toán gợi ý ngày càng chính xác hơn.

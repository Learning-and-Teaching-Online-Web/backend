# 📌 MODULE 9: QUIZ (Bài kiểm tra trắc nghiệm & Tự luận)

## 1. Giới thiệu tổng quan

Module **Quiz** quản lý hệ thống tạo đề thi, tổ chức kiểm tra đánh giá năng lực học sinh và chấm điểm tự động trong các khóa học:
- **Đề kiểm tra (Quiz):** Quản lý thông tin chung của bài thi (thời gian làm bài, điểm qua môn, số lần được làm lại). Hỗ trợ cả 2 hình thức: **Gia sư tự tạo thủ công** HOẶC **Trợ lý AI tự động sinh đề thi** từ tài liệu khóa học (`generated_by_ai`).
- **Ngân hàng câu hỏi (QuizQuestion):** Hỗ trợ đa dạng loại câu hỏi: Trắc nghiệm (`multiple_choice`), Chọn Đúng/Sai (`true_false`), Điền vào chỗ trống (`fill_in_blank`) và Tự luận (`essay`).
- **Lượt làm bài & Chấm điểm (QuizAttempt):** Ghi vết chi tiết từng lần làm bài của học sinh, tự động tính điểm số (`score`), thời gian hoàn thành (`duration_seconds`) và trạng thái Đạt/Không đạt (`is_passed`).

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 9)

```
        +-----------------------+
        |   QuizQuestionType    | (ENUM: multiple_choice, true_false, fill_in_blank, essay)
        +-----------------------+
                    |
                    v
        +-----------------------+
        |      QuizStatus       | (ENUM: draft, published, archived)
        +-----------------------+
                    |
                    v
  +-----------------------------------+        +-----------------------------------+
  |              courses              |        |          student_profiles         |
  +-----------------------------------+        +-----------------------------------+
  | PK  | course_id (UUID)            |        | PK  | student_id (UUID)           |
  +-----------------------------------+        +-----------------------------------+
                    | (1 - N)                                   |
                    v                                           | (1 - N)
  +-----------------------------------+                         |
  |              quizzes              |                         |
  +-----------------------------------+                         |
  | PK  | quiz_id (UUID)              |                         |
  | FK  | course_id -> courses        |                         |
  |     | title (String)              |                         |
  |     | description (String?)       |                         |
  |     | generated_by_ai (Boolean)   |                         |
  |     | ai_model_version (String?)  |                         |
  |     | time_limit_minutes (Int?)   |                         |
  |     | max_attempts (Int)          |                         |
  |     | passing_score (SmallInt?)   |                         |
  |     | status (QuizStatus)         |                         |
  +-----------------------------------+                         |
                    |                                           |
                    | (1 - N)                                   v
  +-----------------------------------+        +-----------------------------------+
  |           quiz_questions          | <----- |           quiz_attempts           |
  +-----------------------------------+ (1-N)  +-----------------------------------+
  | PK  | question_id (UUID)          |        | PK  | attempt_id (UUID)           |
  | FK  | quiz_id -> quizzes          |        | FK  | student_id -> student       |
  |     | question_text (String)      |        | FK  | quiz_id -> quizzes          |
  |     | question_type (Enum)        |        |     | score (Decimal 5,2)         |
  |     | explanation (String?)       |        |     | total_points (Int?)         |
  |     | points (SmallInt)           |        |     | answers_json (Json?)        |
  |     | order_index (Int)           |        |     | started_at / completed_at   |
  +-----------------------------------+        |     | duration_seconds (Int?)     |
                    |                          |     | is_passed (Boolean?)        |
                    | (1 - N)                  +-----------------------------------+
                    v
  +-----------------------------------+
  |            quiz_options           |
  +-----------------------------------+
  | PK  | option_id (UUID)            |
  | FK  | question_id -> questions    |
  |     | content (String)            |
  |     | is_correct (Boolean)        |
  |     | order_index (Int)           |
  +-----------------------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `QuizQuestionType` (Loại câu hỏi trong đề)
*   `multiple_choice`: Trắc nghiệm chọn 1 hoặc nhiều phương án trong bảng `quiz_options`.
*   `true_false`: Câu hỏi kiểm tra tính Đúng hoặc Sai của mệnh đề.
*   `fill_in_blank`: Điền từ / câu trả lời ngắn vào vị trí còn thiếu.
*   `essay`: Câu hỏi tự luận dạng bài viết mở (Gia sư hoặc AI chấm điểm thủ công).

### 3.2. `QuizStatus` (Trạng thái phát hành đề thi)
*   `draft`: Bản nháp (Gia sư/AI đang soạn đề, học sinh chưa nhìn thấy).
*   `published`: Đã công khai (Học sinh có thể vào làm bài).
*   `archived`: Đã đóng / Lưu trữ (dùng lưu lại dữ liệu quá khứ).

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `quizzes` (Đề kiểm tra)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `quiz_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh bài kiểm tra. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Bài thi thuộc khóa học nào (`onDelete: Cascade`). |
| `title` | `String` | Bắt buộc | Tiêu đề bài thi (VD: "Kiểm tra 15 phút - Đạo hàm & Tiệm cận"). |
| `description` | `String?` | Tùy chọn | Hướng dẫn hoặc quy định khi làm bài thi. |
| `generated_by_ai` | `Boolean` | `@default(false)` | Đánh dấu bài thi do AI tự tạo từ tài liệu học tập. |
| `ai_model_version` | `String?` | Tùy chọn | Mô hình AI sinh đề thi (VD: `gpt-4o`, `gemini-1.5-flash`). |
| `time_limit_minutes` | `Int?` | Tùy chọn | Thời gian làm bài tối đa (phút). `null` = Không giới hạn. |
| `max_attempts` | `Int` | `@default(1)` | Số lần học sinh được phép làm lại bài. |
| `passing_score` | `Int?` | `@db.SmallInt` | Điểm số tối thiểu để tính là Đạt (VD: 5/10). |
| `status` | `QuizStatus` | `@default(draft)` | Trạng thái đề thi (`draft`, `published`, `archived`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bài quiz. |

---

### 4.2. Bảng `quiz_questions` (Ngân hàng câu hỏi)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `question_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh câu hỏi. |
| `quiz_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `quizzes` | Liên kết đề thi gốc (`onDelete: Cascade`). |
| `question_text` | `String` | Bắt buộc | Nội dung chữ của câu hỏi. |
| `question_type` | `QuizQuestionType` | `@default(multiple_choice)` | Loại câu hỏi (`multiple_choice`, `true_false`...). |
| `explanation` | `String?` | Tùy chọn | Lời giải chi tiết / Hướng dẫn học sinh sau khi nộp bài. |
| `points` | `Int` | `@default(1)`, `@db.SmallInt` | Điểm số tương ứng với câu hỏi này (mặc định = 1). |
| `order_index` | `Int` | `@default(0)` | Thứ tự câu hỏi hiển thị trong đề thi (0, 1, 2...). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo câu hỏi. |

---

### 4.3. Bảng `quiz_options` (Phương án trắc nghiệm chuẩn hóa 3NF)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `option_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh lựa chọn đáp án. |
| `question_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `quiz_questions` | Liên kết câu hỏi gốc (`onDelete: Cascade`). |
| `content` | `String` | Bắt buộc | Nội dung văn bản đáp án lựa chọn. |
| `is_correct` | `Boolean` | `@default(false)` | Đánh dấu đây là đáp án đúng (`true`) hay sai (`false`). |
| `order_index` | `Int` | `@default(0)` | Thứ tự hiển thị phương án trong câu hỏi (0, 1, 2...). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo phương án. |

---

### 4.4. Bảng `quiz_attempts` (Lượt làm bài & Kết quả)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `attempt_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh lượt làm bài. |
| `student_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `student_profiles` | Học sinh thực hiện bài thi. |
| `quiz_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `quizzes` | Bài quiz được chọn làm. |
| `score` | `Decimal?` | `@db.Decimal(5, 2)` | Điểm số thực tế đạt được (VD: `8.50`). |
| `total_points` | `Int?` | Tùy chọn | Tổng điểm tối đa của toàn bộ đề thi. |
| `answers_json` | `Json?` | `@default("[]")` | Mảng JSON chứa chi tiết câu trả lời học sinh nộp. |
| `started_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm mở đề thi và bắt đầu tính giờ. |
| `completed_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm bấm nộp bài thi. |
| `duration_seconds` | `Int?` | Tùy chọn | Thời gian thực tế học sinh làm bài tính bằng giây. |
| `is_passed` | `Boolean?` | Tùy chọn | Kết quả Đạt hay Không đạt (`score >= passing_score`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bản ghi. |

---

## 5. Quy trình tạo đề & Tự động chấm điểm (Auto-grading)

```
[1. Khởi tạo Đề thi]
        ↓
Gia sư soạn thủ công HOẶC AI trích xuất từ `document_chunks`
Status chuyển sang `published`
        ↓
[2. Học sinh bắt đầu làm bài]
        ↓
Khởi tạo bản ghi `quiz_attempts` (started_at = now())
        ↓
[3. Học sinh chọn đáp án & Bấm Nộp bài]
        ↓
Hệ thống chấm điểm tự động Backend (Auto-grading):
- So sánh `answers_json` gửi lên với các `quiz_options` có `is_correct = true` trong CSDL
- Tính tổng `score` = Sum(points các câu đúng)
- Tính `duration_seconds` = completed_at - started_at
- Đánh giá `is_passed` = (score >= passing_score)
        ↓
[4. Hiển thị bảng điểm & Lời giải chi tiết `explanation` cho học sinh]
```

---

## 6. Giải thích Lý do Thiết kế & Điểm "ăn điểm" với Giáo viên

1. **Tính năng AI Sinh đề thi (`generated_by_ai`) hoạt động như thế nào?**
   * **Kết hợp Module 8 & Module 9:** AI truy vấn các `document_chunks` của khóa học, tự động trích xuất các ý chính để tạo ra câu hỏi trong `quiz_questions`, sinh danh sách phương án trắc nghiệm với cờ `is_correct` tương ứng trong `quiz_options`, cùng lời giải chi tiết (`explanation`).

2. **Lợi ích của việc chuẩn hóa tách bảng `quiz_options` (Chuẩn 3NF)?**
   * **Đảm bảo tính nhất quán dữ liệu (Data Integrity):** Tách phương án thành các bản ghi trong `quiz_options` loại bỏ nguy cơ lệch dữ liệu giữa danh sách lựa chọn và đáp án đúng. Cho phép truy vấn, sắp xếp thứ tự (`order_index`), trộn đáp án (shuffle) và thống kê kết quả học sinh chọn từng phương án một cách chính xác tuyệt đối.

3. **Cơ chế chấm điểm tự động (Auto-grading) được đảm bảo ra sao?**
   * Cờ `is_correct` nằm an toàn ở bảng `quiz_options` phía Backend. Học sinh khi làm bài chỉ nhận về danh sách lựa chọn (`option_id`, `content`). Khi nộp bài, Backend so khớp `answers_json` (chứa `option_id` được chọn) với các option có `is_correct = true` trong CSDL và tính điểm tức thì.

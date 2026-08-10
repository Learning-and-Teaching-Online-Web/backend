# 📌 MODULE 8: DOCUMENT & AI (Tài liệu học tập & Trợ lý AI)

## 1. Giới thiệu tổng quan

Module **Document & AI** cung cấp hạ tầng quản lý tài liệu học tập và tính năng Trợ lý AI thông minh (AI Tutor Assistant) dựa trên kỹ thuật **RAG (Retrieval-Augmented Generation)**:
- **Tài liệu học tập (Document):** Lưu trữ tài liệu (PDF, DOCX, Slide...) do Gia sư upload phục vụ khóa học.
- **Phân đoạn & Vector hóa (DocumentChunk):** Bóc tách văn bản, chia nhỏ thành các đoạn Chunks và lưu trữ vector nhúng 1536 chiều bằng extension **pgvector** trong PostgreSQL.
- **Trợ lý AI (AIConversation):** Lưu trữ lịch sử hội thoại giữa Học sinh/Gia sư với AI, hỗ trợ trả lời câu hỏi chính xác dựa trên tài liệu khóa học và bối cảnh buổi học.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 8)

```
  +-----------------------------------+        +-----------------------------------+
  |              courses              |        |               users               |
  +-----------------------------------+        +-----------------------------------+
  | PK  | course_id (UUID)            |        | PK  | user_id (UUID)              |
  +-----------------------------------+        +-----------------------------------+
                    | (1 - N)                                   |
                    v                                           | (1 - N)
  +-----------------------------------+                         |
  |             documents             | <-----------------------+
  +-----------------------------------+                         |
  | PK  | doc_id (UUID)               |                         |
  | FK  | course_id -> courses        |                         |
  | FK  | uploaded_by -> users        |                         |
  |     | file_url (String)           |                         |
  |     | file_type (String)          |                         |
  |     | title (String)              |                         |
  |     | description (String?)       |                         |
  |     | extracted_text (String?)    |                         |
  |     | is_indexed (Boolean)        |                         |
  |     | indexed_at (Timestamptz?)   |                         |
  |     | metadata (Json?)            |                         |
  +-----------------------------------+                         |
                    |                                           |
                    | (1 - N)                                   |
                    v                                           v
  +-----------------------------------+        +-----------------------------------+
  |          document_chunks          |        |          ai_conversations         |
  +-----------------------------------+        +-----------------------------------+
  | PK  | chunk_id (UUID)             |        | PK  | conversation_id (UUID)    |
  | FK  | doc_id -> documents         |        | FK  | user_id -> users          |
  |     | content (String)            |        | FK  | course_id -> courses      |
  |     | chunk_index (Int)           |        |     | role (user/assistant)     |
  |     | token_count (Int?)          |        |     | message (String)          |
  |     | embedding (vector(1536)?)   |        |     | model_used (String?)      |
  +-----------------------------------+        |     | tokens_used (Int?)        |
                                               +-----------------------------------+
```

---

## 3. Chi tiết các Bảng dữ liệu (Models)

### 3.1. Bảng `documents` (Tài liệu học tập)

> **Mô tả:** Lưu trữ thông tin tài liệu do gia sư tải lên khóa học làm tài liệu giảng dạy hoặc tri thức đầu vào cho AI.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `doc_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID cho tài liệu. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Tài liệu thuộc khóa học nào (`onDelete: Cascade`). |
| `uploaded_by` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người tải tài liệu lên (Gia sư / Admin). |
| `file_url` | `String` | Bắt buộc | Đường dẫn lưu tệp tin gốc trên Cloud Storage. |
| `file_type` | `String` | Bắt buộc | Định dạng file (`pdf`, `docx`, `pptx`, `txt`...). |
| `title` | `String` | Bắt buộc | Tên tiêu đề hiển thị của tài liệu. |
| `description` | `String?` | Tùy chọn | Mô tả tóm tắt nội dung tài liệu. |
| `extracted_text` | `String?` | Tùy chọn | Văn bản thô bóc tách từ file đính kèm. |
| `is_indexed` | `Boolean` | `@default(false)` | Trạng thái đã chia chunk và vector hóa xong chưa. |
| `indexed_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm hoàn tất đánh chỉ mục vector. |
| `metadata` | `Json?` | `@default("{}")` | Mảng JSON lưu thuộc tính mở rộng (số trang, tác giả...). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tải tài liệu lên. |

---

### 3.2. Bảng `document_chunks` (Phân đoạn & Vector Embedding)

> **Mô tả:** Lưu các đoạn văn bản ngắn được chia nhỏ từ tài liệu gốc kèm vector nhúng 1536 chiều từ pgvector.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `chunk_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh đoạn chunk. |
| `doc_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `documents` | Liên kết tài liệu gốc (`onDelete: Cascade`). |
| `content` | `String` | Bắt buộc | Đoạn văn bản nhỏ đã cắt ra (300-500 tokens). |
| `chunk_index` | `Int` | Bắt buộc | Thứ tự của đoạn chunk trong tài liệu gốc (0, 1, 2...). |
| `token_count` | `Int?` | Tùy chọn | Số lượng token tiêu tốn của đoạn chunk này. |
| `embedding` | `Unsupported("vector(1536)")?` | Tùy chọn (pgvector) | Vector nhúng 1536 chiều biểu diễn ngữ nghĩa của văn bản. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bản ghi. |

---

### 3.3. Bảng `ai_conversations` (Lịch sử hội thoại Trợ lý AI)

> **Mô tả:** Lưu lịch sử trao đổi giữa người dùng và Trợ lý AI Tutor.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `conversation_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính UUID định danh câu hội thoại. |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người dùng tham gia chat với AI (`onDelete: Cascade`). |
| `course_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `courses` | Gắn bối cảnh với Khóa học cụ thể (`onDelete: SetNull`). |
| `role` | `String` | Bắt buộc | Vai trò người gửi (`user`, `assistant`, `system`). |
| `message` | `String` | Bắt buộc | Nội dung văn bản câu hỏi hoặc câu trả lời AI. |
| `model_used` | `String?` | Tùy chọn | Mô hình AI thực thi (VD: `gpt-4o`, `gemini-1.5-pro`). |
| `tokens_used` | `Int?` | Tùy chọn | Tổng số token tiêu tốn để thống kê chi phí API. |
| `timestamp` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm gửi câu hỏi/trả lời. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo bản ghi. |

---

## 4. Kiến trúc & Quy trình RAG (Retrieval-Augmented Generation)

```
[1. Gia sư Upload File PDF]
        ↓
2. Server bóc tách chữ → extracted_text
        ↓
3. Cắt nhỏ văn bản thành các Chunks (300-500 words)
        ↓
4. Gửi Chunks qua Embedding API (OpenAI / Gemini) → mảng Vector 1536 chiều
        ↓
5. Lưu Chunks + Vector vào bảng `document_chunks` (pgvector)
        ↓
=================== LUỒNG HỎI ĐÁP AI ===================
[Học sinh đặt câu hỏi: "Công thức tính đạo hàm hàm hợp là gì?"]
        ↓
6. Vector hóa câu hỏi → Query Vector (1536 chiều)
        ↓
7. Query pgvector dùng Cosine Distance: Tìm Top K chunks tương đồng nhất
        ↓
8. Ghép Top K Chunks + Câu hỏi thành Prompt → Gửi LLM (GPT-4 / Gemini)
        ↓
9. AI trả lời chính xác dựa trên tài liệu & Lưu vào `ai_conversations`
```

---

## 5. Giải thích Lý do Thiết kế & Điểm "ăn điểm" với Giáo viên

1. **Tại sao cần cắt nhỏ tài liệu thành `document_chunks` mà không đưa toàn bộ file vào AI?**
   * **Tối ưu chi phí & Tránh nhiễu thông tin:** Đưa toàn bộ file vào LLM sẽ gây vượt quá giới hạn Context Window, tốn chi phí token rất lớn và khiến AI dễ bị nhiễu thông tin (hiện tượng "lost in the middle"). Cắt chunk giúp AI tập trung chính xác vào đúng đoạn kiến thức học sinh cần tìm.

2. **Kiểu dữ liệu `vector(1536)` trong `document_chunks` hoạt động như thế nào?**
   * **Semantic Search với pgvector:** Đây là tính năng mở rộng của extension **pgvector** trong PostgreSQL. Nó chuyển đổi ý nghĩa của đoạn văn bản thành toạ độ trong không gian 1536 chiều. Nhờ đó hệ thống thực hiện tìm kiếm ngữ nghĩa (Semantic Search) tìm đúng đoạn văn bản có cùng ý nghĩa với câu hỏi dù học sinh dùng từ khác biệt.

3. **Ý nghĩa của cột `course_id` trong `ai_conversations`?**
   * **Phân vùng bối cảnh (Context Scope):** Giúp AI nhận biết câu hỏi thuộc khóa học nào. Từ đó AI ưu tiên truy vấn các `document_chunks` của khóa học đó để đưa ra câu trả lời chuẩn xác nhất.

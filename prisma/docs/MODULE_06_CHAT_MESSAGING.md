# 📌 MODULE 6: CHAT & MESSAGING (Trò chuyện & Tin nhắn)

## 1. Giới thiệu tổng quan

Module **Chat & Messaging** quản lý toàn bộ hệ thống trao đổi thông tin trực tiếp giữa Học sinh và Gia sư:
- **Phòng chat (ChatRoom):** Quản lý không gian trò chuyện linh hoạt (Chat 1-1, Chat nhóm hoặc Phòng chat thuộc buổi học `ClassSession`).
- **Tin nhắn (Message):** Lưu trữ lịch sử nhắn tin đa phương tiện (văn bản, hình ảnh, file PDF/Word, tin nhắn hệ thống, ảnh chụp bảng vẽ).
- **Tính năng cao cấp:** Hỗ trợ tính năng **Reply / Trích dẫn tin nhắn** thông qua quan hệ tự tham chiếu (Self-Referencing FK).

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 6)

```
        +-----------------------+
        |       RoomType        | (ENUM: direct, group, classroom)
        +-----------------------+
                    |
                    v
        +-----------------------+
        |      MessageType      | (ENUM: text, image, file, system, whiteboard)
        +-----------------------+
                    |
                    v
  +-----------------------------------+
  |            chat_rooms             |
  +-----------------------------------+
  | PK  | room_id (UUID)              |
  | FK  | session_id -> class_sessions|
  | FK  | booking_id -> bookings      |
  |     | room_type (RoomType)        |
  |     | title (String?)             |
  |     | participants (Json) [GIN]   |
  +-----------------------------------+
                    |
                    | (1 - N)
                    v
  +-----------------------------------+
  |             messages              |
  +-----------------------------------+
  | PK  | message_id (UUID)           |
  | FK  | room_id -> chat_rooms       |
  | FK  | sender_id -> users          |
  |     | content (String?)           |
  |     | message_type (MessageType)  |
  |     | file_url (String?)          |
  |     | file_name (String?)         |
  |     | is_read (Boolean)           |
  |     | read_at (Timestamptz?)      |
  | FK  | reply_to -> messages (Self) | (Reply tin nhắn gốc)
  +-----------------------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `RoomType` (Loại phòng trò chuyện)
*   `direct`: Chat 1-1 riêng tư giữa 1 Học sinh và 1 Gia sư.
*   `group`: Chat nhóm dành cho khóa học nhiều học sinh.
*   `classroom`: Phòng chat trực tiếp tích hợp trong giao diện lớp học trực tuyến (`ClassSession`).

### 3.2. `MessageType` (Loại tin nhắn)
*   `text`: Tin nhắn văn bản thông thường.
*   `image`: Hình ảnh đính kèm (ảnh bài tập, sơ đồ...).
*   `file`: Tệp tin đính kèm (PDF, Word, Excel, Slide...).
*   `system`: Thông báo tự động từ hệ thống (VD: "Gia sư đã bắt đầu buổi học").
*   `whiteboard`: Ảnh chụp nhanh bảng vẽ điện tử từ lớp học.

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `chat_rooms` (Phòng trò chuyện)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `room_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất định danh phòng chat. |
| `session_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `class_sessions` | Liên kết tới Buổi học (nếu là phòng chat trong lớp). |
| `booking_id` | `String?` | `@db.Uuid`, Khóa ngoại -> `bookings` | Liên kết tới hợp đồng đặt lịch. |
| `room_type` | `RoomType` | `@default(direct)` | Loại phòng chat (`direct`, `group`, `classroom`). |
| `title` | `String?` | Tùy chọn | Tên phòng chat (VD: "Nhóm Ôn thi THPT Toán 12"). |
| `participants` | `Json?` | `@default("[]")`, Index GIN | Mảng JSON chứa danh sách User ID tham gia phòng (VD: `["uuid-1", "uuid-2"]`). |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm tạo phòng chat. |

---

### 4.2. Bảng `messages` (Tin nhắn)

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `message_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất cho tin nhắn. |
| `room_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `chat_rooms` | Liên kết tới Phòng chat (`onDelete: Cascade`). |
| `sender_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người gửi tin nhắn. |
| `content` | `String?` | Tùy chọn | Nội dung tin nhắn văn bản. |
| `message_type` | `MessageType` | `@default(text)` | Phân loại tin nhắn. |
| `file_url` | `String?` | Tùy chọn | URL tệp tin/hình ảnh trên Cloud Storage. |
| `file_name` | `String?` | Tùy chọn | Tên gốc của tệp tin đính kèm. |
| `is_read` | `Boolean` | `@default(false)` | Trạng thái đã xem (`false` = chưa đọc, `true` = đã xem). |
| `read_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm mở xem tin nhắn. |
| `reply_to` | `String?` | `@db.Uuid`, Khóa ngoại -> `messages` | FK tự trỏ đến `message_id` của tin nhắn được reply (Self-referencing). |
| `sent_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm bấm gửi. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Thời điểm lưu bản ghi. |

---

## 5. Luồng xử lý tin nhắn Real-time (Socket.IO & WebSockets)

```
[1. Người dùng mở ứng dụng]
        ↓
Kết nối Socket.IO tới Server
Join vào các room_id dựa trên mảng `participants`
        ↓
[2. Học sinh gửi tin nhắn]
        ↓
Client ──(Event: send_message)──> Backend Server
                                      │
                                      ├── 1. Lưu vào CSDL bảng `messages`
                                      └── 2. Broadcast (Event: new_message) tới room_id
        ↓
[3. Người nhận mở tin nhắn]
        ↓
Client ──(Event: mark_as_read)──> Backend Server
                                      │
                                      └── Cập nhật `is_read = true`, `read_at = now()`
```

---

## 6. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật với Giáo viên

1. **Tại sao sử dụng mảng JSON `participants` cùng chỉ mục GIN cho phòng chat?**
   * **Hiệu năng truy vấn cao:** Khi mở ứng dụng, client cần lấy danh sách tất cả các phòng chat của người dùng (`user_id`). Thay vì phải `JOIN` qua bảng phòng chat trung gian 1-N phức tạp, câu lệnh `@index([participants], type: Gin)` trong PostgreSQL cho phép tìm nhanh tất cả các mảng JSON chứa `user_id` chỉ trong vài mili-giây.

2. **Cơ chế Reply (Trả lời tin nhắn) được thiết kế như thế nào?**
   * **Kỹ thuật Self-referencing FK:** Cột `reply_to` liên kết trực tiếp tới khóa chính `message_id` của chính bảng `messages`. Khi người dùng bấm trả lời một tin nhắn, hệ thống gán `reply_to` = ID tin nhắn gốc. Khi hiển thị, UI dễ dàng trích dẫn đoạn văn bản của tin nhắn cha (`parent`).

3. **Lưu trữ `file_name` song song với `file_url` để làm gì?**
   * `file_url` lưu trên Cloud Storage thường có tên bị băm ngẫu nhiên (VD: `storage.com/files/a8f9-3d12.pdf`). Cột `file_name` giữ lại tên hiển thị đẹp ban đầu người dùng gửi (VD: `DeThiThu_Toan12.pdf`) giúp học sinh dễ nhận biết khi tải tài liệu về máy.

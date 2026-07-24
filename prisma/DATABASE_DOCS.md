# 📑 TÀI LIỆU THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DOCUMENTATION)

---

## 📌 TỔNG QUAN HỆ THỐNG CƠ SỞ DỮ LIỆU

Hệ thống cơ sở dữ liệu được xây dựng trên **PostgreSQL** thông qua **Prisma ORM**, bao gồm **11 Modules** nghiệp vụ chính. 

Để thuận tiện cho việc quản lý, đọc và bảo vệ đồ án với giáo viên, toàn bộ tài liệu chi tiết của từng module đã được chia nhỏ và tổ chức gọn gàng trong thư mục [`backend/prisma/docs/`](file:///d:/cod/thuctap/backend/prisma/docs/).

---

## 🗺️ DANH SÁCH CÁC MODULE & TÀI LIỆU CHI TIẾT

| STT | Tên Module | Mô tả nghiệp vụ | Bảng dữ liệu & ENUMs | Tài liệu chi tiết |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **User & Authentication** | Quản lý tài khoản, đăng nhập, phân quyền và địa chỉ người dùng. | `users`, `user_addresses`<br>*ENUMs:* `UserRole`, `UserStatus` | 📄 [MODULE_01_USER_AUTH.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_01_USER_AUTH.md) |
| **02** | **Tutor & Student Profile** | Quản lý hồ sơ gia sư, bằng cấp chứng chỉ, hồ sơ học sinh và thông tin AI Matching. | `tutor_profiles`, `student_profiles`, `tutor_certificates`<br>*ENUMs:* `TeachingMode`, `VerificationStatus` | 📄 [MODULE_02_TUTOR_STUDENT.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_02_TUTOR_STUDENT.md) |
| **03** | **Course & Schedule** | Quản lý danh mục khóa học, học phí và lịch giảng dạy lặp lại của gia sư. | `courses`, `course_schedules`<br>*ENUMs:* `CourseStatus` | 📄 [MODULE_03_COURSE_SCHEDULE.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_03_COURSE_SCHEDULE.md) |
| **04** | **Booking & Payment** | Quản lý đặt lịch, thanh toán qua ZaloPay, Ví nội bộ và Rút tiền gia sư. | `bookings`, `transactions`, `wallets`, `payouts`<br>*ENUMs:* `BookingStatus`, `PaymentStatus`, `TransactionStatus`, `PayoutStatus` | 📄 [MODULE_04_BOOKING_PAYMENT.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_04_BOOKING_PAYMENT.md) |
| **05** | **Class Session & Attendance** | Quản lý từng buổi học thực tế, điểm danh và ghi âm/băng hình buổi học. | `class_sessions`, `attendances`, `session_recordings`<br>*ENUMs:* `SessionStatus`, `AttendanceStatus`, `AttendanceMethod` | 📄 [MODULE_05_CLASS_SESSION.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_05_CLASS_SESSION.md) |
| **06** | **Chat & Messaging** | Quản lý phòng chat 1-1, chat nhóm và tin nhắn trao đổi giữa Học sinh & Gia sư. | `chat_rooms`, `messages`<br>*ENUMs:* `MessageType`, `RoomType` | 📄 [MODULE_06_CHAT_MESSAGING.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_06_CHAT_MESSAGING.md) |
| **07** | **Review, Favorite & Matching** | Quản lý đánh giá gia sư, danh sách gia sư yêu thích và log đề xuất từ thuật toán AI. | `reviews`, `favorites`, `matching_logs` | 📄 [MODULE_07_REVIEW_MATCHING.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_07_REVIEW_MATCHING.md) |
| **08** | **Document & AI** | Quản lý tài liệu khóa học, trích xuất Vector Search (pgvector) và lịch sử chat AI. | `documents`, `document_chunks`, `ai_conversations` | 📄 [MODULE_08_DOCUMENT_AI.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_08_DOCUMENT_AI.md) |
| **09** | **Quiz** | Quản lý ngân hàng câu hỏi trắc nghiệm/tự luận, tạo đề thi AI và kết quả làm bài. | `quizzes`, `quiz_questions`, `quiz_attempts`<br>*ENUMs:* `QuizQuestionType`, `QuizStatus` | 📄 [MODULE_09_QUIZ.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_09_QUIZ.md) |
| **10** | **Admin & System** | Quản lý nhật ký hoạt động Admin, cấu hình hệ thống và trạng thái bảng vẽ chung. | `admin_logs`, `system_configs`, `whiteboard_states` | 📄 [MODULE_10_ADMIN_SYSTEM.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_10_ADMIN_SYSTEM.md) |
| **11** | **Article & Comment** | Quản lý tin tức, bài viết kinh nghiệm học tập và các bình luận trao đổi. | `articles`, `article_comments`, `course_comments` | 📄 [MODULE_11_ARTICLE_COMMENT.md](file:///d:/cod/thuctap/backend/prisma/docs/MODULE_11_ARTICLE_COMMENT.md) |

---

## 🛠️ CẤU TRÚC THƯ MỤC CƠ SỞ DỮ LIỆU (`backend/prisma/`)

```
backend/prisma/
├── schema.prisma             # File cấu hình Prisma Schema chính (đã gôm nhóm theo Module)
├── DATABASE_DOCS.md          # File Index / Tổng quan tài liệu thiết kế CSDL
└── docs/                     # Thư mục chứa tài liệu chi tiết cho từng Module
    ├── MODULE_01_USER_AUTH.md
    ├── MODULE_02_TUTOR_STUDENT.md
    ├── MODULE_03_COURSE_SCHEDULE.md
    ├── MODULE_04_BOOKING_PAYMENT.md
    ├── MODULE_05_CLASS_SESSION.md
    ├── MODULE_06_CHAT_MESSAGING.md
    ├── MODULE_07_REVIEW_MATCHING.md
    ├── MODULE_08_DOCUMENT_AI.md
    ├── MODULE_09_QUIZ.md
    ├── MODULE_10_ADMIN_SYSTEM.md
    └── MODULE_11_ARTICLE_COMMENT.md
```

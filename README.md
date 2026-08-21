# 🎓 BÁO CÁO THỰC TẬP TỐT NGHIỆP ĐẠI HỌC
## ĐỀ TÀI: XÂY DỰNG NỀN TẢNG WEB KẾT NỐI GIA SƯ VÀ HỌC VIÊN, HỖ TRỢ HỌC TRỰC TUYẾN VÀ TÍCH HỢP AI HỖ TRỢ HỌC TẬP

### 🏫 Đơn Vị: HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG (PTIT)
- **Giảng Viên Hướng Dẫn**: Th.S Nguyễn Thị Bích Nguyên

### 👥 Sinh Viên Thực Hiện (Lớp D22CQCNPM01-N):
1. **Nguyễn Ngọc Cẩn** - MSSV: `N22DCCN009`
2. **Nguyễn Thành Phong** - MSSV: `N22DCCN059`
3. **Nguyễn Nhật Thi** - MSSV: `N22DCCN080`

---

# 🚀 NovaLearn Backend API (Server Repository)

Hệ thống RESTful API Server phục vụ cho Đồ án Thực tập tốt nghiệp đại học **"Xây dựng nền tảng Web kết nối Gia sư và Học viên, hỗ trợ học trực tuyến và tích hợp AI hỗ trợ học tập"**. Hệ thống quản lý bài đăng tìm gia sư (`ClassRequest`), kích hoạt lớp học (`OfflineClass`), thanh toán tạm giữ Escrow 48 giờ, đếm ngược tự động xử lý quá hạn hoàn tiền ví, và quản lý yêu cầu hủy lớp bảo hộ 7 ngày (`RefundTicket`).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Language & Runtime**: Node.js, Express.js (v5), TypeScript
- **Database & ORM**: PostgreSQL, Prisma ORM (`@prisma/client`), `@prisma/adapter-pg`
- **Authentication & Security**: JWT (JSON Web Tokens), Passport.js (Google OAuth 2.0), Bcrypt.js
- **Services & Utilities**: Supabase Storage, Nodemailer (SMTP Email Service)
- **Background Worker**: Escrow Expiration Scanner (`escrowExpiration.job`)
- **Documentation**: Swagger UI (`swagger-ui-express`)

---

## ✨ Các Tính Năng Backend Chính (Core Features)

1. **Quản lý Nguồn Lớp Học & Bài Đăng (`ClassRequest`)**:
   - Học viên tạo bài đăng tìm gia sư, theo dõi trạng thái.
   - Admin kiểm duyệt bài đăng, gán gia sư chỉ định hoặc mở công khai cho gia sư ứng tuyển.

2. **Hệ Thống Thanh Toán Tạm Giữ Escrow (48 Giờ)**:
   - Gia sư nộp phí nhận lớp (35% mức lương) vào ví Escrow.
   - Học viên nộp 100% học phí tháng đầu vào ví Escrow.
   - Khi cả 2 bên nộp đủ tiền trong thời hạn 48h → Tự động khởi tạo lớp học chính thức (`OfflineClass`) trạng thái `ACTIVE`.

3. **Tự Động Xử Lý Quá Hạn & Hoàn Tiền Ví (`escrowExpiration.job`)**:
   - Tự động đếm ngược 48h thời hạn đóng tiền Escrow.
   - Khi có 1 bên trễ hạn: Hoàn 100% tiền giữ chỗ cho bên đã nộp đúng hạn vào Ví cá nhân (`Wallet`).
   - Tự động quét bù dữ liệu kẹt (`repairOrphanedEscrowRefunds`) khi khởi động và theo chu kỳ.

4. **Quản Lý Hủy Lớp & Bảo Hộ 7 Ngày (`RefundTicket`)**:
   - Cho phép gửi yêu cầu hủy lớp trong vòng 7 ngày kể từ khi kích hoạt lớp `ACTIVE`.
   - Phân định lỗi: 
     - **Lỗi Học viên (`STUDENT_FAULT`)**: Học viên bị phạt 10% học phí (hoàn 90%), Gia sư nhận lại 100% phí nhận lớp.
     - **Lỗi Gia sư (`TUTOR_FAULT`)**: Gia sư bị phạt 20% phí nhận lớp (hoàn 80%), Học viên nhận lại 100% học phí.

5. **Ví Tiền & Lịch Sử Giao Dịch (`Wallet` & `Transaction`)**:
   - Nạp tiền vào ví, trừ tiền khi thanh toán Escrow, nhận tiền hoàn tự động khi lớp bị hủy hoặc quá hạn.

---

## 📁 Cấu Trúc Thư Mục (Project Structure)

```text
backend/
├── prisma/
│   ├── schema.prisma       # Prisma Database Schema (Models & Relations)
├── src/
│   ├── config/             # Cấu hình Env, Prisma, Swagger, Passport
│   ├── controllers/        # Xử lý logic nghiệp vụ API (Auth, ClassRequest, RefundTicket, Tutors...)
│   ├── jobs/               # Background Cron Jobs (Escrow Expiration Worker)
│   ├── middlewares/        # Authentication & Authorization Middlewares
│   ├── routes/             # Cấu hình API Endpoints
│   ├── services/           # Các dịch vụ dùng chung (Email, Supabase Upload)
│   ├── types/              # Định nghĩa Custom TypeScript Interfaces
│   ├── server.ts           # Entry point của ứng dụng Express
├── scripts/                # Helper Scripts (Export DB to Excel, Sync)
├── package.json
└── tsconfig.json
```

---

## ⚙️ Hướng Dẫn Cài Đặt & Chạy Ứng Dụng (Setup & Installation)

### 1. Yêu cầu môi trường
- Node.js >= 18.x
- PostgreSQL Database (hoặc kết nối qua Supabase/Neon PostgreSQL)

### 2. Khai báo biến môi trường (`.env`)
Tạo file `.env` tại thư mục gốc `backend/` với các tham số:

```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# Supabase Storage Configuration
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_ANON_KEY="your-anon-key"

# Email Configuration (Nodemailer SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="no-reply@giasuonline.com"

# Client URL
FRONTEND_URL="http://localhost:5173"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"

# Escrow Config
ESCROW_PAYMENT_DEADLINE_HOURS=48
ESCROW_EXPIRATION_CHECK_INTERVAL_MINUTES=15
```

### 3. Cài đặt các thư viện phụ thuộc
```bash
npm install
```

### 4. Đồng bộ Cơ sở dữ liệu (Prisma ORM)
```bash
npx prisma generate
npx prisma db push
```

### 5. Chạy ứng dụng

- **Môi trường Phát triển (Development Mode)**:
  ```bash
  npm run dev
  ```
  Server sẽ chạy tại: `http://localhost:5000`

- **Tài liệu API (Swagger UI)**:
  Truy cập: `http://localhost:5000/api-docs`

- **Đóng gói & Khởi chạy Production**:
  ```bash
  npm run build
  npm start
  ```

---

## 📌 Danh Sách API Endpoints Chính

| Phương thức | Endpoint | Mô tả | Phân quyền |
|---|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới | Public |
| `POST` | `/api/auth/login` | Đăng nhập lấy Token | Public |
| `GET` | `/api/auth/google` | Đăng nhập bằng Google OAuth | Public |
| `GET` | `/api/class-requests` | Lấy danh sách lớp tìm gia sư | Public / Authenticated |
| `POST` | `/api/class-requests` | Học viên tạo bài tìm gia sư | Student |
| `POST` | `/api/class-requests/:id/pay-tuition` | Học viên nộp học phí 48h Escrow | Student |
| `POST` | `/api/class-requests/:id/pay-commission` | Gia sư nộp phí nhận lớp 48h Escrow | Tutor |
| `POST` | `/api/class-requests/:id/cancel-student-payment` | Học viên từ chối/hủy nhận lớp 48h | Student |
| `POST` | `/api/class-requests/:id/cancel-assignment` | Gia sư từ chối/hủy nhận lớp 48h | Tutor |
| `POST` | `/api/refund-tickets/class/:classId` | Gửi yêu cầu hủy/hoàn tiền 7 ngày | Student / Tutor |
| `PATCH` | `/api/refund-tickets/:ticketId/process` | Admin duyệt yêu cầu hoàn tiền 7 ngày | Admin |
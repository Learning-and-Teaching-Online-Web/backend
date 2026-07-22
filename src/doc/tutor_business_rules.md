# Quy Trắc & Nghiệp Vụ Quản Lý Giảng Viên (Tutor Business Specification)

Tài liệu này quy định chi tiết toàn bộ luồng nghiệp vụ, phân quyền, tài chính và các kịch bản xử lý tài khoản Giảng viên (Tutor / Instructor) trên hệ thống **NovaLearn**.

---

## 1. Trạng Thái Vòng Đời Của Giảng Viên (Tutor Status Lifecycle)

Hồ sơ giảng viên (`tutor_profiles`) trải qua 3 trạng thái chính:

```
[ Đăng ký mới ] ───► CHỜ DUYỆT (Pending) ───┬───► ĐÃ DUYỆT (Approved) ───► Công khai & Nhận lớp
                                           │
                                           └───► TỪ CHỐI (Rejected) ───► Ẩn & Tạm khóa
```

### 🔹 1.1 Trạng thái CHỜ DUYỆT (`pending`)
- **Điều kiện**: Khi học viên nâng cấp lên tài khoản Giảng viên hoặc người dùng mới tạo hồ sơ Gia sư.
- **Quyền hạn**:
  - Được phép đăng nhập vào **Kênh Gia Sư** (`/teacher/dashboard`).
  - Được phép tạo dự thảo khóa học (`draft`) và tải chứng chỉ / bằng cấp cá nhân lên hệ thống.
- **Hạn chế (Restrictions)**:
  - ❌ **Không xuất hiện** trên trang công khai danh sách giảng viên (`/instructors`).
  - ❌ **Không xuất hiện** trong kết quả tìm kiếm của học viên.
  - ❌ **Không được xuất bản** khóa học hay nhận tiền đặt lịch từ học viên.

### 🔹 1.2 Trạng thái ĐÃ DUYỆT (`approved`)
- **Điều kiện**: Admin thẩm định bằng cấp, thông tin cá nhân và bấm nút **"Duyệt hồ sơ"** trên Admin Panel.
- **Quyền hạn**:
  - ✅ **Hiển thị công khai** trên trang `/instructors` kèm số sao đánh giá (Rating) và kinh nghiệm.
  - ✅ **Được xuất bản khóa học** (`published`) lên trang chính.
  - ✅ **Được mở lịch dạy**, nhận đặt lớp (`booking`) và thu học phí từ học viên.
  - ✅ **Được rút tiền thu nhập** từ Ví hệ thống về tài khoản ngân hàng cá nhân.

### 🔹 1.3 Trạng thái TỪ CHỐI / BỊ KHÓA (`rejected` / `suspended`)
- **Điều kiện**: Admin từ chối hồ sơ do bằng cấp không hợp lệ, hoặc khóa tài khoản do giảng viên vi phạm chính sách nền tảng.
- **Hệ quả nghiệp vụ**:
  - ❌ **Tự động ẩn** profile khỏi trang tìm kiếm công khai `/instructors`.
  - ❌ **Khóa học bị ngừng nhận sinh viên mới**: Tự động ẩn toàn bộ khóa học khỏi trang public (`/courses`).
  - 🔒 **Đóng băng ví & rút tiền**: Tạm dừng tính năng rút tiền thu nhập để chờ xử lý khiếu nại.

---

## 2. Chính Sách Bảo Vệ Học Viên Khi Giảng Viên Bị Từ Chối / Đình Chỉ

Khi một Giảng viên đã có học viên đăng ký học trước đó nhưng sau đó bị Admin **Khóa tài khoản (`suspended`)** hoặc **Hủy xác thực (`rejected`)**:

| Hạng mục | Quy trình xử lý tự động của hệ thống |
| :--- | :--- |
| **Buổi học chưa diễn ra** | Tự động hủy buổi học và gửi thông báo cho học viên. |
| **Chính sách hoàn tiền (Refund)** | Hoàn **100% học phí** của các buổi học chưa học vào Ví tài khoản của học viên. |
| **Tài liệu khóa học cũ** | Học viên vẫn giữ quyền xem lại video/tài liệu bài giảng đã hoàn thành trước thời điểm đình chỉ. |

---

## 3. Quy Trình Duyệt Bằng Cấp & Chứng Chỉ (Tutor Certificate Verification)

1. Giảng viên gửi hình ảnh bằng Đại học, chứng chỉ sư phạm, chứng chỉ ngoại ngữ (IELTS, TOEIC...).
2. Trạng thái chứng chỉ khởi tạo là `pending`.
3. Admin nhấp **Xem chứng chỉ** trên Admin Panel -> Kiểm tra tính hợp lệ -> Nhập **Admin Note** (ví dụ: *"Bằng đại học Bách Khoa hợp lệ"*) -> Bấm **Duyệt (Approve)** hoặc **Từ chối (Reject)**.
4. Mỗi bằng cấp được duyệt sẽ giúp tăng điểm uy tín và huy hiệu xác minh trên trang cá nhân của giảng viên.

---

## 4. Quản Lý Khóa Học & Tránh Trùng Lịch Dạy (Courses & Schedule Validation)

- **Cấu trúc khóa học**: Khóa học bao gồm thông tin học phí (`price`), thời lượng ca học (`duration_minutes`), số học viên tối đa (`max_students`), và số buổi học (`total_sessions`).
- **Tạo ca học (`CourseSchedule`)**: Giảng viên thiết lập các khung giờ dạy cố định hoặc định kỳ (`day_of_week`, `start_time`, `end_time`).
- **Thuật toán chặn trùng lịch (Schedule Overlap Guard)**: Hệ thống tự động kiểm tra thời gian thực. Giảng viên **không thể tạo 2 ca học bị đè hoặc trùng thời gian** với nhau.

---

## 5. Quy Trình Nhận Đặt Lớp & Điểm Danh (Booking & Attendance Workflow)

1. **Đặt lớp (`Booking`)**: Học viên chọn khóa học và ca học ➔ Thanh toán qua cổng ZaloPay.
2. **Khóa khung giờ**: Khi đơn hàng được xác nhận (`confirmed`), ca học `CourseSchedule` tự động đổi `is_booked = true`.
3. **Tạo lớp học ảo (`ClassSession`)**: Hệ thống tự động khởi tạo phòng học, tích hợp phòng chat (`ChatRoom`) và bảng trắng tương tác (`WhiteboardState`).
4. **Điểm danh (`Attendance`)**: Ghi nhận trạng thái có mặt (`present`), vắng mặt (`absent`), muộn (`late`) của học viên trong buổi học.

---

## 6. Chính Sách Ví Thu Nhập & Phí Nền Tảng (Tutor Wallet & Platform Fee)

- **Phí hoa hồng nền tảng (Platform Fee)**: Hệ thống tự động chiết khấu **10%** trên mỗi đơn đặt lớp thành công. Giảng viên thực nhận **90%** học phí.
- **Tự động cộng Ví (`Wallet`)**: Số tiền thực nhận được cộng vào Ví số dư tài khoản của Giảng viên ngay khi đơn hàng hoàn tất.
- **Yêu cầu Rút tiền (`Payout`)**: Giảng viên gửi yêu cầu rút tiền về ngân hàng cá nhân (`bank_name`, `bank_account`, `amount`). Số tiền rút sẽ tạm trừ khỏi Ví.
- **Xử lý yêu cầu Rút tiền**:
  - Admin bấm **Duyệt chuyển khoản** ➔ Trạng thái `Payout` chuyển thành `completed`.
  - Admin bấm **Từ chối / Thất bại** ➔ Số tiền tự động **hoàn trả 100% vào Ví** của Giảng viên.

---

## 7. Đánh Giá Uy Tín & Thuật Toán Xếp Hạng (Reviews & Rating System)

- Chỉ Học viên đã tham gia lớp học mới được gửi Đánh giá (`Review`) kèm chấm điểm (1 - 5 sao).
- Tiêu chí đánh giá gồm: Chuyên môn, Thái độ phục vụ (`professionalism`), Giao tiếp (`communication`), và Đúng giờ (`punctuality`).
- Điểm trung bình `rating` của Giảng viên tự động cập nhật trong `tutor_profiles`.
- Top Giảng viên có Rating cao nhất sẽ được ưu tiên hiển thị ở mục **Gia sư tiêu biểu** trên `AdminDashboard` và trang chủ người dùng.

---

## 8. Giao Diện Quản Trị Admin Panel (Admin Management Hub)

- **Tách biệt Menu**: Phân chia rõ ràng 2 module **"Học viên"** (`/admin/students`) và **"Giảng viên"** (`/admin/tutors`).
- **Bộ lọc mặc định**: Tab Giảng viên mặc định hiển thị *Tất cả trạng thái*, kết hợp **Badge đếm số lượng Chờ duyệt (`⏳ Chờ duyệt: X`)** màu vàng nổi bật ở góc phải thanh Filter.
- **Lọc 1 chạm**: Nhấp trực tiếp vào Badge `Chờ duyệt` ở góc phải để lọc nhanh danh sách hồ sơ gia sư cần duyệt.
- **Cảnh báo Khóa học**: Bảng kiểm duyệt khóa học (`/admin/courses`) hiển thị badge `GS Chờ duyệt` đối với các khóa học thuộc gia sư chưa được phê duyệt.

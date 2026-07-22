# Quy Trắc & Nghiệp Vụ Quản Lý Giảng Viên (Tutor Business Specification)

Tài liệu này quy định chi tiết luồng nghiệp vụ, phân quyền và các kịch bản xử lý tài khoản Giảng viên (Tutor / Instructor) trên hệ thống **NovaLearn**.

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
  - ❌ **Khóa học bị ngừng nhận sinh viên mới**: Chuyển tất cả khóa học của giảng viên về trạng thái ẩn (`hidden`).
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

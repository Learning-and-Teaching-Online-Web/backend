# 📌 MODULE 4: BOOKING & PAYMENT (Đặt lịch & Thanh toán)

## 1. Giới thiệu tổng quan
Module **Booking & Payment** quản lý quy trình học sinh đăng ký khóa học, thanh toán học phí qua cổng thanh toán ZaloPay, quản lý Ví nội bộ của người dùng và tính năng Rút tiền (Payout) của Gia sư về ngân hàng.

---

## 2. Sơ đồ quan hệ thực thể (ERD Diagram - Module 4)

```
        +-----------------------+
        |     BookingStatus     | (ENUM: pending, confirmed, completed, cancelled, refunded)
        +-----------------------+
                    |
                    v
        +-----------------------+
        |     PaymentStatus     | (ENUM: unpaid, paid, refunded, failed)
        +-----------------------+
                    |
                    v
  +-----------------------------------+
  |             bookings              |
  +-----------------------------------+
  | PK  | booking_id (UUID)           |
  | FK  | student_id -> student_prof  |
  | FK  | course_id -> courses        |
  | FK  | schedule_id -> schedules    |
  |     | total_amount (Decimal)      |
  |     | status (BookingStatus)      |
  |     | payment_status (PaymentSt)  |
  | FK  | cancelled_by (UUID?)        |
  |     | cancelled_reason (String?)  |
  +-----------------------------------+
        |                       |
        | (1 - N)               | (1 - 1)
        v                       v
+-------------------+   +-------------------+
|   transactions    |   |     reviews       |
+-------------------+   +-------------------+
| PK | trans_id     |   | (xem Module 7)    |
| FK | booking_id   |   +-------------------+
| FK | user_id      |
|    | amount       |   +-------------------+
|    | zalopay_order|   |      wallets      |
|    | zalopay_trans|   +-------------------+
|    | callback_json|   | PK | wallet_id    |
|    | status       |   | FK | user_id (1-1)|
+-------------------+   |    | balance      |
                        +-------------------+
                                  |
                                  v
                        +-------------------+
                        |      payouts      |
                        +-------------------+
                        | PK | payout_id    |
                        | FK | tutor_id     |
                        |    | amount       |
                        |    | bank_account |
                        |    | bank_name    |
                        |    | status       |
                        +-------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `BookingStatus` (Trạng thái đặt lịch học)
*   `pending`: Chờ xác nhận (Vừa bấm đặt lịch, đang chờ gia sư duyệt hoặc học sinh thanh toán).
*   `confirmed`: Đã xác nhận (Học sinh đã thanh toán thành công, lịch học chính thức mở).
*   `completed`: Đã hoàn thành (Khóa học đã kết thúc toàn bộ số buổi học).
*   `cancelled`: Đã hủy (Lịch đặt bị hủy bởi học sinh hoặc gia sư).
*   `refunded`: Đã hoàn tiền (Booking bị hủy hợp lệ và tiền đã hoàn lại cho học sinh).

### 3.2. `PaymentStatus` (Trạng thái thanh toán của Booking)
*   `unpaid`: Chưa thanh toán.
*   `paid`: Đã thanh toán đầy đủ.
*   `refunded`: Đã hoàn lại tiền.
*   `failed`: Thanh toán thất bại.

### 3.3. `TransactionStatus` (Trạng thái giao dịch ZaloPay)
*   `pending`: Đang xử lý (Đã tạo đơn trên ZaloPay, chờ callback).
*   `success`: Giao dịch thành công (ZaloPay xác nhận đã nhận tiền).
*   `failed`: Giao dịch thất bại / Quá thời hạn.
*   `refunded`: Đã hoàn tiền qua cổng ZaloPay.

### 3.4. `PayoutStatus` (Trạng thái rút tiền của Gia sư)
*   `pending`: Đang chờ Admin xem xét yêu cầu rút tiền.
*   `processing`: Admin đã duyệt, hệ thống đang thực hiện chuyển khoản.
*   `completed`: Chuyển tiền thành công vào tài khoản ngân hàng của gia sư.
*   `failed`: Rút tiền thất bại (do sai số tài khoản, lỗi ngân hàng).

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `bookings` (Đặt lịch học)
Bảng trung tâm kết nối Học sinh ↔ Khóa học ↔ Lịch học.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `booking_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất cho đơn đặt lịch. |
| `student_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `student_profiles` | Liên kết tới Học sinh đặt lịch. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Liên kết tới Khóa học được đăng ký. |
| `schedule_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `course_schedules` | Liên kết tới Khung giờ học cụ thể. |
| `status` | `BookingStatus` | `@default(pending)` | Trạng thái tiến độ đơn đặt lịch (`pending` → `confirmed` → `completed`). |
| `payment_status` | `PaymentStatus` | `@default(unpaid)` | Trạng thái thanh toán học phí (`unpaid` → `paid`). |
| `total_amount` | `Decimal` | `@db.Decimal(10, 2)` | Tổng số tiền học phí phải trả (VND). |
| `currency` | `String` | `@default("VND")` | Đơn vị tiền tệ. |
| `notes` | `String?` | Tùy chọn | Ghi chú từ học sinh khi đặt lịch (VD: "Yêu cầu tập trung phần Hình học"). |
| `cancelled_by` | `String?` | `@db.Uuid`, Khóa ngoại -> `users` | Ghi nhận ID người dùng đã bấm hủy booking. |
| `cancelled_reason` | `String?` | Tùy chọn | Lý do hủy booking (bắt buộc khi trạng thái = `cancelled`). |
| `cancelled_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm thực hiện hủy booking. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo booking. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật trạng thái gần nhất. |

---

### 4.2. Bảng `transactions` (Giao dịch thanh toán ZaloPay)
Lưu vết từng lần học sinh bấm thanh toán qua cổng ZaloPay.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `transaction_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất cho giao dịch thanh toán. |
| `booking_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `bookings` | Giao dịch thuộc về đơn booking nào (`onDelete: Cascade`). |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người thực hiện chuyển tiền. |
| `amount` | `Decimal` | `@db.Decimal(10, 2)` | Số tiền thực hiện giao dịch (VND). |
| `payment_method` | `String` | `@default("zalopay")` | Phương thức thanh toán (`zalopay`, `wallet`...). |
| `zalopay_order_id` | `String?` | Tùy chọn | Mã đơn hàng `app_trans_id` gửi sang ZaloPay để tạo giao dịch. |
| `zalopay_trans_id` | `String?` | Tùy chọn | Mã giao dịch do phía ZaloPay trả về sau khi người dùng quét mã thanh toán thành công. |
| `zalopay_callback_data` | `Json?` | Tùy chọn | Mảng JSON lưu trữ toàn bộ dữ liệu phản hồi (Webhook/Callback) từ ZaloPay phục vụ kiểm tra đối soát lỗi. |
| `status` | `TransactionStatus` | `@default(pending)` | Trạng thái của giao dịch này (`pending`, `success`, `failed`, `refunded`). |
| `paid_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm ZaloPay xác nhận giao dịch hoàn tất. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày khởi tạo giao dịch. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật trạng thái giao dịch. |

---

### 4.3. Bảng `wallets` (Ví tiền nội bộ)
Quản lý tài khoản tiền nội bộ của từng người dùng trong hệ thống.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `wallet_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính định danh ví tiền. |
| `user_id` | `String` (UUID) | `@unique`, Khóa ngoại -> `users` | Liên kết 1-1 với User (`onDelete: Cascade`). |
| `balance` | `Decimal` | `@db.Decimal(10, 2)`, `@default(0)` | Số dư khả dụng hiện tại (VND). |
| `currency` | `String` | `@default("VND")` | Đơn vị tiền tệ. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày khởi tạo ví. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày biến động số dư gần nhất. |

---

### 4.4. Bảng `payouts` (Rút tiền gia sư)
Lưu lịch sử yêu cầu rút tiền từ Ví nội bộ về tài khoản Ngân hàng cá nhân của Gia sư.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `payout_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính cho yêu cầu rút tiền. |
| `tutor_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `tutor_profiles` | Liên kết tới Gia sư yêu cầu rút tiền. |
| `amount` | `Decimal` | `@db.Decimal(10, 2)` | Số tiền yêu cầu rút về ngân hàng (VND). |
| `period_start` | `DateTime` | `@db.Date` | Ngày bắt đầu đợt tổng kết doanh thu. |
| `period_end` | `DateTime` | `@db.Date` | Ngày kết thúc đợt tổng kết doanh thu. |
| `bank_account` | `String?` | Tùy chọn | Số tài khoản ngân hàng nhận tiền. |
| `bank_name` | `String?` | Tùy chọn | Tên ngân hàng thụ hưởng (VD: Vietcombank, MBBank). |
| `status` | `PayoutStatus` | `@default(pending)` | Trạng thái xử lý đợt rút tiền (`pending`, `processing`, `completed`, `failed`). |
| `processed_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm Admin xác nhận chuyển khoản ngân hàng thành công. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày gửi yêu cầu rút tiền. |

---

## 5. Luồng hoạt động tổng thể Module 4 (Kịch bản dễ hiểu)

### 🎭 Kịch bản thực tế:
> **Học sinh (Bạn Nam)** đặt lịch học khóa *"Toán 12 Luyện thi ĐH"* với **Gia sư (Thầy Bình)** với tổng tiền **1.000.000 VNĐ**.

```
[ BƯỚC 1: ĐẶT LỊCH ] ──> [ BƯỚC 2: THANH TOÁN ] ──> [ BƯỚC 3: XÁC NHẬN (CALLBACK) ]
 Học sinh bấm đăng ký       Mở ZaloPay quét mã QR       ZaloPay báo tiền đã vào hệ thống
 Booking = pending           Tạo Transaction=pending     Booking = confirmed
 PaymentStatus = unpaid                                   Ví Gia sư += 1.000.000 VNĐ
                                                                     │
[ BƯỚC 5: RÚT TIỀN ] <── [ BƯỚC 4: HỌC XONG ] <──────────────────────┘
 Gia sư rút tiền về NH     Hoàn thành tất cả buổi dạy
 Payout = completed        Booking = completed
 Ví Gia sư -= 1.000.000 VNĐ
```

### 📝 Chi tiết từng bước chuyển đổi trạng thái:

1. **Bước 1: Học sinh bấm chọn lịch học**
   - Hệ thống tạo 1 bản ghi `Booking` mới với: `status = pending`, `payment_status = unpaid`, `total_amount = 1.000.000`.
2. **Bước 2: Học sinh chọn thanh toán ZaloPay**
   - Hệ thống gọi ZaloPay API tạo đơn hàng và tạo 1 bản ghi `Transaction` với: `payment_method = "zalopay"`, `status = pending`, lưu `zalopay_order_id`.
3. **Bước 3: ZaloPay gửi Webhook/Callback xác nhận tiền**
   - **Nêu thành công:** `Transaction.status` → `success`, `Booking.payment_status` → `paid`, `Booking.status` → `confirmed`. Tiền được cộng tự động vào `Wallet` của Gia sư.
   - **Nếu thất bại:** `Transaction.status` → `failed`. Học sinh có thể bấm thanh toán lại (tạo Transaction mới).
4. **Bước 4: Tiến hành học & Hoàn thành khóa học**
   - Gia sư tiến hành giảng dạy theo các buổi ở Module 5. Khi dạy xong tất cả số buổi, `Booking.status` → `completed`.
5. **Bước 5: Gia sư yêu cầu rút tiền về ngân hàng**
   - Gia sư tạo `Payout` request (status = `pending`). Admin duyệt và thực hiện chuyển khoản ngân hàng → `Payout.status` = `completed`, trừ số dư tương ứng ở `Wallet`.

---

## 6. Giải thích Lý do Thiết kế & Điểm nổi bật kỹ thuật Module 4 với Giáo viên

1. **Tại sao tách riêng trạng thái `Booking.payment_status` và `Transaction.status`?**
   * **Phân định rõ ràng trách nhiệm:** `Booking.payment_status` đại diện cho kết quả tài chính tổng thể của đơn hàng (Đã trả tiền chưa). Trong khi đó `Transaction.status` theo dõi từng *nỗ lực thanh toán* qua ZaloPay. Nếu học sinh thanh toán lần 1 bị hủy do hết hạn (Transaction 1 `failed`), họ mở lại ứng dụng thanh toán lần 2 thành công (Transaction 2 `success`), thì `Booking.payment_status` chuyển thành `paid`.

2. **Cơ chế thanh toán trung gian (Escrow / Wallet) hoạt động ra sao?**
   * Học sinh không chuyển tiền trực tiếp cho Gia sư mà chuyển tiền qua **ZaloPay** về tài khoản Công ty/Hệ thống.
   * Sau khi thanh toán thành công, hệ thống trích hoa hồng và ghi nhận số dư vào **`Wallet`** của Gia sư.
   * Gia sư thực hiện tạo yêu cầu **`Payout`** để rút tiền về ngân hàng thực tế. Cơ chế này giúp đảm bảo an toàn tài chính và xử lý hoàn tiền dễ dàng khi có tranh chấp.

3. **Lưu dữ liệu `zalopay_callback_data` (Json) có tác dụng gì?**
   * **Đối soát & Audit:** Khi xảy ra trường hợp học sinh báo bị trừ tiền nhưng hệ thống chưa kích hoạt khóa học, Admin chỉ cần kiểm tra dữ liệu JSON này để xem ZaloPay đã trả về chữ ký (signature) và mã lỗi gì mà không cần tra cứu log phức tạp.

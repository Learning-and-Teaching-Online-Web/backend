# 📌 MODULE 4: BOOKING & PAYMENT (Đặt lịch & Thanh toán)

## 1. Giới thiệu tổng quan
Module **Booking & Payment** quản lý quy trình học sinh đăng ký khóa học, thanh toán học phí qua cổng thanh toán ZaloPay hoặc Ví nội bộ, trích thu hoa hồng sàn (`platform_fee`), quản lý Ví nội bộ người dùng (`balance` & `frozen_balance`) và tính năng Rút tiền (`Payout`) của Gia sư về ngân hàng cá nhân.

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
  |     | total_amount (Decimal)      |
  |     | platform_fee (Decimal)      | (Hoa hồng hệ thống thu)
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
|    | payment_methd|   |      wallets      |
|    | (PaymentMethd|   +-------------------+
|    | zalopay_order|   | PK | wallet_id    |
|    | zalopay_trans|   | FK | user_id (1-1)|
|    | callback_json|   |    | balance      |
|    | status       |   |    | frozen_balnce| (Số dư bị hold bởi Payout)
+-------------------+   +-------------------+
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
                        |    | account_holdr| (Tên chủ tài khoản)
                        |    | status       |
                        |    | admin_note   |
                        | FK | processed_by | -> users (Admin)
                        +-------------------+
```

---

## 3. Chi tiết các Kiểu dữ liệu liệt kê (ENUMs)

### 3.1. `BookingStatus` (Trạng thái đặt lịch học)
*   `pending`: Chờ xác nhận (Vừa bấm đặt lịch, đang chờ học sinh thanh toán).
*   `confirmed`: Đã xác nhận (Học sinh đã thanh toán thành công, khóa học bắt đầu).
*   `completed`: Đã hoàn thành (Khóa học đã hoàn tất toàn bộ số buổi học).
*   `cancelled`: Đã hủy (Lịch đặt bị hủy bởi học sinh hoặc gia sư).
*   `refunded`: Đã hoàn tiền (Booking bị hủy hợp lệ và tiền đã hoàn lại cho học sinh).

### 3.2. `PaymentStatus` (Trạng thái thanh toán của Booking)
*   `unpaid`: Chưa thanh toán.
*   `paid`: Đã thanh toán đầy đủ.
*   `refunded`: Đã hoàn lại tiền.
*   `failed`: Thanh toán thất bại.

### 3.3. `PaymentMethod` (Phương thức thanh toán)
*   `zalopay`: Thanh toán qua cổng thanh toán ZaloPay.
*   `wallet`: Thanh toán bằng Ví điện tử nội bộ hệ thống.

### 3.4. `TransactionStatus` (Trạng thái giao dịch thanh toán)
*   `pending`: Đang xử lý (Chờ kết quả callback).
*   `success`: Giao dịch thành công.
*   `failed`: Giao dịch thất bại / Quá thời hạn.
*   `refunded`: Đã hoàn tiền.

### 3.5. `PayoutStatus` (Trạng thái rút tiền của Gia sư)
*   `pending`: Đang chờ Admin xem xét yêu cầu rút tiền.
*   `processing`: Admin đã duyệt, hệ thống đang thực hiện chuyển khoản.
*   `completed`: Chuyển tiền thành công vào tài khoản ngân hàng của gia sư.
*   `failed`: Rút tiền thất bại (do sai số tài khoản, lỗi ngân hàng).

---

## 4. Chi tiết các Bảng dữ liệu (Models)

### 4.1. Bảng `bookings` (Đặt lịch học)
Bảng trung tâm kết nối Học sinh ↔ Khóa học.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `booking_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính duy nhất cho đơn đặt lịch. |
| `student_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `student_profiles` | Liên kết tới Học sinh đặt lịch. |
| `course_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `courses` | Liên kết tới Khóa học được đăng ký. |
| `status` | `BookingStatus` | `@default(pending)` | Trạng thái tiến độ đơn đặt lịch (`pending` → `confirmed` → `completed`). |
| `payment_status` | `PaymentStatus` | `@default(unpaid)` | Trạng thái thanh toán học phí (`unpaid` → `paid`). |
| `total_amount` | `Decimal` | `@db.Decimal(10, 2)` | Tổng số tiền học phí phải trả (VND). |
| `platform_fee` | `Decimal` | `@db.Decimal(10, 2)`, `@default(0)` | Số tiền hoa hồng hệ thống trích thu khi chốt đơn. |
| `currency` | `String` | `@default("VND")` | Đơn vị tiền tệ. |
| `notes` | `String?` | Tùy chọn | Ghi chú từ học sinh khi đặt lịch. |
| `cancelled_by` | `String?` | `@db.Uuid`, Khóa ngoại -> `users` | Ghi nhận ID người dùng đã bấm hủy booking. |
| `cancelled_reason` | `String?` | Tùy chọn | Lý do hủy booking. |
| `cancelled_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm thực hiện hủy booking. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày tạo booking. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật trạng thái gần nhất. |

---

### 4.2. Bảng `transactions` (Giao dịch thanh toán)
Lưu vết từng lần học sinh thực hiện giao dịch qua ZaloPay hoặc Ví nội bộ.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `transaction_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính giao dịch. |
| `booking_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `bookings` | Giao dịch thuộc về đơn booking nào (`onDelete: Cascade`). |
| `user_id` | `String` (UUID) | `@db.Uuid`, Khóa ngoại -> `users` | Người thực hiện chuyển tiền. |
| `amount` | `Decimal` | `@db.Decimal(10, 2)` | Số tiền thực hiện giao dịch (VND). |
| `payment_method` | `PaymentMethod` | `@default(zalopay)` | Phương thức thanh toán (`zalopay` hoặc `wallet`). |
| `zalopay_order_id` | `String?` | Tùy chọn | Mã đơn hàng `app_trans_id` gửi sang ZaloPay. |
| `zalopay_trans_id` | `String?` | Tùy chọn | Mã giao dịch do ZaloPay trả về. |
| `zalopay_callback_data` | `Json?` | Tùy chọn | Mảng JSON lưu dữ liệu phản hồi Callback từ ZaloPay. |
| `status` | `TransactionStatus` | `@default(pending)` | Trạng thái của giao dịch này (`pending`, `success`, `failed`, `refunded`). |
| `paid_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm xác nhận giao dịch hoàn tất. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày khởi tạo giao dịch. |
| `updated_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày cập nhật trạng thái. |

---

### 4.3. Bảng `wallets` (Ví tiền nội bộ)
Quản lý tài khoản tiền nội bộ của từng người dùng trong hệ thống.

| Thuộc tính (Column) | Kiểu dữ liệu (Type) | Ràng buộc (Constraints) | Ý nghĩa & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `wallet_id` | `String` (UUID) | `@id`, `gen_random_uuid()` | Khóa chính định danh ví tiền. |
| `user_id` | `String` (UUID) | `@unique`, Khóa ngoại -> `users` | Liên kết 1-1 với User (`onDelete: Cascade`). |
| `balance` | `Decimal` | `@db.Decimal(10, 2)`, `@default(0)` | Số dư khả dụng hiện tại (VND). |
| `frozen_balance` | `Decimal` | `@db.Decimal(10, 2)`, `@default(0)` | Số dư đang bị tạm giữ bởi các yêu cầu Rút tiền (`Payout`) chưa hoàn tất. |
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
| `account_holder_name` | `String?` | Tùy chọn | Tên chủ tài khoản ngân hàng thụ hưởng. |
| `status` | `PayoutStatus` | `@default(pending)` | Trạng thái xử lý đợt rút tiền (`pending`, `processing`, `completed`, `failed`). |
| `admin_note` | `String?` | Tùy chọn | Ghi chú của Admin khi xử lý (đặc biệt khi từ chối / thất bại). |
| `processed_by` | `String?` | `@db.Uuid`, Khóa ngoại -> `users` | Admin thực hiện duyệt yêu cầu rút tiền. |
| `processed_at` | `DateTime?` | `@db.Timestamptz` | Thời điểm Admin xác nhận chuyển khoản ngân hàng thành công. |
| `created_at` | `DateTime` | `@default(now())`, `@db.Timestamptz` | Ngày gửi yêu cầu rút tiền. |

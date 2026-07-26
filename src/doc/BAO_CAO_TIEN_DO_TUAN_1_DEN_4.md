# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN (TUẦN 1 - TUẦN 4)
## HỆ THỐNG KẾT NỐI GIA SƯ & HỌC VIÊN TRỰC TUYẾN NOVALEARN

---

### THÔNG TIN TỔNG QUAN DỰ ÁN

| Hạng mục | Thông tin chi tiết |
| :--- | :--- |
| **Tên dự án** | Hệ Thống Kết NỐi Gia Sư & Học Viên Trực Tuyến Tích Hợp AI (NovaLearn E-Learning Platform) |
| **Đơn vị thực hiện** | Nhóm C26 |
| **Giai đoạn báo cáo** | Từ Tuần 1 đến Tuần 4 (Hoàn thành 100% mục tiêu Phase 1) |
| **Đối tượng báo cáo** | Hội đồng Kiểm duyệt / Quản lý Dự án / Giảng viên Hướng dẫn |
| **Kiến trúc hệ thống** | Backend Node.js/Express (TypeScript) + Frontend React/Vite (TypeScript) + PostgreSQL (Prisma ORM) |

---

## 1. TỔNG QUAN DỰ ÁN VÀ MỤC TIÊU NGHIỆP VỤ

### 1.1 Bối cảnh và Tính cấp thiết
Trong bối cảnh chuyển đổi số giáo dục đang diễn ra mạnh mẽ, nhu cầu kết nối giữa học viên và gia sư chất lượng cao ngày càng gia tăng. Tuy nhiên, các phương thức truyền thống gặp nhiều rào cản về minh bạch thông tin bằng cấp, quản lý lịch học bị trùng lặp, thiếu công cụ theo dõi tiến độ và quy trình thanh toán chưa đảm bảo an toàn cho cả hai bên.

Dự án **NovaLearn** được xây dựng nhằm giải quyết triệt me các rào cản trên bằng cách cung cấp một nền tảng toàn diện tích hợp công nghệ hiện đại. Hệ thống hỗ trợ đa dạng đối tượng bao gồm **Học viên (Student)**, **Gia sư (Tutor)** và **Quản trị viên (Admin)** với các quy trình kiểm duyệt nghiêm ngặt, thanh toán minh bạch và lớp học tương tác trực tuyến.

### 1.2 Mục tiêu chiến lược của hệ thống
- **Chuẩn hóa thông tin gia sư**: Xây dựng kênh kết nối trực tiếp, minh bạch thông tin giữa học viên có nhu cầu học tập và gia sư sở hữu trình độ chuyên môn đã qua kiểm duyệt.
- **Quản lý lịch học thông minh**: Tự động hóa luồng đăng ký khóa học, đặt ca học và ngăn chặn hoàn toàn hiện tượng trùng lịch dạy của giảng viên thông qua thuật toán kiểm tra thời gian thực.
- **Bảo vệ nguồn lực & tài chính**: Thiết lập kênh quản trị Admin tập trung với các công cụ kiểm duyệt chứng chỉ bằng cấp, kiểm duyệt khóa học và phê duyệt yêu cầu rút tiền bảo vệ quyền lợi tài chính cho các bên.
- **Sẵn sàng tích hợp AI**: Sẵn sàng hạ tầng dữ liệu Vector DB và các bảng lưu trữ để tích hợp các tính năng trợ lý học tập AI RAG, tự động sinh bài kiểm tra và lưu trữ trạng thái bảng trắng tương tác.

### 1.3 Phạm vi công việc từ Tuần 1 đến Tuần 4
Trong khoảng thời gian từ Tuần 1 đến Tuần 4, nhóm đã tập trung hoàn thiện toàn bộ hạ tầng cốt lõi, cơ sở dữ liệu quan hệ, các dịch vụ xử lý nghiệp vụ Backend, giao diện người dùng Frontend và phân hệ Quản trị Admin Panel. Toàn bộ các yêu cầu kỹ thuật và nghiệp vụ đặt ra cho giai đoạn 4 tuần đầu đã được hoàn thành đúng tiến độ với chất lượng cao.

---

## 2. KIẾN TRÚC TỔNG THỂ VÀ THIẾT KẾ HỆ THỐNG

### 2.1 Mô hình Kiến trúc công nghệ (Tech Stack)
Hệ thống được thiết kế theo mô hình Client-Server hiện đại, tách biệt hoàn toàn giữa phần Backend cung cấp RESTful API và phần Frontend đảm nhận trải nghiệm giao diện người dùng:

- **Backend Architecture**: Xây dựng trên nền tảng Node.js kết hợp Express Framework và TypeScript. Sử dụng mô hình thiết kế 3 lớp (Layered Architecture: *Controller -> Service -> Repository*) giúp mã nguồn đạt tính đóng gói cao, dễ dàng bảo trì và mở rộng.
- **Database Layer**: Sử dụng cơ sở dữ liệu quan hệ PostgreSQL quản lý thông qua Prisma ORM. Cơ sở dữ liệu được tích hợp các tiện ích mở rộng nâng cao như `pg_trgm` (tìm kiếm mờ), `vector` (lưu trữ embedding cho AI), `unaccent` (tìm kiếm tiếng Việt không dấu) và `pgcrypto`.
- **Frontend Architecture**: Xây dựng ứng dụng đơn trang (SPA) bằng React.js và Vite, viết hoàn toàn bằng TypeScript. Giao diện được thiết kế theo phong cách CSS Vanilla tùy biến cao, phản hồi linh hoạt (Responsive) trên đa thiết bị.
- **Cloud Services**: Sử dụng Supabase Cloud cho các dịch vụ xác thực và lưu trữ đám mây, tích hợp cơ chế bảo mật Token JWT cho các truy vấn API.

```
+-------------------------------------------------------------------+
|                        FRONTEND REACT/VITE                        |
|   [Student Portal]     |    [Teacher Dashboard]   |  [Admin Hub]  |
+-------------------------------------------------------------------+
                                  | REST API (Axios + JWT)
                                  v
+-------------------------------------------------------------------+
|                      BACKEND NODE.JS / EXPRESS                    |
|   Controllers   ---->    Services (Business)  ----> Repositories  |
+-------------------------------------------------------------------+
                                  | Prisma ORM
                                  v
+-------------------------------------------------------------------+
|                    POSTGRESQL DATABASE (SUPABASE)                 |
|   22 Models | 12 Enums | pg_trgm | vector | unaccent | pgcrypto  |
+-------------------------------------------------------------------+
```

### 2.2 Thiết kế Cơ sở Dữ liệu Chi tiết (Database Schema Analysis)
Hệ thống cơ sở dữ liệu bao gồm **22 bảng (Models)** chính và **12 tập hợp kiểu dữ liệu liệt kê (Enums)**, đáp ứng trọn vẹn toàn bộ nghiệp vụ từ quản lý người dùng đến tài chính và AI:

1. **Bảng Người dùng (`users`)**: Lưu trữ thông tin định danh, tài khoản, vai trò (`student`, `tutor`, `admin`), trạng thái hoạt động (`active`, `suspended`, `deleted`) và thông tin đăng nhập.
2. **Bảng Hồ sơ Gia sư (`tutor_profiles`)**: Lưu trữ thông tin chuyên môn gia sư, tiểu sử, số năm kinh nghiệm, học phí theo giờ, khu vực địa lý, trạng thái xác thực (`pending`, `approved`, `rejected`) và điểm đánh giá trung bình.
3. **Bảng Chứng chỉ Gia sư (`tutor_certificates`)**: Quản lý bằng cấp, chứng chỉ sư phạm, chứng chỉ ngoại ngữ tải lên bởi gia sư, hỗ trợ trạng thái kiểm duyệt và ghi chú của Admin.
4. **Bảng Hồ sơ Học viên (`student_profiles`)**: Lưu trữ trình độ học vấn, mục tiêu học tập, danh mục môn học yêu thích và ngân sách tối đa/tối thiểu.
5. **Bảng Khóa học (`courses`) & Ca học (`course_schedules`)**: Quản lý danh mục khóa học, mức giá, thời lượng ca học, số lượng học viên tối đa, trạng thái khóa học (`draft`, `published`, `hidden`, `archived`) và thời gian ca học cố định/định kỳ.
6. **Bảng Đặt lớp (`bookings`) & Giao dịch (`transactions`)**: Quản lý luồng đặt lớp của học viên, trạng thái đơn hàng (`pending`, `confirmed`, `completed`, `cancelled`, `refunded`) và trạng thái thanh toán.
7. **Bảng Ví (`wallets`) & Rút tiền (`payouts`)**: Quản lý số dư tài khoản của người dùng, thực hiện nạp/rút và ghi nhận các khoản chiết khấu phí nền tảng 10%.
8. **Bảng Lớp học ảo (`class_sessions`, `attendances`, `chat_rooms`, `messages`, `whiteboard_states`)**: Quản lý các ca học thực tế, điểm danh học viên (manual/auto), ghi âm buổi học, phòng chat trực tuyến và bảng trắng tương tác.
9. **Phân hệ AI & Đánh giá (`documents`, `document_chunks`, `ai_conversations`, `quizzes`, `reviews`, `favorites`, `articles`)**: Lưu trữ lịch sử hội thoại AI, tài liệu tải lên, phân đoạn văn bản phục vụ truy vấn vector RAG, ngân hàng câu hỏi kiểm tra, bài viết blog và đánh giá nhận xét.

---

## 3. CHI TIẾT TIẾN ĐỘ THỰC HIỆN TỪ TUẦN 1 ĐẾN TUẦN 4

### 3.1 Tuần 1: Khởi Tạo Dự Án & Thiết Kế Kiến Trúc Cốt Lõi
Trong tuần đầu tiên, nhóm đã hoàn thành công tác phân tích yêu cầu nghiệp vụ, khởi tạo cấu trúc thư mục chuẩn cho cả Backend và Frontend, đồng thời thiết kế chi tiết toàn bộ Schema cơ sở dữ liệu:

- **Nghiên cứu & Phân tích**: Khảo sát và chốt danh sách nghiệp vụ dành cho 3 nhóm người dùng (Học viên, Gia sư, Quản trị viên).
- **Hạ tầng Backend**: Khởi tạo dự án Backend với Node.js, Express, TypeScript và cấu hình Prisma ORM. Kết nối thành công tới PostgreSQL database hosting.
- **Cơ sở dữ liệu**: Thiết kế toàn bộ 22 mô hình dữ liệu (Models) và 12 Enums trong tệp schema, tạo các chỉ mục (Indexes) tối ưu tốc độ truy vấn theo khu vực, mức giá, trạng thái và thẻ tìm kiếm.
- **Hạ tầng Frontend**: Khởi tạo dự án Frontend React với Vite và TypeScript. Cấu hình hệ thống Routing cơ bản bằng React Router DOM và tổ chức thư mục linh kiện UI.

### 3.2 Tuần 2: Phát Triển Module Cốt Lõi Phía Backend & Cổng Học Viên (Student Portal)
Tuần thứ 2 tập trung vào việc hoàn thiện các tính năng cho học viên cùng các dịch vụ nền tảng xử lý dữ liệu khóa học và đặt lớp:

- **Module Xác thực (`auth`)**: Xây dựng dịch vụ đăng ký, đăng nhập, mã hóa mật khẩu, tạo token JWT và phân quyền người dùng thông qua Auth Middleware.
- **Module Khóa học & Môn học (`course`, `subject`)**: Triển khai API xem danh sách khóa học, lọc khóa học theo môn học, khoảng giá, hình thức dạy (online/offline) và tìm kiếm từ khóa.
- **Module Đặt lịch học (`booking`)**: Xây dựng quy trình xử lý đơn đặt lớp, kiểm tra ca học khả dụng và khởi tạo đơn hàng với trạng thái thanh toán tích hợp preview cổng ZaloPay.
- **Module Bài viết & Tương tác (`article`, `favorite`, `review`)**: Triển khai API tạo bài viết, xem danh sách bài viết blog, quản lý danh sách gia sư yêu thích và gửi đánh giá nhận xét.
- **Giao diện Cổng Học viên**: Hoàn thiện Trang chủ (`HomePage`), Trang danh sách khóa học kèm bộ lọc nâng cao (`CourseList`, `SidebarFilters`), Trang chi tiết khóa học (`CourseDetail`), Trang tin tức Blog (`BlogList`, `BlogDetail`), Trang FAQ và Trang Liên hệ.

### 3.3 Tuần 3: Phát Triển Kênh Giảng Viên & Quản Lý Lớp Học Virtual Classroom
Trong tuần 3, nhóm đã phát triển toàn bộ các phân hệ dành cho Gia sư, quản lý ca học và tài chính gia sư:

- **Module Hồ sơ Gia sư (`tutor`)**: Xây dựng API cho phép gia sư cập nhật thông tin cá nhân, tiểu sử, số năm kinh nghiệm, học phí theo giờ và tải chứng chỉ/bằng cấp lên hệ thống.
- **Thuật toán Chống trùng lịch dạy (Schedule Overlap Guard)**: Phát triển thuật toán tự động kiểm tra thời gian thực. Hệ thống ngăn chặn gia sư tạo các ca học có khoảng thời gian bị trùng lặp hoặc đè lên nhau.
- **Quản lý Lớp học Virtual Classroom**: Xây dựng cơ chế tự động tạo buổi học thực tế khi đơn hàng hoàn tất, quản lý điểm danh học viên (có mặt, vắng mặt, muộn) và lưu trữ trạng thái bảng trắng.
- **Module Tài chính & Ví thu nhập (`wallet`, `payout`)**: Thiết lập cơ chế chiết khấu 10% phí hoa hồng nền tảng, tự động cộng 90% học phí vào Ví gia sư và xử lý yêu cầu rút tiền về ngân hàng.
- **Giao diện Kênh Giảng viên**: Xây dựng giao diện `TeacherDashboard` tích hợp các tab quản lý khóa học, thiết lập thời gian dạy, quản lý số dư Ví và danh sách bài giảng. Hoàn thiện trang danh sách gia sư công khai (`InstructorList`).

### 3.4 Tuần 4: Phát Triển Admin Hub, Kiểm Duyệt Toàn Diện & Tối Ưu Hệ Thống
Tuần thứ 4 đánh dấu việc hoàn thiện phân hệ Quản trị Admin Panel cao cấp, cho phép kiểm duyệt toàn bộ hoạt động trên hệ thống và đóng gói tài liệu nghiệp vụ:

- **Dashboard Thống kê Admin (`admin`)**: Phát triển các API thống kê tổng quan chỉ số hệ thống (tổng số học viên, gia sư, khóa học, doanh thu và đơn đặt lớp).
- **Quản lý Người dùng**: Xây dựng tính năng xem danh sách người dùng, kích hoạt hoặc khóa tài khoản vi phạm và thay đổi vai trò người dùng.
- **Kiểm duyệt Gia sư & Bằng cấp**: Triển khai quy trình xét duyệt hồ sơ gia sư và kiểm duyệt chứng chỉ/bằng cấp. Admin có thể xem trực tiếp tệp chứng chỉ, phê duyệt/từ chối và nhập ghi chú (`Admin Note`).
- **Kiểm duyệt Khóa học & Rút tiền**: Xây dựng tính năng phê duyệt khóa học và xử lý các yêu cầu rút tiền của gia sư. Trong trường hợp từ chối yêu cầu rút tiền, hệ thống tự động hoàn trả 100% số tiền về Ví gia sư.
- **Giao diện Admin Hub**: Xây dựng `AdminDashboard` chuyên biệt với thiết kế badge màu vàng nổi bật đếm số hồ sơ **"⏳ Chờ duyệt: X"** giúp Admin lọc nhanh trong 1 chạm. Đóng gói tệp quy tắc nghiệp vụ `tutor_business_rules.md`.

> **CƠ CHẾ BẢO VỆ HỌC VIÊN KHI GIA SƯ BỊ KHÓA:**  
> Trong trường hợp gia sư bị Admin khóa tài khoản hoặc hủy xác thực, hệ thống tự động hủy các ca học chưa diễn ra và hoàn tiền 100% học phí các buổi chưa học vào Ví của học viên nhằm bảo vệ tuyệt đối quyền lợi người học.

---

## 4. BẢNG TỔNG HỢP MỤC THỰC HIỆN VÀ ĐÁNH GIÁ TỈ LỆ HOÀN THÀNH

| STT | Hạng mục công việc | Kết quả chi tiết đạt được | Tỉ lệ hoàn thành |
| :---: | :--- | :--- | :---: |
| **1** | **Thiết kế Cơ sở dữ liệu** | Hoàn thành 22 Models, 12 Enums, các indexes tối ưu tốc độ truy vấn theo khu vực, giá và thẻ. | **100%** |
| **2** | **Module Xác thực & Phân quyền** | Hoàn thành Auth Service, mã hóa mật khẩu, JWT Token, RBAC Middleware phân quyền 3 vai trò. | **100%** |
| **3** | **Module Đặt lớp & Ca học** | Hoàn thành Booking Service, quản lý ca học, thuật toán chống trùng lịch dạy thời gian thực. | **100%** |
| **4** | **Module Gia sư & Chứng chỉ** | Hoàn thành Tutor Profile, cập nhật chuyên môn, tải lên và duyệt chứng chỉ/bằng cấp. | **100%** |
| **5** | **Module Quản trị Admin Hub** | Hoàn thành Dashboard Thống kê chỉ số KPI, duyệt Tutor, duyệt Khóa học, xử lý Payout. | **100%** |
| **6** | **Giao diện Cổng Học viên** | Hoàn thành HomePage, CourseList, CourseDetail, BlogList, BlogDetail, FAQ, Contact. | **100%** |
| **7** | **Giao diện Kênh Giảng viên** | Hoàn thành TeacherDashboard, quản lý khóa học, ca học, số dư Ví, yêu cầu rút tiền. | **100%** |
| **8** | **Giao diện Admin Hub** | Hoàn thành AdminDashboard với Badge đếm Chờ duyệt, bộ lọc 1 chạm, tab quản lý linh hoạt. | **100%** |

---

## 5. QUY TRÌNH NGHIỆP VỤ NỔI BẬT VÀ QUY TẮC BẢO VỆ NGUỒN LỰC

### 5.1 Vòng đời trạng thái Gia sư (Tutor Lifecycle)
Hồ sơ gia sư trải qua 3 giai đoạn quản lý chặt chẽ:
- **Chờ duyệt (`pending`)**: Được phép đăng nhập Kênh gia sư, tạo dự thảo khóa học nhưng ẩn khỏi danh sách công khai và không thể xuất bản khóa học hay nhận tiền đặt lịch.
- **Đã duyệt (`approved`)**: Được hiển thị công khai trên danh sách gia sư, xuất bản khóa học, nhận đặt lớp và thực hiện rút tiền về ngân hàng.
- **Từ chối / Đình chỉ (`rejected` / `suspended`)**: Tự động ẩn profile và toàn bộ khóa học khỏi trang public, đóng băng tính năng rút tiền để chờ giải quyết khiếu nại.

### 5.2 Quy trình Rút tiền và Phí Nền tảng
- **Chiết khấu hoa hồng**: Hệ thống áp dụng mức phí 10% cố định trên mỗi đơn đặt lớp thành công. 90% doanh thu còn lại tự động cộng vào Ví gia sư.
- **Xử lý rút tiền (`Payout`)**: Khi gia sư gửi yêu cầu Rút tiền, số tiền sẽ được trừ tạm thời khỏi Ví. Admin duyệt chuyển khoản -> Chuyển trạng thái hoàn thành. Nếu Admin từ chối -> Hệ thống tự động hoàn tiền 100% về Ví gia sư.

---

## 6. KẾ HOẠCH PHÁT TRIỂN TRONG CÁC TUẦN TIẾP THEO

1. **Mở rộng Phân hệ AI RAG**: Tích hợp hoàn thiện hệ thống hỏi đáp AI RAG sử dụng vector embedding, cho phép học viên tra cứu tài liệu khóa học và tự động tạo đề thi trắc nghiệm.
2. **Tích hợp Thanh toán Trực tuyến**: Kết nối chính thức cổng thanh toán ZaloPay/VNPAY và xử lý webhook tự động cập nhật trạng thái giao dịch.
3. **Triển khai & Kiểm thử Tải**: Tiến hành kiểm thử tải hệ thống (Load testing), tối ưu hóa thời gian phản hồi API dưới 100ms và triển khai dự án lên hạ tầng Cloud Production.

---

## 7. KẾT LUẬN VÀ CAM KẾT

Trải qua 4 tuần triển khai quyết liệt, nhóm C26 đã hoàn thành **100% khối lượng công việc** đặt ra cho Phase 1 của dự án NovaLearn. Toàn bộ hạ tầng Backend, Frontend, Cơ sở dữ liệu và hệ thống Quản trị Admin Panel đã đi vào vận hành ổn định, đáp ứng chính xác các yêu cầu nghiệp vụ khắt khe.

Nhóm cam kết tiếp tục duy trì tiến độ công việc, sẵn sàng cho các giai đoạn nâng cấp tiếp theo nhằm mang lại một nền tảng giáo dục trực tuyến chất lượng cao, an toàn và thông minh.

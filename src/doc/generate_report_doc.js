const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber
} = require('docx');

console.log('Generating DOCX report...');

// Helper for formatted text
function createTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 36, // 18pt
        font: 'Times New Roman',
        color: '1A365D'
      })
    ]
  });
}

function createSubTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 360 },
    children: [
      new TextRun({
        text: text,
        italic: true,
        size: 26, // 13pt
        font: 'Times New Roman',
        color: '4A5568'
      })
    ]
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 28, // 14pt
        font: 'Times New Roman',
        color: '1A365D'
      })
    ]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24, // 12pt
        font: 'Times New Roman',
        color: '2B6CB0'
      })
    ]
  });
}

function createHeading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 90 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        italic: true,
        size: 24, // 12pt
        font: 'Times New Roman',
        color: '2D3748'
      })
    ]
  });
}

function createParagraph(text, options = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFY,
    spacing: { before: 60, after: 60, line: 276 }, // 1.15 line spacing
    children: [
      new TextRun({
        text: text,
        font: 'Times New Roman',
        size: 24, // 12pt
        bold: options.bold || false,
        italic: options.italic || false,
        color: options.color || '2D3748'
      })
    ]
  });
}

function createBullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({
      text: boldPrefix + ' ',
      bold: true,
      font: 'Times New Roman',
      size: 24,
      color: '1A365D'
    }));
  }
  children.push(new TextRun({
    text: text,
    font: 'Times New Roman',
    size: 24,
    color: '2D3748'
  }));

  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFY,
    spacing: { before: 40, after: 40, line: 276 },
    children: children
  });
}

function createCalloutBox(text, title = 'LƯU Ý NGHIỆP VỤ QUAN TRỌNG') {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120, left: 200, right: 200 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'EBF8FF', type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '3182CE' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '3182CE' },
              left: { style: BorderStyle.SINGLE, size: 24, color: '3182CE' }, // thick left border
              right: { style: BorderStyle.SINGLE, size: 4, color: '3182CE' }
            },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: title + ': ',
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                    color: '2B6CB0'
                  }),
                  new TextRun({
                    text: text,
                    font: 'Times New Roman',
                    size: 24,
                    color: '2D3748'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// Table cell helper
function cell(text, bold = false, fill = null, widthPct = null) {
  const options = {
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: text,
            bold: bold,
            font: 'Times New Roman',
            size: 22 // 11pt inside tables
          })
        ]
      })
    ],
    margins: { top: 100, bottom: 100, left: 120, right: 120 }
  };

  if (fill) {
    options.shading = { fill: fill, type: ShadingType.CLEAR };
  }
  if (widthPct) {
    options.width = { size: widthPct, type: WidthType.PERCENTAGE };
  }

  return new TableCell(options);
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch = 1440 dxa
            bottom: 1440,
            left: 1440,
            right: 1440
          }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'Báo Cáo Tiến Độ Dự Án NovaLearn (Tuần 1 - Tuần 4) | Nhóm C26',
                  font: 'Times New Roman',
                  size: 18,
                  italic: true,
                  color: '718096'
                })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'Trang ',
                  font: 'Times New Roman',
                  size: 18,
                  color: '718096'
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: 'Times New Roman',
                  size: 18,
                  color: '718096'
                }),
                new TextRun({
                  text: ' / ',
                  font: 'Times New Roman',
                  size: 18,
                  color: '718096'
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  font: 'Times New Roman',
                  size: 18,
                  color: '718096'
                })
              ]
            })
          ]
        })
      },
      children: [
        // Title & Header block
        createTitle('BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN'),
        createSubTitle('HỆ THỐNG KẾT NỐI GIA SƯ & HỌC VIÊN TRỰC TUYẾN NOVALEARN\n(GIAI ĐOẠN: TỪ TUẦN 1 ĐẾN TUẦN 4)'),

        // Info table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell('Dự án / Hệ thống:', true, 'F7FAFC', 30),
                cell('Nền tảng Kết nối Gia sư & Học viên Trực tuyến (NovaLearn)', false, 'F7FAFC', 70)
              ]
            }),
            new TableRow({
              children: [
                cell('Đơn vị thực hiện:', true, null, 30),
                cell('Nhóm C26', false, null, 70)
              ]
            }),
            new TableRow({
              children: [
                cell('Giai đoạn báo cáo:', true, 'F7FAFC', 30),
                cell('Từ Tuần 1 đến Tuần 4 (Hoàn thành 100% mục tiêu Phase 1)', false, 'F7FAFC', 70)
              ]
            }),
            new TableRow({
              children: [
                cell('Kiến trúc hệ thống:', true, null, 30),
                cell('Backend Express/TypeScript + Frontend React/Vite + PostgreSQL (Prisma ORM)', false, null, 70)
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

        // 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU NGHIỆP VỤ
        createHeading1('1. TỔNG QUAN DỰ ÁN VÀ MỤC TIÊU NGHIỆP VỤ'),
        createHeading2('1.1 Bối cảnh và Tính cấp thiết'),
        createParagraph('Trong bối cảnh chuyển đổi số giáo dục đang diễn ra mạnh mẽ, nhu cầu kết nối giữa học viên và gia sư chất lượng cao ngày càng gia tăng. Tuy nhiên, các phương thức truyền thống gặp nhiều rào cản về minh bạch thông tin bằng cấp, quản lý lịch học bị trùng lặp, thiếu công cụ theo dõi tiến độ và quy trình thanh toán chưa đảm bảo an toàn cho cả hai bên.'),
        createParagraph('Dự án NovaLearn được xây dựng nhằm giải quyết triệt để các rào cản trên bằng cách cung cấp một nền tảng toàn diện tích hợp công nghệ hiện đại. Hệ thống hỗ trợ đa dạng đối tượng bao gồm Học viên (Student), Gia sư (Tutor) và Quản trị viên (Admin) với các quy trình kiểm duyệt nghiêm ngặt, thanh toán minh bạch và lớp học tương tác trực tuyến.'),

        createHeading2('1.2 Mục tiêu chiến lược của hệ thống'),
        createBullet('Xây dựng kênh kết nối trực tiếp, minh bạch thông tin giữa học viên có nhu cầu học tập và gia sư sở hữu trình độ chuyên môn đã qua kiểm duyệt.', 'Chuẩn hóa thông tin:'),
        createBullet('Tự động hóa luồng đăng ký khóa học, đặt ca học và ngăn chặn hoàn toàn hiện tượng trùng lịch dạy của giảng viên thông qua thuật toán kiểm tra thời gian thực.', 'Quản lý lịch học thông minh:'),
        createBullet('Thiết lập kênh quản trị Admin tập trung với các công cụ kiểm duyệt chứng chỉ bằng cấp, kiểm duyệt khóa học và phê duyệt yêu cầu rút tiền bảo vệ quyền lợi tài chính.', 'Bảo vệ nguồn lực & tài chính:'),
        createBullet('Sẵn sàng hạ tầng dữ liệu Vector DB và các bảng lưu trữ để tích hợp các tính năng trợ lý học tập AI RAG, tự động sinh bài kiểm tra và lưu trữ trạng thái bảng trắng tương tác.', 'Sẵn sàng tích hợp AI:'),

        createHeading2('1.3 Phạm vi công việc từ Tuần 1 đến Tuần 4'),
        createParagraph('Trong khoảng thời gian từ Tuần 1 đến Tuần 4, nhóm đã tập trung hoàn thiện toàn bộ hạ tầng cốt lõi, cơ sở dữ liệu quan hệ, các dịch vụ xử lý nghiệp vụ Backend, giao diện người dùng Frontend và phân hệ Quản trị Admin Panel. Toàn bộ các yêu cầu kỹ thuật và nghiệp vụ đặt ra cho giai đoạn 4 tuần đầu đã được hoàn thành đúng tiến độ với chất lượng cao.'),

        // 2. KIẾN TRÚC TỔNG THỂ VÀ THIẾT KẾ HỆ THỐNG
        createHeading1('2. KIẾN TRÚC TỔNG THỂ VÀ THIẾT KẾ HỆ THỐNG'),
        createHeading2('2.1 Kiến trúc công nghệ (Tech Stack)'),
        createParagraph('Hệ thống được thiết kế theo mô hình Client-Server hiện đại, tách biệt hoàn toàn giữa phần Backend cung cấp RESTful API và phần Frontend đảm nhận trải nghiệm giao diện người dùng:'),
        createBullet('Xây dựng trên nền tảng Node.js kết hợp Express Framework và TypeScript. Sử dụng mô hình thiết kế 3 lớp (Layered Architecture: Controller -> Service -> Repository) giúp mã nguồn đạt tính đóng gói cao, dễ dàng bảo trì và mở rộng.', 'Backend Architecture:'),
        createBullet('Sử dụng cơ sở dữ liệu quan hệ PostgreSQL quản lý thông qua Prisma ORM. Cơ sở dữ liệu được tích hợp các tiện ích mở rộng nâng cao như pg_trgm (tìm kiếm mờ), vector (lưu trữ embedding cho AI), unaccent (tìm kiếm tiếng Việt không dấu) và pgcrypto.', 'Database Layer:'),
        createBullet('Xây dựng ứng dụng đơn trang (SPA) bằng React.js và Vite, viết hoàn toàn bằng TypeScript. Giao diện được thiết kế theo phong cách CSS Vanilla tùy biến cao, phản hồi linh hoạt (Responsive) trên đa thiết bị.', 'Frontend Architecture:'),
        createBullet('Sử dụng Supabase Cloud cho các dịch vụ xác thực và lưu trữ đám mây, tích hợp cơ chế bảo mật Token JWT cho các truy vấn API.', 'Cloud Services:'),

        createHeading2('2.2 Cấu trúc Cơ sở dữ liệu chi tiết (Database Schema)'),
        createParagraph('Hệ thống cơ sở dữ liệu bao gồm 22 bảng (Models) chính và 12 tập hợp kiểu dữ liệu liệt kê (Enums), đáp ứng trọn vẹn toàn bộ nghiệp vụ từ quản lý người dùng đến tài chính và AI:'),
        createBullet('Lưu trữ thông tin định danh, tài khoản, vai trò (student, tutor, admin), trạng thái hoạt động (active, suspended, deleted) và thông tin đăng nhập.', 'Bảng Người dùng (users):'),
        createBullet('Lưu trữ thông tin chuyên môn gia sư, tiểu sử, số năm kinh nghiệm, học phí theo giờ, khu vực địa lý, trạng thái xác thực (pending, approved, rejected) và điểm đánh giá trung bình.', 'Bảng Hồ sơ Gia sư (tutor_profiles):'),
        createBullet('Quản lý bằng cấp, chứng chỉ sư phạm, chứng chỉ ngoại ngữ tải lên bởi gia sư, hỗ trợ trạng thái kiểm duyệt và ghi chú của Admin.', 'Bảng Chứng chỉ Gia sư (tutor_certificates):'),
        createBullet('Quản lý danh mục khóa học, mức giá, thời lượng ca học, số lượng học viên tối đa, trạng thái khóa học (draft, published, hidden, archived).', 'Bảng Khóa học (courses) & Ca học (course_schedules):'),
        createBullet('Quản lý luồng đặt lớp của học viên, trạng thái đơn hàng (pending, confirmed, completed, cancelled, refunded) và trạng thái thanh toán.', 'Bảng Đặt lớp (bookings) & Giao dịch (transactions):'),
        createBullet('Quản lý số dư tài khoản của người dùng, thực hiện nạp/rút và ghi nhận các khoản chiết khấu phí nền tảng 10%.', 'Bảng Ví (wallets) & Rút tiền (payouts):'),
        createBullet('Quản lý các ca học thực tế, điểm danh học viên (manual/auto), ghi âm buổi học, phòng chat trực tuyến và bảng trắng tương tác.', 'Bảng Lớp học ảo (class_sessions, attendances, chat_rooms, messages, whiteboard_states):'),
        createBullet('Lưu trữ lịch sử hội thoại AI, tài liệu tải lên, phân đoạn văn bản (chunks) phục vụ truy vấn vector RAG và ngân hàng câu hỏi kiểm tra.', 'Bảng Phân hệ AI & Đánh giá (documents, document_chunks, ai_conversations, quizzes, reviews, favorites):'),

        // 3. CHI TIẾT TIẾN ĐỘ THỰC HIỆN TUẦN 1 - TUẦN 4
        createHeading1('3. CHI TIẾT TIẾN ĐỘ THỰC HIỆN TỪ TUẦN 1 ĐẾN TUẦN 4'),

        createHeading2('3.1 Tuần 1: Khởi Tạo Dự Án & Thiết Kế Kiến Trúc Cốt Lõi'),
        createParagraph('Trong tuần đầu tiên, nhóm đã hoàn thành công tác phân tích yêu cầu nghiệp vụ, khởi tạo cấu trúc thư mục chuẩn cho cả Backend và Frontend, đồng thời thiết kế chi tiết toàn bộ Schema cơ sở dữ liệu:'),
        createBullet('Khảo sát và chốt danh sách nghiệp vụ dành cho 3 nhóm người dùng (Học viên, Gia sư, Quản trị viên).', 'Nghiên cứu & Phân tích:'),
        createBullet('Khởi tạo dự án Backend với Node.js, Express, TypeScript và cấu hình Prisma ORM. Kết nối thành công tới PostgreSQL database hosting.', 'Hạ tầng Backend:'),
        createBullet('Thiết kế toàn bộ 22 mô hình dữ liệu (Models) và 12 Enums trong tệp schema.prisma, tạo các chỉ mục (Indexes) tối ưu tốc độ truy vấn theo khu vực, mức giá, trạng thái và thẻ tìm kiếm.', 'Cơ sở dữ liệu:'),
        createBullet('Khởi tạo dự án Frontend React với Vite và TypeScript. Cấu hình hệ thống Routing cơ bản bằng React Router DOM và tổ chức thư mục linh kiện UI.', 'Hạ tầng Frontend:'),

        createHeading2('3.2 Tuần 2: Phát Triển Module Cốt Lõi Phía Backend & Cổng Học Viên'),
        createParagraph('Tuần thứ 2 tập trung vào việc hoàn thiện các tính năng cho học viên cùng các dịch vụ nền tảng xử lý dữ liệu khóa học và đặt lớp:'),
        createBullet('Xây dựng dịch vụ đăng ký, đăng nhập, mã hóa mật khẩu, tạo token JWT và phân quyền người dùng thông qua Auth Middleware.', 'Module Xác thực (Auth):'),
        createBullet('Triển khai API xem danh sách khóa học, lọc khóa học theo môn học, khoảng giá, hình thức dạy (online/offline) và tìm kiếm từ khóa.', 'Module Khóa học & Môn học:'),
        createBullet('Xây dựng quy trình xử lý đơn đặt lớp, kiểm tra ca học khả dụng và khởi tạo đơn hàng với trạng thái thanh toán tích hợp preview cổng ZaloPay.', 'Module Đặt lịch học (Booking):'),
        createBullet('Triển khai API tạo bài viết, xem danh sách bài viết blog, quản lý danh sách gia sư yêu thích và gửi đánh giá nhận xét.', 'Module Bài viết & Tương tác:'),
        createBullet('Hoàn thiện Trang chủ (HomePage), Trang danh sách khóa học kèm bộ lọc nâng cao (CourseList, SidebarFilters), Trang chi tiết khóa học (CourseDetail), Trang tin tức Blog (BlogList, BlogDetail), Trang FAQ và Trang Liên hệ.', 'Giao diện Cổng Học viên:'),

        createHeading2('3.3 Tuần 3: Phát Triển Kênh Giảng Viên & Quản Lý Lớp Học Virtual Classroom'),
        createParagraph('Trong tuần 3, nhóm đã phát triển toàn bộ các phân hệ dành cho Gia sư, quản lý ca học và tài chính gia sư:'),
        createBullet('Xây dựng API cho phép gia sư cập nhật thông tin cá nhân, tiểu sử, số năm kinh nghiệm, học phí theo giờ và tải chứng chỉ/bằng cấp lên hệ thống.', 'Module Hồ sơ Gia sư:'),
        createBullet('Phát triển thuật toán tự động kiểm tra thời gian thực. Hệ thống ngăn chặn gia sư tạo các ca học có khoảng thời gian bị trùng lặp hoặc đè lên nhau.', 'Thuật toán Chống trùng lịch:'),
        createBullet('Xây dựng cơ chế tự động tạo buổi học thực tế khi đơn hàng hoàn tất, quản lý điểm danh học viên (có mặt, vắng mặt, muộn) và lưu trữ trạng thái bảng trắng.', 'Quản lý Lớp học Virtual Classroom:'),
        createBullet('Thiết lập cơ chế chiết khấu 10% phí hoa hồng nền tảng, tự động cộng 90% học phí vào Ví gia sư và xử lý yêu cầu rút tiền về ngân hàng.', 'Module Tài chính & Ví thu nhập:'),
        createBullet('Xây dựng giao diện TeacherDashboard tích hợp các tab quản lý khóa học, thiết lập thời gian dạy, quản lý số dư Ví và danh sách bài giảng. Hoàn thiện trang danh sách gia sư công khai (InstructorList).', 'Giao diện Kênh Giảng viên:'),

        createHeading2('3.4 Tuần 4: Phát Triển Admin Hub, Kiểm Duyệt Toàn Diện & Tối Ưu Hệ Thống'),
        createParagraph('Tuần thứ 4 đánh dấu việc hoàn thiện phân hệ Quản trị Admin Panel cao cấp, cho phép kiểm duyệt toàn bộ hoạt động trên hệ thống và đóng gói tài liệu nghiệp vụ:'),
        createBullet('Phát triển các API thống kê tổng quan chỉ số hệ thống (tổng số học viên, gia sư, khóa học, doanh thu và đơn đặt lớp).', 'Dashboard Thống kê Admin:'),
        createBullet('Xây dựng tính năng xem danh sách người dùng, kích hoạt hoặc khóa tài khoản vi phạm và thay đổi vai trò người dùng.', 'Quản lý Người dùng:'),
        createBullet('Triển khai quy trình xét duyệt hồ sơ gia sư và kiểm duyệt chứng chỉ/bằng cấp. Admin có thể xem trực tiếp tệp chứng chỉ, phê duyệt/từ chối và nhập ghi chú (Admin Note).', 'Kiểm duyệt Gia sư & Bằng cấp:'),
        createBullet('Xây dựng tính năng phê duyệt khóa học và xử lý các yêu cầu rút tiền của gia sư. Trong trường hợp từ chối yêu cầu rút tiền, hệ thống tự động hoàn trả 100% số tiền về Ví gia sư.', 'Kiểm duyệt Khóa học & Rút tiền:'),
        createBullet('Xây dựng AdminDashboard chuyên biệt với thiết kế badge màu vàng nổi bật đếm số hồ sơ "Chờ duyệt" giúp Admin lọc nhanh trong 1 chạm. Đóng gói tệp quy tắc nghiệp vụ tutor_business_rules.md.', 'Giao diện Admin & Nghiệp vụ:'),

        createCalloutBox(
          'Trong trường hợp gia sư bị Admin khóa tài khoản hoặc hủy xác thực, hệ thống tự động hủy các ca học chưa diễn ra và hoàn tiền 100% học phí các buổi chưa học vào Ví của học viên nhằm bảo vệ tuyệt đối quyền lợi học viên.',
          'CHÍNH SÁCH BẢO VỆ HỌC VIÊN'
        ),

        new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

        // 4. BẢNG TỔNG HỢP MỤC THỰC HIỆN VÀ ĐÁNH GIÁ
        createHeading1('4. BẢNG TỔNG HỢP MỤC THỰC HIỆN VÀ ĐÁNH GIÁ TỈ LỆ HOÀN THÀNH'),
        createParagraph('Dưới đây là bảng tổng hợp chi tiết khối lượng công việc đã thực hiện từ Tuần 1 đến Tuần 4 so với kế hoạch ban đầu:'),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell('STT', true, '1A365D', 8),
                cell('Hạng mục công việc', true, '1A365D', 35),
                cell('Kết quả đạt được', true, '1A365D', 42),
                cell('Tỉ lệ', true, '1A365D', 15)
              ]
            }),
            new TableRow({
              children: [
                cell('1', false, null, 8),
                cell('Thiết kế Cơ sở dữ liệu', false, null, 35),
                cell('Hoàn thành 22 Models, 12 Enums, các indexes tối ưu truy vấn.', false, null, 42),
                cell('100%', true, null, 15)
              ]
            }),
            new TableRow({
              children: [
                cell('2', false, 'F7FAFC', 8),
                cell('Module Xác thực & Phân quyền', false, 'F7FAFC', 35),
                cell('Hoàn thành Auth Service, JWT Token, RBAC Middleware cho 3 vai trò.', false, 'F7FAFC', 42),
                cell('100%', true, 'F7FAFC', 15)
              ]
            }),
            new TableRow({
              children: [
                cell('3', false, null, 8),
                cell('Module Đặt lớp & Ca học', false, null, 35),
                cell('Hoàn thành Booking Service, thuật toán chống trùng lịch dạy.', false, null, 42),
                cell('100%', true, null, 15)
              ]
            }),
            new TableRow({
              children: [
                cell('4', false, 'F7FAFC', 8),
                cell('Module Gia sư & Bằng cấp', false, 'F7FAFC', 35),
                cell('Hoàn thành Tutor Profile, upload & kiểm duyệt chứng chỉ.', false, 'F7FAFC', 42),
                cell('100%', true, 'F7FAFC', 15)
              ]
            }),
            new TableRow({
              children: [
                cell('5', false, null, 8),
                cell('Module Quản trị Admin Panel', false, null, 35),
                cell('Hoàn thành Dashboard Thống kê, duyệt Tutor, duyệt Khóa học, duyệt Payout.', false, null, 42),
                cell('100%', true, null, 15)
              ]
            }),
            new TableRow({
              children: [
                cell('6', false, 'F7FAFC', 8),
                cell('Giao diện Cổng Học viên', false, 'F7FAFC', 35),
                cell('Hoàn thành HomePage, CourseList, CourseDetail, Blog, FAQ, Contact.', false, 'F7FAFC', 42),
                cell('100%', true, 'F7FAFC', 15)
              ]
            }),
            new TableRow({
              children: [
                cell('7', false, null, 8),
                cell('Giao diện Kênh Giảng viên', false, null, 35),
                cell('Hoàn thành TeacherDashboard, quản lý ca học, số dư ví, rút tiền.', false, null, 42),
                cell('100%', true, null, 15)
              ]
            }),
            new TableRow({
              children: [
                cell('8', false, 'F7FAFC', 8),
                cell('Giao diện Admin Hub', false, 'F7FAFC', 35),
                cell('Hoàn thành AdminDashboard với Badge đếm Chờ duyệt, tab phân quyền.', false, 'F7FAFC', 42),
                cell('100%', true, 'F7FAFC', 15)
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

        // 5. QUY TRÌNH NGHIỆP VỤ NỔI BẬT
        createHeading1('5. QUY TRÌNH NGHIỆP VỤ NỔI BẬT VÀ QUY TẮC BẢO VỆ NGUỒN LỰC'),
        createHeading2('5.1 Vòng đời trạng thái Gia sư (Tutor Lifecycle)'),
        createParagraph('Hồ sơ gia sư trải qua 3 giai đoạn quản lý chặt chẽ: Chờ duyệt (Pending) -> Đã duyệt (Approved) -> Từ chối / Đình chỉ (Rejected / Suspended). Mỗi trạng thái quy định rõ quyền hạn hiển thị công khai, khả năng xuất bản khóa học và nhận tiền đặt lớp.'),

        createHeading2('5.2 Quy trình Rút tiền và Phí Nền tảng'),
        createParagraph('Hệ thống áp dụng mức phí hoa hồng 10% cố định trên mỗi đơn đặt lớp thành công. 90% doanh thu còn lại được tự động ghi nhận vào Ví gia sư. Khi gia sư gửi yêu cầu Rút tiền (Payout), số tiền sẽ tạm khóa. Nếu Admin phê duyệt, giao dịch chuyển sang hoàn thành. Nếu Admin từ chối, số tiền lập tức được hệ thống hoàn lại 100% vào Ví gia sư.'),

        // 6. KẾ HOẠCH PHÁT TRIỂN TIẾP THEO
        createHeading1('6. KẾ HOẠCH PHÁT TRIỂN TRONG CÁC TUẦN TIẾP THEO'),
        createBullet('Tích hợp hoàn thiện hệ thống hỏi đáp AI RAG sử dụng vector embedding, cho phép học viên tra cứu tài liệu khóa học và tự động tạo đề thi trắc nghiệm.', 'Mở rộng Phân hệ AI:'),
        createBullet('Kết nối chính thức cổng thanh toán ZaloPay/VNPAY và xử lý webhook tự động cập nhật trạng thái giao dịch.', 'Tích hợp Thanh toán Trực tuyến:'),
        createBullet('Tiến hành kiểm thử tải hệ thống (Load testing), tối ưu hóa thời gian phản hồi API dưới 100ms và triển khai dự án lên hạ tầng Cloud Production.', 'Triển khai & Kiểm thử Tải:'),

        // 7. KẾT LUẬN
        createHeading1('7. KẾT LUẬN VÀ CAM KẾT'),
        createParagraph('Trải qua 4 tuần triển khai quyết liệt, nhóm C26 đã hoàn thành 100% khối lượng công việc đặt ra cho Phase 1 của dự án NovaLearn. Toàn bộ hạ tầng Backend, Frontend, Cơ sở dữ liệu và hệ thống Quản trị Admin Panel đã đi vào vận hành ổn định, đáp ứng chính xác các yêu cầu nghiệp vụ khắt khe.'),
        createParagraph('Nhóm cam kết tiếp tục duy trì tiến độ công việc, sẵn sàng cho các giai đoạn nâng cấp tiếp theo nhằm mang lại một nền tảng giáo dục trực tuyến chất lượng cao, an toàn và thông minh.')
      ]
    }
  ]
});

// Write to files
const docxPath = path.join('d:', 'cod', 'thuctap', 'BAO_CAO_TIEN_DO_TUAN_1_DEN_4.docx');
const docxBackendPath = path.join('d:', 'cod', 'thuctap', 'backend', 'src', 'doc', 'BAO_CAO_TIEN_DO_TUAN_1_DEN_4.docx');

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(docxPath, buffer);
  fs.writeFileSync(docxBackendPath, buffer);
  console.log(`Successfully generated DOCX files at:\n - ${docxPath}\n - ${docxBackendPath}`);
}).catch(err => {
  console.error('Error generating DOCX:', err);
});

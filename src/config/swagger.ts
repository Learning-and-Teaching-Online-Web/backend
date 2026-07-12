export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "BE Web Learning API Docs",
    version: "1.0.0",
    description: "Tài liệu API tích hợp Swagger cho ứng dụng Web Learning, cho phép thử nghiệm và kiểm tra trực tiếp các API của hệ thống.",
  },
  servers: [
    {
      url: "http://localhost:5000/api",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Điền token JWT nhận được từ API Đăng nhập (Sign In) dưới dạng: `Bearer <token>`",
      },
    },
    schemas: {
      SignUpInput: {
        type: "object",
        required: ["email", "password", "fullName", "role"],
        properties: {
          email: { type: "string", format: "email", example: "test@example.com" },
          password: { type: "string", format: "password", example: "password123" },
          fullName: { type: "string", example: "Nguyễn Văn A" },
          phone: { type: "string", example: "0987654321" },
          gender: { type: "string", example: "male" },
          dateOfBirth: { type: "string", format: "date", example: "2000-01-01" },
          role: { type: "string", enum: ["student", "tutor", "admin"], example: "student" },
        },
      },
      SignInInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "test@example.com" },
          password: { type: "string", format: "password", example: "password123" },
        },
      },
      CourseInput: {
        type: "object",
        required: ["title", "subject", "price"],
        properties: {
          title: { type: "string", example: "Khóa học Lập trình Web Node.js" },
          subject: { type: "string", example: "Công nghệ thông tin" },
          description: { type: "string", example: "Khóa học lập trình web từ cơ bản đến nâng cao sử dụng Express và Prisma." },
          price: { type: "number", example: 500000 },
          duration_minutes: { type: "integer", default: 60, example: 90 },
          max_students: { type: "integer", default: 1, example: 5 },
          total_sessions: { type: "integer", default: 1, example: 12 },
          level: { type: "string", example: "Intermediate" },
          thumbnail_url: { type: "string", example: "http://example.com/thumbnail.png" },
          tags: {
            type: "array",
            items: { type: "string" },
            example: ["nodejs", "express", "backend"],
          },
        },
      },
      CourseUpdateInput: {
        type: "object",
        properties: {
          title: { type: "string", example: "Khóa học Lập trình Web Node.js cập nhật" },
          subject: { type: "string", example: "Công nghệ thông tin" },
          description: { type: "string", example: "Mô tả khóa học được cập nhật." },
          price: { type: "number", example: 450000 },
          duration_minutes: { type: "integer", example: 90 },
          max_students: { type: "integer", example: 4 },
          total_sessions: { type: "integer", example: 10 },
          level: { type: "string", example: "Intermediate" },
          status: { type: "string", enum: ["draft", "published", "hidden", "archived"], example: "published" },
          thumbnail_url: { type: "string", example: "http://example.com/thumbnail-new.png" },
          tags: {
            type: "array",
            items: { type: "string" },
            example: ["nodejs", "express", "backend", "ts"],
          },
        },
      },
      ScheduleInput: {
        type: "object",
        required: ["start_time", "end_time"],
        properties: {
          start_time: { type: "string", format: "date-time", example: "2026-07-20T08:00:00.000Z" },
          end_time: { type: "string", format: "date-time", example: "2026-07-20T09:30:00.000Z" },
          is_recurring: { type: "boolean", default: false, example: false },
          day_of_week: { type: "integer", nullable: true, example: null },
          recurrence_end: { type: "string", format: "date", nullable: true, example: null },
          max_slot: { type: "integer", example: 5 },
        },
      },
    },
  },
  paths: {
    "/auth/signup": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng ký tài khoản người dùng mới",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SignUpInput",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Đăng ký thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Đăng ký thành công" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          400: {
            description: "Đăng ký thất bại",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Email already registered" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/signin": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng nhập tài khoản bằng email & mật khẩu",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SignInInput",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Đăng nhập thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Đăng nhập thành công" },
                    data: {
                      type: "object",
                      properties: {
                        session: {
                          type: "object",
                          properties: {
                            access_token: { type: "string", example: "eyJhbGciOi..." },
                            token_type: { type: "string", example: "bearer" },
                            expires_in: { type: "integer", example: 3600 },
                          },
                        },
                        user: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Đăng nhập thất bại",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Invalid login credentials" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/signout": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng xuất tài khoản",
        responses: {
          200: {
            description: "Đăng xuất thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Đăng xuất thành công" },
                  },
                },
              },
            },
          },
          500: {
            description: "Lỗi máy chủ khi đăng xuất",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Error message" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/profile": {
      get: {
        tags: ["Authentication"],
        summary: "Lấy thông tin hồ sơ của người dùng hiện tại dựa trên Bearer Token",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Lấy thông tin thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          401: {
            description: "Xác thực token thất bại hoặc thiếu token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/subjects": {
      get: {
        tags: ["Subjects"],
        summary: "Lấy danh sách tất cả các môn học có trong hệ thống",
        responses: {
          200: {
            description: "Lấy danh sách thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          subject_id: { type: "string", format: "uuid" },
                          name: { type: "string" },
                          code: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Lỗi kết nối database",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/courses": {
      get: {
        tags: ["Courses"],
        summary: "Lấy danh sách khóa học kèm theo bộ lọc và phân trang",
        parameters: [
          { name: "subject", in: "query", schema: { type: "string" }, description: "Lọc theo môn học" },
          { name: "level", in: "query", schema: { type: "string" }, description: "Lọc theo cấp độ" },
          { name: "min_price", in: "query", schema: { type: "number" }, description: "Giá tối thiểu" },
          { name: "max_price", in: "query", schema: { type: "number" }, description: "Giá tối đa" },
          { name: "tutor_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Lọc theo gia sư" },
          { name: "status", in: "query", schema: { type: "string", default: "published" }, description: "Trạng thái khóa học" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Từ khóa tìm kiếm tiêu đề/mô tả" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Số trang" },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 }, description: "Số phần tử mỗi trang" },
        ],
        responses: {
          200: {
            description: "Lấy danh sách thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { type: "object" } },
                    total: { type: "integer", example: 15 },
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 10 },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Courses"],
        summary: "Tạo khóa học mới (Chỉ dành cho Tutor)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CourseInput",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Tạo khóa học thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Tạo khóa học thành công" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          400: {
            description: "Tham số đầu vào không hợp lệ",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Tiêu đề, môn học và giá tiền không được để trống" },
                  },
                },
              },
            },
          },
          401: {
            description: "Chưa xác thực hoặc token không hợp lệ",
          },
          403: {
            description: "Không đủ quyền hạn (Yêu cầu tài khoản có vai trò tutor)",
          },
        },
      },
    },
    "/courses/{id}": {
      get: {
        tags: ["Courses"],
        summary: "Lấy thông tin chi tiết của một khóa học theo ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Mã ID của khóa học",
          },
        ],
        responses: {
          200: {
            description: "Lấy chi tiết thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          404: {
            description: "Không tìm thấy khóa học",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string", example: "Không tìm thấy khóa học này" },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Courses"],
        summary: "Cập nhật thông tin khóa học (Chỉ dành cho chủ sở hữu/Tutor của khóa học)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Mã ID của khóa học cần cập nhật",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CourseUpdateInput",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Cập nhật khóa học thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Cập nhật khóa học thành công" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          400: {
            description: "Dữ liệu không hợp lệ hoặc không có quyền chỉnh sửa",
          },
        },
      },
      delete: {
        tags: ["Courses"],
        summary: "Xóa (soft-delete / lưu trữ) khóa học (Chỉ dành cho chủ sở hữu/Tutor của khóa học)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Mã ID của khóa học cần xóa",
          },
        ],
        responses: {
          200: {
            description: "Xóa thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Xóa (Lưu trữ) khóa học thành công" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          400: {
            description: "Lỗi khi xóa khóa học",
          },
        },
      },
    },
    "/courses/{id}/schedules": {
      post: {
        tags: ["Courses"],
        summary: "Thêm lịch dạy mới vào khóa học (Chỉ dành cho chủ sở hữu/Tutor của khóa học)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Mã ID của khóa học",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ScheduleInput",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Thêm lịch dạy thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Thêm lịch dạy thành công" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          400: {
            description: "Dữ liệu thời gian không hợp lệ hoặc trùng lịch",
          },
        },
      },
    },
  },
};

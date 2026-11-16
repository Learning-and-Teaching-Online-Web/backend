# 📜 BỘ NGUYÊN TẮC PHÁT TRIỂN VÀ REVIEW CODE (DEV RULES & DEFINITION OF DONE)
> **Dự án**: Website E-Learning & Kết nối Gia Sư tích hợp AI  
> **Áp dụng cho**: Toàn bộ thành viên trong nhóm (Leader, Dev 1, Dev 2)  
> **Mục tiêu**: Đảm bảo code sạch, định kiểu nghiêm ngặt (Strict Types), có file kiểm thử (Unit/Integration Test) và pass 100% trước khi bấm Merge vào nhánh chính (`main`).

---

# 🛑 3 NGUYÊN TẮC BẤT DI BẤT DỊCH (LEAD SẼ TỪ CHỐI MERGE NẾU VI PHẠM)

## NGUYÊN TẮC 1: KHAI BÁO TYPE ĐẦY ĐỦ (ÁP DỤNG CHO CODE MỚI)
1. **Áp dụng cho Code mới được viết trong Sprint**:
   * Với các file cũ đã tồn tại: Giữ nguyên để tránh rủi ro vỡ logic cũ.
   * Với **toàn bộ tính năng mới, service mới, API mới, component mới**: Tuyệt đối **CẤM dùng `any` bừa bãi**. Mọi tham số hàm, giá trị trả về và dữ liệu trao đổi đều phải có Interface/Type rõ ràng.
   * ❌ **SAI (trong code mới)**: `async function getSession(req: any, res: any) { const data: any = ... }`
   * ✅ **ĐÚNG**: `async function getSession(req: AuthenticatedRequest, res: Response<ApiResponse<SessionDetail>>): Promise<void>`
2. **Tập trung hóa các Type**:
   * Các Type của Backend gom trong thư mục `backend/src/types/` (VD: `quiz.types.ts`, `classroom.types.ts`, `ai.types.ts`).
   * Các Type của Frontend gom trong `frontend/src/types/` hoặc interfaces của service.
3. **Quy tắc khi Leader Review**:
   * Khi Leader review PR trên GitHub, nhìn vào tab **Files changed**: Nếu thấy thành viên viết thêm code mới mà lạm dụng `any` không có type ➜ Yêu cầu định nghĩa type trước khi merge.

---

## NGUYÊN TẮC 2: "CODE ĐÂU - TEST ĐÓ" (MỖI TASK ĐỀU PHẢI CÓ FILE TEST)
Mỗi khi viết một Service, Controller hoặc Utility mới, thành viên **bắt buộc phải tạo file test tương ứng** (`*.test.ts` hoặc `*.spec.ts`):

1. **Vị trí và quy tắc đặt tên file test**:
   * Viết service `backend/src/services/course.service.ts` ➜ Tạo file `backend/src/services/__tests__/course.service.test.ts`.
   * Viết util `backend/src/utils/chunking.ts` ➜ Tạo file `backend/src/utils/__tests__/chunking.test.ts`.
   * Viết API endpoint ➜ Tạo file test API `*.e2e.test.ts` kiểm tra mã phản hồi (200, 400, 403).
2. **Cấu trúc tối thiểu của 1 file test**:
   Mỗi file test phải bao phủ ít nhất 2 kịch bản:
   * **Kịch bản thành công (Happy Path)**: Dữ liệu hợp lệ ➜ Trả về kết quả mong đợi.
   * **Kịch bản thất bại/Validate (Edge Cases)**: Thiếu dữ liệu, sai ID, không có quyền ➜ Bắt đúng mã lỗi (400, 403, 404).

---

## NGUYÊN TẮC 3: TIÊU CHÍ NGHIỆM THU ĐỂ ĐƯỢC DUYỆT PULL REQUEST (DoD)
Trước khi thành viên kéo card sang cột `Ready for Merge` trên Trello và gắn link Pull Request, họ phải đảm bảo:

- [ ] 1. Toàn bộ code mới đã được định kiểu TypeScript đầy đủ, không còn `any`.
- [ ] 2. Đã viết file kiểm thử (`*.test.ts`) tương ứng cho task đó.
- [ ] 3. Chạy lệnh test ở local và **PASS 100%**:
  ```bash
  npm test
  ```
- [ ] 4. Trong phần mô tả của Pull Request trên GitHub: **Chụp ảnh màn hình terminal chạy `npm test` màu xanh lá (Passed)** dán vào PR.
- [ ] 5. Không bị xung đột code (No Git merge conflicts) với nhánh `main`.

> ⚠️ **Quyền của Leader**: Nếu mở PR mà **chưa có file test** hoặc **bị lỗi TypeScript**, Leader bấm ngay nút **Request Changes** (Từ chối duyệt) và yêu cầu thành viên bổ sung test trước khi xem tiếp!

---

# 🛠️ CÀI ĐẶT CÔNG CỤ TEST NHANH & CHUẨN (VITEST CHO CẢ BE & FE)

Dự án hiện tại của bạn dùng TypeScript và Vite. Công cụ test tốt nhất, nhẹ nhất và nhanh nhất hiện nay là **Vitest** (chạy nhanh hơn Jest gấp 10 lần, hỗ trợ TypeScript nguyên bản mà không cần cấu hình phức tạp).

### 1. Cài đặt Vitest cho Backend (`backend/`)
Mở terminal trong thư mục `backend/` và chạy lệnh:
```bash
npm install -D vitest @types/node
```
Thêm script vào `backend/package.json`:
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### 2. Cài đặt Vitest cho Frontend (`frontend/`)
Mở terminal trong thư mục `frontend/` và chạy lệnh:
```bash
npm install -D vitest
```
Thêm script vào `frontend/package.json`:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "test": "vitest run"
}
```

---

# 🤖 TỰ ĐỘNG HÓA TRÊN GITHUB (GITHUB ACTIONS CI)
*Khóa tự động nút Merge nếu code bị lỗi Type hoặc Test bị Fail!*

Tạo file `.github/workflows/ci.yml` trong thư mục gốc dự án:
```yaml
name: Continuous Integration (CI)

on:
  pull_request:
    branches: [ main ]

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      # Kiểm tra Backend
      - name: Test & Check Backend
        run: |
          cd backend
          npm ci
          npx tsc --noEmit
          npm test

      # Kiểm tra Frontend
      - name: Test & Check Frontend
        run: |
          cd frontend
          npm ci
          npm run build
          npm test
```

> 👉 **Kết quả**: Mỗi khi 2 bạn kia mở Pull Request, GitHub sẽ tự động chạy kiểm tra. Nếu có bất kỳ lỗi Type hay Test bị fail, GitHub sẽ hiện dấu **X đỏ ❌** và **TỰ ĐỘNG KHÓA NÚT MERGE CỦA BẠN LẠI**! Chỉ khi nào hiện dấu **Tick xanh ✔️ (All checks passed)** thì bạn mới bấm Merge được.


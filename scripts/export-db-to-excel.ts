import * as ExcelJS from "exceljs";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


// ─── Màu sắc header theo nhóm bảng ─────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  users: "1565C0",
  tutor_profiles: "1565C0",
  student_profiles: "1565C0",
  tutor_certificates: "1565C0",
  user_addresses: "1565C0",

  courses: "2E7D32",
  course_schedules: "2E7D32",
  course_comments: "2E7D32",

  bookings: "6A1B9A",
  transactions: "6A1B9A",
  wallets: "6A1B9A",
  payouts: "6A1B9A",

  class_sessions: "E65100",
  attendances: "E65100",
  session_recordings: "E65100",
  whiteboard_states: "E65100",

  chat_rooms: "00838F",
  messages: "00838F",

  reviews: "C62828",
  favorites: "C62828",

  documents: "4E342E",
  document_chunks: "4E342E",

  ai_conversations: "37474F",

  quizzes: "F57F17",
  quiz_questions: "F57F17",
  quiz_options: "F57F17",
  quiz_attempts: "F57F17",

  matching_logs: "880E4F",

  admin_logs: "212121",
  system_configs: "212121",

  articles: "1B5E20",
  article_comments: "1B5E20",
};

// ─── Helper: lấy danh sách thuộc tính (cột) từ Prisma DMMF schema ─────────────────
function getTableHeaders(tableName: string): string[] {
  const model = Prisma.dmmf.datamodel.models.find(
    (m) => m.dbName === tableName || m.name.toLowerCase() === tableName.replace(/_/g, "")
  );
  if (!model) return [];
  return model.fields
    .filter((f) => (f.kind === "scalar" || f.kind === "enum") && f.name !== "embedding")
    .map((f) => f.name);
}

// ─── Helper: flatten JSON/object thành string ────────────────────────────────
function flattenValue(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "object") return JSON.stringify(val);
  return val as string | number | boolean;
}

// ─── Helper: tạo header row có màu ─────────────────────────────────────────
function styleHeaderRow(
  worksheet: ExcelJS.Worksheet,
  headers: string[],
  color: string
) {
  const row = worksheet.addRow(["STT", ...headers]);
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + color },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });
  row.height = 28;
}

// ─── Helper: autofit cột ──────────────────────────────────────────────────
function autofitColumns(worksheet: ExcelJS.Worksheet, headers: string[]) {
  const allCols = ["STT", ...headers];
  worksheet.columns = allCols.map((h, i) => ({
    key: String(i),
    width: Math.max(h.length + 4, 14),
  }));
}

// ─── Helper: ghi dữ liệu một bảng ra sheet ──────────────────────────────────
async function writeTableToSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: Record<string, unknown>[],
  tableName: string
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  const color = GROUP_COLORS[tableName] ?? "263238";

  // Tiêu đề bảng (row 1)
  const titleRow = sheet.addRow([`📋 ${sheetName.toUpperCase()}`]);
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF" + color } };
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5F5F5" },
  };
  titleRow.height = 32;

  // Lấy headers từ data hoặc từ Prisma DMMF schema nếu data rỗng
  const headers = data.length > 0 ? Object.keys(data[0]) : getTableHeaders(tableName);

  if (headers.length > 0) {
    styleHeaderRow(sheet, headers, color);
    autofitColumns(sheet, headers);
  }

  if (data.length === 0) {
    const emptyNotice = sheet.addRow(["", "(Bảng này chưa có dữ liệu)"]);
    emptyNotice.font = { italic: true, color: { argb: "FF888888" } };
    console.log(`  ⚠️  ${sheetName}: rỗng (đã xuất tiêu đề ${headers.length} thuộc tính)`);
  } else {
    // Ghi từng dòng dữ liệu
    data.forEach((row, idx) => {
      const values = headers.map((h) => flattenValue(row[h]));
      const excelRow = sheet.addRow([idx + 1, ...values]);

      // Màu xen kẽ
      if (idx % 2 === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F8F8" },
          };
        });
      }

      // Căn giữa cột STT
      excelRow.getCell(1).alignment = { horizontal: "center" };
    });
    console.log(`  ✅ ${sheetName}: ${data.length} dòng`);
  }

  // Merge tiêu đề (row 1)
  const totalCols = Math.max(headers.length + 1, 2);
  sheet.mergeCells(1, 1, 1, totalCols);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Bắt đầu xuất database ra Excel...\n");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ThucTap Export Script";
  workbook.created = new Date();
  workbook.modified = new Date();

  // ── 1. Users ──
  process.stdout.write("📦 Đang tải: ");
  const users = await prisma.user.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "users", users as never, "users");

  // ── 2. TutorProfiles ──
  const tutorProfiles = await prisma.tutorProfile.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "tutor_profiles", tutorProfiles as never, "tutor_profiles");

  // ── 3. StudentProfiles ──
  const studentProfiles = await prisma.studentProfile.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "student_profiles", studentProfiles as never, "student_profiles");

  // ── 4. TutorCertificates ──
  const certs = await prisma.tutorCertificate.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "tutor_certificates", certs as never, "tutor_certificates");

  // ── 5. UserAddresses ──
  const addresses = await prisma.userAddress.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "user_addresses", addresses as never, "user_addresses");

  // ── 6. Courses ──
  const courses = await prisma.course.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "courses", courses as never, "courses");

  // ── 7. CourseSchedules ──
  const schedules = await prisma.courseSchedule.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "course_schedules", schedules as never, "course_schedules");

  // ── 8. CourseComments ──
  const courseComments = await prisma.courseComment.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "course_comments", courseComments as never, "course_comments");

  // ── 9. Bookings ──
  const bookings = await prisma.booking.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "bookings", bookings as never, "bookings");

  // ── 10. Transactions ──
  const transactions = await prisma.transaction.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "transactions", transactions as never, "transactions");

  // ── 11. Wallets ──
  const wallets = await prisma.wallet.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "wallets", wallets as never, "wallets");

  // ── 12. Payouts ──
  const payouts = await prisma.payout.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "payouts", payouts as never, "payouts");

  // ── 13. ClassSessions ──
  const sessions = await prisma.classSession.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "class_sessions", sessions as never, "class_sessions");

  // ── 14. Attendances ──
  const attendances = await prisma.attendance.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "attendances", attendances as never, "attendances");

  // ── 15. SessionRecordings ──
  const recordings = await prisma.sessionRecording.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "session_recordings", recordings as never, "session_recordings");

  // ── 16. WhiteboardStates ──
  const whiteboards = await prisma.whiteboardState.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "whiteboard_states", whiteboards as never, "whiteboard_states");

  // ── 17. ChatRooms ──
  const chatRooms = await prisma.chatRoom.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "chat_rooms", chatRooms as never, "chat_rooms");

  // ── 18. Messages ──
  const messages = await prisma.message.findMany({ orderBy: { created_at: "desc" }, take: 1000 });
  await writeTableToSheet(workbook, "messages", messages as never, "messages");

  // ── 19. Reviews ──
  const reviews = await prisma.review.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "reviews", reviews as never, "reviews");

  // ── 20. Favorites ──
  const favorites = await prisma.favorite.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "favorites", favorites as never, "favorites");

  // ── 21. Documents ──
  const documents = await prisma.document.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "documents", documents as never, "documents");

  // ── 22. DocumentChunks (bỏ qua field embedding) ──
  const chunks = await prisma.documentChunk.findMany({
    orderBy: { created_at: "desc" },
    select: {
      chunk_id: true,
      doc_id: true,
      content: true,
      chunk_index: true,
      token_count: true,
      created_at: true,
      // embedding bỏ qua vì là vector 1536 chiều
    },
  });
  await writeTableToSheet(workbook, "document_chunks", chunks as never, "document_chunks");

  // ── 23. AIConversations ──
  const aiConvs = await prisma.aIConversation.findMany({ orderBy: { created_at: "desc" }, take: 1000 });
  await writeTableToSheet(workbook, "ai_conversations", aiConvs as never, "ai_conversations");

  // ── 24. Quizzes ──
  const quizzes = await prisma.quiz.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "quizzes", quizzes as never, "quizzes");

  // ── 25. QuizQuestions ──
  const questions = await prisma.quizQuestion.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "quiz_questions", questions as never, "quiz_questions");

  // ── 26. QuizOptions ──
  const options = await prisma.quizOption.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "quiz_options", options as never, "quiz_options");

  // ── 27. QuizAttempts ──
  const attempts = await prisma.quizAttempt.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "quiz_attempts", attempts as never, "quiz_attempts");

  // ── 27. MatchingLogs ──
  const matchLogs = await prisma.matchingLog.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "matching_logs", matchLogs as never, "matching_logs");

  // ── 28. AdminLogs ──
  const adminLogs = await prisma.adminLog.findMany({ orderBy: { created_at: "desc" }, take: 1000 });
  await writeTableToSheet(workbook, "admin_logs", adminLogs as never, "admin_logs");

  // ── 29. SystemConfigs ──
  const sysConfigs = await prisma.systemConfig.findMany();
  await writeTableToSheet(workbook, "system_configs", sysConfigs as never, "system_configs");

  // ── 30. Articles ──
  const articles = await prisma.article.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "articles", articles as never, "articles");

  // ── 31. ArticleComments ──
  const articleComments = await prisma.articleComment.findMany({ orderBy: { created_at: "desc" } });
  await writeTableToSheet(workbook, "article_comments", articleComments as never, "article_comments");

  // ── Lưu file ──
  const today = new Date().toISOString().slice(0, 10);
  const outputPath = path.resolve(__dirname, `../database_export_${today}.xlsx`);
  await workbook.xlsx.writeFile(outputPath);

  console.log(`\n🎉 Hoàn thành! File đã lưu tại:\n   ${outputPath}`);
  console.log(`📊 Tổng số sheet: ${workbook.worksheets.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

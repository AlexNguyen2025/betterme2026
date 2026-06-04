# HANDOVER — Better Me 2026

> Tài liệu này dành cho AI hoặc developer kế thừa dự án.  
> Đọc toàn bộ trước khi chỉnh sửa bất kỳ thứ gì.

---

## 1. Tổng quan dự án

**Better Me 2026** là một personal daily tracker app dạng mobile-first (max-width 448px), chạy trên web.  
Chủ sở hữu: **Tuan (Admin_Tuan_123)** — người dùng duy nhất, không có hệ thống multi-user.

**Mục đích:** Tuan tự chấm điểm bản thân mỗi ngày theo các tiêu chí cá nhân, ghi nhật ký ăn uống, nhật ký tự do, và theo dõi xu hướng điểm số theo tuần.

**Live URL:** https://betterme2026.vercel.app  
**GitHub:** https://github.com/AlexNguyen2025/betterme2026  
**Firebase Project:** betterme042026 (projectId: `betterme042026`)

---

## 2. Tech Stack

| Layer | Công nghệ |
|---|---|
| UI Framework | React 18 (JSX, không TypeScript) |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 (PostCSS approach) |
| Backend / DB | Firebase Firestore (Realtime sync) |
| Auth | Firebase Anonymous Auth |
| Hosting | Vercel (auto-deploy từ GitHub `main` branch) |

**Không có:** Router, Redux, custom backend, REST API. Toàn bộ state management bằng `useState` + `useEffect` thuần.

---

## 3. Cấu trúc thư mục

```
Betterme2026/
├── src/
│   ├── App.jsx          ← TOÀN BỘ logic + UI nằm ở đây (single-file architecture)
│   ├── main.jsx         ← Entry point, mount App vào #root
│   └── index.css        ← Chỉ có @import "tailwindcss" + @config
├── index.html
├── tailwind.config.js   ← content paths cho Tailwind v4
├── postcss.config.js    ← @tailwindcss/postcss + autoprefixer
├── vite.config.js       ← Vite + @vitejs/plugin-react
├── package.json
└── HANDOVER.md          ← File này
```

**Quyết định kiến trúc quan trọng:** Toàn bộ app nằm trong `src/App.jsx` — không tách component. Lý do: app đủ nhỏ, Tuan muốn dễ đọc và sửa nhanh trong 1 file duy nhất. Đừng tách file trừ khi được yêu cầu rõ ràng.

---

## 4. Firebase — Cấu trúc Firestore

```
users/
  Admin_Tuan_123/           ← hardcoded userId, không bao giờ thay đổi
    daily_logs/
      2026-06-04/           ← document ID = date string (YYYY-MM-DD)
        date: "2026-06-04"
        status: "draft" | "submitted"
        tasks: [            ← array of task states
          { id: 15, status: "good"|"bad"|"average"|"quite_good"|"completed"|"failed"|"pending"|"na", comment: "" }
        ]
        dailyJournal: ""    ← nhật ký tự do
        meals: {
          breakfastText, breakfastCal,
          lunchText, lunchCal,
          dinnerText, dinnerCal,
          snackText, snackCal
        }
        reflections: {
          proud: "", better: "", lesson: ""
        }
        percent: 72         ← điểm % đã tính sẵn (cache)
        earnedPoints: 72
        totalPoints: 100
```

**Lưu ý:** `myUserId = "Admin_Tuan_123"` được hardcode trong App.jsx. Anonymous Auth chỉ để satisfy Firebase security rules — Tuan không login bằng email/password.

---

## 5. Logic tính điểm

Đây là phần cốt lõi của app — đọc kỹ trước khi sửa.

### Hai loại task:
- **`binary`**: Có / Đạt (`completed` = 100% weight) hoặc Không (`failed` = 0%)
- **`rating`**: 4 mức — `good` (100%), `quite_good` (80%), `average` (50%), `bad` (0%)

### Công thức:
1. Tính `totalValidWeight` = tổng `weight` của tất cả task **không phải `na`**
2. Mỗi task được chuẩn hóa: `normalizedWeight = (task.weight / totalValidWeight) * 100`
3. `earnedRaw` += `normalizedWeight * factor` (factor theo bảng trên)
4. `percent = Math.round(earnedRaw)` → thang điểm **0–100**

**Ý nghĩa:** Khi Tuan đánh N/A một task, các task còn lại tự động chiếm tỷ trọng cao hơn. Tổng luôn là 100.

### Danh sách tasks hiện tại (`baseTasks`):

| ID | Nội dung | Weight | Type | Category |
|---|---|---|---|---|
| 15 | Cardio | 8 | rating | Chăm sóc bản thân |
| 16 | Body weight / gym | 8 | rating | Chăm sóc bản thân |
| 9 | Kiểm soát rượu | 9 | binary | Chăm sóc bản thân |
| 17 | Kiểm soát ăn uống | 8 | rating | Chăm sóc bản thân |
| 13 | Không dùng bia để ngủ | 13.5 | binary | Chăm sóc bản thân |
| 12 | Đánh răng tối | 3 | binary | Chăm sóc bản thân |
| 5 | Nuôi dưỡng mục tiêu | 8 | rating | Tư duy chuẩn |
| 7 | Điềm đạm với người khác | 9 | rating | Tư duy chuẩn |
| 8 | Chuyển hóa suy nghĩ tiêu cực | 8 | rating | Tư duy chuẩn |
| 6 | Kiểm soát cuộc đời | 6 | binary | Tư duy chuẩn |
| 3 | Plan ahead & deep work | 10 | rating | Tiến về phía trước |
| 2 | Duolingo full quest | 5 | binary | Tiến về phía trước |
| 4 | Học tiếng Pháp 45 phút | 8 | rating | Tiến về phía trước |
| 11 | Dạy con, chăm bố mẹ | 10 | rating | Tiến về phía trước |
| 14 | Hài lòng với bản thân | 10 | rating | Tổng kết |

---

## 6. Các tính năng hiện có

### Tab 1 — Performance
- Điểm số realtime (0–100) với progress bar
- Nhóm task theo 4 category
- Mỗi task: đánh giá + ghi chú + N/A toggle
- Lock/Unlock ngày (CHỐT SỔ / MỞ KHÓA)
- Tự truy vấn cuối ngày: Điều tự hào / Cần làm tốt hơn / Bài học

### Tab 2 — Nutrition
- Ghi 4 bữa ăn (tên món + kcal)
- Tính tổng calo tự động

### Tab 3 — Diary
- Textarea tự do, min-height 60vh
- Auto-save khi blur

### Tab 4 — Stats
- Bar chart 7 ngày gần nhất (SVG thuần, không dùng thư viện chart)
- Nút "Xuất Excel" (chưa implement — placeholder)

### Điều hướng ngày
- Nút ← → để xem lại lịch sử
- Nút → bị disabled khi đang ở "Hôm nay"

### Sync
- `onSnapshot` = realtime sync Firestore
- Auto-save khi thay đổi task status hoặc blur khỏi text field
- Badge trạng thái: "Đang lưu..." / "Đã lưu Cloud ✓" / "Lỗi kết nối"

---

## 7. Cách deploy

**Auto-deploy:** Mỗi lần push lên `main` branch, Vercel tự động build và deploy.

**Manual deploy từ terminal:**
```bash
npx vercel --prod
```

**Build command:** `vite build`  
**Output directory:** `dist`

---

## 8. Những thứ chưa làm / TODO

- [ ] **Xuất Excel** (Tab Stats → nút placeholder chưa có logic) — dùng `xlsx` hoặc `exceljs`
- [ ] **Chart đẹp hơn** — có thể dùng `recharts` hoặc `chart.js`
- [ ] **Streak counter** — đếm số ngày liên tiếp đạt điểm cao
- [ ] **Notification / Reminder** — nhắc nhở buổi tối chấm điểm
- [ ] **Dark mode** — Tailwind đã hỗ trợ, chỉ cần thêm `dark:` classes
- [ ] **PWA** — thêm `vite-plugin-pwa` để cài như app trên điện thoại
- [ ] **Backup / Export JSON** — export toàn bộ Firestore data

---

## 9. Cách thêm task mới

Mở `src/App.jsx`, tìm `const baseTasks = [...]`, thêm object theo format:

```js
{ id: 18, text: 'Nội dung câu hỏi', weight: 7, type: 'rating', category: 'Chăm sóc bản thân' }
```

- `id`: số duy nhất, không trùng với id nào đang có
- `weight`: số bất kỳ — hệ thống tự chuẩn hóa về thang 100
- `type`: `'binary'` hoặc `'rating'`
- `category`: phải là một trong 4 giá trị trong `categoryOrder`

---

## 10. Cách build app tương tự từ đầu

Stack đã được kiểm chứng hoạt động tốt:

```bash
# 1. Khởi tạo
npx create-vite@latest . --template react
npm install

# 2. Cài thư viện
npm install firebase tailwindcss postcss autoprefixer @tailwindcss/postcss

# 3. Tailwind v4 config
# postcss.config.js → { '@tailwindcss/postcss': {}, autoprefixer: {} }
# tailwind.config.js → content: ["./index.html", "./src/**/*.{js,jsx}"]
# src/index.css → @import "tailwindcss"; @config "../tailwind.config.js";

# 4. Firebase
# - Tạo project tại console.firebase.google.com
# - Enable Firestore + Anonymous Auth
# - Copy firebaseConfig vào App.jsx

# 5. Deploy
git init && git add . && git commit -m "init"
git remote add origin <github-url>
git push -u origin main
npx vercel --prod  # connect GitHub repo khi được hỏi
```

**Firestore Security Rules tối thiểu (cho anonymous auth):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 11. Môi trường phát triển

- OS: Windows 11 Enterprise
- Node.js: v22.11.0
- npm: 10.9.0
- Shell: PowerShell (cần `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` để chạy npx)
- Editor: VS Code (khuyên dùng extension Tailwind CSS IntelliSense)

---

*Handover được tạo ngày 2026-06-04. Cập nhật file này mỗi khi có thay đổi kiến trúc lớn.*

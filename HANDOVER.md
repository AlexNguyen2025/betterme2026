# HANDOVER — Better Me 2026

> Tài liệu này dành cho AI hoặc developer kế thừa dự án.  
> Đọc toàn bộ trước khi chỉnh sửa bất kỳ thứ gì.

---

## 1. Tổng quan dự án

**Better Me 2026** là một personal daily tracker app dạng mobile-first (max-width 448px), chạy trên web.  
Chủ sở hữu: **Tuan (Admin_Tuan_123)** — người dùng duy nhất, không có hệ thống multi-user.

**Mục đích:** Tuan tự chấm điểm bản thân mỗi ngày theo các tiêu chí cá nhân, theo dõi calo nạp vào / đốt ra, ghi nhật ký tự do, và theo dõi xu hướng điểm số + calo theo 30 ngày.

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
| Charts | Recharts (BarChart + ReferenceLine) |
| Excel Export | xlsx (SheetJS) |
| Backend / DB | Firebase Firestore (Realtime sync) |
| Auth | Firebase Anonymous Auth |
| PWA | vite-plugin-pwa (Workbox) |
| Hosting | Vercel (auto-deploy từ GitHub `main` branch) |

**Không có:** Router, Redux, custom backend, REST API. Toàn bộ state management bằng `useState` + `useEffect` + `useRef` thuần.

---

## 3. Cấu trúc thư mục

```
Betterme2026/
├── src/
│   ├── App.jsx          ← TOÀN BỘ logic + UI nằm ở đây (single-file architecture)
│   ├── main.jsx         ← Entry point, mount App vào #root
│   └── index.css        ← @import tailwindcss + @config + @custom-variant dark
├── index.html
├── tailwind.config.js   ← content paths cho Tailwind v4
├── postcss.config.js    ← @tailwindcss/postcss + autoprefixer
├── vite.config.js       ← Vite + @vitejs/plugin-react + VitePWA
├── package.json
└── HANDOVER.md          ← File này
```

**Quyết định kiến trúc quan trọng:** Toàn bộ app nằm trong `src/App.jsx` — không tách component. Lý do: app đủ nhỏ, Tuan muốn dễ đọc và sửa nhanh trong 1 file duy nhất. Đừng tách file trừ khi được yêu cầu rõ ràng.

---

## 4. Firebase — Cấu trúc Firestore

```
users/
  Admin_Tuan_123/               ← hardcoded userId, không bao giờ thay đổi
    daily_logs/
      2026-06-05/               ← document ID = date string (YYYY-MM-DD)
        date: "2026-06-05"
        status: "draft" | "submitted"
        tasks: [
          { id: 15, status: "good"|"bad"|"average"|"quite_good"|"completed"|"failed"|"pending"|"na", comment: "" }
        ]
        dailyJournal: ""
        meals: {
          breakfastCal, lunchCal, dinnerCal, snackCal,   ← kcal từng bữa (chỉ số, không ghi tên)
          caloriesBurned,                                 ← calo đốt khi tập
          ruouMl,                                         ← rượu mạnh (ml)
          ruouVangMl,                                     ← rượu vang (ml)
          bia500Cans,                                     ← lon bia 500ml
          bia330Cans                                      ← lon bia 330ml
        }
        reflections: { proud: "", better: "", lesson: "" }
        percent: 72
        earnedPoints: 72
        totalPoints: 100
        netCalories: 1450       ← calo NET = nạp vào − đốt (lưu sẵn để stats)
```

**Lưu ý:** `myUserId = "Admin_Tuan_123"` được hardcode trong App.jsx. Anonymous Auth chỉ để satisfy Firebase security rules.

---

## 5. Logic tính điểm

### Hai loại task:
- **`binary`**: `completed` = 100% weight, `failed` = 0%
- **`rating`**: `good` (100%), `quite_good` (80%), `average` (50%), `bad` (0%)

### Công thức:
1. `totalValidWeight` = tổng weight của tất cả task **không phải `na`**
2. `normalizedWeight = (task.weight / totalValidWeight) * 100`
3. `earnedRaw += normalizedWeight * factor`
4. `percent = Math.round(earnedRaw)` → thang **0–100**

Khi đánh N/A, các task còn lại tự tăng tỷ trọng. Tổng luôn là 100.

### Danh sách tasks (`baseTasks`):

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

## 6. Logic tính Calo

### Hằng số (đầu file App.jsx):
```js
const CALORIE_BUDGET       = 1668;   // budget mỗi ngày của Tuan
const CAL_PER_ML_RUOU      = 2.2;    // rượu mạnh: 1ml = 2.2 kcal
const CAL_PER_ML_RUOU_VANG = 0.85;   // rượu vang: 1ml = 0.85 kcal
const CAL_PER_LON_500      = 230;    // bia 500ml: 1 lon = 230 kcal
const CAL_PER_LON_330      = 150;    // bia 330ml: 1 lon = 150 kcal
```

### Công thức NET:
```
netCal = foodCal + ruouCal + ruouVangCal + bia500Cal + bia330Cal − burnedCal
```

`netCalories` được lưu vào Firestore mỗi lần sync để dùng trong Stats.

### Derived variables (trong component):
```js
const foodCal        = breakfastCal + lunchCal + dinnerCal + snackCal
const ruouCal        = Math.round(ruouMl * 2.2)
const ruouVangCal    = Math.round(ruouVangMl * 0.85)
const bia500Cal      = bia500Cans * 230
const bia330Cal      = bia330Cans * 150
const totalIntakeCal = foodCal + ruouCal + ruouVangCal + bia500Cal + bia330Cal
const burnedCal      = caloriesBurned
const netCal         = totalIntakeCal - burnedCal
const calDiff        = netCal - CALORIE_BUDGET   // âm = còn dư, dương = vượt
```

---

## 7. Các tính năng hiện có (đầy đủ)

### Tab 1 — Performance
- Điểm số realtime (0–100) với progress bar
- Quote động lực ở đầu tab
- Nhóm task theo 4 category với divider
- Mỗi task: nút đánh giá (binary hoặc 4 mức rating) + input ghi chú + nút N/A
- Nút **CHỐT SỔ** → confirm modal → lock toàn bộ dữ liệu ngày
- Nút **MỞ KHÓA ĐỂ SỬA** → unlock ngay, không hỏi
- Tự truy vấn cuối ngày: 3 textarea (Điều tự hào / Cần làm tốt hơn / Bài học)

### Tab 2 — Nutrition
- **4 bữa ăn** (Sáng / Trưa / Tối / Vặt): chỉ nhập kcal, layout 2 cột
- **Calo đã đốt** 🏋️: nhập kcal tập luyện
- **Rượu mạnh** 🥃: nhập ml, hiện kcal quy đổi (× 2.2)
- **Rượu vang** 🍷: nhập ml, hiện kcal quy đổi (× 0.85)
- **Bia** 🍺: lon 500ml (× 230 kcal) và lon 330ml (× 150 kcal)
- **Bảng tổng kết** (card đen): liệt kê từng dòng, NET lớn, progress bar xanh/đỏ, so sánh với budget 1668

### Tab 3 — Diary
- Textarea tự do, min-height 60vh
- Auto-save khi blur

### Tab 4 — Stats
**Điểm:**
- Card đen: Streak ngày liên tiếp ≥ `STREAK_MIN` (= **80** điểm) và đã chốt sổ
- Card xám: Trung bình điểm tháng hiện tại (chỉ ngày đã submitted)
- BarChart 30 ngày (scrollable): đậm ≥80 / xám ≥60 / nhạt <60 / trống = chưa chốt

**Calo:**
- Card đen: Streak calo — ngày liên tiếp NET ≤ 1668 và đã chốt sổ
- Card xám: Tổng NET calo tuần này vs budget tuần (1668×7 = 11,676)
- BarChart 30 ngày (scrollable): **đậm** = đạt ≤1668 / **nhạt** = vượt / **trống** = chưa ghi; đường vàng kẻ ngang ở 1668

**Export:**
- Xuất Excel (.xlsx): mỗi ngày 1 row, 20+ cột bao gồm rượu/bia/calo NET
- Backup JSON: full Firestore history

**Settings:**
- Toggle notification 21:00 mỗi ngày

### Global
- **Dark mode**: toggle ☀️/🌙 ở header, persist `localStorage`
- **PWA**: installable, service worker Workbox
- Điều hướng ngày ← →
- Realtime sync badge

---

## 8. Luồng UX quan trọng

### Chốt sổ / Mở khóa
```
CHỐT SỔ → confirm modal → setIsSubmitted(true) → Firestore status: 'submitted'
MỞ KHÓA → setShowConfirmModal(false) → setIsSubmitted(false) → Firestore status: 'draft'
           (không hỏi gì, unlock ngay lập tức)
```

### Sync strategy
- **Mỗi lần đổi task status**: sync ngay (optimistic update)
- **Text fields** (journal, reflections, meals): sync khi `onBlur`
- `onSnapshot` lắng nghe realtime → tự cập nhật nếu có thay đổi từ thiết bị khác

### Modal confirm submit
- Click backdrop = đóng modal (không submit)
- Chỉ submit khi bấm "Đồng ý"

---

## 9. Tính năng v6 (TODO hoàn thành)

### PWA icon PNG
- `public/icon-192.png` + `public/icon-512.png` được tạo bởi `scripts/generate-icons.mjs`
- Script viết thuần Node.js (zlib built-in), không cần npm package nào
- Design: nền đen + vòng tròn trắng (đồng tông với app)
- `vite.config.js` manifest cập nhật: PNG 192/512 + SVG any, workbox cache thêm `.png`
- Để tạo lại: `node scripts/generate-icons.mjs`

### Custom calorie budget
- Hằng số đổi tên: `CAL_BUDGET_DEFAULT = 1668` (module scope, chỉ là giá trị mặc định)
- State: `const [calorieBudget, setCalorieBudget] = useState(() => localStorage.getItem('calorieBudget') || 1668)`
- `handleBudgetChange(val)`: validate 0 < n < 10000, lưu `localStorage.calorieBudget`
- Toàn bộ logic (streak calo, chart, weekly, nutrition summary) dùng `calorieBudget` state
- UI: input field trong Stats tab → Settings section; nút "reset" xuất hiện khi khác default

### Advanced Stats (Stats tab → Phân tích section)
**Ngày tốt nhất (`getBestDay`):**
```js
history.filter(submitted).reduce((best, l) => l.earnedPoints > best.earnedPoints ? l : best)
```

**Category yếu nhất (`getWeakestCategory`):**
- Duyệt mỗi ngày đã submitted, tính avg score per category từ task statuses
- Bỏ qua `pending` và `na` tasks
- Trả về `{ category, avg }` của category có avg thấp nhất

**Heatmap tháng (`getMonthHeatmap`):**
- Calendar grid 7 cột (T2–CN), padding cho ngày đầu tháng
- Màu ô: ≥80=đen, ≥60=xám đậm, ≥40=xám, <40=xám nhạt, chưa ghi=empty, tương lai=mờ
- Ngày hôm nay: viền xanh `ring-blue-500`

### iOS notification
- `isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)` — computed (không phải state)
- `isPWAInstalled = window.navigator.standalone === true`
- Khi `isIOS`: hiện card hướng dẫn trong Settings
  - Nếu chưa install: hướng dẫn "Add to Home Screen" 3 bước
  - Nếu đã install (standalone): confirm iOS 16.4+ hỗ trợ, bật toggle
- Web Push API hoạt động trên iOS 16.4+ **chỉ khi** app được cài như PWA (standalone mode)

---

## 10. Chi tiết kỹ thuật

### Dark mode
- `@custom-variant dark (&:where(.dark, .dark *))` trong `src/index.css`
- Toggle class `.dark` trên `document.documentElement`
- Chart colors, tooltip, axis color đều nhận `isDark` làm tham số

### Streak (điểm)
- `STREAK_MIN = 80` — sửa hằng số này để đổi ngưỡng
- Logic: đi lùi từ hôm nay, bỏ qua hôm nay nếu chưa chốt, đếm liên tiếp đến khi gặp ngày không đạt

### Streak (calo)
- Ngưỡng: `netCalories <= CALORIE_BUDGET` (= 1668) và `status === 'submitted'`
- Cùng logic đi lùi như streak điểm

### Recharts scrollable chart
- Không dùng `ResponsiveContainer`; dùng `BarChart width={data.length * 36}` fixed
- Wrapper `div` có `overflow-x-auto`, `scrollbarWidth: 'none'`
- `useEffect` auto-scroll về bên phải (ngày mới nhất) khi mở tab Stats
- Dùng `useRef` cho cả 2 chart: `chartScrollRef` (điểm) và `calChartScrollRef` (calo)

### Monthly average
- Dùng `l.earnedPoints != null ? l.earnedPoints : calculateScore(l.tasks).earned` để tránh tính 0 cho ngày thiếu data
- Trả `null` khi chưa có ngày nào → hiển thị "—"

### Notifications
- `setInterval` 60s, check `hours === 21 && minutes <= 2`
- Key `notified_YYYY-MM-DD` trong localStorage tránh nhắc lặp
- iOS Safari không hỗ trợ — toggle vô hiệu trên iPhone

### PWA
- `vite-plugin-pwa` + `registerType: 'autoUpdate'`
- Để installable đầy đủ trên Android: cần thêm PNG icon 192×192 và 512×512

---

## 10. Cách deploy

**Auto-deploy:** Push lên `main` → Vercel tự build và deploy.

```bash
npx vercel --prod   # manual deploy
```

**Build:** `vite build` → output `dist/`

> **Windows:** Nếu gặp lỗi PowerShell scripts disabled:  
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## 11. TODO còn lại

- [ ] **Thống kê calo nâng cao** — heatmap calo theo tháng (tương tự heatmap điểm)
- [ ] **Biểu đồ so sánh** — điểm + calo trên cùng 1 chart (dual axis)
- [ ] **Share / screenshot** — chia sẻ kết quả ngày lên social

---

## 12. Cách thêm task mới

Mở `src/App.jsx`, tìm `const baseTasks = [...]`, thêm object:

```js
{ id: 18, text: 'Nội dung câu hỏi', weight: 7, type: 'rating', category: 'Chăm sóc bản thân' }
```

- `id`: số duy nhất, không trùng id nào đang có (hiện tại max = 17)
- `weight`: số bất kỳ — hệ thống tự chuẩn hóa về thang 100
- `type`: `'binary'` hoặc `'rating'`
- `category`: một trong 4 giá trị trong `categoryOrder`

---

## 13. Cách build app tương tự từ đầu

```bash
# 1. Khởi tạo
npx create-vite@latest . --template react && npm install

# 2. Thư viện
npm install firebase tailwindcss postcss autoprefixer @tailwindcss/postcss
npm install xlsx recharts vite-plugin-pwa

# 3. Tailwind v4
# postcss.config.js  → { '@tailwindcss/postcss': {}, autoprefixer: {} }
# tailwind.config.js → { content: ["./index.html","./src/**/*.{js,jsx}"], darkMode: 'class' }
# src/index.css      → @import "tailwindcss";
#                      @config "../tailwind.config.js";
#                      @custom-variant dark (&:where(.dark, .dark *));

# 4. vite.config.js
# import { VitePWA } from 'vite-plugin-pwa'
# plugins: [react(), VitePWA({ registerType: 'autoUpdate', manifest: {...} })]

# 5. Firebase
# console.firebase.google.com → Firestore + Anonymous Auth → copy firebaseConfig

# 6. Deploy
git init && git add . && git commit -m "init"
git remote add origin <github-url> && git push -u origin main
npx vercel --prod
```

**Firestore Security Rules:**
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

## 14. Môi trường phát triển

- OS: Windows 11 Enterprise
- Node.js: v22.11.0 (note: Vite 8 yêu cầu ≥22.12 nhưng vẫn chạy được với 22.11)
- npm: 10.9.0
- Shell: PowerShell (cần set ExecutionPolicy trước khi dùng npx)
- Editor: VS Code + Tailwind CSS IntelliSense extension

---

## 15. Lịch sử phiên bản

| Version | Ngày | Nội dung |
|---|---|---|
| v1 | 2026-06-04 | MVP: performance tracker + nutrition + diary + Firestore sync |
| v2 | 2026-06-04 | Dark mode, Recharts, streak (60→80), notifications, PWA, Excel/JSON export |
| v3 | 2026-06-05 | Chart 30 ngày scrollable, monthly avg fix, footer height fix, streak threshold 80 |
| v4 | 2026-06-05 | Calorie tracker: burned, rượu mạnh 🥃, rượu vang 🍷, bia 500/330, NET vs budget 1668, calorie chart + streak trong Stats |
| v5 | 2026-06-05 | Nutrition UX: bỏ text input giữ kcal 2-col, đổi icon rượu, streak calo màu đen, bar chart đậm/nhạt/trống |
| v6 | 2026-06-05 | PWA PNG icons (192+512), custom budget calo, advanced stats (best day/weakest cat/heatmap), iOS notification guide |

---

*Cập nhật lần cuối: 2026-06-05 — v6 final (all TODOs done).*

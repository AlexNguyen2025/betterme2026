import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const firebaseConfig = {
  apiKey: "AIzaSyD_5ozURJB43s2f_YjHRunWXtIajBcQnQY",
  authDomain: "betterme042026.firebaseapp.com",
  projectId: "betterme042026",
  storageBucket: "betterme042026.firebasestorage.app",
  messagingSenderId: "306816185412",
  appId: "1:306816185412:web:ccfdb32330e80e2080f811"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const myUserId = "Admin_Tuan_123";
const STREAK_MIN = 60;

const baseTasks = [
  { id: 15, text: 'Bạn có tập luyện cardio?', weight: 8, type: 'rating', category: 'Chăm sóc bản thân' },
  { id: 16, text: 'Bạn có tranh thủ thời gian cho Body weight / gym?', weight: 8, type: 'rating', category: 'Chăm sóc bản thân' },
  { id: 9, text: '(Đối phó với kẻ thù số 1) Bạn có sử dụng rượu như cam kết không?', weight: 9, type: 'binary', category: 'Chăm sóc bản thân' },
  { id: 17, text: 'Bạn có hài lòng với chế độ kiểm soát ăn uống của mình trong ngày hôm nay không?', weight: 8, type: 'rating', category: 'Chăm sóc bản thân' },
  { id: 13, text: 'Bạn chắc rằng mình không tự hủy hoại bản thân bằng bia để có thể đi ngủ chứ?', weight: 13.5, type: 'binary', category: 'Chăm sóc bản thân' },
  { id: 12, text: 'Bạn có đánh răng buổi tối?', weight: 3, type: 'binary', category: 'Chăm sóc bản thân' },
  { id: 5, text: 'Bạn lo cho chuyện của trời, chuyện của người khác hay bạn nuôi dưỡng mục tiêu của mình?', weight: 8, type: 'rating', category: 'Tư duy chuẩn' },
  { id: 7, text: 'Bạn có nhăn nhó, lên giọng, nổi cáu với người khác không? hay bạn tìm 1 cách điềm đạm hơn để tiếp cận?', weight: 9, type: 'rating', category: 'Tư duy chuẩn' },
  { id: 8, text: 'Đường đời không thiếu những đống shit và tiếng chó sủa, bạn có nhận diện những suy nghĩ tiêu cực và chuyển hóa chúng?', weight: 8, type: 'rating', category: 'Tư duy chuẩn' },
  { id: 6, text: 'Bạn có dành ra vài phút để kiểm soát cuộc đời bạn trong ngày hôm nay không?', weight: 6, type: 'binary', category: 'Tư duy chuẩn' },
  { id: 3, text: 'Plan ahead and deep work (IMPORTANT)', weight: 10, type: 'rating', category: 'Tiến về phía trước' },
  { id: 2, text: 'Hoàn thành full quest Duolingo chứ?', weight: 5, type: 'binary', category: 'Tiến về phía trước' },
  { id: 4, text: 'Học tập trung tiếng Pháp ít nhất 45 phút (IMPORTANT)', weight: 8, type: 'rating', category: 'Tiến về phía trước' },
  { id: 11, text: 'Dạy dỗ con cái, chăm sóc bố mẹ', weight: 10, type: 'rating', category: 'Tiến về phía trước' },
  { id: 14, text: 'Ngày hôm nay, bạn có hài lòng với chính mình không?', weight: 10, type: 'rating', category: 'Tổng kết' },
];

const categoryOrder = ['Chăm sóc bản thân', 'Tư duy chuẩn', 'Tiến về phía trước', 'Tổng kết'];

export default function App() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayTasks, setTodayTasks] = useState([]);
  const [reflections, setReflections] = useState({ proud: '', better: '', lesson: '' });
  const [dailyJournal, setDailyJournal] = useState('');
  const [meals, setMeals] = useState({
    breakfastText: '', breakfastCal: '',
    lunchText: '', lunchCal: '',
    dinnerText: '', dinnerCal: '',
    snackText: '', snackCal: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [history, setHistory] = useState([]);
  const [syncStatus, setSyncStatus] = useState('Đang tải...');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ── New features state ──────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [notifEnabled, setNotifEnabled] = useState(
    () => localStorage.getItem('notifEnabled') === 'true'
  );

  // ── Dark mode effect ────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const getDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const selectedDateStr = getDateStr(selectedDate);
  const isToday = selectedDateStr === getDateStr(new Date());

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let live = true;
    signInAnonymously(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, () => { if (live) setUser({ uid: myUserId }); });
    return () => { live = false; unsub(); };
  }, []);

  // ── Firestore sync ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const dayRef = doc(db, 'users', myUserId, 'daily_logs', selectedDateStr);
    const colRef = collection(db, 'users', myUserId, 'daily_logs');

    const unsubDay = onSnapshot(dayRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setTodayTasks(d.tasks || []);
        setDailyJournal(d.dailyJournal || '');
        setMeals({
          breakfastText: d.meals?.breakfastText || '', breakfastCal: d.meals?.breakfastCal || '',
          lunchText: d.meals?.lunchText || '', lunchCal: d.meals?.lunchCal || '',
          dinnerText: d.meals?.dinnerText || '', dinnerCal: d.meals?.dinnerCal || '',
          snackText: d.meals?.snackText || '', snackCal: d.meals?.snackCal || ''
        });
        setReflections({ proud: d.reflections?.proud || '', better: d.reflections?.better || '', lesson: d.reflections?.lesson || '' });
        setIsSubmitted(d.status === 'submitted');
      } else {
        setTodayTasks(baseTasks.map(t => ({ id: t.id, status: 'pending', comment: '' })));
        setDailyJournal('');
        setMeals({ breakfastText: '', breakfastCal: '', lunchText: '', lunchCal: '', dinnerText: '', dinnerCal: '', snackText: '', snackCal: '' });
        setReflections({ proud: '', better: '', lesson: '' });
        setIsSubmitted(false);
      }
      setIsLoading(false);
      setSyncStatus('Đã đồng bộ ✓');
    }, () => { setSyncStatus('Lỗi kết nối'); setIsLoading(false); });

    const unsubCol = onSnapshot(colRef, (snap) => {
      const logs = [];
      snap.forEach(d => logs.push(d.data()));
      setHistory(logs.sort((a, b) => a.date.localeCompare(b.date)));
    });

    return () => { unsubDay(); unsubCol(); };
  }, [user, selectedDateStr]);

  // ── Notification reminder at 21:00 ─────────────────────────────────────
  useEffect(() => {
    if (!notifEnabled || notifPermission !== 'granted') return;
    const check = () => {
      const now = new Date();
      if (now.getHours() !== 21 || now.getMinutes() > 2) return;
      const key = `notified_${getDateStr(now)}`;
      if (localStorage.getItem(key)) return;
      const todayLog = history.find(h => h.date === getDateStr(now));
      if (todayLog?.status === 'submitted') return;
      new Notification('Better Me 2026 🎯', {
        body: 'Đã 9 giờ tối! Đừng quên chấm điểm ngày hôm nay nhé.',
        icon: '/favicon.svg',
        tag: 'daily-reminder'
      });
      localStorage.setItem(key, '1');
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [notifEnabled, notifPermission, history]);

  // ── Score logic ─────────────────────────────────────────────────────────
  const calculateScore = (tasks) => {
    let totalW = 0, earnedRaw = 0;
    tasks.forEach(t => {
      const base = baseTasks.find(b => b.id === t.id);
      if (base && t.status !== 'na') totalW += base.weight;
    });
    if (!totalW) return { total: 0, earned: 0, percent: 0 };
    tasks.forEach(t => {
      const base = baseTasks.find(b => b.id === t.id);
      if (!base || t.status === 'na') return;
      const w = (base.weight / totalW) * 100;
      if (base.type === 'binary') { if (t.status === 'completed') earnedRaw += w; }
      else { earnedRaw += w * ({ good: 1, quite_good: 0.8, average: 0.5, bad: 0 }[t.status] || 0); }
    });
    const earned = Math.round(earnedRaw);
    return { total: 100, earned, percent: earned };
  };

  // ── Streak ──────────────────────────────────────────────────────────────
  const getStreak = () => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const log = history.find(h => h.date === getDateStr(d));
      const good = log && log.status === 'submitted' && (log.earnedPoints || 0) >= STREAK_MIN;
      if (i === 0 && !good) continue;
      if (!good) break;
      streak++;
    }
    return streak;
  };

  // ── Monthly average ─────────────────────────────────────────────────────
  const getMonthlyAvg = () => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const logs = history.filter(h => h.date.startsWith(prefix) && h.status === 'submitted');
    if (!logs.length) return 0;
    return Math.round(logs.reduce((s, l) => s + (l.earnedPoints || 0), 0) / logs.length);
  };

  // ── Chart data (7 days) ─────────────────────────────────────────────────
  const getChartData = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = getDateStr(d);
      const log = history.find(h => h.date === dateStr);
      return {
        day: i === 6 ? 'Nay' : d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        earned: log ? (log.earnedPoints || calculateScore(log.tasks || []).earned) : 0,
        submitted: log?.status === 'submitted'
      };
    });
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const score = calculateScore(todayTasks);
  const totalCal = [meals.breakfastCal, meals.lunchCal, meals.dinnerCal, meals.snackCal]
    .reduce((s, v) => s + Number(v || 0), 0);
  const streak = getStreak();
  const monthlyAvg = getMonthlyAvg();
  const chartData = getChartData();

  const barColor = (entry) => {
    if (!entry.submitted) return isDark ? '#374151' : '#e5e7eb';
    if (entry.earned >= 80) return isDark ? '#ffffff' : '#000000';
    if (entry.earned >= 60) return '#6b7280';
    return '#d1d5db';
  };

  // ── Cloud sync ──────────────────────────────────────────────────────────
  const syncToCloud = async (tasks, journal, mls, refs, status) => {
    if (!user) return;
    setSyncStatus('Đang lưu...');
    try {
      const s = calculateScore(tasks);
      await setDoc(doc(db, 'users', myUserId, 'daily_logs', selectedDateStr), {
        date: selectedDateStr, tasks, dailyJournal: journal, meals: mls, reflections: refs,
        percent: s.percent, totalPoints: s.total, earnedPoints: s.earned, status
      }, { merge: true });
      setTimeout(() => setSyncStatus('Đã lưu Cloud ✓'), 500);
    } catch { setSyncStatus('Lỗi mạng!'); }
  };

  // ── Export Excel ────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!history.length) return;
    const rows = history.map(l => ({
      'Ngày': l.date, 'Điểm': l.earnedPoints ?? 0,
      'Trạng thái': l.status === 'submitted' ? 'Đã chốt' : 'Nháp',
      'Nhật ký': l.dailyJournal || '',
      'Điều tự hào': l.reflections?.proud || '',
      'Cần tốt hơn': l.reflections?.better || '',
      'Bài học': l.reflections?.lesson || '',
      'Bữa sáng': l.meals?.breakfastText || '', 'Cal sáng': l.meals?.breakfastCal || '',
      'Bữa trưa': l.meals?.lunchText || '', 'Cal trưa': l.meals?.lunchCal || '',
      'Bữa tối': l.meals?.dinnerText || '', 'Cal tối': l.meals?.dinnerCal || '',
      'Ăn vặt': l.meals?.snackText || '', 'Cal vặt': l.meals?.snackCal || '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Better Me 2026');
    XLSX.writeFile(wb, `BetterMe_${getDateStr(new Date())}.xlsx`);
  };

  // ── Export JSON ─────────────────────────────────────────────────────────
  const exportJSON = () => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })),
      download: `BetterMe_backup_${getDateStr(new Date())}.json`
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Notification toggle ─────────────────────────────────────────────────
  const toggleNotif = async () => {
    if (notifPermission === 'unsupported') return;
    if (notifEnabled) {
      setNotifEnabled(false);
      localStorage.setItem('notifEnabled', 'false');
      return;
    }
    if (notifPermission === 'denied') {
      alert('Thông báo bị chặn. Hãy vào cài đặt trình duyệt để cho phép.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setNotifEnabled(true);
      localStorage.setItem('notifEnabled', 'true');
    }
  };

  // ── Task handlers ───────────────────────────────────────────────────────
  const setStatus = (id, s) => {
    if (isSubmitted) return;
    const updated = todayTasks.map(t => t.id === id ? { ...t, status: s } : t);
    setTodayTasks(updated);
    syncToCloud(updated, dailyJournal, meals, reflections, 'draft');
  };
  const setComment = (id, v) => {
    if (isSubmitted) return;
    setTodayTasks(prev => prev.map(t => t.id === id ? { ...t, comment: v } : t));
  };
  const handleBlur = () => syncToCloud(todayTasks, dailyJournal, meals, reflections, 'draft');

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitted(true);
    await setDoc(doc(db, 'users', myUserId, 'daily_logs', selectedDateStr), { status: 'submitted' }, { merge: true });
  };
  const handleRevise = async () => {
    setIsSubmitted(false);
    await setDoc(doc(db, 'users', myUserId, 'daily_logs', selectedDateStr), { status: 'draft' }, { merge: true });
  };

  const statusLabel = (status, type) => {
    if (status === 'na') return <span className="text-gray-400 italic">N/A</span>;
    if (status === 'pending') return <span className="text-rose-500 font-bold uppercase text-xs">Chưa đánh giá</span>;
    if (type === 'binary') return status === 'completed'
      ? <span className="text-black dark:text-white font-medium">Có / Đạt</span>
      : <span className="text-gray-500">Không</span>;
    return <span className="text-black dark:text-white font-medium">{{ good: 'Tốt', quite_good: 'Khá', average: 'Trung bình', bad: 'Tệ' }[status]}</span>;
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400 font-light tracking-widest uppercase text-xs">
      Loading...
    </div>
  );

  // ── Shared class helpers ────────────────────────────────────────────────
  const card = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800';
  const divider = 'border-t border-gray-200 dark:border-gray-700';
  const axisColor = isDark ? '#6b7280' : '#9ca3af';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans flex justify-center">
      <div className={`w-full max-w-md bg-white dark:bg-gray-900 min-h-screen flex flex-col relative pb-32 border-x border-gray-100 dark:border-gray-800 shadow-xl`}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeDate(-1)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-sm tracking-widest uppercase font-bold text-gray-600 dark:text-gray-400">
              {isToday ? 'Hôm nay' : selectedDate.toLocaleDateString('vi-VN')}
            </span>
            <button onClick={() => changeDate(1)} disabled={isToday} className={`p-2 ${isToday ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div className="flex justify-between items-center">
            <h1 className="text-[17px] font-black tracking-tighter text-black dark:text-white uppercase">BETTER ME - ANTOINE 2026</h1>
            <div className="flex items-center gap-2">
              {/* Dark mode toggle */}
              <button onClick={() => setIsDark(d => !d)} className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                {isDark
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </button>
              <div className={`text-[9px] px-2 py-1 rounded border font-bold tracking-wide uppercase ${syncStatus === 'Đang lưu...' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' : 'text-green-600 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'}`}>
                {syncStatus}
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ── TAB: PERFORMANCE ───────────────────────────────────────── */}
          {activeTab === 'performance' && (
            <div className="space-y-8">
              <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <p className="text-[13.5px] text-gray-500 dark:text-gray-400 italic leading-relaxed text-center font-medium">
                  "Mục tiêu của bạn cần một người nuôi dưỡng chăm sóc vun trồng mỗi ngày" - Jim Rohn
                </p>
              </div>

              {/* Score card */}
              <div className="bg-black text-white p-5 rounded-2xl shadow-md">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Điểm số trong ngày</p>
                    <span className="text-4xl font-black">{score.earned}</span>
                  </div>
                  <div className="text-xs text-gray-400 font-medium pb-1">Mục tiêu: {score.total}</div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="h-full bg-white transition-all duration-700 ease-out" style={{ width: `${score.percent}%` }} />
                </div>
              </div>

              {isSubmitted && <div className="text-center text-xs tracking-widest text-gray-400 uppercase py-2">— DỮ LIỆU ĐÃ KHÓA —</div>}

              {/* Tasks by category */}
              {categoryOrder.map(cat => (
                <div key={cat}>
                  <div className="flex items-center mb-4">
                    <div className={`flex-1 ${divider}`} />
                    <span className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{cat}</span>
                    <div className={`flex-1 ${divider}`} />
                  </div>
                  <div className="space-y-5">
                    {baseTasks.filter(t => t.category === cat).map(base => {
                      const st = todayTasks.find(t => t.id === base.id) || { status: 'pending', comment: '' };
                      const isNA = st.status === 'na';
                      return (
                        <div key={base.id} className={`transition-all duration-300 ${isNA ? 'opacity-40 grayscale' : ''}`}>
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[15px] font-medium leading-snug pr-4 ${isNA ? 'line-through text-gray-400' : 'text-black dark:text-white'}`}>
                              {base.text}
                            </span>
                            {!isSubmitted && (
                              <button onClick={() => setStatus(base.id, isNA ? 'pending' : 'na')}
                                className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${isNA ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                N/A
                              </button>
                            )}
                          </div>

                          {isSubmitted
                            ? <div className="text-sm pb-1">{statusLabel(st.status, base.type)}</div>
                            : !isNA && (
                              base.type === 'binary'
                                ? <div className="flex gap-2">
                                    {['failed', 'completed'].map(s => (
                                      <button key={s} onClick={() => setStatus(base.id, s)}
                                        className={`flex-1 py-2.5 text-[13px] font-semibold border rounded-lg transition-all ${st.status === s ? 'bg-black dark:bg-white text-white dark:text-black border-transparent' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                                        {s === 'failed' ? 'Không' : 'Có / Đạt'}
                                      </button>
                                    ))}
                                  </div>
                                : <div className="flex gap-1.5">
                                    {['bad', 'average', 'quite_good', 'good'].map(s => (
                                      <button key={s} onClick={() => setStatus(base.id, s)}
                                        className={`flex-1 py-2.5 text-[13px] font-semibold border rounded-lg transition-all ${st.status === s ? 'bg-black dark:bg-white text-white dark:text-black border-transparent' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                                        {s === 'bad' ? 'Tệ' : s === 'average' ? 'TB' : s === 'quite_good' ? 'Khá' : 'Tốt'}
                                      </button>
                                    ))}
                                  </div>
                            )
                          }
                          {!isNA && (
                            <input type="text" placeholder="Ghi chú thêm (không bắt buộc)..."
                              value={st.comment || ''}
                              onChange={e => setComment(base.id, e.target.value)}
                              onBlur={handleBlur}
                              readOnly={isSubmitted}
                              className={`w-full mt-2 text-[12px] px-3 py-2.5 rounded-lg border outline-none transition-colors ${
                                isSubmitted && !st.comment ? 'hidden'
                                : isSubmitted ? 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 italic px-0'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Reflections */}
              <div className={`pt-6 ${divider}`}>
                <p className="text-center text-[11px] tracking-widest text-gray-400 uppercase font-semibold mb-6">— TỰ TRUY VẤN CUỐI NGÀY —</p>
                {['proud', 'better', 'lesson'].map(f => (
                  <div key={f} className="mb-6">
                    <label className="block text-[13px] font-semibold text-black dark:text-white mb-2">
                      {f === 'proud' ? '1. Điều tự hào' : f === 'better' ? '2. Cần làm tốt hơn' : '3. Bài học'}
                    </label>
                    <textarea value={reflections[f]}
                      onChange={e => !isSubmitted && setReflections(p => ({ ...p, [f]: e.target.value }))}
                      onBlur={handleBlur}
                      placeholder="Không bắt buộc điền..."
                      readOnly={isSubmitted}
                      className={`w-full border rounded-xl p-3 text-[14px] min-h-[90px] outline-none transition-colors resize-none ${
                        isSubmitted ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 italic'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-black dark:text-white focus:border-black dark:focus:border-white'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: NUTRITION ─────────────────────────────────────────── */}
          {activeTab === 'nutrition' && (
            <div className="space-y-4">
              <div className="flex items-center mb-2">
                <div className={`flex-1 ${divider}`} />
                <span className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nhật ký ăn uống</span>
                <div className={`flex-1 ${divider}`} />
              </div>
              {[
                { ft: 'breakfastText', fc: 'breakfastCal', label: '🍳 Bữa Sáng' },
                { ft: 'lunchText', fc: 'lunchCal', label: '🍱 Bữa Trưa' },
                { ft: 'dinnerText', fc: 'dinnerCal', label: '🍲 Bữa Tối' },
                { ft: 'snackText', fc: 'snackCal', label: '🍎 Ăn vặt / Khác' }
              ].map(item => (
                <div key={item.label} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{item.label}</span>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ăn gì..." value={meals[item.ft]}
                      onChange={e => !isSubmitted && setMeals(p => ({ ...p, [item.ft]: e.target.value }))}
                      onBlur={handleBlur} readOnly={isSubmitted}
                      className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:border-gray-400 dark:focus:border-gray-500" />
                    <input type="number" placeholder="Kcal" value={meals[item.fc]}
                      onChange={e => !isSubmitted && setMeals(p => ({ ...p, [item.fc]: e.target.value }))}
                      onBlur={handleBlur} readOnly={isSubmitted}
                      className="w-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2.5 text-sm text-center font-bold outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:border-gray-400 dark:focus:border-gray-500" />
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/40">
                <span className="text-[13px] font-bold text-orange-700 dark:text-orange-400">🔥 Tổng Calo nạp vào:</span>
                <span className="text-xl font-black text-orange-600 dark:text-orange-400">{totalCal} <span className="text-xs font-medium">kcal</span></span>
              </div>
            </div>
          )}

          {/* ── TAB: DIARY ─────────────────────────────────────────────── */}
          {activeTab === 'diary' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-4">
                <div className={`flex-1 ${divider}`} />
                <span className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ghi chép tự do</span>
                <div className={`flex-1 ${divider}`} />
              </div>
              <textarea value={dailyJournal}
                onChange={e => !isSubmitted && setDailyJournal(e.target.value)}
                onBlur={handleBlur}
                readOnly={isSubmitted}
                placeholder="Hãy viết ra bất cứ điều gì bạn đang suy nghĩ..."
                className={`w-full p-5 text-[15px] leading-relaxed rounded-2xl border outline-none resize-none min-h-[60vh] transition-all ${
                  isSubmitted ? 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-500 dark:text-gray-400 italic'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-gray-700 focus:border-black dark:focus:border-white'
                }`}
              />
            </div>
          )}

          {/* ── TAB: STATS ─────────────────────────────────────────────── */}
          {activeTab === 'stats' && (
            <div className="space-y-4">

              {/* Streak + Monthly avg */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black text-white p-4 rounded-2xl">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-1">Streak 🔥</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-3xl font-black">{streak}</span>
                    <span className="text-gray-400 text-xs pb-0.5">ngày ≥{STREAK_MIN}đ</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-1">TB tháng này 📊</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-3xl font-black text-black dark:text-white">{monthlyAvg}</span>
                    <span className="text-gray-400 text-xs pb-0.5">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Recharts bar chart */}
              <div className={`${card} p-4 shadow-sm`}>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-4">Điểm 7 ngày gần nhất</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 18, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f3f4f6'} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                      contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: 8, color: isDark ? '#f9fafb' : '#111', fontSize: 12 }}
                      formatter={v => [`${v} điểm`, '']}
                    />
                    <Bar dataKey="earned" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {chartData.map((entry, i) => <Cell key={i} fill={barColor(entry)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3 justify-center">
                  {[
                    { color: isDark ? 'bg-white' : 'bg-black', label: '≥ 80' },
                    { color: 'bg-gray-400', label: '≥ 60' },
                    { color: isDark ? 'bg-gray-600' : 'bg-gray-200', label: 'Chưa đạt' }
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                      <span className="text-[10px] text-gray-400">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export buttons */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Xuất dữ liệu ({history.length} ngày)</p>
                <div className="space-y-2">
                  <button onClick={exportExcel}
                    className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    📥 Xuất Excel (.xlsx)
                  </button>
                  <button onClick={exportJSON}
                    className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    💾 Backup JSON
                  </button>
                </div>
              </div>

              {/* Notification settings */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[13px] font-bold text-black dark:text-white">🔔 Nhắc nhở buổi tối</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {notifPermission === 'unsupported' ? 'Thiết bị không hỗ trợ'
                        : notifPermission === 'denied' ? 'Bị chặn — mở trong cài đặt trình duyệt'
                        : notifEnabled ? 'Đang bật — nhắc lúc 21:00 mỗi ngày'
                        : 'Tắt — nhấn để bật'}
                    </p>
                  </div>
                  <button onClick={toggleNotif}
                    disabled={notifPermission === 'unsupported' || notifPermission === 'denied'}
                    className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-40 ${notifEnabled && notifPermission === 'granted' ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all ${notifEnabled && notifPermission === 'granted' ? 'left-[26px] bg-white dark:bg-gray-900' : 'left-0.5 bg-white dark:bg-gray-300'}`} />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 w-full max-w-md bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-5 pb-24 pt-3 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="mb-3">
            {!isSubmitted
              ? <button onClick={() => setShowConfirmModal(true)} className="w-full bg-black text-white font-bold py-3.5 rounded-xl text-xs tracking-widest uppercase shadow-lg active:scale-95 transition-transform">CHỐT SỔ HÔM NAY</button>
              : <button onClick={handleRevise} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3.5 rounded-xl text-xs tracking-widest uppercase active:scale-95 transition-transform">MỞ KHÓA ĐỂ SỬA</button>
            }
          </div>
          <div className="flex justify-between items-center px-2 py-1">
            {[
              { id: 'performance', label: 'Perform', active: 'text-black dark:text-white',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
              { id: 'nutrition', label: 'Nutrition', active: 'text-orange-500',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg> },
              { id: 'diary', label: 'Diary', active: 'text-blue-500',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
              { id: 'stats', label: 'Stats', active: 'text-black dark:text-white',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === tab.id ? tab.active : 'text-gray-300 dark:text-gray-600'}`}>
                {tab.icon}
                <span className="text-[9px] font-black mt-1 uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── MODAL ──────────────────────────────────────────────────────── */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-3xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-black text-black dark:text-white mb-2">Chốt sổ ngày này?</h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium mb-6">Bạn vẫn có thể mở khóa để sửa nếu cần. Dữ liệu sẽ được đồng bộ.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs tracking-widest uppercase">Hủy</button>
                <button onClick={confirmSubmit} className="flex-1 py-3.5 bg-black text-white font-bold rounded-xl text-xs tracking-widest uppercase">Đồng ý</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

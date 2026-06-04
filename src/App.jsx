import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// 1. Khởi tạo Firebase
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

// ID TRUY CẬP VÀO TỦ ĐỒ CŨ (GIỮ LẠI LỊCH SỬ DỮ LIỆU)
const myUserId = "Admin_Tuan_123";

// 2. Danh sách phân loại ĐÃ ĐƯỢC CHIA NHÓM VÀ CẬP NHẬT TỪ NGỮ CHUẨN
const baseTasks = [
  // --- CHĂM SÓC BẢN THÂN ---
  { id: 15, text: 'Bạn có tập luyện cardio?', weight: 8, type: 'rating', category: 'Chăm sóc bản thân' },
  { id: 16, text: 'Bạn có tranh thủ thời gian cho Body weight / gym?', weight: 8, type: 'rating', category: 'Chăm sóc bản thân' },
  { id: 9, text: '(Đối phó với kẻ thù số 1) Bạn có sử dụng rượu như cam kết không?', weight: 9, type: 'binary', category: 'Chăm sóc bản thân' },
  { id: 17, text: 'Bạn có hài lòng với chế độ kiểm soát ăn uống của mình trong ngày hôm nay không?', weight: 8, type: 'rating', category: 'Chăm sóc bản thân' },
  { id: 13, text: 'Bạn chắc rằng mình không tự hủy hoại bản thân bằng bia để có thể đi ngủ chứ?', weight: 13.5, type: 'binary', category: 'Chăm sóc bản thân' },
  { id: 12, text: 'Bạn có đánh răng buổi tối?', weight: 3, type: 'binary', category: 'Chăm sóc bản thân' },

  // --- TƯ DUY CHUẨN ---
  { id: 5, text: 'Bạn lo cho chuyện của trời, chuyện của người khác hay bạn nuôi dưỡng mục tiêu của mình?', weight: 8, type: 'rating', category: 'Tư duy chuẩn' },
  { id: 7, text: 'Bạn có nhăn nhó, lên giọng, nổi cáu với người khác không? hay bạn tìm 1 cách điềm đạm hơn để tiếp cận?', weight: 9, type: 'rating', category: 'Tư duy chuẩn' },
  { id: 8, text: 'Đường đời không thiếu những đống shit và tiếng chó sủa, bạn có nhận diện những suy nghĩ tiêu cực và chuyển hóa chúng?', weight: 8, type: 'rating', category: 'Tư duy chuẩn' },
  { id: 6, text: 'Bạn có dành ra vài phút để kiểm soát cuộc đời bạn trong ngày hôm nay không?', weight: 6, type: 'binary', category: 'Tư duy chuẩn' },

  // --- TIẾN VỀ PHÍA TRƯỚC ---
  { id: 3, text: 'Plan ahead and deep work (IMPORTANT)', weight: 10, type: 'rating', category: 'Tiến về phía trước' },
  { id: 2, text: 'Hoàn thành full quest Duolingo chứ?', weight: 5, type: 'binary', category: 'Tiến về phía trước' },
  { id: 4, text: 'Học tập trung tiếng Pháp ít nhất 45 phút (IMPORTANT)', weight: 8, type: 'rating', category: 'Tiến về phía trước' },
  { id: 11, text: 'Dạy dỗ con cái, chăm sóc bố mẹ', weight: 10, type: 'rating', category: 'Tiến về phía trước' },

  // --- TỔNG KẾT ---
  { id: 14, text: 'Ngày hôm nay, bạn có hài lòng với chính mình không?', weight: 10, type: 'rating', category: 'Tổng kết' },
];

const categoryOrder = ['Chăm sóc bản thân', 'Tư duy chuẩn', 'Tiến về phía trước', 'Tổng kết'];

export default function App() {
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
  const [syncStatus, setSyncStatus] = useState("Đang tải...");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getDateStr = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDateStr = getDateStr(selectedDate);
  const isToday = selectedDateStr === getDateStr(new Date());

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // --- Auth & Lấy dữ liệu ---
  useEffect(() => {
    let isSubscribed = true;
    signInAnonymously(auth).catch(err => console.log(err));
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isSubscribed) setUser({ uid: myUserId });
    });
    return () => { isSubscribed = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const todayDocRef = doc(db, 'users', myUserId, 'daily_logs', selectedDateStr);
    const historyColRef = collection(db, 'users', myUserId, 'daily_logs');

    const unsubToday = onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTodayTasks(data.tasks || []);
        setDailyJournal(data.dailyJournal || '');
        setMeals({
          breakfastText: data.meals?.breakfastText || '', breakfastCal: data.meals?.breakfastCal || '',
          lunchText: data.meals?.lunchText || '', lunchCal: data.meals?.lunchCal || '',
          dinnerText: data.meals?.dinnerText || '', dinnerCal: data.meals?.dinnerCal || '',
          snackText: data.meals?.snackText || '', snackCal: data.meals?.snackCal || ''
        });
        setReflections({
          proud: data.reflections?.proud || '', better: data.reflections?.better || '', lesson: data.reflections?.lesson || ''
        });
        setIsSubmitted(data.status === 'submitted');
      } else {
        setTodayTasks(baseTasks.map(t => ({ id: t.id, status: 'pending', comment: '' })));
        setDailyJournal('');
        setMeals({ breakfastText: '', breakfastCal: '', lunchText: '', lunchCal: '', dinnerText: '', dinnerCal: '', snackText: '', snackCal: '' });
        setReflections({ proud: '', better: '', lesson: '' });
        setIsSubmitted(false);
      }
      setIsLoading(false);
      setSyncStatus("Đã đồng bộ ✓");
    }, () => {
      setSyncStatus("Lỗi kết nối");
      setIsLoading(false);
    });

    const unsubHistory = onSnapshot(historyColRef, (snap) => {
      const logs = [];
      snap.forEach(d => logs.push(d.data()));
      logs.sort((a, b) => a.date.localeCompare(b.date));
      setHistory(logs);
    });

    return () => { unsubToday(); unsubHistory(); };
  }, [user, selectedDateStr]);

  // --- Logic Điểm ---
  const calculateScore = (tasksCurrentState) => {
    let totalValidWeight = 0; let earnedRaw = 0;
    tasksCurrentState.forEach(task => {
      const baseTask = baseTasks.find(t => t.id === task.id);
      if (baseTask && task.status !== 'na') totalValidWeight += baseTask.weight;
    });
    if (totalValidWeight === 0) return { total: 0, earned: 0, percent: 0 };
    tasksCurrentState.forEach(task => {
      const baseTask = baseTasks.find(t => t.id === task.id);
      if (!baseTask || task.status === 'na') return;
      const newWeightValue = (baseTask.weight / totalValidWeight) * 100;
      if (baseTask.type === 'binary') { if (task.status === 'completed') earnedRaw += newWeightValue; }
      else if (baseTask.type === 'rating') {
        const factor = { good: 1, quite_good: 0.8, average: 0.5, bad: 0 }[task.status] || 0;
        earnedRaw += newWeightValue * factor;
      }
    });
    return { total: 100, earned: Math.round(earnedRaw), percent: Math.round(earnedRaw) };
  };

  const currentScoreData = calculateScore(todayTasks);
  const totalCalories = Number(meals.breakfastCal || 0) + Number(meals.lunchCal || 0) + Number(meals.dinnerCal || 0) + Number(meals.snackCal || 0);

  // --- Sync ---
  const syncToCloud = async (tasksData, journalData, mealsData, refsData, statusStr) => {
    if (!user) return;
    setSyncStatus("Đang lưu...");
    try {
      const score = calculateScore(tasksData);
      await setDoc(doc(db, 'users', myUserId, 'daily_logs', selectedDateStr), {
        date: selectedDateStr,
        tasks: tasksData,
        dailyJournal: journalData,
        meals: mealsData,
        reflections: refsData,
        percent: score.percent,
        totalPoints: score.total,
        earnedPoints: score.earned,
        status: statusStr
      }, { merge: true });
      setTimeout(() => setSyncStatus("Đã lưu Cloud ✓"), 500);
    } catch (e) { setSyncStatus("Lỗi mạng!"); }
  };

  const setStatus = (id, s) => {
    if (isSubmitted) return;
    const updated = todayTasks.map((t) => (t.id === id ? { ...t, status: s } : t));
    setTodayTasks(updated);
    syncToCloud(updated, dailyJournal, meals, reflections, "draft");
  };

  const setTaskComment = (id, commentStr) => {
    if (isSubmitted) return;
    const updated = todayTasks.map((t) => (t.id === id ? { ...t, comment: commentStr } : t));
    setTodayTasks(updated);
  };

  const handleJournalChange = (val) => { if (!isSubmitted) setDailyJournal(val); };
  const handleMealChange = (field, val) => { if (!isSubmitted) setMeals(prev => ({ ...prev, [field]: val })); };
  const handleReflectionChange = (f, v) => { if (!isSubmitted) setReflections(prev => ({ ...prev, [f]: v })); };

  const handleTextBlur = () => {
    syncToCloud(todayTasks, dailyJournal, meals, reflections, "draft");
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitted(true);
    await setDoc(doc(db, 'users', myUserId, 'daily_logs', selectedDateStr), { status: 'submitted' }, { merge: true });
  };

  const handleRevise = async () => {
    setIsSubmitted(false);
    await setDoc(doc(db, 'users', myUserId, 'daily_logs', selectedDateStr), { status: 'draft' }, { merge: true });
  };

  // --- Biểu đồ ---
  const getChartData = () => {
    const data = []; const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const dateStr = getDateStr(d); const log = history.find(h => h.date === dateStr);
      let earned = log ? (log.earnedPoints || calculateScore(log.tasks || []).earned) : 0;
      data.push({ dayName: i === 0 ? 'Nay' : d.toLocaleDateString('vi-VN', { weekday: 'short' }), earned });
    }
    return data;
  };

  const getStatusDisplay = (status, type) => {
    if (status === 'na') return <span className="text-gray-400 italic">N/A</span>;
    if (status === 'pending') return <span className="text-rose-500 font-bold uppercase text-xs">Chưa đánh giá</span>;
    if (type === 'binary') {
      return status === 'completed' ? <span className="text-black font-medium">Có / Đạt</span> : <span className="text-gray-500">Không</span>;
    } else {
      const maps = { 'good': 'Tốt', 'quite_good': 'Khá', 'average': 'Trung bình', 'bad': 'Tệ' };
      return <span className="text-black font-medium">{maps[status]}</span>;
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-light tracking-widest uppercase text-xs">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex justify-center selection:bg-gray-200 relative">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col relative pb-32 border-x border-gray-100 shadow-xl">

        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-6 py-5 border-b border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeDate(-1)} className="p-2 text-gray-400 hover:text-black"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
            <div className="text-sm tracking-widest uppercase font-bold text-gray-600">{isToday ? "Hôm nay" : selectedDate.toLocaleDateString('vi-VN')}</div>
            <button onClick={() => changeDate(1)} disabled={isToday} className={`p-2 ${isToday ? 'text-gray-200' : 'text-gray-400 hover:text-black'}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          </div>
          <div className="flex justify-between items-end">
            <h1 className="text-[17px] font-black tracking-tighter text-black uppercase">BETTER ME - ANTOINE 2026</h1>
            <div className={`text-[9px] px-2 py-1 rounded border font-bold tracking-wide uppercase ${syncStatus === "Đang lưu..." ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50"}`}>{syncStatus}</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* TAB 1: PERFORMANCE */}
          {activeTab === 'performance' && (
            <div className="space-y-8 animate-fade-in">
              {/* Slogan */}
              <div className="px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[13.5px] text-gray-500 italic leading-relaxed text-center font-medium">
                  "Mục tiêu của bạn cần một người nuôi dưỡng chăm sóc vun trồng mỗi ngày" - Jim Rohn
                </p>
              </div>

              {/* Bảng Điểm */}
              <div className="bg-black text-white p-5 rounded-2xl shadow-md">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Điểm số trong ngày</p>
                    <span className="text-4xl font-black">{currentScoreData.earned}</span>
                  </div>
                  <div className="text-xs text-gray-400 font-medium pb-1">Mục tiêu: {currentScoreData.total}</div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="h-full bg-white transition-all duration-700 ease-out" style={{ width: `${currentScoreData.percent}%` }}></div>
                </div>
              </div>

              {isSubmitted && <div className="text-center text-xs tracking-widest text-gray-400 uppercase py-2">— DỮ LIỆU ĐÃ KHÓA —</div>}

              {/* Nhiệm vụ */}
              {categoryOrder.map((category) => {
                const tasksInCategory = baseTasks.filter(t => t.category === category);
                return (
                  <div key={category} className="mb-6">
                    <div className="flex items-center mb-4"><div className="flex-1 border-t border-gray-200"></div><h2 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{category}</h2><div className="flex-1 border-t border-gray-200"></div></div>
                    <div className="space-y-5">
                      {tasksInCategory.map((baseTask) => {
                        const stateTask = todayTasks.find(t => t.id === baseTask.id) || { status: 'pending', comment: '' };
                        const isNA = stateTask.status === 'na';
                        return (
                          <div key={baseTask.id} className={`transition-all duration-300 ${isNA ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                            <div className="flex justify-between items-start mb-3"><div className="pr-4"><span className={`text-[15px] font-medium leading-snug ${isNA ? 'line-through text-gray-400' : 'text-black'}`}>{baseTask.text}</span></div>
                              {!isSubmitted && <button onClick={() => setStatus(baseTask.id, isNA ? 'pending' : 'na')} className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${isNA ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>N/A</button>}
                            </div>
                            {isSubmitted ? <div className="text-sm pb-1">{getStatusDisplay(stateTask.status, baseTask.type)}</div> : !isNA && (
                              <div className="w-full">
                                {baseTask.type === 'binary' ? (
                                  <div className="flex gap-2">
                                    <button onClick={() => setStatus(baseTask.id, 'failed')} className={`flex-1 py-2.5 text-[13px] font-semibold border rounded-lg transition-all ${stateTask.status === 'failed' ? 'bg-black text-white' : 'bg-white text-gray-500 border-gray-200'}`}>Không</button>
                                    <button onClick={() => setStatus(baseTask.id, 'completed')} className={`flex-1 py-2.5 text-[13px] font-semibold border rounded-lg transition-all ${stateTask.status === 'completed' ? 'bg-black text-white' : 'bg-white text-gray-500 border-gray-200'}`}>Có / Đạt</button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1.5">{['bad', 'average', 'quite_good', 'good'].map((s) => (
                                      <button key={s} onClick={() => setStatus(baseTask.id, s)} className={`flex-1 py-2.5 text-[13px] font-semibold border rounded-lg transition-all ${stateTask.status === s ? 'bg-black text-white' : 'bg-white text-gray-500 border-gray-200'}`}>{s === 'bad' ? 'Tệ' : s === 'average' ? 'TB' : s === 'quite_good' ? 'Khá' : 'Tốt'}</button>
                                    ))}</div>
                                )}
                              </div>
                            )}
                            {!isNA && (
                              <input type="text" placeholder="Ghi chú thêm (không bắt buộc)..." value={stateTask.comment || ''} onChange={(e) => setTaskComment(baseTask.id, e.target.value)} onBlur={handleTextBlur} readOnly={isSubmitted} className={`w-full mt-2 text-[12px] px-3 py-2.5 rounded-lg border outline-none transition-colors ${isSubmitted && !stateTask.comment ? 'hidden' : isSubmitted ? 'bg-transparent border-transparent text-gray-500 italic px-0' : 'bg-gray-50 border-gray-100 text-gray-700 focus:bg-white focus:border-gray-300'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="pt-6 border-t border-gray-200">
                <p className="text-center text-[11px] tracking-widest text-gray-400 uppercase font-semibold mb-6">— TỰ TRUY VẤN CUỐI NGÀY —</p>
                {['proud', 'better', 'lesson'].map((f) => (
                  <div key={f} className="mb-6">
                    <label className="block text-[13px] font-semibold text-black mb-2">{f === 'proud' ? '1. Điều tự hào' : f === 'better' ? '2. Cần làm tốt hơn' : '3. Bài học'}</label>
                    <textarea value={reflections[f]} onChange={(e) => handleReflectionChange(f, e.target.value)} onBlur={handleTextBlur} placeholder="Không bắt buộc điền..." className={`w-full border rounded-xl p-3 text-[14px] min-h-[90px] outline-none transition-colors ${isSubmitted ? 'bg-gray-50 border-gray-100 text-gray-500 italic' : 'bg-white border-gray-200 text-black focus:border-black'}`} readOnly={isSubmitted} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: NUTRITION */}
          {activeTab === 'nutrition' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center mb-4"><div className="flex-1 border-t border-gray-200"></div><h2 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Nhật ký ăn uống</h2><div className="flex-1 border-t border-gray-200"></div></div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { fieldText: 'breakfastText', fieldCal: 'breakfastCal', label: '🍳 Bữa Sáng' },
                  { fieldText: 'lunchText', fieldCal: 'lunchCal', label: '🍱 Bữa Trưa' },
                  { fieldText: 'dinnerText', fieldCal: 'dinnerCal', label: '🍲 Bữa Tối' },
                  { fieldText: 'snackText', fieldCal: 'snackCal', label: '🍎 Ăn vặt / Khác' }
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50/60 p-3 rounded-xl border border-gray-100/50 flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-500">{item.label}</span>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Ăn gì..." value={meals[item.fieldText]} onChange={(e) => handleMealChange(item.fieldText, e.target.value)} onBlur={handleTextBlur} readOnly={isSubmitted} className="flex-1 bg-white border border-gray-200/60 rounded-lg px-3 py-2.5 text-sm outline-none text-gray-700 placeholder:text-gray-300 focus:border-gray-400" />
                      <input type="number" placeholder="Kcal" value={meals[item.fieldCal]} onChange={(e) => handleMealChange(item.fieldCal, e.target.value)} onBlur={handleTextBlur} readOnly={isSubmitted} className="w-20 bg-white border border-gray-200/60 rounded-lg px-2 py-2.5 text-sm text-center font-bold outline-none text-gray-700 placeholder:text-gray-300 focus:border-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-4 py-4 bg-orange-50 rounded-xl border border-orange-100 mt-2">
                <span className="text-[13px] font-bold text-orange-700">🔥 Tổng Calo nạp vào:</span>
                <span className="text-xl font-black text-orange-600 tracking-tight">{totalCalories} <span className="text-xs font-medium">kcal</span></span>
              </div>
            </div>
          )}

          {/* TAB 3: DIARY */}
          {activeTab === 'diary' && (
            <div className="animate-fade-in flex flex-col h-full">
              <div className="flex items-center mb-4"><div className="flex-1 border-t border-gray-200"></div><h2 className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Ghi chép tự do</h2><div className="flex-1 border-t border-gray-200"></div></div>
              <textarea
                value={dailyJournal}
                onChange={(e) => handleJournalChange(e.target.value)}
                onBlur={handleTextBlur}
                readOnly={isSubmitted}
                placeholder="Hãy viết ra bất cứ điều gì bạn đang suy nghĩ..."
                className={`w-full p-5 text-[15px] leading-relaxed rounded-2xl border bg-gray-50 focus:bg-white focus:border-black transition-all outline-none resize-none min-h-[60vh] ${isSubmitted ? 'text-gray-500 italic border-transparent' : 'text-gray-800 border-gray-200'}`}
              />
            </div>
          )}

          {/* TAB 4: STATS */}
          {activeTab === 'stats' && (
            <div className="animate-fade-in">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
                <h3 className="font-bold text-gray-800 text-sm mb-4">Điểm số đạt được / 100</h3>
                <svg viewBox="0 0 320 170" className="w-full h-44 overflow-visible">
                  {getChartData().map((d, i) => {
                    const x = i * 46; const h = (d.earned / 100) * 150;
                    return <g key={i}><rect x={x} y={150 - h} width="24" height={h} fill="#000" rx="4" /><text x={x + 12} y={150 - h - 6} fontSize="10" fill="#000" fontWeight="bold" textAnchor="middle">{d.earned}</text><text x={x + 12} y="166" fontSize="10" fill="#6b7280" textAnchor="middle">{d.dayName}</text></g>
                  })}
                </svg>
              </div>
              <button className="w-full py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold mb-4">📥 Xuất Excel Toàn Bộ</button>
            </div>
          )}
        </div>

        {/* Footer Tabs */}
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 px-5 pb-24 pt-3 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="mb-3">
            {!isSubmitted
              ? <button onClick={() => setShowConfirmModal(true)} className="w-full bg-black text-white font-bold py-3.5 rounded-xl text-xs tracking-widest uppercase shadow-lg active:scale-95 transition-transform">CHỐT SỔ HÔM NAY</button>
              : <button onClick={handleRevise} className="w-full bg-white border border-gray-300 text-gray-800 font-bold py-3.5 rounded-xl text-xs tracking-widest uppercase active:scale-95 transition-transform">MỞ KHÓA ĐỂ SỬA</button>
            }
          </div>

          {/* Menu 4 Icon */}
          <div className="flex justify-between items-center px-2 py-1">
            <button onClick={() => setActiveTab('performance')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'performance' ? 'text-black' : 'text-gray-300'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
              <span className="text-[9px] font-black mt-1 uppercase tracking-widest">Perform</span>
            </button>
            <button onClick={() => setActiveTab('nutrition')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'nutrition' ? 'text-orange-500' : 'text-gray-300'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>
              <span className="text-[9px] font-black mt-1 uppercase tracking-widest">Nutrition</span>
            </button>
            <button onClick={() => setActiveTab('diary')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'diary' ? 'text-blue-500' : 'text-gray-300'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span className="text-[9px] font-black mt-1 uppercase tracking-widest">Diary</span>
            </button>
            <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'stats' ? 'text-black' : 'text-gray-300'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span className="text-[9px] font-black mt-1 uppercase tracking-widest">Stats</span>
            </button>
          </div>
        </div>

        {/* Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-black text-black mb-2">Chốt sổ ngày này?</h3>
              <p className="text-[13px] text-gray-500 font-medium mb-6">Bạn vẫn có thể mở khóa để sửa nếu cần. Dữ liệu sẽ được đồng bộ.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs tracking-widest uppercase">Hủy</button>
                <button onClick={confirmSubmit} className="flex-1 py-3.5 bg-black text-white font-bold rounded-xl text-xs tracking-widest uppercase">Đồng ý</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

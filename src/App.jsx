import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  PLAYBOOKS, 
  WEATHER_PATTERNS, 
  MAINTENANCE_TASKS, 
  OBSERVATION_CATEGORIES, 
  HAPPENINGS, 
  BEACHCOMBING_ITEMS, 
  LIGHT_IN_THE_DARK, 
  SEASONS, 
  PAST_KEEPERS_LOGS, 
  GLOSSARY 
} from './constants';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  BookOpen, 
  Sparkles, 
  Compass, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  BookMarked,
  Info,
  Layers,
  Settings,
  Grid,
  LogIn,
  LogOut,
  CloudUpload,
  CloudDownload,
  Cloud,
  FileDown,
  FileUp,
  X,
  Search,
  Moon,
  Sun,
  RefreshCw,
  Play,
  CheckCircle,
  AlertCircle,
  Dices,
  Coins,
  Archive,
  HelpCircle,
  MapPin,
  Activity,
  Package,
  Lock
} from 'lucide-react';

const InboxUploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
    <path d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 14H8L10 16H14L16 14H22" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#3b82f6" fillOpacity="0.25" />
    <path d="M12 3L16 7H13V11H11V7H8L12 3Z" fill="#ef4444" stroke="#ef4444" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

const InboxDownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
    <path d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 14H8L10 16H14L16 14H22" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#3b82f6" fillOpacity="0.25" />
    <path d="M12 11L8 7H11V3H13V7H16L12 11Z" fill="#ef4444" stroke="#ef4444" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

export default function App() {
  // 테마 상태 (을유1945 크림/네이비 룰북 단일 테마)
  const theme = 'parchment';

  // 탭 상태 네비게이션
  const [activeTab, setActiveTab] = useState('character');

  // 활성화된 등대지기 프로필
  const [keeperProfile, setKeeperProfile] = useState(() => {
    const saved = localStorage.getItem('lighthouse_keeper_profile');
    return saved ? JSON.parse(saved) : {
      playbookId: 'caretaker',
      name: '',
      gender: '',
      hateFact: '',
      careItem: '',
      reminder: '',
      ownSecret: '',
      ritual: '',
      proudWord: '',
      hideWord: '',
      hopeWord: '',
      misconceptionWord: '',
      apparel: [],
      keeperNo: Math.floor(1000 + Math.random() * 9000).toString()
    };
  });

  // 등대 일과 오늘 기록 시프트 상태
  const [shiftState, setShiftState] = useState(() => {
    const saved = localStorage.getItem('lighthouse_current_shift');
    return saved ? JSON.parse(saved) : {
      phase: 1, // 1 = 시작 및 기후결정, 2 = 점등의식, 3 = 밤의 임무, 4 = 일과 종료 및 성찰
      date: '',
      time: '',
      moodId: 'happy',
      weatherTitle: '',
      weatherDesc: '',
      lightingAttempts: 1,
      lightingDifficulty: '',
      isLampLit: false,
      isClockworkWound: false,
      duties: [],
      remarks: ''
    };
  });

  // 밤의 임무 3단계 선택
  const [activeDutyType, setActiveDutyType] = useState(null);
  const [currentDutyResult, setCurrentDutyResult] = useState(null);

  // 일과 종료 단계의 카드 덱 성찰 셔플 상태
  const [endingIntensity, setEndingIntensity] = useState('steady'); // 'quiet', 'steady', 'busy', 'crazy'
  const [isShufflingCards, setIsShufflingCards] = useState(false);
  const [shuffledCount, setShuffledCount] = useState(0);

  // 등대를 영구히 떠나기 엔딩 관련 상태
  const [isLeavingLighthouse, setIsLeavingLighthouse] = useState(false);
  const [showEndingModal, setShowEndingModal] = useState(false);
  const [lastEndingJournal, setLastEndingJournal] = useState(null);

  // 미니게임: 해변 수색 인벤토리 및 상태
  const [beachHour, setBeachHour] = useState('4');
  const [beachcombedItems, setBeachcombedItems] = useState([]);
  const [persistentInventory, setPersistentInventory] = useState(() => {
    const saved = localStorage.getItem('lighthouse_inventory');
    return saved ? JSON.parse(saved) : [];
  });

  // 미니게임: 어둠 속의 빛
  const [lightQuestion, setLightQuestion] = useState('');
  const [lightConversations, setLightConversations] = useState(() => {
    const saved = localStorage.getItem('lighthouse_light_conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTossingLightCoins, setIsTossingLightCoins] = useState(false);
  const [lightCoinResult, setLightCoinResult] = useState(null);

  // 기후 대이변 시즌 상태
  const [seasonMarks, setSeasonMarks] = useState(() => {
    const saved = localStorage.getItem('lighthouse_season_marks');
    return saved ? JSON.parse(saved) : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  });
  const [activeSeason, setActiveSeason] = useState(() => {
    const saved = localStorage.getItem('lighthouse_active_season');
    return saved ? JSON.parse(saved) : null;
  });

  // 저장된 일지 장부록
  const [journals, setJournals] = useState(() => {
    const saved = localStorage.getItem('lighthouse_journals');
    return saved ? JSON.parse(saved) : [];
  });

  // 동기화 상태
  const [googleUser, setGoogleUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(() => {
    return localStorage.getItem('lighthouse_last_synced') || null;
  });
  const [isAutoSync, setIsAutoSync] = useState(() => {
    return localStorage.getItem('lighthouse_auto_sync') === 'true';
  });

  // UI 오버레이 패널
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('keepers');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');

  // 점등 의식 동전/카드 플립 상태
  const [isTossingWick, setIsTossingWick] = useState(false);
  const [wickCoinResult, setWickCoinResult] = useState(null);
  const [wickCardResult, setWickCardResult] = useState(null);

  // 액티브 플레이북
  const activePlaybook = useMemo(() => {
    return PLAYBOOKS.find(p => p.id === keeperProfile.playbookId) || PLAYBOOKS[0];
  }, [keeperProfile.playbookId]);

  // 테마 적용
  useEffect(() => {
    const body = document.body;
    body.className = '';
    body.classList.add('theme-light-parchment');
  }, []);

  // 계정 리스너
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setGoogleUser({
          uid: currentUser.uid,
          name: currentUser.displayName,
          email: currentUser.email,
          picture: currentUser.photoURL,
          isLoggedIn: true,
          isDemo: false
        });
      } else {
        const saved = localStorage.getItem('lighthouse_demo_user');
        if (saved) {
          setGoogleUser(JSON.parse(saved));
        } else {
          setGoogleUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 로컬저장
  useEffect(() => {
    localStorage.setItem('lighthouse_keeper_profile', JSON.stringify(keeperProfile));
  }, [keeperProfile]);

  useEffect(() => {
    localStorage.setItem('lighthouse_current_shift', JSON.stringify(shiftState));
  }, [shiftState]);

  useEffect(() => {
    localStorage.setItem('lighthouse_inventory', JSON.stringify(persistentInventory));
  }, [persistentInventory]);

  useEffect(() => {
    localStorage.setItem('lighthouse_light_conversations', JSON.stringify(lightConversations));
  }, [lightConversations]);

  useEffect(() => {
    localStorage.setItem('lighthouse_season_marks', JSON.stringify(seasonMarks));
  }, [seasonMarks]);

  useEffect(() => {
    if (activeSeason) {
      localStorage.setItem('lighthouse_active_season', JSON.stringify(activeSeason));
    } else {
      localStorage.removeItem('lighthouse_active_season');
    }
  }, [activeSeason]);

  useEffect(() => {
    localStorage.setItem('lighthouse_journals', JSON.stringify(journals));
    localStorage.setItem('lighthouse_updated_at', new Date().toISOString());
  }, [journals]);

  // ==========================================
  // 클라우드 동기화 (파이어베이스)
  // ==========================================
  const syncToCloud = async () => {
    if (!googleUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    setIsCloudSyncing(true);
    setSyncStatus("syncing");
    setSyncMessage("업로드 중...");

    try {
      if (googleUser.isDemo) {
        setTimeout(() => {
          localStorage.setItem('lighthouse_cloud_journals_demo', JSON.stringify(journals));
          localStorage.setItem('lighthouse_cloud_inventory_demo', JSON.stringify(persistentInventory));
          const nowStr = new Date().toLocaleString();
          setLastSyncedTime(nowStr);
          localStorage.setItem('lighthouse_last_synced', nowStr);
          setIsCloudSyncing(false);
          setSyncStatus("synced");
          setSyncMessage("동기화 완료");
          alert("🎉 데모 모드 클라우드 동기화 완료! 현재 모든 로컬 저널 데이터가 가상 스토리지에 성공적으로 백업되었습니다.");
        }, 800);
        return;
      }

      if (!db) throw new Error("데이터베이스가 로드되지 않았습니다.");
      const docRef = doc(db, 'thelighthouse_saves', googleUser.uid);
      const gsJournals = JSON.stringify(journals);
      const gsInventory = JSON.stringify(persistentInventory);
      const now = new Date().toISOString();

      await setDoc(docRef, {
        journals: gsJournals,
        inventory: gsInventory,
        updatedAt: now
      }, { merge: true });

      const nowStr = new Date(now).toLocaleString();
      setLastSyncedTime(nowStr);
      localStorage.setItem('lighthouse_last_synced', nowStr);
      setIsCloudSyncing(false);
      setSyncStatus("synced");
      setSyncMessage("백업 완료");
      alert("🎉 클라우드 동기화 완료! 등대지기님의 모든 모험 기록이 파이어베이스 클라우드에 안전하게 저장되었습니다.");
    } catch (err) {
      console.error(err);
      setIsCloudSyncing(false);
      setSyncStatus("error");
      setSyncMessage("동기화 실패");
      alert("❌ 백업 동기화 실패: " + err.message);
    }
  };

  const restoreFromCloud = async () => {
    if (!googleUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!window.confirm("주의! 클라우드 데이터를 불러오면 작성 중인 로컬의 저널 목록 및 해변 획득 인벤토리가 완전히 대체됩니다. 계속 진행하시겠습니까?")) {
      return;
    }

    setIsCloudSyncing(true);
    setSyncStatus("syncing");
    setSyncMessage("다운로드 중...");

    try {
      if (googleUser.isDemo) {
        setTimeout(() => {
          const savedCloud = localStorage.getItem('lighthouse_cloud_journals_demo');
          const savedInv = localStorage.getItem('lighthouse_cloud_inventory_demo');
          if (!savedCloud) {
            setIsCloudSyncing(false);
            setSyncStatus("error");
            setSyncMessage("백업 데이터 없음");
            alert("데모 스토리지에 저장된 백업 데이터가 없습니다.");
            return;
          }
          setJournals(JSON.parse(savedCloud));
          setPersistentInventory(savedInv ? JSON.parse(savedInv) : []);
          setIsCloudSyncing(false);
          setSyncStatus("synced");
          setSyncMessage("복원 완료");
          alert("🎉 데모 모드 불러오기 완료! 가상 스토리지의 백업 데이터에서 무사히 저널을 복원했습니다.");
        }, 800);
        return;
      }

      if (!db) throw new Error("데이터베이스가 로드되지 않았습니다.");
      const docRef = doc(db, 'thelighthouse_saves', googleUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.journals) {
          setJournals(JSON.parse(data.journals));
        }
        if (data.inventory) {
          setPersistentInventory(JSON.parse(data.inventory));
        }
        
        const serverUpdatedAt = data.updatedAt || new Date().toISOString();
        const nowStr = new Date(serverUpdatedAt).toLocaleString();
        setLastSyncedTime(nowStr);
        localStorage.setItem('lighthouse_last_synced', nowStr);

        setIsCloudSyncing(false);
        setSyncStatus("synced");
        setSyncMessage("복원 성공");
        alert("🎉 클라우드 불러오기 성공! 클라우드 백업에서 모든 저널 일지 및 인벤토리를 복원했습니다.");
      } else {
        setIsCloudSyncing(false);
        setSyncStatus("error");
        setSyncMessage("데이터 없음");
        alert("❌ 클라우드에 백업된 데이터가 존재하지 않습니다. 먼저 로컬에서 업로드를 수행해 주세요.");
      }
    } catch (err) {
      console.error(err);
      setIsCloudSyncing(false);
      setSyncStatus("error");
      setSyncMessage("복원 실패");
      alert("❌ 복원 실패: " + err.message);
    }
  };

  // 계정 핸들러
  const handleGoogleLogin = async () => {
    try {
      if (auth && googleProvider) {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error(error);
      alert("구글 로그인 실패: " + error.message);
    }
  };

  const handleLogOut = async () => {
    if (!window.confirm("구글 계정에서 로그아웃하시겠습니까?")) return;
    try {
      if (googleUser && googleUser.isDemo) {
        setGoogleUser(null);
        localStorage.removeItem('lighthouse_demo_user');
      } else {
        if (auth) {
          await signOut(auth);
        }
      }
      alert("로그아웃되었습니다.");
    } catch (error) {
      console.error(error);
    }
  };

  const startDemoSession = () => {
    const demoUser = {
      uid: "demo-keeper-id",
      name: "방랑 등대지기",
      email: "keeper@thelighthouse.org",
      picture: "https://api.dicebear.com/7.x/bottts/svg?seed=thelighthouse",
      isLoggedIn: true,
      isDemo: true
    };
    setGoogleUser(demoUser);
    localStorage.setItem('lighthouse_demo_user', JSON.stringify(demoUser));
    alert("데모 계정으로 시뮬레이션 로그인을 완료했습니다! 로컬 저장 데이터와 클라우드 업로드 가상 백업 테스트가 활성화되었습니다.");
  };

  // 실시간 동기화 리스너
  useEffect(() => {
    if (!googleUser || googleUser.isDemo || !db || !isAutoSync) return;
    const docRef = doc(db, 'thelighthouse_saves', googleUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const serverUpdatedAt = data.updatedAt || "";
        const localUpdatedAt = localStorage.getItem('lighthouse_updated_at') || "";

        if (serverUpdatedAt && serverUpdatedAt > localUpdatedAt) {
          if (data.journals) setJournals(JSON.parse(data.journals));
          if (data.inventory) setPersistentInventory(JSON.parse(data.inventory));
          const nowStr = new Date(serverUpdatedAt).toLocaleString();
          setLastSyncedTime(nowStr);
          localStorage.setItem('lighthouse_last_synced', nowStr);
          setSyncStatus("synced");
          setSyncMessage("실시간 동기화 완료");
        }
      }
    });
    return () => unsubscribe();
  }, [googleUser, isAutoSync]);

  useEffect(() => {
    localStorage.setItem('lighthouse_auto_sync', isAutoSync);
  }, [isAutoSync]);

  // ==========================================
  // 게임 보조 및 룰 주사위/카드 판정
  // ==========================================
  const rollDie = () => Math.floor(1 + Math.random() * 6);
  
  const drawCard = () => {
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits = ['스페이드', '클럽', '하트', '다이아몬드'];
    const randValue = values[Math.floor(Math.random() * values.length)];
    const randSuit = suits[Math.floor(Math.random() * suits.length)];
    const color = (randSuit === '하트' || randSuit === '다이아몬드') ? '적색' : '흑색';
    return { value: randValue, suit: randSuit, color };
  };

  // 기후 대이변 스택 제어
  const incrementSeasonMark = (seasonId) => {
    setSeasonMarks(prev => {
      const copy = { ...prev };
      const seasonObj = SEASONS.find(s => s.id === seasonId);
      if (!seasonObj) return prev;
      
      copy[seasonId] = (copy[seasonId] || 0) + 1;
      if (copy[seasonId] >= seasonObj.circles) {
        copy[seasonId] = 0; // 초기화
        
        let rolledDays = 0;
        if (seasonId === 1) rolledDays = 4;
        else if (seasonId === 4) rolledDays = 3;
        else if (seasonId === 2 || seasonId === 3) rolledDays = rollDie();
        else if (seasonId === 5) rolledDays = rollDie() + rollDie();
        else if (seasonId === 6) rolledDays = Math.ceil(rollDie() / 2);

        setActiveSeason({
          id: seasonId,
          name: seasonObj.nameKo,
          durationLeft: rolledDays
        });
        alert(`🚨 대기후 이변 발생! 등대에 새로운 시즌 [${seasonObj.nameKo}]이 시작되었습니다! 총 ${rolledDays}일 동안 이변의 영향력이 지속됩니다.`);
      }
      return copy;
    });
  };

  // 날씨 선택 시 대기후 이변 스택 누적
  const handleWeatherSelect = (moodId) => {
    const pattern = WEATHER_PATTERNS.find(w => w.id === moodId);
    if (!pattern) return;

    setShiftState(prev => ({
      ...prev,
      moodId: moodId,
      weatherTitle: pattern.title,
      weatherDesc: `${pattern.description}\n[기온: ${pattern.temp} | 바람: ${pattern.winds} | 풍경: ${pattern.sights}]`
    }));

    if (moodId === 'tired') incrementSeasonMark(1);
    else if (moodId === 'pained') incrementSeasonMark(2);
    else if (moodId === 'happy' || moodId === 'anxious') incrementSeasonMark(3);
    else if (moodId === 'excited') incrementSeasonMark(4);
    else if (moodId === 'relaxed') incrementSeasonMark(5);
    else if (moodId === 'sad') incrementSeasonMark(6);
  };

  const punchShiftTime = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setShiftState(prev => ({
      ...prev,
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`
    }));
  };

  // 점등 의식 coin tossing & card draw
  const handleWickToss = () => {
    if (isTossingWick) return;
    setIsTossingWick(true);
    setWickCoinResult(null);
    setWickCardResult(null);

    let tick = 0;
    const interval = setInterval(() => {
      setWickCoinResult(Math.random() > 0.5 ? 'heads' : 'tails');
      setWickCardResult(drawCard());
      tick++;
      if (tick > 10) {
        clearInterval(interval);
        const finalCoin = Math.random() > 0.5 ? 'heads' : 'tails';
        const finalCard = drawCard();
        
        setWickCoinResult(finalCoin);
        setWickCardResult(finalCard);
        setIsTossingWick(false);

        if (finalCoin === 'heads' && finalCard.color === '적색') {
          setShiftState(prev => ({
            ...prev,
            isLampLit: true,
            isClockworkWound: true
          }));
          alert("🔥 점등 대성공! 힘차게 피어오른 등대 불꽃이 거대한 렌즈 장치를 거쳐 등대 꼭대기에서 회전하기 시작했습니다!");
        } else {
          setShiftState(prev => ({
            ...prev,
            lightingAttempts: prev.lightingAttempts + 1
          }));
        }
      }
    }, 90);
  };

  // 밤의 분위기 판정표 (룰북 p.41 권장 업무 추천)
  const getWeatherRecommendation = (moodId) => {
    switch (moodId) {
      case 'tired': // 몰아치는 우주 풍랑 (사나움 / 혹한)
        return {
          moodDesc: "사납고 혹독함 (Wild/Cold)",
          recType: 'maintenance',
          recTypeKo: "도구 및 등대 유지보수",
          reason: "우주 풍랑과 혹한 속에서는 등대의 외벽 석조와 윤활유 공급 장치가 쉽게 결빙되거나 파손될 우려가 큽니다."
        };
      case 'pained': // 노래하는 태양풍 (기괴함)
        return {
          moodDesc: "기괴하고 쓸쓸함 (Strange)",
          recType: 'maintenance',
          recTypeKo: "도구 및 등대 유지보수",
          reason: "노래하듯 흐느끼는 사나운 전하풍으로 인해 기계 내부 태엽과 배관 파이프의 느슨해짐이 발생하기 쉽습니다."
        };
      case 'happy': // 성간 우주설 (추움)
        return {
          moodDesc: "조용하고 차가움 (Cold)",
          recType: 'maintenance',
          recTypeKo: "도구 및 등대 유지보수",
          reason: "등대 바닥과 외부 난간에 성간 우주설 별가루가 소리 없이 쌓이므로, 결빙을 막기 위한 보살핌과 정리가 시급합니다."
        };
      case 'excited': // 성간 대류 온난 (평온함)
        return {
          moodDesc: "평온하고 온화함 (Calm)",
          recType: 'observation',
          recTypeKo: "경외로운 우주 관측",
          reason: "대기가 무척 온화하고 오색찬란한 은하계 흐름이 맑게 드러나 우주 생명체나 함선들이 활기차게 노니는 최고의 상태입니다."
        };
      case 'angry': // 불타는 극광의 춤 (숨막히게 더움)
        return {
          moodDesc: "답답하고 이글거림 (Stifling Hot)",
          recType: 'maintenance',
          recTypeKo: "도구 및 등대 유지보수",
          reason: "전하를 가득 띤 붉은 극광과 후텁지근한 열기로 인해 등대의 안테나 오작동 및 기어 윤활유 과열 팽창을 긴급히 돌봐야 합니다."
        };
      case 'relaxed': // 어둠의 우주우 (불확실함)
        return {
          moodDesc: "불확실하고 한 치 앞을 알 수 없음 (Uncertain)",
          recType: 'happening',
          recTypeKo: "불시의 우주 사건",
          reason: "짙은 성간 응축수 안개와 제한된 시야 탓에 예상치 못한 차원적 이상 변이나 불시의 이변이 일어나기 쉽습니다."
        };
      case 'sad': // 유성우의 공습 (시끄럽고 혼돈됨)
        return {
          moodDesc: "시끄럽고 혼란스러움 (Loud/Chaotic)",
          recType: 'happening',
          recTypeKo: "불시의 우주 사건",
          reason: "하늘을 가로지르는 수천 개의 불타는 유성 충격음과 파편 공습 때문에 등대 안팎에 긴박하고 돌발적인 대소동이 일어납니다."
        };
      case 'anxious': // 심연의 기괴한 정적 (불안함 / 고요함)
        return {
          moodDesc: "불안하고 고요함 (Unsettling/Quiet)",
          recType: 'observation',
          recTypeKo: "경외로운 우주 관측 또는 불시의 우주 사건",
          reason: "미동조차 하지 않는 칠흑 같은 적막은 등대지기에게 극도의 불안감을 조장하며, 깊은 공허 속 기묘한 외계 존재의 관측이나 고요한 정적의 돌발적인 깨짐을 예견합니다."
        };
      default:
        return null;
    }
  };

  // 관측 대상(categoryId)과 거리(suit)에 따른 룰북 p.44 관측 서사 프롬프트
  const getObservationPrompt = (rolled, suit) => {
    if (rolled === 1) {
      if (suit === '스페이드') return "아득히 먼 심연 속에서 어른거리는 미세한 점멸은 그들의 거대한 우주 유영 단체 행동인가요, 아니면 고독한 어미 물고기의 헤엄인가요? 그들의 아주 작고 쓸쓸한 반짝임에 지기는 어떤 슬픈 동질감을 느끼나요?";
      if (suit === '클럽') return "랜턴 광선 경계선을 기웃거리는 그 존재는 등대의 강한 빛을 두려워하고 있나요, 아니면 불빛의 미세한 자성을 탐닉하고 있나요? 그들이 불빛 바로 바깥에서 뿜어내는 가스나 에테르 꼬리의 냄새가 어렴풋이 여기까지 전해지나요?";
      if (suit === '하트') return "손을 뻗으면 닿을 듯 난간 너머로 다가온 그 거대한 성간 고래/생명체와 눈이 마주친 순간, 지기는 그들의 차가운 영혼에서 어떤 오래된 우주적 지혜를 엿보았나요? 손가락 끝에 닿은 그들의 신비로운 물리적 감촉은 어땠나요?";
      return "머리 위 궤도를 온통 뒤덮으며 웅장한 비행을 하는 그 눈부신 군무는 이곳 등대 바위 섬 전체를 집어삼킬 듯한 압도감을 줍니다. 그들의 거대한 유영이 내는 소리와 주파수는 지기님의 온 심장과 등대실 유리를 어떻게 뒤흔들었나요?";
    }
    if (rolled === 2) {
      if (suit === '스페이드') return "지평선 끝을 위태롭게 가로지르는 저 소형 여행선은 목적지를 잃고 표류하는 걸까요, 아니면 성간 국경 정찰선일까요? 그 먼 곳의 우주 창문을 통해 그들도 이곳 등대의 등대 빔을 가만히 응시하고 있을까요?";
      if (suit === '클럽') return "랜턴 불빛 궤적을 은밀히 타고 흐르는 기계선은 제국 군함의 순찰선인가요, 아니면 불법 상선의 은밀한 잠행인가요? 그들이 남긴 연료 연소 가스의 탁한 궤적이 차가운 등대 기류와 뒤섞이며 어떤 이질적인 광경을 자아내나요?";
      if (suit === '하트') return "난간 코앞까지 극도로 밀착해 다가와 등대의 빛 인도를 구하는 저 소형 우주 여행선의 녹슨 외벽과 리벳들이 선명히 보입니다. 헬멧을 쓴 탑승자가 차창 너머로 당신에게 보낸 간절한 수신호나 표정은 어떠했나요?";
      return "하늘 전체를 가득 메우며 웅장한 위압감을 뽐내는 거대 제국 함선이 머리 위 초근접 궤도를 통과합니다. 그들이 내뿜는 차원 이동 엔진의 묵직한 중력적 왜곡 현상과 굉음은 지기님의 마음에 어떤 거대한 소외감이나 전쟁의 공포를 불러일으켰나요?";
    }
    if (rolled === 3) {
      if (suit === '스페이드') return "저 멀리 은하 경계에서 아련히 피어오르는 초신성의 미세한 소멸 섬광은 영겁의 시간 전의 유산일 것입니다. 지기님의 마음속에 남아있는, 이제는 소멸하여 이름만 남은 소중한 기억이나 사람의 이름이 혹시 저 불꽃과 겹쳐 보이나요?";
      if (suit === '클럽') return "랜턴 빔 바로 바깥에서 일렁이며 하늘을 장엄하게 채우는 유성우 폭포나 오로라 파동은 밤의 어둠을 보라색과 비취색으로 찬란하게 밝힙니다. 이 고독한 우주 끝자락에서 홀로 바라보기에는 너무나도 과분하고 쓸쓸한 이 장관을, 지기는 누구와 나누고 싶어지나요?";
      if (suit === '하트') return "등대 탑 난간 위로 손바닥 크기의 미세한 유성 가루 입자들과 성간 이온 스파크가 직접 날아와 타닥타닥 소리를 내며 사그라집니다. 지기님의 옷자락과 세마포 장갑 위에 묻은 신비롭고 반짝이는 우주의 불씨는 어떤 황홀하거나 쓰라린 열기를 품고 있었나요?";
      return "머리 위 정수리를 가득 덮으며 웅장한 파도를 그리는 거대 성간 가스 오로라 태풍이 등대 탑 전체를 위압적으로 뒤덮습니다. 하늘을 통째로 이글거리게 만드는 불타는 극광들의 소용돌이는 지기님이 가진 모든 인간적 고민을 얼마나 덧없고 작게 만들어 버리나요?";
    }
    if (rolled === 4) {
      if (suit === '스페이드') return "저 멀리 칠흑 같은 공허 속에 영겁처럼 박혀 고요히 흔들리는 미세한 인공 구조물은 무엇일까요? 과거 고대 지기들이 남긴 버려진 대피 초소일까요, 아니면 주인 잃은 구형 관측 포드일까요? 그것이 던지는 깊은 적막감은 어떠한가요?";
      if (suit === '클럽') return "랜턴 빔이 매초 회전할 때마다, 바로 바깥에서 잠시 모습을 드러냈다 사라지는 차갑고 거대한 강철 무전 안테나/부유 도시는 어두운 철판들 사이로 희미한 비상용 경고등을 깜빡이고 있습니다. 저 안에서 당신의 등대 빛을 이정표 삼아 버티고 있을 마지막 생존자는 누구일까요?";
      if (suit === '하트') return "등대 바위 섬 코앞까지 떠밀려 와 좌초되듯 흔들리는 버려진 탈출용 캡슐이나 고대 기하학적 유물이 난간 너머로 보입니다. 그 녹슨 문양과 내부를 들여다볼 수 있는 작은 창문에 비친 것은 어떤 가슴 시린 우주의 역사였나요?";
      return "머리 위 하늘을 가득 덮으며 웅장하게 위압감을 뽐내는 거대 우주 정거장 무역항의 하부 선체가 초근접 궤도에 걸쳐져 지나갑니다. 정거장에서 뿜어져 나오는 인공적인 배출열과 둔탁한 터빈 진동 소음은 지기의 마음속 외로움을 어떻게 자극하나요?";
    }
    if (rolled === 5) {
      if (suit === '스페이드') return "심연의 틈새에서 일렁이는, 공식 도감에 전혀 존재하지 않는 정체불명의 에테르적 점멸 신호는 아득하게 멀어 조준경으로도 형체를 식별할 수 없습니다. 그것이 지기님에게 감응하여 깜빡이는 듯한 지적인 착각을 느끼며 당신은 어떤 묘한 경외심과 두려움을 느꼈나요?";
      if (suit === '클럽') return "랜턴 불빛 바로 바깥에서 은밀하게 형태를 왜곡하며 일렁이는 미확인 스텔스 유기체는 등대의 인공적인 에너지 흐름을 어떻게 흡수하거나 반응하고 있나요? 생전 처음 보는 물리 법칙으로 일렁이는 그 일렁임에서 어떤 낯선 온기나 서늘함이 풍겨옵니까?";
      if (suit === '하트') return "등대 난간 바로 옆까지 극도로 가까이 다가와, 얇은 유리창 하나만을 사이에 두고 지기님을 빤히 응시하는 무정형의 반투명 외계 생명체를 포착했습니다. 그 촉수나 빛 주파수가 유리창에 부딪히며 내는 노랫소리와, 그의 눈동자에서 느껴진 호기심은 어떤 의미였을까요?";
      return "하늘 전체를 뒤덮으며 소리 없이 위압적으로 공전하는 정체불명의 거대 미확인 비행물체가 등대 바위 섬의 중력을 미세하게 비틀어 놓습니다. 등대의 모든 나침반과 기어들이 제멋대로 회전하는 동안, 지기가 마주한 이 초자연적인 압도감에 대해 어떤 일지를 기록하겠습니까?";
    }
    // rolled === 6
    if (suit === '스페이드') return "우주 망원경 렌즈 한구석에 간신히 걸린, 두꺼운 우주복을 입은 채 기어오르는 듯 유영하는 아득히 먼 성간 방랑자는 홀로 어디로 가고 있는 것일까요? 지기님은 등대 신호기를 깜빡여 그 고독한 유랑을 격려하거나 위로해 주었나요?";
    if (suit === '클럽') return "랜턴 빔 바로 바깥에서 와이어 생명선도 없이 홀로 보조 중력 장치에 의지해 떠다니는 성간 여행자의 우주복 실루엣이 보입니다. 그가 등대의 거대 렌즈 광선을 바라보며 양손을 가볍게 흔들 때, 지기님의 마음에 떠오른 말할 수 없는 그리움은 무엇이었나요?";
    if (suit === '하트') return "등대실 외부 관측 데크 난간을 조심스레 붙잡고 지쳐서 헐떡이며 찾아온 소형 보행 여행자가 있습니다. 두꺼운 유리 헬멧 안으로 비치는 그의 눈가에 어린 안도감의 눈물과, 그가 손에 쥔 기묘한 나침반 부품이 등대 빔을 향해 내는 소리는 어떠했나요?";
    return "머리 위 정수리 너머의 초근접 궤도를 가득 덮으며 웅장하게 위압감을 주는 거대한 자율 수리 기계 로봇이 등대의 주파수 안테나를 향해 정밀 레이저 빔 신호를 쏘고 지나갑니다. 등대 시스템에 새겨진 그들의 기계적이고 엄숙한 전언은 무엇이었습니까?";
  };

  // 밤의 임무 세부 판정 생성
  const triggerMaintenanceTask = () => {
    const rolled = rollDie();
    const drawn = drawCard();
    const taskObj = MAINTENANCE_TASKS.find(t => t.id === rolled);
    
    const strugglesWith = activePlaybook.struggleTaskIds.includes(rolled);
    const excelsAt = activePlaybook.excelTaskIds.includes(rolled);

    let outcomeText = "";
    if (drawn.suit === '스페이드') outcomeText = "스페이드: 작업을 완수하는 순간, 등대 주변에 예기치 못한 우연한 사건이 발생합니다.";
    else if (drawn.suit === '클럽') outcomeText = "클럽: 작업 도중 무언가 어긋나고 꼬이며, 상황이 당신에게 결코 유리하지 않게 흘러갑니다.";
    else if (drawn.suit === '하트') outcomeText = "하트: 바쁘게 손을 움직이던 도중, 과거 등대 바깥이나 마음속 깊은 곳에 묻어두었던 어떤 서글픈 기억이 피어오릅니다.";
    else if (drawn.suit === '다이아몬드') outcomeText = "다이아몬드: 등대의 모든 요소들이 도와주듯 상황이 대단히 순조롭고 매끄럽게 흘러갑니다.";

    let characterEffect = "평소와 다름없이 작업을 수행합니다.";
    if (excelsAt && strugglesWith) {
      characterEffect = "당신의 플레이북이 이 특수 작업을 능숙하게 행하면서도 한편으로 신체적/정신적으로 힘겨워합니다. 상반된 가치관의 서사적 충돌을 일지에 기록하세요!";
    } else if (excelsAt) {
      characterEffect = `🌟 장기 발휘! 지기님의 플레이북은 이 [${taskObj.title}] 작업에 특별한 노하우와 재능을 가지고 있습니다. 훨씬 더 신속하고 창의적이며 정교하게 해냈을 것입니다.`;
    } else if (strugglesWith) {
      characterEffect = `⚠️ 취약 직무! 지기님의 플레이북은 이 [${taskObj.title}] 작업 수행에 심각한 골치나 한계를 느낍니다. 부상을 당하거나, 시간이 배로 걸렸을지도 모릅니다.`;
    }

    setCurrentDutyResult({
      type: 'maintenance',
      title: `도구 및 등대 유지보수 - 주사위 ${rolled}`,
      details: taskObj.title,
      description: taskObj.description,
      examples: taskObj.examples,
      cardDrawn: `${drawn.suit} ${drawn.value}`,
      cardColor: drawn.color,
      outcome: outcomeText,
      characterEffect: characterEffect,
      userLog: ''
    });
  };

  const triggerObservationTask = () => {
    const rolled = rollDie();
    const drawn = drawCard();
    const obsObj = OBSERVATION_CATEGORIES.find(o => o.id === rolled);

    let distanceText = "";
    if (drawn.suit === '스페이드') distanceText = "스페이드: 아득히 먼 지평선 언저리에 스치는 작은 반점이나 희미한 불꽃 모양의 얼룩 정도";
    else if (drawn.suit === '클럽') distanceText = "클럽: 안전한 중력장 외부, 등대에서 뿜어내는 랜턴 빔 광선 바로 바깥 언저리";
    else if (drawn.suit === '하트') distanceText = "하트: 지기님의 손을 뻗으면 당장이라도 닿을 것 같은 등대 바위 섬의 근접 난간 거리";
    else if (drawn.suit === '다이아몬드') distanceText = "다이아몬드: 머리 위 하늘 정수리를 가득 덮으며 웅장하게 위압감을 뽐내는 초근접 궤도";

    const specificQuestion = getObservationPrompt(rolled, drawn.suit);

    setCurrentDutyResult({
      type: 'observation',
      title: `경외로운 우주 관측 - 주사위 ${rolled}`,
      details: obsObj.title,
      description: obsObj.description,
      examples: obsObj.examples,
      questions: `${obsObj.questions}\n\n💡 [${drawn.suit} 거리 관측 프롬프트]: ${specificQuestion}`,
      cardDrawn: `${drawn.suit} ${drawn.value}`,
      cardColor: drawn.color,
      outcome: `관측 고도: ${distanceText}`,
      userLog: ''
    });
  };

  const triggerHappeningTask = () => {
    const drawn = drawCard();
    const severity = drawn.color === '적색' 
      ? "🔴 적색 - 중대한 결과 (등대나 바위 섬의 심각한 구조적 타격, 지기님의 장기적 육체/정신적 부상, 타인을 향한 중대한 위협 등 지속성 여파 발생)"
      : "⚫ 흑색 - 경미한 결과 (사소한 일정 중단, 기계 장치의 자잘한 일시적 오작동, 소박한 불편함 정도의 경미한 여파 발생)";
    
    const eventObj = HAPPENINGS[drawn.value] || HAPPENINGS["2"];

    let autoAction = null;
    if (drawn.value === '9') {
      autoAction = 'time_warp_forward';
    } else if (drawn.value === 'K') {
      autoAction = 'time_warp_backward';
    }

    setCurrentDutyResult({
      type: 'happening',
      title: `우주 사건 포착 - 카드 ${drawn.suit} ${drawn.value}`,
      details: eventObj.title,
      description: eventObj.description,
      examples: eventObj.examples,
      cardDrawn: `${drawn.suit} ${drawn.value}`,
      cardValue: drawn.value,
      cardColor: drawn.color,
      severity: severity,
      autoAction: autoAction,
      userLog: ''
    });
  };

  const addDutyToShift = () => {
    if (!currentDutyResult || !currentDutyResult.userLog.trim()) {
      alert("임무 수행 일지 내용을 먼저 작성해 주세요!");
      return;
    }

    setShiftState(prev => ({
      ...prev,
      duties: [...prev.duties, { ...currentDutyResult }]
    }));
    setCurrentDutyResult(null);
    setActiveDutyType(null);
  };

  // 회고용 카드 셔플 룰
  const executeReflectiveShuffle = () => {
    if (isShufflingCards) return;
    setIsShufflingCards(true);
    setShuffledCount(0);
    
    let cycles = 1;
    if (endingIntensity === 'steady') cycles = 2;
    else if (endingIntensity === 'busy') cycles = 3;
    else if (endingIntensity === 'crazy') cycles = 4;

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setShuffledCount(count);
      if (count >= cycles) {
        clearInterval(interval);
        setTimeout(() => {
          setIsShufflingCards(false);
          setShiftState(prev => ({ ...prev, phase: 4 }));
          alert(`🎴 고요한 밤의 성찰을 위해 카드 덱을 총 ${cycles}번 엄숙하게 셔플했습니다. 이제 오늘의 등대 근무를 종료하는 회고 일지를 작성하세요.`);
        }, 300);
      }
    }, 450);
  };

  // 보관함 저장
  const saveShiftToJournals = () => {
    if (!shiftState.remarks.trim()) {
      alert("오늘의 마지막 회고 소감을 작성해 주세요!");
      return;
    }

    const targetWeather = WEATHER_PATTERNS.find(w => w.title === shiftState.weatherTitle) || WEATHER_PATTERNS.find(w => w.id === shiftState.moodId);
    const newJournal = {
      id: Date.now().toString(),
      date: shiftState.date || new Date().toLocaleDateString(),
      time: shiftState.time || new Date().toLocaleTimeString(),
      keeperNo: keeperProfile.keeperNo,
      keeperName: keeperProfile.name || "무명의 등대지기",
      playbookName: activePlaybook.nameKo,
      weather: shiftState.weatherTitle,
      weatherDesc: shiftState.weatherDesc,
      temp: targetWeather?.temp || "",
      winds: targetWeather?.winds || "",
      sights: targetWeather?.sights || "",
      lampLitAttempts: shiftState.lightingAttempts,
      dutiesLog: shiftState.duties.map(d => `[${d.details}] -> ${d.userLog}`).join("\n\n"),
      dutiesRaw: [...shiftState.duties],
      remarks: shiftState.remarks,
      seasonEffect: activeSeason ? activeSeason.name : "일반 평온기",
      isEndingJournal: isLeavingLighthouse
    };

    setJournals(prev => [newJournal, ...prev]);

    if (activeSeason) {
      if (activeSeason.durationLeft <= 1) {
        alert(`🌤️ 알림: 대기후 이변인 [${activeSeason.name}] 시즌의 영향력이 완전히 끝나고 등대 바위 섬에 평온한 대류가 찾아왔습니다.`);
        setActiveSeason(null);
      } else {
        setActiveSeason(prev => ({
          ...prev,
          durationLeft: prev.durationLeft - 1
        }));
      }
    }

    const freshShift = {
      phase: 1,
      date: '',
      time: '',
      moodId: 'happy',
      weatherTitle: '',
      weatherDesc: '',
      lightingAttempts: 1,
      lightingDifficulty: '',
      isLampLit: false,
      isClockworkWound: false,
      duties: [],
      remarks: ''
    };
    setShiftState(freshShift);
    localStorage.setItem('lighthouse_current_shift', JSON.stringify(freshShift));
    
    if (isLeavingLighthouse) {
      setLastEndingJournal(newJournal);
      setShowEndingModal(true);
    } else {
      setActiveTab('archive');
      alert("📝 등대 일지 보관소에 오늘 밤의 기록이 무사히 철해졌습니다! 안전한 휴식을 보내시기 바랍니다.");
    }
  };

  const deleteJournal = (id) => {
    if (!window.confirm("정말 이 등대 일지 기록을 영구 폐기하시겠습니까?")) return;
    setJournals(prev => prev.filter(j => j.id !== id));
  };

  const restartNewKeeper = () => {
    setKeeperProfile({
      playbookId: 'caretaker',
      name: '',
      gender: '',
      hateFact: '',
      careItem: '',
      reminder: '',
      ownSecret: '',
      ritual: '',
      proudWord: '',
      hideWord: '',
      hopeWord: '',
      misconceptionWord: '',
      apparel: [],
      keeperNo: Math.floor(1000 + Math.random() * 9000).toString()
    });
    localStorage.removeItem('lighthouse_keeper_profile');
    
    const freshShift = {
      phase: 1,
      date: '',
      time: '',
      moodId: 'happy',
      weatherTitle: '',
      weatherDesc: '',
      lightingAttempts: 1,
      lightingDifficulty: '',
      isLampLit: false,
      isClockworkWound: false,
      duties: [],
      remarks: ''
    };
    setShiftState(freshShift);
    localStorage.setItem('lighthouse_current_shift', JSON.stringify(freshShift));
    
    setIsLeavingLighthouse(false);
    setShowEndingModal(false);
    setLastEndingJournal(null);
    setActiveTab('character');
    alert("🆕 새로운 등대지기를 생성하는 성소로 이동했습니다. 당신의 다음 이야기를 시작하세요!");
  };

  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(journals, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `thelighthouse_journal_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importFromJson = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          if (window.confirm("불러온 파일의 저널 데이터로 기존 보관소 목록을 완전히 대체하시겠습니까?")) {
            setJournals(parsed);
            alert("등대 저널 데이터를 성공적으로 가져왔습니다!");
          }
        } else {
          alert("올바른 등대 저널 백업 파일 형식이 아닙니다.");
        }
      } catch (err) {
        console.error(err);
        alert("파일을 파싱하는 중 에러가 발생했습니다.");
      }
    };
  };

  // 미니게임: 해변 수색 플레이
  const handleBeachcombing = () => {
    const count = Math.ceil(parseInt(beachHour) / 2);
    const newFindings = [];

    for (let i = 0; i < count; i++) {
      const card = drawCard();
      const condition = Math.random() > 0.5 ? "작동 가능하며 양호함" : "파손되고 고장남";
      const source = card.color === '적색' ? "제국 행성 연맹" : "우주 심연의 공허";
      const itemType = BEACHCOMBING_ITEMS[card.value] || BEACHCOMBING_ITEMS["2"];

      newFindings.push({
        id: `${Date.now()}-${i}`,
        card: `${card.suit} ${card.value}`,
        type: itemType,
        source: source,
        condition: condition
      });
    }

    setBeachcombedItems(newFindings);
  };

  const keepScavengedItem = (item) => {
    setPersistentInventory(prev => [...prev, { ...item, timestamp: new Date().toLocaleString() }]);
    setBeachcombedItems(prev => prev.filter(i => i.id !== item.id));
    alert(`📦 부품 창고 추가: ${item.type}을 서비스 룸 선반에 보관했습니다.`);
  };

  const discardScavengedItem = (id) => {
    setBeachcombedItems(prev => prev.filter(i => i.id !== id));
  };

  const deleteInventoryItem = (id) => {
    setPersistentInventory(prev => prev.filter(i => i.id !== id));
  };

  // 미니게임: 어둠 속의 빛 플레이
  const handleLightInDark = () => {
    if (!lightQuestion.trim()) {
      alert("우주 끝의 불빛에게 타전할 질문 내용을 입력하세요!");
      return;
    }
    setIsTossingLightCoins(true);
    setLightCoinResult(null);

    let tick = 0;
    const interval = setInterval(() => {
      const r1 = Math.random() > 0.5 ? 'H' : 'T';
      const r2 = Math.random() > 0.5 ? 'H' : 'T';
      setLightCoinResult({ c1: r1, c2: r2 });
      tick++;
      if (tick > 10) {
        clearInterval(interval);
        const finalR1 = Math.random() > 0.5 ? 'H' : 'T';
        const finalR2 = Math.random() > 0.5 ? 'H' : 'T';
        const code = `${finalR1}${finalR2}`;
        const matchCode = (code === 'TH') ? 'HT' : code;

        const matchTable = LIGHT_IN_THE_DARK[matchCode];
        const shuffledWords = [...matchTable.words].sort(() => 0.5 - Math.random());
        const selected = shuffledWords.slice(0, 3).join(", ");

        const newConv = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          question: lightQuestion,
          coinCode: `${finalR1 === 'H' ? '앞면' : '뒷면'} + ${finalR2 === 'H' ? '앞면' : '뒷면'}`,
          responseType: matchTable.type,
          words: selected
        };

        setLightCoinResult({ c1: finalR1, c2: finalR2, outcome: matchTable.type, selectedWords: selected });
        setLightConversations(prev => [newConv, ...prev]);
        setLightQuestion('');
        setIsTossingLightCoins(false);
      }
    }, 90);
  };

  const clearLightHistory = () => {
    if (window.confirm("어둠 속의 불빛과 나눈 모든 대화 기록을 삭제하시겠습니까?")) {
      setLightConversations([]);
    }
  };

  // 일지 검색 필터링
  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      const query = archiveSearch.trim().toLowerCase();
      if (!query) return true;
      return (
        j.date.toLowerCase().includes(query) ||
        j.keeperName.toLowerCase().includes(query) ||
        j.playbookName.toLowerCase().includes(query) ||
        j.weather.toLowerCase().includes(query) ||
        j.dutiesLog.toLowerCase().includes(query) ||
        j.remarks.toLowerCase().includes(query)
      );
    });
  }, [journals, archiveSearch]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* ==========================================
          헤더 영역 및 클라우드 계정 정보
          ========================================== */}
      <header className="glass-panel" style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* 등대 회전 빔 헤더 로고 */}
          <div className="lighthouse-header-container" onClick={() => setActiveTab('character')} style={{ cursor: 'pointer' }}>
            <div className="lighthouse-illustration">
              <svg width="100%" height="100%" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 배경 그라데이션 */}
                  <linearGradient id="bgGrad" x1="50" y1="0" x2="50" y2="120" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#162e5c" />
                    <stop offset="100%" stopColor="#0a152d" />
                  </linearGradient>
                  {/* 왼쪽 광선 그라데이션 */}
                  <linearGradient id="beamGradLeft" x1="50" y1="35" x2="0" y2="35" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                    <stop offset="35%" stopColor="#e3efff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#e3efff" stopOpacity="0" />
                  </linearGradient>
                  {/* 오른쪽 광선 그라데이션 */}
                  <linearGradient id="beamGradRight" x1="50" y1="35" x2="100" y2="35" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                    <stop offset="35%" stopColor="#e3efff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#e3efff" stopOpacity="0" />
                  </linearGradient>
                  {/* 등대 광원 방사형 그라데이션 */}
                  <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="25%" stopColor="#fff6d1" stopOpacity="0.95" />
                    <stop offset="60%" stopColor="#ffdb7d" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ffdb7d" stopOpacity="0" />
                  </radialGradient>
                  {/* 등대 몸체 음영 그라데이션 */}
                  <linearGradient id="towerGrad" x1="38" y1="75" x2="62" y2="75" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="70%" stopColor="#f0f4fc" />
                    <stop offset="100%" stopColor="#cbdcf7" />
                  </linearGradient>
                  {/* 지붕 음영 그라데이션 */}
                  <linearGradient id="roofGrad" x1="42.5" y1="25" x2="57.5" y2="25" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6692db" />
                    <stop offset="100%" stopColor="#3b61a3" />
                  </linearGradient>
                </defs>

                {/* 밤하늘 배경 */}
                <rect width="100%" height="100%" rx="8" fill="url(#bgGrad)" />

                {/* 밤하늘 별들 */}
                <circle cx="20" cy="22" r="0.8" fill="#ffffff" opacity="0.9" />
                <circle cx="80" cy="28" r="1.1" fill="#ffffff" opacity="0.75" />
                <circle cx="24" cy="52" r="0.6" fill="#ffffff" opacity="0.9" />
                <circle cx="78" cy="68" r="0.9" fill="#ffffff" opacity="0.8" />
                <circle cx="18" cy="88" r="0.7" fill="#ffffff" opacity="0.6" />
                <circle cx="84" cy="92" r="1" fill="#ffffff" opacity="0.85" />
                <circle cx="32" cy="35" r="0.5" fill="#ffffff" opacity="0.5" />
                <circle cx="70" cy="48" r="0.8" fill="#ffffff" opacity="0.7" />

                {/* 좌측 하단 8각 별 */}
                <g transform="translate(24, 100) scale(0.65)">
                  <path d="M 0,-5 L 1,-1 L 5,0 L 1,1 L 0,5 L -1,1 L -5,0 L -1,-1 Z" fill="#ffffff" opacity="0.8" />
                  <path d="M 0,-5 L 1,-1 L 5,0 L 1,1 L 0,5 L -1,1 L -5,0 L -1,-1 Z" fill="#ffffff" opacity="0.8" transform="rotate(45)" />
                </g>

                {/* 우측 상단 8각 별 */}
                <g transform="translate(76, 18) scale(0.5)">
                  <path d="M 0,-5 L 1,-1 L 5,0 L 1,1 L 0,5 L -1,1 L -5,0 L -1,-1 Z" fill="#ffffff" opacity="0.7" />
                  <path d="M 0,-5 L 1,-1 L 5,0 L 1,1 L 0,5 L -1,1 L -5,0 L -1,-1 Z" fill="#ffffff" opacity="0.7" transform="rotate(45)" />
                </g>

                {/* 룰북 스타일의 더블 테두리 선 */}
                <rect x="6" y="6" width="88" height="108" rx="4" fill="none" stroke="#7da1d9" strokeWidth="1.2" opacity="0.8" />
                <rect x="9" y="9" width="82" height="102" rx="2" fill="none" stroke="#7da1d9" strokeWidth="0.6" opacity="0.8" />

                {/* 등대 빛 광원 (빛나는 펄스 애니메이션 포함) */}
                <circle cx="50" cy="35" r="15" fill="url(#radialGlow)" className="lighthouse-glow-pulse" />

                {/* 등대 좌우 광선 빔 */}
                <polygon points="50,35 0,10 0,60" fill="url(#beamGradLeft)" opacity="0.7" className="lighthouse-beam-pulse" />
                <polygon points="50,35 100,10 100,60" fill="url(#beamGradRight)" opacity="0.7" className="lighthouse-beam-pulse" />

                {/* 등대 몸체 */}
                <polygon points="38,108 45,42 55,42 62,108" fill="url(#towerGrad)" stroke="#0d2350" strokeWidth="1.5" />

                {/* 등대 몸체 내부 창문 */}
                <rect x="48.5" y="60" width="3" height="6" rx="1.5" fill="#0d2350" />
                <rect x="48.5" y="82" width="3" height="6" rx="1.5" fill="#0d2350" />

                {/* 등대 발코니 슬랩 */}
                <rect x="42" y="41.5" width="16" height="3" rx="0.5" fill="#0d2350" />
                
                {/* 등대 발코니 난간/펜스 */}
                <line x1="43" y1="38" x2="57" y2="38" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="44" y1="38" x2="44" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="47" y1="38" x2="47" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="50" y1="38" x2="50" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="53" y1="38" x2="53" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="56" y1="38" x2="56" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />

                {/* 등대 광원실 창문 격자(Grid) */}
                <rect x="45" y="30.5" width="10" height="11" fill="none" stroke="#0d2350" strokeWidth="1.5" />
                <line x1="47.5" y1="30.5" x2="47.5" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="50" y1="30.5" x2="50" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="52.5" y1="30.5" x2="52.5" y2="41.5" stroke="#0d2350" strokeWidth="0.8" />
                <line x1="45" y1="36" x2="55" y2="36" stroke="#0d2350" strokeWidth="0.8" />

                {/* 지붕 */}
                <path d="M 42.5 30.5 C 42.5 30.5, 50 28.5, 57.5 30.5 L 50 19 Z" fill="url(#roofGrad)" stroke="#0d2350" strokeWidth="1.5" />

                {/* 핀/첨탑 */}
                <line x1="50" y1="19" x2="50" y2="12" stroke="#0d2350" strokeWidth="1.2" />

                {/* 등대 꼭대기 8각 별 문양 */}
                <g transform="translate(50, 12) scale(0.9)">
                  <path d="M 0,-6 L 1.3,-1.3 L 6,0 L 1.3,1.3 L 0,6 L -1.3,1.3 L -6,0 L -1.3,-1.3 Z" fill="#ffffff" stroke="#0d2350" strokeWidth="0.6" />
                  <path d="M 0,-6 L 1.3,-1.3 L 6,0 L 1.3,1.3 L 0,6 L -1.3,1.3 L -6,0 L -1.3,-1.3 Z" fill="#ffffff" stroke="#0d2350" strokeWidth="0.6" transform="rotate(45)" />
                </g>
              </svg>
            </div>
            <div>
              <h1 className="serif-font" style={{ fontSize: '26px', color: 'var(--text-gold)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                우주 끝의 등대 <Sparkles size={20} />
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                우주 끝에 홀로 남겨진 이들을 위한 등대지기 일지 기록기
              </p>
            </div>
          </div>

          {/* 구글 로그인 컨트롤 (스크린샷 Mockup과 100% 동일하게 일치시킨 수평형 동기화 제어 바) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {googleUser ? (
              <div className="sync-bar-container">
                {/* 1. CLOUD SYNC 상태 배지 */}
                <div className="sync-status-badge">
                  <span className="sync-status-dot active" />
                  <span>CLOUD SYNC ({googleUser.name})</span>
                </div>

                {/* 2. 올리기 캡슐 버튼 (어두운 초록) */}
                <button 
                  className="sync-btn-upload" 
                  disabled={isCloudSyncing}
                  onClick={syncToCloud}
                  title="오늘 작성한 일지 및 인벤토리를 클라우드로 안전하게 업로드"
                >
                  <InboxUploadIcon />
                  <span>올리기</span>
                </button>

                {/* 3. 가져오기 캡슐 버튼 (흰색/테두리) */}
                <button 
                  className="sync-btn-download" 
                  disabled={isCloudSyncing}
                  onClick={restoreFromCloud}
                  title="클라우드 저장소 백업에서 모든 일지 데이터를 내 컴퓨터로 복원"
                >
                  <InboxDownloadIcon />
                  <span>가져오기</span>
                </button>

                {/* 4. 로그아웃 버튼 (분홍/빨강) */}
                <button 
                  className="sync-btn-logout" 
                  onClick={handleLogOut}
                  title="구글 계정 연결 해제 및 로그아웃"
                >
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <div className="sync-bar-container">
                {/* 비활성화 상태 배지 */}
                <div className="sync-status-badge" style={{ opacity: 0.8 }}>
                  <span className="sync-status-dot inactive" />
                  <span>CLOUD SYNC (미연동)</span>
                </div>

                {/* 구글 로그인 연동 버튼 */}
                <button 
                  className="stellar-btn" 
                  onClick={handleGoogleLogin}
                  style={{ borderRadius: '9999px', padding: '8px 18px', fontSize: '13px' }}
                >
                  <LogIn size={14} /> 구글 로그인
                </button>

                {/* 체험 모드 버튼 */}
                <button 
                  className="stellar-btn-outline" 
                  onClick={startDemoSession}
                  style={{ borderRadius: '9999px', padding: '8px 18px', fontSize: '13px' }}
                >
                  체험 모드
                </button>
              </div>
            )}
            

          </div>
        </div>

        {/* 기후 대이변 현황 바 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px', 
          background: 'var(--card-bg-dark)', 
          border: '1px solid rgba(223, 183, 108, 0.2)', 
          borderRadius: '8px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} className="card-symbol-art" style={{ stroke: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>현재 기상 대이변 상황:</span>
            {activeSeason ? (
              <span className="stellar-badge cyan-badge">
                🚨 {activeSeason.name} (앞으로 {activeSeason.durationLeft}일간 지속)
              </span>
            ) : (
              <span className="stellar-badge">🌤️ 평온한 보통의 밤</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="stellar-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => { setDrawerTab('keepers'); setIsDrawerOpen(true); }}>
              <BookOpen size={12} /> 선대 등대지기의 일지록
            </button>
            <button className="stellar-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => { setDrawerTab('glossary'); setIsDrawerOpen(true); }}>
              <BookMarked size={12} /> 등대 교본 용어집
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          탭 내비게이션
          ========================================== */}
      <nav className="tab-nav">
        <button className={`tab-btn ${activeTab === 'character' ? 'active' : ''}`} onClick={() => setActiveTab('character')}>
          <Grid size={16} /> 등대지기 플레이북 선택
        </button>
        <button className={`tab-btn ${activeTab === 'shift' ? 'active' : ''}`} onClick={() => setActiveTab('shift')}>
          <Compass size={16} /> 오늘 밤의 등대 시프트 {shiftState.isLampLit && "🔥"}
        </button>
        <button className={`tab-btn ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => setActiveTab('archive')}>
          <Archive size={16} /> 등대 일지 보관소 ({journals.length})
        </button>
        <button className={`tab-btn ${activeTab === 'minigames' ? 'active' : ''}`} onClick={() => setActiveTab('minigames')}>
          <Sparkles size={16} /> 우주 미니게임 허브
        </button>
        <button className={`tab-btn ${activeTab === 'seasons' ? 'active' : ''}`} onClick={() => setActiveTab('seasons')}>
          <Layers size={16} /> 대기후 시즌 추적
        </button>
      </nav>

      {/* ==========================================
          1. 플레이북 탭 (지기 자아 커스터마이저)
          ========================================== */}
      {activeTab === 'character' && (
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="helper-box">
            <h4 className="helper-title"><Info size={16} /> 등대지기 플레이북 설정 가이드</h4>
            <p className="helper-content">
              우주 끝의 등대에서 평생의 시프트를 보낼 당신의 플레이북 캐릭터를 생성합니다. 
              각 플레이북은 고유한 마음의 상처와 등대지기를 자원한 과거사가 숨겨져 있습니다. 
              지기님이 선택한 특성 단어와 잘 다루는 강점, 그리고 취약한 한계점들은 밤의 수리와 관측 작업 수행 시, 
              일지에 녹여낼 서사적 상황 프롬프트에 직접적인 영향력을 행사합니다.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(223, 183, 108, 0.2)', paddingBottom: '10px' }}>
            <h2 className="serif-font" style={{ fontSize: '20px', color: 'var(--text-gold)' }}>
              1. 등대지기 플레이북 자아 설정
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              등대지기 고유대장 번호: <span className="stellar-badge">No. {keeperProfile.keeperNo}</span>
            </div>
          </div>

          <div className="playbook-grid">
            {PLAYBOOKS.map((p) => (
              <div 
                key={p.id} 
                className={`playbook-card ${keeperProfile.playbookId === p.id ? 'selected' : ''}`}
                onClick={() => setKeeperProfile(prev => ({ ...prev, playbookId: p.id }))}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 className="serif-font" style={{ fontSize: '19px', fontWeight: 'bold', color: 'var(--text-gold)' }}>{p.nameKo}</h4>
                  {keeperProfile.playbookId === p.id && <CheckCircle size={18} style={{ color: 'var(--accent-cyan)' }} />}
                </div>
                <p style={{ fontSize: '14.5px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {p.description}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--card-bg-dark)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(223, 183, 108, 0.1)' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>지기 이름:</label>
                <input 
                  type="text" 
                  className="stellar-input" 
                  value={keeperProfile.name} 
                  onChange={(e) => setKeeperProfile(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 클라라, 세바스찬, 에단..." 
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>지기의 성별 성향:</label>
                <select 
                  className="stellar-select" 
                  value={keeperProfile.gender}
                  onChange={(e) => setKeeperProfile(prev => ({ ...prev, gender: e.target.value }))}
                >
                  <option value="">-- 성별 선택 --</option>
                  {activePlaybook.genderChoices.map((g, idx) => (
                    <option key={idx} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>{activePlaybook.nameLabel}</label>
                <div className="customizer-options-group">
                  {activePlaybook.nameChoices.map((choice, idx) => (
                    <button 
                      key={idx} 
                      className={`customizer-option-btn ${keeperProfile.name === choice ? 'selected' : ''}`}
                      onClick={() => setKeeperProfile(prev => ({ ...prev, name: choice }))}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>{activePlaybook.hateLabel}</label>
                <div className="customizer-options-group">
                  {activePlaybook.hateFacts.map((fact, idx) => (
                    <button 
                      key={idx} 
                      className={`customizer-option-btn ${keeperProfile.hateFact === fact ? 'selected' : ''}`}
                      onClick={() => setKeeperProfile(prev => ({ ...prev, hateFact: fact }))}
                    >
                      {fact}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>{activePlaybook.careLabel}</label>
                <div className="customizer-options-group">
                  {activePlaybook.careChoices.map((item, idx) => (
                    <button 
                      key={idx} 
                      className={`customizer-option-btn ${keeperProfile.careItem === item ? 'selected' : ''}`}
                      onClick={() => setKeeperProfile(prev => ({ ...prev, careItem: item }))}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>{activePlaybook.reminderLabel}</label>
                <div className="customizer-options-group">
                  {activePlaybook.reminderChoices.map((rem, idx) => (
                    <button 
                      key={idx} 
                      className={`customizer-option-btn ${keeperProfile.reminder === rem ? 'selected' : ''}`}
                      onClick={() => setKeeperProfile(prev => ({ ...prev, reminder: rem }))}
                    >
                      {rem}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activePlaybook.ownSecretLabel && (
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>{activePlaybook.ownSecretLabel}</label>
                <div className="customizer-options-group">
                  {activePlaybook.ownSecretChoices.map((sec, idx) => (
                    <button 
                      key={idx} 
                      className={`customizer-option-btn ${keeperProfile.ownSecret === sec ? 'selected' : ''}`}
                      onClick={() => setKeeperProfile(prev => ({ ...prev, ownSecret: sec }))}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePlaybook.ritualLabel && (
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>{activePlaybook.ritualLabel}</label>
                <div className="customizer-options-group">
                  {activePlaybook.ritualChoices.map((rit, idx) => (
                    <button 
                      key={idx} 
                      className={`customizer-option-btn ${keeperProfile.ritual === rit ? 'selected' : ''}`}
                      onClick={() => setKeeperProfile(prev => ({ ...prev, ritual: rit }))}
                    >
                      {rit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>
                지기 성향 문장 설정
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px' }}>
                  ✦ {activePlaybook.proudQuestion.replace('[단어]', `[${keeperProfile.proudWord || '______'}]`)}
                </div>
                <div style={{ fontSize: '13px' }}>
                  ✦ {activePlaybook.hideQuestion.replace('[단어]', `[${keeperProfile.hideWord || '______'}]`)}
                </div>
                {activePlaybook.hopeQuestion && (
                  <div style={{ fontSize: '13px' }}>
                    ✦ {activePlaybook.hopeQuestion.replace('[단어]', `[${keeperProfile.hopeWord || '______'}]`)}
                  </div>
                )}
                {activePlaybook.misconceptionQuestion && (
                  <div style={{ fontSize: '13px' }}>
                    ✦ {activePlaybook.misconceptionQuestion.replace('[단어]', `[${keeperProfile.misconceptionWord || '______'}]`)}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'var(--card-bg-dark)', padding: '10px', borderRadius: '6px', border: '1px solid var(--section-border)' }}>
                {activePlaybook.words.map((w, idx) => {
                  const isProud = keeperProfile.proudWord === w;
                  const isHide = keeperProfile.hideWord === w;
                  const isHope = keeperProfile.hopeWord === w;
                  const isMisconception = keeperProfile.misconceptionWord === w;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button 
                        className="stellar-btn-outline" 
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: '11px', 
                          borderColor: isProud ? 'var(--accent-cyan)' : 'var(--border-color)',
                          background: isProud ? 'var(--accent-cyan-glow)' : 'transparent',
                          color: isProud ? 'var(--accent-cyan)' : 'var(--text-primary)',
                          fontWeight: isProud ? 'bold' : 'normal'
                        }} 
                        onClick={() => setKeeperProfile(prev => ({ ...prev, proudWord: w }))}
                      >
                        자부심: {w}
                      </button>
                      <button 
                        className="stellar-btn-outline" 
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: '11px', 
                          borderColor: isHide ? '#ef4444' : 'var(--border-color)',
                          background: isHide ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                          color: isHide ? '#ef4444' : 'var(--text-primary)',
                          fontWeight: isHide ? 'bold' : 'normal'
                        }} 
                        onClick={() => setKeeperProfile(prev => ({ ...prev, hideWord: w }))}
                      >
                        숨길 점: {w}
                      </button>
                      {activePlaybook.hopeQuestion && (
                        <button 
                          className="stellar-btn-outline" 
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '11px', 
                            borderColor: isHope ? 'var(--text-gold)' : 'var(--border-color)',
                            background: isHope ? 'var(--badge-bg)' : 'transparent',
                            color: isHope ? 'var(--text-gold)' : 'var(--text-primary)',
                            fontWeight: isHope ? 'bold' : 'normal'
                          }} 
                          onClick={() => setKeeperProfile(prev => ({ ...prev, hopeWord: w }))}
                        >
                          희망: {w}
                        </button>
                      )}
                      {activePlaybook.misconceptionQuestion && (
                        <button 
                          className="stellar-btn-outline" 
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '11px', 
                            borderColor: isMisconception ? 'var(--text-gold)' : 'var(--border-color)',
                            background: isMisconception ? 'var(--badge-bg)' : 'transparent',
                            color: isMisconception ? 'var(--text-gold)' : 'var(--text-primary)',
                            fontWeight: isMisconception ? 'bold' : 'normal'
                          }} 
                          onClick={() => setKeeperProfile(prev => ({ ...prev, misconceptionWord: w }))}
                        >
                          오해: {w}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>
                {activePlaybook.apparelLabel}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activePlaybook.clothingChoices.map((cloth, idx) => {
                  const isChecked = keeperProfile.apparel.includes(cloth);
                  return (
                    <button 
                      key={idx}
                      className={`stellar-radio-box ${isChecked ? 'selected' : ''}`}
                      onClick={() => {
                        setKeeperProfile(prev => {
                          const apparel = isChecked 
                            ? prev.apparel.filter(a => a !== cloth) 
                            : [...prev.apparel, cloth];
                          return { ...prev, apparel };
                        });
                      }}
                    >
                      <span className="radio-dot" /> {cloth}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(223, 183, 108, 0.2)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px' }}>
                <strong style={{ color: '#ef4444' }}>⚠️ 취약 작업:</strong> {activePlaybook.struggles}
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>🌟 강점 작업:</strong> {activePlaybook.excels}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                className="stellar-btn" 
                onClick={() => { setActiveTab('shift'); punchShiftTime(); }}
              >
                <Play size={16} /> 오늘 밤의 등대 시프트 일과 시작하기
              </button>
            </div>

          </div>

        </section>
      )}

      {/* ==========================================
          2. 등대 업무 교대 시프트 탭
          ========================================== */}
      {activeTab === 'shift' && (
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(223, 183, 108, 0.2)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span className="serif-font" style={{ fontSize: '18px', color: shiftState.phase === 1 ? 'var(--text-gold)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {shiftState.phase > 1 ? "✓" : <span className="sans-font">1.</span>} 시작 및 기후 결정
            </span>
            <span className="serif-font" style={{ fontSize: '18px', color: shiftState.phase === 2 ? 'var(--text-gold)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {shiftState.phase > 2 ? "✓" : <span className="sans-font">2.</span>} 점등 의식 {shiftState.isLampLit && "🔥"}
            </span>
            <span className="serif-font" style={{ fontSize: '18px', color: shiftState.phase === 3 ? 'var(--text-gold)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {shiftState.phase > 3 ? "✓" : <span className="sans-font">3.</span>} 밤의 임무 ({shiftState.duties.length}개 완료)
            </span>
            <span className="serif-font" style={{ fontSize: '18px', color: shiftState.phase === 4 ? 'var(--text-gold)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="sans-font">4.</span> 일과 종료 및 성찰
            </span>
          </div>

          {/* 단계 1: 시작 및 기후 결정 */}
          {shiftState.phase === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="helper-box">
                <h4 className="helper-title"><Info size={16} /> 등대의 시작</h4>
                <p className="helper-content">
                  등대의 나선형 계단을 올라 등대실에 도달했습니다. 날짜와 시간을 장부에 기입한 후, 
                  당신의 실제 기분 상태 혹은 캐릭터의 심적 상태에 해당하는 <strong>기분</strong>을 선택해 보세요. 
                  우주 끝의 등대는 등대지기의 감정과 감응하여 그날 밤의 <strong>기후</strong>를 연동하여 설정하며, 
                  이는 오늘 밤 전체에 흐르는 미스터리한 대기적 분위기와 시즌 변화의 기초가 됩니다.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>관측 일자:</label>
                  <input 
                    type="date" 
                    className="stellar-input" 
                    value={shiftState.date}
                    onChange={(e) => setShiftState(prev => ({ ...prev, date: e.target.value }))} 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>관측 시간:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="stellar-input" 
                      value={shiftState.time}
                      onChange={(e) => setShiftState(prev => ({ ...prev, time: e.target.value }))}
                      placeholder="예: 23:45" 
                    />
                    <button className="stellar-btn-outline" onClick={punchShiftTime}>현재시간</button>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>
                  현재 등대지기님의 기분 상태를 선택하세요:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                  {WEATHER_PATTERNS.map((w) => (
                    <button 
                      key={w.id}
                      className={`customizer-option-btn ${shiftState.moodId === w.id ? 'selected' : ''}`}
                      onClick={() => handleWeatherSelect(w.id)}
                    >
                      <strong>{w.mood}</strong>
                    </button>
                  ))}
                </div>
              </div>

              {shiftState.weatherTitle && (
                <div style={{ background: 'rgba(3, 7, 18, 0.4)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <h4 className="serif-font" style={{ color: 'var(--text-gold)', fontSize: '16px', marginBottom: '6px' }}>
                    📡 감응형 우주 기후 연동: {shiftState.weatherTitle}
                  </h4>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                    {shiftState.weatherDesc}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="stellar-btn" 
                  disabled={!shiftState.date || !shiftState.time || !shiftState.weatherTitle}
                  onClick={() => setShiftState(prev => ({ ...prev, phase: 2 }))}
                >
                  렌즈실 점등 의식으로 넘어가기 <Play size={14} />
                </button>
              </div>

            </div>
          )}

          {/* 단계 2: 등대 점등 의식 */}
          {shiftState.phase === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="helper-box cyan-accent">
                <h4 className="helper-title" style={{ color: 'var(--accent-cyan)' }}><Info size={16} /> 등대의 점등</h4>
                <p className="helper-content">
                  랜턴은 등대의 심장이며, 거대한 렌즈 뒤에서 타올라 우주 절벽을 환하게 비춥니다. 
                  점등 의식은 엄숙합니다. 물리 법칙에 따라 <strong>동전 앞면</strong>과 <strong>적색 카드</strong>가 
                  동시에 일치해야만 불씨가 붙게 됩니다. 
                  실패할 경우, 왜 점등이 지연되고 힘겨웠는지 사유를 적어 나갑니다.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'rgba(3, 7, 18, 0.4)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <h4 className="serif-font" style={{ fontSize: '18px', color: 'var(--accent-cyan)' }}>
                  점등 시도 횟수: <span className="stellar-badge cyan-badge">{shiftState.lightingAttempts}회째</span>
                </h4>

                <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div className="stellar-coin-slot" onClick={handleWickToss}>
                    <div className={`stellar-coin-inner ${isTossingWick ? 'tossing' : (wickCoinResult === 'heads' ? 'heads' : 'tails')}`}>
                      <div className="stellar-coin-face heads-face">앞면</div>
                      <div className="stellar-coin-face tails-face">뒷면</div>
                    </div>
                  </div>

                  <div className="stellar-card-slot" onClick={handleWickToss}>
                    <div className={`stellar-card-inner ${wickCardResult ? 'flipped' : ''}`}>
                      <div className="stellar-card-face stellar-card-back cyan-border">
                        <Sparkles size={24} className="card-symbol-art" style={{ stroke: 'var(--accent-cyan)' }} />
                        <span style={{ fontSize: '11px' }}>카드 뽑기</span>
                      </div>
                      <div className="stellar-card-face stellar-card-front" style={{ borderColor: 'var(--accent-cyan)' }}>
                        {wickCardResult && (
                          <div style={{ color: wickCardResult.color === '적색' ? '#ef4444' : 'var(--text-primary)' }}>
                            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>{wickCardResult.suit}</span>
                            <h4 className="serif-font" style={{ fontSize: '18px' }}>{wickCardResult.value}</h4>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                              ({wickCardResult.color})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  className="stellar-btn stellar-btn-cyan" 
                  disabled={isTossingWick || shiftState.isLampLit}
                  onClick={handleWickToss}
                >
                  <Coins size={16} /> 동전 던지기 및 카드 뽑기!
                </button>

                {wickCoinResult && (
                  <div style={{ textAlign: 'center', fontSize: '14px' }}>
                    동전: <strong style={{ color: wickCoinResult === 'heads' ? 'var(--text-gold)' : 'var(--text-secondary)' }}>
                      {wickCoinResult === 'heads' ? '앞면 [통과]' : '뒷면 [실패]'}
                    </strong>
                    {" | "}
                    카드: <strong style={{ color: wickCardResult.color === '적색' ? '#ef4444' : 'var(--text-secondary)' }}>
                      {wickCardResult.suit} {wickCardResult.value} ({wickCardResult.color} [지정])
                    </strong>
                  </div>
                )}
              </div>

              {shiftState.lightingAttempts > 1 && !shiftState.isLampLit && (
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>
                    💡 불길이 단번에 붙지 않고 꺼져버렸습니다. 왜 점등에 실패하고 지체되었는지 그 고난의 이유를 간략히 적으세요:
                  </label>
                  <input 
                    type="text" 
                    className="stellar-input" 
                    value={shiftState.lightingDifficulty}
                    onChange={(e) => setShiftState(prev => ({ ...prev, lightingDifficulty: e.target.value }))}
                    placeholder="예: 바람이 너무 강함, 등유 심지가 젖음, 피로로 손이 마구 떨림..." 
                  />
                </div>
              )}

              {shiftState.isLampLit && (
                <div className="glass-panel" style={{ background: 'rgba(56, 189, 248, 0.05)', borderColor: 'var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)' }}>
                    <CheckCircle size={20} />
                    <strong style={{ fontSize: '15px' }}>태엽장치 및 렌즈 점등 완벽 가동 중!</strong>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    시계추 태엽을 감았으며, 등대의 빛이 우주의 암흑 낭떠러지를 규칙적으로 쓸어 비추기 시작했습니다.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="stellar-btn-outline" onClick={() => setShiftState(prev => ({ ...prev, phase: 1 }))}>
                  이전 단계
                </button>
                <button 
                  className="stellar-btn" 
                  disabled={!shiftState.isLampLit}
                  onClick={() => setShiftState(prev => ({ ...prev, phase: 3 }))}
                >
                  오늘 밤의 등대 임무 수행 시작 <Play size={14} />
                </button>
              </div>

            </div>
          )}

          {/* 단계 3: 밤의 임무 수행 */}
          {shiftState.phase === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="helper-box">
                <h4 className="helper-title"><Info size={16} /> 밤의 등대 임무</h4>
                <p className="helper-content">
                  등대는 외롭고 위험한 공간이며, 밤새 쉬지 않고 돌봐주어야만 정상 작동합니다. 
                  지기님의 오늘 밤 기후나 스토리 흐름에 걸맞은 임무 유형을 골라보세요. 
                  각 임무는 주사위(1d6)를 굴려 6개의 세부 업무 중 하나를 부여받고, 카드(Card)를 뽑아 4가지 난이도나 세부 판정을 시뮬레이션합니다. 
                  임무를 수행한 후, 등대지기가 어떻게 대처하여 완료했는지 상상의 나래를 펴서 일지(Duty Log)를 작성하고 등록하세요!
                </p>
                <p className="helper-content" style={{ marginTop: '8px', borderTop: '1px dashed var(--section-border)', paddingTop: '8px', fontStyle: 'italic', color: 'var(--text-gold)', fontSize: '12px' }}>
                  💡 <strong>[룰북 p.40 필수 규칙]:</strong> 한 밤중에 꼭 하나의 임무만 수행해야 하는 것이 아닙니다! 등대의 보살핌이 충분하다고 느낄 때까지 언제든지 업무 목록으로 되돌아와 <strong>여러 임무를 반복 수행</strong>하며 일지를 누적해 나갈 수 있습니다.
                </p>
              </div>

              {shiftState.duties.length > 0 && (
                <div>
                  <h4 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '8px' }}>
                    🗂️ 오늘 밤 임무 수행 완료 목록:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {shiftState.duties.map((d, idx) => (
                      <div key={idx} style={{ padding: '12px', background: 'var(--card-bg-dark)', border: '1px solid var(--section-border)', borderRadius: '6px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 'bold' }}>
                          <span style={{ color: 'var(--text-gold)' }}>{d.title}</span>
                          <span className="stellar-badge">카드: {d.cardDrawn} ({d.cardColor})</span>
                        </div>
                        <p style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>{d.details} - {d.outcome}</p>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '6px', borderTop: '1px dashed var(--section-border)', paddingTop: '6px' }}>
                          <strong>일지 기록:</strong> {d.userLog}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!activeDutyType && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* 날씨 연동 밤의 분위기 판정 권장 업무 가이드 (룰북 p.41) */}
                  {shiftState.moodId && getWeatherRecommendation(shiftState.moodId) && (() => {
                    const rec = getWeatherRecommendation(shiftState.moodId);
                    return (
                      <div className="helper-box cyan-accent" style={{ borderLeftColor: 'var(--text-gold)', background: 'var(--card-bg-dark)', padding: '14px' }}>
                        <h4 className="helper-title" style={{ color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                          📡 룰북 p.41: 밤의 분위기에 따른 권장 임무 가이드
                        </h4>
                        <p className="helper-content" style={{ fontSize: '13px', lineHeight: '1.6', marginTop: '4px' }}>
                          오늘 밤 등대 바깥의 성간 기후 분위기는 <strong>{rec.moodDesc}</strong> 상태입니다. 
                          룰북의 기후 감응 수칙에 의거하여, 지기님은 오늘 밤 <strong>[{rec.recTypeKo}]</strong> 임무를 우선 수행하는 것이 권장됩니다.
                          <span style={{ display: 'block', marginTop: '6px', fontSize: '12.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            &quot;{rec.reason}&quot;
                          </span>
                        </p>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', padding: '20px', background: 'var(--subtle-bg)', borderRadius: '8px', border: '1px solid var(--section-border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-gold)' }}>새로운 업무의 범주를 선택하여 시뮬레이션을 개시하세요:</span>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button 
                        className="stellar-btn" 
                        onClick={() => { setActiveDutyType('maintenance'); triggerMaintenanceTask(); }}
                      >
                        <Settings size={16} /> <span className="sans-font">1.</span> 도구 및 등대 유지보수
                      </button>
                      <button 
                        className="stellar-btn" 
                        onClick={() => { setActiveDutyType('observation'); triggerObservationTask(); }}
                      >
                        <BookOpen size={16} /> <span className="sans-font">2.</span> 경외로운 우주 관측
                      </button>
                      <button 
                        className="stellar-btn" 
                        onClick={() => { setActiveDutyType('happening'); triggerHappeningTask(); }}
                      >
                        <AlertCircle size={16} /> <span className="sans-font">3.</span> 불시의 우주 사건
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {activeDutyType && currentDutyResult && (
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--panel-bg-alt)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--section-border)', paddingBottom: '10px' }}>
                    <h4 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Dices size={16} /> {currentDutyResult.title}
                    </h4>
                    <button className="stellar-btn-outline" style={{ padding: '2px 6px', fontSize: '11px', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => { setActiveDutyType(null); setCurrentDutyResult(null); }}>
                      취소
                    </button>
                  </div>

                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-gold)' }}>
                      업무 타겟: {currentDutyResult.details}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                      {currentDutyResult.description}
                    </p>
                    <p style={{ fontSize: '12px', background: 'var(--card-bg-dark)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--border-color)', marginTop: '8px', color: 'var(--text-primary)', opacity: 0.9 }}>
                      <strong>교본 예시:</strong> {currentDutyResult.examples}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px dashed var(--section-border)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-gold)' }}>카드 판정:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                        <span className="stellar-badge cyan-badge">
                          뽑은 카드: {currentDutyResult.cardDrawn} ({currentDutyResult.cardColor})
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '8px', fontStyle: 'italic' }}>
                        {currentDutyResult.outcome}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-gold)' }}>플레이북 연동 서사 규칙:</span>
                      {currentDutyResult.type === 'maintenance' ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '6px' }}>
                          {currentDutyResult.characterEffect}
                        </p>
                      ) : currentDutyResult.type === 'observation' ? (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '6px' }}>
                            <strong>관측 프롬프트 질문:</strong> {currentDutyResult.questions}
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                            {currentDutyResult.severity}
                          </p>
                          {currentDutyResult.autoAction === 'time_warp_forward' && (
                            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.3)', marginTop: '6px' }}>
                              <span style={{ fontSize: '12.5px', color: '#c084fc', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                                ⏩ [룰북 p.47 특수 규칙] 시간 도약 발동 가능!
                              </span>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                9번 카드의 특수한 시간 왜곡 작용으로 인해 오늘 밤의 지루한 지기 근무를 즉시 건너뛰고 바로 사후 회고 및 종료 단계로 진입할 수 있습니다.
                              </p>
                              <button
                                className="stellar-btn"
                                style={{ background: '#a855f7', color: '#fff', fontSize: '11.5px', padding: '6px 12px', width: '100%', cursor: 'pointer' }}
                                onClick={() => {
                                  const currentLog = currentDutyResult.userLog.trim() 
                                    ? currentDutyResult.userLog 
                                    : "시간의 대도약이 발생하여 오늘 밤의 근무가 즉시 막을 내립니다.";
                                  setShiftState(prev => ({
                                    ...prev,
                                    duties: [...prev.duties, { ...currentDutyResult, userLog: currentLog + " [9번 카드 시간 도약 발동으로 근무 즉시 종료]" }],
                                    phase: 4
                                  }));
                                  setCurrentDutyResult(null);
                                  setActiveDutyType(null);
                                  alert("⏩ [시간 도약] 9번 카드 효과로 인해 오늘 밤의 지기 근무가 즉시 종료되고, 사후 성찰 및 회고 단계로 이동합니다.");
                                }}
                              >
                                시간 도약 발동: 밤 즉시 종료 및 회고 단계로 이동
                              </button>
                            </div>
                          )}
                          {currentDutyResult.autoAction === 'time_warp_backward' && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', marginTop: '6px' }}>
                              <span style={{ fontSize: '12.5px', color: '#f87171', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                                ⏪ [룰북 p.47 특수 규칙] 시간 역행 발동! (강제)
                              </span>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                K번 카드의 인과율 왜곡 작용에 휘말려 오늘 밤 진행했던 모든 업무 기록이 소멸하고 시간선이 점등 의식 직전으로 되돌아갑니다.
                              </p>
                              <button
                                className="stellar-btn"
                                style={{ background: '#dc2626', color: '#fff', fontSize: '11.5px', padding: '6px 12px', width: '100%', cursor: 'pointer' }}
                                onClick={() => {
                                  setShiftState(prev => ({
                                    ...prev,
                                    duties: [],
                                    isLampLit: false,
                                    lightingAttempts: 1,
                                    phase: 1
                                  }));
                                  setWickCardResult(null);
                                  setCurrentDutyResult(null);
                                  setActiveDutyType(null);
                                  alert("⏪ [시간 역행] K번 카드 효과로 인해 우주의 인과율이 격렬하게 꼬이며 오늘 밤의 모든 업무 기록이 새하얗게 증발했습니다! 시간선이 되감겨 오늘 밤 점등 단계(단계 1)부터 다시 시작해야 합니다.");
                                }}
                              >
                                시간 역행 발동: 오늘 밤 기록 초기화 및 점등 단계로 리셋
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Beachcombed Inventory utility */}
                  {currentDutyResult.type === 'maintenance' && persistentInventory.length > 0 && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <Package size={12} /> 서비스 룸 부품 창고 활용 (수색 획득품 소비):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {persistentInventory.map((inv) => (
                          <button 
                            key={inv.id} 
                            className="stellar-btn-outline" 
                            style={{ fontSize: '11px', padding: '3px 6px', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
                            onClick={() => {
                              setCurrentDutyResult(prev => ({
                                ...prev,
                                userLog: prev.userLog + ` [서비스실 보관 부품 활용: ${inv.type} (${inv.condition})]`
                              }));
                              deleteInventoryItem(inv.id);
                              alert(`🔧 사용 완료: [${inv.type}]을 소모하여 임무에 활용했습니다. 서비스 룸 인벤토리에서 소멸되었습니다.`);
                            }}
                          >
                            소비하기: {inv.type} ({inv.condition})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '6px' }}>
                      ✍️ 이 임무를 어떻게 완료했는지 서사적으로 구체적 일지를 작성하세요:
                    </label>
                    <textarea 
                      className="stellar-input" 
                      value={currentDutyResult.userLog}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentDutyResult(prev => ({ ...prev, userLog: val }));
                      }}
                      placeholder="상세한 유지보수 과정, 관측된 우주의 아름다움과 그 소감, 혹은 갑작스러운 우주 재난에 대한 지기의 신체적/감정적 반응을 일지 형식으로 빼놓지 말고 생생하게 적어보세요..." 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="stellar-btn" 
                      disabled={!currentDutyResult.userLog.trim()}
                      onClick={addDutyToShift}
                    >
                      <Save size={14} /> 일지에 기록 및 임무 임시 저장
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(223, 183, 108, 0.2)', paddingTop: '16px' }}>
                <button className="stellar-btn-outline" onClick={() => setShiftState(prev => ({ ...prev, phase: 2 }))}>
                  이전 단계
                </button>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>오늘 밤의 근무 피로도 강도:</label>
                  <select 
                    className="stellar-select" 
                    style={{ width: '150px', padding: '6px 10px' }}
                    value={endingIntensity}
                    onChange={(e) => setEndingIntensity(e.target.value)}
                  >
                    <option value="quiet">평온한 밤 (1회 셔플)</option>
                    <option value="steady">평범한 밤 (2회 셔플)</option>
                    <option value="busy">바쁜 밤 (3회 셔플)</option>
                    <option value="crazy">사납고 두려운 밤 (4회 셔플)</option>
                  </select>

                  <button 
                    className="stellar-btn" 
                    disabled={shiftState.duties.length === 0}
                    onClick={executeReflectiveShuffle}
                  >
                    등대 소등 및 성찰 셔플 개시 <Play size={14} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* 단계 4: 일과 종료 및 성찰 */}
          {shiftState.phase === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="helper-box">
                <h4 className="helper-title"><Info size={16} /> 일과 종료 및 덱 셔플</h4>
                <p className="helper-content">
                  오늘 밤 등대실의 임무가 모두 끝났습니다. 꼭대기로 올라가 랜턴을 정성스레 소등하여 꺼둡니다. 
                  지나간 밤을 조용히 회고하며 카드 덱을 격렬하게 수차례 셔플합니다 (일과의 고단한 강도에 따라 1회부터 최대 4회까지 카드를 섞어 정리합니다). 
                  등대 장비의 수리를 마치며 등대지기가 느낀 감정적 마무리, 혹은 내일의 복귀 걱정에 대한 마지막 회고를 기록한 뒤 등대 일지 보관함에 저널을 최종 저장합니다.
                </p>
              </div>

              {isShufflingCards && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'rgba(3, 7, 18, 0.4)', padding: '20px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <RefreshCw size={24} className="card-symbol-art" style={{ animation: 'lighthouseRotateBeam 2s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-gold)' }}>
                    성찰적 카드 덱 셔플 중: [{shuffledCount}회 진행 완료...]
                  </span>
                </div>
              )}

              {!isShufflingCards && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="logbook-journal-paper">
                    <div className="logbook-table">
                      <div className="logbook-row border-bottom">
                        <div className="logbook-cell border-right" style={{ flex: 3 }}>
                          <span className="logbook-label">Keeper Name.</span>
                          <div className="logbook-value-display">{keeperProfile.name || '무명의 등대지기'}</div>
                        </div>
                        <div className="logbook-cell" style={{ flex: 1 }}>
                          <span className="logbook-label">Keeper No.</span>
                          <div className="logbook-value-display">{keeperProfile.keeperNo}</div>
                        </div>
                      </div>
                      
                      <div className="logbook-row border-bottom">
                        <div className="logbook-cell">
                          <span className="logbook-text-row">
                            Observations taken on <strong className="logbook-underline">{shiftState.date || '____-__-__'}</strong> at <strong className="logbook-underline">{shiftState.time || '__:__'}</strong>.
                          </span>
                        </div>
                      </div>
                      
                      <div className="logbook-row border-bottom bg-subtle">
                        <div className="logbook-cell border-right header-cell">Temp.</div>
                        <div className="logbook-cell border-right header-cell">Winds.</div>
                        <div className="logbook-cell header-cell">Sights.</div>
                      </div>
                      
                      {(() => {
                        const activeWeather = WEATHER_PATTERNS.find(w => w.id === shiftState.moodId);
                        return (
                          <div className="logbook-row border-bottom">
                            <div className="logbook-cell border-right value-cell">{activeWeather?.temp || '기온 정보 없음'}</div>
                            <div className="logbook-cell border-right value-cell">{activeWeather?.winds || '바람 정보 없음'}</div>
                            <div className="logbook-cell value-cell">{activeWeather?.sights || '풍경 정보 없음'}</div>
                          </div>
                        );
                      })()}
                      
                      <div className="logbook-row">
                        <div className="logbook-cell">
                          <span className="logbook-label">Remarks.</span>
                          <textarea 
                            className="logbook-textarea" 
                            value={shiftState.remarks}
                            onChange={(e) => setShiftState(prev => ({ ...prev, remarks: e.target.value }))}
                            placeholder="오늘 밤 시프트를 마치며 머릿속에 감도는 상념과 성찰에 대한 마지막 회고 일지 한 페이지를 완성해 보세요..." 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 등대를 떠나는 영원한 결말 (Leaving the Lighthouse) */}
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '16px', 
                    background: isLeavingLighthouse ? 'rgba(184, 149, 74, 0.1)' : 'var(--subtle-bg)', 
                    border: isLeavingLighthouse ? '2px solid var(--border-color)' : '1px dashed var(--section-border)', 
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🚪 등대를 떠나는 영원한 결말 (Leaving the Lighthouse)
                      </span>
                      <button 
                        className={isLeavingLighthouse ? 'stellar-btn' : 'stellar-btn-outline'} 
                        style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                        onClick={() => {
                          const turningOn = !isLeavingLighthouse;
                          setIsLeavingLighthouse(turningOn);
                          if (turningOn) {
                            if (!shiftState.remarks.trim()) {
                              setShiftState(prev => ({
                                ...prev,
                                remarks: `우주의 끝에 외로이 놓인 이곳 등대에서 보낸 수많은 밤들이 끝났습니다. 나는 랜턴을 조용히 꺼두고, 내 낡은 가방을 손에 쥔 채 바깥 계단을 하나씩 밟아 내려갑니다. 등대를 향해 다시는 뒤돌아보지 않을 것입니다. 내 영혼의 긴 휴식을 찾아 공허 속으로 영원히 떠납니다...`
                              }));
                            }
                          }
                        }}
                      >
                        {isLeavingLighthouse ? "❌ 결말 취소" : "🚪 결말 선택하기"}
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      * 룰북 규칙: 이 게임에는 고정된 승리/패배 조건이 없습니다. 지기님이 등대에서의 긴 여정이 완수되었고, 이제 떠나야 할 때가 왔다고 느끼는 바로 이 순간이 결말이 됩니다.
                      <strong style={{ color: 'var(--text-gold)', display: 'block', marginTop: '4px' }}>
                        {isLeavingLighthouse 
                          ? "⚠️ 경고: 결말을 선택하여 저장하면 이 등대지기의 일대기가 최종 종결되어 아카이브에 영구 저장되며, 이후 새로운 등대지기를 생성해야 합니다."
                          : "이 옵션을 활성화하면 오늘 밤의 일지 작성을 마지막으로 등대지기의 소임에서 영구 은퇴하며, 아카이브에 찬란한 골드 테두리로 영구 보관됩니다."}
                      </strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--section-border)', paddingTop: '16px' }}>
                    <button className="stellar-btn-outline" onClick={() => setShiftState(prev => ({ ...prev, phase: 3 }))}>
                      이전 단계
                    </button>
                    
                    <button 
                      className="stellar-btn" 
                      style={isLeavingLighthouse ? { background: 'linear-gradient(135deg, #b8954a 0%, #d4af37 100%)', color: '#0a0b10', fontWeight: 'bold' } : {}}
                      disabled={!shiftState.remarks.trim()}
                      onClick={saveShiftToJournals}
                    >
                      {isLeavingLighthouse ? (
                        <>
                          <LogOut size={16} /> 등대 영구 은퇴 및 최종 결말록 헌정하기
                        </>
                      ) : (
                        <>
                          <Save size={16} /> 등대 일지 최종 보관함에 영구 저장 및 철하기
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </section>
      )}

      {/* ==========================================
          3. 등대 일지 보관소 탭
          ========================================== */}
      {activeTab === 'archive' && (
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="helper-box">
            <h4 className="helper-title"><Info size={16} /> 등대 일지 보관소</h4>
            <p className="helper-content">
              여태껏 당신의 플레이북 캐릭터로 성실하게 기록해 모은 등대 일지 보관고입니다. 
              등대지기 조합의 수칙에 맞게 종이 일지 양식을 정밀하고 품격 있게 구현해 두었습니다. 
              키워드나 날짜별로 빠르게 검색해 찾아 읽을 수 있으며, 소중한 기록을 로컬 백업 파일로 추출하거나 복원해 가져오는 도구가 지원됩니다.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <input 
                type="text" 
                className="stellar-input" 
                style={{ paddingLeft: '34px' }}
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="일지 내용, 지기 이름, 날씨 검색..." 
              />
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="stellar-btn-outline" onClick={exportToJson}>
                <FileDown size={14} /> 로컬 저널 백업 추출
              </button>
              
              <label className="stellar-btn-outline" style={{ cursor: 'pointer' }}>
                <FileUp size={14} /> 저널 백업 가져오기
                <input type="file" accept=".json" onChange={importFromJson} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {filteredJournals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--subtle-bg)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              보관함에 저장된 등대 일지가 존재하지 않거나, 검색 조건에 부합하는 일지가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {filteredJournals.map((j) => {
                const temp = j.temp || (j.weatherDesc && j.weatherDesc.includes("기온: ") ? j.weatherDesc.split("기온: ")[1].split(" |")[0] : "알 수 없음");
                const winds = j.winds || (j.weatherDesc && j.weatherDesc.includes("바람: ") ? j.weatherDesc.split("바람: ")[1].split(" |")[0] : "알 수 없음");
                const sights = j.sights || (j.weatherDesc && j.weatherDesc.includes("풍경: ") ? j.weatherDesc.split("풍경: ")[1].split("]")[0] : "알 수 없음");

                return (
                  <div key={j.id} className={`archive-sheet-card ${j.isEndingJournal ? 'ending-sheet' : ''}`}>
                    {j.isEndingJournal && (
                      <div className="ending-ledger-banner">
                        🌌 등대를 은퇴한 지기의 영원한 여정 결말록 (Final Departure Ledger)
                      </div>
                    )}
                    
                    <div className="logbook-table">
                      <div className="logbook-row border-bottom">
                        <div className="logbook-cell border-right" style={{ flex: 3 }}>
                          <span className="logbook-label">Keeper Name.</span>
                          <div className="logbook-value-display">
                            {j.keeperName} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({j.playbookName})</span>
                          </div>
                        </div>
                        <div className="logbook-cell" style={{ flex: 1 }}>
                          <span className="logbook-label">Keeper No.</span>
                          <div className="logbook-value-display">{j.keeperNo}</div>
                        </div>
                      </div>
                      
                      <div className="logbook-row border-bottom">
                        <div className="logbook-cell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="logbook-text-row">
                            Observations taken on <strong className="logbook-underline">{j.date}</strong> at <strong className="logbook-underline">{j.time}</strong>.
                          </span>
                          <button 
                            onClick={() => deleteJournal(j.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                            title="일지 영구 폐기"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="logbook-row border-bottom bg-subtle">
                        <div className="logbook-cell border-right header-cell">Temp.</div>
                        <div className="logbook-cell border-right header-cell">Winds.</div>
                        <div className="logbook-cell header-cell">Sights.</div>
                      </div>
                      
                      <div className="logbook-row border-bottom">
                        <div className="logbook-cell border-right value-cell">{temp}</div>
                        <div className="logbook-cell border-right value-cell">{winds}</div>
                        <div className="logbook-cell value-cell">{sights}</div>
                      </div>

                      <div className="logbook-row border-bottom bg-subtle">
                        <div className="logbook-cell header-cell" style={{ textAlign: 'left', paddingLeft: '14px' }}>
                          Duties & Happenings.
                        </div>
                      </div>

                      <div className="logbook-row border-bottom">
                        <div className="logbook-cell value-cell" style={{ textAlign: 'left', padding: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '13px' }}>
                          <div style={{ color: 'var(--text-primary)' }}>{j.dutiesLog}</div>
                          {j.seasonEffect && j.seasonEffect !== "일반 평온기" && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--section-border)', color: 'var(--text-gold)', fontWeight: 'bold' }}>
                              🍂 성간 기후 대이변: {j.seasonEffect}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="logbook-row">
                        <div className="logbook-cell" style={{ textAlign: 'left' }}>
                          <span className="logbook-label">Remarks.</span>
                          <div className="logbook-remarks-display">
                            {j.remarks}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </section>
      )}

      {/* ==========================================
          4. 미니게임 허브 탭
          ========================================== */}
      {activeTab === 'minigames' && (
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* 미니게임 1: 해변 수색 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: '1px solid rgba(223, 183, 108, 0.2)', paddingBottom: '30px' }}>
            <div className="helper-box">
              <h4 className="helper-title"><Info size={16} /> 미니게임 <span className="sans-font">1</span>: 해변 수색</h4>
              <p className="helper-content">
                우주 끝자락에는 물자 배급이 극도로 희박합니다. 따라서 함선의 잔해, 고사한 별의 파편, 떠돌아다니는 기이한 식물 씨앗 등 
                바위 해안선에 쓸려 올라오는 폐기물을 매일 수색해 모아 인벤토리에 쟁여 두어야 합니다. 
                <strong>시간을 확인하여 시각 숫자를 2로 나눕니다 (올림 처리).</strong> 이 수치만큼 아이템 카드를 뽑을 수 있습니다. 
                카드의 무늬는 출처, 카드의 숫자는 부품 유형을 판정하며 동전을 뒤집어 상태를 확인합니다. 
                이 보관된 수색 물품들은 <strong>유지보수 작업</strong> 시 소비하여 위태로운 결함 수리 서사에 결합시킬 수 있습니다!
              </p>
            </div>

            <h3 className="serif-font" style={{ fontSize: '18px', color: 'var(--text-gold)' }}>
              🏝️ 우주 해변 수색 시뮬레이션
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13px' }}>현재 등대 수색 시간 설정:</label>
              <select 
                className="stellar-select" 
                style={{ width: '100px' }}
                value={beachHour}
                onChange={(e) => setBeachHour(e.target.value)}
              >
                {[...Array(24).keys()].map(h => (
                  <option key={h} value={h}>{h} 시</option>
                ))}
              </select>

              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                수색 발견 개수: <strong>{Math.ceil(parseInt(beachHour) / 2)}개</strong>
              </span>

              <button className="stellar-btn" onClick={handleBeachcombing}>
                해변 샅샅이 수색하기
              </button>
            </div>

            {beachcombedItems.length > 0 && (
              <div style={{ background: 'rgba(3, 7, 18, 0.4)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--accent-cyan)' }}>
                <h4 className="serif-font" style={{ color: 'var(--accent-cyan)', fontSize: '15px', marginBottom: '10px' }}>
                  🔍 모래더미 속에서 발견된 우주 폐기물:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {beachcombedItems.map((item) => (
                    <div key={item.id} style={{ background: '#030712', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                        발견물: {item.type}
                      </div>
                      <p style={{ color: 'var(--text-primary)' }}>출처: {item.source}</p>
                      <p style={{ color: 'var(--text-secondary)' }}>상태: {item.condition}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="stellar-btn-outline" style={{ padding: '3px 8px', fontSize: '10px' }} onClick={() => keepScavengedItem(item)}>
                          부품고에 보관
                        </button>
                        <button className="stellar-btn-outline" style={{ padding: '3px 8px', fontSize: '10px', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => discardScavengedItem(item.id)}>
                          버리기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="serif-font" style={{ fontSize: '15px', color: 'var(--text-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16} /> 서비스 룸 부품 보관소 인벤토리 ({persistentInventory.length}개 보관 중)
              </h4>
              
              {persistentInventory.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  현재 보관고가 비어 있습니다. 해변 수색을 감행하여 낡은 고철과 우주선 부품을 모으세요!
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {persistentInventory.map((inv) => (
                    <div key={inv.id} style={{ background: 'rgba(223, 183, 108, 0.05)', border: '1px solid rgba(223, 183, 108, 0.2)', padding: '8px 12px', borderRadius: '6px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <strong>{inv.type}</strong> {" | "}
                        <span style={{ color: 'var(--text-secondary)' }}>{inv.condition}</span>
                      </div>
                      <button 
                        onClick={() => deleteInventoryItem(inv.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="폐기"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* 미니게임 2: 어둠 속의 빛 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="helper-box cyan-accent">
              <h4 className="helper-title" style={{ color: 'var(--accent-cyan)' }}><Info size={16} /> 미니게임 <span className="sans-font">2</span>: 어둠 속의 빛</h4>
              <p className="helper-content">
                우주의 벼랑 너머 캄캄한 우주 심해 속, 보이지 않는 저 깊은 심연에서 아주 작은 등대 같은 붉은 불빛 하나가 지기님을 향해 깜빡입니다. 
                그 불빛의 정체는 무엇일까요? 등대 탑 꼭대기에서 당신의 수신 랜턴 빔을 가볍게 조작하여 그 빛을 향해 <strong>간절한 질문</strong>을 던져봅니다. 
                <strong>동전 2개를 뒤집어,</strong> 앞면과 앞면은 긍정, 앞면과 뒷면은 고독과 모호함, 뒷면과 뒷면은 슬픔과 차가운 부정을 함축합니다. 
                불빛이 던져오는 3개의 우주적 키워드를 해석하여, 이 비밀스러운 대화를 일지에 생생하게 엮어보세요.
              </p>
            </div>

            <h3 className="serif-font" style={{ fontSize: '18px', color: 'var(--accent-cyan)' }}>
              🌟 어둠 속의 불빛 교신기
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '13px' }}>하늘의 불빛에게 타전할 질문 내용을 입력하세요:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="stellar-input" 
                  value={lightQuestion}
                  onChange={(e) => setLightQuestion(e.target.value)}
                  placeholder="예: 그곳엔 누가 있나요? 내가 보이나요? 구원의 보급선인가요? 당신은 살아있나요?..." 
                />
                <button 
                  className="stellar-btn stellar-btn-cyan"
                  disabled={isTossingLightCoins || !lightQuestion.trim()}
                  onClick={handleLightInDark}
                >
                  랜턴 신호 깜빡이기!
                </button>
              </div>
            </div>

            {isTossingLightCoins && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '10px 0' }}>
                <div className="stellar-coin-slot">
                  <div className="stellar-coin-inner tossing">
                    <div className="stellar-coin-face heads-face">동전 1</div>
                  </div>
                </div>
                <div className="stellar-coin-slot">
                  <div className="stellar-coin-inner tossing">
                    <div className="stellar-coin-face tails-face">동전 2</div>
                  </div>
                </div>
              </div>
            )}

            {lightCoinResult && !isTossingLightCoins && (
              <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px dashed var(--accent-cyan)', padding: '16px', borderRadius: '8px' }}>
                <h4 className="serif-font" style={{ color: 'var(--accent-cyan)', fontSize: '15px', marginBottom: '8px' }}>
                  📡 하늘에서 깜빡이며 보내온 신호 코드: [{lightCoinResult.c1 === 'H' ? '앞면' : '뒷면'} + {lightCoinResult.c2 === 'H' ? '앞면' : '뒷면'}]
                </h4>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <p><strong>수신 코드 해석:</strong> {lightCoinResult.outcome}</p>
                  <p style={{ marginTop: '6px', fontSize: '14px', color: 'var(--text-primary)', fontStyle: 'italic', letterSpacing: '0.02em' }}>
                    <strong>수신된 핵심 우주 단어:</strong> &quot;{lightCoinResult.selectedWords}&quot;
                  </p>
                </div>
              </div>
            )}

            {lightConversations.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 className="serif-font" style={{ fontSize: '15px', color: 'var(--text-gold)' }}>
                    📜 불빛과 주고받은 대화 기록:
                  </h4>
                  <button className="stellar-btn-outline" style={{ padding: '2px 6px', fontSize: '11px', color: '#ef4444', borderColor: '#ef4444' }} onClick={clearLightHistory}>
                    대화록 리셋
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', background: 'rgba(3, 7, 18, 0.3)', padding: '10px', borderRadius: '6px' }}>
                  {lightConversations.map((conv) => (
                    <div key={conv.id} style={{ fontSize: '12px', borderBottom: '1px solid rgba(223, 183, 108, 0.1)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>[{conv.timestamp}]</span>
                      <p style={{ color: 'var(--text-gold)', margin: '2px 0' }}><strong>질문:</strong> {conv.question}</p>
                      <p style={{ color: 'var(--text-primary)' }}>
                        <strong>답변 ({conv.responseType}):</strong> &quot;{conv.words}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </section>
      )}

      {/* ==========================================
          5. 대기후 시즌 추적 탭
          ========================================== */}
      {activeTab === 'seasons' && (
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="helper-box">
            <h4 className="helper-title"><Info size={16} /> 대기후 이변 시즌 가이드</h4>
            <p className="helper-content">
              우주 끝의 바위 섬 대지는 극한의 환경으로, 기상 이변이 2일 이상 장기 지속되는 경우를 <strong>시즌</strong>이라 칭합니다. 
              일지 기록 도중 해당 날씨를 기입할 때마다 <strong>원형 마크</strong>가 차오르게 됩니다. 
              원형 마크가 모두 차오르거나, 혹은 지기가 이변을 즉시 발동(주사위 굴림 등)시킬 경우 등대에 대기후 이변이 불어닥칩니다! 
              시즌의 강도와 잔여 일수를 정밀하게 모니터링하여, 이 고된 재난을 당신의 등대지기 자아가 극복해 나가는 모습을 생생한 서사로 엮어보세요.
            </p>
          </div>

          <h2 className="serif-font" style={{ fontSize: '20px', color: 'var(--text-gold)', borderBottom: '1px solid var(--section-border)', paddingBottom: '10px' }}>
            🚨 우주 극단 대기후 <span className="sans-font">6</span>대 시즌 매뉴얼
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {SEASONS.map((s) => {
              const currentMarksCount = seasonMarks[s.id] || 0;
              return (
                <div 
                  key={s.id} 
                  style={{ 
                    padding: '20px', 
                    background: 'var(--card-bg-dark)', 
                    border: activeSeason?.id === s.id ? '2px solid #ef4444' : '1px solid var(--section-border)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <h3 className="serif-font" style={{ fontSize: '17px', color: activeSeason?.id === s.id ? '#ef4444' : 'var(--text-gold)', fontWeight: 'bold' }}>
                      {s.nameKo}
                    </h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>기상 징후 누적 스택:</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[...Array(s.circles)].map((_, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              border: '1px solid var(--border-color)',
                              background: i < currentMarksCount ? 'var(--border-color)' : 'transparent',
                              boxShadow: i < currentMarksCount ? '0 0 6px var(--border-glow)' : 'none'
                            }} 
                          />
                        ))}
                      </div>
                      <button 
                        className="stellar-btn-outline" 
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => incrementSeasonMark(s.id)}
                      >
                        징후 축적 +1
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '12px' }}>
                    {s.description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px dashed rgba(223, 183, 108, 0.1)', paddingTop: '10px' }}>
                    <div>📌 <strong>지속 일수:</strong> {s.duration}</div>
                    <div>📌 <strong>기후 징조:</strong> {s.warning}</div>
                    <div>📌 <strong>기상 특징:</strong> {s.characteristics}</div>
                    <div>📌 <strong>지기 부작용:</strong> {s.effects}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button 
                      className="stellar-btn stellar-btn-cyan" 
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => {
                        let rolledDays = 0;
                        if (s.id === 1) rolledDays = 4;
                        else if (s.id === 4) rolledDays = 3;
                        else if (s.id === 2 || s.id === 3) rolledDays = rollDie();
                        else if (s.id === 5) rolledDays = rollDie() + rollDie();
                        else if (s.id === 6) rolledDays = Math.ceil(rollDie() / 2);

                        setActiveSeason({
                          id: s.id,
                          name: s.nameKo,
                          durationLeft: rolledDays
                        });
                        alert(`🚨 즉시 개시 완료: 대기후 이변 [${s.nameKo}]이 강제 개시되었습니다! 앞으로 ${rolledDays}개의 시프트 근무 동안 이변이 지속됩니다.`);
                      }}
                    >
                      시즌 즉시 개시
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </section>
      )}

      {/* ==========================================
          사이드 서랍장: 선대 지기 기록 및 용어집
          ========================================== */}
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 className="serif-font" style={{ fontSize: '18px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookMarked size={16} /> 
                {drawerTab === 'keepers' ? "선대 등대지기들의 기록록" : "등대지기 연맹 용어 사전"}
              </h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-body">
              {drawerTab === 'keepers' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic' }}>
                    * 룰북 발췌: 등대 탑 보급 서랍장 깊은 구석에서 발견된, 수천 년간 이곳을 스쳐 지나갔던 이전 지기들의 생생하고도 애달픈 모험의 파편들입니다. 작업 시 풍부한 영감을 돋워 줍니다.
                  </p>
                  {PAST_KEEPERS_LOGS.map((log, idx) => (
                    <div key={idx} style={{ padding: '16px', background: 'rgba(3, 7, 18, 0.4)', border: '1px solid rgba(223, 183, 108, 0.2)', borderRadius: '6px' }}>
                      <strong style={{ color: 'var(--text-gold)', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                        {log.keeper}
                      </strong>
                      <p style={{ fontSize: '12px', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', letterSpacing: '-0.03em' }}>
                        {log.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic' }}>
                    * 룰북 발췌: 우주 해안선에 좌우되는 등대의 지기 직무 교본에 등재된, 우주 세계관의 기이한 선박, 기상 현상, 등대 장비 용어들을 수록한 해설 사전입니다.
                  </p>
                  {Object.entries(GLOSSARY).map(([term, desc], idx) => (
                    <div key={idx} style={{ padding: '14px', background: 'rgba(3, 7, 18, 0.4)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px' }}>
                      <strong style={{ color: 'var(--accent-cyan)', fontSize: '13px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        {term}
                      </strong>
                      <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 동기화 제어 모달 설정창 */}
      {isSettingsOpen && (
        <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={16} /> 구글 동기화 제어판
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block' }}>실시간 클라우드 자동 동기화</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    일지 작성 시 클라우드에 자동으로 백업 업로드 및 내려받기
                  </span>
                </div>
                <button 
                  className={`stellar-radio-box ${isAutoSync ? 'selected' : ''}`}
                  onClick={() => setIsAutoSync(prev => !prev)}
                  style={{ width: '80px', padding: '6px 12px' }}
                >
                  <span className="radio-dot" /> {isAutoSync ? "켬" : "끔"}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-gold)' }}>수동 백업 데이터 업로드 및 다운로드:</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    className="stellar-btn" 
                    disabled={isCloudSyncing}
                    onClick={syncToCloud}
                  >
                    <CloudUpload size={14} /> 백업 업로드
                  </button>
                  
                  <button 
                    className="stellar-btn-outline" 
                    disabled={isCloudSyncing}
                    onClick={restoreFromCloud}
                  >
                    <CloudDownload size={14} /> 백업 다운로드
                  </button>
                </div>
              </div>

              {lastSyncedTime && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px dashed rgba(223, 183, 108, 0.2)', paddingTop: '12px' }}>
                  마지막 백업 동기화 완료 일시: <strong>{lastSyncedTime}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 등대 영구 은퇴 결말 축하 오버레이 */}
      {showEndingModal && lastEndingJournal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 8, 13, 0.95)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '650px',
            width: '100%',
            background: 'var(--panel-bg-alt)',
            border: '2px solid var(--border-color)',
            boxShadow: '0 0 40px rgba(184, 149, 74, 0.5)',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Golden particles/stars effect */}
            <div style={{ position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, pointerEvents: 'none', opacity: 0.15, background: 'radial-gradient(circle, #b8954a 10%, transparent 10.01%)', backgroundSize: '20px 20px' }} />
            
            <h2 className="serif-font" style={{ fontSize: '24px', color: 'var(--text-gold)', letterSpacing: '0.05em', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '32px' }}>🌌</span>
              우주 등대지기의 영원한 여정 결말록
            </h2>
            
            <div style={{ borderTop: '1px solid var(--section-border)', borderBottom: '1px solid var(--section-border)', padding: '20px 10px', margin: '10px 0', background: 'var(--card-bg-dark)', borderRadius: '6px' }}>
              <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.8', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                &quot;{lastEndingJournal.remarks}&quot;
              </p>
            </div>

            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <p>
                고유번호 No. <strong>{lastEndingJournal.keeperNo}</strong> | <strong>{lastEndingJournal.keeperName}</strong> ({lastEndingJournal.playbookName}) 님은
                이로써 우주 경계선 등대지기의 고독하고도 위대한 임무를 성공적으로 완수하고 은퇴하셨습니다.
              </p>
              <p style={{ marginTop: '8px' }}>
                당신이 흘려 보냈던 수많은 외로운 밤들과 성실히 새겨나간 {journals.length}편의 소중한 기록들은 이제 등대 일지 보관고에 영원히 잠들어 빛날 것입니다.
              </p>
            </div>

            <div style={{ color: 'var(--text-gold)', fontWeight: 'bold', fontSize: '14.5px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> 지기님, 헌신적인 우주적 노고에 경의를 표합니다. <Sparkles size={16} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px', zIndex: 10 }}>
              <button 
                className="stellar-btn-outline" 
                onClick={() => {
                  setShowEndingModal(false);
                  setActiveTab('archive');
                }}
              >
                📖 보관함에서 결말 보기
              </button>
              <button 
                className="stellar-btn" 
                style={{ background: 'linear-gradient(135deg, #b8954a 0%, #d4af37 100%)', color: '#0a0b10', fontWeight: 'bold' }}
                onClick={restartNewKeeper}
              >
                🆕 새 등대지기 생성 (게임 리셋)
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ marginTop: '60px', borderTop: '1px solid var(--section-border)', paddingTop: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
        © 2026 LostWays Club & Ella Lim. Built beautifully with Antigravity AI Pair Programming.
      </footer>

    </div>
  );
}

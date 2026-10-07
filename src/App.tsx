import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RiceBatch, BagEntry, RiceLot, NumpadMode, TensLockValue } from './types';
import { audioManager } from './utils/audio';
import { HeaderInfo } from './components/HeaderInfo';
import { WeighingDisplay } from './components/WeighingDisplay';
import { ErgonomicNumpad, calculateSpeedWeight } from './components/ErgonomicNumpad';
import { BatchGrid } from './components/BatchGrid';
import { FinancialSummary } from './components/FinancialSummary';
import { VietQRModal } from './components/VietQRModal';
import { FarmerCompanionModal } from './components/FarmerCompanionModal';
import { AbnormalWeightModal } from './components/AbnormalWeightModal';
import { ZaloExportModal } from './components/ZaloExportModal';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { AdminUsersModal } from './components/AdminUsersModal';
import { UserProfile, getCurrentUserProfile } from './utils/supabaseClient';
import { useRealtimeBatchSync } from './utils/useRealtimeSync';

const STORAGE_KEY = 'canlua_mientay_batches_v3';
const CURRENT_ID_KEY = 'canlua_current_batch_id_v3';
const NUMPAD_MODE_KEY = 'canlua_numpad_mode_v3';
const TENS_LOCK_KEY = 'canlua_tens_lock_v3';
const AUTO_COMMIT_KEY = 'canlua_auto_commit_v3';

// Blank batch with zero mock data
const createNewBatch = (farmerIndex: number = 1): RiceBatch => {
  const today = new Date().toISOString().split('T')[0];
  const id = `batch-${Date.now()}`;

  const defaultLot: RiceLot = {
    id: 'lot-1',
    lotName: 'Lô 1',
    riceVariety: '',
    pricePerKg: 0,
    tareWeightPerBag: 0.2,
    bags: [],
  };

  return {
    id,
    code: `CLP-${today.replace(/-/g, '')}-${farmerIndex.toString().padStart(2, '0')}`,
    date: today,
    farmerName: '',
    farmerPhone: '',
    riceVariety: '',
    pricePerKg: 0,
    depositAmount: 0,
    tareWeightPerBag: 0.2,
    bagsPerSheet: 10,
    weighingMode: 'nhon_hoa',
    bags: [],
    porterFeePerBag: 5000,
    porterPayer: 'buyer',
    transportType: 'boat',
    lots: [defaultLot],
    activeLotId: 'lot-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPaid: false,
  };
};

// Mẻ cân mẫu trải nghiệm tức thì: Ruộng Chú Năm Cò - 150 bao - Đài Thơm 8
export const createDemoBatch = (): RiceBatch => {
  const today = new Date().toISOString().split('T')[0];
  const id = `batch-demo-nam-co`;

  // Tạo 150 bao mẫu quanh mốc 50kg (từ 49.5kg đến 51.5kg)
  const demoBags: BagEntry[] = [];
  const baseWeights = [50.0, 50.2, 50.4, 50.6, 50.8, 51.0, 49.8, 50.5, 51.2, 50.3];
  for (let i = 1; i <= 150; i++) {
    const w = baseWeights[(i - 1) % baseWeights.length];
    demoBags.push({
      id: `bag-demo-${i}`,
      bagIndex: i,
      weight: w,
      timestamp: Date.now() - (150 - i) * 15000,
    });
  }

  const demoLot: RiceLot = {
    id: 'lot-demo-1',
    lotName: 'Lô 1 - Đài Thơm 8',
    riceVariety: 'Đài Thơm 8',
    pricePerKg: 8200,
    tareWeightPerBag: 0.2,
    bags: demoBags,
  };

  return {
    id,
    code: `CLP-${today.replace(/-/g, '')}-NAMCO`,
    date: today,
    farmerName: 'Chú Năm Cò (Thới Lai)',
    farmerPhone: '0918123456',
    riceVariety: 'Đài Thơm 8',
    pricePerKg: 8200,
    depositAmount: 5000000,
    tareWeightPerBag: 0.2,
    bagsPerSheet: 10,
    weighingMode: 'nhon_hoa',
    bags: demoBags,
    porterFeePerBag: 5000,
    porterPayer: 'buyer',
    transportType: 'boat',
    lots: [demoLot],
    activeLotId: demoLot.id,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    isPaid: false,
  };
};

export default function App() {
  // Load batches from localStorage
  const [batches, setBatches] = useState<RiceBatch[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [createNewBatch(1)];
  });

  const [currentBatchId, setCurrentBatchId] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const batchParam = params.get('batch');
        if (batchParam) {
          const found = batches.find((b) => b.id === batchParam || b.code === batchParam);
          if (found) return found.id;
        }
      }
      const id = localStorage.getItem(CURRENT_ID_KEY);
      if (id) return id;
    } catch {
      // fallback
    }
    return batches[0]?.id || '';
  });

  // Current active batch
  const currentBatch = useMemo(() => {
    const found = batches.find((b) => b.id === currentBatchId) || batches[0];
    if (!found.lots || found.lots.length === 0) {
      const legacyLot: RiceLot = {
        id: 'lot-default',
        lotName: 'Lô 1 - ' + (found.riceVariety || 'Lúa'),
        riceVariety: found.riceVariety || 'Đài Thơm 8',
        pricePerKg: found.pricePerKg || 7800,
        tareWeightPerBag: found.tareWeightPerBag ?? 0.2,
        bags: found.bags || [],
      };
      return {
        ...found,
        lots: [legacyLot],
        activeLotId: legacyLot.id,
      };
    }
    return found;
  }, [batches, currentBatchId]);

  // Current active lot
  const activeLot = useMemo(() => {
    const lots = currentBatch.lots || [];
    return lots.find((l) => l.id === currentBatch.activeLotId) || lots[0];
  }, [currentBatch]);

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('canlua_darkmode') === 'true';
    } catch {
      return false;
    }
  });

  // Numpad input string & Speed Mode states with persistence
  const [currentInput, setCurrentInput] = useState<string>('');
  const [numpadMode, setNumpadMode] = useState<NumpadMode>(() => {
    try {
      const stored = localStorage.getItem(NUMPAD_MODE_KEY);
      return stored === 'full' ? 'full' : 'speed_lock';
    } catch {
      return 'speed_lock';
    }
  });

  const [tensLock, setTensLock] = useState<TensLockValue>(() => {
    try {
      const stored = localStorage.getItem(TENS_LOCK_KEY);
      const val = Number(stored);
      if (val === 40 || val === 50 || val === 60) return val;
    } catch {
      // ignore
    }
    return 50;
  });

  const [autoCommit, setAutoCommit] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_COMMIT_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const [speedRawDigits, setSpeedRawDigits] = useState<string>('');

  // Speaking state for Voice reading
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);

  // Modals state
  const [isVietQROpen, setIsVietQROpen] = useState<boolean>(false);
  const [isFarmerDisplayOpen, setIsFarmerDisplayOpen] = useState<boolean>(false);
  const [isZaloExportOpen, setIsZaloExportOpen] = useState<boolean>(false);
  const [isSheetsSyncOpen, setIsSheetsSyncOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAdminUsersModalOpen, setIsAdminUsersModalOpen] = useState<boolean>(false);

  // Người dùng hiện tại & phân quyền (farmer / trader / admin)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    getCurrentUserProfile().then((user) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  // Abnormal weight alert modal
  const [abnormalWarning, setAbnormalWarning] = useState<{
    isOpen: boolean;
    weight: number;
    bagIndex: number;
  }>({
    isOpen: false,
    weight: 0,
    bagIndex: 0,
  });

  // Save batch to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
      if (currentBatchId) {
        localStorage.setItem(CURRENT_ID_KEY, currentBatchId);
      }
    } catch {
      // ignore
    }
  }, [batches, currentBatchId]);

  // Save Numpad speed mode settings to localStorage
  useEffect(() => {
    localStorage.setItem(NUMPAD_MODE_KEY, numpadMode);
  }, [numpadMode]);

  useEffect(() => {
    localStorage.setItem(TENS_LOCK_KEY, tensLock.toString());
  }, [tensLock]);

  useEffect(() => {
    localStorage.setItem(AUTO_COMMIT_KEY, autoCommit.toString());
  }, [autoCommit]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('canlua_darkmode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  // Listen for online / offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to audio manager speaking status
  useEffect(() => {
    const unsubscribe = audioManager.subscribeSpeaking((speaking) => {
      setIsSpeaking(speaking);
    });
    return unsubscribe;
  }, []);

  const handleToggleVoice = () => {
    const enabled = audioManager.toggleVoice();
    setIsVoiceActive(enabled);
  };

  // Room code từ URL (?room=CLP-20261007-01 hoặc ?batch=CLP-20261007-01)
  const urlRoomCode = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('room') ||
       new URLSearchParams(window.location.search).get('batch') ||
       undefined)
    : undefined;

  const isFarmerModeUrl = typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('mode') === 'farmer' ||
     new URLSearchParams(window.location.search).get('hud') === '1');

  // Lắng nghe dữ liệu Realtime đồng bộ từ WebSocket Supabase
  const handleRemoteBatchReceived = useCallback((syncedBatch: RiceBatch) => {
    setBatches((prev) => {
      const exists = prev.some((b) => b.id === syncedBatch.id || b.code === syncedBatch.code);
      if (exists) {
        return prev.map((b) => (b.id === syncedBatch.id || b.code === syncedBatch.code ? syncedBatch : b));
      }
      return [syncedBatch, ...prev];
    });
    if (syncedBatch.id) {
      setCurrentBatchId(syncedBatch.id);
    }
  }, []);

  const { broadcastBatch } = useRealtimeBatchSync({
    batch: currentBatch,
    roomCode: urlRoomCode,
    isViewerOnly: isFarmerModeUrl || currentUser?.role === 'farmer',
    onRemoteBatchReceived: handleRemoteBatchReceived,
  });

  const handleUpdateBatch = useCallback(
    (updates: Partial<RiceBatch>) => {
      setBatches((prev) =>
        prev.map((b) => {
          if (b.id !== currentBatch.id) return b;
          const updated = { ...b, ...updates, updatedAt: Date.now() };

          // Automatically sync pricePerKg, tareWeightPerBag, riceVariety to active lot or single lot
          if (
            updates.pricePerKg !== undefined ||
            updates.tareWeightPerBag !== undefined ||
            updates.riceVariety !== undefined
          ) {
            const currentLots = updated.lots || [];
            if (currentLots.length > 0) {
              const targetLotId = updated.activeLotId || currentLots[0].id;
              updated.lots = currentLots.map((l) => {
                if (currentLots.length === 1 || l.id === targetLotId) {
                  return {
                    ...l,
                    pricePerKg: updates.pricePerKg !== undefined ? updates.pricePerKg : l.pricePerKg,
                    tareWeightPerBag: updates.tareWeightPerBag !== undefined ? updates.tareWeightPerBag : l.tareWeightPerBag,
                    riceVariety: updates.riceVariety !== undefined ? updates.riceVariety : l.riceVariety,
                  };
                }
                return l;
              });
            }
          }

          // Phát sóng thay đổi realtime tới mọi điện thoại đang kết nối
          broadcastBatch(updated);

          return updated;
        })
      );
    },
    [currentBatch.id, broadcastBatch]
  );

  // Lots handlers
  const handleSelectLot = (lotId: string) => {
    handleUpdateBatch({ activeLotId: lotId });
    setCurrentInput('');
    setSpeedRawDigits('');
  };

  const handleAddLot = (newLotData: {
    lotName: string;
    riceVariety: string;
    pricePerKg: number;
    tareWeightPerBag: number;
  }) => {
    const currentLots = currentBatch.lots || [];
    const newLot: RiceLot = {
      id: `lot-${Date.now()}`,
      lotName: newLotData.lotName,
      riceVariety: newLotData.riceVariety,
      pricePerKg: newLotData.pricePerKg,
      tareWeightPerBag: newLotData.tareWeightPerBag,
      bags: [],
    };
    const updatedLots = [...currentLots, newLot];
    handleUpdateBatch({
      lots: updatedLots,
      activeLotId: newLot.id,
    });
    setCurrentInput('');
    setSpeedRawDigits('');
  };

  // Numpad Handlers (Full Mode)
  const handleDigit = useCallback((digit: string) => {
    setCurrentInput((prev) => {
      if (prev === '0' && digit === '0') return '0';
      if (prev === '0' && digit !== '0') return digit;
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
  }, []);

  const handleDecimal = useCallback(() => {
    setCurrentInput((prev) => {
      if (prev === '') return '0.';
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setCurrentInput((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setCurrentInput('');
    setSpeedRawDigits('');
  }, []);

  // Speed Mode Handlers (Nhịp 3s/bao)
  const handleSpeedDigit = useCallback(
    (digit: string) => {
      setSpeedRawDigits((prev) => {
        const next = prev.length >= 2 ? digit : prev + digit;
        const calculated = calculateSpeedWeight(next, tensLock);
        if (calculated !== null) {
          setCurrentInput(calculated.toFixed(1));
        }
        return next;
      });
    },
    [tensLock]
  );

  const handleSpeedBackspace = useCallback(() => {
    setSpeedRawDigits((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) {
        setCurrentInput('');
      } else {
        const calculated = calculateSpeedWeight(next, tensLock);
        if (calculated !== null) {
          setCurrentInput(calculated.toFixed(1));
        }
      }
      return next;
    });
  }, [tensLock]);

  // +0.2 shortcut (vạch lẻ Nhơn Hòa)
  const handleAddTareShortcut = useCallback(
    (step: number = 0.2) => {
      setCurrentInput((prev) => {
        if (!prev || prev === '0') {
          return (tensLock + step).toFixed(1);
        }
        const num = parseFloat(prev);
        if (isNaN(num)) return (tensLock + step).toFixed(1);
        const newNum = Math.round((num + step) * 10) / 10;
        return newNum.toFixed(1);
      });
    },
    [tensLock]
  );

  // Add bag to active lot and current batch
  const addBagDirectly = useCallback(
    (weight: number) => {
      const activeLotBags = activeLot ? activeLot.bags : currentBatch.bags;
      const nextIndex = activeLotBags.length + 1;

      const newBag: BagEntry = {
        id: `bag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        bagIndex: nextIndex,
        weight,
        timestamp: Date.now(),
      };

      const updatedLotBags = [...activeLotBags, newBag];

      // Update in lots
      if (currentBatch.lots && currentBatch.lots.length > 0 && activeLot) {
        const updatedLots = currentBatch.lots.map((l) =>
          l.id === activeLot.id ? { ...l, bags: updatedLotBags } : l
        );
        handleUpdateBatch({ lots: updatedLots, bags: updatedLotBags });
      } else {
        handleUpdateBatch({ bags: updatedLotBags });
      }

      setCurrentInput('');
      setSpeedRawDigits('');

      // Audio feedback
      audioManager.playSubmitChime();

      // Check if this bag finishes a sheet (10 or 20 bags)
      const bagsPerSheet = currentBatch.bagsPerSheet || 10;
      if (updatedLotBags.length > 0 && updatedLotBags.length % bagsPerSheet === 0) {
        const sheetIndex = Math.floor(updatedLotBags.length / bagsPerSheet);
        const sheetStartIndex = (sheetIndex - 1) * bagsPerSheet;
        const sheetBags = updatedLotBags.slice(sheetStartIndex, updatedLotBags.length);
        const sheetGross = sheetBags.reduce((sum, b) => sum + b.weight, 0);

        // First speak the bag, then speak sheet summary
        audioManager.speakWeight(weight, nextIndex);
        setTimeout(() => {
          audioManager.speakSheetSummary(sheetIndex, bagsPerSheet, sheetGross);
        }, 1200);
      } else {
        // Normal bag voice reading
        audioManager.speakWeight(weight, nextIndex);
      }
    },
    [activeLot, currentBatch.bags, currentBatch.lots, currentBatch.bagsPerSheet, handleUpdateBatch]
  );

  // Instant 1-Touch handler for Nhơn Hòa dial marks (+0.2, +0.4, +0.5, +0.6, +0.8)
  const handleInstantOneTouchWeight = useCallback(
    (weight: number) => {
      addBagDirectly(weight);
    },
    [addBagDirectly]
  );

  // Submit button handler
  const handleSubmitWeight = useCallback(
    (overrideWeight?: number) => {
      let weight = overrideWeight;
      if (typeof weight !== 'number') {
        if (!currentInput.trim()) return;
        weight = parseFloat(currentInput.replace(',', '.'));
      }
      if (isNaN(weight) || weight <= 0) return;

      // Check abnormal weight threshold (< 35kg or > 75kg)
      if (weight < 35 || weight > 75) {
        audioManager.playWarningAlert();
        audioManager.triggerHaptic(60);
        setAbnormalWarning({
          isOpen: true,
          weight,
          bagIndex: (activeLot ? activeLot.bags.length : currentBatch.bags.length) + 1,
        });
        return;
      }

      addBagDirectly(weight);
    },
    [currentInput, activeLot, currentBatch.bags.length, addBagDirectly]
  );

  // Abnormal confirmation handler
  const handleConfirmAbnormalWeight = () => {
    const weight = abnormalWarning.weight;
    setAbnormalWarning({ isOpen: false, weight: 0, bagIndex: 0 });
    addBagDirectly(weight);
  };

  const handleCancelAbnormalWeight = () => {
    setAbnormalWarning({ isOpen: false, weight: 0, bagIndex: 0 });
    setCurrentInput('');
    setSpeedRawDigits('');
  };

  // Undo last bag in active lot
  const handleUndoLastBag = () => {
    const targetBags = activeLot ? activeLot.bags : currentBatch.bags;
    if (targetBags.length === 0) return;
    audioManager.triggerHaptic(30);

    const updated = targetBags.slice(0, -1);
    if (currentBatch.lots && currentBatch.lots.length > 0 && activeLot) {
      const updatedLots = currentBatch.lots.map((l) =>
        l.id === activeLot.id ? { ...l, bags: updated } : l
      );
      handleUpdateBatch({ lots: updatedLots, bags: updated });
    } else {
      handleUpdateBatch({ bags: updated });
    }
  };

  // Edit bag
  const handleEditBag = (bagId: string, newWeight: number) => {
    const targetBags = activeLot ? activeLot.bags : currentBatch.bags;
    const updated = targetBags.map((b) => (b.id === bagId ? { ...b, weight: newWeight } : b));

    if (currentBatch.lots && currentBatch.lots.length > 0 && activeLot) {
      const updatedLots = currentBatch.lots.map((l) =>
        l.id === activeLot.id ? { ...l, bags: updated } : l
      );
      handleUpdateBatch({ lots: updatedLots, bags: updated });
    } else {
      handleUpdateBatch({ bags: updated });
    }
  };

  // Delete bag
  const handleDeleteBag = (bagId: string) => {
    const targetBags = activeLot ? activeLot.bags : currentBatch.bags;
    const remaining = targetBags.filter((b) => b.id !== bagId);
    const reindexed = remaining.map((b, i) => ({ ...b, bagIndex: i + 1 }));

    if (currentBatch.lots && currentBatch.lots.length > 0 && activeLot) {
      const updatedLots = currentBatch.lots.map((l) =>
        l.id === activeLot.id ? { ...l, bags: reindexed } : l
      );
      handleUpdateBatch({ lots: updatedLots, bags: reindexed });
    } else {
      handleUpdateBatch({ bags: reindexed });
    }
  };

  // New batch creation
  const handleCreateNewBatch = () => {
    const newB = createNewBatch(batches.length + 1);
    newB.bags = [];
    if (newB.lots) {
      newB.lots[0].bags = [];
    }
    setBatches((prev) => [newB, ...prev]);
    setCurrentBatchId(newB.id);
    setCurrentInput('');
    setSpeedRawDigits('');
  };

  // Tạo hoặc nạp mẻ demo Ruộng Chú Năm Cò
  const handleLoadDemoBatch = () => {
    const demo = createDemoBatch();
    setBatches((prev) => {
      const filtered = prev.filter((b) => b.id !== demo.id);
      return [demo, ...filtered];
    });
    setCurrentBatchId(demo.id);
    setCurrentInput('');
    setSpeedRawDigits('');
  };

  // Switch batch
  const handleSelectBatch = (batchId: string) => {
    setCurrentBatchId(batchId);
    setCurrentInput('');
    setSpeedRawDigits('');
  };

  // Delete batch
  const handleDeleteBatch = (batchId: string) => {
    if (batches.length <= 1) return;
    const remaining = batches.filter((b) => b.id !== batchId);
    setBatches(remaining);
    if (currentBatchId === batchId) {
      setCurrentBatchId(remaining[0].id);
    }
  };

  const activeLotBags = activeLot ? activeLot.bags : currentBatch.bags;

  const lotsForDisplay = currentBatch.lots && currentBatch.lots.length > 0
    ? currentBatch.lots
    : [{
        id: 'default',
        lotName: 'Lô chính',
        riceVariety: currentBatch.riceVariety,
        pricePerKg: currentBatch.pricePerKg,
        tareWeightPerBag: currentBatch.tareWeightPerBag,
        bags: currentBatch.bags,
      }];

  let displayTotalBags = 0;
  let displayGross = 0;
  let displayCalcTare = 0;
  lotsForDisplay.forEach((l) => {
    const lTarePerBag = typeof l.tareWeightPerBag === 'number' && l.tareWeightPerBag >= 0
      ? l.tareWeightPerBag
      : (typeof currentBatch.tareWeightPerBag === 'number' ? currentBatch.tareWeightPerBag : 0.2);

    displayTotalBags += l.bags.length;
    displayGross += l.bags.reduce((s, b) => s + b.weight, 0);
    displayCalcTare += l.bags.length * lTarePerBag;
  });
  const displayFlatTare = currentBatch.flatTareAmount || 0;
  const displayTotalTare = displayFlatTare > 0 ? displayFlatTare : displayCalcTare;
  const displayNetWeight = Math.max(0, displayGross - displayTotalTare);
  let displayTotalAmount = 0;
  lotsForDisplay.forEach((l) => {
    const lGross = l.bags.reduce((s, b) => s + b.weight, 0);
    const lShare = displayGross > 0 ? lGross / displayGross : (lotsForDisplay.length === 1 ? 1 : 1 / lotsForDisplay.length);
    const lTarePerBag = typeof l.tareWeightPerBag === 'number' && l.tareWeightPerBag >= 0
      ? l.tareWeightPerBag
      : (typeof currentBatch.tareWeightPerBag === 'number' ? currentBatch.tareWeightPerBag : 0.2);
    const lTare = displayFlatTare > 0 ? displayFlatTare * lShare : l.bags.length * lTarePerBag;
    const lNet = Math.max(0, lGross - lTare);
    const lPrice = (typeof l.pricePerKg === 'number' && l.pricePerKg > 0)
      ? l.pricePerKg
      : (currentBatch.pricePerKg || 0);
    displayTotalAmount += Math.round(lNet * lPrice);
  });

  // Khi nông dân quét mã QR (URL có ?mode=farmer hoặc ?hud=1) hoặc tài khoản có role farmer, khóa và chỉ hiển thị Farmer HUD Read-Only
  const isFarmerMode = isFarmerModeUrl || currentUser?.role === 'farmer';

  if (isFarmerMode) {
    return (
      <FarmerCompanionModal
        batch={currentBatch}
        isOpen={true}
        onClose={() => {}}
        isReadOnlyHUD={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans pb-12">
      {/* KHU VỰC 1: THANH TRẠNG THÁI & THÔNG TIN MẺ CÂN (STICKY HEADER) */}
      <HeaderInfo
        batch={currentBatch}
        onUpdateBatch={handleUpdateBatch}
        isOnline={isOnline}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewBatch={handleCreateNewBatch}
        isVoiceActive={isVoiceActive}
        onToggleVoice={handleToggleVoice}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenAdmin={() => setIsAdminUsersModalOpen(true)}
        onOpenFarmerDisplay={() => setIsFarmerDisplayOpen(true)}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
        {/* Banner thông báo chế độ Demo Ruộng Chú Năm Cò */}
        {currentBatch.id === 'batch-demo-nam-co' && (
          <div className="mx-3 mt-2 mb-1 p-2.5 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">🌾 DEMO</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Bạn đang xem <strong>Mẻ mẫu Ruộng Chú Năm Cò (150 bao)</strong>. Thoải mái bấm thử Numpad, đổi giá hoặc mở HUD Nông Dân!
              </span>
            </div>
            <button
              type="button"
              onClick={handleCreateNewBatch}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shrink-0 shadow-sm transition-colors text-[11px]"
            >
              + Tạo Mẻ Mới
            </button>
          </div>
        )}

        {/* Banner thông báo tài khoản đang chờ Admin xét duyệt */}
        {currentUser && currentUser.status === 'pending' && currentUser.role !== 'admin' && (
          <div className="mx-3 mt-2 mb-1 p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  Tài khoản của bạn ({currentUser.phone}) đang ở trạng thái CHỜ DUYỆT BẢN QUYỀN
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Bạn vẫn có thể cân thử nghiệm. Để kích hoạt không giới hạn, vui lòng liên hệ Admin qua Zalo: <strong>039.399.0638</strong>
                </p>
              </div>
            </div>
            <a
              href="https://zalo.me/0393990638"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-center shrink-0 transition-colors"
            >
              Liên Hệ Kích Hoạt
            </a>
          </div>
        )}

        {/* Banner cảnh báo tài khoản bị khóa */}
        {currentUser && currentUser.status === 'blocked' && (
          <div className="mx-3 mt-2 mb-1 p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>🚫 Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin <strong>039.399.0638</strong> để mở khóa!</span>
          </div>
        )}
        {/* KHU VỰC 2: MÀN HÌNH SỐ CÂN & CHỈ BÁO ÂM THANH */}
        <WeighingDisplay
          currentInput={currentInput}
          nextBagIndex={activeLotBags.length + 1}
          isSpeaking={isSpeaking}
          weighingMode={currentBatch.weighingMode}
          onToggleWeighingMode={(mode) => handleUpdateBatch({ weighingMode: mode })}
          onSimulateBluetoothWeight={(w) => addBagDirectly(w)}
          tareWeight={activeLot ? activeLot.tareWeightPerBag : currentBatch.tareWeightPerBag}
          activeLotName={activeLot?.lotName}
          activeLotVariety={activeLot?.riceVariety}
          numpadMode={numpadMode}
          tensLock={tensLock}
          bagsPerSheet={currentBatch.bagsPerSheet}
          totalBags={displayTotalBags}
          totalNetWeight={displayNetWeight}
          totalAmount={displayTotalAmount}
        />

        {/* KHU VỰC 3: BÀN PHÍM SỐ CÔNG THÁI HỌC (NUMPAD) KÈM CHẾ ĐỘ GÕ TẮT 1 CHẠM */}
        <ErgonomicNumpad
          numpadMode={numpadMode}
          onToggleNumpadMode={setNumpadMode}
          tensLock={tensLock}
          onSelectTensLock={setTensLock}
          autoCommit={autoCommit}
          onToggleAutoCommit={setAutoCommit}
          currentInput={currentInput}
          speedRawDigits={speedRawDigits}
          onDigit={handleDigit}
          onDecimal={handleDecimal}
          onBackspace={handleBackspace}
          onClear={handleClear}
          onSubmit={handleSubmitWeight}
          onAddTareShortcut={handleAddTareShortcut}
          onSpeedDigit={handleSpeedDigit}
          onSpeedBackspace={handleSpeedBackspace}
          onInstantOneTouchWeight={handleInstantOneTouchWeight}
        />

        {/* KHU VỰC 4: DANH SÁCH MÃ CÂN CHIA THEO TỜ (BATCH GRID) */}
        <BatchGrid
          bags={activeLotBags}
          bagsPerSheet={currentBatch.bagsPerSheet}
          onUndoLastBag={handleUndoLastBag}
          onEditBag={handleEditBag}
          onDeleteBag={handleDeleteBag}
        />

        {/* KHU VỰC 5: BẢNG TỔNG KẾT TÀI CHÍNH & NÚT HÀNH ĐỘNG */}
        <FinancialSummary
          batch={currentBatch}
          onUpdateBatch={handleUpdateBatch}
          onOpenSyncSheets={() => setIsSheetsSyncOpen(true)}
          onOpenZaloExport={() => setIsZaloExportOpen(true)}
          onOpenVietQR={() => setIsVietQROpen(true)}
          onOpenFarmerDisplay={() => setIsFarmerDisplayOpen(true)}
        />
      </main>

      {/* WEBSITE FOOTER */}
      <footer className="w-full max-w-4xl mx-auto px-3 py-6 mt-auto text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <p className="font-bold text-slate-700 dark:text-slate-300">
          Cân Lúa Pro &bull; Tác giả: Nguyễn Công Dinh (Cần Thơ)
        </p>
        <p>
          Hỗ trợ kỹ thuật / Zalo: <a href="https://zalo.me/0393990638" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">039.399.0638</a>
        </p>
      </footer>

      {/* MODAL 0: CÀI ĐẶT HẬU CẦN & NÂNG CAO */}
      <SettingsModal
        batch={currentBatch}
        onUpdateBatch={handleUpdateBatch}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isVoiceActive={isVoiceActive}
        onToggleVoice={handleToggleVoice}
      />

      {/* MODAL 1: VIETQR THANH TOÁN */}
      <VietQRModal
        batch={currentBatch}
        isOpen={isVietQROpen}
        onClose={() => setIsVietQROpen(false)}
        onUpdateBatch={handleUpdateBatch}
        isOnline={isOnline}
      />

      {/* MODAL 2: MÀN HÌNH PHỤ NÔNG DÂN XEM (FARMER HUD) */}
      <FarmerCompanionModal
        batch={currentBatch}
        isOpen={isFarmerDisplayOpen}
        onClose={() => setIsFarmerDisplayOpen(false)}
      />

      {/* MODAL 3: CẢNH BÁO LỖI (SỐ CÂN BẤT THƯỜNG) */}
      <AbnormalWeightModal
        isOpen={abnormalWarning.isOpen}
        weight={abnormalWarning.weight}
        bagIndex={abnormalWarning.bagIndex}
        onCancel={handleCancelAbnormalWeight}
        onConfirm={handleConfirmAbnormalWeight}
      />

      {/* MODAL PHỤ: XUẤT ẢNH / IN NHIỆT BLUETOOTH / ZALO */}
      <ZaloExportModal
        batch={currentBatch}
        isOpen={isZaloExportOpen}
        onClose={() => setIsZaloExportOpen(false)}
      />

      {/* MODAL PHỤ: GOOGLE SHEETS / EXCEL */}
      <SheetsSyncModal
        batch={currentBatch}
        isOpen={isSheetsSyncOpen}
        onClose={() => setIsSheetsSyncOpen(false)}
        isOnline={isOnline}
      />

      {/* MODAL PHỤ: LỊCH SỬ CÁC MẺ CÂN */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        batches={batches}
        currentBatchId={currentBatch.id}
        onSelectBatch={handleSelectBatch}
        onNewBatch={handleCreateNewBatch}
        onDeleteBatch={handleDeleteBatch}
      />

      {/* MODAL XÁC THỰC TÀI KHOẢN (ĐĂNG NHẬP / ĐĂNG KÝ SĐT) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={(u) => setCurrentUser(u)}
        onStartDemoMode={handleLoadDemoBatch}
      />

      {/* MODAL QUẢN TRỊ TÀI KHOẢN (DÀNH CHO ADMIN) */}
      <AdminUsersModal
        isOpen={isAdminUsersModalOpen}
        onClose={() => setIsAdminUsersModalOpen(false)}
      />
    </div>
  );
}

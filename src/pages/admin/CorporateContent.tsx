import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Clock,
  Wrench,
  Award,
  Star,
  Users,
  Plus,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Eye,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TabType = 'timeline' | 'services' | 'achievements' | 'whychoose' | 'team' | 'brands' | 'sections' | 'messages';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TimelineEntry {
  id: string;
  year: number;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Service {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  bullet_points_uz: string[];
  bullet_points_ru: string[];
  bullet_points_en: string[];
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Achievement {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  icon: string;
  value: string | null;
  sort_order: number;
  is_active: boolean;
}

interface WhyChooseUs {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface TeamInfo {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  image_url: string | null;
  stats: { value: string; label_uz: string; label_ru: string; label_en: string }[];
  is_active: boolean;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface PageSection {
  id: string;
  page_type: string;
  section_key: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  subtitle_uz: string;
  subtitle_ru: string;
  subtitle_en: string;
  video_url: string | null;
  is_active: boolean;
}

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface FormState<T> {
  original: T;
  edited: T;
  isDirty: boolean;
  saveStatus: SaveStatus;
}

const tabs: { key: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'timeline', label: 'Tarix', icon: Clock },
  { key: 'services', label: 'Xizmatlar', icon: Wrench },
  { key: 'achievements', label: 'Yutuqlar', icon: Award },
  { key: 'whychoose', label: 'Nega biz', icon: Star },
  { key: 'team', label: 'Jamoa', icon: Users },
  { key: 'brands', label: 'Brendlar', icon: Building2 },
  { key: 'sections', label: 'Sahifa sozlamalari', icon: Building2 },
  { key: 'messages', label: 'Xabarlar', icon: Mail },
];

const iconOptions = ['Trophy', 'Users', 'Building', 'Lightbulb', 'Star', 'Shield', 'Zap', 'MessageCircle', 'Handshake', 'Package', 'BadgePercent', 'Award'];

function UnsavedChangesModal({ isOpen, onSave, onDiscard, onCancel }: {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Saqlanmagan o'zgarishlar</h3>
            <p className="text-sm text-gray-400">O'zgarishlarni saqlash kerakmi?</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-medium"
          >
            Bekor qilish
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-500 transition-colors font-medium"
          >
            Orqaga
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
          >
            Saqlash
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SaveCancelButtons({ isDirty, saveStatus, onSave, onCancel }: {
  isDirty: boolean;
  saveStatus: SaveStatus;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-gray-600 mt-4">
      <button
        onClick={onCancel}
        disabled={!isDirty || saveStatus === 'saving'}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          isDirty && saveStatus !== 'saving'
            ? 'bg-gray-600 text-white hover:bg-gray-500'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        <RotateCcw className="w-4 h-4" />
        Bekor qilish
      </button>

      <button
        onClick={onSave}
        disabled={!isDirty || saveStatus === 'saving'}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          saveStatus === 'saving'
            ? 'bg-orange-600 text-white cursor-wait'
            : saveStatus === 'saved'
            ? 'bg-green-600 text-white'
            : saveStatus === 'error'
            ? 'bg-red-600 text-white'
            : isDirty
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {saveStatus === 'saving' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saqlanmoqda...
          </>
        ) : saveStatus === 'saved' ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Saqlandi
          </>
        ) : saveStatus === 'error' ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            Xatolik
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Saqlash
          </>
        )}
      </button>

      {isDirty && (
        <span className="text-xs text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          O'zgarishlar saqlanmagan
        </span>
      )}
    </div>
  );
}

export default function CorporateContent() {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [loading, setLoading] = useState(true);
  const [pendingTabChange, setPendingTabChange] = useState<TabType | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [whyChooseUs, setWhyChooseUs] = useState<WhyChooseUs[]>([]);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [timelineForm, setTimelineForm] = useState<Map<string, FormState<TimelineEntry>>>(new Map());
  const [servicesForm, setServicesForm] = useState<Map<string, FormState<Service>>>(new Map());
  const [achievementsForm, setAchievementsForm] = useState<Map<string, FormState<Achievement>>>(new Map());
  const [whyChooseForm, setWhyChooseForm] = useState<Map<string, FormState<WhyChooseUs>>>(new Map());
  const [teamForm, setTeamForm] = useState<FormState<TeamInfo> | null>(null);
  const [brandsForm, setBrandsForm] = useState<Map<string, FormState<Brand>>>(new Map());
  const [sectionsForm, setSectionsForm] = useState<Map<string, FormState<PageSection>>>(new Map());

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const initializeFormState = <T extends { id: string }>(items: T[]): Map<string, FormState<T>> => {
    const map = new Map<string, FormState<T>>();
    items.forEach(item => {
      map.set(item.id, {
        original: { ...item },
        edited: { ...item },
        isDirty: false,
        saveStatus: 'idle'
      });
    });
    return map;
  };

  const hasUnsavedChanges = useCallback((): boolean => {
    const checkMap = <T,>(map: Map<string, FormState<T>>): boolean => {
      for (const state of map.values()) {
        if (state.isDirty) return true;
      }
      return false;
    };

    if (activeTab === 'timeline') return checkMap(timelineForm);
    if (activeTab === 'services') return checkMap(servicesForm);
    if (activeTab === 'achievements') return checkMap(achievementsForm);
    if (activeTab === 'whychoose') return checkMap(whyChooseForm);
    if (activeTab === 'team') return teamForm?.isDirty || false;
    if (activeTab === 'brands') return checkMap(brandsForm);
    if (activeTab === 'sections') return checkMap(sectionsForm);
    return false;
  }, [activeTab, timelineForm, servicesForm, achievementsForm, whyChooseForm, teamForm, brandsForm, sectionsForm]);

  const handleTabChange = (newTab: TabType) => {
    if (hasUnsavedChanges()) {
      setPendingTabChange(newTab);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleSaveAndSwitch = async () => {
    await saveAllChanges();
    setShowUnsavedModal(false);
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
  };

  const handleDiscardAndSwitch = () => {
    discardAllChanges();
    setShowUnsavedModal(false);
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
  };

  const saveAllChanges = async () => {
    if (activeTab === 'timeline') {
      for (const [id, state] of timelineForm.entries()) {
        if (state.isDirty) await saveTimeline(id);
      }
    }
    if (activeTab === 'services') {
      for (const [id, state] of servicesForm.entries()) {
        if (state.isDirty) await saveService(id);
      }
    }
    if (activeTab === 'achievements') {
      for (const [id, state] of achievementsForm.entries()) {
        if (state.isDirty) await saveAchievement(id);
      }
    }
    if (activeTab === 'whychoose') {
      for (const [id, state] of whyChooseForm.entries()) {
        if (state.isDirty) await saveWhyChoose(id);
      }
    }
    if (activeTab === 'team' && teamForm?.isDirty) await saveTeam();
    if (activeTab === 'brands') {
      for (const [id, state] of brandsForm.entries()) {
        if (state.isDirty) await saveBrand(id);
      }
    }
    if (activeTab === 'sections') {
      for (const [id, state] of sectionsForm.entries()) {
        if (state.isDirty) await saveSection(id);
      }
    }
  };

  const discardAllChanges = () => {
    if (activeTab === 'timeline') setTimelineForm(initializeFormState(timeline));
    if (activeTab === 'services') setServicesForm(initializeFormState(services));
    if (activeTab === 'achievements') setAchievementsForm(initializeFormState(achievements));
    if (activeTab === 'whychoose') setWhyChooseForm(initializeFormState(whyChooseUs));
    if (activeTab === 'team' && teamInfo) {
      setTeamForm({
        original: { ...teamInfo },
        edited: { ...teamInfo },
        isDirty: false,
        saveStatus: 'idle'
      });
    }
    if (activeTab === 'brands') setBrandsForm(initializeFormState(brands));
    if (activeTab === 'sections') setSectionsForm(initializeFormState(sections));
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const [
      { data: timelineData },
      { data: servicesData },
      { data: achievementsData },
      { data: whyData },
      { data: teamData },
      { data: brandsData },
      { data: sectionsData },
      { data: messagesData }
    ] = await Promise.all([
      supabase.from('company_timeline').select('*').order('sort_order'),
      supabase.from('company_services').select('*').order('sort_order'),
      supabase.from('company_achievements').select('*').order('sort_order'),
      supabase.from('why_choose_us').select('*').order('sort_order'),
      supabase.from('company_team').select('*').limit(1).maybeSingle(),
      supabase.from('partner_brands').select('*').order('sort_order'),
      supabase.from('corporate_page_sections').select('*').order('page_type').order('sort_order'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
    ]);

    if (timelineData) {
      setTimeline(timelineData);
      setTimelineForm(initializeFormState(timelineData));
    }
    if (servicesData) {
      setServices(servicesData);
      setServicesForm(initializeFormState(servicesData));
    }
    if (achievementsData) {
      setAchievements(achievementsData);
      setAchievementsForm(initializeFormState(achievementsData));
    }
    if (whyData) {
      setWhyChooseUs(whyData);
      setWhyChooseForm(initializeFormState(whyData));
    }
    if (teamData) {
      setTeamInfo(teamData);
      setTeamForm({
        original: { ...teamData },
        edited: { ...teamData },
        isDirty: false,
        saveStatus: 'idle'
      });
    }
    if (brandsData) {
      setBrands(brandsData);
      setBrandsForm(initializeFormState(brandsData));
    }
    if (sectionsData) {
      setSections(sectionsData);
      setSectionsForm(initializeFormState(sectionsData));
    }
    if (messagesData) {
      setMessages(messagesData);
      setUnreadCount(messagesData.filter(m => !m.is_read).length);
    }
    setLoading(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const updateTimelineField = (id: string, field: keyof TimelineEntry, value: unknown) => {
    setTimelineForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        const newEdited = { ...state.edited, [field]: value };
        const isDirty = JSON.stringify(newEdited) !== JSON.stringify(state.original);
        newMap.set(id, { ...state, edited: newEdited, isDirty, saveStatus: 'idle' });
      }
      return newMap;
    });
  };

  const saveTimeline = async (id: string) => {
    const state = timelineForm.get(id);
    if (!state) return;

    setTimelineForm(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...state, saveStatus: 'saving' });
      return newMap;
    });

    const { error } = await supabase.from('company_timeline').update(state.edited).eq('id', id);

    setTimelineForm(prev => {
      const newMap = new Map(prev);
      if (error) {
        newMap.set(id, { ...state, saveStatus: 'error' });
      } else {
        newMap.set(id, {
          original: { ...state.edited },
          edited: { ...state.edited },
          isDirty: false,
          saveStatus: 'saved'
        });
        setTimeout(() => {
          setTimelineForm(p => {
            const m = new Map(p);
            const s = m.get(id);
            if (s) m.set(id, { ...s, saveStatus: 'idle' });
            return m;
          });
        }, 2000);
      }
      return newMap;
    });

    if (!error) {
      setTimeline(prev => prev.map(t => t.id === id ? state.edited : t));
    }
  };

  const cancelTimeline = (id: string) => {
    setTimelineForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        newMap.set(id, {
          ...state,
          edited: { ...state.original },
          isDirty: false,
          saveStatus: 'idle'
        });
      }
      return newMap;
    });
  };

  const updateServiceField = (id: string, field: keyof Service, value: unknown) => {
    setServicesForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        const newEdited = { ...state.edited, [field]: value };
        const isDirty = JSON.stringify(newEdited) !== JSON.stringify(state.original);
        newMap.set(id, { ...state, edited: newEdited, isDirty, saveStatus: 'idle' });
      }
      return newMap;
    });
  };

  const saveService = async (id: string) => {
    const state = servicesForm.get(id);
    if (!state) return;

    setServicesForm(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...state, saveStatus: 'saving' });
      return newMap;
    });

    const { error } = await supabase.from('company_services').update(state.edited).eq('id', id);

    setServicesForm(prev => {
      const newMap = new Map(prev);
      if (error) {
        newMap.set(id, { ...state, saveStatus: 'error' });
      } else {
        newMap.set(id, {
          original: { ...state.edited },
          edited: { ...state.edited },
          isDirty: false,
          saveStatus: 'saved'
        });
        setTimeout(() => {
          setServicesForm(p => {
            const m = new Map(p);
            const s = m.get(id);
            if (s) m.set(id, { ...s, saveStatus: 'idle' });
            return m;
          });
        }, 2000);
      }
      return newMap;
    });

    if (!error) {
      setServices(prev => prev.map(s => s.id === id ? state.edited : s));
    }
  };

  const cancelService = (id: string) => {
    setServicesForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        newMap.set(id, {
          ...state,
          edited: { ...state.original },
          isDirty: false,
          saveStatus: 'idle'
        });
      }
      return newMap;
    });
  };

  const updateAchievementField = (id: string, field: keyof Achievement, value: unknown) => {
    setAchievementsForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        const newEdited = { ...state.edited, [field]: value };
        const isDirty = JSON.stringify(newEdited) !== JSON.stringify(state.original);
        newMap.set(id, { ...state, edited: newEdited, isDirty, saveStatus: 'idle' });
      }
      return newMap;
    });
  };

  const saveAchievement = async (id: string) => {
    const state = achievementsForm.get(id);
    if (!state) return;

    setAchievementsForm(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...state, saveStatus: 'saving' });
      return newMap;
    });

    const { error } = await supabase.from('company_achievements').update(state.edited).eq('id', id);

    setAchievementsForm(prev => {
      const newMap = new Map(prev);
      if (error) {
        newMap.set(id, { ...state, saveStatus: 'error' });
      } else {
        newMap.set(id, {
          original: { ...state.edited },
          edited: { ...state.edited },
          isDirty: false,
          saveStatus: 'saved'
        });
        setTimeout(() => {
          setAchievementsForm(p => {
            const m = new Map(p);
            const s = m.get(id);
            if (s) m.set(id, { ...s, saveStatus: 'idle' });
            return m;
          });
        }, 2000);
      }
      return newMap;
    });

    if (!error) {
      setAchievements(prev => prev.map(a => a.id === id ? state.edited : a));
    }
  };

  const cancelAchievement = (id: string) => {
    setAchievementsForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        newMap.set(id, {
          ...state,
          edited: { ...state.original },
          isDirty: false,
          saveStatus: 'idle'
        });
      }
      return newMap;
    });
  };

  const updateWhyChooseField = (id: string, field: keyof WhyChooseUs, value: unknown) => {
    setWhyChooseForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        const newEdited = { ...state.edited, [field]: value };
        const isDirty = JSON.stringify(newEdited) !== JSON.stringify(state.original);
        newMap.set(id, { ...state, edited: newEdited, isDirty, saveStatus: 'idle' });
      }
      return newMap;
    });
  };

  const saveWhyChoose = async (id: string) => {
    const state = whyChooseForm.get(id);
    if (!state) return;

    setWhyChooseForm(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...state, saveStatus: 'saving' });
      return newMap;
    });

    const { error } = await supabase.from('why_choose_us').update(state.edited).eq('id', id);

    setWhyChooseForm(prev => {
      const newMap = new Map(prev);
      if (error) {
        newMap.set(id, { ...state, saveStatus: 'error' });
      } else {
        newMap.set(id, {
          original: { ...state.edited },
          edited: { ...state.edited },
          isDirty: false,
          saveStatus: 'saved'
        });
        setTimeout(() => {
          setWhyChooseForm(p => {
            const m = new Map(p);
            const s = m.get(id);
            if (s) m.set(id, { ...s, saveStatus: 'idle' });
            return m;
          });
        }, 2000);
      }
      return newMap;
    });

    if (!error) {
      setWhyChooseUs(prev => prev.map(w => w.id === id ? state.edited : w));
    }
  };

  const cancelWhyChoose = (id: string) => {
    setWhyChooseForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        newMap.set(id, {
          ...state,
          edited: { ...state.original },
          isDirty: false,
          saveStatus: 'idle'
        });
      }
      return newMap;
    });
  };

  const updateTeamField = (field: keyof TeamInfo, value: unknown) => {
    setTeamForm(prev => {
      if (!prev) return prev;
      const newEdited = { ...prev.edited, [field]: value };
      const isDirty = JSON.stringify(newEdited) !== JSON.stringify(prev.original);
      return { ...prev, edited: newEdited, isDirty, saveStatus: 'idle' };
    });
  };

  const saveTeam = async () => {
    if (!teamForm || !teamInfo) return;

    setTeamForm(prev => prev ? { ...prev, saveStatus: 'saving' } : prev);

    const { error } = await supabase.from('company_team').update(teamForm.edited).eq('id', teamInfo.id);

    if (error) {
      setTeamForm(prev => prev ? { ...prev, saveStatus: 'error' } : prev);
    } else {
      setTeamInfo(teamForm.edited);
      setTeamForm({
        original: { ...teamForm.edited },
        edited: { ...teamForm.edited },
        isDirty: false,
        saveStatus: 'saved'
      });
      setTimeout(() => {
        setTeamForm(prev => prev ? { ...prev, saveStatus: 'idle' } : prev);
      }, 2000);
    }
  };

  const cancelTeam = () => {
    setTeamForm(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        edited: { ...prev.original },
        isDirty: false,
        saveStatus: 'idle'
      };
    });
  };

  const updateBrandField = (id: string, field: keyof Brand, value: unknown) => {
    setBrandsForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        const newEdited = { ...state.edited, [field]: value };
        const isDirty = JSON.stringify(newEdited) !== JSON.stringify(state.original);
        newMap.set(id, { ...state, edited: newEdited, isDirty, saveStatus: 'idle' });
      }
      return newMap;
    });
  };

  const saveBrand = async (id: string) => {
    const state = brandsForm.get(id);
    if (!state) return;

    setBrandsForm(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...state, saveStatus: 'saving' });
      return newMap;
    });

    const { error } = await supabase.from('partner_brands').update(state.edited).eq('id', id);

    setBrandsForm(prev => {
      const newMap = new Map(prev);
      if (error) {
        newMap.set(id, { ...state, saveStatus: 'error' });
      } else {
        newMap.set(id, {
          original: { ...state.edited },
          edited: { ...state.edited },
          isDirty: false,
          saveStatus: 'saved'
        });
        setTimeout(() => {
          setBrandsForm(p => {
            const m = new Map(p);
            const s = m.get(id);
            if (s) m.set(id, { ...s, saveStatus: 'idle' });
            return m;
          });
        }, 2000);
      }
      return newMap;
    });

    if (!error) {
      setBrands(prev => prev.map(b => b.id === id ? state.edited : b));
    }
  };

  const cancelBrand = (id: string) => {
    setBrandsForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        newMap.set(id, {
          ...state,
          edited: { ...state.original },
          isDirty: false,
          saveStatus: 'idle'
        });
      }
      return newMap;
    });
  };

  const addBrand = async () => {
    const { data, error } = await supabase.from('partner_brands').insert({
      name: 'New Brand',
      sort_order: brands.length
    }).select().single();
    if (data && !error) {
      setBrands(prev => [...prev, data]);
      setBrandsForm(prev => {
        const newMap = new Map(prev);
        newMap.set(data.id, {
          original: { ...data },
          edited: { ...data },
          isDirty: false,
          saveStatus: 'idle'
        });
        return newMap;
      });
    }
  };

  const deleteBrand = async (id: string) => {
    const { error } = await supabase.from('partner_brands').delete().eq('id', id);
    if (!error) {
      setBrands(prev => prev.filter(b => b.id !== id));
      setBrandsForm(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
  };

  const updateSectionField = (id: string, field: keyof PageSection, value: unknown) => {
    setSectionsForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        const newEdited = { ...state.edited, [field]: value };
        const isDirty = JSON.stringify(newEdited) !== JSON.stringify(state.original);
        newMap.set(id, { ...state, edited: newEdited, isDirty, saveStatus: 'idle' });
      }
      return newMap;
    });
  };

  const saveSection = async (id: string) => {
    const state = sectionsForm.get(id);
    if (!state) return;

    setSectionsForm(prev => {
      const newMap = new Map(prev);
      newMap.set(id, { ...state, saveStatus: 'saving' });
      return newMap;
    });

    const { error } = await supabase.from('corporate_page_sections').update(state.edited).eq('id', id);

    setSectionsForm(prev => {
      const newMap = new Map(prev);
      if (error) {
        newMap.set(id, { ...state, saveStatus: 'error' });
      } else {
        newMap.set(id, {
          original: { ...state.edited },
          edited: { ...state.edited },
          isDirty: false,
          saveStatus: 'saved'
        });
        setTimeout(() => {
          setSectionsForm(p => {
            const m = new Map(p);
            const s = m.get(id);
            if (s) m.set(id, { ...s, saveStatus: 'idle' });
            return m;
          });
        }, 2000);
      }
      return newMap;
    });

    if (!error) {
      setSections(prev => prev.map(s => s.id === id ? state.edited : s));
    }
  };

  const cancelSection = (id: string) => {
    setSectionsForm(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(id);
      if (state) {
        newMap.set(id, {
          ...state,
          edited: { ...state.original },
          isDirty: false,
          saveStatus: 'idle'
        });
      }
      return newMap;
    });
  };

  const markMessageRead = async (id: string) => {
    const { error } = await supabase.from('contact_messages').update({ is_read: true }).eq('id', id);
    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      setUnreadCount(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={handleSaveAndSwitch}
        onDiscard={handleDiscardAndSwitch}
        onCancel={() => {
          setShowUnsavedModal(false);
          setPendingTabChange(null);
        }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Korporativ kontent</h1>
          <p className="text-gray-400 mt-1">Biz haqimizda, Xizmatlar va Aloqa sahifalari kontenti</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 bg-gray-800/50 p-2 rounded-xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'messages' && unreadCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Kompaniya tarixi</h2>
            {timeline.map(entry => {
              const formState = timelineForm.get(entry.id);
              if (!formState) return null;
              const { edited, isDirty, saveStatus } = formState;

              return (
                <div key={entry.id} className={`bg-gray-700/50 rounded-xl overflow-hidden ${isDirty ? 'ring-2 ring-amber-500/50' : ''}`}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-orange-500 text-white font-bold rounded-lg">{edited.year}</span>
                      <span className="text-white font-medium">{edited.title_uz}</span>
                      {isDirty && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">O'zgartirilgan</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${edited.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                        {edited.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                      {expandedItems.has(entry.id) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedItems.has(entry.id) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 space-y-4 border-t border-gray-600">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Yil</label>
                              <input
                                type="number"
                                value={edited.year}
                                onChange={(e) => updateTimelineField(entry.id, 'year', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Rasm URL</label>
                              <input
                                type="text"
                                value={edited.image_url || ''}
                                onChange={(e) => updateTimelineField(entry.id, 'image_url', e.target.value || null)}
                                placeholder="https://..."
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (UZ)</label>
                              <input
                                type="text"
                                value={edited.title_uz}
                                onChange={(e) => updateTimelineField(entry.id, 'title_uz', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                              <input
                                type="text"
                                value={edited.title_ru}
                                onChange={(e) => updateTimelineField(entry.id, 'title_ru', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                              <input
                                type="text"
                                value={edited.title_en}
                                onChange={(e) => updateTimelineField(entry.id, 'title_en', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Tavsif (UZ)</label>
                              <textarea
                                value={edited.description_uz}
                                onChange={(e) => updateTimelineField(entry.id, 'description_uz', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Tavsif (RU)</label>
                              <textarea
                                value={edited.description_ru}
                                onChange={(e) => updateTimelineField(entry.id, 'description_ru', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Tavsif (EN)</label>
                              <textarea
                                value={edited.description_en}
                                onChange={(e) => updateTimelineField(entry.id, 'description_en', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={edited.is_active}
                                onChange={(e) => updateTimelineField(entry.id, 'is_active', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-500 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800"
                              />
                              <span className="text-sm text-gray-300">Faol</span>
                            </label>
                          </div>

                          <SaveCancelButtons
                            isDirty={isDirty}
                            saveStatus={saveStatus}
                            onSave={() => saveTimeline(entry.id)}
                            onCancel={() => cancelTimeline(entry.id)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Xizmatlar</h2>
            {services.map(service => {
              const formState = servicesForm.get(service.id);
              if (!formState) return null;
              const { edited, isDirty, saveStatus } = formState;

              return (
                <div key={service.id} className={`bg-gray-700/50 rounded-xl overflow-hidden ${isDirty ? 'ring-2 ring-amber-500/50' : ''}`}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleExpanded(service.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">{edited.title_uz}</span>
                      {isDirty && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">O'zgartirilgan</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${edited.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                        {edited.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                      {expandedItems.has(service.id) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedItems.has(service.id) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 space-y-4 border-t border-gray-600">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Rasm URL</label>
                            <input
                              type="text"
                              value={edited.image_url || ''}
                              onChange={(e) => updateServiceField(service.id, 'image_url', e.target.value || null)}
                              placeholder="https://..."
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (UZ)</label>
                              <input
                                type="text"
                                value={edited.title_uz}
                                onChange={(e) => updateServiceField(service.id, 'title_uz', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                              <input
                                type="text"
                                value={edited.title_ru}
                                onChange={(e) => updateServiceField(service.id, 'title_ru', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                              <input
                                type="text"
                                value={edited.title_en}
                                onChange={(e) => updateServiceField(service.id, 'title_en', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Tavsif (UZ)</label>
                              <textarea
                                value={edited.description_uz}
                                onChange={(e) => updateServiceField(service.id, 'description_uz', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Tavsif (RU)</label>
                              <textarea
                                value={edited.description_ru}
                                onChange={(e) => updateServiceField(service.id, 'description_ru', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Tavsif (EN)</label>
                              <textarea
                                value={edited.description_en}
                                onChange={(e) => updateServiceField(service.id, 'description_en', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={edited.is_active}
                                onChange={(e) => updateServiceField(service.id, 'is_active', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-500 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800"
                              />
                              <span className="text-sm text-gray-300">Faol</span>
                            </label>
                          </div>

                          <SaveCancelButtons
                            isDirty={isDirty}
                            saveStatus={saveStatus}
                            onSave={() => saveService(service.id)}
                            onCancel={() => cancelService(service.id)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Yutuqlar</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(achievement => {
                const formState = achievementsForm.get(achievement.id);
                if (!formState) return null;
                const { edited, isDirty, saveStatus } = formState;

                return (
                  <div key={achievement.id} className={`bg-gray-700/50 rounded-xl p-4 ${isDirty ? 'ring-2 ring-amber-500/50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <select
                        value={edited.icon}
                        onChange={(e) => updateAchievementField(achievement.id, 'icon', e.target.value)}
                        className="px-2 py-1 bg-gray-600 text-white text-sm rounded-lg focus:outline-none"
                      >
                        {iconOptions.map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        {isDirty && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">*</span>}
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={edited.is_active}
                            onChange={(e) => updateAchievementField(achievement.id, 'is_active', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-500 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800"
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={edited.value || ''}
                      onChange={(e) => updateAchievementField(achievement.id, 'value', e.target.value)}
                      placeholder="Qiymat (masalan: 30,000+)"
                      className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      value={edited.title_uz}
                      onChange={(e) => updateAchievementField(achievement.id, 'title_uz', e.target.value)}
                      placeholder="Sarlavha (UZ)"
                      className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      value={edited.title_ru}
                      onChange={(e) => updateAchievementField(achievement.id, 'title_ru', e.target.value)}
                      placeholder="Sarlavha (RU)"
                      className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      value={edited.title_en}
                      onChange={(e) => updateAchievementField(achievement.id, 'title_en', e.target.value)}
                      placeholder="Sarlavha (EN)"
                      className="w-full px-3 py-2 mb-3 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => cancelAchievement(achievement.id)}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isDirty && saveStatus !== 'saving'
                            ? 'bg-gray-600 text-white hover:bg-gray-500'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        Bekor
                      </button>
                      <button
                        onClick={() => saveAchievement(achievement.id)}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          saveStatus === 'saving'
                            ? 'bg-orange-600 text-white cursor-wait'
                            : saveStatus === 'saved'
                            ? 'bg-green-600 text-white'
                            : isDirty
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {saveStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {saveStatus === 'saved' ? 'Saqlandi' : 'Saqlash'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'whychoose' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Nega bizni tanlashadi</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {whyChooseUs.map(item => {
                const formState = whyChooseForm.get(item.id);
                if (!formState) return null;
                const { edited, isDirty, saveStatus } = formState;

                return (
                  <div key={item.id} className={`bg-gray-700/50 rounded-xl p-4 ${isDirty ? 'ring-2 ring-amber-500/50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <select
                        value={edited.icon}
                        onChange={(e) => updateWhyChooseField(item.id, 'icon', e.target.value)}
                        className="px-2 py-1 bg-gray-600 text-white text-sm rounded-lg focus:outline-none"
                      >
                        {iconOptions.map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        {isDirty && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">*</span>}
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={edited.is_active}
                            onChange={(e) => updateWhyChooseField(item.id, 'is_active', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-500 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800"
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={edited.title_uz}
                      onChange={(e) => updateWhyChooseField(item.id, 'title_uz', e.target.value)}
                      placeholder="Sarlavha (UZ)"
                      className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <textarea
                      value={edited.description_uz}
                      onChange={(e) => updateWhyChooseField(item.id, 'description_uz', e.target.value)}
                      placeholder="Tavsif (UZ)"
                      rows={2}
                      className="w-full px-3 py-2 mb-3 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => cancelWhyChoose(item.id)}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isDirty && saveStatus !== 'saving'
                            ? 'bg-gray-600 text-white hover:bg-gray-500'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        Bekor
                      </button>
                      <button
                        onClick={() => saveWhyChoose(item.id)}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          saveStatus === 'saving'
                            ? 'bg-orange-600 text-white cursor-wait'
                            : saveStatus === 'saved'
                            ? 'bg-green-600 text-white'
                            : isDirty
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {saveStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {saveStatus === 'saved' ? 'Saqlandi' : 'Saqlash'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'team' && teamForm && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Jamoa ma'lumotlari</h2>
            <div className={`bg-gray-700/50 rounded-xl p-6 ${teamForm.isDirty ? 'ring-2 ring-amber-500/50' : ''}`}>
              {teamForm.isDirty && (
                <div className="mb-4 px-3 py-2 bg-amber-500/20 rounded-lg flex items-center gap-2 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  O'zgarishlar saqlanmagan
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">Rasm URL</label>
                <input
                  type="text"
                  value={teamForm.edited.image_url || ''}
                  onChange={(e) => updateTeamField('image_url', e.target.value || null)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sarlavha (UZ)</label>
                  <input
                    type="text"
                    value={teamForm.edited.title_uz}
                    onChange={(e) => updateTeamField('title_uz', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                  <input
                    type="text"
                    value={teamForm.edited.title_ru}
                    onChange={(e) => updateTeamField('title_ru', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                  <input
                    type="text"
                    value={teamForm.edited.title_en}
                    onChange={(e) => updateTeamField('title_en', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tavsif (UZ)</label>
                  <textarea
                    value={teamForm.edited.description_uz}
                    onChange={(e) => updateTeamField('description_uz', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tavsif (RU)</label>
                  <textarea
                    value={teamForm.edited.description_ru}
                    onChange={(e) => updateTeamField('description_ru', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tavsif (EN)</label>
                  <textarea
                    value={teamForm.edited.description_en}
                    onChange={(e) => updateTeamField('description_en', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
              </div>

              <SaveCancelButtons
                isDirty={teamForm.isDirty}
                saveStatus={teamForm.saveStatus}
                onSave={saveTeam}
                onCancel={cancelTeam}
              />
            </div>
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Hamkor brendlar</h2>
              <button
                onClick={addBrand}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Brend qo'shish
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brands.map(brand => {
                const formState = brandsForm.get(brand.id);
                if (!formState) return null;
                const { edited, isDirty, saveStatus } = formState;

                return (
                  <div key={brand.id} className={`bg-gray-700/50 rounded-xl p-4 ${isDirty ? 'ring-2 ring-amber-500/50' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isDirty && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">*</span>}
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={edited.is_active}
                            onChange={(e) => updateBrandField(brand.id, 'is_active', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-500 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800"
                          />
                        </label>
                      </div>
                      <button
                        onClick={() => deleteBrand(brand.id)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={edited.name}
                      onChange={(e) => updateBrandField(brand.id, 'name', e.target.value)}
                      placeholder="Brend nomi"
                      className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      value={edited.logo_url || ''}
                      onChange={(e) => updateBrandField(brand.id, 'logo_url', e.target.value || null)}
                      placeholder="Logo URL"
                      className="w-full px-3 py-2 mb-3 bg-gray-600 text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => cancelBrand(brand.id)}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`flex-1 p-1.5 rounded-lg text-xs transition-all ${
                          isDirty && saveStatus !== 'saving'
                            ? 'bg-gray-600 text-white hover:bg-gray-500'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <X className="w-3 h-3 mx-auto" />
                      </button>
                      <button
                        onClick={() => saveBrand(brand.id)}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`flex-1 p-1.5 rounded-lg text-xs transition-all ${
                          saveStatus === 'saving'
                            ? 'bg-orange-600 text-white cursor-wait'
                            : saveStatus === 'saved'
                            ? 'bg-green-600 text-white'
                            : isDirty
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {saveStatus === 'saving' ? <Loader2 className="w-3 h-3 mx-auto animate-spin" /> : <Save className="w-3 h-3 mx-auto" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Sahifa sozlamalari</h2>
            {sections.map(section => {
              const formState = sectionsForm.get(section.id);
              if (!formState) return null;
              const { edited, isDirty, saveStatus } = formState;

              return (
                <div key={section.id} className={`bg-gray-700/50 rounded-xl overflow-hidden ${isDirty ? 'ring-2 ring-amber-500/50' : ''}`}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleExpanded(section.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">{edited.page_type}</span>
                      <span className="text-white font-medium">{edited.section_key}</span>
                      {isDirty && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">O'zgartirilgan</span>}
                    </div>
                    {expandedItems.has(section.id) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>

                  <AnimatePresence>
                    {expandedItems.has(section.id) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 space-y-4 border-t border-gray-600">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (UZ)</label>
                              <input
                                type="text"
                                value={edited.title_uz}
                                onChange={(e) => updateSectionField(section.id, 'title_uz', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                              <input
                                type="text"
                                value={edited.title_ru}
                                onChange={(e) => updateSectionField(section.id, 'title_ru', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                              <input
                                type="text"
                                value={edited.title_en}
                                onChange={(e) => updateSectionField(section.id, 'title_en', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Taglavha (UZ)</label>
                              <textarea
                                value={edited.subtitle_uz}
                                onChange={(e) => updateSectionField(section.id, 'subtitle_uz', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Taglavha (RU)</label>
                              <textarea
                                value={edited.subtitle_ru}
                                onChange={(e) => updateSectionField(section.id, 'subtitle_ru', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Taglavha (EN)</label>
                              <textarea
                                value={edited.subtitle_en}
                                onChange={(e) => updateSectionField(section.id, 'subtitle_en', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                            </div>
                          </div>

                          {edited.section_key === 'video' && (
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">YouTube URL</label>
                              <input
                                type="text"
                                value={edited.video_url || ''}
                                onChange={(e) => updateSectionField(section.id, 'video_url', e.target.value || null)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          )}

                          <SaveCancelButtons
                            isDirty={isDirty}
                            saveStatus={saveStatus}
                            onSave={() => saveSection(section.id)}
                            onCancel={() => cancelSection(section.id)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">
              Xabarlar ({messages.length}) {unreadCount > 0 && <span className="text-orange-400">({unreadCount} o'qilmagan)</span>}
            </h2>

            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Xabarlar yo'q</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`bg-gray-700/50 rounded-xl p-4 ${!message.is_read ? 'border-l-4 border-orange-500' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-medium">{message.first_name} {message.last_name}</h3>
                        <p className="text-sm text-gray-400">{message.phone} {message.email && `| ${message.email}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleDateString('uz-UZ')}
                        </span>
                        {!message.is_read && (
                          <button
                            onClick={() => markMessageRead(message.id)}
                            className="p-1 text-orange-400 hover:text-orange-300"
                            title="O'qilgan deb belgilash"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">{message.subject}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{message.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

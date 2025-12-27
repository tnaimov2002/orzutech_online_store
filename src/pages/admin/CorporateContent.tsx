import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Clock,
  Wrench,
  Award,
  Star,
  Users,
  Image,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Eye,
  CheckCircle,
  Upload,
  Link as LinkIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TabType = 'timeline' | 'services' | 'achievements' | 'whychoose' | 'team' | 'brands' | 'sections' | 'messages';

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

export default function CorporateContent() {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [loading, setLoading] = useState(true);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [whyChooseUs, setWhyChooseUs] = useState<WhyChooseUs[]>([]);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

    if (timelineData) setTimeline(timelineData);
    if (servicesData) setServices(servicesData);
    if (achievementsData) setAchievements(achievementsData);
    if (whyData) setWhyChooseUs(whyData);
    if (teamData) setTeamInfo(teamData);
    if (brandsData) setBrands(brandsData);
    if (sectionsData) setSections(sectionsData);
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

  const updateTimeline = async (id: string, updates: Partial<TimelineEntry>) => {
    const { error } = await supabase.from('company_timeline').update(updates).eq('id', id);
    if (!error) {
      setTimeline(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      setEditingItem(null);
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { error } = await supabase.from('company_services').update(updates).eq('id', id);
    if (!error) {
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      setEditingItem(null);
    }
  };

  const updateAchievement = async (id: string, updates: Partial<Achievement>) => {
    const { error } = await supabase.from('company_achievements').update(updates).eq('id', id);
    if (!error) {
      setAchievements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      setEditingItem(null);
    }
  };

  const updateWhyChooseUs = async (id: string, updates: Partial<WhyChooseUs>) => {
    const { error } = await supabase.from('why_choose_us').update(updates).eq('id', id);
    if (!error) {
      setWhyChooseUs(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
      setEditingItem(null);
    }
  };

  const updateTeam = async (updates: Partial<TeamInfo>) => {
    if (!teamInfo) return;
    const { error } = await supabase.from('company_team').update(updates).eq('id', teamInfo.id);
    if (!error) {
      setTeamInfo(prev => prev ? { ...prev, ...updates } : null);
      setEditingItem(null);
    }
  };

  const updateBrand = async (id: string, updates: Partial<Brand>) => {
    const { error } = await supabase.from('partner_brands').update(updates).eq('id', id);
    if (!error) {
      setBrands(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      setEditingItem(null);
    }
  };

  const updateSection = async (id: string, updates: Partial<PageSection>) => {
    const { error } = await supabase.from('corporate_page_sections').update(updates).eq('id', id);
    if (!error) {
      setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      setEditingItem(null);
    }
  };

  const markMessageRead = async (id: string) => {
    const { error } = await supabase.from('contact_messages').update({ is_read: true }).eq('id', id);
    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      setUnreadCount(prev => prev - 1);
    }
  };

  const addBrand = async () => {
    const { data, error } = await supabase.from('partner_brands').insert({
      name: 'New Brand',
      sort_order: brands.length
    }).select().single();
    if (data && !error) {
      setBrands(prev => [...prev, data]);
      setEditingItem(data.id);
    }
  };

  const deleteBrand = async (id: string) => {
    const { error } = await supabase.from('partner_brands').delete().eq('id', id);
    if (!error) {
      setBrands(prev => prev.filter(b => b.id !== id));
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
              onClick={() => setActiveTab(tab.key)}
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
            {timeline.map(entry => (
              <div key={entry.id} className="bg-gray-700/50 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpanded(entry.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-orange-500 text-white font-bold rounded-lg">{entry.year}</span>
                    <span className="text-white font-medium">{entry.title_uz}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${entry.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                      {entry.is_active ? 'Faol' : 'Nofaol'}
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
                              value={entry.year}
                              onChange={(e) => updateTimeline(entry.id, { year: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Rasm URL</label>
                            <input
                              type="text"
                              value={entry.image_url || ''}
                              onChange={(e) => updateTimeline(entry.id, { image_url: e.target.value || null })}
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
                              value={entry.title_uz}
                              onChange={(e) => updateTimeline(entry.id, { title_uz: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                            <input
                              type="text"
                              value={entry.title_ru}
                              onChange={(e) => updateTimeline(entry.id, { title_ru: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                            <input
                              type="text"
                              value={entry.title_en}
                              onChange={(e) => updateTimeline(entry.id, { title_en: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tavsif (UZ)</label>
                            <textarea
                              value={entry.description_uz}
                              onChange={(e) => updateTimeline(entry.id, { description_uz: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tavsif (RU)</label>
                            <textarea
                              value={entry.description_ru}
                              onChange={(e) => updateTimeline(entry.id, { description_ru: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tavsif (EN)</label>
                            <textarea
                              value={entry.description_en}
                              onChange={(e) => updateTimeline(entry.id, { description_en: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => updateTimeline(entry.id, { is_active: !entry.is_active })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              entry.is_active ? 'bg-gray-600 text-gray-300' : 'bg-green-600 text-white'
                            }`}
                          >
                            {entry.is_active ? 'Nofaol qilish' : 'Faollashtirish'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Xizmatlar</h2>
            {services.map(service => (
              <div key={service.id} className="bg-gray-700/50 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpanded(service.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-white font-medium">{service.title_uz}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${service.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                      {service.is_active ? 'Faol' : 'Nofaol'}
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
                            value={service.image_url || ''}
                            onChange={(e) => updateService(service.id, { image_url: e.target.value || null })}
                            placeholder="https://..."
                            className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sarlavha (UZ)</label>
                            <input
                              type="text"
                              value={service.title_uz}
                              onChange={(e) => updateService(service.id, { title_uz: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                            <input
                              type="text"
                              value={service.title_ru}
                              onChange={(e) => updateService(service.id, { title_ru: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                            <input
                              type="text"
                              value={service.title_en}
                              onChange={(e) => updateService(service.id, { title_en: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tavsif (UZ)</label>
                            <textarea
                              value={service.description_uz}
                              onChange={(e) => updateService(service.id, { description_uz: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tavsif (RU)</label>
                            <textarea
                              value={service.description_ru}
                              onChange={(e) => updateService(service.id, { description_ru: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Tavsif (EN)</label>
                            <textarea
                              value={service.description_en}
                              onChange={(e) => updateService(service.id, { description_en: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => updateService(service.id, { is_active: !service.is_active })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              service.is_active ? 'bg-gray-600 text-gray-300' : 'bg-green-600 text-white'
                            }`}
                          >
                            {service.is_active ? 'Nofaol qilish' : 'Faollashtirish'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Yutuqlar</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(achievement => (
                <div key={achievement.id} className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <select
                      value={achievement.icon}
                      onChange={(e) => updateAchievement(achievement.id, { icon: e.target.value })}
                      className="px-2 py-1 bg-gray-600 text-white text-sm rounded-lg focus:outline-none"
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateAchievement(achievement.id, { is_active: !achievement.is_active })}
                      className={`p-1 rounded ${achievement.is_active ? 'text-green-400' : 'text-gray-500'}`}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={achievement.value || ''}
                    onChange={(e) => updateAchievement(achievement.id, { value: e.target.value })}
                    placeholder="Qiymat (masalan: 30,000+)"
                    className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    value={achievement.title_uz}
                    onChange={(e) => updateAchievement(achievement.id, { title_uz: e.target.value })}
                    placeholder="Sarlavha (UZ)"
                    className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    value={achievement.title_ru}
                    onChange={(e) => updateAchievement(achievement.id, { title_ru: e.target.value })}
                    placeholder="Sarlavha (RU)"
                    className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    value={achievement.title_en}
                    onChange={(e) => updateAchievement(achievement.id, { title_en: e.target.value })}
                    placeholder="Sarlavha (EN)"
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'whychoose' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Nega bizni tanlashadi</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {whyChooseUs.map(item => (
                <div key={item.id} className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <select
                      value={item.icon}
                      onChange={(e) => updateWhyChooseUs(item.id, { icon: e.target.value })}
                      className="px-2 py-1 bg-gray-600 text-white text-sm rounded-lg focus:outline-none"
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateWhyChooseUs(item.id, { is_active: !item.is_active })}
                      className={`p-1 rounded ${item.is_active ? 'text-green-400' : 'text-gray-500'}`}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.title_uz}
                    onChange={(e) => updateWhyChooseUs(item.id, { title_uz: e.target.value })}
                    placeholder="Sarlavha (UZ)"
                    className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <textarea
                    value={item.description_uz}
                    onChange={(e) => updateWhyChooseUs(item.id, { description_uz: e.target.value })}
                    placeholder="Tavsif (UZ)"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'team' && teamInfo && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Jamoa ma'lumotlari</h2>
            <div className="bg-gray-700/50 rounded-xl p-6">
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">Rasm URL</label>
                <input
                  type="text"
                  value={teamInfo.image_url || ''}
                  onChange={(e) => updateTeam({ image_url: e.target.value || null })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sarlavha (UZ)</label>
                  <input
                    type="text"
                    value={teamInfo.title_uz}
                    onChange={(e) => updateTeam({ title_uz: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                  <input
                    type="text"
                    value={teamInfo.title_ru}
                    onChange={(e) => updateTeam({ title_ru: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                  <input
                    type="text"
                    value={teamInfo.title_en}
                    onChange={(e) => updateTeam({ title_en: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tavsif (UZ)</label>
                  <textarea
                    value={teamInfo.description_uz}
                    onChange={(e) => updateTeam({ description_uz: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tavsif (RU)</label>
                  <textarea
                    value={teamInfo.description_ru}
                    onChange={(e) => updateTeam({ description_ru: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tavsif (EN)</label>
                  <textarea
                    value={teamInfo.description_en}
                    onChange={(e) => updateTeam({ description_en: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
              </div>
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
              {brands.map(brand => (
                <div key={brand.id} className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => updateBrand(brand.id, { is_active: !brand.is_active })}
                      className={`p-1 rounded ${brand.is_active ? 'text-green-400' : 'text-gray-500'}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBrand(brand.id)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={brand.name}
                    onChange={(e) => updateBrand(brand.id, { name: e.target.value })}
                    placeholder="Brend nomi"
                    className="w-full px-3 py-2 mb-2 bg-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    value={brand.logo_url || ''}
                    onChange={(e) => updateBrand(brand.id, { logo_url: e.target.value || null })}
                    placeholder="Logo URL"
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Sahifa sozlamalari</h2>
            {sections.map(section => (
              <div key={section.id} className="bg-gray-700/50 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpanded(section.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">{section.page_type}</span>
                    <span className="text-white font-medium">{section.section_key}</span>
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
                              value={section.title_uz}
                              onChange={(e) => updateSection(section.id, { title_uz: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sarlavha (RU)</label>
                            <input
                              type="text"
                              value={section.title_ru}
                              onChange={(e) => updateSection(section.id, { title_ru: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sarlavha (EN)</label>
                            <input
                              type="text"
                              value={section.title_en}
                              onChange={(e) => updateSection(section.id, { title_en: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Taglavha (UZ)</label>
                            <textarea
                              value={section.subtitle_uz}
                              onChange={(e) => updateSection(section.id, { subtitle_uz: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Taglavha (RU)</label>
                            <textarea
                              value={section.subtitle_ru}
                              onChange={(e) => updateSection(section.id, { subtitle_ru: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Taglavha (EN)</label>
                            <textarea
                              value={section.subtitle_en}
                              onChange={(e) => updateSection(section.id, { subtitle_en: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          </div>
                        </div>

                        {section.section_key === 'video' && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">YouTube URL</label>
                            <input
                              type="text"
                              value={section.video_url || ''}
                              onChange={(e) => updateSection(section.id, { video_url: e.target.value || null })}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  Clock,
  ArrowRight,
  Settings,
  RotateCcw,
  AlertTriangle,
  X,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Database
} from 'lucide-react';
import { Order } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDateTime } from '../../utils/format';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DangerConfirmModal from '../../components/admin/DangerConfirmModal';

interface Stats {
  newOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
}

interface AuditLog {
  id: string;
  action_type: string;
  target_type: string;
  performed_by: string;
  created_at: string;
  target_details: any;
}

interface SyncStatus {
  id: string;
  entity: string;
  last_sync_at: string | null;
  status: 'success' | 'error' | 'in_progress' | 'pending';
  message: string | null;
  records_synced: number;
}

type ResetType = 'revenue' | 'customers' | 'orders' | 'all';

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { admin, canPerformDestructiveActions } = useAdmin();
  const [stats, setStats] = useState<Stats>({
    newOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; type: ResetType }>({
    isOpen: false,
    type: 'all',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [ordersRes, customersRes, productsRes, recentRes, auditRes, syncRes] = await Promise.all([
      supabase.from('orders').select('total, status'),
      supabase.from('customers').select('id', { count: 'exact' }),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('sync_status')
        .select('*')
        .order('entity'),
    ]);

    if (ordersRes.data) {
      const newOrdersCount = ordersRes.data.filter((o) => o.status === 'new').length;
      const totalRevenue = ordersRes.data.reduce((sum, o) => sum + Number(o.total), 0);
      setStats((prev) => ({
        ...prev,
        newOrders: newOrdersCount,
        totalRevenue,
      }));
    }

    if (customersRes.count !== null) {
      setStats((prev) => ({ ...prev, totalCustomers: customersRes.count || 0 }));
    }

    if (productsRes.count !== null) {
      setStats((prev) => ({ ...prev, totalProducts: productsRes.count || 0 }));
    }

    if (recentRes.data) {
      setRecentOrders(recentRes.data);
    }

    if (auditRes.data) {
      setRecentAuditLogs(auditRes.data);
    }

    if (syncRes.data) {
      setSyncStatuses(syncRes.data);
    }

    setLoading(false);
  };

  const logAuditAction = async (
    actionType: string,
    targetType: string,
    targetDetails: object
  ) => {
    await supabase.from('audit_logs').insert({
      action_type: actionType,
      target_type: targetType,
      target_id: null,
      target_details: targetDetails,
      performed_by: admin?.full_name || admin?.email || 'Unknown',
      performed_by_id: admin?.id,
    });
  };

  const handleResetStatistics = async () => {
    const { type } = resetModal;
    const previousStats = { ...stats };

    if (type === 'revenue' || type === 'all') {
      await supabase.from('customers').update({ total_spent: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      setStats(prev => ({ ...prev, totalRevenue: 0 }));
    }

    if (type === 'customers' || type === 'all') {
      await supabase.from('customers').update({ order_count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    }

    if (type === 'orders' || type === 'all') {
      setStats(prev => ({ ...prev, newOrders: 0 }));
    }

    await logAuditAction(
      `reset_${type}_statistics`,
      'statistics',
      {
        resetType: type,
        previousStats: previousStats,
      }
    );

    await fetchData();
  };

  const getResetModalContent = () => {
    switch (resetModal.type) {
      case 'revenue':
        return {
          title: t.admin.deleteModal.resetRevenueStats,
          description: t.admin.deleteModal.resetRevenueStatsConfirm,
        };
      case 'customers':
        return {
          title: t.admin.deleteModal.resetCustomerStats,
          description: t.admin.deleteModal.resetCustomerStatsConfirm,
        };
      case 'orders':
        return {
          title: t.admin.deleteModal.resetOrderStats,
          description: t.admin.deleteModal.resetOrderStatsConfirm,
        };
      case 'all':
      default:
        return {
          title: t.admin.deleteModal.resetAllStats,
          description: t.admin.deleteModal.resetAllStatsConfirm,
        };
    }
  };

  const getAuditActionLabel = (action: string) => {
    const actionKey = action as keyof typeof t.admin.auditActions;
    return t.admin.auditActions[actionKey] || action;
  };

  const statCards = [
    {
      label: t.admin.newOrders,
      value: stats.newOrders,
      icon: ShoppingCart,
      color: 'orange',
      link: '/admin/orders?status=new',
    },
    {
      label: t.admin.totalRevenue,
      value: `${formatPrice(stats.totalRevenue)} ${t.common.sum}`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: t.admin.totalCustomers,
      value: stats.totalCustomers,
      icon: Users,
      color: 'blue',
      link: '/admin/customers',
    },
    {
      label: t.admin.totalProducts,
      value: stats.totalProducts,
      icon: Package,
      color: 'cyan',
      link: '/admin/products',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-orange-500/20 text-orange-400',
      confirmed: 'bg-blue-500/20 text-blue-400',
      packed: 'bg-yellow-500/20 text-yellow-400',
      delivered: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      returned: 'bg-gray-500/20 text-gray-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const modalContent = getResetModalContent();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.admin.dashboard}</h1>
        <div className="flex items-center gap-3">
          {canPerformDestructiveActions && (
            <button
              onClick={() => setShowAdminTools(!showAdminTools)}
              className={`p-2 rounded-lg transition-colors ${
                showAdminTools ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
              title={t.admin.adminTools}
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{formatDateTime(new Date().toISOString(), language)}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAdminTools && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-white">{t.admin.dangerZone}</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {t.admin.dangerZoneDescription}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setResetModal({ isOpen: true, type: 'revenue' })}
                  className="p-3 bg-gray-900/50 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 rounded-xl transition-colors text-left"
                >
                  <DollarSign className="w-5 h-5 text-red-400 mb-2" />
                  <p className="text-sm font-medium text-white">{t.admin.resetRevenue}</p>
                  <p className="text-xs text-gray-500">{t.admin.clearSpendingTotals}</p>
                </button>
                <button
                  onClick={() => setResetModal({ isOpen: true, type: 'customers' })}
                  className="p-3 bg-gray-900/50 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 rounded-xl transition-colors text-left"
                >
                  <Users className="w-5 h-5 text-red-400 mb-2" />
                  <p className="text-sm font-medium text-white">{t.admin.resetCustomers}</p>
                  <p className="text-xs text-gray-500">{t.admin.clearOrderCounts}</p>
                </button>
                <button
                  onClick={() => setResetModal({ isOpen: true, type: 'orders' })}
                  className="p-3 bg-gray-900/50 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 rounded-xl transition-colors text-left"
                >
                  <ShoppingCart className="w-5 h-5 text-red-400 mb-2" />
                  <p className="text-sm font-medium text-white">{t.admin.resetOrders}</p>
                  <p className="text-xs text-gray-500">{t.admin.clearOrderStats}</p>
                </button>
                <button
                  onClick={() => setResetModal({ isOpen: true, type: 'all' })}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl transition-colors text-left"
                >
                  <RotateCcw className="w-5 h-5 text-red-400 mb-2" />
                  <p className="text-sm font-medium text-red-400">{t.admin.resetAll}</p>
                  <p className="text-xs text-red-400/70">{t.admin.clearAllStatistics}</p>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {stat.link ? (
              <Link to={stat.link}>
                <StatCard {...stat} />
              </Link>
            ) : (
              <StatCard {...stat} />
            )}
          </motion.div>
        ))}
      </div>

      {syncStatuses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-white">MoySklad Sync Status</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {syncStatuses.map((sync) => (
              <div
                key={sync.id}
                className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium capitalize">{sync.entity}</span>
                  <div className="flex items-center gap-2">
                    {sync.status === 'success' && (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Success
                      </span>
                    )}
                    {sync.status === 'error' && (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <XCircle className="w-4 h-4" />
                        Error
                      </span>
                    )}
                    {sync.status === 'in_progress' && (
                      <span className="flex items-center gap-1 text-yellow-400 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Syncing
                      </span>
                    )}
                    {sync.status === 'pending' && (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {sync.last_sync_at && (
                    <p className="text-gray-400">
                      Last sync: {formatDateTime(sync.last_sync_at, language)}
                    </p>
                  )}
                  {sync.records_synced > 0 && (
                    <p className="text-gray-500">
                      Records synced: {sync.records_synced}
                    </p>
                  )}
                  {sync.message && sync.status === 'error' && (
                    <p className="text-red-400/80 text-xs mt-2 truncate" title={sync.message}>
                      {sync.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              {t.admin.recentOrders}
            </h2>
            <Link
              to="/admin/orders"
              className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-400 transition-colors"
            >
              {t.admin.viewAll}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">{t.admin.order}</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">{t.admin.status}</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">{t.cart.total}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-3 px-6">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="text-white font-medium hover:text-orange-500 transition-colors"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {t.admin.orderStatus[order.status as keyof typeof t.admin.orderStatus]}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-white font-medium">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              {t.admin.recentAuditLog}
            </h2>
          </div>

          <div className="p-4">
            {recentAuditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t.admin.noAuditLogsYet}</p>
            ) : (
              <div className="space-y-3">
                {recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-gray-900/50 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {getAuditActionLabel(log.action_type)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t.common.by} {log.performed_by}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(log.created_at, language)}
                      </span>
                    </div>
                    {log.target_details?.count && (
                      <p className="text-xs text-gray-400 mt-1">
                        {log.target_details.count} {t.admin.itemsAffected}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <DangerConfirmModal
        isOpen={resetModal.isOpen}
        onClose={() => setResetModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleResetStatistics}
        title={modalContent.title}
        description={modalContent.description}
        confirmText={t.common.reset}
        cancelText={t.admin.cancel}
        requireTypedConfirmation={resetModal.type === 'all'}
        confirmationWord="RESET ALL"
        processingText={t.admin.deleteModal.processing}
        typeToConfirmText={t.admin.deleteModal.typeToConfirm}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  const bgColors: Record<string, string> = {
    orange: 'bg-orange-500/20',
    green: 'bg-green-500/20',
    blue: 'bg-blue-500/20',
    cyan: 'bg-cyan-500/20',
  };

  const iconColors: Record<string, string> = {
    orange: 'text-orange-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    cyan: 'text-cyan-500',
  };

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${bgColors[color]} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

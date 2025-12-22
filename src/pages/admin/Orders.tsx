import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Eye, Download, ChevronDown, Trash2, CheckSquare, Square,
  AlertTriangle, Calendar, Filter
} from 'lucide-react';
import { Order } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDateTime } from '../../utils/format';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DangerConfirmModal from '../../components/admin/DangerConfirmModal';

const statuses = ['all', 'new', 'confirmed', 'packed', 'delivered', 'cancelled', 'returned'];

type DeleteMode = 'single' | 'selected' | 'filtered' | 'all';

interface DeleteModalState {
  isOpen: boolean;
  mode: DeleteMode;
  orderId?: string;
  orderNumber?: string;
}

interface DateFilter {
  startDate: string;
  endDate: string;
}

export default function Orders() {
  const { t, language } = useLanguage();
  const { admin, canPerformDestructiveActions } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: '',
    endDate: '',
  });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    mode: 'single',
  });

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, dateFilter]);

  const fetchOrders = async () => {
    setLoading(true);

    let query = supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .order('created_at', { ascending: false });

    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus);
    }

    if (dateFilter.startDate) {
      query = query.gte('created_at', dateFilter.startDate);
    }

    if (dateFilter.endDate) {
      query = query.lte('created_at', dateFilter.endDate + 'T23:59:59');
    }

    const { data } = await query;
    if (data) setOrders(data);
    setLoading(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus as Order['status'] } : order
      )
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const logAuditAction = async (
    actionType: string,
    targetType: string,
    targetId: string | null,
    targetDetails: object
  ) => {
    await supabase.from('audit_logs').insert({
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      target_details: targetDetails,
      performed_by: admin?.full_name || admin?.email || 'Unknown',
      performed_by_id: admin?.id,
    });
  };

  const handleDeleteOrders = async () => {
    const { mode, orderId } = deleteModal;

    let idsToDelete: string[] = [];
    let deletedData: object[] = [];

    if (mode === 'single' && orderId) {
      idsToDelete = [orderId];
      const order = orders.find(o => o.id === orderId);
      if (order) deletedData = [order];
    } else if (mode === 'selected') {
      idsToDelete = Array.from(selectedIds);
      deletedData = orders.filter(o => selectedIds.has(o.id));
    } else if (mode === 'filtered' || mode === 'all') {
      idsToDelete = filteredOrders.map(o => o.id);
      deletedData = [...filteredOrders];
    }

    if (idsToDelete.length === 0) return;

    await supabase.from('order_items')
      .delete()
      .in('order_id', idsToDelete);

    await supabase.from('orders')
      .delete()
      .in('id', idsToDelete);

    const actionType = mode === 'all' ? 'delete_all_orders' :
      mode === 'filtered' ? 'delete_filtered_orders' :
      mode === 'selected' ? 'delete_multiple_orders' : 'delete_order';

    await logAuditAction(
      actionType,
      'order',
      mode === 'single' ? orderId || null : null,
      {
        count: idsToDelete.length,
        statusFilter: selectedStatus !== 'all' ? selectedStatus : undefined,
        dateFilter: dateFilter.startDate || dateFilter.endDate ? dateFilter : undefined,
        orders: deletedData.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total: o.total,
        }))
      }
    );

    setOrders(prev => prev.filter(o => !idsToDelete.includes(o.id)));
    setSelectedIds(new Set());
  };

  const openDeleteModal = (mode: DeleteMode, orderId?: string, orderNumber?: string) => {
    setDeleteModal({
      isOpen: true,
      mode,
      orderId,
      orderNumber,
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      packed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      returned: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const filteredOrders = orders.filter((order) =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.phone?.includes(searchQuery)
  );

  const getDeleteModalContent = () => {
    const { mode, orderNumber } = deleteModal;
    if (mode === 'single') {
      return {
        title: t.admin.deleteModal.deleteOrder,
        description: t.admin.deleteModal.deleteOrderConfirm.replace('{number}', orderNumber || ''),
        count: 1,
      };
    } else if (mode === 'selected') {
      return {
        title: t.admin.deleteModal.deleteSelectedOrders,
        description: t.admin.deleteModal.deleteSelectedOrdersConfirm.replace('{count}', String(selectedIds.size)),
        count: selectedIds.size,
      };
    } else if (mode === 'filtered') {
      const filterDesc = [];
      if (selectedStatus !== 'all') filterDesc.push(`${t.admin.status}: ${t.admin.orderStatus[selectedStatus as keyof typeof t.admin.orderStatus]}`);
      if (dateFilter.startDate) filterDesc.push(`${t.common.from}: ${dateFilter.startDate}`);
      if (dateFilter.endDate) filterDesc.push(`${t.common.to}: ${dateFilter.endDate}`);
      return {
        title: t.admin.deleteModal.deleteFilteredOrders,
        description: t.admin.deleteModal.deleteFilteredOrdersConfirm
          .replace('{count}', String(filteredOrders.length))
          .replace('{filters}', filterDesc.join(', ')),
        count: filteredOrders.length,
      };
    } else {
      return {
        title: t.admin.deleteModal.deleteAllOrders,
        description: t.admin.deleteModal.deleteAllOrdersConfirm,
        count: filteredOrders.length,
      };
    }
  };

  const hasActiveFilters = selectedStatus !== 'all' || dateFilter.startDate || dateFilter.endDate;
  const modalContent = getDeleteModalContent();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t.admin.orders}</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.admin.searchOrders}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`p-2.5 rounded-xl transition-colors ${
              showDateFilter || dateFilter.startDate || dateFilter.endDate
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showDateFilter && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-4"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.admin.startDate}</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t.admin.endDate}</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              onClick={() => setDateFilter({ startDate: '', endDate: '' })}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {t.admin.clear}
            </button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => {
              setSelectedStatus(status);
              if (status === 'all') {
                searchParams.delete('status');
              } else {
                searchParams.set('status', status);
              }
              setSearchParams(searchParams);
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              selectedStatus === status
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {status === 'all'
              ? t.admin.all
              : t.admin.orderStatus[status as keyof typeof t.admin.orderStatus]}
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3"
        >
          <span className="text-white font-medium">
            {selectedIds.size} {t.admin.selected}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t.admin.clearSelection}
            </button>
            <button
              onClick={() => openDeleteModal('selected')}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              {t.admin.deleteSelected}
            </button>
          </div>
        </motion.div>
      )}

      {filteredOrders.length > 0 && canPerformDestructiveActions && (
        <div className="flex items-center justify-end gap-2">
          {hasActiveFilters && (
            <button
              onClick={() => openDeleteModal('filtered')}
              className="px-3 py-1.5 text-sm border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Filter className="w-4 h-4" />
              {t.admin.deleteFiltered.replace('{count}', String(filteredOrders.length))}
            </button>
          )}
          <button
            onClick={() => openDeleteModal('all')}
            className="px-3 py-1.5 text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            {t.admin.deleteAllOrders}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {t.admin.noOrdersFound}
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="py-4 px-4">
                    <button
                      onClick={toggleSelectAll}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {selectedIds.size === filteredOrders.length ? (
                        <CheckSquare className="w-5 h-5 text-orange-500" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.order}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.customer}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.items}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.cart.total}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.status}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.date}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors ${
                      selectedIds.has(order.id) ? 'bg-orange-500/10' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleSelect(order.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {selectedIds.has(order.id) ? (
                          <CheckSquare className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white font-medium">{order.order_number}</p>
                      <p className="text-xs text-gray-500">
                        {order.delivery_type === 'delivery' ? t.admin.deliveryLabel : t.admin.pickupLabel}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white">
                        {order.customer?.first_name} {order.customer?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{order.customer?.phone}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white">{order.order_items?.length || 0} {t.admin.items}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white font-medium">
                        {formatPrice(order.total)} {t.common.sum}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs font-medium border ${getStatusColor(order.status)} bg-transparent cursor-pointer focus:outline-none`}
                        >
                          {statuses.slice(1).map((status) => (
                            <option key={status} value={status} className="bg-gray-800">
                              {t.admin.orderStatus[status as keyof typeof t.admin.orderStatus]}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {formatDateTime(order.created_at, language)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        {canPerformDestructiveActions && (
                          <button
                            onClick={() => openDeleteModal('single', order.id, order.order_number)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DangerConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleDeleteOrders}
        title={modalContent.title}
        description={modalContent.description}
        confirmText={t.admin.delete}
        cancelText={t.admin.cancel}
        itemCount={modalContent.count}
        requireTypedConfirmation={deleteModal.mode === 'all'}
        confirmationWord="DELETE ALL"
        processingText={t.admin.deleteModal.processing}
        typeToConfirmText={t.admin.deleteModal.typeToConfirm}
        itemsWillBeDeletedText={t.admin.deleteModal.itemsWillBeDeleted}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Mail, Phone, Crown, Ban, X, ShoppingBag, Calendar, DollarSign,
  Trash2, CheckSquare, Square, AlertTriangle
} from 'lucide-react';
import { Customer, Order } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDateTime } from '../../utils/format';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DangerConfirmModal from '../../components/admin/DangerConfirmModal';

type DeleteMode = 'single' | 'selected' | 'all';

interface DeleteModalState {
  isOpen: boolean;
  mode: DeleteMode;
  customerId?: string;
  customerName?: string;
  deleteOrders: boolean;
}

export default function Customers() {
  const { t, language } = useLanguage();
  const { admin, canPerformDestructiveActions } = useAdmin();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    mode: 'single',
    deleteOrders: false,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCustomers(data);
    setLoading(false);
  };

  const fetchCustomerOrders = async (customerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (data) setCustomerOrders(data);
  };

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerOrders(customer.id);
  };

  const toggleVIP = async (customer: Customer) => {
    await supabase
      .from('customers')
      .update({ is_vip: !customer.is_vip })
      .eq('id', customer.id);

    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, is_vip: !c.is_vip } : c))
    );
  };

  const toggleBlacklist = async (customer: Customer) => {
    await supabase
      .from('customers')
      .update({ is_blacklisted: !customer.is_blacklisted })
      .eq('id', customer.id);

    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, is_blacklisted: !c.is_blacklisted } : c))
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
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
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

  const handleDeleteCustomer = async () => {
    const { mode, customerId, deleteOrders } = deleteModal;

    let idsToDelete: string[] = [];
    let deletedData: object[] = [];

    if (mode === 'single' && customerId) {
      idsToDelete = [customerId];
      const customer = customers.find(c => c.id === customerId);
      if (customer) deletedData = [customer];
    } else if (mode === 'selected') {
      idsToDelete = Array.from(selectedIds);
      deletedData = customers.filter(c => selectedIds.has(c.id));
    } else if (mode === 'all') {
      idsToDelete = filteredCustomers.map(c => c.id);
      deletedData = [...filteredCustomers];
    }

    if (idsToDelete.length === 0) return;

    if (deleteOrders) {
      await supabase.from('order_items')
        .delete()
        .in('order_id',
          supabase.from('orders').select('id').in('customer_id', idsToDelete)
        );

      await supabase.from('orders')
        .delete()
        .in('customer_id', idsToDelete);
    } else {
      await supabase.from('orders')
        .update({ customer_id: null })
        .in('customer_id', idsToDelete);
    }

    await supabase.from('customers')
      .delete()
      .in('id', idsToDelete);

    await logAuditAction(
      mode === 'all' ? 'delete_all_customers' : mode === 'selected' ? 'delete_multiple_customers' : 'delete_customer',
      'customer',
      mode === 'single' ? customerId || null : null,
      {
        count: idsToDelete.length,
        deletedOrders: deleteOrders,
        customers: deletedData
      }
    );

    setCustomers(prev => prev.filter(c => !idsToDelete.includes(c.id)));
    setSelectedIds(new Set());
    setSelectedCustomer(null);
  };

  const openDeleteModal = (mode: DeleteMode, customerId?: string, customerName?: string) => {
    setDeleteModal({
      isOpen: true,
      mode,
      customerId,
      customerName,
      deleteOrders: false,
    });
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDeleteModalContent = () => {
    const { mode, customerName } = deleteModal;
    if (mode === 'single') {
      return {
        title: t.admin.deleteModal.deleteCustomer,
        description: t.admin.deleteModal.deleteCustomerConfirm.replace('{name}', customerName || ''),
        count: 1,
      };
    } else if (mode === 'selected') {
      return {
        title: t.admin.deleteModal.deleteSelectedCustomers,
        description: t.admin.deleteModal.deleteSelectedCustomersConfirm.replace('{count}', String(selectedIds.size)),
        count: selectedIds.size,
      };
    } else {
      return {
        title: t.admin.deleteModal.deleteAllCustomers,
        description: t.admin.deleteModal.deleteAllCustomersConfirm,
        count: filteredCustomers.length,
      };
    }
  };

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

  const modalContent = getDeleteModalContent();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t.admin.customers}</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.admin.searchCustomers}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
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

      {filteredCustomers.length > 0 && canPerformDestructiveActions && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openDeleteModal('all')}
            className="px-3 py-1.5 text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            {t.admin.deleteAllCustomers}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {t.admin.noCustomersFound}
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
                      {selectedIds.size === filteredCustomers.length ? (
                        <CheckSquare className="w-5 h-5 text-orange-500" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.customer}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.contact}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.ordersCount}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.totalSpent}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.status}</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors ${
                      selectedIds.has(customer.id) ? 'bg-orange-500/10' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleSelect(customer.id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {selectedIds.has(customer.id) ? (
                          <CheckSquare className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          customer.is_vip ? 'bg-yellow-500/20' : 'bg-gray-700'
                        }`}>
                          {customer.is_vip ? (
                            <Crown className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.admin.since} {formatDateTime(customer.created_at, language)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-white flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-500" />
                        {customer.phone}
                      </p>
                      {customer.email && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-medium">{customer.order_count}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-medium">
                        {formatPrice(customer.total_spent)} {t.common.sum}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {customer.is_vip && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-lg">
                            {t.admin.vip}
                          </span>
                        )}
                        {customer.is_blacklisted && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg">
                            {t.admin.blacklisted}
                          </span>
                        )}
                        {!customer.is_vip && !customer.is_blacklisted && (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-lg">
                            {t.admin.regular}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          {t.admin.view}
                        </button>
                        <button
                          onClick={() => toggleVIP(customer)}
                          className={`p-2 rounded-lg transition-colors ${
                            customer.is_vip
                              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                          title={customer.is_vip ? t.admin.removeVip : t.admin.makeVip}
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleBlacklist(customer)}
                          className={`p-2 rounded-lg transition-colors ${
                            customer.is_blacklisted
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                          title={customer.is_blacklisted ? t.admin.removeFromBlacklist : t.admin.addToBlacklist}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        {canPerformDestructiveActions && (
                          <button
                            onClick={() => openDeleteModal('single', customer.id, `${customer.first_name} ${customer.last_name}`)}
                            className="p-2 rounded-lg bg-gray-700 text-red-400 hover:bg-red-500/20 transition-colors"
                            title={t.admin.deleteCustomer}
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

      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">{t.admin.customerDetails}</h2>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      selectedCustomer.is_vip ? 'bg-yellow-500/20' : 'bg-gray-700'
                    }`}>
                      {selectedCustomer.is_vip ? (
                        <Crown className="w-8 h-8 text-yellow-500" />
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        {selectedCustomer.is_vip && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">
                            {t.admin.vip}
                          </span>
                        )}
                        {selectedCustomer.is_blacklisted && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                            {t.admin.blacklisted}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-sm">{t.admin.ordersCount}</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{selectedCustomer.order_count}</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">{t.admin.totalSpent}</span>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {formatPrice(selectedCustomer.total_spent)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <span className="text-white">{selectedCustomer.phone}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-500" />
                        <span className="text-white">{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-gray-500 mt-0.5" />
                        <span className="text-white">
                          {selectedCustomer.region}, {selectedCustomer.city}, {selectedCustomer.address}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-400 text-sm">
                        {t.admin.lastActive}: {formatDateTime(selectedCustomer.last_activity, language)}
                      </span>
                    </div>
                  </div>

                  {canPerformDestructiveActions && (
                    <button
                      onClick={() => openDeleteModal('single', selectedCustomer.id, `${selectedCustomer.first_name} ${selectedCustomer.last_name}`)}
                      className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      {t.admin.deleteCustomer}
                    </button>
                  )}

                  <div>
                    <h4 className="font-semibold text-white mb-4">{t.admin.orderHistory}</h4>
                    {customerOrders.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">{t.admin.noOrdersYet}</p>
                    ) : (
                      <div className="space-y-3">
                        {customerOrders.map((order) => (
                          <div
                            key={order.id}
                            className="bg-gray-900/50 rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{order.order_number}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                                {t.admin.orderStatus[order.status as keyof typeof t.admin.orderStatus]}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">
                                {order.order_items?.length} {t.admin.items}
                              </span>
                              <span className="text-white font-medium">
                                {formatPrice(order.total)} {t.common.sum}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDateTime(order.created_at, language)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DangerConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleDeleteCustomer}
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

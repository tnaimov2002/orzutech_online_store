import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Truck,
  Store,
  Download,
  ChevronDown
} from 'lucide-react';
import { Order } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDateTime } from '../../utils/format';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const statuses = ['new', 'confirmed', 'packed', 'delivered', 'cancelled', 'returned'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, getLocalizedField } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*), store_location:store_locations(*)')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      setOrder(data as Order);
    }
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    setOrder({ ...order, status: newStatus as Order['status'] });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-orange-500',
      confirmed: 'bg-blue-500',
      packed: 'bg-yellow-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
      returned: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Order not found</p>
        <button
          onClick={() => navigate('/admin/orders')}
          className="mt-4 text-orange-500 hover:text-orange-400"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/orders')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Orders
        </button>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            {t.admin.downloadInvoice}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  {order.order_number}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {formatDateTime(order.created_at, language)}
                </p>
              </div>
              <div className="relative">
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`appearance-none px-4 py-2 pr-10 rounded-lg font-medium ${getStatusColor(order.status)} text-white cursor-pointer focus:outline-none`}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status} className="bg-gray-800">
                      {t.admin.orderStatus[status as keyof typeof t.admin.orderStatus]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-white mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.order_items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 bg-gray-900/50 rounded-xl"
                  >
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{item.product_name}</p>
                      {item.variant_info && (
                        <p className="text-sm text-gray-500">{item.variant_info}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-400">Qty: {item.quantity}</span>
                        <span className="text-gray-400">
                          Unit: {formatPrice(item.unit_price)} {t.common.sum}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatPrice(item.total_price)} {t.common.sum}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50"
          >
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-500" />
              Customer Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Name</p>
                <p className="text-white">
                  {order.customer?.first_name} {order.customer?.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Phone
                </p>
                <p className="text-white">{order.customer?.phone}</p>
              </div>
              {order.customer?.email && (
                <div>
                  <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email
                  </p>
                  <p className="text-white">{order.customer?.email}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Member since
                </p>
                <p className="text-white">
                  {formatDateTime(order.customer?.created_at || '', language)}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50"
          >
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              {order.delivery_type === 'delivery' ? (
                <Truck className="w-5 h-5 text-orange-500" />
              ) : (
                <Store className="w-5 h-5 text-orange-500" />
              )}
              {order.delivery_type === 'delivery' ? 'Delivery Information' : 'Pickup Information'}
            </h3>
            {order.delivery_type === 'delivery' ? (
              <div>
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Address
                </p>
                <p className="text-white">{order.delivery_address}</p>
              </div>
            ) : (
              order.store_location && (
                <div>
                  <p className="text-white font-medium">
                    {getLocalizedField(order.store_location, 'name')}
                  </p>
                  <p className="text-gray-400 mt-1">
                    {getLocalizedField(order.store_location, 'address')}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {order.store_location.working_hours}
                  </p>
                </div>
              )
            )}
            {order.notes && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-sm text-gray-400 mb-1">Notes</p>
                <p className="text-white">{order.notes}</p>
              </div>
            )}
            {order.gift_wrapping && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-orange-500 font-medium">Gift Wrapping Requested</p>
              </div>
            )}
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 sticky top-24"
          >
            <h3 className="font-semibold text-white mb-6">Order Summary</h3>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{formatPrice(order.subtotal)} {t.common.sum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Delivery</span>
                <span className="text-green-500">{t.checkout.free}</span>
              </div>
              {order.gift_wrapping && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Gift Wrapping</span>
                  <span className="text-orange-500">Included</span>
                </div>
              )}
              <div className="border-t border-gray-700/50 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-lg font-bold text-orange-500">
                    {formatPrice(order.total)} {t.common.sum}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Status History</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)}`} />
                  <div>
                    <p className="text-white text-sm">
                      {t.admin.orderStatus[order.status as keyof typeof t.admin.orderStatus]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(order.updated_at, language)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

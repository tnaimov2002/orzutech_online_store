import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { ChatProvider } from './context/ChatContext';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ChatWidget from './components/chat/ChatWidget';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';

import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import OrderDetail from './pages/admin/OrderDetail';
import AdminProducts from './pages/admin/Products';
import Categories from './pages/admin/Categories';
import Customers from './pages/admin/Customers';
import Banners from './pages/admin/Banners';
import Stores from './pages/admin/Stores';
import DeliverySettings from './pages/admin/DeliverySettings';
import LiveChat from './pages/admin/LiveChat';
import AIManagement from './pages/admin/AIManagement';
import CorporateContent from './pages/admin/CorporateContent';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <LanguageProvider>
        <CartProvider>
          <AdminProvider>
            <ChatProvider>
              <Routes>
                <Route
                  path="/"
                  element={
                    <StorefrontLayout>
                      <Home />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <StorefrontLayout>
                      <Products />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/product/:id"
                  element={
                    <StorefrontLayout>
                      <ProductDetail />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <StorefrontLayout>
                      <Cart />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <StorefrontLayout>
                      <Checkout />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/order-success/:id"
                  element={
                    <StorefrontLayout>
                      <OrderSuccess />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <StorefrontLayout>
                      <About />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <StorefrontLayout>
                      <Services />
                    </StorefrontLayout>
                  }
                />
                <Route
                  path="/contact"
                  element={
                    <StorefrontLayout>
                      <Contact />
                    </StorefrontLayout>
                  }
                />

                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:id" element={<OrderDetail />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="banners" element={<Banners />} />
                  <Route path="stores" element={<Stores />} />
                  <Route path="delivery" element={<DeliverySettings />} />
                  <Route path="chat" element={<LiveChat />} />
                  <Route path="ai" element={<AIManagement />} />
                  <Route path="corporate" element={<CorporateContent />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ChatProvider>
          </AdminProvider>
        </CartProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

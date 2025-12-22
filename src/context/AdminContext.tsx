import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminUser } from '../types';
import { supabase } from '../lib/supabase';

interface AdminContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  canPerformDestructiveActions: boolean;
  isSuperAdmin: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('orzutech_admin');
    if (savedAdmin) {
      try {
        setAdmin(JSON.parse(savedAdmin));
      } catch {
        localStorage.removeItem('orzutech_admin');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, full_name, role, is_active, last_login, created_at')
        .eq('email', email)
        .eq('password_hash', password)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      setAdmin(data as AdminUser);
      localStorage.setItem('orzutech_admin', JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('orzutech_admin');
  };

  const isSuperAdmin = admin?.role === 'super_admin';
  const canPerformDestructiveActions = admin?.role === 'super_admin' || admin?.role === 'admin';

  return (
    <AdminContext.Provider
      value={{
        admin,
        isLoading,
        login,
        logout,
        isAuthenticated: !!admin,
        canPerformDestructiveActions,
        isSuperAdmin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

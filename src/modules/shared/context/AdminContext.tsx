import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { validateAdmin } from 'modules/shared/services/supabase/admin.service';

interface AdminContextValue {
  isAdmin: boolean;
  adminName: string | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  adminName: null,
  login: async () => false,
  logout: () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('isAdmin') === 'true');
  const [adminName, setAdminName] = useState<string | null>(() => sessionStorage.getItem('adminName'));

  const login = useCallback(async (name: string, password: string): Promise<boolean> => {
    const valid = await validateAdmin(name, password);
    if (valid) {
      setIsAdmin(true);
      setAdminName(name);
      sessionStorage.setItem('isAdmin', 'true');
      sessionStorage.setItem('adminName', name);
    }
    return valid;
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
    setAdminName(null);
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminName');
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, adminName, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}

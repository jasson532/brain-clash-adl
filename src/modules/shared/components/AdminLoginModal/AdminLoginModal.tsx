import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from 'modules/shared/context/AdminContext';
import './AdminLoginModal.css';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const { login } = useAdmin();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setIsLoading(true);
    setError('');

    const success = await login(name.trim(), password.trim());
    setIsLoading(false);

    if (success) {
      setName('');
      setPassword('');
      onClose();
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="admin-modal__overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            className="admin-modal__card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h3 className="admin-modal__title">🔐 Acceso Administrador</h3>

            <div className="admin-modal__field">
              <label>Usuario</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de admin"
                autoFocus
              />
            </div>

            <div className="admin-modal__field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
              />
            </div>

            {error && <p className="admin-modal__error">⚠️ {error}</p>}

            <div className="admin-modal__actions">
              <button type="button" className="admin-modal__btn--secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="admin-modal__btn--primary"
                disabled={isLoading || !name.trim() || !password.trim()}
              >
                {isLoading ? '⏳...' : 'Ingresar'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

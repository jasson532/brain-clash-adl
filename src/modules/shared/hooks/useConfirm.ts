import { useState, useCallback } from 'react';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'danger' | 'success';
  onConfirm: () => void;
}

const defaultState: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  variant: 'default',
  onConfirm: () => {},
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(defaultState);

  const confirm = useCallback((options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger' | 'success';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        variant: options.variant ?? 'default',
        onConfirm: () => {
          setState(defaultState);
          resolve(true);
        },
      });
    });
  }, []);

  const cancel = useCallback(() => {
    setState(defaultState);
  }, []);

  return { ...state, confirm, cancel };
}

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string; iconBg: string }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    iconBg: 'bg-green-100'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    iconBg: 'bg-red-100'
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100'
  }
};

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const iconClass = "w-5 h-5";
  switch (type) {
    case 'success':
      return <CheckCircle className={iconClass} />;
    case 'error':
      return <AlertCircle className={iconClass} />;
    case 'warning':
      return <AlertTriangle className={iconClass} />;
    case 'info':
      return <Info className={iconClass} />;
  }
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const styles = toastStyles[toast.type];
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <div className={`${styles.iconBg} ${styles.icon} p-1.5 rounded-full shrink-0`}>
        <ToastIcon type={toast.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-slate-600 text-sm mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 shrink-0 p-1"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// Hook for using toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = React.useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = React.useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  }, [addToast]);

  const showWarning = React.useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const showInfo = React.useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return {
    toasts,
    addToast,
    dismissToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

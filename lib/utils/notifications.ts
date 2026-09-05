import { toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToastOptions {
  duration?: number;
  position?: ToastPosition;
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
}

const defaultDuration = 5000;

export const notification = {
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, {
      duration: options?.duration || defaultDuration,
      position: options?.position || 'bottom-right',
      description: options?.description,
      action: options?.action,
      className: 'border-l-4 border-green-500',
    });
  },

  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, {
      duration: options?.duration || 8000,
      position: options?.position || 'bottom-right',
      description: options?.description,
      action: options?.action,
      className: 'border-l-4 border-red-500',
    });
  },

  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, {
      duration: options?.duration || 6000,
      position: options?.position || 'bottom-right',
      description: options?.description,
      action: options?.action,
      className: 'border-l-4 border-yellow-500',
    });
  },

  info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, {
      duration: options?.duration || defaultDuration,
      position: options?.position || 'bottom-right',
      description: options?.description,
      action: options?.action,
      className: 'border-l-4 border-blue-500',
    });
  },

  loading(message: string) {
    return sonnerToast.loading(message, {
      position: 'bottom-right',
    });
  },

  bloodRequestCreated(requestId: string) {
    this.success('Blood request submitted successfully!', {
      description: `Request ID: ${requestId.slice(0, 8)}...`,
      action: {
        label: 'View Request',
        onClick: () => window.location.href = '/requests',
      },
    });
  },

  donorMatched(donorName: string, bloodGroup: string) {
    this.info(`Potential donor found!`, {
      description: `${donorName} (${bloodGroup}) is available in your area.`,
      action: {
        label: 'Contact Donor',
        onClick: () => console.log('Contacting donor...'),
      },
    });
  },

  donationConfirmed(donorName: string) {
    this.success('Donation confirmed! 🎉', {
      description: `${donorName} has confirmed they will donate. Thank you for saving a life!`,
      duration: 8000,
    });
  },

  emergencyAlert(bloodGroup: string, location: string) {
    this.error(`🚨 EMERGENCY: ${bloodGroup} blood needed in ${location}`, {
      duration: 15000,
      action: {
        label: 'View Details',
        onClick: () => window.location.href = '/requests',
      },
    });
  },

  profileUpdated() {
    this.success('Profile updated successfully!', {
      description: 'Your changes have been saved.',
    });
  },

  authError(action: string) {
    this.error(`Authentication failed`, {
      description: `Could not ${action}. Please try again or contact support if the problem persists.`,
      action: {
        label: 'Try Again',
        onClick: () => window.location.reload(),
      },
    });
  },

  rateLimitExceeded(resetTime: number) {
    const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
    this.warning('Too many attempts', {
      description: `Please wait ${waitSeconds} seconds before trying again.`,
    });
  },

  networkError() {
    this.error('Network error', {
      description: 'Please check your internet connection and try again.',
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
    });
  },

  dismiss(toastId: string | number) {
    sonnerToast.dismiss(toastId);
  },

  dismissAll() {
    sonnerToast.dismiss();
  },
};

export type { ToastType, ToastPosition };

import { useEffect } from 'react';
import { CheckCircle, Calendar, Clock, DollarSign, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: {
    date?: string;
    time?: string;
    duration?: number;
    totalPrice?: number;
    petName?: string;
    serviceCount?: number;
    extra?: string;
  };
  actionLabel?: string;
  onAction?: () => void;
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  details,
  actionLabel = 'View Appointments',
  onAction,
}: SuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAction() {
    if (onAction) {
      onAction();
    }
    onClose();
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in duration-300">
        {/* Success Icon Header */}
        <div className="relative bg-gradient-to-br from-primary-500 to-primary-600 rounded-t-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 animate-bounce shadow-lg">
            <CheckCircle className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-primary-50">{message}</p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white dark:text-gray-200 hover:text-gray-200 dark:hover:text-gray-300 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Details */}
        {details && (
          <div className="p-6 space-y-4">
            {details.petName && (
              <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg border border-secondary-200 dark:border-secondary-800">
                <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/40 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pet</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{details.petName}</p>
                </div>
              </div>
            )}

            {details.date && (
              <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg border border-secondary-200 dark:border-secondary-800">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Date</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(details.date)}
                  </p>
                </div>
              </div>
            )}

            {details.time && (
              <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg border border-secondary-200 dark:border-secondary-800">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Time</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{details.time}</p>
                </div>
              </div>
            )}

            {(details.duration || details.serviceCount) && (
              <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg border border-secondary-200 dark:border-secondary-800">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Duration</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {details.duration} minutes
                    {details.serviceCount && (
                      <span className="text-gray-600 dark:text-gray-300 font-normal ml-2">
                        ({details.serviceCount} service{details.serviceCount !== 1 ? 's' : ''})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {details.totalPrice && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg border-2 border-primary-200 dark:border-primary-800">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Price</p>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">
                    ${details.totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
            {details.extra && (
              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 text-sm text-gray-700 dark:text-gray-300">
                {details.extra}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
          {onAction && (
            <button
              onClick={handleAction}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


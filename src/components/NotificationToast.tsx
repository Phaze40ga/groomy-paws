import { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type Notification = {
  id: string;
  message: string;
  senderName?: string;
  conversationId?: string;
  timestamp: Date;
  category?: 'message' | 'reminder' | 'system';
  status: 'new' | 'read' | 'snoozed' | 'dismissed';
  snoozedUntil?: string | null;
  channel?: 'in_app' | 'email' | 'sms' | 'push';
};

type NotificationToastProps = {
  notification: Notification;
  onClose: (id: string) => void;
};

export function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
    
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(notification.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  function handleClick() {
    if (notification.conversationId) {
      navigate('/messages');
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-2xl border-2 border-pink-200 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      onClick={handleClick}
    >
      <div className="p-4 flex items-start gap-3 cursor-pointer hover:bg-pink-50 transition-colors">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-gray-900 text-sm">
              {notification.senderName 
                ? notification.senderName === 'the groomer'
                  ? 'New message from the groomer'
                  : `New message from ${notification.senderName}`
                : 'New Message'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
                setTimeout(() => onClose(notification.id), 300);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 truncate">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {notification.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}


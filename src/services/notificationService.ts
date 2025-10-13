// Notification service for browser/OS notifications

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check current notification permission status
   */
  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  /**
   * Show a notification for hand raised
   */
  showHandRaisedNotification(studentName: string, classCode: string): void {
    if (this.permission !== 'granted') return;

    const notification = new Notification('✋ Hand Raised!', {
      body: `${studentName} has raised their hand in class ${classCode}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `hand-raised-${studentName}`, // Prevents duplicate notifications
      requireInteraction: true // Keeps notification visible until user interacts
    });

    // Auto-close after 10 seconds if user doesn't interact
    setTimeout(() => {
      notification.close();
    }, 10000);

    // Handle notification click
    notification.onclick = () => {
      window.focus(); // Bring the browser window to focus
      notification.close();
    };
  }

  /**
   * Show a notification for new question
   */
  showQuestionNotification(studentName: string, questionText: string, classCode: string): void {
    if (this.permission !== 'granted') return;

    // Truncate long questions for notification
    const truncatedQuestion = questionText.length > 100 
      ? questionText.substring(0, 97) + '...' 
      : questionText;

    const notification = new Notification('❓ New Question!', {
      body: `${studentName} asked: "${truncatedQuestion}" in class ${classCode}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `question-${Date.now()}`, // Allow multiple question notifications
      requireInteraction: true
    });

    // Auto-close after 15 seconds for questions (longer since they have more text)
    setTimeout(() => {
      notification.close();
    }, 15000);

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  /**
   * Show notification permission request prompt
   */
  showPermissionPrompt(onAllow: () => void, onDeny: () => void): void {
    // This would typically be a custom UI component
    // For now, we'll use the browser's built-in permission request
    this.requestPermission().then(granted => {
      if (granted) {
        onAllow();
      } else {
        onDeny();
      }
    });
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check if permission is granted
   */
  isEnabled(): boolean {
    return this.permission === 'granted';
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
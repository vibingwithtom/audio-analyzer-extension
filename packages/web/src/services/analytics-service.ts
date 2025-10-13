// Extend Window interface to include umami
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, properties?: Record<string, any>) => void;
    };
  }
}

class AnalyticsService {
  track(eventName: string, properties?: Record<string, any>) {
    if (window.umami) {
      window.umami.track(eventName, properties);
    }
  }
}

export const analyticsService = new AnalyticsService();

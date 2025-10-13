class AnalyticsService {
  track(eventName: string, properties?: Record<string, any>) {
    if (window.umami) {
      window.umami.track(eventName, properties);
    }
  }
}

export const analyticsService = new AnalyticsService();

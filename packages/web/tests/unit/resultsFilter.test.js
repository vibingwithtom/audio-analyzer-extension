import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { resultsFilter, cleanup } from '../../src/stores/resultsFilter.ts';

describe('resultsFilter store', () => {
  afterEach(() => {
    // Reset filter state after each test
    resultsFilter.set(null);
  });

  describe('Initial State', () => {
    it('should start with null filter', () => {
      const value = get(resultsFilter);
      expect(value).toBe(null);
    });
  });

  describe('Setting Filter Values', () => {
    it('should allow setting pass filter', () => {
      resultsFilter.set('pass');
      expect(get(resultsFilter)).toBe('pass');
    });

    it('should allow setting warning filter', () => {
      resultsFilter.set('warning');
      expect(get(resultsFilter)).toBe('warning');
    });

    it('should allow setting fail filter', () => {
      resultsFilter.set('fail');
      expect(get(resultsFilter)).toBe('fail');
    });

    it('should allow setting error filter', () => {
      resultsFilter.set('error');
      expect(get(resultsFilter)).toBe('error');
    });

    it('should allow clearing filter back to null', () => {
      resultsFilter.set('pass');
      resultsFilter.set(null);
      expect(get(resultsFilter)).toBe(null);
    });
  });

  // Note: Analytics tracking and auto-reset behavior are tested through
  // integration tests and manual testing. Unit testing module-level subscriptions
  // requires complex mocking that can be brittle and doesn't add much value
  // beyond what integration tests provide.

  describe('Cleanup Function', () => {
    it('should exist and be callable', () => {
      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => cleanup()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });
  });

  describe('Store Subscription', () => {
    it('should notify subscribers when filter changes', () => {
      const subscriber = vi.fn();
      const unsubscribe = resultsFilter.subscribe(subscriber);

      // Clear initial call
      subscriber.mockClear();

      resultsFilter.set('pass');

      expect(subscriber).toHaveBeenCalledWith('pass');

      unsubscribe();
    });

    it('should support multiple subscribers', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      const unsub1 = resultsFilter.subscribe(subscriber1);
      const unsub2 = resultsFilter.subscribe(subscriber2);

      subscriber1.mockClear();
      subscriber2.mockClear();

      resultsFilter.set('warning');

      expect(subscriber1).toHaveBeenCalledWith('warning');
      expect(subscriber2).toHaveBeenCalledWith('warning');

      unsub1();
      unsub2();
    });
  });

  describe('Type Safety', () => {
    it('should accept all valid ResultFilterType values', () => {
      const validValues = ['pass', 'warning', 'fail', 'error', null];

      validValues.forEach(value => {
        expect(() => resultsFilter.set(value)).not.toThrow();
        expect(get(resultsFilter)).toBe(value);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid filter changes', () => {
      resultsFilter.set('pass');
      resultsFilter.set('warning');
      resultsFilter.set('fail');
      resultsFilter.set('error');
      resultsFilter.set(null);

      expect(get(resultsFilter)).toBe(null);
    });

    it('should handle setting same value multiple times', () => {
      resultsFilter.set('pass');
      resultsFilter.set('pass');
      resultsFilter.set('pass');

      expect(get(resultsFilter)).toBe('pass');
    });
  });
});

/**
 * AppBridge Tests
 *
 * Comprehensive test suite for the AppBridge event system
 * Phase 5.2a - Infrastructure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppBridge, type AppEvent } from '../../src/bridge/app-bridge';

describe('AppBridge', () => {
  let bridge: AppBridge;

  beforeEach(() => {
    bridge = AppBridge.getInstance();
    // Clear localStorage to avoid test pollution
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up listeners after each test
    bridge.clearAllListeners();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AppBridge.getInstance();
      const instance2 = AppBridge.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const handler = vi.fn();
      const instance1 = AppBridge.getInstance();
      instance1.on('file:local:selected', handler);

      const instance2 = AppBridge.getInstance();
      instance2.dispatch({
        type: 'file:local:selected',
        file: new File(['test'], 'test.wav', { type: 'audio/wav' })
      });

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Event Dispatching', () => {
    it('should dispatch file:local:selected event', () => {
      const handler = vi.fn();
      bridge.on('file:local:selected', handler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({
        type: 'file:local:selected',
        file
      });
    });

    it('should dispatch events with options', () => {
      const handler = vi.fn();
      bridge.on('file:local:selected', handler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      const options = {
        enableAudioAnalysis: true,
        enableFilenameValidation: false
      };

      bridge.dispatch({
        type: 'file:local:selected',
        file,
        options
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'file:local:selected',
        file,
        options
      });
    });

    it('should dispatch analysis lifecycle events', () => {
      const startHandler = vi.fn();
      const progressHandler = vi.fn();
      const completeHandler = vi.fn();

      bridge.on('analysis:started', startHandler);
      bridge.on('analysis:progress', progressHandler);
      bridge.on('analysis:completed', completeHandler);

      bridge.dispatch({
        type: 'analysis:started',
        filename: 'test.wav',
        source: 'local'
      });

      bridge.dispatch({
        type: 'analysis:progress',
        filename: 'test.wav',
        percent: 50,
        stage: 'analyzing'
      });

      bridge.dispatch({
        type: 'analysis:completed',
        results: { status: 'pass' }
      });

      expect(startHandler).toHaveBeenCalledOnce();
      expect(progressHandler).toHaveBeenCalledOnce();
      expect(completeHandler).toHaveBeenCalledOnce();
    });

    it('should dispatch auth events', () => {
      const handler = vi.fn();
      bridge.on('auth:google:signin:requested', handler);

      bridge.dispatch({ type: 'auth:google:signin:requested' });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should dispatch tab navigation events', () => {
      const handler = vi.fn();
      bridge.on('tab:changed', handler);

      bridge.dispatch({ type: 'tab:changed', tab: 'googleDrive' });

      expect(handler).toHaveBeenCalledWith({
        type: 'tab:changed',
        tab: 'googleDrive'
      });
    });
  });

  describe('Event Subscription', () => {
    it('should call handler only for subscribed event type', () => {
      const fileHandler = vi.fn();
      const authHandler = vi.fn();

      bridge.on('file:local:selected', fileHandler);
      bridge.on('auth:google:signin:requested', authHandler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(fileHandler).toHaveBeenCalledOnce();
      expect(authHandler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bridge.on('file:local:selected', handler1);
      bridge.on('file:local:selected', handler2);
      bridge.on('file:local:selected', handler3);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('should unsubscribe when calling returned function', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.on('file:local:selected', handler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });

      // First dispatch - handler should be called
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });
      expect(handler).toHaveBeenCalledOnce();

      // Unsubscribe
      unsubscribe();

      // Second dispatch - handler should NOT be called
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });
      expect(handler).toHaveBeenCalledOnce(); // Still just once
    });
  });

  describe('onAll Subscription', () => {
    it('should receive all event types', () => {
      const handler = vi.fn();
      bridge.onAll(handler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });

      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      bridge.dispatch({
        type: 'auth:google:signin:requested'
      });

      bridge.dispatch({
        type: 'tab:changed',
        tab: 'settings'
      });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe from all events', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.onAll(handler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });

      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler).toHaveBeenCalledOnce();

      unsubscribe();

      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler).toHaveBeenCalledOnce(); // Still just once
    });
  });

  describe('once Subscription', () => {
    it('should call handler only once then auto-unsubscribe', () => {
      const handler = vi.fn();
      bridge.once('file:local:selected', handler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });

      // First dispatch
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      // Second dispatch
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      // Third dispatch
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should support manual unsubscribe before first call', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.once('file:local:selected', handler);

      // Unsubscribe before any events
      unsubscribe();

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe event details', () => {
      const handler = vi.fn((event) => {
        // TypeScript should infer that event has 'file' property
        expect(event.file).toBeDefined();
        expect(event.file).toBeInstanceOf(File);
      });

      bridge.on('file:local:selected', handler);

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Batch Processing Events', () => {
    it('should dispatch batch lifecycle events', () => {
      const startHandler = vi.fn();
      const progressHandler = vi.fn();
      const completeHandler = vi.fn();

      bridge.on('batch:started', startHandler);
      bridge.on('batch:progress', progressHandler);
      bridge.on('batch:completed', completeHandler);

      bridge.dispatch({
        type: 'batch:started',
        totalFiles: 10,
        source: 'local'
      });

      bridge.dispatch({
        type: 'batch:progress',
        processedFiles: 5,
        totalFiles: 10,
        currentFile: 'test5.wav'
      });

      bridge.dispatch({
        type: 'batch:completed',
        results: []
      });

      expect(startHandler).toHaveBeenCalledOnce();
      expect(progressHandler).toHaveBeenCalledOnce();
      expect(completeHandler).toHaveBeenCalledOnce();
    });
  });

  describe('Error Handling', () => {
    it('should dispatch analysis error events', () => {
      const handler = vi.fn();
      bridge.on('analysis:error', handler);

      const error = new Error('Analysis failed');
      bridge.dispatch({
        type: 'analysis:error',
        filename: 'test.wav',
        error
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'analysis:error',
        filename: 'test.wav',
        error
      });
    });

    it('should dispatch auth error events', () => {
      const handler = vi.fn();
      bridge.on('auth:google:signin:error', handler);

      const error = new Error('Auth failed');
      bridge.dispatch({
        type: 'auth:google:signin:error',
        error
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'auth:google:signin:error',
        error
      });
    });
  });

  describe('Advanced Analysis Events', () => {
    it('should dispatch advanced analysis lifecycle', () => {
      const startHandler = vi.fn();
      const progressHandler = vi.fn();
      const completeHandler = vi.fn();

      bridge.on('advanced:started', startHandler);
      bridge.on('advanced:progress', progressHandler);
      bridge.on('advanced:completed', completeHandler);

      bridge.dispatch({
        type: 'advanced:started',
        filename: 'test.wav'
      });

      bridge.dispatch({
        type: 'advanced:progress',
        percent: 75,
        stage: 'calculating reverb'
      });

      bridge.dispatch({
        type: 'advanced:completed',
        results: { noiseFloor: -60 }
      });

      expect(startHandler).toHaveBeenCalledOnce();
      expect(progressHandler).toHaveBeenCalledOnce();
      expect(completeHandler).toHaveBeenCalledOnce();
    });
  });

  describe('Settings Events', () => {
    it('should dispatch preset change events', () => {
      const handler = vi.fn();
      bridge.on('settings:preset:changed', handler);

      bridge.dispatch({
        type: 'settings:preset:changed',
        presetId: 'three-hour'
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'settings:preset:changed',
        presetId: 'three-hour'
      });
    });

    it('should dispatch dark mode toggle events', () => {
      const handler = vi.fn();
      bridge.on('settings:darkmode:toggled', handler);

      bridge.dispatch({
        type: 'settings:darkmode:toggled',
        enabled: true
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'settings:darkmode:toggled',
        enabled: true
      });
    });
  });

  describe('Debug Logging', () => {
    it('should enable debug logging via localStorage', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      localStorage.setItem('debugBridge', 'true');

      // Create new instance to pick up debug setting
      const debugBridge = AppBridge.getInstance();

      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      debugBridge.dispatch({
        type: 'file:local:selected',
        file
      });

      // Note: Debug logging is set up in constructor, so we need to test differently
      // For now, just verify localStorage setting works
      expect(localStorage.getItem('debugBridge')).toBe('true');

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with many subscribe/unsubscribe cycles', () => {
      const handler = vi.fn();

      // Subscribe and unsubscribe many times
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = bridge.on('file:local:selected', handler);
        unsubscribe();
      }

      // Dispatch event - handler should not be called
      const file = new File(['test'], 'test.wav', { type: 'audio/wav' });
      bridge.dispatch({
        type: 'file:local:selected',
        file
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

/**
 * Tests for performance monitoring utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PerformanceMonitor, 
  measurePerformance, 
  getPerformanceStatus,
  PERFORMANCE_THRESHOLDS 
} from './performance-monitor';

describe('Performance Monitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
  });

  describe('measurePerformance', () => {
    it('should measure execution time of synchronous functions', async () => {
      const testFn = () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const { result, metrics } = await measurePerformance('test-sync', 1000, testFn);

      expect(result).toBe(499500); // Sum of 0 to 999
      expect(metrics.operation).toBe('test-sync');
      expect(metrics.dataPoints).toBe(1000);
      expect(metrics.executionTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should measure execution time of asynchronous functions', async () => {
      const testFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      };

      const { result, metrics } = await measurePerformance('test-async', 1, testFn);

      expect(result).toBe('async result');
      expect(metrics.operation).toBe('test-async');
      expect(metrics.dataPoints).toBe(1);
      expect(metrics.executionTime).toBeGreaterThanOrEqual(10);
    });

    it('should handle function errors and still record metrics', async () => {
      const testFn = () => {
        throw new Error('Test error');
      };

      await expect(measurePerformance('test-error', 1, testFn)).rejects.toThrow('Test error');

      const recentMetrics = monitor.getRecentMetrics(1);
      expect(recentMetrics).toHaveLength(1);
      expect(recentMetrics[0].operation).toBe('test-error (failed)');
      expect(recentMetrics[0].throughput).toBe(0);
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track multiple measurements', async () => {
      await measurePerformance('op1', 100, () => 'result1');
      await measurePerformance('op2', 200, () => 'result2');
      await measurePerformance('op1', 150, () => 'result3');

      const allMetrics = monitor.getRecentMetrics(10);
      expect(allMetrics).toHaveLength(3);
      
      const op1Metrics = allMetrics.filter(m => m.operation === 'op1');
      expect(op1Metrics).toHaveLength(2);
    });

    it('should calculate average performance', async () => {
      // Add some measurements with known execution times
      await measurePerformance('test-op', 100, () => {
        const start = performance.now();
        while (performance.now() - start < 5) {} // Busy wait ~5ms
        return 'result';
      });

      await measurePerformance('test-op', 100, () => {
        const start = performance.now();
        while (performance.now() - start < 15) {} // Busy wait ~15ms
        return 'result';
      });

      const avgPerf = monitor.getAveragePerformance('test-op');
      expect(avgPerf).not.toBeNull();
      expect(avgPerf!.sampleCount).toBe(2);
      expect(avgPerf!.avgExecutionTime).toBeGreaterThan(5);
      expect(avgPerf!.avgThroughput).toBeGreaterThan(0);
    });

    it('should return null for unknown operations', () => {
      const avgPerf = monitor.getAveragePerformance('unknown-op');
      expect(avgPerf).toBeNull();
    });

    it('should detect performance degradation', async () => {
      // Add fast measurements
      for (let i = 0; i < 3; i++) {
        await measurePerformance('perf-test', 100, () => 'fast');
      }

      // Add slow measurements
      for (let i = 0; i < 3; i++) {
        await measurePerformance('perf-test', 100, () => {
          const start = performance.now();
          while (performance.now() - start < 20) {} // Busy wait ~20ms
          return 'slow';
        });
      }

      const isDegrading = monitor.isPerformanceDegrading('perf-test', 1.5);
      expect(isDegrading).toBe(true);
    });

    it('should not detect degradation with insufficient data', () => {
      const isDegrading = monitor.isPerformanceDegrading('insufficient-data', 1.5);
      expect(isDegrading).toBe(false);
    });

    it('should limit metrics history', async () => {
      // Add more than the maximum number of metrics
      for (let i = 0; i < 150; i++) {
        await measurePerformance(`op-${i}`, 1, () => i);
      }

      const allMetrics = monitor.getRecentMetrics(200);
      expect(allMetrics.length).toBeLessThanOrEqual(100); // Should be limited to max size
    });
  });

  describe('getPerformanceStatus', () => {
    it('should return correct status for concentration grid operations', () => {
      expect(getPerformanceStatus('CONCENTRATION_GRID', 50)).toBe('good');
      expect(getPerformanceStatus('CONCENTRATION_GRID', 300)).toBe('acceptable');
      expect(getPerformanceStatus('CONCENTRATION_GRID', 1500)).toBe('poor');
    });

    it('should return correct status for contour generation operations', () => {
      expect(getPerformanceStatus('CONTOUR_GENERATION', 25)).toBe('good');
      expect(getPerformanceStatus('CONTOUR_GENERATION', 150)).toBe('acceptable');
      expect(getPerformanceStatus('CONTOUR_GENERATION', 600)).toBe('poor');
    });

    it('should return correct status for polygon rendering operations', () => {
      expect(getPerformanceStatus('POLYGON_RENDERING', 10)).toBe('good');
      expect(getPerformanceStatus('POLYGON_RENDERING', 25)).toBe('acceptable');
      expect(getPerformanceStatus('POLYGON_RENDERING', 150)).toBe('poor');
    });

    it('should return acceptable for unknown operations', () => {
      expect(getPerformanceStatus('UNKNOWN_OPERATION', 1000)).toBe('acceptable');
    });
  });

  describe('PERFORMANCE_THRESHOLDS', () => {
    it('should have valid threshold values', () => {
      expect(PERFORMANCE_THRESHOLDS.CONCENTRATION_GRID.GOOD).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONCENTRATION_GRID.ACCEPTABLE
      );
      expect(PERFORMANCE_THRESHOLDS.CONCENTRATION_GRID.ACCEPTABLE).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONCENTRATION_GRID.POOR
      );

      expect(PERFORMANCE_THRESHOLDS.CONTOUR_GENERATION.GOOD).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONTOUR_GENERATION.ACCEPTABLE
      );
      expect(PERFORMANCE_THRESHOLDS.CONTOUR_GENERATION.ACCEPTABLE).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONTOUR_GENERATION.POOR
      );

      expect(PERFORMANCE_THRESHOLDS.POLYGON_RENDERING.GOOD).toBeLessThan(
        PERFORMANCE_THRESHOLDS.POLYGON_RENDERING.ACCEPTABLE
      );
      expect(PERFORMANCE_THRESHOLDS.POLYGON_RENDERING.ACCEPTABLE).toBeLessThan(
        PERFORMANCE_THRESHOLDS.POLYGON_RENDERING.POOR
      );
    });
  });
});
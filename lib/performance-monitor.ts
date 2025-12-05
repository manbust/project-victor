/**
 * Performance monitoring utilities for Gaussian plume calculations
 * 
 * This module provides tools to monitor and optimize the performance
 * of computationally intensive operations in the plume visualization.
 */

/**
 * Performance metrics for a calculation
 */
export interface PerformanceMetrics {
  /** Operation name */
  operation: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Number of data points processed */
  dataPoints: number;
  /** Points per second throughput */
  throughput: number;
  /** Timestamp when measurement was taken */
  timestamp: Date;
}

/**
 * Performance monitor class for tracking calculation performance
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 100; // Keep last 100 measurements

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Measure the performance of an operation
   * 
   * @param operation - Name of the operation being measured
   * @param dataPoints - Number of data points processed
   * @param fn - Function to measure
   * @returns Result of the function and performance metrics
   */
  public async measure<T>(
    operation: string,
    dataPoints: number,
    fn: () => T | Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      const metrics: PerformanceMetrics = {
        operation,
        executionTime,
        dataPoints,
        throughput: dataPoints / (executionTime / 1000), // points per second
        timestamp: new Date()
      };
      
      this.addMetrics(metrics);
      
      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Still record metrics for failed operations
      const metrics: PerformanceMetrics = {
        operation: `${operation} (failed)`,
        executionTime,
        dataPoints,
        throughput: 0,
        timestamp: new Date()
      };
      
      this.addMetrics(metrics);
      throw error;
    }
  }

  /**
   * Add metrics to the history
   */
  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Performance: ${metrics.operation} - ${metrics.executionTime.toFixed(2)}ms ` +
        `(${metrics.dataPoints} points, ${metrics.throughput.toFixed(0)} pts/sec)`
      );
    }
  }

  /**
   * Get recent performance metrics
   */
  public getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get average performance for an operation
   */
  public getAveragePerformance(operation: string): {
    avgExecutionTime: number;
    avgThroughput: number;
    sampleCount: number;
  } | null {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    
    if (operationMetrics.length === 0) {
      return null;
    }
    
    const avgExecutionTime = operationMetrics.reduce((sum, m) => sum + m.executionTime, 0) / operationMetrics.length;
    const avgThroughput = operationMetrics.reduce((sum, m) => sum + m.throughput, 0) / operationMetrics.length;
    
    return {
      avgExecutionTime,
      avgThroughput,
      sampleCount: operationMetrics.length
    };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Check if performance is degrading
   */
  public isPerformanceDegrading(operation: string, threshold: number = 1.5): boolean {
    const operationMetrics = this.metrics
      .filter(m => m.operation === operation)
      .slice(-10); // Last 10 measurements
    
    if (operationMetrics.length < 5) {
      return false; // Not enough data
    }
    
    const recentAvg = operationMetrics.slice(-3).reduce((sum, m) => sum + m.executionTime, 0) / 3;
    const olderAvg = operationMetrics.slice(0, 3).reduce((sum, m) => sum + m.executionTime, 0) / 3;
    
    return recentAvg > olderAvg * threshold;
  }
}

/**
 * Convenience function to measure performance
 */
export function measurePerformance<T>(
  operation: string,
  dataPoints: number,
  fn: () => T | Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  return PerformanceMonitor.getInstance().measure(operation, dataPoints, fn);
}

/**
 * Performance thresholds for different operations
 */
export const PERFORMANCE_THRESHOLDS = {
  CONCENTRATION_GRID: {
    GOOD: 100,      // < 100ms for grid generation
    ACCEPTABLE: 500, // < 500ms acceptable
    POOR: 1000      // > 1000ms is poor performance
  },
  CONTOUR_GENERATION: {
    GOOD: 50,       // < 50ms for contour generation
    ACCEPTABLE: 200, // < 200ms acceptable
    POOR: 500       // > 500ms is poor performance
  },
  POLYGON_RENDERING: {
    GOOD: 16,       // < 16ms for 60fps rendering
    ACCEPTABLE: 33,  // < 33ms for 30fps rendering
    POOR: 100       // > 100ms causes noticeable lag
  }
} as const;

/**
 * Get performance status based on execution time
 */
export function getPerformanceStatus(
  operation: string,
  executionTime: number
): 'good' | 'acceptable' | 'poor' {
  const thresholds = PERFORMANCE_THRESHOLDS[operation as keyof typeof PERFORMANCE_THRESHOLDS];
  
  if (!thresholds) {
    return 'acceptable'; // Default for unknown operations
  }
  
  if (executionTime < thresholds.GOOD) {
    return 'good';
  } else if (executionTime < thresholds.ACCEPTABLE) {
    return 'acceptable';
  } else {
    return 'poor';
  }
}
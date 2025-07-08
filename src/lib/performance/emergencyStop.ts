import { productionLogger } from '@/lib/logging/productionLogger';

interface EmergencyStopManager {
  isActive: boolean;
  activate: () => void;
  deactivate: () => void;
  check: () => boolean;
}

class EmergencyStopService {
  private active = false;
  private activationTime = 0;
  private readonly AUTO_DEACTIVATE_DELAY = 30000; // 30 seconds

  activate(reason: string = 'Performance emergency'): void {
    if (this.active) return;
    
    this.active = true;
    this.activationTime = Date.now();
    
    productionLogger.error('[EMERGENCY STOP] Activated', { reason }, 'PERFORMANCE');
    
    // Auto-deactivate after delay
    setTimeout(() => {
      if (this.active) {
        this.deactivate('Auto-deactivation timeout');
      }
    }, this.AUTO_DEACTIVATE_DELAY);
  }

  deactivate(reason: string = 'Manual deactivation'): void {
    if (!this.active) return;
    
    this.active = false;
    const duration = Date.now() - this.activationTime;
    
    productionLogger.info('[EMERGENCY STOP] Deactivated', { 
      reason, 
      durationMs: duration 
    }, 'PERFORMANCE');
  }

  check(): boolean {
    return this.active;
  }

  isActive(): boolean {
    return this.active;
  }

  getDuration(): number {
    return this.active ? Date.now() - this.activationTime : 0;
  }
}

// Global emergency stop instance
const emergencyStop = new EmergencyStopService();

export const useEmergencyStop = (): EmergencyStopManager => {
  return {
    isActive: emergencyStop.isActive(),
    activate: () => emergencyStop.activate(),
    deactivate: () => emergencyStop.deactivate(),
    check: () => emergencyStop.check()
  };
};

export { emergencyStop };
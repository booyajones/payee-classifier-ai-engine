export interface PollingState {
  isPolling: boolean;
  lastPoll: number;
  pollCount: number;
  consecutiveErrors: number;
  lastStatus?: string;
  lastProgress?: number;
}

export interface StalledJobActions {
  isStalled: boolean;
  suggestions?: string[];
  canCancel: boolean;
  payeeCount?: number;
}


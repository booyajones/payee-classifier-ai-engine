import React from 'react';
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Info, RefreshCw } from "lucide-react";
import { Button } from './button';

export const useEnhancedNotifications = () => {
  const { toast } = useToast();

  const showSuccess = (title: string, description?: string, options?: {
    action?: () => void;
    actionLabel?: string;
    duration?: number;
  }) => {
    toast({
      title,
      description,
      variant: "default",
      className: "border-green-200 bg-green-50 text-green-900",
      action: options?.action ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={options.action}
          className="border-green-300 text-green-700 hover:bg-green-100"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          {options.actionLabel || 'View'}
        </Button>
      ) : (
        <CheckCircle className="h-4 w-4 text-green-600" />
      )
    });
  };

  const showError = (title: string, description?: string, options?: {
    retry?: () => void;
    retryLabel?: string;
  }) => {
    toast({
      title,
      description,
      variant: "destructive",
      action: options?.retry ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={options.retry}
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          {options.retryLabel || 'Retry'}
        </Button>
      ) : (
        <XCircle className="h-4 w-4" />
      )
    });
  };

  const showWarning = (title: string, description?: string, options?: {
    action?: () => void;
    actionLabel?: string;
  }) => {
    toast({
      title,
      description,
      variant: "default",
      className: "border-yellow-200 bg-yellow-50 text-yellow-900",
      action: options?.action ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={options.action}
          className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          {options.actionLabel || 'Fix'}
        </Button>
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-600" />
      )
    });
  };

  const showInfo = (title: string, description?: string, options?: {
    action?: () => void;
    actionLabel?: string;
  }) => {
    toast({
      title,
      description,
      variant: "default",
      className: "border-blue-200 bg-blue-50 text-blue-900",
      action: options?.action ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={options.action}
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <Info className="h-3 w-3 mr-1" />
          {options.actionLabel || 'Learn More'}
        </Button>
      ) : (
        <Info className="h-4 w-4 text-blue-600" />
      )
    });
  };

  const showLoading = (title: string, description?: string) => {
    const { dismiss } = toast({
      title,
      description,
      variant: "default",
      className: "border-gray-200 bg-gray-50 text-gray-900",
      action: <RefreshCw className="h-4 w-4 animate-spin text-gray-600" />,
      duration: Infinity, // Keep showing until manually dismissed
    });
    
    return dismiss;
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading
  };
};

export default useEnhancedNotifications;
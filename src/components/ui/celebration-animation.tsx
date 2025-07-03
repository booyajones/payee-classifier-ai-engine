import React, { useEffect, useState } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CelebrationAnimationProps {
  show: boolean;
  title?: string;
  description?: string;
  onComplete?: () => void;
  className?: string;
}

const CelebrationAnimation = ({ 
  show, 
  title = "Success!", 
  description,
  onComplete,
  className 
}: CelebrationAnimationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm",
      "animate-fade-in",
      className
    )}>
      <div className="text-center space-y-4 animate-scale-in">
        {/* Main success icon with pulse animation */}
        <div className="relative mx-auto w-20 h-20">
          <CheckCircle className="w-20 h-20 text-green-500 animate-pulse" />
          
          {/* Sparkle effects */}
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" 
                   style={{ animationDelay: '0.2s' }} />
          <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 text-blue-400 animate-bounce" 
                   style={{ animationDelay: '0.4s' }} />
          <Sparkles className="absolute top-1 -left-3 w-5 h-5 text-purple-400 animate-bounce" 
                   style={{ animationDelay: '0.6s' }} />
        </div>

        {/* Success message */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-green-600 animate-fade-in">
            {title}
          </h3>
          {description && (
            <p className="text-muted-foreground animate-fade-in" 
               style={{ animationDelay: '0.3s' }}>
              {description}
            </p>
          )}
        </div>

        {/* Confetti-like effect with multiple sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                "absolute w-3 h-3 text-yellow-400 animate-bounce",
                i % 2 === 0 ? "text-blue-400" : "text-purple-400"
              )}
              style={{
                left: `${20 + (i * 10)}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CelebrationAnimation;
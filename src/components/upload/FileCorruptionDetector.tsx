
import { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { handleError } from '@/lib/errorHandler';

interface CorruptionCheckResult {
  isCorrupted: boolean;
  issues: string[];
  confidence: number;
  warnings: string[];
}

interface FileCorruptionDetectorProps {
  file: File;
  onResult: (result: CorruptionCheckResult) => void;
  autoCheck?: boolean;
}

const FileCorruptionDetector = ({ file, onResult, autoCheck = true }: FileCorruptionDetectorProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CorruptionCheckResult | null>(null);

  const detectCorruption = useCallback(async () => {
    if (!file) return;

    setIsChecking(true);
    setProgress(0);
    
    try {
      console.log(`[CORRUPTION DETECTOR] Checking file: ${file.name}`);
      
      const issues: string[] = [];
      const warnings: string[] = [];
      let confidence = 100;

      // Check 1: File size consistency
      setProgress(20);
      if (file.size === 0) {
        issues.push('File is empty');
        confidence -= 50;
      }

      // Check 2: File extension vs content type
      setProgress(40);
      const extension = file.name.split('.').pop()?.toLowerCase();
      const expectedMimes = {
        'csv': ['text/csv', 'application/csv'],
        'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'xls': ['application/vnd.ms-excel']
      };

      if (extension && expectedMimes[extension as keyof typeof expectedMimes]) {
        const expected = expectedMimes[extension as keyof typeof expectedMimes];
        if (file.type && !expected.includes(file.type)) {
          warnings.push(`File type mismatch: expected ${expected.join(' or ')}, got ${file.type}`);
          confidence -= 10;
        }
      }

      // Check 3: Read file header for format validation
      setProgress(60);
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as ArrayBuffer;
            const header = new Uint8Array(content.slice(0, 100));
            
            // Check for common file signatures
            if (extension === 'xlsx') {
              // XLSX files start with PK (ZIP signature)
              if (header[0] !== 0x50 || header[1] !== 0x4B) {
                issues.push('Invalid XLSX file signature');
                confidence -= 30;
              }
            } else if (extension === 'csv') {
              // Check for common CSV issues
              const text = new TextDecoder().decode(header);
              if (text.includes('\0')) {
                issues.push('Binary data found in CSV file');
                confidence -= 40;
              }
            }
          } catch (error) {
            warnings.push('Could not read file header');
            confidence -= 5;
          }
          resolve();
        };
        reader.onerror = () => {
          issues.push('Unable to read file');
          confidence -= 50;
          resolve();
        };
        reader.readAsArrayBuffer(file.slice(0, 100));
      });

      // Check 4: File name validation
      setProgress(80);
      if (file.name.includes('\0') || file.name.length > 255) {
        warnings.push('Unusual file name detected');
        confidence -= 5;
      }

      setProgress(100);

      const finalResult: CorruptionCheckResult = {
        isCorrupted: issues.length > 0 || confidence < 70,
        issues,
        confidence,
        warnings
      };

      console.log(`[CORRUPTION DETECTOR] Check complete:`, finalResult);
      setResult(finalResult);
      onResult(finalResult);

    } catch (error) {
      const appError = handleError(error, 'File Corruption Detection');
      const errorResult: CorruptionCheckResult = {
        isCorrupted: true,
        issues: [appError.message],
        confidence: 0,
        warnings: []
      };
      setResult(errorResult);
      onResult(errorResult);
    } finally {
      setIsChecking(false);
    }
  }, [file, onResult]);

  // Auto-check when component mounts or file changes
  useState(() => {
    if (autoCheck && file) {
      detectCorruption();
    }
  });

  if (!result && !isChecking) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isChecking && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking file integrity...</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {result && (
        <Alert variant={result.isCorrupted ? 'destructive' : 'default'}>
          {result.isCorrupted ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">
                {result.isCorrupted ? 'File Integrity Issues Detected' : 'File Integrity Check Passed'}
              </div>
              <div className="text-sm">
                Confidence: {result.confidence}%
              </div>
              
              {result.issues.length > 0 && (
                <div className="space-y-1">
                  <div className="font-medium text-sm">Issues:</div>
                  <ul className="text-xs space-y-1">
                    {result.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.warnings.length > 0 && (
                <div className="space-y-1">
                  <div className="font-medium text-sm">Warnings:</div>
                  <ul className="text-xs space-y-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FileCorruptionDetector;

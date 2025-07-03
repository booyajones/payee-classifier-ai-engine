// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { runDuplicateTests } from '@/lib/services/duplicateTesting';
import { runExclusionTests } from '@/lib/classification/exclusionTesting';

const DuplicateTestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<any>(null);
  const [exclusionResults, setExclusionResults] = useState<any>(null);

  const runAllTests = async () => {
    setIsRunning(true);
    try {
      productionLogger.debug('[TEST RUNNER] Starting comprehensive tests...');
      
      // Run duplicate detection tests
      const dupResults = await runDuplicateTests();
      setDuplicateResults(dupResults);
      
      // Run exclusion tests
      const excResults = await runExclusionTests();
      setExclusionResults(excResults);
      
      productionLogger.debug('[TEST RUNNER] All tests completed');
    } catch (error) {
      productionLogger.error('[TEST RUNNER] Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (passed: number, failed: number) => {
    const total = passed + failed;
    const allPassed = failed === 0;
    
    return (
      <Badge 
        variant={allPassed ? "default" : "destructive"}
        className={allPassed ? "bg-green-500" : ""}
      >
        {passed}/{total} passed
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Duplicate Detection & Exclusion Test Runner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This test runner validates the fixes for keyword exclusion and duplicate detection.
                It tests the specific issues mentioned: "VA" vs "Valley", "Christa" variants, etc.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Detection Results */}
      {duplicateResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Duplicate Detection Tests
              </span>
              {getStatusBadge(duplicateResults.passed, duplicateResults.failed)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {duplicateResults.results.map((result: any, index: number) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.passed 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.passed)}
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">
                        {result.testCase.description}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Test Records: {result.testCase.records.map(r => `"${r.payee_name}"`).join(', ')}
                      </div>
                      {!result.passed && (
                        <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                          <div className="font-medium mb-1">Expected Groups:</div>
                          <div className="mb-2">{JSON.stringify(result.testCase.expectedDuplicates)}</div>
                          <div className="font-medium mb-1">Actual Groups:</div>
                          <div>{JSON.stringify(result.actualGroups)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exclusion Detection Results */}
      {exclusionResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Keyword Exclusion Tests
              </span>
              {getStatusBadge(exclusionResults.passed, exclusionResults.failed)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exclusionResults.results.map((result: any, index: number) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.passed 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.passed)}
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">
                        Payee: "{result.testCase.payeeName}"
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Expected: {result.testCase.shouldBeExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {result.testCase.description}
                      </div>
                      {result.result && (
                        <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                          <div>Actual: {result.result.isExcluded ? 'EXCLUDED' : 'NOT EXCLUDED'}</div>
                          {result.result.matchedKeywords.length > 0 && (
                            <div>Matched Keywords: {result.result.matchedKeywords.join(', ')}</div>
                          )}
                          <div>Confidence: {result.result.confidence}%</div>
                          <div>Reasoning: {result.result.reasoning}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Summary */}
      {(duplicateResults || exclusionResults) && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {duplicateResults && (
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {duplicateResults.passed}/{duplicateResults.passed + duplicateResults.failed}
                  </div>
                  <div className="text-sm text-blue-700">Duplicate Tests Passed</div>
                </div>
              )}
              
              {exclusionResults && (
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {exclusionResults.passed}/{exclusionResults.passed + exclusionResults.failed}
                  </div>
                  <div className="text-sm text-purple-700">Exclusion Tests Passed</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DuplicateTestRunner;


import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { classifyPayeeWithAI } from "@/lib/openai/singleClassification";
import { enhancedClassifyPayeeWithAI } from "@/lib/openai/enhancedClassification";
import { testSicCodePipeline } from "@/lib/testing/sicCodeTest";
import { loadAllClassificationResults } from "@/lib/database/classificationService";
import { exportDirectCSV } from "@/lib/classification/batchExporter";
import { BatchProcessingResult } from "@/lib/types";
import { Play, Database, Download, TestTube, Activity } from "lucide-react";

interface SICTestResult {
  payeeName: string;
  classification: string;
  sicCode?: string;
  sicDescription?: string;
  confidence: number;
  reasoning: string;
  testMethod: string;
  timestamp: Date;
  error?: string;
}

const SICCodeTester = () => {
  const { toast } = useToast();
  const [testPayee, setTestPayee] = useState('');
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [isTestingDatabase, setIsTestingDatabase] = useState(false);
  const [isTestingExport, setIsTestingExport] = useState(false);
  const [testResults, setTestResults] = useState<SICTestResult[]>([]);
  const [databaseStats, setDatabaseStats] = useState<any>(null);
  const [exportStats, setExportStats] = useState<any>(null);

  // Sample business names for testing
  const sampleBusinesses = [
    'McDonald\'s Corporation',
    'Apple Inc',
    'Johnson & Johnson',
    'Goldman Sachs',
    'Microsoft Corporation',
    'Tesla Motors',
    'Walmart Inc',
    'Amazon Web Services',
    'John Smith MD',
    'Local Pizza Shop'
  ];

  const testSingleClassification = async (payeeName: string, method: 'standard' | 'enhanced') => {
    setIsTestingOpenAI(true);
    try {
      console.log(`[SIC TESTER] Testing ${method} classification for "${payeeName}"`);
      
      const result = method === 'enhanced' 
        ? await enhancedClassifyPayeeWithAI(payeeName)
        : await classifyPayeeWithAI(payeeName);

      const testResult: SICTestResult = {
        payeeName,
        classification: result.classification,
        sicCode: result.sicCode,
        sicDescription: result.sicDescription,
        confidence: result.confidence,
        reasoning: result.reasoning,
        testMethod: method,
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev]);

      // Log detailed results
      console.log(`[SIC TESTER] ${method} result:`, {
        classification: result.classification,
        sicCode: result.sicCode,
        sicDescription: result.sicDescription,
        hasSicCode: !!result.sicCode
      });

      if (result.classification === 'Business' && !result.sicCode) {
        toast({
          title: "SIC Code Missing",
          description: `Business "${payeeName}" classified but no SIC code assigned`,
          variant: "destructive",
        });
      } else if (result.classification === 'Business' && result.sicCode) {
        toast({
          title: "SIC Code Success",
          description: `Business "${payeeName}" assigned SIC ${result.sicCode}`,
        });
      }

    } catch (error) {
      console.error(`[SIC TESTER] ${method} classification failed:`, error);
      const errorResult: SICTestResult = {
        payeeName,
        classification: 'Error',
        confidence: 0,
        reasoning: 'Classification failed',
        testMethod: method,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setTestResults(prev => [errorResult, ...prev]);
      
      toast({
        title: "Classification Failed",
        description: `Failed to classify "${payeeName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingOpenAI(false);
    }
  };

  const testDatabaseSICCodes = async () => {
    setIsTestingDatabase(true);
    try {
      console.log('[SIC TESTER] Testing database SIC code storage and retrieval');
      
      const allResults = await loadAllClassificationResults();
      const businessResults = allResults.filter(r => r.result.classification === 'Business');
      const sicResults = allResults.filter(r => r.result.sicCode);
      
      const stats = {
        totalResults: allResults.length,
        businessCount: businessResults.length,
        sicCodeCount: sicResults.length,
        sicCoverage: businessResults.length > 0 ? Math.round((sicResults.length / businessResults.length) * 100) : 0,
        sampleSicCodes: sicResults.slice(0, 5).map(r => ({
          payee: r.payeeName,
          sicCode: r.result.sicCode,
          sicDescription: r.result.sicDescription
        }))
      };

      setDatabaseStats(stats);
      
      console.log('[SIC TESTER] Database SIC statistics:', stats);
      
      toast({
        title: "Database Test Complete",
        description: `Found ${stats.sicCodeCount} SIC codes in ${stats.businessCount} businesses (${stats.sicCoverage}% coverage)`,
      });

    } catch (error) {
      console.error('[SIC TESTER] Database test failed:', error);
      toast({
        title: "Database Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsTestingDatabase(false);
    }
  };

  const testExportSICCodes = async () => {
    setIsTestingExport(true);
    try {
      console.log('[SIC TESTER] Testing SIC code export functionality');
      
      // Load results and create mock batch result
      const allResults = await loadAllClassificationResults();
      if (allResults.length === 0) {
        toast({
          title: "No Data to Export",
          description: "No classification results found in database for export testing",
          variant: "destructive",
        });
        return;
      }

      const mockBatchResult: BatchProcessingResult = {
        results: allResults.slice(0, 10), // Test with first 10 results
        successCount: allResults.length,
        failureCount: 0,
        originalFileData: allResults.map(r => r.originalData || { payeeName: r.payeeName })
      };

      // Test comprehensive SIC pipeline
      await testSicCodePipeline(mockBatchResult);

      // Test CSV export
      const csvData = await exportDirectCSV(mockBatchResult);
      const sicColumnIndex = csvData.headers.indexOf('sicCode');
      const sicCount = sicColumnIndex >= 0 
        ? csvData.rows.filter(row => row[sicColumnIndex] && row[sicColumnIndex] !== '').length 
        : 0;

      const exportStats = {
        totalRows: csvData.rows.length,
        totalHeaders: csvData.headers.length,
        sicColumnPresent: sicColumnIndex >= 0,
        sicColumnIndex,
        sicCount,
        sicCoverage: csvData.rows.length > 0 ? Math.round((sicCount / csvData.rows.length) * 100) : 0,
        sampleHeaders: csvData.headers.slice(0, 10),
        sampleSicCodes: csvData.rows
          .filter(row => row[sicColumnIndex] && row[sicColumnIndex] !== '')
          .slice(0, 5)
          .map(row => ({
            sicCode: row[sicColumnIndex],
            sicDescription: row[csvData.headers.indexOf('sicDescription')] || 'N/A'
          }))
      };

      setExportStats(exportStats);
      
      console.log('[SIC TESTER] Export SIC statistics:', exportStats);
      
      toast({
        title: "Export Test Complete",
        description: `Export contains ${sicCount} SIC codes in ${csvData.rows.length} rows (${exportStats.sicCoverage}% coverage)`,
      });

    } catch (error) {
      console.error('[SIC TESTER] Export test failed:', error);
      toast({
        title: "Export Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsTestingExport(false);
    }
  };

  const testAllSamples = async () => {
    for (const business of sampleBusinesses.slice(0, 3)) { // Test first 3 to avoid rate limits
      await testSingleClassification(business, 'enhanced');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            SIC Code Testing & Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="single">Single Test</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter payee name to test (e.g., 'Apple Inc')"
                  value={testPayee}
                  onChange={(e) => setTestPayee(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => testSingleClassification(testPayee, 'standard')}
                  disabled={!testPayee.trim() || isTestingOpenAI}
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Standard
                </Button>
                <Button
                  onClick={() => testSingleClassification(testPayee, 'enhanced')}
                  disabled={!testPayee.trim() || isTestingOpenAI}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Enhanced
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Sample Business Names:</h4>
                <div className="flex flex-wrap gap-2">
                  {sampleBusinesses.map((business, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setTestPayee(business)}
                    >
                      {business}
                    </Badge>
                  ))}
                </div>
                <Button
                  onClick={testAllSamples}
                  disabled={isTestingOpenAI}
                  variant="outline"
                  className="w-full"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Test Sample Businesses
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="database" className="space-y-4">
              <Button
                onClick={testDatabaseSICCodes}
                disabled={isTestingDatabase}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                {isTestingDatabase ? 'Testing Database...' : 'Test Database SIC Codes'}
              </Button>

              {databaseStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Database SIC Code Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Results</p>
                        <p className="text-2xl font-bold">{databaseStats.totalResults}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Business Count</p>
                        <p className="text-2xl font-bold">{databaseStats.businessCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">SIC Codes</p>
                        <p className="text-2xl font-bold">{databaseStats.sicCodeCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">SIC Coverage</p>
                        <p className="text-2xl font-bold">{databaseStats.sicCoverage}%</p>
                      </div>
                    </div>
                    {databaseStats.sampleSicCodes.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Sample SIC Codes:</p>
                        <div className="space-y-1">
                          {databaseStats.sampleSicCodes.map((sample: any, index: number) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{sample.payee}</span>: {sample.sicCode} - {sample.sicDescription}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <Button
                onClick={testExportSICCodes}
                disabled={isTestingExport}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {isTestingExport ? 'Testing Export...' : 'Test Export SIC Codes'}
              </Button>

              {exportStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Export SIC Code Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                        <p className="text-2xl font-bold">{exportStats.totalRows}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">SIC Column Present</p>
                        <p className="text-2xl font-bold">{exportStats.sicColumnPresent ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">SIC Codes</p>
                        <p className="text-2xl font-bold">{exportStats.sicCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">SIC Coverage</p>
                        <p className="text-2xl font-bold">{exportStats.sicCoverage}%</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Headers: {exportStats.sampleHeaders.join(', ')}</p>
                    </div>
                    {exportStats.sampleSicCodes.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Sample Export SIC Codes:</p>
                        <div className="space-y-1">
                          {exportStats.sampleSicCodes.map((sample: any, index: number) => (
                            <div key={index} className="text-sm">
                              {sample.sicCode} - {sample.sicDescription}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Test Results ({testResults.length})</h4>
                {testResults.length === 0 ? (
                  <p className="text-muted-foreground">No test results yet. Run some tests to see results here.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{result.payeeName}</p>
                              <p className="text-sm text-muted-foreground">
                                {result.testMethod} • {result.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            <Badge variant={result.classification === 'Business' ? 'default' : 'secondary'}>
                              {result.classification}
                            </Badge>
                          </div>
                          {result.error ? (
                            <p className="text-sm text-destructive">{result.error}</p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-sm"><strong>Confidence:</strong> {result.confidence}%</p>
                              {result.sicCode && (
                                <p className="text-sm"><strong>SIC Code:</strong> {result.sicCode}</p>
                              )}
                              {result.sicDescription && (
                                <p className="text-sm"><strong>SIC Description:</strong> {result.sicDescription}</p>
                              )}
                              <p className="text-sm text-muted-foreground">{result.reasoning}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SICCodeTester;

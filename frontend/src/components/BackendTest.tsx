import { useState } from 'react';
import { Button } from '@/components/ui/button';

const BackendTest = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);
    
    const tests = [
      { name: 'Health Check', url: 'http://localhost:8000/health' },
      { name: 'Root Endpoint', url: 'http://localhost:8000/' },
      { name: 'Datasets API', url: 'http://localhost:8000/api/datasets/' },
      { name: 'Training Jobs API', url: 'http://localhost:8000/api/training/jobs' }
    ];

    for (const test of tests) {
      try {
        const response = await fetch(test.url);
        const data = await response.json();
        setTestResults(prev => [...prev, `✅ ${test.name}: ${response.status} - ${JSON.stringify(data).substring(0, 100)}...`]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setTestResults(prev => [...prev, `❌ ${test.name}: ${errorMessage}`]);
      }
    }
    
    setTesting(false);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Backend Connection Test</h3>
      <Button onClick={runTests} disabled={testing} className="mb-4">
        {testing ? 'Testing...' : 'Run Tests'}
      </Button>
      <div className="space-y-2">
        {testResults.map((result, index) => (
          <div key={index} className="text-sm font-mono">
            {result}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackendTest;




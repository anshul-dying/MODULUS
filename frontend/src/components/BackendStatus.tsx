import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '@/services/api';

interface BackendStatusProps {
  className?: string;
}

const BackendStatus = ({ className = "" }: BackendStatusProps) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkBackendStatus = async () => {
    try {
      setStatus('checking');
      const response = await api.get('/health', { timeout: 5000 });
      if (response.status === 200) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setStatus('offline');
    } finally {
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Backend Online';
      case 'offline':
        return 'Backend Offline';
      case 'checking':
        return 'Checking...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'checking':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={checkBackendStatus}
        disabled={status === 'checking'}
        className="h-6 px-2"
      >
        <RefreshCw className={`h-3 w-3 ${status === 'checking' ? 'animate-spin' : ''}`} />
      </Button>
      {lastCheck && (
        <span className="text-xs text-muted-foreground">
          Last check: {lastCheck.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default BackendStatus;

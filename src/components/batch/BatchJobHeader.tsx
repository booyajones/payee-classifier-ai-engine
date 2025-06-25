
import React from 'react';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Clock } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface BatchJobHeaderProps {
  job: BatchJob;
  payeeRowData?: PayeeRowData;
}

const BatchJobHeader = ({
  job,
  payeeRowData
}: BatchJobHeaderProps) => {
  const payeeCount = payeeRowData?.payees?.length || 0;
  const isCompleted = job.status === 'completed';
  
  const getElapsedTime = () => {
    const createdAt = new Date(job.created_at * 1000);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffMinutes / 1440)}d`;
    }
  };

  return (
    <div className="space-y-1 flex-1">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        Job {job.id.slice(-8)}
        {isCompleted && <Badge variant="outline" className="text-green-600 border-green-300">Completed</Badge>}
        <Badge variant="outline" className="text-gray-600 border-gray-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {getElapsedTime()}
        </Badge>
      </CardTitle>
      <CardDescription className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {payeeCount} payees
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(job.created_at * 1000).toLocaleString()}
        </span>
      </CardDescription>
    </div>
  );
};

export default BatchJobHeader;

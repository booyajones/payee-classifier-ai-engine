import React from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

export const TableSkeleton = ({ rows = 5, columns = 4, className }: {
  rows?: number;
  columns?: number;
  className?: string;
}) => (
  <div className={cn("space-y-3", className)}>
    {/* Table header skeleton */}
    <div className="flex space-x-4 pb-2 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    
    {/* Table rows skeleton */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-10 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("p-6 border rounded-lg space-y-4", className)}>
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <div className="flex justify-between items-center pt-4">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const JobCardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("p-4 border rounded-lg space-y-3", className)}>
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
    
    <div className="space-y-2">
      <Skeleton className="h-2 w-full" />
      <div className="flex justify-between text-sm">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
  </div>
);

export const UploadSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-6", className)}>
    <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
      <Skeleton className="h-12 w-12 mx-auto rounded-full" />
      <Skeleton className="h-6 w-1/2 mx-auto" />
      <Skeleton className="h-4 w-2/3 mx-auto" />
      <Skeleton className="h-10 w-32 mx-auto" />
    </div>
    
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/4" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </div>
  </div>
);

export default {
  Table: TableSkeleton,
  Card: CardSkeleton,
  JobCard: JobCardSkeleton,
  Upload: UploadSkeleton,
};
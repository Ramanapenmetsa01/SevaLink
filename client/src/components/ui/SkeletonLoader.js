import React from 'react';
import { motion } from 'framer-motion';

// Base skeleton component
const Skeleton = ({ className = '', width = 'w-full', height = 'h-4' }) => (
  <motion.div
    animate={{
      opacity: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className={`bg-gray-300 rounded ${width} ${height} ${className}`}
  />
);

// Card skeleton for complaints/requests
export const CardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
    <div className="flex justify-between items-start">
      <div className="flex-1 space-y-2">
        <Skeleton width="w-3/4" height="h-5" />
        <Skeleton width="w-full" height="h-4" />
        <Skeleton width="w-5/6" height="h-4" />
      </div>
      <Skeleton width="w-16" height="h-6" className="rounded-full" />
    </div>
    
    <div className="flex items-center space-x-4 pt-2">
      <Skeleton width="w-4" height="h-4" />
      <Skeleton width="w-24" height="h-4" />
    </div>
    
    <div className="flex items-center space-x-4">
      <Skeleton width="w-4" height="h-4" />
      <Skeleton width="w-32" height="h-4" />
    </div>
  </div>
);

// Grid skeleton for multiple cards
export const CardGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <CardSkeleton key={index} />
    ))}
  </div>
);

// Dashboard stats skeleton
export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width="w-20" height="h-4" className="bg-gray-400" />
            <Skeleton width="w-16" height="h-8" className="bg-gray-300" />
          </div>
          <Skeleton width="w-12" height="h-12" className="bg-gray-400 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

// List item skeleton
export const ListItemSkeleton = () => (
  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
    <div className="flex items-center space-x-4 flex-1">
      <Skeleton width="w-6" height="h-6" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-3/4" height="h-4" />
        <Skeleton width="w-1/2" height="h-3" />
      </div>
    </div>
    <Skeleton width="w-16" height="h-6" className="rounded-full" />
  </div>
);

// List skeleton
export const ListSkeleton = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <ListItemSkeleton key={index} />
    ))}
  </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8">
    <div className="flex items-center space-x-6 mb-8">
      <Skeleton width="w-20" height="h-20" className="bg-gray-400 rounded-full" />
      <div className="space-y-2">
        <Skeleton width="w-32" height="h-6" className="bg-gray-300" />
        <Skeleton width="w-24" height="h-4" className="bg-gray-400" />
        <Skeleton width="w-28" height="h-4" className="bg-gray-400" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-4 bg-white/10 rounded-lg border border-white/20">
          <Skeleton width="w-5" height="h-5" className="bg-gray-400" />
          <div className="space-y-2 flex-1">
            <Skeleton width="w-20" height="h-3" className="bg-gray-400" />
            <Skeleton width="w-3/4" height="h-4" className="bg-gray-300" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} width="w-24" height="h-4" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width="w-24" height="h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Form skeleton
export const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton width="w-20" height="h-4" />
          <Skeleton width="w-full" height="h-10" className="rounded-lg" />
        </div>
      ))}
    </div>
    
    <div className="space-y-2">
      <Skeleton width="w-24" height="h-4" />
      <Skeleton width="w-full" height="h-24" className="rounded-lg" />
    </div>
    
    <div className="flex justify-end space-x-4 pt-6">
      <Skeleton width="w-20" height="h-10" className="rounded-lg" />
      <Skeleton width="w-28" height="h-10" className="rounded-lg" />
    </div>
  </div>
);

export default Skeleton;

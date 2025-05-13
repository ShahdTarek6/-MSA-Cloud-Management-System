import React from 'react';
import { ActionsBar } from './CommonComponents';

export function DiskCard({ disk, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{disk.name}</h3>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Format:</span> {disk.format}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Size:</span> {disk.size} GB
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Type:</span> {disk.type}
            </p>
          </div>
        </div>
        <ActionsBar
          onEdit={() => onEdit(disk)}
          onDelete={() => onDelete(disk)}
        />
      </div>
    </div>
  );
}

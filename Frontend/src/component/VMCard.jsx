import React from 'react';
import { ActionsBar } from './CommonComponents';

export function VMCard({ vm, onEdit, onStart, onStop, onDelete }) {
  return (
    <div className="w-full bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{vm.name}</h3>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Status:</span>{' '}
              <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                vm.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {vm.status || 'stopped'}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">CPU:</span> {vm.cpu} Cores
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Memory:</span> {vm.memory} MB
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Disk:</span> {vm.diskName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Format:</span> {vm.format}
            </p>
          </div>
        </div>
        <ActionsBar
          onEdit={() => onEdit(vm)}
          onStart={() => onStart(vm.name)}
          onStop={() => onStop(vm.name)}
          onDelete={() => onDelete(vm)}
          status={vm.status}
        />
      </div>
    </div>
  );
}

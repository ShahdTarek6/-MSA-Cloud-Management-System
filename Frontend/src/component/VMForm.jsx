import React from 'react';
import Modal from './Modal';
import Button from './Button';
import FormInput from './FormInput';
import Select from './Select';

export function CreateVMForm({ formData, diskList, isoFiles, onSubmit, onCancel, isUploading, uploadStatus, uploadError, handleChange, handleISOUpload, isLoading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormInput
        label="VM Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="CPU Cores"
          name="cpu"
          type="number"
          value={formData.cpu}
          onChange={handleChange}
          min="1"
          required
        />
        <FormInput
          label="Memory (MB)"
          name="memory"
          type="number"
          value={formData.memory}
          onChange={handleChange}
          min="512"
          required
        />
      </div>

      <Select
        label="Virtual Disk"
        name="diskName"
        value={formData.diskName}
        onChange={(e) => {
          const value = e.target.value;
          const selectedDisk = diskList.find(disk => disk.name === value);
          handleChange({
            target: {
              name: 'diskName',
              value
            }
          });
          if (selectedDisk) {
            handleChange({
              target: {
                name: 'format',
                value: selectedDisk.format
              }
            });
          }
        }}
        options={[
          { value: '', label: 'Select a disk' },
          ...diskList.map(disk => ({
            value: disk.name,
            label: `${disk.name} (${disk.format} - ${disk.size}GB)`
          }))
        ]}
        required
      />

      {/* ISO Image Section */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">ISO Image</h3>
          <span className="text-xs text-gray-500">Optional</span>
        </div>

        <div className="space-y-4">
          {/* Select existing ISO */}
          <Select
            label="Select Existing ISO"
            name="iso"
            value={formData.iso}
            onChange={(e) => handleChange({
              target: {
                name: 'iso',
                value: e.target.value
              }
            })}
            options={[
              { value: '', label: 'Select an ISO image' },
              ...isoFiles.map(iso => ({
                value: iso,
                label: iso
              }))
            ]}
          />

          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-gray-50 text-sm text-gray-500">Or upload new ISO</span>
            </div>
          </div>

          <label
            htmlFor="isoFile"
            className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isUploading ? 'bg-gray-50 border-gray-300' : 'hover:bg-gray-50 border-gray-300 hover:border-blue-500'}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <svg className="w-8 h-8 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">.iso files only</p>
                </>
              )}
            </div>
            <input
              type="file"
              id="isoFile"
              accept=".iso"
              className="hidden"
              disabled={isUploading}
              onChange={handleISOUpload}
            />
          </label>
          
          {uploadStatus && (
            <p className="text-sm text-green-600">{uploadStatus}</p>
          )}
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading || isUploading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isLoading || isUploading}>
          Create VM
        </Button>
      </div>
    </form>
  );
}

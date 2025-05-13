import React, { useState, useEffect } from 'react';
import Button from './Button';
import FormInput from './FormInput';
import Select from './Select';

export function DiskForm({ disk, onSubmit, onCancel, isLoading, isEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    format: 'qcow2',
    type: 'dynamic',
    size: ''
  });

  useEffect(() => {
    if (disk) {
      setFormData(disk);
    }
  }, [disk]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormInput
        label="Disk Name"
        name="name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        required
        disabled={isEdit}
      />

      {isEdit ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">Format</label>
          <p className="mt-1 text-sm text-gray-600">{formData.format}</p>
        </div>
      ) : (
        <Select
          label="Disk Format"
          name="format"
          value={formData.format}
          onChange={(value) => handleChange('format', value)}
          options={[
            { value: 'qcow2', label: 'QCOW2' },
            { value: 'vpc', label: 'VPC' },
            { value: 'vmdk', label: 'VMDK' },
            { value: 'raw', label: 'Raw' }
          ]}
          required
        />
      )}

      <Select
        label="Type"
        name="type"
        value={formData.type}
        onChange={(value) => handleChange('type', value)}
        options={[
          { value: 'dynamic', label: 'Dynamic' },
          { value: 'fixed', label: 'Fixed' }
        ]}
        required
      />

      <FormInput
        label="Disk Size"
        name="size"
        value={formData.size}
        onChange={(e) => handleChange('size', e.target.value)}
        placeholder="ex: 1G, 500M"
        required
      />

      <div className="flex justify-end space-x-4 mt-6">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isLoading}>
          {isEdit ? 'Save Changes' : 'Create Disk'}
        </Button>
      </div>
    </form>
  );
}

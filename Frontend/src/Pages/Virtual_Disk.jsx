import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../component/Modal';
import Button from '../component/Button';
import FormInput from '../component/FormInput';
import Select from '../component/Select';

function VirtualDisk() {
  const [diskList, setDiskList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editDisk, setEditDisk] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [diskData, setDiskData] = useState({
    name: '',
    size: '',
    format: 'qcow2',
    type: 'dynamic',
  });

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/qemu/disks/list');
      setDiskList(response.data);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error fetching disks', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (name, value) => {
    setDiskData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post('http://localhost:3000/api/qemu/disks/create', diskData);
      showNotification('Virtual Disk created successfully!');
      setShowForm(false);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error creating disk', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.put(`http://localhost:3000/api/qemu/disks/update/${editDisk.name}`, editDisk);
      showNotification('Virtual Disk updated successfully!');
      setEditDisk(null);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error updating disk', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDisk = async (filename, format) => {
    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:3000/api/qemu/disks/delete/${filename}.${format}`);
      showNotification('Virtual Disk deleted successfully!');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error deleting disk', 'error');
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white transition-all transform duration-300 ease-in-out z-50`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Virtual Disks</h1>
          <Button
            variant="primary"
            onClick={() => setShowForm(true)}
            disabled={isLoading}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Create Virtual Disk
            </span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {diskList.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Virtual Disks</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new virtual disk.</p>
              </div>
            ) : (
              diskList.map((disk, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200"
                >
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
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => setEditDisk(disk)}
                        title="Edit Disk"
                        className="p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDeleteConfirm(disk)}
                        title="Delete Disk"
                        className="p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create Disk Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Create Virtual Disk"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput
              label="Disk Name"
              name="name"
              value={diskData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />

            <Select
              label="Disk Format"
              name="format"
              value={diskData.format}
              onChange={(value) => handleChange('format', value)}
              options={[
                { value: 'qcow2', label: 'QCOW2' },
                { value: 'vpc', label: 'VPC' },
                { value: 'vmdk', label: 'VMDK' },
                { value: 'raw', label: 'Raw' }
              ]}
              required
            />

            <Select
              label="Type"
              name="type"
              value={diskData.type}
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
              value={diskData.size}
              onChange={(e) => handleChange('size', e.target.value)}
              placeholder="ex: 1G, 500M"
              required
            />

            <div className="flex justify-end space-x-4 mt-6">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isLoading}>
                Create Disk
              </Button>
            </div>
          </form>
        </Modal>        {/* Edit Disk Modal */}
        <Modal
          isOpen={!!editDisk}
          onClose={() => setEditDisk(null)}
          title="Edit Virtual Disk"
        >
          {editDisk ? (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <FormInput
                label="Disk Name"
                value={editDisk.name}
                disabled
              />

              <div className="flex flex-col space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Format</label>
                  <p className="mt-1 text-sm text-gray-600">{editDisk.format}</p>
                </div>

                <FormInput
                  label="Size"
                  value={editDisk.size}
                  onChange={(e) => setEditDisk({...editDisk, size: e.target.value})}
                  placeholder="ex: 1G, 500M"
                  required
                />

                <Select
                  label="Type"
                  value={editDisk.type}
                  onChange={(value) => setEditDisk({...editDisk, type: value})}
                  options={[
                    { value: 'dynamic', label: 'Dynamic' },
                    { value: 'fixed', label: 'Fixed' }
                  ]}
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button variant="secondary" onClick={() => setEditDisk(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          ) : null}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Virtual Disk"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete the virtual disk "{deleteConfirm?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteDisk(deleteConfirm.name, deleteConfirm.format)}
                disabled={isLoading}
              >
                Delete Disk
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default VirtualDisk;

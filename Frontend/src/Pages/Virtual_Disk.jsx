import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../component/Modal';
import Button from '../component/Button';
import { LoadingSpinner, EmptyState, PageHeader } from '../component/CommonComponents';
import Notification from '../component/Notification';
import { DiskCard } from '../component/DiskCard';
import { DiskForm } from '../component/DiskForm';

function VirtualDisk() {
  const [diskList, setDiskList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editDisk, setEditDisk] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

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

  const handleSubmit = async (diskData) => {
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

  const handleEditSubmit = async (updatedDisk) => {
    setIsLoading(true);
    try {
      // Use the original disk's name and format for the URL
      const oldFilename = editDisk.name + '.' + editDisk.format;
      await axios.put(`http://localhost:3000/api/qemu/disks/update/${oldFilename}`, updatedDisk);
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
      <Notification {...notification} />

      <div className="max-w-7xl mx-auto">
        <PageHeader 
          title="Virtual Disks"
          action={(
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
          )}
        />

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-6">
            {diskList.length === 0 ? (
              <EmptyState
                title="No Virtual Disks"
                description="Get started by creating a new virtual disk."
                icon="disk"
              />
            ) : (
              diskList.map((disk, index) => (
                <DiskCard
                  key={index}
                  disk={disk}
                  onEdit={() => setEditDisk(disk)}
                  onDelete={() => setDeleteConfirm(disk)}
                />
              ))
            )}
          </div>
        )}

        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Create Virtual Disk"
        >
          <DiskForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={isLoading}
          />
        </Modal>

        <Modal
          isOpen={!!editDisk}
          onClose={() => setEditDisk(null)}
          title="Edit Virtual Disk"
        >
          {editDisk && (
            <DiskForm
              disk={editDisk}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditDisk(null)}
              isLoading={isLoading}
              isEdit
            />
          )}
        </Modal>

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

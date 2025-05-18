import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { LoadingSpinner, EmptyState, PageHeader } from '../component/CommonComponents';
import { VMCard } from '../component/VMCard';
import Modal from '../component/Modal';
import { CreateVMForm } from '../component/VMForm';
import Button from '../component/Button';
import Notification from '../component/Notification';
import FormInput from '../component/FormInput';

function VirtualMachine() {
  const [vmList, setVmList] = useState([]);
  const [diskList, setDiskList] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    cpu: 1,
    memory: 1024,
    diskName: '',
    format: 'qcow2',
    iso: '',
  });

  const [isoFiles, setIsoFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [editVM, setEditVM] = useState(null);
  const [originalEditVM, setOriginalEditVM] = useState(null); // Track original VM data for editing

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/qemu/vms/list');
      setVmList(response.data);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error fetching VMs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchIsoFiles = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/qemu/iso/list');
      setIsoFiles(response.data);
      if (response.data.length > 0) {
        console.log('Available ISO files:', response.data);
      }
    } catch (error) {
      console.error('Error fetching ISO files:', error);
    }
  };

  const fetchDisks = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/qemu/disks/list');
      setDiskList(response.data);
    } catch (error) {
      console.error('Error fetching disks:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchIsoFiles();
    fetchDisks();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post('http://localhost:3000/api/qemu/vms/create', formData);
      showNotification('Virtual Machine created successfully!');
      setShowForm(false);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error creating VM', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteVm = async (name) => {
    if (!name) return;
    
    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:3000/api/qemu/vms/delete/${name}`);
      showNotification('Virtual Machine deleted successfully!');
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error deleting VM', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startVM = async (name) => {
    setIsLoading(true);
    try {
      await axios.post(`http://localhost:3000/api/qemu/vms/start/${name}`);
      showNotification('Virtual Machine started successfully!');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error starting VM', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const stopVM = async (name) => {
    setIsLoading(true);
    try {
      await axios.post(`http://localhost:3000/api/qemu/vms/stop/${name}`);
      showNotification('Virtual Machine stopped successfully!');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error stopping VM', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleISOUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setUploadStatus('Uploading...');

    const formData = new FormData();
    formData.append('iso', file);

    try {
      await axios.post('http://localhost:3000/api/qemu/iso/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      setUploadStatus('Upload successful!');
      // Refresh ISO files list
      await fetchIsoFiles();
      // Set the uploaded file as the selected ISO
      handleChange({
        target: {
          name: 'iso',
          value: file.name
        }
      });
    } catch (error) {
      setUploadError(error.response?.data?.error || 'Error uploading ISO file');
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Use the original VM's name for the URL, not the possibly changed name in editVM
      const oldVmName = originalEditVM?.name || editVM.name;
      await axios.put(`http://localhost:3000/api/qemu/vms/edit/${oldVmName}`, editVM);
      showNotification('Virtual Machine updated successfully!');
      setEditVM(null);
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error updating VM', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Notification {...notification} />

      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Virtual Machines"
          action={
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
              disabled={isLoading}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Virtual Machine
              </span>
            </Button>
          }
        />

        <div className="w-full">
          {isLoading ? (
            <LoadingSpinner />
          ) : vmList.length === 0 ? (
            <EmptyState
              title="No Virtual Machines"
              description="Get started by creating a new virtual machine."
              icon="vm"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {vmList.map((vm, index) => (
                <VMCard
                  key={vm.name || index}
                  vm={vm}
                  onEdit={(vmData) => {
                    setEditVM(vmData);
                    setOriginalEditVM(vmData); // Set original VM data when editing starts
                  }}
                  onStart={startVM}
                  onStop={stopVM}
                  onDelete={setDeleteConfirm}
                />
              ))}
            </div>
          )}
        </div>

        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Create Virtual Machine"
        >
          <CreateVMForm
            formData={formData}
            diskList={diskList}
            isoFiles={isoFiles}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isUploading={isUploading}
            uploadStatus={uploadStatus}
            uploadError={uploadError}
            handleChange={handleChange}
            handleISOUpload={handleISOUpload}
            isLoading={isLoading}
          />
        </Modal>

        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Virtual Machine"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete the virtual machine "{deleteConfirm?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteVm(deleteConfirm.name)}
                disabled={isLoading}
              >
                Delete VM
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={!!editVM}
          onClose={() => setEditVM(null)}
          title="Edit Virtual Machine"
        >
          {editVM && (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <FormInput
                label="VM Name"
                value={editVM.name}
                onChange={e => setEditVM({ ...editVM, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="CPU Cores"
                  type="number"
                  value={editVM.cpu}
                  onChange={(e) => setEditVM({...editVM, cpu: parseInt(e.target.value)})}
                  min="1"
                  required
                />
                <FormInput
                  label="Memory (MB)"
                  type="number"
                  value={editVM.memory}
                  onChange={(e) => setEditVM({...editVM, memory: parseInt(e.target.value)})}
                  min="512"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <Button variant="secondary" onClick={() => setEditVM(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default VirtualMachine;
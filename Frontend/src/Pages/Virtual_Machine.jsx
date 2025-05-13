import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SideBar from '../component/SideBar';

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

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const fetchData = React.useCallback(async () => {
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
    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:3000/api/qemu/vms/delete/${name}`);
      showNotification('Virtual Machine deleted successfully!');
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error deleting VM', 'error');
    } finally {
      setIsLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleISOUpload = async (file) => {
    setIsUploading(true);
    setUploadStatus('Uploading...');
    setUploadError('');

    const formData = new FormData();
    formData.append('iso', file);

    try {
      await axios.post('http://localhost:3000/api/qemu/iso/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadStatus('Upload successful!');
      await fetchIsoFiles();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to upload ISO file';
      setUploadError(errorMsg);
      console.error('Error uploading ISO:', error);
    } finally {
      setIsUploading(false);
      // Clear status after 3 seconds
      setTimeout(() => {
        setUploadStatus('');
        setUploadError('');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white transition-all transform duration-300 ease-in-out`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Virtual Machines</h1>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
            onClick={() => setShowForm(true)}
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Virtual Machine
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* VM Grid */}
            {vmList.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Virtual Machines</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new virtual machine.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vmList.map((vm, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-6 border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{vm.name}</h3>
                        <div className="mt-4 space-y-2">
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
                      <button
                        onClick={() => setDeleteConfirm(vm.name)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete VM"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create VM Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Create Virtual Machine</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">VM Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter VM name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cpu" className="block text-sm font-medium text-gray-700">CPU Cores</label>
                        <input
                          type="number"
                          id="cpu"
                          name="cpu"
                          value={formData.cpu}
                          onChange={handleChange}
                          min="1"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="memory" className="block text-sm font-medium text-gray-700">Memory (MB)</label>
                        <input
                          type="number"
                          id="memory"
                          name="memory"
                          value={formData.memory}
                          onChange={handleChange}
                          min="512"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Virtual Disk Selection */}
                    <div>
                      <label htmlFor="diskName" className="block text-sm font-medium text-gray-700">Virtual Disk</label>
                      <select
                        id="diskName"
                        name="diskName"
                        value={formData.diskName}
                        onChange={(e) => {
                          const selectedDisk = diskList.find(disk => disk.name === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            diskName: e.target.value,
                            format: selectedDisk ? selectedDisk.format : prev.format
                          }));
                        }}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a disk</option>
                        {diskList.map((disk, index) => (
                          <option key={index} value={disk.name}>
                            {disk.name} ({disk.format} - {disk.size}GB)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ISO Image Section */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-900">ISO Image</h3>
                        <span className="text-xs text-gray-500">Optional</span>
                      </div>

                      {/* Upload Area */}
                      <div className="space-y-4">
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
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleISOUpload(e.target.files[0]);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>

                        {/* Upload Status */}
                        {(uploadStatus || uploadError) && (
                          <div className={`text-sm ${uploadError ? 'text-red-600' : 'text-green-600'} flex items-center gap-2`}>
                            {uploadError ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {uploadError || uploadStatus}
                          </div>
                        )}

                        {/* ISO Selection */}
                        <div>
                          <select
                            id="iso"
                            name="iso"
                            value={formData.iso}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">No ISO</option>
                            {isoFiles.map((iso, index) => (
                              <option key={index} value={iso}>{iso}</option>
                            ))}
                          </select>
                          {isoFiles.length === 0 && (
                            <p className="mt-2 text-sm text-gray-500">
                              No ISO files available. Upload one using the form above.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create VM
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete the virtual machine "{deleteConfirm}"? This action cannot be undone.</p>
              <div className="flex justify-end space-x-4">
                <button
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                  onClick={() => deleteVm(deleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VirtualMachine;
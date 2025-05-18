import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { FiPlay, FiSquare, FiPause, FiTrash2, FiPlus, FiRefreshCw, FiZap, FiSearch, FiBox, FiCpu, FiHardDrive, FiActivity } from 'react-icons/fi';
import RefreshButton from '../component/RefreshButton';

const API_URL = 'http://localhost:3000/api';

const Docker_Containers = () => {
    const [containers, setContainers] = useState([]);
    const [images, setImages] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [createForm, setCreateForm] = useState({
        Image: '',
        name: '',
        ExposedPorts: {},
        HostConfig: {
            PortBindings: {}
        },
        Cmd: [],          // Command to run
        Tty: true,        // Allocate a pseudo-TTY
        OpenStdin: true,  // Keep STDIN open
        StdinOnce: false, // Keep STDIN open even if not attached
        Env: [],          // Environment variables
    });

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    }, []);

    const fetchContainers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/docker/containers?all=true`);
            const data = await response.json();
            setContainers(data);
        } catch (error) {
            showNotification('Error fetching containers: ' + error.message, 'error');
        }
    }, [showNotification]);

    const fetchImages = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/docker/images`);
            const data = await response.json();
            setImages(data);
        } catch (error) {
            showNotification('Error fetching images: ' + error.message, 'error');
        }
    }, [showNotification]);

    useEffect(() => {
        fetchContainers();
        fetchImages();
        const interval = setInterval(() => {
            fetchContainers();
            fetchImages();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchContainers, fetchImages]);

    const handleContainerAction = async (id, action) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/containers/${id}/${action}`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error(`Failed to ${action} container`);
            showNotification(`Container ${action}ed successfully`);
            fetchContainers();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateContainer = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            
            // Format the command if provided
            let containerConfig = {...createForm};
            if (containerConfig.Cmd && typeof containerConfig.Cmd === 'string') {
                containerConfig.Cmd = containerConfig.Cmd.split(' ').filter(cmd => cmd.trim() !== '');
            }

            const response = await fetch(`${API_URL}/docker/containers?name=${createForm.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(containerConfig)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create container');
            }

            showNotification('Container created successfully');
            setIsCreateModalOpen(false);
            setCreateForm({
                Image: '',
                name: '',
                ExposedPorts: {},
                HostConfig: {
                    PortBindings: {}
                },
                Cmd: [],
                Tty: true,
                OpenStdin: true,
                StdinOnce: false,
                Env: [],
            });
            fetchContainers();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteContainer = async (id) => {
        if (!window.confirm('Are you sure you want to delete this container?')) return;
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/containers/${id}?force=true`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete container');
            showNotification('Container deleted successfully');
            fetchContainers();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter containers based on search term
    const filteredContainers = containers.filter(container => 
        container.Names[0].toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.Image.toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.State.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Add a helper function to format the container status
    const getStatusColor = (state) => {
        switch (state) {
            case 'running':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'paused':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'exited':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">Docker Containers</h1>
                    <RefreshButton onRefresh={fetchContainers} className="hover:rotate-180 transition-transform duration-500" />
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                >
                    <FiPlus className="text-lg" /> Create Container
                </Button>
            </div>

            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                    className="rounded-lg shadow-lg"
                />
            )}

            <div className="mb-8">
                <div className="relative max-w-2xl mx-auto">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                    <input
                        type="text"
                        placeholder="Search containers by name, image, or state..."
                        className="pl-12 pr-4 py-3 w-full border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-700 bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContainers.map(container => (
                    <div key={container.Id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                        <div className="p-6">
                            {/* Container Name and Status */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-xl text-gray-800 truncate">
                                        {container.Names[0].replace('/', '')}
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(container.State)}`}>
                                        {container.State}
                                    </span>
                                </div>
                            </div>

                            {/* Container Details */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiBox className="text-lg" />
                                    <p className="text-sm truncate">{container.Image}</p>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiHardDrive className="text-lg" />
                                    <p className="text-sm font-medium">{container.Id.substring(0, 12)}</p>
                                </div>
                                {container.Ports && container.Ports.length > 0 && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <FiActivity className="text-lg" />
                                        <div className="flex flex-wrap gap-2">
                                            {container.Ports.map((port, index) => (
                                                <span key={index} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">
                                                    {port.PublicPort}:{port.PrivatePort}/{port.Type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {/* Container Actions based on state */}
                                {['created', 'exited', 'dead'].includes(container.State) && (
                                    <Button
                                        onClick={() => handleContainerAction(container.Id, 'start')}
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                        disabled={isLoading}
                                    >
                                        <FiPlay className="text-lg" /> Start
                                    </Button>
                                )}

                                {container.State === 'running' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={() => handleContainerAction(container.Id, 'stop')}
                                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiSquare className="text-lg" /> Stop
                                        </Button>
                                        <Button
                                            onClick={() => handleContainerAction(container.Id, 'pause')}
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiPause className="text-lg" /> Pause
                                        </Button>
                                        <Button
                                            onClick={() => handleContainerAction(container.Id, 'restart')}
                                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiRefreshCw className="text-lg" /> Restart
                                        </Button>
                                        <Button
                                            onClick={() => handleContainerAction(container.Id, 'kill')}
                                            className="bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiZap className="text-lg" /> Kill
                                        </Button>
                                    </div>
                                )}

                                {container.State === 'paused' && (
                                    <Button
                                        onClick={() => handleContainerAction(container.Id, 'unpause')}
                                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                        disabled={isLoading}
                                    >
                                        <FiPlay className="text-lg" /> Unpause
                                    </Button>
                                )}

                                {/* Delete Button */}
                                <Button
                                    onClick={() => handleDeleteContainer(container.Id)}
                                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                    disabled={isLoading}
                                >
                                    <FiTrash2 className="text-lg" /> Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Container Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create Container"
            >
                <form onSubmit={handleCreateContainer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Image Name*
                        </label>
                        <select
                            value={createForm.Image}
                            onChange={(e) => setCreateForm({
                                ...createForm,
                                Image: e.target.value
                            })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select an image</option>
                            {images.map(image => (
                                image.RepoTags?.map(tag => (
                                    <option key={tag} value={tag}>
                                        {tag}
                                    </option>
                                ))
                            ))}
                        </select>
                    </div>

                    <FormInput
                        label="Container Name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({
                            ...createForm,
                            name: e.target.value
                        })}
                        placeholder="e.g., my-container"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Command (optional)
                        </label>
                        <input
                            type="text"
                            value={Array.isArray(createForm.Cmd) ? createForm.Cmd.join(' ') : createForm.Cmd || ''}
                            onChange={(e) => setCreateForm({
                                ...createForm,
                                Cmd: e.target.value
                            })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., tail -f /dev/null"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            Leave empty to use the default command from the image. For containers that need to keep running,
                            you can use commands like "tail -f /dev/null" or the specific service command.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Environment Variables (optional)
                        </label>
                        <textarea
                            value={Array.isArray(createForm.Env) ? createForm.Env.join('\n') : ''}
                            onChange={(e) => setCreateForm({
                                ...createForm,
                                Env: e.target.value.split('\n').filter(env => env.trim() !== '')
                            })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="KEY1=value1&#10;KEY2=value2"
                            rows={3}
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            Enter one environment variable per line in KEY=value format
                        </p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <FiPlus /> Create Container
                            </>
                        )}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default Docker_Containers;

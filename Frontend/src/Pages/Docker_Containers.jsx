import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { FiPlay, FiSquare, FiPause, FiTrash2, FiPlus, FiFileText } from 'react-icons/fi';
import RefreshButton from '../component/RefreshButton';

const API_URL = 'http://localhost:3000/api';

const Docker_Containers = () => {
    const [containers, setContainers] = useState([]);
    const [images, setImages] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState('');

    const [createForm, setCreateForm] = useState({
        Image: '',
        name: '',
        ExposedPorts: {},
        HostConfig: {
            PortBindings: {}
        }
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
            const response = await fetch(`${API_URL}/docker/containers?name=${createForm.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm)
            });
            if (!response.ok) throw new Error('Failed to create container');
            showNotification('Container created successfully');
            setIsCreateModalOpen(false);
            setCreateForm({
                Image: '',
                name: '',
                ExposedPorts: {},
                HostConfig: {
                    PortBindings: {}
                }
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

    const fetchContainerLogs = async (id) => {
        try {
            const response = await fetch(`${API_URL}/docker/containers/${id}/logs?stdout=true&stderr=true`);
            const text = await response.text();
            setLogs(text);
            setShowLogs(true);
        } catch (error) {
            showNotification('Error fetching logs: ' + error.message, 'error');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Docker Containers</h1>
                    <RefreshButton onRefresh={fetchContainers} />
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-green-500 text-white flex items-center gap-2"
                >
                    <FiPlus /> Create Container
                </Button>
            </div>

            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {containers.map(container => (
                    <div key={container.Id} className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="font-bold mb-2">
                            {container.Names[0].replace('/', '')}
                        </h3>
                        <p className="text-sm mb-2">Image: {container.Image}</p>
                        <p className="text-sm mb-2">
                            Status: <span className={`font-medium ${
                                container.State === 'running' ? 'text-green-600' :
                                container.State === 'paused' ? 'text-yellow-600' :
                                'text-red-600'
                            }`}>{container.State}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {/* Show Start button only when container is stopped/exited */}
                            {['created', 'exited', 'dead'].includes(container.State) && (
                                <Button
                                    onClick={() => handleContainerAction(container.Id, 'start')}
                                    className="flex-1 bg-green-500 text-white flex items-center justify-center gap-1"
                                >
                                    <FiPlay /> Start
                                </Button>
                            )}

                            {/* Show Stop and Pause buttons only when container is running */}
                            {container.State === 'running' && (
                                <>
                                    <Button
                                        onClick={() => handleContainerAction(container.Id, 'stop')}
                                        className="flex-1 bg-yellow-500 text-white flex items-center justify-center gap-1"
                                    >
                                        <FiSquare /> Stop
                                    </Button>
                                    <Button
                                        onClick={() => handleContainerAction(container.Id, 'pause')}
                                        className="flex-1 bg-blue-500 text-white flex items-center justify-center gap-1"
                                    >
                                        <FiPause /> Pause
                                    </Button>
                                </>
                            )}

                            {/* Show Unpause button only when container is paused */}
                            {container.State === 'paused' && (
                                <Button
                                    onClick={() => handleContainerAction(container.Id, 'unpause')}
                                    className="flex-1 bg-blue-500 text-white flex items-center justify-center gap-1"
                                >
                                    <FiPlay /> Unpause
                                </Button>
                            )}

                            <Button
                                onClick={() => fetchContainerLogs(container.Id)}
                                className="flex-1 bg-purple-500 text-white flex items-center justify-center gap-1"
                            >
                                <FiFileText /> Logs
                            </Button>

                            {/* Always show Delete button, but with different styling based on state */}
                            <Button
                                onClick={() => handleDeleteContainer(container.Id)}
                                className={`flex-1 ${
                                    container.State === 'running' 
                                        ? 'bg-red-400 hover:bg-red-500' 
                                        : 'bg-red-500 hover:bg-red-600'
                                } text-white flex items-center justify-center gap-1`}
                            >
                                <FiTrash2 /> Delete
                            </Button>
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

            {/* Logs Modal */}
            <Modal
                isOpen={showLogs}
                onClose={() => setShowLogs(false)}
                title="Container Logs"
                size="lg"
            >
                <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded max-h-96 overflow-auto font-mono text-sm">
                    {logs || 'No logs available'}
                </pre>
            </Modal>
        </div>
    );
};

export default Docker_Containers;

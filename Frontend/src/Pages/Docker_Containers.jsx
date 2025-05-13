import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Select } from '../component/Select';
import { Notification } from '../component/Notification';

const API_URL = 'http://localhost:3000/api';

const Docker_Containers = () => {
    const [containers, setContainers] = useState([]);
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

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 5000);
        return () => clearInterval(interval);
    }, [fetchContainers]);const handleContainerAction = async (id, action) => {
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
    };    const handleCreateContainer = async (e) => {
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
            fetchContainers();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };    const handleDeleteContainer = async (id) => {
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
    };    const fetchContainerLogs = async (id) => {
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
                <h1 className="text-2xl font-bold">Docker Containers</h1>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-500 text-white"
                >
                    Create Container
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
                        <p className="text-sm mb-2">Status: {container.Status}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {container.State !== 'running' && (
                                <Button
                                    onClick={() => handleContainerAction(container.Id, 'start')}
                                    className="bg-green-500 text-white"
                                >
                                    Start
                                </Button>
                            )}
                            {container.State === 'running' && (
                                <>
                                    <Button
                                        onClick={() => handleContainerAction(container.Id, 'stop')}
                                        className="bg-yellow-500 text-white"
                                    >
                                        Stop
                                    </Button>
                                    <Button
                                        onClick={() => handleContainerAction(container.Id, 'restart')}
                                        className="bg-blue-500 text-white"
                                    >
                                        Restart
                                    </Button>
                                </>
                            )}
                            <Button
                                onClick={() => fetchContainerLogs(container.Id)}
                                className="bg-purple-500 text-white"
                            >
                                Logs
                            </Button>
                            <Button
                                onClick={() => handleDeleteContainer(container.Id)}
                                className="bg-red-500 text-white"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create Container"
            >
                <form onSubmit={handleCreateContainer} className="space-y-4">
                    <FormInput
                        label="Image Name"
                        value={createForm.Image}
                        onChange={(e) => setCreateForm({
                            ...createForm,
                            Image: e.target.value
                        })}
                        required
                    />
                    <FormInput
                        label="Container Name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({
                            ...createForm,
                            name: e.target.value
                        })}
                        required
                    />
                    <Button
                        type="submit"
                        className="bg-blue-500 text-white w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating...' : 'Create Container'}
                    </Button>
                </form>
            </Modal>

            <Modal
                isOpen={showLogs}
                onClose={() => setShowLogs(false)}
                title="Container Logs"
            >
                <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded">
                    {logs}
                </pre>
            </Modal>
        </div>
    );
};

export default Docker_Containers;

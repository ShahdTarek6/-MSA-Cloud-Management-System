import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';

const API_URL = 'http://localhost:3000/api';

const DockerFilesManager = () => {
    const [dockerfileContent, setDockerfileContent] = useState('FROM ');
    const [dockerfilePath, setDockerfilePath] = useState('Dockerfile');
    const [isLoading, setIsLoading] = useState(false);
    const [isDockerfileModalOpen, setIsDockerfileModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);

    const [dockerfiles, setDockerfiles] = useState([]);
    const [selectedDockerfile, setSelectedDockerfile] = useState(null);
    const [editDockerfileContent, setEditDockerfileContent] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDockerfilesLoading, setIsDockerfilesLoading] = useState(false);

    const [backendErrors, setBackendErrors] = useState([]);
    const [backendWarnings, setBackendWarnings] = useState([]);

    const templates = [
        {
            label: 'Node.js',
            content: 'FROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["node", "index.js"]'
        },
        {
            label: 'Python',
            content: 'FROM python:3.11\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt\nCMD ["python", "app.py"]'
        }
    ];

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    }, []);

    const fetchDockerfiles = useCallback(async () => {
        try {
            setIsDockerfilesLoading(true);
            const response = await fetch(`${API_URL}/docker/images/dockerfiles`);
            if (!response.ok) throw new Error('Failed to fetch Dockerfiles');
            const data = await response.json();
            setDockerfiles(Array.isArray(data)
                ? data.map(f => ({ filePath: f.filePath || f.path || '', content: f.content || '' }))
                : []);
        } catch (error) {
            showNotification('Error fetching Dockerfiles: ' + error.message, 'error');
            setDockerfiles([]);
        } finally {
            setIsDockerfilesLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchDockerfiles();
    }, [fetchDockerfiles]);

    const handleDockerfileContentChange = (e) => {
        setDockerfileContent(e.target.value);
    };

    const handleDockerfilePathChange = (e) => {
        let value = e.target.value;
        // Accept both Windows and Unix style paths
        value = value.replace(/\\/g, '/');
        // Remove trailing slash if present (unless it's root)
        if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
        setDockerfilePath(value);
    };

    const handleInsertTemplate = (content) => {
        setDockerfileContent(content);
    };

    const handleCreateDockerfile = async (e) => {
        e.preventDefault();
        setBackendErrors([]);
        setBackendWarnings([]);
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/dockerfile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: dockerfilePath, content: dockerfileContent })
            });
            const data = await response.json();
            if (!response.ok) {
                setBackendErrors(data.errors || [data.message]);
                setBackendWarnings(data.warnings || []);
                showNotification(data.message || 'Error creating Dockerfile', 'error');
                return;
            }
            setBackendWarnings(data.warnings || []);
            showNotification(`Dockerfile saved successfully at ${dockerfilePath}`);
            setIsDockerfileModalOpen(false);
            setDockerfileContent('FROM ');
            setDockerfilePath('Dockerfile');
            fetchDockerfiles();
        } catch (error) {
            setBackendErrors([error.message]);
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditDockerfile = (file) => {
        setSelectedDockerfile(file);
        setEditDockerfileContent(file.content);
        setIsEditModalOpen(true);
    };

    const handleSaveEditDockerfile = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/dockerfile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: selectedDockerfile.filePath, content: editDockerfileContent })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.errors?.join('\n') || data.message);
            showNotification('Dockerfile updated successfully');
            setIsEditModalOpen(false);
            fetchDockerfiles();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDockerfile = async (filePath) => {
        if (!window.confirm('Delete this Dockerfile?')) return;
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/dockerfile?filePath=${encodeURIComponent(filePath)}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete Dockerfile');
            showNotification('Dockerfile deleted successfully');
            fetchDockerfiles();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };    const handleDelete = async (filePath) => {
        if (!window.confirm('Are you sure you want to delete this Dockerfile?')) {
            return;
        }
        try {
            setIsLoading(true);
            // Get just the filename from the path
            const filename = filePath.split('/').pop().split('\\').pop();
            const response = await fetch(`${API_URL}/docker/images/dockerfile?filePath=${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete Dockerfile');
            }
            showNotification('Dockerfile deleted successfully');
            await fetchDockerfiles(); // Refresh the list
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = async (filePath) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/dockerfile?filePath=${encodeURIComponent(filePath)}`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch Dockerfile content');
            }
            const data = await response.json();
            setSelectedDockerfile(filePath);
            setEditDockerfileContent(data.content);
            setIsEditModalOpen(true);
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditSave = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/dockerfile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath: selectedDockerfile,
                    content: editDockerfileContent
                })
            });
            const data = await response.json();
            if (!response.ok) {
                setBackendErrors(data.errors || [data.message]);
                throw new Error(data.message || 'Failed to update Dockerfile');
            }
            setBackendWarnings(data.warnings || []);
            showNotification('Dockerfile updated successfully');
            setIsEditModalOpen(false);
            await fetchDockerfiles(); // Refresh the list
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    show={true}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Dockerfiles</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsDockerfileModalOpen(true)} className="bg-green-600 text-white">
                        Create Dockerfile
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isDockerfilesLoading ? (
                    <p className="text-center text-gray-500 col-span-3">Loading Dockerfiles...</p>
                ) : dockerfiles.length === 0 ? (
                    <p className="text-center text-gray-500 col-span-3">No Dockerfiles found.</p>
                ) : (                    dockerfiles.map((dockerfile, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="font-bold mb-2">
                                {dockerfile.filePath.split('/').pop().split('\\').pop()}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Button
                                    onClick={() => handleEditClick(dockerfile.filePath)}
                                    className="bg-blue-500 text-white"
                                >
                                    Edit
                                </Button>
                                <Button
                                    onClick={() => handleDelete(dockerfile.filePath)}
                                    className="bg-red-500 text-white"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Dockerfile Modal */}
            <Modal isOpen={isDockerfileModalOpen} onClose={() => setIsDockerfileModalOpen(false)} title="Create Dockerfile">
                <form onSubmit={handleCreateDockerfile} className="space-y-4">
                    <FormInput
                        label="Dockerfile Path"
                        value={dockerfilePath}
                        onChange={handleDockerfilePathChange}
                        placeholder="e.g. myproject/Dockerfile"
                        required
                    />
                    <div className="flex gap-2 mb-2">
                        {templates.map(t => (
                            <Button
                                key={t.label}
                                type="button"
                                onClick={() => handleInsertTemplate(t.content)}
                                className="bg-gray-200 text-xs"
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                    <textarea
                        value={dockerfileContent}
                        onChange={handleDockerfileContentChange}
                        rows={10}
                        className="w-full border rounded p-2 font-mono"
                        required
                    />
                    {backendErrors.length > 0 && (
                        <div className="text-red-500 text-sm">
                            {backendErrors.map((error, i) => (
                                <p key={i}>❌ {error}</p>
                            ))}
                        </div>
                    )}
                    {backendWarnings.length > 0 && (
                        <div className="text-yellow-500 text-sm">
                            {backendWarnings.map((warning, i) => (
                                <p key={i}>⚠️ {warning}</p>
                            ))}
                        </div>
                    )}
                    <Button
                        type="submit"
                        className="w-full bg-blue-500 text-white"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating...' : 'Create Dockerfile'}
                    </Button>
                </form>
            </Modal>

            {/* Edit Dockerfile Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Dockerfile">
                <div className="space-y-4">
                    <textarea
                        value={editDockerfileContent}
                        onChange={(e) => setEditDockerfileContent(e.target.value)}
                        rows={10}
                        className="w-full border rounded p-2 font-mono"
                        required
                    />
                    {backendErrors.length > 0 && (
                        <div className="text-red-500 text-sm">
                            {backendErrors.map((error, i) => (
                                <p key={i}>❌ {error}</p>
                            ))}
                        </div>
                    )}
                    {backendWarnings.length > 0 && (
                        <div className="text-yellow-500 text-sm">
                            {backendWarnings.map((warning, i) => (
                                <p key={i}>⚠️ {warning}</p>
                            ))}
                        </div>
                    )}
                    <Button
                        onClick={handleEditSave}
                        className="w-full bg-blue-500 text-white"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default DockerFilesManager;

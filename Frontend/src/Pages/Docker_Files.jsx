import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Dockerfiles</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsDockerfileModalOpen(true)} className="bg-green-600 text-white">
                        Create Dockerfile
                    </Button>
                </div>
            </div>

            {notification && (
                <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
            )}

            <div className="mb-8">
                {isDockerfilesLoading ? (
                    <p className="text-center text-gray-500">Loading Dockerfiles...</p>
                ) : dockerfiles.length === 0 ? (
                    <p className="text-center text-gray-500">No Dockerfiles found.</p>
                ) : (
                    <div className="grid gap-4">
                        {dockerfiles.map(file => (
                            <div key={file.filePath} className="bg-white p-4 rounded shadow">
                                <div className="flex justify-between items-center">
                                    <p className="font-mono text-sm break-all">{file.filePath}</p>
                                    <div className="flex space-x-2">
                                        <Button onClick={() => handleEditDockerfile(file)} className="bg-yellow-500 text-white">Edit</Button>
                                        <Button onClick={() => handleDeleteDockerfile(file.filePath)} className="bg-red-500 text-white">Delete</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={isDockerfileModalOpen} onClose={() => setIsDockerfileModalOpen(false)} title="Create Dockerfile">
                <form onSubmit={handleCreateDockerfile} className="space-y-4">
                    <FormInput value={dockerfilePath} onChange={handleDockerfilePathChange} placeholder="e.g. myproject/Dockerfile or C:/Users/Me/Desktop/Dockerfile" required />
                    <div className="flex gap-2">
                        {templates.map(t => (
                            <Button key={t.label} type="button" onClick={() => handleInsertTemplate(t.content)} className="bg-gray-200 text-xs">{t.label}</Button>
                        ))}
                    </div>
                    <textarea
                        value={dockerfileContent}
                        onChange={handleDockerfileContentChange}
                        rows={10}
                        className="w-full border rounded p-2 font-mono"
                        required
                    />
                    {backendErrors.length > 0 && backendErrors.map((e, i) => <p key={i} className="text-red-500 text-sm">❌ {e}</p>)}
                    {backendWarnings.length > 0 && backendWarnings.map((w, i) => <p key={i} className="text-yellow-500 text-sm">⚠️ {w}</p>)}
                    <Button type="submit" disabled={isLoading} className="bg-green-600 text-white w-full">
                        {isLoading ? 'Creating...' : 'Create'}
                    </Button>
                </form>
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit: ${selectedDockerfile?.filePath || ''}`}>
                <textarea
                    value={editDockerfileContent}
                    onChange={e => setEditDockerfileContent(e.target.value)}
                    rows={10}
                    className="w-full border rounded p-2 font-mono mb-4"
                />
                <Button onClick={handleSaveEditDockerfile} disabled={isLoading} className="bg-green-600 text-white w-full">
                    {isLoading ? 'Saving...' : 'Save'}
                </Button>
            </Modal>
        </div>
    );
};

export default DockerFilesManager;

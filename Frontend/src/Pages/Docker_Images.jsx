import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { FiUpload, FiDownload, FiTrash2, FiSearch, FiTag, FiBox } from 'react-icons/fi';

const API_URL = 'http://localhost:3000/api';

const Docker_Images = () => {
    const [images, setImages] = useState([]);
    const [isPullModalOpen, setIsPullModalOpen] = useState(false);
    const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [dockerfiles, setDockerfiles] = useState([]);
    const [selectedDockerfile, setSelectedDockerfile] = useState('');
    const [uploadedDockerfile, setUploadedDockerfile] = useState(null);
    const [imageTag, setImageTag] = useState('');
    const [buildOutput, setBuildOutput] = useState([]);
    const [isBuildLoading, setIsBuildLoading] = useState(false);

    const [pullForm, setPullForm] = useState({
        fromImage: '',
        tag: 'latest'
    });

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    }, []);

    const fetchImages = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/docker/images`);
            const data = await response.json();
            setImages(data);
        } catch (error) {
            showNotification('Error fetching images: ' + error.message, 'error');
        }
    }, [showNotification]);

    const fetchDockerfiles = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/docker/dockerfile`);
            if (!response.ok) throw new Error('Failed to fetch Dockerfiles');
            const data = await response.json();
            setDockerfiles(Array.isArray(data)
                ? data.map(f => ({
                    filePath: f.filePath || f.path || '',
                    name: f.name || f.filePath?.split('/').pop().split('\\').pop() || ''
                }))
                : []);
        } catch (error) {
            showNotification('Error fetching Dockerfiles: ' + error.message, 'error');
            setDockerfiles([]);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchImages();
        // Refresh the list periodically
        const interval = setInterval(fetchImages, 10000);
        return () => clearInterval(interval);
    }, [fetchImages]);

    const handlePullImage = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/pull?fromImage=${encodeURIComponent(pullForm.fromImage)}&tag=${encodeURIComponent(pullForm.tag)}`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to pull image');
            showNotification('Image pulled successfully');
            setIsPullModalOpen(false);
            fetchImages();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteImage = async (id) => {
        if (!window.confirm('Are you sure you want to delete this image?')) return;
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/${id}?force=true`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete image');
            showNotification('Image deleted successfully');
            fetchImages();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (term) => {
        if (!term) {
            setSearchResults([]);
            return;
        }
        try {
            setIsSearching(true);
            const response = await fetch(`${API_URL}/docker/images/search?term=${encodeURIComponent(term)}`);
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            showNotification('Error searching Docker Hub: ' + error.message, 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const openBuildModal = () => {
        fetchDockerfiles();
        setSelectedDockerfile('');
        setImageTag('');
        setBuildOutput([]);
        setUploadedDockerfile(null);
        setIsBuildModalOpen(true);
    };

    const handleBuildImage = async (e) => {
        e.preventDefault();
        if ((!selectedDockerfile && !uploadedDockerfile) || !imageTag) return;
        setIsBuildLoading(true);
        setBuildOutput([]);
        try {
            let dockerfilePath = selectedDockerfile;
            // If uploading a file, first upload it to the backend
            if (uploadedDockerfile) {
                const formData = new FormData();
                formData.append('file', uploadedDockerfile);
                // Save as a temp Dockerfile in backend dockerfiles dir
                const uploadRes = await fetch(`${API_URL}/docker/dockerfile`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.message || 'Failed to upload Dockerfile');
                dockerfilePath = uploadData.path || uploadData.filePath || uploadData.name;
            }
            const response = await fetch(`${API_URL}/docker/images/build-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dockerfilePath: dockerfilePath,
                    imageTag: imageTag
                })
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        setBuildOutput(prev => [...prev, data.stream || data.error || data.message || '']);
                    } catch (_) {
                        // ignore
                    }
                }
            }
            showNotification('Image build completed');
            fetchImages();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsBuildLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Docker Images</h1>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsPullModalOpen(true)}
                        className="bg-blue-500 text-white flex items-center gap-2"
                    >
                        <FiDownload /> Pull Image
                    </Button>
                    <Button
                        onClick={openBuildModal}
                        className="bg-purple-600 text-white flex items-center gap-2"
                    >
                        <FiBox /> Build from Dockerfile
                    </Button>
                </div>
            </div>

            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="mb-6">
                <FormInput
                    label="Search Docker Hub"
                    placeholder="Search for images..."
                    onChange={(e) => handleSearch(e.target.value)}
                    icon={<FiSearch className="text-gray-400" />}
                />
                {isSearching && (
                    <div className="mt-2 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                )}
                {searchResults.length > 0 && (
                    <div className="mt-2 bg-white rounded-lg shadow-md p-4">
                        <h3 className="font-bold mb-2">Search Results</h3>
                        <div className="space-y-2">
                            {searchResults.map(result => (
                                <div key={result.name} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                    <div>
                                        <p className="font-semibold">{result.name}</p>
                                        <p className="text-sm text-gray-600">{result.description}</p>
                                        <p className="text-xs text-gray-500">
                                            ⭐ {result.star_count} | Official: {result.is_official ? 'Yes' : 'No'}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => {
                                            setPullForm({ fromImage: result.name, tag: 'latest' });
                                            setIsPullModalOpen(true);
                                        }}
                                        className="bg-blue-500 text-white flex items-center gap-1"
                                    >
                                        <FiDownload /> Pull
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map(image => (
                    <div key={image.Id} className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="font-bold mb-2 truncate">
                            {image.RepoTags?.[0] || 'Untitled'}
                        </h3>
                        <p className="text-sm mb-1">ID: {image.Id.substring(7, 19)}</p>
                        <p className="text-sm mb-1">Created: {new Date(image.Created * 1000).toLocaleDateString()}</p>
                        <p className="text-sm mb-2">Size: {(image.Size / 1024 / 1024).toFixed(2)} MB</p>
                        <div className="flex gap-2 mt-4">
                            <Button
                                onClick={() => handleDeleteImage(image.Id)}
                                className="flex-1 bg-red-500 text-white flex items-center justify-center gap-1"
                            >
                                <FiTrash2 /> Delete
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pull Image Modal */}
            <Modal
                isOpen={isPullModalOpen}
                onClose={() => setIsPullModalOpen(false)}
                title="Pull Image"
            >
                <form onSubmit={handlePullImage} className="space-y-4">
                    <FormInput
                        label="Image Name"
                        value={pullForm.fromImage}
                        onChange={(e) => setPullForm({
                            ...pullForm,
                            fromImage: e.target.value
                        })}
                        placeholder="e.g., nginx"
                        required
                    />
                    <FormInput
                        label="Tag"
                        value={pullForm.tag}
                        onChange={(e) => setPullForm({
                            ...pullForm,
                            tag: e.target.value
                        })}
                        placeholder="e.g., latest"
                        required
                    />
                    <Button
                        type="submit"
                        className="bg-blue-500 text-white w-full flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Pulling...
                            </>
                        ) : (
                            <>
                                <FiDownload /> Pull Image
                            </>
                        )}
                    </Button>
                </form>
            </Modal>

            {/* Build Image Modal */}
            <Modal
                isOpen={isBuildModalOpen}
                onClose={() => setIsBuildModalOpen(false)}
                title="Build Docker Image from Dockerfile"
                size="lg"
            >
                <form onSubmit={handleBuildImage} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Select or Upload Dockerfile</label>
                        <div className="flex gap-2">
                            <select
                                className="w-full border rounded px-2 py-2"
                                value={selectedDockerfile}
                                onChange={e => {
                                    setSelectedDockerfile(e.target.value);
                                    setUploadedDockerfile(null);
                                }}
                                disabled={isBuildLoading}
                            >
                                <option value="">-- Select Dockerfile --</option>
                                {dockerfiles.map(df => (
                                    <option key={df.filePath} value={df.filePath}>{df.name}</option>
                                ))}
                            </select>
                            <input
                                type="file"
                                accept=".dockerfile,.txt"
                                className="block border rounded px-2 py-2 text-sm"
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        setUploadedDockerfile(e.target.files[0]);
                                        setSelectedDockerfile('');
                                    }
                                }}
                                disabled={isBuildLoading}
                            />
                        </div>
                        {uploadedDockerfile && (
                            <div className="text-xs text-green-700 mt-1">Selected file: {uploadedDockerfile.name}</div>
                        )}
                    </div>
                    <FormInput
                        label="Image Tag"
                        value={imageTag}
                        onChange={e => setImageTag(e.target.value)}
                        placeholder="e.g. myapp:latest"
                        required
                        disabled={isBuildLoading}
                    />
                    <div>
                        <label className="block text-sm font-medium mb-1">Build Output</label>
                        <div className="bg-gray-100 rounded p-2 h-48 overflow-auto text-xs font-mono">
                            {buildOutput.length === 0 ? (
                                <span className="text-gray-400">Build output will appear here...</span>
                            ) : (
                                buildOutput.map((line, i) => (
                                    <div key={i} className={line.toLowerCase().includes('error') ? 'text-red-600' : 'text-gray-800'}>{line}</div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            onClick={() => setIsBuildModalOpen(false)}
                            className="bg-gray-500 text-white"
                            disabled={isBuildLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-purple-600 text-white flex items-center gap-2"
                            disabled={isBuildLoading || (!selectedDockerfile && !uploadedDockerfile) || !imageTag}
                        >
                            {isBuildLoading ? 'Building...' : (<><FiBox /> Build Image</>)}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Docker_Images;
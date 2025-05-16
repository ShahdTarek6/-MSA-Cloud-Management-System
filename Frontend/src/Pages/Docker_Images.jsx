import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { FiUpload, FiDownload, FiTrash2, FiSearch, FiTag, FiBox, FiPlay, FiPause, FiSquare, FiPlus } from 'react-icons/fi';
import RefreshButton from '../component/RefreshButton';

// Helper function to get filename from path
const getFilename = (filepath) => {
    if (!filepath) return '';
    const parts = filepath.split(/[\\/]/);
    return parts[parts.length - 1];
};

const API_URL = 'http://localhost:3000/api';

const Docker_Images = () => {
    const [images, setImages] = useState([]);
    const [isPullModalOpen, setIsPullModalOpen] = useState(false);
    const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
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
                    name: getFilename(f.filePath || f.path || ''),
                    content: f.content || ''
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: await uploadedDockerfile.text(),
                        filePath: getFilename(uploadedDockerfile.name)
                    })
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.message || 'Failed to upload Dockerfile');
                dockerfilePath = uploadData.filePath;
            }

            // Add first line to show the build command
            setBuildOutput([
                `🔵 Executing: docker build -f ${getFilename(dockerfilePath)} -t ${imageTag} .`
            ]);
            
            const response = await fetch(`${API_URL}/docker/images/build-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dockerfilePath: dockerfilePath,
                    imageTag: imageTag
                })
            });

            if (!response.ok && response.status !== 200) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to build image');
            }

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
                        if (data.error) {
                            setBuildOutput(prev => [...prev, `❌ Error: ${data.error}`]);
                            throw new Error(data.error);
                        }
                        if (data.stream) {
                            setBuildOutput(prev => [...prev, data.stream.trim()]);
                        }
                    } catch (error) {
                        if (error.message !== 'Unexpected end of JSON input') {
                            console.warn('Build output parse error:', error);
                        }
                    }
                }
            }

            showNotification('Image build completed successfully', 'success');
            fetchImages();
        } catch (error) {
            setBuildOutput(prev => [...prev, `❌ Build failed: ${error.message}`]);
            showNotification(error.message, 'error');
        } finally {
            setIsBuildLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Docker Images</h1>
                    <RefreshButton onRefresh={fetchImages} />
                </div>
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
                    <Button
                        onClick={() => window.location.href = '/docker-hub'}
                        className="bg-green-500 text-white flex items-center gap-2"
                    >
                        <FiSearch /> Search Docker Hub
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
                title="Build Docker Image"
                size="lg"
            >
                <div className="space-y-4">
                    {selectedDockerfile && (
                        <div>
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Building from:</h3>
                                <div className="bg-gray-50 p-2 rounded font-mono text-sm">
                                    {selectedDockerfile}
                                </div>
                            </div>
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Command Preview:</h3>
                                <div className="bg-gray-50 p-2 rounded font-mono text-sm">
                                    docker build -f {selectedDockerfile ? getFilename(selectedDockerfile) : uploadedDockerfile?.name || '[dockerfile]'} -t {imageTag || '[tag]'} .
                                </div>
                            </div>
                            <FormInput
                                label="Image Tag"
                                value={imageTag}
                                onChange={e => setImageTag(e.target.value)}
                                placeholder="e.g., myapp:latest"
                                required
                                disabled={isBuildLoading}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Select or Upload Dockerfile</label>
                        <div className="flex gap-2">
                            <select
                                className="w-full border rounded px-2 py-2"
                                value={selectedDockerfile}
                                onChange={e => {
                                    const selected = e.target.value;
                                    setSelectedDockerfile(selected);
                                    setUploadedDockerfile(null);
                                    // Set a default image tag based on the selected Dockerfile
                                    if (selected) {
                                        const dockerfile = dockerfiles.find(df => df.filePath === selected);
                                        if (dockerfile) {
                                            const baseName = dockerfile.name.toLowerCase()
                                                .replace(/\.dockerfile$/, '')
                                                .replace(/[^a-z0-9-]/g, '-');
                                            setImageTag(`${baseName}:latest`);
                                        }
                                    }
                                }}
                                disabled={isBuildLoading}
                            >
                                <option value="">-- Select Dockerfile --</option>
                                {dockerfiles.map(df => (
                                    <option key={df.filePath} value={df.filePath}>
                                        {getFilename(df.name)}
                                    </option>
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
                                        // Set a default image tag based on the uploaded file
                                        const fileName = e.target.files[0].name;
                                        const baseName = fileName.toLowerCase()
                                            .replace(/\.dockerfile$/, '')
                                            .replace(/[^a-z0-9-]/g, '-');
                                        setImageTag(`${baseName}:latest`);
                                    }
                                }}
                                disabled={isBuildLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Build Output</label>
                        <div className="bg-gray-50 rounded p-4 h-96 overflow-auto font-mono">
                            {buildOutput.length === 0 ? (
                                <div className="text-gray-500 text-center py-4">
                                    {isBuildLoading ? (
                                        <div className="flex flex-col items-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                                            Building image...
                                        </div>
                                    ) : (
                                        'Build output will appear here...'
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {buildOutput.map((line, i) => (
                                        <div 
                                            key={i} 
                                            className={`text-sm whitespace-pre-wrap ${
                                                line.startsWith('❌') 
                                                    ? 'text-red-600' 
                                                    : line.startsWith('🔵')
                                                        ? 'text-blue-600 font-bold'
                                                        : line.includes('Step')
                                                            ? 'text-blue-600 font-semibold'
                                                            : line.includes('Successfully built')
                                                                ? 'text-green-600 font-semibold'
                                                                : 'text-gray-700'
                                            }`}
                                        >
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            onClick={() => setIsBuildModalOpen(false)}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                            disabled={isBuildLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBuildImage}
                            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                            disabled={isBuildLoading || (!selectedDockerfile && !uploadedDockerfile) || !imageTag}
                        >
                            {isBuildLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white" />
                                    Building...
                                </>
                            ) : (
                                <>
                                    <FiBox /> Build Image
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Docker_Images;
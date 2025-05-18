import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { FiUpload, FiDownload, FiTrash2, FiSearch, FiTag, FiBox, FiPlay, FiPause, FiSquare, FiPlus, FiRefreshCw, FiZap, FiClock, FiHardDrive, FiCalendar } from 'react-icons/fi';
import RefreshButton from '../component/RefreshButton';

// Helper function to get filename from path
const getFilename = (filepath) => {
    if (!filepath) return '';
    const parts = filepath.split(/[\\/]/);
    return parts[parts.length - 1];
};

// Helper function to format bytes into human readable format
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const API_URL = 'http://localhost:3000/api';

const Docker_Images = () => {
    const [images, setImages] = useState([]);
    const [isPullModalOpen, setIsPullModalOpen] = useState(false);
    const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [dockerfiles, setDockerfiles] = useState([]);
    const [selectedDockerfile, setSelectedDockerfile] = useState('');
    const [uploadedDockerfile, setUploadedDockerfile] = useState(null);
    const [imageTag, setImageTag] = useState('');
    const [buildOutput, setBuildOutput] = useState([]);
    const [isBuildLoading, setIsBuildLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [runningContainers, setRunningContainers] = useState({});

    const [pullForm, setPullForm] = useState({
        fromImage: '',
        tag: 'latest'
    });

    const [tagForm, setTagForm] = useState({
        repo: '',
        tag: ''
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

    const fetchRunningContainers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/docker/containers?all=true`);
            const containers = await response.json();
            const containerMap = {};
            containers.forEach(container => {
                if (container.ImageID) {
                    containerMap[container.ImageID] = {
                        id: container.Id,
                        state: container.State
                    };
                }
            });
            setRunningContainers(containerMap);
        } catch (error) {
            showNotification('Error fetching containers: ' + error.message, 'error');
        }
    }, [showNotification]);

    useEffect(() => {
        fetchImages();
        fetchDockerfiles();
        fetchRunningContainers();
        // Refresh the lists periodically
        const interval = setInterval(() => {
            fetchImages();
            fetchDockerfiles();
            fetchRunningContainers();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchImages, fetchDockerfiles, fetchRunningContainers]);

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

    const handleTagImage = async (e) => {
        e.preventDefault();
        if (!selectedImage) return;
        
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/${selectedImage.Id}/tag?repo=${encodeURIComponent(tagForm.repo)}&tag=${encodeURIComponent(tagForm.tag)}`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to tag image');
            showNotification('Image tagged successfully');
            setIsTagModalOpen(false);
            setTagForm({ repo: '', tag: '' });
            fetchImages();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const openTagModal = (image) => {
        setSelectedImage(image);
        setTagForm({
            repo: image.RepoTags?.[0]?.split(':')[0] || '',
            tag: 'latest'
        });
        setIsTagModalOpen(true);
    };

    // Filter images based on search term
    const filteredImages = images.filter(image => {
        const searchLower = searchTerm.toLowerCase();
        const repoTags = image.RepoTags || [];
        const id = (image.Id || '').toLowerCase();
        
        return repoTags.some(tag => tag.toLowerCase().includes(searchLower)) ||
               id.includes(searchLower) ||
               (image.Size && formatBytes(image.Size).toLowerCase().includes(searchLower));
    });

    // Add container action handlers
    const handleContainerAction = async (imageId, action) => {
        try {
            setIsLoading(true);
            const container = runningContainers[imageId];
            
            if (action === 'start' && !container) {
                // Create and start a new container
                const response = await fetch(`${API_URL}/docker/containers?name=${imageId.substring(7, 19)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Image: imageId,
                        Tty: true,
                        OpenStdin: true,
                        StdinOnce: false,
                        Cmd: ['tail', '-f', '/dev/null']  // Keep container running
                    })
                });
                if (!response.ok) throw new Error('Failed to create container');
                await fetchRunningContainers();
                showNotification('Container created and started successfully');
            } else if (container) {
                // Perform action on existing container
                const response = await fetch(`${API_URL}/docker/containers/${container.id}/${action}`, {
                    method: 'POST'
                });
                if (!response.ok) throw new Error(`Failed to ${action} container`);
                showNotification(`Container ${action}ed successfully`);
                await fetchRunningContainers();
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">Docker Images</h1>
                    <RefreshButton onRefresh={fetchImages} className="hover:rotate-180 transition-transform duration-500" />
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setIsPullModalOpen(true)}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        <FiDownload className="text-lg" /> Pull Image
                    </Button>
                    <Button
                        onClick={openBuildModal}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        <FiBox className="text-lg" /> Build from Dockerfile
                    </Button>
                    <Button
                        onClick={() => window.location.href = '/docker-hub'}
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        <FiSearch className="text-lg" /> Search Docker Hub
                    </Button>
                </div>
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
                        placeholder="Search images by name, tag, or ID..."
                        className="pl-12 pr-4 py-3 w-full border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-700 bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredImages.map(image => (
                    <div key={image.Id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                        <div className="p-6">
                            {/* Image Name and ID Section */}
                            <div className="mb-6">
                                <h3 className="font-bold text-xl text-gray-800 mb-2 truncate">
                                    {(image.RepoTags && image.RepoTags[0] !== '<none>:<none>' 
                                        ? image.RepoTags[0] 
                                        : `Untagged Image`
                                    )}
                                </h3>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <FiHardDrive className="text-lg" />
                                    <p className="text-sm font-medium">{image.Id.substring(7, 19)}</p>
                                </div>
                            </div>
                            
                            {/* Additional Tags */}
                            {image.RepoTags && image.RepoTags.length > 1 && (
                                <div className="mb-6">
                                    <p className="text-sm font-medium text-gray-600 mb-2">Additional Tags:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {image.RepoTags.slice(1).map(tag => (
                                            tag !== '<none>:<none>' && (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100 font-medium"
                                                >
                                                    {tag}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Image Details */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiHardDrive className="text-lg" />
                                    <p className="text-sm">{formatBytes(image.Size)}</p>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiCalendar className="text-lg" />
                                    <p className="text-sm">{new Date(image.Created * 1000).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            {/* Container Actions */}
                            <div className="space-y-3">
                                {!runningContainers[image.Id] ? (
                                    <Button
                                        onClick={() => handleContainerAction(image.Id, 'start')}
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                        disabled={isLoading}
                                    >
                                        <FiPlay className="text-lg" /> Build Container
                                    </Button>
                                ) : runningContainers[image.Id].state === 'running' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={() => handleContainerAction(image.Id, 'stop')}
                                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiSquare className="text-lg" /> Stop
                                        </Button>
                                        <Button
                                            onClick={() => handleContainerAction(image.Id, 'pause')}
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiPause className="text-lg" /> Pause
                                        </Button>
                                        <Button
                                            onClick={() => handleContainerAction(image.Id, 'restart')}
                                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiRefreshCw className="text-lg" /> Restart
                                        </Button>
                                        <Button
                                            onClick={() => handleContainerAction(image.Id, 'kill')}
                                            className="bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                            disabled={isLoading}
                                        >
                                            <FiZap className="text-lg" /> Kill
                                        </Button>
                                    </div>
                                ) : runningContainers[image.Id].state === 'paused' ? (
                                    <Button
                                        onClick={() => handleContainerAction(image.Id, 'unpause')}
                                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                        disabled={isLoading}
                                    >
                                        <FiPlay className="text-lg" /> Unpause
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleContainerAction(image.Id, 'start')}
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                        disabled={isLoading}
                                    >
                                        <FiPlay className="text-lg" /> Start
                                    </Button>
                                )}

                                {/* Image Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => openTagModal(image)}
                                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <FiTag className="text-lg" /> Tag
                                    </Button>
                                    <Button
                                        onClick={() => handleDeleteImage(image.Id)}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <FiTrash2 className="text-lg" /> Delete
                                    </Button>
                                </div>
                            </div>
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

            {/* Add Tag Image Modal */}
            <Modal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                title="Tag Image"
            >
                <form onSubmit={handleTagImage} className="space-y-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Image
                        </label>
                        <div className="bg-gray-50 p-2 rounded text-sm">
                            {selectedImage?.RepoTags?.[0] || selectedImage?.Id?.substring(7, 19) || 'Unknown Image'}
                        </div>
                    </div>
                    <FormInput
                        label="Repository Name"
                        value={tagForm.repo}
                        onChange={(e) => setTagForm({
                            ...tagForm,
                            repo: e.target.value
                        })}
                        placeholder="e.g., myapp"
                        required
                    />
                    <FormInput
                        label="Tag"
                        value={tagForm.tag}
                        onChange={(e) => setTagForm({
                            ...tagForm,
                            tag: e.target.value
                        })}
                        placeholder="e.g., latest"
                        required
                    />
                    <Button
                        type="submit"
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Tagging...
                            </>
                        ) : (
                            <>
                                <FiTag /> Tag Image
                            </>
                        )}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default Docker_Images;
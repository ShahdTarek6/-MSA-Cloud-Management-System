import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { FiUpload, FiDownload, FiTrash2, FiSearch, FiTag } from 'react-icons/fi';

const API_URL = 'http://localhost:3000/api';

const Docker_Images = () => {
    const [images, setImages] = useState([]);
    const [isPullModalOpen, setIsPullModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [notification, setNotification] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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

    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('imageFile', file);

            const response = await fetch(`${API_URL}/docker/images/load`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload image');
            showNotification('Image uploaded successfully');
            setIsUploadModalOpen(false);
            fetchImages();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
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

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Docker Images</h1>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="bg-green-500 text-white flex items-center gap-2"
                    >
                        <FiUpload /> Upload Image
                    </Button>
                    <Button
                        onClick={() => setIsPullModalOpen(true)}
                        className="bg-blue-500 text-white flex items-center gap-2"
                    >
                        <FiDownload /> Pull Image
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

            {/* Upload Image Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Image"
            >
                <div className="space-y-4">
                    <label
                        className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                            ${isUploading ? 'bg-gray-50 border-gray-300' : 'hover:bg-gray-50 border-gray-300 hover:border-blue-500'}`}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-2 text-sm text-gray-500">Uploading... {uploadProgress}%</p>
                                </>
                            ) : (
                                <>
                                    <FiUpload className="w-8 h-8 mb-3 text-gray-500" />
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">Docker image files (.tar)</p>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            accept=".tar"
                            className="hidden"
                            onChange={handleUploadImage}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </Modal>
        </div>
    );
};

export default Docker_Images;
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';

const API_URL = 'http://localhost:3000/api';

const Docker_Images = () => {
    const [images, setImages] = useState([]);
    const [isPullModalOpen, setIsPullModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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
    }, [fetchImages]);

    if (isLoading) {
        return (
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-6">Docker Images</h1>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-600">Loading images...</div>
                </div>
            </div>
        );
    }

    const handlePullImage = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pullForm)
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

    const handlePruneImages = async () => {
        if (!window.confirm('Are you sure you want to remove all unused images?')) return;
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/docker/images/prune`, {
                method: 'POST'
            });
            const data = await response.json();
            showNotification(`Successfully removed ${data.ImagesDeleted?.length || 0} images`);
            fetchImages();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Docker Images</h1>
                <div className="space-x-2">
                    <Button
                        onClick={() => setIsPullModalOpen(true)}
                        className="bg-blue-500 text-white"
                    >
                        Pull Image
                    </Button>
                    <Button
                        onClick={handlePruneImages}
                        className="bg-yellow-500 text-white"
                    >
                        Prune Unused
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
                />
                {isSearching && <p className="text-gray-500">Searching...</p>}
                {searchResults.length > 0 && (
                    <div className="mt-2 bg-white rounded-lg shadow-md p-4">
                        <h3 className="font-bold mb-2">Search Results</h3>
                        <div className="space-y-2">
                            {searchResults.map(result => (
                                <div key={result.name} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{result.name}</p>
                                        <p className="text-sm text-gray-600">{result.description}</p>
                                    </div>
                                    <Button
                                        onClick={() => {
                                            setPullForm({ fromImage: result.name, tag: 'latest' });
                                            setIsPullModalOpen(true);
                                        }}
                                        className="bg-blue-500 text-white"
                                    >
                                        Pull
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
                        <h3 className="font-bold mb-2">
                            {image.RepoTags?.[0] || 'Untitled'}
                        </h3>
                        <p className="text-sm mb-2">ID: {image.Id.substring(7, 19)}</p>
                        <p className="text-sm mb-2">Size: {(image.Size / 1024 / 1024).toFixed(2)} MB</p>
                        <div className="flex gap-2 mt-4">
                            <Button
                                onClick={() => handleDeleteImage(image.Id)}
                                className="bg-red-500 text-white"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

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
                        className="bg-blue-500 text-white w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Pulling...' : 'Pull Image'}
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default Docker_Images;
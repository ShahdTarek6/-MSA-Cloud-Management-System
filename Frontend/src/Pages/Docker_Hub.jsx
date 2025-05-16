import React, { useState, useCallback } from 'react';
import { Button } from '../component/Button';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { FiDownload, FiSearch, FiCopy } from 'react-icons/fi';
import RefreshButton from '../component/RefreshButton';

const API_URL = 'http://localhost:3000/api';

const Docker_Hub = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPullModalOpen, setIsPullModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [pullForm, setPullForm] = useState({
        fromImage: '',
        tag: 'latest'
    });

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    }, []);

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
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = useCallback(() => {
        if (searchTerm) {
            handleSearch(searchTerm);
        }
    }, [searchTerm]);

    return (
        <div className="container mx-auto p-4">
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Docker Hub</h1>
                    <RefreshButton onRefresh={handleRefresh} />
                </div>
                <div className="text-sm text-gray-500">
                    Search and pull images from Docker Hub
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search Docker Hub (e.g., node, python, nginx)..."
                        className="pl-10 pr-4 py-3 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            handleSearch(e.target.value);
                        }}
                    />
                </div>

                {isSearching && (
                    <div className="mt-8 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="mt-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-700">
                                Search Results
                            </h3>
                            <p className="text-sm text-gray-500">
                                Click "Pull" to download the image or click the name for more details
                            </p>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {searchResults.map(result => (
                                <div key={result.name} 
                                    className="py-4 hover:bg-gray-50 transition-colors duration-150"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-lg font-medium text-blue-600 hover:text-blue-800">
                                                    <a 
                                                        href={`https://hub.docker.com/_/${result.name}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="hover:underline"
                                                    >
                                                        {result.name}
                                                    </a>
                                                </h4>
                                                {result.is_official && (
                                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                        Official
                                                    </span>
                                                )}
                                                <span className="flex items-center text-yellow-500 text-sm">
                                                    ⭐ {result.star_count.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-600">
                                                {result.description || 'No description available'}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                    Downloads: {result.pull_count?.toLocaleString() || 'N/A'}
                                                </span>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                    Updated: {new Date(result.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="ml-4 flex items-center gap-2">
                                            <Button
                                                onClick={() => {
                                                    setPullForm({ fromImage: result.name, tag: 'latest' });
                                                    setIsPullModalOpen(true);
                                                }}
                                                className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2 px-4"
                                            >
                                                <FiDownload /> Pull
                                            </Button>
                                            <div className="relative group">
                                                <button
                                                    className="p-2 hover:bg-gray-100 rounded-full"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`docker pull ${result.name}`);
                                                        showNotification('Docker pull command copied to clipboard', 'success');
                                                    }}
                                                >
                                                    <FiCopy className="text-gray-500" />
                                                </button>
                                                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Copy docker pull command
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {searchTerm && !isSearching && searchResults.length === 0 && (
                    <div className="mt-8 text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-gray-500">
                            No images found matching "{searchTerm}"
                        </div>
                        <div className="text-sm text-gray-400 mt-2">
                            Try adjusting your search term or check the spelling
                        </div>
                    </div>
                )}
            </div>

            {/* Pull Image Modal */}
            <Modal
                isOpen={isPullModalOpen}
                onClose={() => setIsPullModalOpen(false)}
                title="Pull Image"
            >
                <form onSubmit={handlePullImage} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Image Name
                        </label>
                        <input
                            type="text"
                            value={pullForm.fromImage}
                            onChange={(e) => setPullForm({
                                ...pullForm,
                                fromImage: e.target.value
                            })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., nginx"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tag
                        </label>
                        <input
                            type="text"
                            value={pullForm.tag}
                            onChange={(e) => setPullForm({
                                ...pullForm,
                                tag: e.target.value
                            })}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., latest"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2 py-2"
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
        </div>
    );
};

export default Docker_Hub; 
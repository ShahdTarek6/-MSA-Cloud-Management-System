import React, { useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

const RefreshButton = ({ onRefresh, className = '' }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setTimeout(() => setIsRefreshing(false), 500); // Keep spinning for at least 500ms
        }
    };

    return (
        <button
            onClick={handleRefresh}
            className={`p-2 rounded-full hover:bg-gray-100 transition-all duration-200 ${className} ${
                isRefreshing ? 'text-blue-500' : 'text-gray-500'
            }`}
            title="Refresh"
        >
            <FiRefreshCw 
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
        </button>
    );
};

export default RefreshButton; 
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import { Select } from '../component/Select';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { FiFile, FiTrash2, FiEdit2, FiPlus, FiSearch, FiCopy, FiBox, FiFolder, FiFolderPlus, FiChevronRight, FiChevronDown, FiUpload, FiCode, FiTerminal } from 'react-icons/fi';

const API_URL = 'http://localhost:3000/api';
const DEFAULT_DOCKERFILE_PATH = 'E:\\MSA material\\sana 4\\cloud\\code\\-MSA-Cloud-Management-System\\Backend\\src\\docker\\dockerfiles';

const DockerFilesManager = () => {
    const [dockerfileContent, setDockerfileContent] = useState('FROM ');
    const [dockerfileName, setDockerfileName] = useState('Dockerfile');
    const [isLoading, setIsLoading] = useState(false);
    const [isDockerfileModalOpen, setIsDockerfileModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedDirectory, setSelectedDirectory] = useState(DEFAULT_DOCKERFILE_PATH);
    const [isCustomPath, setIsCustomPath] = useState(false);

    const [dockerfiles, setDockerfiles] = useState([]);
    const [selectedDockerfile, setSelectedDockerfile] = useState(null);
    const [editDockerfileContent, setEditDockerfileContent] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [backendErrors, setBackendErrors] = useState([]);
    const [backendWarnings, setBackendWarnings] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
    const [selectedBuildFile, setSelectedBuildFile] = useState(null);
    const [imageTag, setImageTag] = useState('');
    const [buildOutput, setBuildOutput] = useState([]);
    const [isBuildLoading, setIsBuildLoading] = useState(false);

    const templates = [
        {
            label: 'Node.js',
            description: 'Basic Node.js application',
            content: `FROM node:18-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000
CMD ["npm", "start"]`
        },
        {
            label: 'Python',
            description: 'Python with pip requirements',
            content: `FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

EXPOSE 5000
CMD ["python", "app.py"]`
        },
        {
            label: 'Java Spring Boot',
            description: 'Java Spring Boot application',
            content: `FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:resolve

COPY src ./src
RUN ./mvnw package -DskipTests

EXPOSE 8080
CMD ["java", "-jar", "target/*.jar"]`
        },
        {
            label: 'React App',
            description: 'React production build with Nginx',
            content: `FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`
        }
    ];

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    }, []);

    const fetchDockerfiles = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/docker/dockerfile`);
            if (!response.ok) throw new Error('Failed to fetch Dockerfiles');
            const data = await response.json();
            setDockerfiles(Array.isArray(data)
                ? data.map(f => ({
                    filePath: f.absolutePath || f.filePath || '',
                    name: f.name || f.filePath?.split('/').pop().split('\\').pop() || '',
                    content: f.content || ''
                }))
                : []);
        } catch (error) {
            showNotification('Error fetching Dockerfiles: ' + error.message, 'error');
            setDockerfiles([]);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchDockerfiles();
    }, [fetchDockerfiles]);

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        setDockerfileContent(template.content);
    };

    const handleCreateDockerfile = async (e) => {
        e?.preventDefault();
        setBackendErrors([]);
        setBackendWarnings([]);
        
        try {
            setIsLoading(true);
            
            // Validate custom path if selected
            if (isCustomPath && !selectedDirectory.trim()) {
                showNotification('Please enter a valid directory path', 'error');
                return;
            }

            // Ensure dockerfile name has .dockerfile extension
            let finalDockerfileName = dockerfileName;
            if (!finalDockerfileName.toLowerCase().endsWith('.dockerfile')) {
                finalDockerfileName += '.dockerfile';
            }

            // Construct the paths
            let customPath, defaultPath;
            if (isCustomPath) {
                // Save to both custom and default locations
                customPath = selectedDirectory.trim().replace(/[\\/]$/, '') + '\\' + finalDockerfileName;
                defaultPath = DEFAULT_DOCKERFILE_PATH + '\\' + finalDockerfileName;

                // First save to custom path
                const customResponse = await fetch(`${API_URL}/docker/dockerfile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        filePath: customPath,
                        content: dockerfileContent
                    })
                });

                if (!customResponse.ok) {
                    const data = await customResponse.json();
                    setBackendErrors(data.errors || [data.message]);
                    setBackendWarnings(data.warnings || []);
                    showNotification(data.message || 'Error creating Dockerfile in custom path', 'error');
                    return;
                }

                // Then save to default path
                const defaultResponse = await fetch(`${API_URL}/docker/dockerfile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        filePath: defaultPath,
                        content: dockerfileContent
                    })
                });

                if (!defaultResponse.ok) {
                    const data = await defaultResponse.json();
                    setBackendWarnings([...(data.warnings || []), 'Failed to create backup copy in default location']);
                }

                showNotification('Dockerfile created successfully in both locations');
            } else {
                // Just save to default path for non-custom path
                defaultPath = DEFAULT_DOCKERFILE_PATH + '\\' + finalDockerfileName;
                const response = await fetch(`${API_URL}/docker/dockerfile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        filePath: defaultPath,
                        content: dockerfileContent
                    })
                });
                
                const data = await response.json();
                if (!response.ok) {
                    setBackendErrors(data.errors || [data.message]);
                    setBackendWarnings(data.warnings || []);
                    showNotification(data.message || 'Error creating Dockerfile', 'error');
                    return;
                }
                
                setBackendWarnings(data.warnings || []);
                showNotification('Dockerfile created successfully');
            }

            setIsDockerfileModalOpen(false);
            setDockerfileContent('FROM ');
            setDockerfileName('Dockerfile');
            setIsCustomPath(false);
            setSelectedDirectory(DEFAULT_DOCKERFILE_PATH);
            await fetchDockerfiles();
        } catch (error) {
            setBackendErrors([error.message]);
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = async (filePath) => {
        try {
            setIsLoading(true);
            const filename = filePath.split('/').pop().split('\\').pop();
            const response = await fetch(`${API_URL}/docker/dockerfile/${encodeURIComponent(filename)}`);
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
            const filename = selectedDockerfile.split('/').pop().split('\\').pop();
            const response = await fetch(`${API_URL}/docker/dockerfile/${encodeURIComponent(filename)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
            await fetchDockerfiles();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (filePath) => {
        if (!window.confirm('Are you sure you want to delete this Dockerfile?')) {
            return;
        }
        try {
            setIsLoading(true);
            const filename = filePath.split('/').pop().split('\\').pop();
            const response = await fetch(`${API_URL}/docker/dockerfile/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete Dockerfile');
            }
            showNotification('Dockerfile deleted successfully');
            await fetchDockerfiles();
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuildClick = (dockerfile) => {
        setSelectedBuildFile(dockerfile);
        // Generate a default image tag based on the dockerfile name
        const baseName = dockerfile.name.toLowerCase()
            .replace(/\.dockerfile$/, '')  // Remove .dockerfile extension
            .replace(/[^a-z0-9-]/g, '-');  // Replace invalid chars with dash
        setImageTag(`${baseName}:latest`);
        setBuildOutput([]);
        setIsBuildModalOpen(true);
    };

    const handleBuildImage = async (e) => {
        e.preventDefault();
        if (!selectedBuildFile || !imageTag) return;

        try {
            setIsBuildLoading(true);
            setBuildOutput([]);
            
            // Add a first line to show the equivalent docker command
            setBuildOutput([
                `🔵 Executing: docker build -f ${selectedBuildFile.name} -t ${imageTag} .`
            ]);

            const response = await fetch(`${API_URL}/docker/images/build-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dockerfilePath: selectedBuildFile.filePath,
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
        } catch (error) {
            setBuildOutput(prev => [...prev, `❌ Build failed: ${error.message}`]);
            showNotification(error.message, 'error');
        } finally {
            setIsBuildLoading(false);
        }
    };

    const renderBuildOutput = () => {
        return buildOutput.map((line, index) => (
            <div 
                key={index} 
                className={`text-sm font-mono whitespace-pre-wrap ${
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
        ));
    };

    return (
        <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">Dockerfiles</h1>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setIsDockerfileModalOpen(true)}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        <FiPlus className="text-lg" /> New Dockerfile
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
                        placeholder="Search Dockerfiles..."
                        className="pl-12 pr-4 py-3 w-full border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-700 bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dockerfiles
                    .filter(file => 
                        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        file.filePath.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(file => (
                        <div key={file.filePath} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                            <div className="p-6">
                                {/* Dockerfile Name and Path */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FiCode className="text-xl text-blue-500" />
                                        <h3 className="font-bold text-xl text-gray-800 truncate">
                                            {file.name}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <FiFolder className="text-lg" />
                                        <p className="text-sm truncate">{file.filePath}</p>
                                    </div>
                                </div>

                                {/* Preview Section */}
                                <div className="mb-6">
                                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-600 max-h-32 overflow-y-auto">
                                        {file.content.split('\n').slice(0, 5).map((line, index) => (
                                            <div key={index} className="truncate">
                                                {line}
                                            </div>
                                        ))}
                                        {file.content.split('\n').length > 5 && (
                                            <div className="text-gray-400 mt-2">...</div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={() => handleEditClick(file.filePath)}
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                        >
                                            <FiEdit2 className="text-lg" /> Edit
                                        </Button>
                                        <Button
                                            onClick={() => handleBuildClick(file)}
                                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                        >
                                            <FiTerminal className="text-lg" /> Build
                                        </Button>
                                    </div>
                                    <Button
                                        onClick={() => handleDelete(file.filePath)}
                                        className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <FiTrash2 className="text-lg" /> Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* Create Dockerfile Modal */}
            <Modal
                isOpen={isDockerfileModalOpen}
                onClose={() => setIsDockerfileModalOpen(false)}
                title="Create New Dockerfile"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Template Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {templates.map(template => (
                            <div
                                key={template.label}
                                onClick={() => handleTemplateSelect(template)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                                    selectedTemplate?.label === template.label
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-blue-300'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <FiBox className={`text-xl ${
                                        selectedTemplate?.label === template.label
                                            ? 'text-blue-500'
                                            : 'text-gray-500'
                                    }`} />
                                    <h3 className="font-medium">{template.label}</h3>
                                </div>
                                <p className="text-sm text-gray-600">{template.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <FormInput
                            label="Dockerfile Name"
                            value={dockerfileName}
                            onChange={(e) => setDockerfileName(e.target.value)}
                            placeholder="e.g., Dockerfile.node"
                            className="w-full"
                        />

                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="customPath"
                                checked={isCustomPath}
                                onChange={(e) => setIsCustomPath(e.target.checked)}
                                className="rounded text-blue-500 focus:ring-blue-500"
                            />
                            <label htmlFor="customPath" className="text-sm text-gray-700">
                                Use custom directory path
                            </label>
                        </div>

                        {isCustomPath && (
                            <FormInput
                                label="Directory Path"
                                value={selectedDirectory}
                                onChange={(e) => setSelectedDirectory(e.target.value)}
                                placeholder="Enter directory path"
                                className="w-full"
                            />
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dockerfile Content
                            </label>
                            <div className="border rounded-lg overflow-hidden">
                                <CodeMirror
                                    value={dockerfileContent}
                                    height="400px"
                                    theme="light"
                                    extensions={[javascript()]}
                                    onChange={(value) => setDockerfileContent(value)}
                                    className="text-sm"
                                />
                            </div>
                        </div>

                        {/* Error and Warning Display */}
                        {backendErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="text-red-800 font-medium mb-2">Errors:</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {backendErrors.map((error, index) => (
                                        <li key={index} className="text-sm text-red-600">{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {backendWarnings.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="text-yellow-800 font-medium mb-2">Warnings:</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {backendWarnings.map((warning, index) => (
                                        <li key={index} className="text-sm text-yellow-600">{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <Button
                            onClick={handleCreateDockerfile}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <FiPlus className="text-lg" /> Create Dockerfile
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Dockerfile"
                size="lg"
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                            <FiFile className="text-lg" />
                            <p className="text-sm font-medium truncate">{selectedDockerfile?.filePath}</p>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <CodeMirror
                            value={editDockerfileContent}
                            height="400px"
                            theme="light"
                            extensions={[javascript()]}
                            onChange={(value) => setEditDockerfileContent(value)}
                            className="text-sm"
                        />
                    </div>

                    <Button
                        onClick={handleEditSave}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FiEdit2 className="text-lg" /> Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </Modal>

            {/* Build Modal */}
            <Modal
                isOpen={isBuildModalOpen}
                onClose={() => setIsBuildModalOpen(false)}
                title="Build Docker Image"
                size="lg"
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                            <FiFile className="text-lg" />
                            <p className="text-sm font-medium truncate">{selectedBuildFile?.filePath}</p>
                        </div>
                    </div>

                    <FormInput
                        label="Image Tag"
                        value={imageTag}
                        onChange={(e) => setImageTag(e.target.value)}
                        placeholder="e.g., myapp:latest"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Build Output
                        </label>
                        <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-auto font-mono text-sm">
                            {renderBuildOutput()}
                        </div>
                    </div>

                    <Button
                        onClick={handleBuildImage}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center gap-2 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                        disabled={isBuildLoading}
                    >
                        {isBuildLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white" />
                                Building...
                            </>
                        ) : (
                            <>
                                <FiTerminal className="text-lg" /> Build Image
                            </>
                        )}
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default DockerFilesManager;

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../component/Button';
import { FormInput } from '../component/FormInput';
import { Modal } from '../component/Modal';
import { Notification } from '../component/Notification';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { FiFile, FiTrash2, FiEdit2, FiPlus, FiSearch, FiCopy, FiBox } from 'react-icons/fi';

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

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [useCustomPath, setUseCustomPath] = useState(false);

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

    const isAbsolutePath = (filepath) => {
        return filepath.startsWith('/') || /^[A-Za-z]:/.test(filepath);
    };

    const validatePath = (filepath) => {
        if (!useCustomPath) return null;
        if (!filepath) return "Path is required";
        if (!isAbsolutePath(filepath)) return "Please provide an absolute path";
        return null;
    };

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    }, []);

    const fetchDockerfiles = useCallback(async () => {
        try {
            setIsDockerfilesLoading(true);
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
        } finally {
            setIsDockerfilesLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchDockerfiles();
    }, [fetchDockerfiles]);

    const handleDockerfilePathChange = (e) => {
        let value = e.target.value;
        // Only handle basic path separators
        value = value.replace(/\\/g, '/');
        if (!useCustomPath && value.length > 1 && value.endsWith('/')) {
            value = value.slice(0, -1);
        }
        // Remove any automatically added .dockerfile extensions
        value = value.replace(/\.dockerfile.*$/, '');
        setDockerfilePath(value);
    };

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        setDockerfileContent(template.content);
    };

    const handleCreateDockerfile = async (e) => {
        e?.preventDefault(); // Make it work both with form submit and button click
        setBackendErrors([]);
        setBackendWarnings([]);
        try {
            setIsLoading(true);
            // Add .dockerfile extension here only when submitting
            let finalPath = dockerfilePath;
            if (!useCustomPath && !finalPath.toLowerCase().endsWith('.dockerfile') && finalPath.toLowerCase() !== 'dockerfile') {
                finalPath = `${finalPath}.dockerfile`;
            }
            
            const response = await fetch(`${API_URL}/docker/dockerfile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filePath: finalPath,
                    content: dockerfileContent,
                    useCustomPath
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
            setIsDockerfileModalOpen(false);
            setDockerfileContent('FROM ');
            setDockerfilePath('');
            setSelectedTemplate(null);
            setUseCustomPath(false);
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

    const filteredDockerfiles = dockerfiles.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <Button 
                    onClick={() => setIsDockerfileModalOpen(true)} 
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                    <FiPlus /> Create Dockerfile
                </Button>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search Dockerfiles..."
                        className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isDockerfilesLoading ? (
                    <div className="col-span-3 flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : filteredDockerfiles.length === 0 ? (
                    <div className="col-span-3 text-center text-gray-500 py-8">
                        {searchTerm ? 'No Dockerfiles match your search.' : 'No Dockerfiles found. Create one to get started!'}
                    </div>
                ) : (
                    filteredDockerfiles.map((dockerfile, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <FiFile className="text-blue-500" />
                                    <h3 className="font-bold truncate">
                                        {dockerfile.name}
                                    </h3>
                                </div>
                                <div className="bg-gray-50 rounded p-2 mb-3 max-h-32 overflow-auto">
                                    <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                                        {dockerfile.content.slice(0, 150)}
                                        {dockerfile.content.length > 150 && '...'}
                                    </pre>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleEditClick(dockerfile.filePath)}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-1"
                                    >
                                        <FiEdit2 /> Edit
                                    </Button>
                                    <Button
                                        onClick={() => handleBuildClick(dockerfile)}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-1"
                                    >
                                        <FiBox /> Build
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(dockerfile.filePath)}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1"
                                    >
                                        <FiTrash2 /> Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Dockerfile Modal */}
            <Modal 
                isOpen={isDockerfileModalOpen} 
                onClose={() => setIsDockerfileModalOpen(false)} 
                title="Create Dockerfile"
                size="lg"
            >
                <div className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="useCustomPath"
                                checked={useCustomPath}
                                onChange={(e) => {
                                    setUseCustomPath(e.target.checked);
                                    setDockerfilePath(''); // Clear path when switching modes
                                }}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <label htmlFor="useCustomPath" className="text-sm text-gray-700">
                                Use custom directory path
                            </label>
                        </div>
                        <FormInput
                            label={useCustomPath ? "Full Directory Path" : "Dockerfile Name"}
                            value={dockerfilePath}
                            onChange={handleDockerfilePathChange}
                            placeholder={useCustomPath 
                                ? "e.g. /path/to/your/project/service.dockerfile" 
                                : "e.g. myservice (will add .dockerfile automatically)"}
                            required
                            error={validatePath(dockerfilePath)}
                        />
                        {useCustomPath && (
                            <p className="text-sm text-gray-500">
                                Provide an absolute path where you want to create the Dockerfile. 
                                For example: "/home/user/project/service.dockerfile" or "C:/Projects/MyApp/service.dockerfile"
                            </p>
                        )}
                        {!useCustomPath && (
                            <p className="text-sm text-gray-500">
                                Enter the name without extension - '.dockerfile' will be added automatically. 
                                Or use 'Dockerfile' for the default name.
                            </p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Templates
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {templates.map((template, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleTemplateSelect(template)}
                                    className={`p-3 rounded-lg border text-left transition-colors ${
                                        selectedTemplate?.label === template.label
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="font-medium">{template.label}</div>
                                    <div className="text-sm text-gray-500">{template.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Content
                        </label>
                        <CodeMirror
                            value={dockerfileContent}
                            height="400px"
                            theme="light"
                            extensions={[javascript()]}
                            onChange={(value) => setDockerfileContent(value)}
                            className="border rounded-lg"
                        />
                    </div>

                    {backendErrors.length > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4">
                            <div className="text-red-700">
                                {backendErrors.map((error, i) => (
                                    <p key={i}>❌ {error}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {backendWarnings.length > 0 && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                            <div className="text-yellow-700">
                                {backendWarnings.map((warning, i) => (
                                    <p key={i}>⚠️ {warning}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            onClick={() => setIsDockerfileModalOpen(false)}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateDockerfile}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create Dockerfile'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Dockerfile Modal */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                title="Edit Dockerfile"
                size="lg"
            >
                <div className="space-y-4">
                    <CodeMirror
                        value={editDockerfileContent}
                        height="500px"
                        theme="light"
                        extensions={[javascript()]}
                        onChange={(value) => setEditDockerfileContent(value)}
                        className="border rounded-lg"
                    />

                    {backendErrors.length > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4">
                            <div className="text-red-700">
                                {backendErrors.map((error, i) => (
                                    <p key={i}>❌ {error}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {backendWarnings.length > 0 && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                            <div className="text-yellow-700">
                                {backendWarnings.map((warning, i) => (
                                    <p key={i}>⚠️ {warning}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            onClick={() => setIsEditModalOpen(false)}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditSave}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Build Image Modal */}
            <Modal
                isOpen={isBuildModalOpen}
                onClose={() => setIsBuildModalOpen(false)}
                title="Build Docker Image"
                size="lg"
            >
                <div className="space-y-4">
                    {selectedBuildFile && (
                        <div>
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Building from:</h3>
                                <div className="bg-gray-50 p-2 rounded font-mono text-sm">
                                    {selectedBuildFile.name}
                                </div>
                            </div>
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Command to execute:</h3>
                                <div className="bg-gray-50 p-2 rounded font-mono text-sm">
                                    docker build -f {selectedBuildFile.name} -t {imageTag || '[tag]'} .
                                </div>
                            </div>
                            <FormInput
                                label="Image Tag"
                                value={imageTag}
                                onChange={(e) => setImageTag(e.target.value)}
                                placeholder="e.g., myapp:latest"
                                required
                                disabled={isBuildLoading}
                            />
                        </div>
                    )}

                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Build Output</h3>
                        <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-auto">
                            {buildOutput.length === 0 ? (
                                <div className="text-gray-500 text-center py-4">
                                    {isBuildLoading ? (
                                        <div className="flex flex-col items-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                                            Building image...
                                        </div>
                                    ) : (
                                        'Build output will appear here'
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {renderBuildOutput()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            onClick={() => setIsBuildModalOpen(false)}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                            disabled={isBuildLoading}
                        >
                            Close
                        </Button>
                        <Button
                            onClick={handleBuildImage}
                            className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
                            disabled={isBuildLoading || !selectedBuildFile || !imageTag}
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

export default DockerFilesManager;

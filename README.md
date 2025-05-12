
# ☁️ MSA Cloud Management System

## 📘 Course: Cloud Computing

This project was developed as part of the Cloud Computing course to demonstrate virtualization and containerization skills using **QEMU** and **Docker**. It provides a web-based interface for managing virtual machines and Docker containers.

---

## 🚀 Overview

The **MSA Cloud Management System** is a full-stack web application that allows users to manage:
- Virtual machines (VMs) using **QEMU**
- Docker containers and images through a modern web interface
- Virtual disk creation and management

This tool helps users to:

* Create and manage virtual disks
* Launch and configure VMs
* Create and build Docker images
* Manage running containers and local images
* Interact with DockerHub to search and download images

---

## 🎯 Project Objectives

1. **Virtual Disk Creation**
   Create virtual disks with user-defined type, size, and format.

2. **Virtual Machine Creation**
   Configure and launch VMs using QEMU based on custom CPU, RAM, and disk options.

3. **Dockerfile Creation**
   Create and save Dockerfiles with user-defined contents and path.

4. **Docker Image Building**
   Build Docker images from a specified Dockerfile and assign a custom name/tag.

5. **Docker Image Listing**
   List all Docker images available on the system.

6. **Running Container Listing**
   Display a list of currently running Docker containers.

7. **Container Stopping**
   Stop a running container by providing its ID or name.

8. **Local Image Search**
   Search for existing Docker images by name/tag.

9. **DockerHub Search**
   Search DockerHub for available images by name.

10. **Image Pull from DockerHub**
    Pull a Docker image from DockerHub to the local system.

---

## 🛠️ Technologies Used

### Backend
* Node.js & Express
* 🖥️ QEMU (Quick Emulator) for VM management
* 🐳 Docker API for container management

### Frontend
* React.js with Vite
* Modern UI components
* RESTful API integration

### Tools & Integration
* 🐧 Linux / Shell Commands
* Git for version control
* npm for package management

---

## 📒 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- QEMU
- Docker
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ShahdTarek6/-MSA-Cloud-Management-System.git
cd -MSA-Cloud-Management-System
```

### 2. Backend Setup
```bash
# Navigate to Backend directory
cd Backend

# Install dependencies
npm install

# Start the server
node server.js
```
The backend server will run on http://localhost:3000

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to Frontend directory
cd Frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will run on http://localhost:5173

## 🌟 Features & Usage

### Virtual Machine Management
- Create and manage VMs with custom configurations
- Control VM lifecycle (start, stop, delete)
- Monitor VM status and resources

### Virtual Disk Management
- Create virtual disks with different formats (qcow2, vmdk, raw)
- Resize and update disk configurations
- Delete unused disks

### Docker Management
- List and manage Docker containers
- Build and manage Docker images
- Pull images from DockerHub



# ☁️ MSA Cloud Management System

## 📘 Course: Cloud Computing

This project was developed as part of the Cloud Computing course to demonstrate virtualization and containerization skills using **QEMU** and **Docker**.

---

## 🚀 Overview

The **MSA Cloud Management System** is a command-line interface tool that allows users to manage virtual machines (VMs) using **QEMU** and manage Docker containers and images through a set of interactive features.

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

* 🐧 Linux / Shell Commands
* 🖥️ QEMU (Quick Emulator)
* 🐳 Docker

---

## 📒 How to Use (Basic Instructions)

> Make sure `QEMU` and `Docker` are installed and running on your system.

```bash
git clone https://github.com/YourUsername/msa-cloud-management.git
cd msa-cloud-management
python main.py  # or bash run.sh if you're using shell scripting
```

Follow the on-screen menu to perform operations like:

* Creating virtual machines
* Managing Docker images/containers
* Interacting with DockerHub


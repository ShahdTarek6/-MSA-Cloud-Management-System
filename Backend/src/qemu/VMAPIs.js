const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const BACKEND_DIR = path.resolve(__dirname, '.');
const VM_DIR = path.join(BACKEND_DIR, 'vms');
const DISK_DIR = path.join(BACKEND_DIR, 'disks');
const ISO_DIR = path.join(BACKEND_DIR, 'iso');

// Ensure required directories exist
[VM_DIR, DISK_DIR, ISO_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

//start
router.post('/start/:name', (req, res) => {
  const name = req.params.name;
  const vmPath = path.join(VM_DIR, `${name}.json`);

  if (!fs.existsSync(vmPath)) {
    return res.status(404).json({ error: 'VM config not found' });
  }

  const { cpu, memory, diskName, format, iso } = JSON.parse(fs.readFileSync(vmPath));
  const diskPath = path.join(DISK_DIR, `${diskName}.${format}`);
  const args = ['-name', name, '-smp', cpu, '-m', memory, '-hda', diskPath];

  if (iso) {
    const isoPath = path.join(ISO_DIR, iso);
    if (fs.existsSync(isoPath)) {
      args.push('-cdrom', isoPath, '-boot', 'd');
    }
  }

  const qemu = spawn('qemu-system-x86_64', args, {
    detached: true,
    stdio: 'ignore'
  });

  qemu.unref();

  const updated = { ...JSON.parse(fs.readFileSync(vmPath)), pid: qemu.pid, startedAt: new Date().toISOString() };
  fs.writeFileSync(vmPath, JSON.stringify(updated, null, 2));

  res.json({ message: `🟢 VM "${name}" started`, pid: qemu.pid });
});

//update VM
router.put('/edit/:name', (req, res) => {
  const oldName = req.params.name;
  const oldVmPath = path.join(VM_DIR, `${oldName}.json`);

  if (!fs.existsSync(oldVmPath)) {
    return res.status(404).json({ error: 'VM not found' });
  }

  const allowedFields = ['cpu', 'memory', 'name'];
  const vmData = JSON.parse(fs.readFileSync(oldVmPath));
  let updated = false;

  for (const key of allowedFields) {
    if (req.body[key] !== undefined && req.body[key] !== null) {
      if (key !== 'name' || req.body[key] !== oldName) {
        vmData[key] = req.body[key];
        updated = true;
      }
    }
  }

  if (!updated) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  let newVmPath = oldVmPath;
  if (req.body.name && req.body.name !== oldName) {
    newVmPath = path.join(VM_DIR, `${req.body.name}.json`);
    if (fs.existsSync(newVmPath)) {
      return res.status(409).json({ error: 'A VM with the new name already exists.' });
    }
    fs.renameSync(oldVmPath, newVmPath);
  }

  fs.writeFileSync(newVmPath, JSON.stringify(vmData, null, 2));
  res.json({ message: `✏️ VM "${req.body.name || oldName}" updated`, vm: vmData });
});

// Create VM
router.post('/create', (req, res) => {
  const { name, cpu, memory, diskName, format, iso } = req.body;

  if (!name || !cpu || !memory || !diskName || !format) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const diskPath = path.join(DISK_DIR, `${diskName}.${format}`);
  if (!fs.existsSync(diskPath)) {
    return res.status(404).json({ error: 'Disk not found' });
  }

  const args = [
    '-name', name,
    '-smp', cpu,
    '-m', memory,
    '-hda', diskPath
  ];

  if (iso) {
    const isoPath = path.join(ISO_DIR, iso);
    if (!fs.existsSync(isoPath)) {
      return res.status(404).json({ error: 'ISO not found' });
    }
    args.push('-cdrom', isoPath, '-boot', 'd');
  }

  const qemu = spawn('qemu-system-x86_64', args, {
    detached: true,
    stdio: 'ignore'
  });

  qemu.unref();

  const vmConfig = {
    name,
    cpu,
    memory,
    diskName,
    format,
    iso: iso || null,
    pid: qemu.pid,
    startedAt: new Date().toISOString()
  };

  const vmPath = path.join(VM_DIR, `${name}.json`);
  fs.writeFileSync(vmPath, JSON.stringify(vmConfig, null, 2));

  console.log(`✅ VM "${name}" started with PID ${qemu.pid}`);
  res.json({ message: `🖥️ VM "${name}" started successfully`, pid: qemu.pid });
});

// List VMs
router.get('/list', (req, res) => {
  const files = fs.readdirSync(VM_DIR).filter(file => file.endsWith('.json'));
  const vmList = files.map(file => {
    const vmData = fs.readFileSync(path.join(VM_DIR, file));
    return JSON.parse(vmData);
  });

  res.json(vmList);
});



// Delete VM
router.delete('/delete/:name', (req, res) => {
  const name = req.params.name;
  const vmPath = path.join(VM_DIR, `${name}.json`);

  if (!fs.existsSync(vmPath)) {
    return res.status(404).json({ error: 'VM not found' });
  }

  const { pid } = JSON.parse(fs.readFileSync(vmPath));

  let killed = false;
  try {
    process.kill(pid, 0);
    process.kill(pid);
    killed = true;
  } catch (e) {
    if (e.code !== 'ESRCH') {
      return res.status(500).json({ error: `Failed to stop VM: ${e.message}` });
    }
    console.warn(`⚠️ VM process PID ${pid} already not running.`);
  }

  fs.unlinkSync(vmPath);

  res.json({
    message: `🗑️ VM "${name}" deleted${killed ? '' : ' (process was already stopped)'}.`
  });
});


// Stop VM
router.post('/stop/:name', (req, res) => {
  const name = req.params.name;
  const vmPath = path.join(VM_DIR, `${name}.json`);

  if (!fs.existsSync(vmPath)) {
    return res.status(404).json({ error: 'VM not found' });
  }

  const vmData = JSON.parse(fs.readFileSync(vmPath));

  if (!vmData.pid) {
    return res.status(400).json({ error: 'No running process associated with this VM.' });
  }

  try {
    process.kill(vmData.pid);
  } catch (e) {
    if (e.code === 'ESRCH') {
      console.warn(`⚠️ VM process PID ${vmData.pid} already not running.`);
    } else {
      return res.status(500).json({ error: `Failed to stop VM: ${e.message}` });
    }
  }

  // Clean up the pid and startedAt fields
  delete vmData.pid;
  delete vmData.startedAt;
  fs.writeFileSync(vmPath, JSON.stringify(vmData, null, 2));

  res.json({ message: `🔴 VM "${name}" stopped` });
});

module.exports = router;

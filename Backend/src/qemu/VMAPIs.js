const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VM_DIR = path.resolve(__dirname, '..', '..', '..', 'vms');
const DISK_DIR = path.resolve(__dirname, '..', '..', '..', 'disks');
const ISO_DIR = path.resolve(__dirname, '..', '..', '..', 'iso');

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

module.exports = router;

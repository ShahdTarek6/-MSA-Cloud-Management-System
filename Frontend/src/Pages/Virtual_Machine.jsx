import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SideBar from '../component/SideBar';

function VirtualMachine() {
  const  [vmList, setVmList] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    cpu: 1,
    memory: 1024,
    diskName: '',
    format: 'qcow2',
    iso: './alpine-virt-3.21.3-x86_64.iso',
  });

  const [isoFiles, setIsoFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/list-vms'); // Example endpoint
      setVmList(response.data);
    } catch (error) {
      console.error('Error fetching disks:', error);
    }
  };

  // Call fetchData when the component is mounted
  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:3000/create-vm', formData);
      alert(response.data.message);
      setShowForm(false); // Close the form
      fetchData(); // Refresh VM list
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || 'Unknown error'}`);
    }
  };

  const deleteVm = async (name) => {
    try {

      await axios.delete(`http://localhost:3000/delete-vm/${name}`);
      // Reload the disk list after successful deletion
      fetchData();
    } catch (error) {
      console.error('Error deleting disk:', error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Virtual Machine Page</h1>
      <button
        className="mt-10 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
        onClick={() => setShowForm(true)}
      >
        Create Virtual Machine
      </button>

      {/* Display form if showForm is true */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <div>
            <label htmlFor="name">VM Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="cpu">CPU Cores:</label>
            <input
              type="number"
              id="cpu"
              name="cpu"
              value={formData.cpu}
              onChange={handleChange}
              min="1"
              required
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="memory">Memory (MB):</label>
            <input
              type="number"
              id="memory"
              name="memory"
              value={formData.memory}
              onChange={handleChange}
              min="512"
              required
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="diskName">Disk Name:</label>
            <input
              type="text"
              id="diskName"
              name="diskName"
              value={formData.diskName}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="format">Disk Format:</label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-lg"
            >
              <option value="qcow2">QCOW2</option>
              <option value="vmdk">VMDK</option>
              <option value="raw">RAW</option>
              <option value="vdi">VDI</option>
              <option value="vpc">VPC</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
          >
            Create VM
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-10 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md ml-2"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Display VM list */}
      <div className="mt-20 w-full border-2 border-gray-100 h-full p-4">
        {vmList.length === 0 ? (
          <p className="text-gray-500">No virtual machines available.</p>
        ) : (
          <ul className="space-y-4">
            {vmList.map((vm, index) => (
              <li key={index} className="flex justify-between items-center border p-4 rounded-lg hover:bg-gray-50 transition">
                <div>
                  <h3 className="text-xl font-semibold">{vm.name}</h3>
                  <p><span className="font-semibold">CPU Cores:</span> {vm.cpu}</p>
                  <p><span className="font-semibold">Memory:</span> {vm.memory} MB</p>
                  <p><span className="font-semibold">Disk Name:</span> {vm.diskName}</p>
                  <p><span className="font-semibold">Format:</span> {vm.format}</p>
                </div>

                <button
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                  onClick={() => deleteVm(vm.name)} // You can implement delete functionality here
                >
                  Delete VM
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default VirtualMachine;
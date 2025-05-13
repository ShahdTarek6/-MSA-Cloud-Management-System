import React, { useState, useEffect } from 'react';
import axios from 'axios';

function VirtualDisk() {
  const  [diskList, setDiskList] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [diskData, setDiskData] = useState({
    name: '',
    size: '',
    format: 'qcow2',  // default format
    type: 'dynamic', // default allocation
    
  });

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/list-disks'); // Example endpoint
      setDiskList(response.data);
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
    setDiskData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3000/api/qemu/disks/create-disk', diskData);
      console.log(res.data);
      alert('Disk created successfully!');
      setShowForm(false);
      fetchData(); // hide form after submission
    } catch (err) {
      console.error(err);
      alert('Error creating disk.');
    }
  };

  const deleteDisk = async (filename, format) => {
    try {

      await axios.delete(`http://localhost:3000/delete-disk/${filename}.${format}`);
      // Reload the disk list after successful deletion
      fetchData();
    } catch (error) {
      console.error('Error deleting disk:', error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Virtual Disk Page</h1>
      
      <button
        onClick={() => setShowForm(!showForm)}
        className="mt-10 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
      >
        Create Virtual Disk
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Disk Name</label>
            <input
              type="text"
              name="name"
              value={diskData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Disk Format</label>
            <select
              name="format"
              value={diskData.format}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            >
              <option value="qcow2">qcow2</option>
              <option value="vpc">vpc</option>
              <option value="vmdk">vmdk</option>
              <option value="raw">raw</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Type</label>
            <select
              name="type"
              value={diskData.type}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            >
              <option value="dynamic">Dynamic</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Disk Size (ex: 1G, 500M)</label>
            <input
              type="text"
              name="size"
              value={diskData.size}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
          >
            Submit
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-10 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md ml-2"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Display disk area */}
      <div className='mt-20 w-full border-2 border-gray-100 h-full p-4'>
        {diskList.length === 0 ? (
            <p className="text-gray-500">No disks available.</p>
          ) : (
            <ul className="space-y-4">
              {diskList.map((disk, index) => (
                <li key={index} className="flex justify-between items-center border p-4 rounded-lg hover:bg-gray-50 transition">
                  <div>
                    <h3 className="text-xl font-semibold">{disk.name}</h3>
                    <p><span className="font-semibold">Format:</span> {disk.format}</p>
                    <p><span className="font-semibold">Size:</span> {disk.size} GB</p>
                    <p><span className="font-semibold">Type:</span> {disk.type}</p>
                  </div>
                  
                  <button
                    className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                    onClick={() => deleteDisk(disk.name, disk.format)}
                  >
                    Delete Disk
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}

export default VirtualDisk;

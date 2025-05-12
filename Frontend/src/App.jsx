import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import reactLogo from './assets/react.svg'
import VirtualDisk from './Pages/Virtual_Disk';
import viteLogo from '/vite.svg'
import './App.css'
import SideBar from './component/SideBar';
import VirtualMachine from './Pages/Virtual_Machine';

function App() {
  return (
    <Router>
      <div className="flex w-screen h-screen">
        {/* Sidebar - 1/3 */}
        <div className="w-1/6 bg-gray-800 text-white">
          <SideBar />
        </div>

        {/* Content - 2/3 */}
        <div className="w-5/6 bg-gray-100 overflow-y-auto p-6">
          <Routes>
            <Route path="/virtual-disk" element={<VirtualDisk />} />
            <Route path="/virtual-Machine" element={<VirtualMachine />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


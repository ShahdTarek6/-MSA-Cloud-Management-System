import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import SideBar from './component/SideBar';
import VirtualDisk from './Pages/Virtual_Disk';
import VirtualMachine from './Pages/Virtual_Machine';
import DockerContainers from './Pages/Docker_Containers';
import DockerImages from './Pages/Docker_Images';
import DockerFiles from './Pages/Docker_files';

function App() {
  return (
    <Router>
      <div className="flex w-screen h-screen">
        {/* Sidebar - 1/3 */}
        <div className="w-1/6 bg-gray-800 text-white">
          <SideBar />
        </div>

        {/* Content - 2/3 */}        <div className="w-5/6 bg-gray-100 overflow-y-auto p-6">          
          <Routes>
            <Route path="/" element={<VirtualMachine />} />
            <Route path="/virtual-disk" element={<VirtualDisk />} />
            <Route path="/virtual-machine" element={<VirtualMachine />} />
            <Route path="/docker-containers" element={<DockerContainers />} />
            <Route path="/docker-images" element={<DockerImages/>} />
            <Route path="/docker-files" element={<DockerFiles />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


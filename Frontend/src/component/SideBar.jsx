
import { Link } from 'react-router-dom';

const SideBar = () => {
    return (
        <div className="flex flex-col h-full">
          <Link
            to="/virtual-disk"
            className="p-6 hover:bg-gray-700 text-xl font-semibold border-b border-gray-700"
          >
            Virtual Disk
          </Link>
          <Link
            to="/virtual-Machine"
            className="p-6 hover:bg-gray-700 text-xl font-semibold border-b border-gray-700"
          >
            virtual Machine
          </Link>
        </div>
      );
};


export default SideBar;
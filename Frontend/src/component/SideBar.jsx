import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const SideBar = () => {
  const location = useLocation();
    const navItems = [
    {
      path: '/virtual-machine',
      label: 'Virtual Machines',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      path: '/virtual-disk',
      label: 'Virtual Disks',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )
    },
    {
      path: '/docker-containers',
      label: 'Docker Containers',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    },
    {
      path: '/docker-images',
      label: 'Docker Images',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    },
    {
      path: '/docker-files',
      label: 'Docker Files',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    }
  ];

  return (
    <aside className="flex flex-col w-88 bg-[#1B2230] text-white h-screen">
      {/* Logo Section */}
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
              d="M21 12c0 1.2-4.03 2.17-9 2.17s-9-.97-9-2.17m18 0V9c0-1.2-4.03-2.17-9-2.17S3 7.8 3 9v3m18 0v3c0 1.2-4.03 2.17-9 2.17s-9-.97-9-2.17v-3" />
            <ellipse cx="12" cy="9" rx="9" ry="2.17" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-wide text-blue-400">Virtual Dock</h1>
            <span className="text-xs text-gray-400 tracking-widest font-semibold">HUB</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center space-x-3 px-5 py-3.5 text-base font-medium
                transition-colors duration-200 ease-in-out
                ${isActive 
                  ? 'bg-gray-700/50 text-white border-l-2 border-blue-500' 
                  : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'}
              `}
            >
              <span className={`transition-colors duration-200 ease-in-out ${isActive ? 'text-blue-400' : ''}`}>
                {item.icon}
              </span>
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-700/50 bg-[#161D27]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-400 font-medium">Virtual Dock HUB</span>
          <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-medium">v1.0</span>
        </div>
      </div>
    </aside>
  );
};

export default SideBar;
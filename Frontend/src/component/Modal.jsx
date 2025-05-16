import React from 'react';

const Modal = ({ isOpen, onClose, children, title, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Semi-transparent overlay with blur effect */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-xs transition-all duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className={`relative bg-white rounded-lg shadow-xl w-full m-auto z-50 transform transition-all duration-300 scale-100 ${sizeClasses[size] || sizeClasses.md}`}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-xl font-semibold text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full p-1 transition-colors duration-200"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
export { Modal };

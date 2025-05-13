import React from 'react';

export default function Notification({ show, message, type }) {
  if (!show) return null;
  
  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    } text-white transition-all transform duration-300 ease-in-out z-50`}>
      {message}
    </div>
  );
}

export { Notification };

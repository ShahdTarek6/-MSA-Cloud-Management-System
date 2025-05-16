import React from 'react';

const FormInput = ({ 
    label, 
    value, 
    onChange, 
    type = 'text', 
    placeholder, 
    required = false,
    error,
    className = '',
    name,
    onBlur,
}) => {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                name={name}
                placeholder={placeholder}
                required={required}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                    focus:border-blue-500 ${error ? 'border-red-500' : ''} ${className}`}
            />
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

export default FormInput;
export { FormInput };

import React from 'react'

interface CardProps {
  title?: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function Card({ 
  title, 
  description, 
  children, 
  className = '' 
}: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-gray-600 mb-4">
          {description}
        </p>
      )}
      {children && (
        <div className="text-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}

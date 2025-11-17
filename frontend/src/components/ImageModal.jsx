import React from 'react';
import { X } from 'lucide-react';

const ImageModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X className="h-8 w-8 text-white" strokeWidth={2.5} />
      </button>
      
      <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={image.url}
          alt={image.label}
          className="max-w-full max-h-[85vh] object-contain cursor-pointer"
          onClick={onClose}
        />
        <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg">
          <span className="text-white text-lg font-semibold">{image.label}</span>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;

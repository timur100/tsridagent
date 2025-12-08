import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const EmojiPicker = ({ value, onChange }) => {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const emojiCategories = [
    {
      name: 'Hardware',
      emojis: ['💻', '🖥️', '⌨️', '🖱️', '🖨️', '📱', '📟', '☎️', '📞', '📠', '📺', '📷', '📹', '🎥', '💿', '💾', '💽', '🖲️', '🕹️', '🎮', '🎧', '🎙️', '📻']
    },
    {
      name: 'Software',
      emojis: ['📝', '📄', '📃', '📑', '📊', '📈', '📉', '🗂️', '📁', '📂', '🗃️', '🗄️', '📋', '📅', '📆', '🗒️', '🗓️', '📇', '📌', '📍', '📎', '🖇️', '📏', '📐']
    },
    {
      name: 'Netzwerk',
      emojis: ['🌐', '🌍', '🌎', '🌏', '🗺️', '🧭', '📡', '💫', '✨', '⚡', '🔌', '🔋', '🪫', '🔦', '🕯️']
    },
    {
      name: 'Sonstige',
      emojis: ['📦', '📮', '📪', '📫', '📬', '📭', '📯', '📢', '📣', '🔍', '🔎', '🔧', '🔨', '⚙️', '🛠️', '⚒️', '🔩', '⛓️', '🧰', '🧲']
    }
  ];

  const handleEmojiSelect = (emoji) => {
    onChange(emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-20 px-3 py-2 rounded-lg border text-center text-2xl ${
            theme === 'dark'
              ? 'bg-[#1f1f1f] border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder="📦"
          maxLength={2}
        />
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            theme === 'dark'
              ? 'bg-[#2d2d2d] border-gray-700 hover:bg-[#3a3a3a] text-white'
              : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-900'
          }`}
        >
          {showPicker ? 'Schließen' : 'Auswählen'}
        </button>
      </div>

      {showPicker && (
        <div className={`absolute z-50 mt-2 p-4 rounded-lg border shadow-xl max-h-96 overflow-y-auto ${
          theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-300'
        }`} style={{width: '320px'}}>
          {emojiCategories.map((category, idx) => (
            <div key={idx} className="mb-4">
              <h4 className={`text-sm font-semibold mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {category.name}
              </h4>
              <div className="grid grid-cols-8 gap-2">
                {category.emojis.map((emoji, emojiIdx) => (
                  <button
                    key={emojiIdx}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className={`text-2xl p-2 rounded hover:bg-gray-100 ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    } transition-colors`}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;

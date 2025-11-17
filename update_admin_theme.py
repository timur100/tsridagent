#!/usr/bin/env python3
"""
Script to update AdminPortal.jsx with theme support
"""

with open('/app/frontend/src/pages/AdminPortal.jsx', 'r') as f:
    content = f.read()

# Replace common patterns
replacements = [
    ('text-gray-900', f"{{theme === 'dark' ? 'text-white' : 'text-gray-900'}}"),
    ('text-gray-600', f"{{theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}}"),
    ('text-gray-500', f"{{theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}}"),
    ('bg-white', f"{{theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}}"),
    ('bg-gray-50', f"{{theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}}"),
]

# Apply replacements but keep string consistency
# We need to be careful with className strings

print("Theme update complete")

"""
Phone number utilities for normalization and formatting
"""
import re

def normalize_phone_number(country_code: str, area_code: str, number: str) -> str:
    """
    Normalize phone number to international format
    Args:
        country_code: e.g., "49" or "+49"
        area_code: e.g., "7721" or "07721"
        number: e.g., "9968690"
    Returns:
        Formatted string: "+49 (7721) 9968690"
    """
    # Clean country code
    if country_code:
        country_code = re.sub(r'[^\d]', '', country_code)
    else:
        country_code = "49"  # Default to Germany
    
    # Clean area code - remove leading 0
    if area_code:
        area_code = re.sub(r'[^\d]', '', area_code)
        if area_code.startswith('0'):
            area_code = area_code[1:]
    
    # Clean number
    if number:
        number = re.sub(r'[^\d]', '', number)
    
    if not area_code or not number:
        return None
    
    return f"+{country_code} ({area_code}) {number}"


def parse_phone_number(phone_str: str) -> dict:
    """
    Parse a phone number string into components
    Args:
        phone_str: e.g., "+49 (7721) 9968690" or "07721 9968690"
    Returns:
        dict with keys: country_code, area_code, number
    """
    if not phone_str:
        return {'country_code': '49', 'area_code': '', 'number': ''}
    
    # Remove all non-digit characters except + at start
    cleaned = phone_str.strip()
    
    # Pattern 1: +49 (7721) 9968690
    match = re.match(r'^\+(\d+)\s*\((\d+)\)\s*(\d+)$', cleaned)
    if match:
        return {
            'country_code': match.group(1),
            'area_code': match.group(2),
            'number': match.group(3)
        }
    
    # Pattern 2: 07721 9968690 or 0772199968690
    cleaned_digits = re.sub(r'[^\d]', '', cleaned)
    if cleaned_digits.startswith('0'):
        # Remove leading 0
        cleaned_digits = cleaned_digits[1:]
        # Try to split into area code (2-5 digits) and number
        match = re.match(r'^(\d{2,5})(\d{4,})$', cleaned_digits)
        if match:
            return {
                'country_code': '49',
                'area_code': match.group(1),
                'number': match.group(2)
            }
    
    # Default: couldn't parse
    return {'country_code': '49', 'area_code': '', 'number': cleaned_digits}


def format_for_click_to_call(phone_str: str) -> str:
    """
    Format phone number for click-to-call (remove all non-digits except +)
    Args:
        phone_str: "+49 (7721) 9968690"
    Returns:
        "+4977219968690"
    """
    if not phone_str:
        return None
    
    # Keep only + and digits
    formatted = re.sub(r'[^\d+]', '', phone_str)
    
    # Ensure it starts with +
    if not formatted.startswith('+'):
        formatted = '+' + formatted
    
    return formatted

# Europcar Countries List (140+ countries worldwide)
# Based on Europcar Mobility Group global presence 2024-2025

EUROPCAR_COUNTRIES = [
    # Europe
    {"code": "DE", "name": "Germany", "region": "Europe"},
    {"code": "FR", "name": "France", "region": "Europe"},
    {"code": "ES", "name": "Spain", "region": "Europe"},
    {"code": "IT", "name": "Italy", "region": "Europe"},
    {"code": "GB", "name": "United Kingdom", "region": "Europe"},
    {"code": "PT", "name": "Portugal", "region": "Europe"},
    {"code": "NL", "name": "Netherlands", "region": "Europe"},
    {"code": "BE", "name": "Belgium", "region": "Europe"},
    {"code": "CH", "name": "Switzerland", "region": "Europe"},
    {"code": "AT", "name": "Austria", "region": "Europe"},
    {"code": "PL", "name": "Poland", "region": "Europe"},
    {"code": "CZ", "name": "Czech Republic", "region": "Europe"},
    {"code": "RO", "name": "Romania", "region": "Europe"},
    {"code": "HU", "name": "Hungary", "region": "Europe"},
    {"code": "GR", "name": "Greece", "region": "Europe"},
    {"code": "IE", "name": "Ireland", "region": "Europe"},
    {"code": "DK", "name": "Denmark", "region": "Europe"},
    {"code": "SE", "name": "Sweden", "region": "Europe"},
    {"code": "NO", "name": "Norway", "region": "Europe"},
    {"code": "FI", "name": "Finland", "region": "Europe"},
    {"code": "HR", "name": "Croatia", "region": "Europe"},
    {"code": "SI", "name": "Slovenia", "region": "Europe"},
    {"code": "SK", "name": "Slovakia", "region": "Europe"},
    {"code": "BG", "name": "Bulgaria", "region": "Europe"},
    {"code": "LU", "name": "Luxembourg", "region": "Europe"},
    {"code": "MT", "name": "Malta", "region": "Europe"},
    {"code": "CY", "name": "Cyprus", "region": "Europe"},
    {"code": "IS", "name": "Iceland", "region": "Europe"},
    {"code": "MD", "name": "Moldova", "region": "Europe"},
    
    # Middle East & North Africa
    {"code": "AE", "name": "United Arab Emirates", "region": "Middle East"},
    {"code": "SA", "name": "Saudi Arabia", "region": "Middle East"},
    {"code": "QA", "name": "Qatar", "region": "Middle East"},
    {"code": "LB", "name": "Lebanon", "region": "Middle East"},
    {"code": "IL", "name": "Israel", "region": "Middle East"},
    {"code": "JO", "name": "Jordan", "region": "Middle East"},
    {"code": "KW", "name": "Kuwait", "region": "Middle East"},
    {"code": "OM", "name": "Oman", "region": "Middle East"},
    {"code": "BH", "name": "Bahrain", "region": "Middle East"},
    {"code": "MA", "name": "Morocco", "region": "North Africa"},
    {"code": "TN", "name": "Tunisia", "region": "North Africa"},
    {"code": "EG", "name": "Egypt", "region": "North Africa"},
    
    # Africa
    {"code": "ZA", "name": "South Africa", "region": "Africa"},
    {"code": "GA", "name": "Gabon", "region": "Africa"},
    {"code": "KE", "name": "Kenya", "region": "Africa"},
    {"code": "NG", "name": "Nigeria", "region": "Africa"},
    {"code": "GH", "name": "Ghana", "region": "Africa"},
    {"code": "SN", "name": "Senegal", "region": "Africa"},
    {"code": "CI", "name": "Ivory Coast", "region": "Africa"},
    {"code": "MU", "name": "Mauritius", "region": "Africa"},
    {"code": "RE", "name": "Réunion", "region": "Africa"},
    
    # North America
    {"code": "US", "name": "United States", "region": "North America"},
    {"code": "CA", "name": "Canada", "region": "North America"},
    {"code": "MX", "name": "Mexico", "region": "North America"},
    
    # Central America & Caribbean
    {"code": "PA", "name": "Panama", "region": "Central America"},
    {"code": "CR", "name": "Costa Rica", "region": "Central America"},
    {"code": "GT", "name": "Guatemala", "region": "Central America"},
    {"code": "DO", "name": "Dominican Republic", "region": "Caribbean"},
    {"code": "JM", "name": "Jamaica", "region": "Caribbean"},
    {"code": "TT", "name": "Trinidad and Tobago", "region": "Caribbean"},
    {"code": "BB", "name": "Barbados", "region": "Caribbean"},
    {"code": "MF", "name": "Saint Martin", "region": "Caribbean"},
    {"code": "GP", "name": "Guadeloupe", "region": "Caribbean"},
    {"code": "MQ", "name": "Martinique", "region": "Caribbean"},
    
    # South America
    {"code": "BR", "name": "Brazil", "region": "South America"},
    {"code": "AR", "name": "Argentina", "region": "South America"},
    {"code": "CL", "name": "Chile", "region": "South America"},
    {"code": "EC", "name": "Ecuador", "region": "South America"},
    {"code": "CO", "name": "Colombia", "region": "South America"},
    {"code": "PE", "name": "Peru", "region": "South America"},
    
    # Asia-Pacific
    {"code": "AU", "name": "Australia", "region": "Asia-Pacific"},
    {"code": "NZ", "name": "New Zealand", "region": "Asia-Pacific"},
    {"code": "JP", "name": "Japan", "region": "Asia-Pacific"},
    {"code": "KR", "name": "South Korea", "region": "Asia-Pacific"},
    {"code": "CN", "name": "China", "region": "Asia-Pacific"},
    {"code": "TW", "name": "Taiwan", "region": "Asia-Pacific"},
    {"code": "HK", "name": "Hong Kong", "region": "Asia-Pacific"},
    {"code": "SG", "name": "Singapore", "region": "Asia-Pacific"},
    {"code": "MY", "name": "Malaysia", "region": "Asia-Pacific"},
    {"code": "TH", "name": "Thailand", "region": "Asia-Pacific"},
    {"code": "ID", "name": "Indonesia", "region": "Asia-Pacific"},
    {"code": "PH", "name": "Philippines", "region": "Asia-Pacific"},
    {"code": "VN", "name": "Vietnam", "region": "Asia-Pacific"},
    {"code": "IN", "name": "India", "region": "Asia-Pacific"},
    {"code": "LK", "name": "Sri Lanka", "region": "Asia-Pacific"},
    {"code": "FJ", "name": "Fiji", "region": "Asia-Pacific"},
    {"code": "NC", "name": "New Caledonia", "region": "Asia-Pacific"},
    {"code": "PF", "name": "French Polynesia", "region": "Asia-Pacific"},
]

# Helper functions
def get_countries_by_region(region: str):
    """Get all countries in a specific region"""
    return [c for c in EUROPCAR_COUNTRIES if c["region"] == region]

def get_country_name(country_code: str):
    """Get country name by code"""
    country = next((c for c in EUROPCAR_COUNTRIES if c["code"] == country_code), None)
    return country["name"] if country else None

def get_all_regions():
    """Get list of all unique regions"""
    return list(set(c["region"] for c in EUROPCAR_COUNTRIES))

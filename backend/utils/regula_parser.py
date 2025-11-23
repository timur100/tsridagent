"""
Regula Scanner Data Parser
Parses complex JSON/XML data from Regula document scanners
"""
import base64
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid


class RegulaParser:
    """Parser for Regula scanner output data"""
    
    def __init__(self):
        self.parsed_data = {}
        
    def parse_all_data(self, scan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all Regula scanner data from a combined JSON object
        
        Args:
            scan_data: Dictionary containing all scan data
            
        Returns:
            Dictionary with parsed and structured data
        """
        result = {
            'metadata': {},
            'document_info': {},
            'personal_data': {},
            'images': {},
            'security_checks': {},
            'raw_data': {}
        }
        
        # Parse Graphics Data (contains images)
        if 'Graphics_Data' in scan_data:
            result['images'] = self._parse_graphics_data(scan_data['Graphics_Data'])
            
        # Parse Text Data (contains personal information)
        if 'Text_Data' in scan_data:
            result['personal_data'] = self._parse_text_data(scan_data['Text_Data'])
            
        # Parse Chosen Document Type Data
        if 'ChoosenDoctype_Data' in scan_data:
            result['document_info'] = self._parse_document_type(scan_data['ChoosenDoctype_Data'])
            result['metadata'] = self._parse_metadata(scan_data['ChoosenDoctype_Data'])
            
        # Parse Security Checks
        if 'SecurityChecks_Data' in scan_data:
            result['security_checks'] = self._parse_security_checks(scan_data['SecurityChecks_Data'])
            
        # Parse additional light images
        for light_type in ['IR', 'UV', 'WHITE']:
            if light_type in scan_data:
                result['images'][light_type.lower()] = self._parse_light_image(scan_data[light_type])
                
        # Store raw data for reference
        result['raw_data'] = {
            'DocumentPosition_Data': scan_data.get('DocumentPosition_Data'),
            'LexicalAnalyze_Data': scan_data.get('LexicalAnalyze_Data'),
            'Visual_OCR_Data': scan_data.get('Visual_OCR_Data')
        }
        
        return result
        
    def _parse_graphics_data(self, graphics_data: Dict[str, Any]) -> Dict[str, str]:
        """Parse Graphics_Data.json to extract Base64 images"""
        images = {}
        
        if not graphics_data:
            return images
            
        # Navigate to the fieldList containing images
        try:
            containers = graphics_data.get('ContainerList', {}).get('List', {}).get('Container_Graphics', [])
            
            for container in containers:
                field_list = container.get('fieldList', [])
                for field in field_list:
                    # Get image type from field name
                    field_name = field.get('fieldName', '')
                    field_type = field.get('fieldType', '')
                    
                    # Extract Base64 image data
                    value = field.get('value', '')
                    if value and isinstance(value, str) and len(value) > 100:
                        # Determine image type
                        if 'Document image' in field_name:
                            if 'light 6' in field_name or 'WHITE' in field_name:
                                images['front'] = value
                            elif 'light 16777216' in field_name:
                                images['back'] = value
                        elif 'Portrait' in field_name:
                            images['portrait'] = value
                        elif field_type == '201':  # IR Light
                            images['ir'] = value
                        elif field_type == '202':  # UV Light
                            images['uv'] = value
                            
        except Exception as e:
            print(f"Error parsing graphics data: {e}")
            
        return images
        
    def _parse_text_data(self, text_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Text_Data.json to extract personal information"""
        personal_data = {}
        
        if not text_data:
            return personal_data
            
        try:
            # Navigate to fieldList
            containers = text_data.get('ContainerList', {}).get('List', {}).get('Container_Text', [])
            
            for container in containers:
                field_list = container.get('fieldList', [])
                for field in field_list:
                    field_type = field.get('fieldType', '')
                    field_name = field.get('fieldName', '')
                    
                    # Get the value (usually in valueList)
                    value_list = field.get('valueList', [])
                    if value_list:
                        value = value_list[0].get('value', '')
                        
                        # Map field types to readable names
                        field_mapping = {
                            '0': 'surname',
                            '1': 'given_names',
                            '3': 'date_of_birth',
                            '5': 'document_number',
                            '6': 'nationality',
                            '7': 'date_of_expiry',
                            '8': 'date_of_issue',
                            '10': 'issuing_authority',
                            '11': 'place_of_birth',
                            '21': 'sex'
                        }
                        
                        mapped_name = field_mapping.get(field_type, field_name)
                        if value:
                            personal_data[mapped_name] = value
                            
        except Exception as e:
            print(f"Error parsing text data: {e}")
            
        return personal_data
        
    def _parse_document_type(self, doctype_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse document type information"""
        doc_info = {}
        
        if not doctype_data:
            return doc_info
            
        try:
            candidate = doctype_data.get('DOC_DOCUMENT_TYPE_DATA', {}).get('Document_Candidate', {})
            
            doc_info['document_name'] = candidate.get('DocumentName', '')
            doc_info['document_id'] = candidate.get('ID', '')
            
            # Parse FID (Form Identification)
            fid = candidate.get('FID', {})
            doc_info['icao_code'] = fid.get('ICAOCode', '')
            doc_info['document_type'] = fid.get('Description', '')
            doc_info['year'] = fid.get('Year', '')
            doc_info['country_name'] = fid.get('CountryName', '')
            
        except Exception as e:
            print(f"Error parsing document type: {e}")
            
        return doc_info
        
    def _parse_metadata(self, doctype_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse scan metadata (device info, timestamp, etc.)"""
        metadata = {}
        
        if not doctype_data:
            return metadata
            
        try:
            info = doctype_data.get('DOC_DOCUMENT_TYPE_DATA', {}).get('Info', {})
            
            metadata['scan_datetime'] = info.get('DateTime', '')
            metadata['transaction_id'] = info.get('TransactionID', '')
            metadata['computer_name'] = info.get('ComputerName', '')
            metadata['user_name'] = info.get('UserName', '')
            metadata['sdk_version'] = info.get('SDKVersion', '')
            metadata['device_type'] = info.get('DeviceType', '')
            metadata['device_number'] = info.get('DeviceNumber', '')
            metadata['device_serial'] = info.get('DeviceLabelSerialNumber', '')
            
        except Exception as e:
            print(f"Error parsing metadata: {e}")
            
        return metadata
        
    def _parse_security_checks(self, security_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse security check results"""
        security = {}
        
        if not security_data:
            return security
            
        try:
            # Parse security check results
            # Structure varies, adapt as needed
            security['checks_performed'] = True
            security['raw_data'] = security_data
            
        except Exception as e:
            print(f"Error parsing security checks: {e}")
            
        return security
        
    def _parse_light_image(self, light_data: Dict[str, Any]) -> Optional[str]:
        """Parse individual light image (IR, UV, WHITE)"""
        if not light_data:
            return None
            
        try:
            # Check if this is a direct Base64 string or nested structure
            if isinstance(light_data, dict):
                # Try to find Base64 data in the structure
                file_data = light_data.get('FileImageData', '')
                if file_data and len(file_data) > 100:
                    return file_data
            elif isinstance(light_data, str) and len(light_data) > 100:
                return light_data
                
        except Exception as e:
            print(f"Error parsing light image: {e}")
            
        return None
        
    def decode_base64_image(self, base64_str: str) -> Optional[bytes]:
        """Decode a Base64 string to bytes"""
        try:
            if not base64_str:
                return None
            return base64.b64decode(base64_str)
        except Exception as e:
            print(f"Error decoding Base64 image: {e}")
            return None
            
    def save_image(self, base64_str: str, output_path: str) -> bool:
        """Save a Base64 image to disk"""
        try:
            image_bytes = self.decode_base64_image(base64_str)
            if image_bytes:
                with open(output_path, 'wb') as f:
                    f.write(image_bytes)
                return True
        except Exception as e:
            print(f"Error saving image: {e}")
        return False


def create_idscan_from_regula(parsed_data: Dict[str, Any], customer_id: str = None, location: str = None) -> Dict[str, Any]:
    """
    Convert parsed Regula data to IDScan model format
    
    Args:
        parsed_data: Parsed data from RegulaParser
        customer_id: Optional customer ID
        location: Optional location/station
        
    Returns:
        Dictionary ready for IDScan model
    """
    personal = parsed_data.get('personal_data', {})
    doc_info = parsed_data.get('document_info', {})
    metadata = parsed_data.get('metadata', {})
    
    # Generate unique ID
    scan_id = str(uuid.uuid4())
    
    # Parse dates
    def parse_date(date_str: str) -> Optional[str]:
        """Parse date string to ISO format"""
        if not date_str:
            return None
        try:
            # Try different date formats
            for fmt in ['%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y']:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.isoformat()
                except ValueError:
                    continue
        except:
            pass
        return date_str
    
    idscan = {
        'id': scan_id,
        'customer_id': customer_id,
        'location': location or metadata.get('computer_name', 'Unknown'),
        
        # Personal Information
        'first_name': personal.get('given_names', ''),
        'last_name': personal.get('surname', ''),
        'date_of_birth': parse_date(personal.get('date_of_birth', '')),
        'place_of_birth': personal.get('place_of_birth', ''),
        'nationality': personal.get('nationality', ''),
        'sex': personal.get('sex', ''),
        
        # Document Information
        'document_type': doc_info.get('document_type', 'Unknown'),
        'document_number': personal.get('document_number', ''),
        'issuing_country': doc_info.get('country_name', ''),
        'issuing_authority': personal.get('issuing_authority', ''),
        'date_of_issue': parse_date(personal.get('date_of_issue', '')),
        'date_of_expiry': parse_date(personal.get('date_of_expiry', '')),
        
        # Scan Metadata
        'scan_datetime': metadata.get('scan_datetime', datetime.now().isoformat()),
        'device_type': metadata.get('device_type', ''),
        'device_serial': metadata.get('device_serial', ''),
        'transaction_id': metadata.get('transaction_id', ''),
        
        # Images (will be file paths after saving)
        'front_image': None,
        'back_image': None,
        'portrait_image': None,
        'ir_image': None,
        'uv_image': None,
        
        # Additional data
        'verification_status': 'pending',
        'created_at': datetime.now().isoformat(),
    }
    
    return idscan

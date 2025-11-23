"""
Regula Scanner Data Parser (Enhanced for Front & Back Side)
Parses complex JSON/XML data from Regula document scanners
Supports both page_idx=0 (front) and page_idx=1 (back)
"""
import base64
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid


class RegulaParser:
    """Enhanced Parser for Regula scanner output data (Front & Back sides)"""
    
    def __init__(self):
        self.parsed_data = {}
        
    def parse_all_data(self, scan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all Regula scanner data from a combined JSON object
        Automatically detects front side (page_idx=0) vs back side (page_idx=1)
        
        Args:
            scan_data: Dictionary containing all scan data
            
        Returns:
            Dictionary with parsed and structured data
        """
        # Determine which side this is
        page_idx = self._detect_page_index(scan_data)
        
        result = {
            'page_idx': page_idx,
            'side': 'front' if page_idx == 0 else 'back',
            'metadata': {},
            'document_info': {},
            'personal_data': {},
            'images': {},
            'security_checks': {},
            'status': {},
            'quality_score': None,
            'mrz_data': {},
            'raw_data': {}
        }
        
        # Parse metadata first (contains TransactionID)
        if 'ChoosenDoctype_Data' in scan_data:
            result['document_info'] = self._parse_document_type(scan_data['ChoosenDoctype_Data'])
            result['metadata'] = self._parse_metadata(scan_data['ChoosenDoctype_Data'])
        
        # Parse based on page_idx
        if page_idx == 0:
            # FRONT SIDE
            result = self._parse_front_side(scan_data, result)
        else:
            # BACK SIDE
            result = self._parse_back_side(scan_data, result)
            
        # Parse common data (available on both sides)
        result = self._parse_common_data(scan_data, result)
        
        return result
    
    def _detect_page_index(self, scan_data: Dict[str, Any]) -> int:
        """Detect whether this is front (0) or back (1) side"""
        # Check ChoosenDoctype_Data
        if 'ChoosenDoctype_Data' in scan_data:
            doctype = scan_data['ChoosenDoctype_Data']
            if isinstance(doctype, dict):
                # Check page_idx directly
                if 'page_idx' in doctype:
                    return doctype['page_idx']
                # Check nested structure
                if 'DOC_DOCUMENT_TYPE_DATA' in doctype:
                    doc_data = doctype['DOC_DOCUMENT_TYPE_DATA']
                    if 'PageIndex' in doc_data:
                        return int(doc_data['PageIndex'])
                # Check document name
                doc_candidate = doctype.get('DOC_DOCUMENT_TYPE_DATA', {}).get('Document_Candidate', {})
                doc_name = doc_candidate.get('DocumentName', '')
                if 'Side B' in doc_name or 'Back' in doc_name:
                    return 1
        
        # Check for Images_Data (only on back side)
        if 'Images_Data' in scan_data:
            return 1
        
        # Default to front side
        return 0
    
    def _parse_front_side(self, scan_data: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse front side specific data"""
        # Parse Graphics Data (contains all images on front side)
        if 'Graphics_Data' in scan_data:
            result['images'] = self._parse_graphics_data(scan_data['Graphics_Data'])
            
        # Parse Text Data (contains personal information - only on front)
        if 'Text_Data' in scan_data:
            result['personal_data'] = self._parse_text_data(scan_data['Text_Data'])
        
        # Parse MRZ.TXT if provided
        if 'MRZ_TXT' in scan_data:
            result['mrz_data'] = self._parse_mrz_txt(scan_data['MRZ_TXT'])
        
        # Parse Results.TXT if provided
        if 'Results_TXT' in scan_data:
            result['raw_data']['results_txt'] = self._parse_results_txt(scan_data['Results_TXT'])
            
        return result
    
    def _parse_back_side(self, scan_data: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse back side specific data"""
        # Parse Images_Data (back side uses different structure)
        if 'Images_Data' in scan_data:
            result['images'] = self._parse_images_data(scan_data['Images_Data'])
        
        # Parse Status_Data (only available on back side)
        if 'Status_Data' in scan_data:
            result['status'] = self._parse_status_data(scan_data['Status_Data'])
            result['quality_score'] = self._calculate_quality_score(result['status'])
            
        return result
    
    def _parse_common_data(self, scan_data: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse data available on both sides"""
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


def create_idscan_from_regula(
    parsed_data: Dict[str, Any], 
    tenant_id: str = None,
    tenant_name: str = None,
    location_id: str = None,
    location_name: str = None,
    device_id: str = None,
    device_name: str = None
) -> Dict[str, Any]:
    """
    Convert parsed Regula data to IDScan model format
    
    Args:
        parsed_data: Parsed data from RegulaParser
        tenant_id: Tenant ID (required for IDScan model)
        tenant_name: Tenant name (required for IDScan model)
        location_id: Optional location ID
        location_name: Optional location name
        device_id: Optional device ID
        device_name: Optional device name
        
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
    
    # Use metadata or provided values
    computer_name = metadata.get('computer_name', 'Unknown')
    user_name = metadata.get('user_name', 'Unknown')
    
    # Build extracted data
    extracted_data = {
        'first_name': personal.get('given_names', ''),
        'last_name': personal.get('surname', ''),
        'full_name': f"{personal.get('given_names', '')} {personal.get('surname', '')}".strip(),
        'date_of_birth': parse_date(personal.get('date_of_birth', '')),
        'place_of_birth': personal.get('place_of_birth', ''),
        'nationality': personal.get('nationality', ''),
        'sex': personal.get('sex', ''),
        'document_number': personal.get('document_number', ''),
        'document_type': doc_info.get('document_type', 'Unknown'),
        'issuing_authority': personal.get('issuing_authority', ''),
        'issue_date': parse_date(personal.get('date_of_issue', '')),
        'expiry_date': parse_date(personal.get('date_of_expiry', '')),
        'issuing_country': doc_info.get('country_name', ''),
    }
    
    idscan = {
        'id': scan_id,
        
        # Tenant/Location/Device Info
        'tenant_id': tenant_id or 'default',
        'tenant_name': tenant_name or 'Default Tenant',
        'location_id': location_id,
        'location_name': location_name or computer_name,
        'device_id': device_id,
        'device_name': device_name or metadata.get('device_type', 'Unknown Device'),
        
        # Scan Info
        'scan_timestamp': metadata.get('scan_datetime', datetime.now().isoformat()),
        'status': 'pending',
        'document_type': None,  # Will be set from extracted_data
        
        # Operator Info
        'scanned_by': user_name,
        'operator_id': None,
        
        # Images
        'images': [],
        
        # Extracted Data
        'extracted_data': extracted_data,
        
        # Verification (empty for now)
        'verification': {
            'confidence_score': None,
            'authenticity_score': None,
            'document_validity': None,
            'security_features': [],
            'warnings': [],
            'errors': []
        },
        
        # Manual Review
        'requires_manual_review': False,
        'manual_actions': [],
        
        # Metadata
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'ip_address': None,
        'notes': None,
        'tags': [],
        
        # Additional Regula-specific data
        'regula_metadata': {
            'transaction_id': metadata.get('transaction_id', ''),
            'device_type': metadata.get('device_type', ''),
            'device_serial': metadata.get('device_serial', ''),
            'sdk_version': metadata.get('sdk_version', ''),
        }
    }
    
    return idscan

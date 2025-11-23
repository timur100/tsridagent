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
    
    def _parse_images_data(self, images_data: Dict[str, Any]) -> Dict[str, str]:
        """Parse Images_Data.json (back side) to extract Base64 images"""
        images = {}
        
        if not images_data:
            return images
            
        try:
            # Images_Data has a different structure than Graphics_Data
            field_list = images_data.get('Images', {}).get('fieldList', [])
            
            for field in field_list:
                field_type = field.get('fieldType', '')
                field_name = field.get('fieldName', '')
                
                # Extract Base64 image data
                value_list = field.get('valueList', [])
                if value_list and len(value_list) > 0:
                    value = value_list[0].get('value', '')
                    
                    if value and len(value) > 100:
                        # Map field types
                        if field_type == 201 or 'Portrait' in field_name:
                            images['portrait'] = value
                        elif field_type == 204 or 'Signature' in field_name:
                            images['signature'] = value
                        elif field_type == 207 or 'front side' in field_name.lower():
                            images['document_front'] = value
                            
        except Exception as e:
            print(f"Error parsing Images_Data: {e}")
            
        return images
    
    def _parse_status_data(self, status_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Status_Data.json for quality assessment"""
        status = {}
        
        if not status_data:
            return status
            
        try:
            status_obj = status_data.get('Status', {})
            
            # Overall status
            status['overall_status'] = status_obj.get('overallStatus', 0)
            status['optical'] = status_obj.get('optical', 0)
            status['rfid'] = status_obj.get('rfid', 0)
            
            # Optical details
            optical_details = status_obj.get('detailsOptical', {})
            status['optical_details'] = {
                'overall_status': optical_details.get('overallStatus', 0),
                'mrz': optical_details.get('mrz', 0),
                'text': optical_details.get('text', 0),
                'doc_type': optical_details.get('docType', 0),
                'security': optical_details.get('security', 0),
                'image_qa': optical_details.get('imageQA', 0),
                'expiry': optical_details.get('expiry', 0),
                'pages_count': optical_details.get('pagesCount', 0),
                'vds': optical_details.get('vds', 0)
            }
            
            # RFID details
            rfid_details = status_obj.get('detailsRFID', {})
            status['rfid_details'] = {
                'overall_status': rfid_details.get('overallStatus', 0),
                'pa': rfid_details.get('PA', 0),
                'ca': rfid_details.get('CA', 0),
                'aa': rfid_details.get('AA', 0),
                'ta': rfid_details.get('TA', 0),
                'bac': rfid_details.get('BAC', 0),
                'pace': rfid_details.get('PACE', 0)
            }
            
            # Other checks
            status['portrait'] = status_obj.get('portrait', 0)
            status['stop_list'] = status_obj.get('stopList', 0)
            
        except Exception as e:
            print(f"Error parsing Status_Data: {e}")
            
        return status
    
    def _calculate_quality_score(self, status: Dict[str, Any]) -> int:
        """
        Calculate quality score (0-100) based on Status_Data
        
        Status codes:
        1 = SUCCESS
        2 = ERROR/NOT AVAILABLE
        """
        if not status:
            return 0
            
        try:
            optical = status.get('optical_details', {})
            
            # Critical checks (must be 1 for high quality)
            critical_checks = [
                optical.get('text', 0),
                optical.get('doc_type', 0),
                optical.get('security', 0),
                optical.get('expiry', 0)
            ]
            
            # Count successful critical checks
            critical_success = sum(1 for c in critical_checks if c == 1)
            critical_score = (critical_success / len(critical_checks)) * 70  # 70% weight
            
            # Optional checks
            optional_checks = [
                optical.get('image_qa', 0),
                status.get('overall_status', 0),
                optical.get('overall_status', 0)
            ]
            
            optional_success = sum(1 for c in optional_checks if c == 1)
            optional_score = (optional_success / len(optional_checks)) * 30  # 30% weight
            
            total_score = int(critical_score + optional_score)
            
            # Note: MRZ=2 and RFID=2 are NORMAL for driver's licenses, so we don't penalize
            
            return total_score
            
        except Exception as e:
            print(f"Error calculating quality score: {e}")
            return 0
    
    def _parse_mrz_txt(self, mrz_txt: str) -> Dict[str, Any]:
        """Parse MRZ.TXT file content"""
        mrz_data = {}
        
        if not mrz_txt:
            return mrz_data
            
        try:
            lines = mrz_txt.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Detect sections
                if line.startswith('[') and line.endswith(']'):
                    current_section = line[1:-1]
                    mrz_data[current_section] = {}
                elif '=' in line and current_section:
                    key, value = line.split('=', 1)
                    mrz_data[current_section][key.strip()] = value.strip()
                    
        except Exception as e:
            print(f"Error parsing MRZ.TXT: {e}")
            
        return mrz_data
    
    def _parse_results_txt(self, results_txt: str) -> List[Dict[str, Any]]:
        """Parse Results.TXT (CSV format) file content"""
        results = []
        
        if not results_txt:
            return results
            
        try:
            lines = results_txt.split('\n')
            if len(lines) < 2:
                return results
                
            # First line is header
            headers = lines[0].split(';')
            
            # Parse each data line
            for line in lines[1:]:
                if not line.strip():
                    continue
                    
                values = line.split(';')
                if len(values) >= len(headers):
                    row = {}
                    for i, header in enumerate(headers):
                        row[header] = values[i] if i < len(values) else ''
                    results.append(row)
                    
        except Exception as e:
            print(f"Error parsing Results.TXT: {e}")
            
        return results
    
    def should_require_manual_review(self, status: Dict[str, Any], quality_score: int) -> bool:
        """
        Determine if scan requires manual review based on status and quality
        
        Returns:
            True if manual review is required, False otherwise
        """
        if not status:
            return True  # No status data = require review
            
        # Require review if quality score is low
        if quality_score < 50:
            return True
            
        # Check critical optical checks
        optical = status.get('optical_details', {})
        critical_checks = [
            optical.get('text', 0),
            optical.get('doc_type', 0),
            optical.get('security', 0)
        ]
        
        # If any critical check failed, require review
        if any(c != 1 for c in critical_checks):
            return True
            
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

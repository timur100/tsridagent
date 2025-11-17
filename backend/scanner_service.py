"""
Desko Scanner Service for Windows
Provides REST API for scanner access from remote applications

Run this on your Windows PC with Desko SDK installed
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add desko_integration to path
sys.path.insert(0, os.path.dirname(__file__))

from desko_integration import get_scanner

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from Docker app

scanner = get_scanner()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    status = scanner.get_status()
    return jsonify({
        "success": True,
        "service": "Desko Scanner Service",
        "version": "1.0.0",
        "scanner_status": status
    })

@app.route('/status', methods=['GET'])
def get_status():
    """Get scanner status"""
    try:
        status = scanner.get_status()
        return jsonify({
            "success": True,
            "status": status
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/connect', methods=['POST'])
def connect():
    """Connect to scanner"""
    try:
        result = scanner.connect()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from scanner"""
    try:
        result = scanner.disconnect()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/scan', methods=['POST'])
def scan():
    """Perform a scan"""
    try:
        data = request.get_json() or {}
        output_path = data.get('output_path', 'C:\\temp\\scan.jpg')
        
        result = scanner.scan(output_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/test', methods=['POST'])
def test():
    """Test scanner"""
    try:
        data = request.get_json() or {}
        test_type = data.get('test_type', 'basic')
        
        result = scanner.test_scanner(test_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/firmware', methods=['GET'])
def firmware():
    """Get firmware version"""
    try:
        version = scanner.get_firmware_version()
        return jsonify({
            "success": True,
            "firmware_version": version
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Desko Scanner Service Starting...")
    print("=" * 60)
    
    # Check scanner status
    status = scanner.get_status()
    print(f"\n📊 Scanner Status:")
    for key, value in status.items():
        print(f"   {key}: {value}")
    
    print(f"\n🌐 Starting REST API Server...")
    print(f"   URL: http://0.0.0.0:8888")
    print(f"   Endpoints:")
    print(f"      GET  /health      - Service health check")
    print(f"      GET  /status      - Scanner status")
    print(f"      POST /connect     - Connect to scanner")
    print(f"      POST /disconnect  - Disconnect from scanner")
    print(f"      POST /scan        - Perform scan")
    print(f"      POST /test        - Test scanner")
    print(f"      GET  /firmware    - Get firmware version")
    
    print(f"\n✅ Service ready! Press Ctrl+C to stop")
    print("=" * 60 + "\n")
    
    # Start Flask server
    app.run(host='0.0.0.0', port=8888, debug=False)

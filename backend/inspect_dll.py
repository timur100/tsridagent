"""
DLL Function Inspector
Lists all exported functions from pagescanapi.dll
"""

import ctypes
import os
import sys

def list_dll_exports(dll_path):
    """
    Attempt to list exported functions from DLL
    """
    print("=" * 60)
    print("Desko DLL Function Inspector")
    print("=" * 60)
    print()
    
    if not os.path.exists(dll_path):
        print(f"❌ DLL not found: {dll_path}")
        return
    
    print(f"📂 DLL Path: {dll_path}")
    print(f"📊 File Size: {os.path.getsize(dll_path) / 1024 / 1024:.2f} MB")
    print()
    
    try:
        # Load the DLL
        dll = ctypes.CDLL(dll_path)
        print("✅ DLL loaded successfully!")
        print()
        
        # Try common Desko/PageScan function names
        common_functions = [
            # Standard naming
            "PageScan_Init",
            "PageScan_Connect", 
            "PageScan_Disconnect",
            "PageScan_Scan",
            "PageScan_GetFirmwareVersion",
            "PageScan_GetStatus",
            "PageScan_SetResolution",
            "PageScan_SetBrightness",
            
            # Possible variations
            "PSInit",
            "PSConnect",
            "PSDisconnect",
            "PSScan",
            "PSGetVersion",
            
            # Alternative naming
            "DeskoInit",
            "DeskoConnect",
            "DeskoDisconnect",
            "DeskoScan",
            
            # C-style exports
            "_PageScan_Init",
            "_PageScan_Connect",
            
            # Possible API versions
            "PageScanInit",
            "PageScanConnect",
            "PageScanDisconnect",
            "PageScanScan",
            
            # Device management
            "OpenDevice",
            "CloseDevice",
            "GetDeviceInfo",
            "ScanDocument",
            
            # Reader functions
            "ReaderInit",
            "ReaderConnect",
            "ReaderScan",
        ]
        
        print("🔍 Testing for known function names:")
        print("-" * 60)
        
        found_functions = []
        
        for func_name in common_functions:
            try:
                func = getattr(dll, func_name)
                print(f"✅ {func_name}")
                found_functions.append(func_name)
            except AttributeError:
                print(f"❌ {func_name}")
        
        print()
        print("=" * 60)
        print(f"✅ Found {len(found_functions)} functions")
        print("=" * 60)
        
        if found_functions:
            print()
            print("📋 Available functions:")
            for func in found_functions:
                print(f"   - {func}")
        else:
            print()
            print("⚠️ No standard functions found.")
            print()
            print("Possible reasons:")
            print("  1. Function names are different (need documentation)")
            print("  2. Functions are not exported (check DLL exports with dumpbin)")
            print("  3. DLL requires initialization before exposing functions")
            print()
            print("Next steps:")
            print("  1. Check Desko SDK documentation for function names")
            print("  2. Use 'dumpbin /EXPORTS pagescanapi.dll' in Visual Studio Command Prompt")
            print("  3. Or use Dependency Walker (depends.exe) to see exports")
        
    except Exception as e:
        print(f"❌ Error loading DLL: {e}")
        print()
        print("This might be because:")
        print("  1. Missing dependencies (other DLLs)")
        print("  2. Wrong architecture (32-bit vs 64-bit)")
        print("  3. DLL requires specific initialization")

if __name__ == "__main__":
    dll_path = os.path.join(os.path.dirname(__file__), "desko_sdk", "pagescanapi.dll")
    
    if len(sys.argv) > 1:
        dll_path = sys.argv[1]
    
    list_dll_exports(dll_path)
    
    input("\nPress Enter to exit...")

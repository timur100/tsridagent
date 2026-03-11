using System;
using System.Collections.Generic;

namespace RegulaService
{
    /// <summary>
    /// Datenmodell für Scan-Ergebnisse
    /// </summary>
    public class ScanResult
    {
        public string ScanId { get; set; }
        public DateTime Timestamp { get; set; }
        public string DocumentType { get; set; }
        public bool IsValid { get; set; }
        public MrzData MrzData { get; set; }
        public List<AuthenticityCheck> AuthenticityChecks { get; set; }
        public Dictionary<string, string> AdditionalFields { get; set; }

        public ScanResult()
        {
            AuthenticityChecks = new List<AuthenticityCheck>();
            AdditionalFields = new Dictionary<string, string>();
        }
    }

    /// <summary>
    /// MRZ-Daten (Machine Readable Zone)
    /// </summary>
    public class MrzData
    {
        // Persönliche Daten
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string FullName { get; set; }
        public string Gender { get; set; }
        public string DateOfBirth { get; set; }  // Format: YYMMDD
        public string PlaceOfBirth { get; set; }
        public string Nationality { get; set; }

        // Dokument-Daten
        public string DocumentType { get; set; }
        public string DocumentNumber { get; set; }
        public string ExpiryDate { get; set; }   // Format: YYMMDD
        public string IssuingState { get; set; }
        public string IssuingAuthority { get; set; }
        public string IssueDate { get; set; }

        // Optional
        public string PersonalNumber { get; set; }
        public string OptionalData1 { get; set; }
        public string OptionalData2 { get; set; }

        // MRZ-Zeilen (roh)
        public string MrzLine1 { get; set; }
        public string MrzLine2 { get; set; }
        public string MrzLine3 { get; set; }

        // Prüfsummen
        public bool ChecksumValid { get; set; }
    }

    /// <summary>
    /// Authentizitätsprüfung
    /// </summary>
    public class AuthenticityCheck
    {
        public string CheckType { get; set; }    // UV, IR, White, Hologram, etc.
        public string Result { get; set; }       // OK, FAIL, UNKNOWN
        public int Score { get; set; }           // 0-100
        public string Description { get; set; }
    }

    /// <summary>
    /// Bild-Daten
    /// </summary>
    public class ImageData
    {
        public string Type { get; set; }         // White, UV, IR, Photo, Signature
        public string Base64 { get; set; }       // Base64-kodiertes Bild
        public int Width { get; set; }
        public int Height { get; set; }
        public string Format { get; set; }       // jpeg, png
    }
}

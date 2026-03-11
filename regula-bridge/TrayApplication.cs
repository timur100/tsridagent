using System;
using System.Drawing;
using System.Windows.Forms;

namespace RegulaService
{
    public class TrayApplication : ApplicationContext
    {
        private NotifyIcon _trayIcon;
        private HttpServer _httpServer;
        private RegulaWrapper _regulaWrapper;
        private bool _isConnected = false;

        public TrayApplication()
        {
            // Tray-Icon erstellen
            _trayIcon = new NotifyIcon()
            {
                Icon = SystemIcons.Shield, // Oder: new Icon("icon.ico")
                Text = "TSRID Regula Service",
                Visible = true,
                ContextMenuStrip = CreateContextMenu()
            };

            _trayIcon.DoubleClick += (s, e) => ShowStatus();

            // Regula initialisieren
            InitializeRegula();

            // HTTP-Server starten
            StartHttpServer();

            // Startmeldung
            _trayIcon.ShowBalloonTip(3000, "TSRID Regula Service", 
                "Service gestartet auf http://localhost:5000", ToolTipIcon.Info);
        }

        private ContextMenuStrip CreateContextMenu()
        {
            var menu = new ContextMenuStrip();
            
            menu.Items.Add("Status anzeigen", null, (s, e) => ShowStatus());
            menu.Items.Add("Scanner verbinden", null, (s, e) => ConnectScanner());
            menu.Items.Add("Scanner trennen", null, (s, e) => DisconnectScanner());
            menu.Items.Add("-");
            menu.Items.Add("Test-Scan", null, (s, e) => TestScan());
            menu.Items.Add("-");
            menu.Items.Add("Beenden", null, (s, e) => Exit());

            return menu;
        }

        private void InitializeRegula()
        {
            try
            {
                _regulaWrapper = new RegulaWrapper();
                _regulaWrapper.OnScanComplete += OnScanComplete;
                _regulaWrapper.OnError += OnError;
                _regulaWrapper.OnStatusChange += OnStatusChange;

                // Automatisch verbinden
                ConnectScanner();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Fehler bei Regula-Initialisierung:\n{ex.Message}", 
                    "Fehler", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void StartHttpServer()
        {
            try
            {
                _httpServer = new HttpServer(5000, _regulaWrapper);
                _httpServer.Start();
                UpdateTrayIcon(true);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Fehler beim Starten des HTTP-Servers:\n{ex.Message}", 
                    "Fehler", MessageBoxButtons.OK, MessageBoxIcon.Error);
                UpdateTrayIcon(false);
            }
        }

        private void ConnectScanner()
        {
            try
            {
                _regulaWrapper?.Connect();
                _isConnected = true;
                UpdateTrayIcon(true);
                _trayIcon.ShowBalloonTip(2000, "Scanner", "Scanner verbunden", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                _isConnected = false;
                UpdateTrayIcon(false);
                _trayIcon.ShowBalloonTip(3000, "Fehler", $"Scanner-Verbindung fehlgeschlagen:\n{ex.Message}", ToolTipIcon.Error);
            }
        }

        private void DisconnectScanner()
        {
            try
            {
                _regulaWrapper?.Disconnect();
                _isConnected = false;
                UpdateTrayIcon(false);
                _trayIcon.ShowBalloonTip(2000, "Scanner", "Scanner getrennt", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                _trayIcon.ShowBalloonTip(3000, "Fehler", ex.Message, ToolTipIcon.Error);
            }
        }

        private void TestScan()
        {
            try
            {
                _regulaWrapper?.StartScan();
                _trayIcon.ShowBalloonTip(2000, "Scan", "Scan gestartet...", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                _trayIcon.ShowBalloonTip(3000, "Fehler", ex.Message, ToolTipIcon.Error);
            }
        }

        private void ShowStatus()
        {
            string status = $"TSRID Regula Service\n\n" +
                           $"HTTP-Server: {(_httpServer?.IsRunning == true ? "Läuft auf Port 5000" : "Gestoppt")}\n" +
                           $"Scanner: {(_isConnected ? "Verbunden" : "Nicht verbunden")}\n" +
                           $"Regula SDK: {(_regulaWrapper?.IsInitialized == true ? "Initialisiert" : "Nicht initialisiert")}";

            MessageBox.Show(status, "Status", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void UpdateTrayIcon(bool isActive)
        {
            _trayIcon.Text = isActive 
                ? "TSRID Regula Service - Aktiv" 
                : "TSRID Regula Service - Inaktiv";
            
            // Icon-Farbe ändern (optional)
            // _trayIcon.Icon = isActive ? greenIcon : redIcon;
        }

        private void OnScanComplete(object sender, ScanResultEventArgs e)
        {
            _trayIcon.ShowBalloonTip(2000, "Scan abgeschlossen", 
                $"Dokument: {e.Result.DocumentType}", ToolTipIcon.Info);
        }

        private void OnError(object sender, ErrorEventArgs e)
        {
            _trayIcon.ShowBalloonTip(3000, "Fehler", e.Message, ToolTipIcon.Error);
        }

        private void OnStatusChange(object sender, StatusEventArgs e)
        {
            _trayIcon.Text = $"TSRID Regula Service - {e.Status}";
        }

        private void Exit()
        {
            _httpServer?.Stop();
            _regulaWrapper?.Disconnect();
            _regulaWrapper?.Dispose();
            _trayIcon.Visible = false;
            Application.Exit();
        }
    }

    // Event-Args Klassen
    public class ScanResultEventArgs : EventArgs
    {
        public ScanResult Result { get; set; }
    }

    public class ErrorEventArgs : EventArgs
    {
        public string Message { get; set; }
    }

    public class StatusEventArgs : EventArgs
    {
        public string Status { get; set; }
    }
}

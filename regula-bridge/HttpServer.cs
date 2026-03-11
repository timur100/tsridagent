using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace RegulaService
{
    public class HttpServer
    {
        private readonly int _port;
        private readonly RegulaWrapper _regulaWrapper;
        private HttpListener _listener;
        private CancellationTokenSource _cts;
        private Task _serverTask;

        public bool IsRunning { get; private set; }

        public HttpServer(int port, RegulaWrapper regulaWrapper)
        {
            _port = port;
            _regulaWrapper = regulaWrapper;
        }

        public void Start()
        {
            if (IsRunning) return;

            _listener = new HttpListener();
            _listener.Prefixes.Add($"http://localhost:{_port}/");
            _listener.Prefixes.Add($"http://127.0.0.1:{_port}/");
            
            try
            {
                _listener.Start();
                IsRunning = true;
                _cts = new CancellationTokenSource();
                _serverTask = Task.Run(() => ListenLoop(_cts.Token));
            }
            catch (HttpListenerException ex)
            {
                throw new Exception($"HTTP-Server konnte nicht gestartet werden: {ex.Message}");
            }
        }

        public void Stop()
        {
            if (!IsRunning) return;

            _cts?.Cancel();
            _listener?.Stop();
            _listener?.Close();
            IsRunning = false;
        }

        private async Task ListenLoop(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested && _listener.IsListening)
            {
                try
                {
                    var context = await _listener.GetContextAsync();
                    _ = Task.Run(() => HandleRequest(context));
                }
                catch (HttpListenerException)
                {
                    // Server wurde gestoppt
                    break;
                }
                catch (ObjectDisposedException)
                {
                    break;
                }
            }
        }

        private void HandleRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;

            // CORS-Header für Electron-App
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            // OPTIONS-Anfrage (CORS Preflight)
            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            try
            {
                var path = request.Url.AbsolutePath.ToLower();
                object result = null;

                switch (path)
                {
                    case "/":
                    case "/status":
                        result = HandleStatus();
                        break;

                    case "/connect":
                        result = HandleConnect();
                        break;

                    case "/disconnect":
                        result = HandleDisconnect();
                        break;

                    case "/scan":
                        result = HandleScan();
                        break;

                    case "/scan/result":
                        result = HandleGetResult();
                        break;

                    case "/scan/images":
                        result = HandleGetImages();
                        break;

                    default:
                        response.StatusCode = 404;
                        result = new { error = "Endpoint nicht gefunden", path = path };
                        break;
                }

                SendJsonResponse(response, result);
            }
            catch (Exception ex)
            {
                response.StatusCode = 500;
                SendJsonResponse(response, new { error = ex.Message });
            }
        }

        private object HandleStatus()
        {
            return new
            {
                service = "RegulaService",
                version = "1.0.0",
                status = "running",
                scanner = new
                {
                    connected = _regulaWrapper?.IsConnected ?? false,
                    initialized = _regulaWrapper?.IsInitialized ?? false,
                    lastScanTime = _regulaWrapper?.LastScanTime,
                    scanInProgress = _regulaWrapper?.ScanInProgress ?? false
                }
            };
        }

        private object HandleConnect()
        {
            try
            {
                _regulaWrapper?.Connect();
                return new { success = true, message = "Scanner verbunden" };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        private object HandleDisconnect()
        {
            try
            {
                _regulaWrapper?.Disconnect();
                return new { success = true, message = "Scanner getrennt" };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        private object HandleScan()
        {
            try
            {
                if (!(_regulaWrapper?.IsConnected ?? false))
                {
                    return new { success = false, error = "Scanner nicht verbunden" };
                }

                _regulaWrapper.StartScan();
                
                // Warte auf Scan-Ergebnis (max 30 Sekunden)
                var timeout = DateTime.Now.AddSeconds(30);
                while (_regulaWrapper.ScanInProgress && DateTime.Now < timeout)
                {
                    Thread.Sleep(100);
                }

                if (_regulaWrapper.ScanInProgress)
                {
                    return new { success = false, error = "Scan-Timeout" };
                }

                var result = _regulaWrapper.GetLastResult();
                return new { success = true, result = result };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        private object HandleGetResult()
        {
            try
            {
                var result = _regulaWrapper?.GetLastResult();
                if (result == null)
                {
                    return new { success = false, error = "Kein Scan-Ergebnis vorhanden" };
                }
                return new { success = true, result = result };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        private object HandleGetImages()
        {
            try
            {
                var images = _regulaWrapper?.GetLastImages();
                if (images == null || images.Count == 0)
                {
                    return new { success = false, error = "Keine Bilder vorhanden" };
                }
                return new { success = true, images = images };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        private void SendJsonResponse(HttpListenerResponse response, object data)
        {
            var json = JsonConvert.SerializeObject(data, Formatting.Indented);
            var buffer = Encoding.UTF8.GetBytes(json);
            
            response.ContentType = "application/json";
            response.ContentEncoding = Encoding.UTF8;
            response.ContentLength64 = buffer.Length;
            
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.Close();
        }
    }
}

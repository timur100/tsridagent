using System;
using System.Windows.Forms;

namespace RegulaService
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            // Nur eine Instanz erlauben
            bool createdNew;
            using (var mutex = new System.Threading.Mutex(true, "RegulaServiceMutex", out createdNew))
            {
                if (!createdNew)
                {
                    MessageBox.Show("RegulaService läuft bereits!", "TSRID Regula Service", 
                        MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new TrayApplication());
            }
        }
    }
}

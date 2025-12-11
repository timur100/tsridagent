#!/bin/bash

echo "========================================"
echo "  TSRID USB Device Manager - Schnellstart"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[FEHLER] Node.js ist nicht installiert!${NC}"
    echo ""
    echo "Bitte installieren Sie Node.js von: https://nodejs.org/"
    echo ""
    echo "macOS: brew install node"
    echo "Ubuntu: sudo apt install nodejs npm"
    exit 1
fi

echo -e "${GREEN}[OK] Node.js gefunden:${NC} $(node --version)"
echo ""

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}[INFO] Yarn wird installiert...${NC}"
    npm install -g yarn
    if [ $? -ne 0 ]; then
        echo -e "${RED}[FEHLER] Yarn-Installation fehlgeschlagen!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}[OK] Yarn gefunden:${NC} $(yarn --version)"
echo ""

echo "========================================"
echo "  Was möchten Sie tun?"
echo "========================================"
echo ""
echo "  1. App STARTEN (ohne Build)"
echo "  2. App BAUEN (macOS: .dmg / Linux: .AppImage)"
echo "  3. Dependencies INSTALLIEREN"
echo "  4. Alles NEU installieren (Clean Install)"
echo "  5. Beenden"
echo ""

read -p "Ihre Wahl (1-5): " choice

case $choice in
    1)
        echo ""
        echo "========================================"
        echo "  Dependencies prüfen..."
        echo "========================================"
        echo ""
        
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}[INFO] Dependencies werden installiert (erstes Mal)...${NC}"
            yarn install
            if [ $? -ne 0 ]; then
                echo -e "${RED}[FEHLER] Installation fehlgeschlagen!${NC}"
                exit 1
            fi
        fi
        
        echo ""
        echo "========================================"
        echo "  App wird gestartet..."
        echo "========================================"
        echo ""
        echo -e "${YELLOW}[INFO] Die App öffnet sich automatisch...${NC}"
        echo -e "${YELLOW}[INFO] Login: admin@tsrid.com / admin123${NC}"
        echo -e "${YELLOW}[INFO] Navigation: R&D -> Test Center -> USB Device Manager${NC}"
        echo ""
        echo "Drücken Sie Strg+C zum Beenden"
        echo ""
        
        yarn start
        ;;
        
    2)
        echo ""
        echo "========================================"
        echo "  Dependencies prüfen..."
        echo "========================================"
        echo ""
        
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}[INFO] Dependencies werden installiert...${NC}"
            yarn install
            if [ $? -ne 0 ]; then
                echo -e "${RED}[FEHLER] Installation fehlgeschlagen!${NC}"
                exit 1
            fi
        fi
        
        echo ""
        echo "========================================"
        echo "  Build wird erstellt..."
        echo "========================================"
        echo ""
        echo -e "${YELLOW}[INFO] Dies kann 5-15 Minuten dauern...${NC}"
        echo ""
        
        # Detect OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo -e "${YELLOW}[INFO] macOS erkannt - .dmg wird erstellt...${NC}"
            yarn build:mac
        else
            echo -e "${YELLOW}[INFO] Linux erkannt - .AppImage wird erstellt...${NC}"
            yarn build:linux
        fi
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}[FEHLER] Build fehlgeschlagen!${NC}"
            exit 1
        fi
        
        echo ""
        echo "========================================"
        echo "  BUILD ERFOLGREICH!"
        echo "========================================"
        echo ""
        echo "Die fertigen Dateien finden Sie hier:"
        echo ""
        ls -lh dist/*.{dmg,AppImage,deb} 2>/dev/null || echo "  dist/"
        echo ""
        
        read -p "Möchten Sie den dist-Ordner öffnen? (j/n): " open_dist
        if [[ $open_dist == "j" ]] || [[ $open_dist == "J" ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                open dist
            else
                xdg-open dist 2>/dev/null || nautilus dist 2>/dev/null || echo "Bitte öffnen Sie manuell: dist/"
            fi
        fi
        ;;
        
    3)
        echo ""
        echo "========================================"
        echo "  Dependencies werden installiert..."
        echo "========================================"
        echo ""
        
        yarn install
        if [ $? -ne 0 ]; then
            echo -e "${RED}[FEHLER] Installation fehlgeschlagen!${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${GREEN}[ERFOLG] Dependencies installiert!${NC}"
        echo ""
        ;;
        
    4)
        echo ""
        echo "========================================"
        echo "  Clean Install wird durchgeführt..."
        echo "========================================"
        echo ""
        
        echo -e "${YELLOW}[INFO] Lösche alte Dateien...${NC}"
        rm -rf node_modules dist yarn.lock
        echo -e "${GREEN}[OK] Alte Dateien gelöscht${NC}"
        echo ""
        
        echo -e "${YELLOW}[INFO] Installiere Dependencies neu...${NC}"
        yarn install
        if [ $? -ne 0 ]; then
            echo -e "${RED}[FEHLER] Installation fehlgeschlagen!${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${GREEN}[ERFOLG] Clean Install abgeschlossen!${NC}"
        echo ""
        ;;
        
    5)
        echo ""
        echo "Auf Wiedersehen!"
        exit 0
        ;;
        
    *)
        echo -e "${RED}[FEHLER] Ungültige Auswahl!${NC}"
        exit 1
        ;;
esac

echo ""
echo "Fertig! Drücken Sie Enter zum Beenden..."
read

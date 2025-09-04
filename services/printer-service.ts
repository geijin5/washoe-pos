import { Platform } from 'react-native';
import { NightlyReport } from '@/types/pos';

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'wifi' | 'bluetooth';
  address: string;
  connected: boolean;
}

export interface PrinterService {
  discoverPrinters(): Promise<PrinterDevice[]>;
  connectToPrinter(device: PrinterDevice): Promise<boolean>;
  printReceipt(content: string): Promise<boolean>;
  disconnectPrinter(): Promise<void>;
  getConnectedPrinter(): PrinterDevice | null;
}

class ReceiptPrinterService implements PrinterService {
  private connectedPrinter: PrinterDevice | null = null;
  private connectedDevicesCache: PrinterDevice[] = [];
  private lastScanTime: number = 0;
  private readonly SCAN_CACHE_DURATION = 30000; // 30 seconds

  async discoverPrinters(): Promise<PrinterDevice[]> {
    console.log('Discovering connected receipt printers (WiFi/Ethernet and Bluetooth)...');
    
    // Use cached results if recent scan was performed
    const now = Date.now();
    if (now - this.lastScanTime < this.SCAN_CACHE_DURATION && this.connectedDevicesCache.length > 0) {
      console.log('Using cached printer discovery results');
      return this.connectedDevicesCache;
    }
    
    const discoveredPrinters: PrinterDevice[] = [];
    
    try {
      console.log('Starting comprehensive printer discovery...');
      
      // Discover WiFi/Ethernet printers that are actually reachable
      console.log('Scanning for WiFi/Ethernet printers...');
      const wifiPrinters = await this.discoverWiFiPrinters();
      console.log(`Found ${wifiPrinters.length} WiFi/Ethernet printers`);
      discoveredPrinters.push(...wifiPrinters);
      
      // Discover Bluetooth printers that are actually paired/connected (mobile only)
      if (Platform.OS !== 'web') {
        console.log('Scanning for Bluetooth printers...');
        const bluetoothPrinters = await this.discoverBluetoothPrinters();
        console.log(`Found ${bluetoothPrinters.length} Bluetooth printers`);
        discoveredPrinters.push(...bluetoothPrinters);
      }
      
      // Remove duplicates based on address
      const uniquePrinters = discoveredPrinters.filter((printer, index, self) => 
        index === self.findIndex(p => p.address === printer.address)
      );
      
      // Cache the results
      this.connectedDevicesCache = uniquePrinters;
      this.lastScanTime = now;
      
      console.log(`Discovery complete: Found ${uniquePrinters.length} unique connected printers`);
      uniquePrinters.forEach(printer => {
        console.log(`- ${printer.name} (${printer.type.toUpperCase()}) at ${printer.address}`);
      });
      
      return uniquePrinters;
    } catch (error) {
      console.error('Error during printer discovery:', error);
      return [];
    }
  }

  async connectToPrinter(device: PrinterDevice): Promise<boolean> {
    console.log(`Connecting to printer: ${device.name} (${device.type})`);
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (device.type === 'wifi') {
        return await this.connectWiFiPrinter(device);
      } else if (device.type === 'bluetooth') {
        return await this.connectBluetoothPrinter(device);
      }
      
      return false;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  private async discoverWiFiPrinters(): Promise<PrinterDevice[]> {
    const wifiPrinters: PrinterDevice[] = [];
    
    // Enhanced port list for Star, Epson, and other major receipt printer brands
    // Prioritized by most common first for faster discovery
    const commonPorts = [
      // ESC/POS standard ports (most common - check these first)
      9100, 9101, 9102, 9103, 9104, 9105,
      
      // Star Micronics specific ports (very common)
      3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008,
      
      // Epson specific ports (very common)
      10001, 10002, 10003, 10004, 10005,
      8001, 8002, 8003, 8004, 8005,
      
      // Standard network printing ports
      631,  // IPP (Internet Printing Protocol)
      515,  // LPR/LPD (Line Printer Daemon)
      80,   // HTTP (web-based printers)
      443,  // HTTPS (secure web-based printers)
      8080, // Alternative HTTP port
      8443, // Alternative HTTPS port
      
      // Other manufacturer-specific ports
      4001, 4002, 4003, 4004, // Citizen
      5001, 5002, 5003, 5004, // Bixolon
      6001, 6002, 6003,       // Brother
      6101, 6102, 6103,       // Zebra
      
      // Legacy and specialized ports
      23,   // Telnet (older printers)
      9600, // Some ethernet receipt printers
      7001, 7002, // Some network printers
      
      // Additional manufacturer-specific ports
      11000, 11001, 11002, // Some Epson models
      12000, 12001, 12002, // Some Star models
      13000, 13001, 13002  // Some other brands
    ];
    
    // Get local network ranges to scan
    const networkRanges = await this.getLocalNetworkRanges();
    
    console.log(`Scanning ${networkRanges.length} network ranges for WiFi/Ethernet printers...`);
    console.log(`Network ranges: ${networkRanges.join(', ')}`);
    console.log(`Will test ${commonPorts.length} ports per IP address`);
    
    // Scan each network range with optimized approach
    for (const networkRange of networkRanges) {
      console.log(`Scanning network range: ${networkRange}.x`);
      
      // Prioritized IP ranges - check most common printer IPs first
      const prioritizedIPs = [
        // Very common static printer IPs (check first)
        ...Array.from({length: 10}, (_, i) => 200 + i), // 200-209
        ...Array.from({length: 10}, (_, i) => 100 + i), // 100-109
        ...Array.from({length: 10}, (_, i) => 50 + i),  // 50-59
        ...Array.from({length: 10}, (_, i) => 10 + i),  // 10-19
        
        // Router and gateway range
        1, 2, 3, 4, 5, 6, 7, 8, 9,
        
        // Common static assignments
        20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35,
        40, 41, 42, 43, 44, 45, 60, 61, 62, 63, 64, 65,
        70, 71, 72, 73, 74, 75, 80, 81, 82, 83, 84, 85,
        90, 91, 92, 93, 94, 95,
        
        // Extended DHCP ranges
        ...Array.from({length: 20}, (_, i) => 110 + i), // 110-129
        ...Array.from({length: 20}, (_, i) => 130 + i), // 130-149
        ...Array.from({length: 20}, (_, i) => 150 + i), // 150-169
        ...Array.from({length: 20}, (_, i) => 170 + i), // 170-189
        ...Array.from({length: 10}, (_, i) => 190 + i), // 190-199
        
        // End of range (common for printers)
        ...Array.from({length: 20}, (_, i) => 210 + i), // 210-229
        ...Array.from({length: 20}, (_, i) => 230 + i), // 230-249
        250, 251, 252, 253, 254
      ];
      
      // Remove duplicates and ensure we don't exceed 254
      const uniqueIPs = [...new Set(prioritizedIPs)].filter(ip => ip <= 254);
      
      console.log(`Testing ${uniqueIPs.length} IP addresses in range ${networkRange}.x`);
      
      // Batch scanning with controlled concurrency to avoid overwhelming the network
      const batchSize = 20; // Process 20 IPs at a time
      
      for (let i = 0; i < uniqueIPs.length; i += batchSize) {
        const batch = uniqueIPs.slice(i, i + batchSize);
        const batchPromises: Promise<void>[] = [];
        
        for (const lastOctet of batch) {
          const ip = `${networkRange}.${lastOctet}`;
          
          // For each IP, test the most common ports first
          const prioritizedPorts = [
            9100, 9101, 9102, // ESC/POS (most common)
            3001, 3002, 3003, // Star Micronics
            10001, 8001,      // Epson
            631, 515,         // Standard protocols
            ...commonPorts.filter(p => ![9100, 9101, 9102, 3001, 3002, 3003, 10001, 8001, 631, 515].includes(p))
          ];
          
          batchPromises.push(
            this.scanIPForPrinters(ip, prioritizedPorts)
              .then(printers => {
                if (printers.length > 0) {
                  console.log(`Found ${printers.length} printer(s) at ${ip}`);
                  wifiPrinters.push(...printers);
                }
              })
              .catch(() => {}) // Ignore connection errors
          );
        }
        
        // Wait for current batch to complete before starting next batch
        await Promise.allSettled(batchPromises);
        
        // Small delay between batches to be network-friendly
        if (i + batchSize < uniqueIPs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`Completed scanning ${networkRange}.x - found ${wifiPrinters.length} printers so far`);
    }
    
    // Remove duplicates based on IP address (keep the first one found)
    const uniquePrinters = wifiPrinters.filter((printer, index, self) => 
      index === self.findIndex(p => p.address.split(':')[0] === printer.address.split(':')[0])
    );
    
    console.log(`WiFi/Ethernet discovery complete: ${uniquePrinters.length} unique printers found`);
    return uniquePrinters;
  }
  
  private async scanIPForPrinters(ip: string, ports: number[]): Promise<PrinterDevice[]> {
    const foundPrinters: PrinterDevice[] = [];
    
    // Test ports in order of priority, stop after finding first working port
    for (const port of ports) {
      try {
        const printer = await this.checkPrinterAtAddress(ip, port);
        if (printer) {
          foundPrinters.push(printer);
          // Found a printer on this IP, no need to test other ports
          break;
        }
      } catch {
        // Continue to next port
        continue;
      }
    }
    
    return foundPrinters;
  }
  
  private async getLocalNetworkRanges(): Promise<string[]> {
    if (Platform.OS === 'web') {
      // Enhanced network ranges including manufacturer-specific defaults
      return [
        // Common home/office networks
        '192.168.1', '192.168.0', '192.168.2', '192.168.3', '192.168.4',
        '192.168.5', '192.168.10', '192.168.11', '192.168.20', '192.168.100',
        '192.168.50', '192.168.101', '192.168.200',
        
        // Corporate networks
        '10.0.0', '10.0.1', '10.1.1', '10.10.10', '10.1.10', '10.0.10',
        '10.0.50', '10.1.0', '10.2.0', '10.10.0', '10.20.0',
        '172.16.1', '172.16.0', '172.20.10', '172.16.10', '172.16.50',
        
        // Link-local addresses (common for ethernet printers)
        '169.254.1', '169.254.2', '169.254.10', '169.254.100',
        
        // Star Micronics factory defaults
        '192.168.192', '10.0.0', '192.168.1', '172.16.1',
        
        // Epson factory defaults
        '192.168.192', '192.168.223', '10.0.50', '172.16.254',
        '192.168.11', '10.1.1', '172.20.1',
        
        // Citizen factory defaults
        '192.168.1', '10.0.0', '172.16.0',
        
        // Bixolon factory defaults
        '192.168.1', '10.0.1', '172.16.1',
        
        // Brother factory defaults
        '192.168.1', '10.0.0', '169.254.1',
        
        // Additional common ranges
        '192.168.254', '10.254.254', '172.31.1'
      ];
    }
    
    // For mobile, return the same comprehensive ranges
    return [
      // Common home/office networks
      '192.168.1', '192.168.0', '192.168.2', '192.168.3', '192.168.4',
      '192.168.5', '192.168.10', '192.168.11', '192.168.20', '192.168.100',
      '192.168.50', '192.168.101', '192.168.200',
      
      // Corporate networks
      '10.0.0', '10.0.1', '10.1.1', '10.10.10', '10.1.10', '10.0.10',
      '10.0.50', '10.1.0', '10.2.0', '10.10.0', '10.20.0',
      '172.16.1', '172.16.0', '172.20.10', '172.16.10', '172.16.50',
      
      // Link-local addresses
      '169.254.1', '169.254.2', '169.254.10', '169.254.100',
      
      // Manufacturer factory defaults
      '192.168.192', '192.168.223', '10.0.50', '172.16.254',
      '192.168.11', '10.1.1', '172.20.1', '192.168.254', '10.254.254', '172.31.1'
    ];
  }
  
  private async checkPrinterAtAddress(ip: string, port: number): Promise<PrinterDevice | null> {
    try {
      if (Platform.OS === 'web') {
        // Enhanced web-based ethernet printer detection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // Extended timeout for ethernet
        
        try {
          // Try multiple detection methods for ethernet printers
          const detectionMethods = await Promise.allSettled([
            // Method 1: Direct protocol test
            this.testProtocolConnection(ip, port, controller.signal),
            // Method 2: Printer-specific endpoint test
            this.testPrinterEndpoints(ip, port, controller.signal),
            // Method 3: Raw socket simulation (CORS-based detection)
            this.testRawConnection(ip, port, controller.signal)
          ]);
          
          clearTimeout(timeoutId);
          
          // If any method indicates a printer is present
          const hasConnection = detectionMethods.some(result => 
            result.status === 'fulfilled' && result.value === true
          );
          
          if (hasConnection) {
            return {
              id: `ethernet-${ip}-${port}`,
              name: await this.identifyPrinterModel(ip, port),
              type: 'wifi', // Ethernet printers are treated as wifi type
              address: `${ip}:${port}`,
              connected: false,
            };
          }
          
          return null;
        } catch {
          clearTimeout(timeoutId);
          return null;
        }
      } else {
        // Enhanced mobile ethernet printer detection
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000); // Extended timeout
          
          // Enhanced reachability test
          this.pingAddress(ip, port)
            .then(isReachable => {
              clearTimeout(timeout);
              if (isReachable) {
                // Enhanced printer port validation
                const allPrinterPorts = [
                  9100, 9101, 9102, 9103, 9104, 9105, // ESC/POS
                  3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, // Star
                  10001, 10002, 10003, 10004, 10005, 8001, 8002, 8003, 8004, 8005, // Epson
                  4001, 4002, 4003, 4004, // Citizen
                  5001, 5002, 5003, 5004, // Bixolon
                  6001, 6002, 6003, // Brother
                  6101, 6102, 6103, // Zebra
                  515, 631, 80, 443, 8080, 8443, 23, 9600, 7001, 7002,
                  11000, 11001, 11002, 12000, 12001, 12002, 13000, 13001, 13002
                ];
                
                if (allPrinterPorts.includes(port)) {
                  this.identifyPrinterModel(ip, port).then(name => {
                    resolve({
                      id: `ethernet-${ip}-${port}`,
                      name,
                      type: 'wifi',
                      address: `${ip}:${port}`,
                      connected: false,
                    });
                  }).catch(() => {
                    resolve({
                      id: `ethernet-${ip}-${port}`,
                      name: `Network Printer (${ip}:${port})`,
                      type: 'wifi',
                      address: `${ip}:${port}`,
                      connected: false,
                    });
                  });
                } else {
                  resolve(null);
                }
              } else {
                resolve(null);
              }
            })
            .catch(() => {
              clearTimeout(timeout);
              resolve(null);
            });
        });
      }
    } catch {
      return null;
    }
  }
  
  private getProtocolsForPort(port: number): string[] {
    switch (port) {
      case 443:
        return ['https'];
      case 80:
      case 8080:
        return ['http'];
      case 631:
        return ['http', 'https']; // IPP can use both
      default:
        return ['http']; // Try HTTP first for most printer ports
    }
  }
  
  private async testProtocolConnection(ip: string, port: number, signal: AbortSignal): Promise<boolean> {
    try {
      const protocols = this.getProtocolsForPort(port);
      
      for (const protocol of protocols) {
        try {
          await fetch(`${protocol}://${ip}:${port}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal,
            cache: 'no-cache'
          });
          return true;
        } catch (error: any) {
          // CORS errors often indicate the server is reachable
          if (this.isCORSOrNetworkError(error)) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  
  private async testPrinterEndpoints(ip: string, port: number, signal: AbortSignal): Promise<boolean> {
    try {
      // Test common printer endpoints
      const endpoints = [
        '/', '/status', '/info', '/printer', '/cgi-bin/status',
        '/PRESENTATION/ADVANCED', '/WebPRNT/status', '/status.xml'
      ];
      
      const protocol = port === 443 ? 'https' : 'http';
      
      for (const endpoint of endpoints) {
        try {
          await fetch(`${protocol}://${ip}:${port}${endpoint}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal,
            cache: 'no-cache'
          });
          return true;
        } catch (error: any) {
          if (this.isCORSOrNetworkError(error)) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  
  private async testRawConnection(ip: string, port: number, signal: AbortSignal): Promise<boolean> {
    try {
      // Try a simple connectivity test that might trigger CORS
      const testUrl = `http://${ip}:${port}/favicon.ico`;
      
      await fetch(testUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal,
        cache: 'no-cache'
      });
      return true;
    } catch (error: any) {
      return this.isCORSOrNetworkError(error);
    }
  }
  
  private isCORSOrNetworkError(error: any): boolean {
    return error?.name === 'TypeError' || 
           error?.name === 'AbortError' ||
           (error?.message && (
             error.message.includes('CORS') || 
             error.message.includes('Failed to fetch') ||
             error.message.includes('NetworkError') ||
             error.message.includes('net::ERR') ||
             error.message.includes('ERR_CONNECTION_REFUSED') ||
             error.message.includes('ERR_CONNECTION_TIMED_OUT')
           ));
  }
  
  private async identifyPrinterModel(ip: string, port: number): Promise<string> {
    // Enhanced printer model identification with manufacturer-specific detection
    try {
      if (Platform.OS === 'web') {
        // Try manufacturer-specific identification endpoints
        const identificationResults = await Promise.allSettled([
          this.identifyStarPrinter(ip, port),
          this.identifyEpsonPrinter(ip, port),
          this.identifyCitizenPrinter(ip, port),
          this.identifyBixolonPrinter(ip, port),
          this.identifyGenericPrinter(ip, port)
        ]);
        
        // Return the first successful identification
        for (const result of identificationResults) {
          if (result.status === 'fulfilled' && result.value) {
            return result.value;
          }
        }
      }
    } catch {
      // Fall back to port-based identification
    }
    
    return this.getPrinterNameByPort(ip, port);
  }
  
  private async identifyStarPrinter(ip: string, port: number): Promise<string | null> {
    try {
      const starEndpoints = [
        '/StarWebPRNT/status',
        '/StarWebPRNT/info',
        '/cgi-bin/status',
        '/status.xml'
      ];
      
      const protocol = port === 443 ? 'https' : 'http';
      
      for (const endpoint of starEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          await fetch(`${protocol}://${ip}:${port}${endpoint}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return `Star Micronics TSP Printer (${ip})`;
        } catch (error: any) {
          if (this.isCORSOrNetworkError(error)) {
            return `Star Micronics Receipt Printer (${ip})`;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  
  private async identifyEpsonPrinter(ip: string, port: number): Promise<string | null> {
    try {
      const epsonEndpoints = [
        '/PRESENTATION/ADVANCED',
        '/status',
        '/info.xml',
        '/cgi-bin/epos/service.cgi'
      ];
      
      const protocol = port === 443 ? 'https' : 'http';
      
      for (const endpoint of epsonEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          await fetch(`${protocol}://${ip}:${port}${endpoint}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return `Epson TM Series Printer (${ip})`;
        } catch (error: any) {
          if (this.isCORSOrNetworkError(error)) {
            return `Epson Receipt Printer (${ip})`;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  
  private async identifyCitizenPrinter(ip: string, port: number): Promise<string | null> {
    try {
      const citizenEndpoints = [
        '/status',
        '/info',
        '/printer_status'
      ];
      
      const protocol = port === 443 ? 'https' : 'http';
      
      for (const endpoint of citizenEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          await fetch(`${protocol}://${ip}:${port}${endpoint}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return `Citizen CT Series Printer (${ip})`;
        } catch (error: any) {
          if (this.isCORSOrNetworkError(error)) {
            return `Citizen Receipt Printer (${ip})`;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  
  private async identifyBixolonPrinter(ip: string, port: number): Promise<string | null> {
    try {
      const bixolonEndpoints = [
        '/status',
        '/info',
        '/WebPRNT/status'
      ];
      
      const protocol = port === 443 ? 'https' : 'http';
      
      for (const endpoint of bixolonEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          await fetch(`${protocol}://${ip}:${port}${endpoint}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return `Bixolon SRP Series Printer (${ip})`;
        } catch (error: any) {
          if (this.isCORSOrNetworkError(error)) {
            return `Bixolon Receipt Printer (${ip})`;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  
  private async identifyGenericPrinter(ip: string, port: number): Promise<string | null> {
    try {
      const genericEndpoints = [
        '/',
        '/status',
        '/info',
        '/printer'
      ];
      
      const protocol = port === 443 ? 'https' : 'http';
      
      for (const endpoint of genericEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          await fetch(`${protocol}://${ip}:${port}${endpoint}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return this.getPrinterNameByPort(ip, port);
        } catch (error: any) {
          if (this.isCORSOrNetworkError(error)) {
            return this.getPrinterNameByPort(ip, port);
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  
  private getPrinterNameByPort(ip: string, port: number): string {
    // Enhanced printer identification based on manufacturer-specific ports
    
    // Star Micronics printers
    if ([3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 12000, 12001, 12002].includes(port)) {
      return `Star Micronics Receipt Printer (${ip})`;
    }
    
    // Epson printers
    if ([10001, 10002, 10003, 10004, 10005, 8001, 8002, 8003, 8004, 8005, 11000, 11001, 11002].includes(port)) {
      return `Epson Receipt Printer (${ip})`;
    }
    
    // Citizen printers
    if ([4001, 4002, 4003, 4004].includes(port)) {
      return `Citizen Receipt Printer (${ip})`;
    }
    
    // Bixolon printers
    if ([5001, 5002, 5003, 5004].includes(port)) {
      return `Bixolon Receipt Printer (${ip})`;
    }
    
    // Brother printers
    if ([6001, 6002, 6003].includes(port)) {
      return `Brother Receipt Printer (${ip})`;
    }
    
    // Zebra printers
    if ([6101, 6102, 6103].includes(port)) {
      return `Zebra Receipt Printer (${ip})`;
    }
    
    // Standard ESC/POS ports
    if ([9100, 9101, 9102, 9103, 9104, 9105].includes(port)) {
      return `ESC/POS Thermal Printer (${ip})`;
    }
    
    // Standard network printing protocols
    if (port === 515) {
      return `LPR Receipt Printer (${ip})`;
    } else if (port === 631) {
      return `IPP Receipt Printer (${ip})`;
    } else if (port === 80) {
      return `HTTP Receipt Printer (${ip})`;
    } else if (port === 443) {
      return `HTTPS Receipt Printer (${ip})`;
    } else if (port === 8080) {
      return `Web Receipt Printer (${ip})`;
    } else if (port === 8443) {
      return `Secure Web Receipt Printer (${ip})`;
    } else if (port === 23) {
      return `Telnet Receipt Printer (${ip})`;
    } else if (port === 9600) {
      return `Ethernet Receipt Printer (${ip})`;
    } else if ([7001, 7002].includes(port)) {
      return `Network Receipt Printer (${ip})`;
    } else if ([13000, 13001, 13002].includes(port)) {
      return `Specialty Receipt Printer (${ip})`;
    }
    
    return `Ethernet Receipt Printer (${ip}:${port})`;
  }
  
  private async pingAddress(ip: string, port?: number): Promise<boolean> {
    // Enhanced ping implementation for ethernet printer detection
    try {
      const startTime = Date.now();
      
      // Try multiple approaches for ethernet printers
      const pingPromises: Promise<any>[] = [];
      
      if (port) {
        // If specific port provided, test that port
        const protocols = this.getProtocolsForPort(port);
        for (const protocol of protocols) {
          pingPromises.push(
            fetch(`${protocol}://${ip}:${port}`, {
              method: 'HEAD',
              mode: 'no-cors',
              signal: AbortSignal.timeout(3000)
            }).catch(() => null)
          );
        }
      } else {
        // General connectivity test
        pingPromises.push(
          // Try HTTP
          fetch(`http://${ip}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(2000)
          }).catch(() => null),
          
          // Try HTTPS
          fetch(`https://${ip}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(2000)
          }).catch(() => null),
          
          // Try common printer ports
          fetch(`http://${ip}:9100`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(2000)
          }).catch(() => null),
          
          fetch(`http://${ip}:80`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(2000)
          }).catch(() => null)
        );
      }
      
      const results = await Promise.allSettled(pingPromises);
      const endTime = Date.now();
      
      // If any request succeeded or failed with CORS/network error (indicating reachability)
      const hasResponse = results.some(result => {
        if (result.status === 'fulfilled') return true;
        if (result.status === 'rejected') {
          const error = result.reason;
          return error?.name === 'TypeError' && 
                 (error?.message?.includes('CORS') || 
                  error?.message?.includes('Failed to fetch') ||
                  error?.message?.includes('NetworkError') ||
                  error?.message?.includes('net::ERR'));
        }
        return false;
      });
      
      // If response time is reasonable and we got some response, consider it reachable
      return hasResponse && (endTime - startTime) < 6000;
    } catch {
      return false;
    }
  }
  
  private async discoverBluetoothPrinters(): Promise<PrinterDevice[]> {
    console.log('Scanning for paired/connected Bluetooth printers...');
    
    try {
      // Check if Bluetooth is available and enabled
      const isBluetoothAvailable = await this.checkBluetoothAvailability();
      if (!isBluetoothAvailable) {
        console.log('Bluetooth not available or disabled');
        return [];
      }
      
      // Get paired/connected Bluetooth devices
      const pairedDevices = await this.getPairedBluetoothDevices();
      
      // Filter for printer devices
      const printerDevices = pairedDevices.filter(device => 
        this.isBluetoothPrinter(device.name)
      );
      
      console.log(`Found ${printerDevices.length} Bluetooth printer devices`);
      return printerDevices;
    } catch (error) {
      console.error('Error scanning for Bluetooth printers:', error);
      return [];
    }
  }
  
  private async checkBluetoothAvailability(): Promise<boolean> {
    // In a real implementation, you would check:
    // 1. If Bluetooth is supported on the device
    // 2. If Bluetooth is enabled
    // 3. If app has Bluetooth permissions
    
    // For now, simulate availability check
    return Platform.OS !== 'web'; // Bluetooth not available on web
  }
  
  private async getPairedBluetoothDevices(): Promise<PrinterDevice[]> {
    // In a real implementation, you would:
    // 1. Use expo-bluetooth or react-native-bluetooth-serial
    // 2. Get list of paired devices
    // 3. Check connection status of each device
    
    // Simulate getting paired devices
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return empty array for now - only show actually connected devices
    // In real implementation, you'd check which paired devices are currently connected
    return [];
  }
  
  private isBluetoothPrinter(deviceName: string): boolean {
    const printerKeywords = [
      'printer', 'receipt', 'pos', 'star', 'epson', 'citizen', 'bixolon',
      'tsp', 'tm-', 'rp-', 'ct-', 'srp-', 'spp-'
    ];
    
    const lowerName = deviceName.toLowerCase();
    return printerKeywords.some(keyword => lowerName.includes(keyword));
  }

  private async connectWiFiPrinter(device: PrinterDevice): Promise<boolean> {
    if (Platform.OS === 'web') {
      // For web, we'll use a different approach - direct network printing
      console.log(`Attempting WiFi connection to ${device.address}`);
      
      // In a real implementation, you would:
      // 1. Check if the printer is reachable
      // 2. Establish a connection using WebSocket or HTTP
      // 3. Send ESC/POS commands
      
      // For demo purposes, simulate successful connection
      this.connectedPrinter = { ...device, connected: true };
      return true;
    }
    
    // For mobile, you could use expo-network to check connectivity
    // and implement actual WiFi printer communication
    this.connectedPrinter = { ...device, connected: true };
    return true;
  }

  private async connectBluetoothPrinter(device: PrinterDevice): Promise<boolean> {
    if (Platform.OS === 'web') {
      throw new Error('Bluetooth printing not supported on web');
    }
    
    // For mobile, you would implement Bluetooth connection here
    // This would require custom native modules or expo dev client
    console.log(`Attempting Bluetooth connection to ${device.address}`);
    
    // Simulate connection
    this.connectedPrinter = { ...device, connected: true };
    return true;
  }

  async printReceipt(content: string): Promise<boolean> {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    console.log('Printing receipt to:', this.connectedPrinter.name);
    console.log('Receipt content:', content);

    try {
      if (this.connectedPrinter.type === 'wifi') {
        return await this.printToWiFiPrinter(content);
      } else if (this.connectedPrinter.type === 'bluetooth') {
        return await this.printToBluetoothPrinter(content);
      }
      
      return false;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }

  private async printToWiFiPrinter(content: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      // For web, create a formatted print dialog
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        const escPosFormatted = this.formatForReceiptPrinter(content);
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt Print</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  line-height: 1.2;
                  margin: 0;
                  padding: 10px;
                  width: 58mm;
                  background: white;
                }
                .receipt {
                  white-space: pre-line;
                }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                @media print {
                  body { margin: 0; padding: 5px; }
                }
              </style>
            </head>
            <body>
              <div class="receipt">${escPosFormatted}</div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 1000);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        return true;
      }
      return false;
    }
    
    // For mobile WiFi printing, you would send ESC/POS commands
    // to the printer's IP address using HTTP or raw socket connection
    console.log('Sending to WiFi printer:', this.connectedPrinter?.address);
    
    // Simulate printing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  }

  private async printToBluetoothPrinter(content: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      throw new Error('Bluetooth printing not supported on web');
    }
    
    // For mobile Bluetooth printing, you would send ESC/POS commands
    // via Bluetooth connection
    console.log('Sending to Bluetooth printer:', this.connectedPrinter?.address);
    
    // Simulate printing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  }

  private formatForReceiptPrinter(content: string): string {
    // Convert plain text to HTML formatted for receipt printing
    return content
      .replace(/^NIGHTLY SALES REPORT$/gm, '<div class="center bold">NIGHTLY SALES REPORT</div>')
      .replace(/^(SUMMARY|PAYMENT BREAKDOWN|DEPARTMENT BREAKDOWN|STAFF PERFORMANCE|TOP PRODUCTS)$/gm, '<div class="bold">$1</div><div class="line"></div>')
      .replace(/^(.+): \$([0-9,]+\.[0-9]{2})$/gm, '$1: <span class="bold">$$$$2</span>')
      .replace(/^([0-9]+\. .+)$/gm, '<span class="bold">$1</span>')
      .replace(/\n/g, '<br>');
  }

  async disconnectPrinter(): Promise<void> {
    if (this.connectedPrinter) {
      console.log(`Disconnecting from printer: ${this.connectedPrinter.name}`);
      this.connectedPrinter = null;
    }
  }

  getConnectedPrinter(): PrinterDevice | null {
    return this.connectedPrinter;
  }

  formatReceiptContent(report: NightlyReport, userName: string, userRole: string): string {
    const formatCurrency = (amount: number) => `${amount.toFixed(2)}`;
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    return `
NIGHTLY SALES REPORT
${formatDate(new Date(report.date))}
${new Date().toLocaleTimeString()}

================================

SUMMARY
Total Sales: ${formatCurrency(report.totalSales)}
Total Orders: ${report.totalOrders}
Average Order: ${formatCurrency(report.totalOrders > 0 ? report.totalSales / report.totalOrders : 0)}

================================

PAYMENT BREAKDOWN
Cash Sales: ${formatCurrency(report.cashSales)}
Card Sales: ${formatCurrency(report.cardSales)}
Credit Card Fees: ${formatCurrency(report.creditCardFees)}

================================

DEPARTMENT BREAKDOWN
Candy Counter: ${formatCurrency(report.departmentBreakdown['candy-counter'].sales)}
Orders: ${report.departmentBreakdown['candy-counter'].orders}

================================

STAFF PERFORMANCE
${report.userBreakdown.map(user => 
  `${user.userName}: ${formatCurrency(user.sales)} (${user.orders} orders)`
).join('\n')}

================================

Generated by: ${userName} (${userRole})
${new Date().toLocaleString()}

Thank you!



    `.trim();
  }
}

export const printerService = new ReceiptPrinterService();
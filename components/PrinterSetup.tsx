import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TheatreColors } from '@/constants/theatre-colors';
import { 
  Printer, 
  Wifi, 
  Bluetooth, 
  CheckCircle, 
  X,
  Search,
  Settings
} from 'lucide-react-native';
import { printerService, PrinterDevice } from '@/services/printer-service';

interface PrinterSetupProps {
  visible: boolean;
  onClose: () => void;
  onPrinterConnected: (printer: PrinterDevice) => void;
}

export function PrinterSetup({ visible, onClose, onPrinterConnected }: PrinterSetupProps) {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(null);

  useEffect(() => {
    if (visible) {
      setConnectedPrinter(printerService.getConnectedPrinter());
      handleScanPrinters();
    }
  }, [visible]);

  const handleScanPrinters = async () => {
    try {
      setIsScanning(true);
      const discoveredPrinters = await printerService.discoverPrinters();
      setPrinters(discoveredPrinters);
    } catch (error) {
      console.error('Failed to scan for printers:', error);
      Alert.alert('Error', 'Failed to scan for printers. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectPrinter = async (printer: PrinterDevice) => {
    try {
      setIsConnecting(printer.id);
      const success = await printerService.connectToPrinter(printer);
      
      if (success) {
        setConnectedPrinter(printer);
        onPrinterConnected(printer);
        Alert.alert(
          'Success', 
          `Connected to ${printer.name}`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Error', `Failed to connect to ${printer.name}`);
      }
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      Alert.alert('Error', 'Failed to connect to printer. Please try again.');
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnectPrinter = async () => {
    try {
      await printerService.disconnectPrinter();
      setConnectedPrinter(null);
      Alert.alert('Disconnected', 'Printer disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect printer:', error);
      Alert.alert('Error', 'Failed to disconnect printer');
    }
  };

  const getPrinterIcon = (type: 'wifi' | 'bluetooth') => {
    return type === 'wifi' ? (
      <Wifi size={20} color={TheatreColors.primary} />
    ) : (
      <Bluetooth size={20} color={TheatreColors.accent} />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Printer size={24} color={TheatreColors.primary} />
            <Text style={styles.title}>Receipt Printer Setup</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={TheatreColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Connected Printer */}
          {connectedPrinter && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected Printer</Text>
              <View style={[styles.printerCard, styles.connectedCard]}>
                <View style={styles.printerInfo}>
                  {getPrinterIcon(connectedPrinter.type)}
                  <View style={styles.printerDetails}>
                    <Text style={styles.printerName}>{connectedPrinter.name}</Text>
                    <Text style={styles.printerAddress}>{connectedPrinter.address}</Text>
                  </View>
                </View>
                <View style={styles.printerActions}>
                  <CheckCircle size={20} color={TheatreColors.success} />
                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleDisconnectPrinter}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Available Printers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Printers</Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScanPrinters}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color={TheatreColors.primary} />
                ) : (
                  <Search size={20} color={TheatreColors.primary} />
                )}
                <Text style={styles.scanButtonText}>
                  {isScanning ? 'Scanning...' : 'Scan'}
                </Text>
              </TouchableOpacity>
            </View>

            {printers.length === 0 && !isScanning && (
              <View style={styles.emptyState}>
                <Settings size={48} color={TheatreColors.textSecondary} />
                <Text style={styles.emptyStateText}>No connected printers found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Only printers that are powered on and reachable via network or Bluetooth will appear here.
                  {"\n\n"}
                  For WiFi/Ethernet printers: Ensure they&apos;re connected to the same network and powered on.
                  {"\n"}
                  For Bluetooth printers: Make sure they&apos;re paired and connected to this device.
                  {"\n\n"}
                  Ethernet printers are automatically detected on common network ranges and ports.
                </Text>
              </View>
            )}

            {printers.map((printer) => (
              <View key={printer.id} style={styles.printerCard}>
                <View style={styles.printerInfo}>
                  {getPrinterIcon(printer.type)}
                  <View style={styles.printerDetails}>
                    <Text style={styles.printerName}>{printer.name}</Text>
                    <Text style={styles.printerAddress}>{printer.address}</Text>
                    <Text style={styles.printerType}>
                      {printer.type.toUpperCase()} Printer
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.connectButton,
                    connectedPrinter?.id === printer.id && styles.connectedButton,
                    isConnecting === printer.id && styles.connectingButton,
                  ]}
                  onPress={() => handleConnectPrinter(printer)}
                  disabled={isConnecting !== null || connectedPrinter?.id === printer.id}
                >
                  {isConnecting === printer.id ? (
                    <ActivityIndicator size="small" color={TheatreColors.background} />
                  ) : connectedPrinter?.id === printer.id ? (
                    <CheckCircle size={16} color={TheatreColors.background} />
                  ) : null}
                  <Text style={styles.connectButtonText}>
                    {isConnecting === printer.id
                      ? 'Connecting...'
                      : connectedPrinter?.id === printer.id
                      ? 'Connected'
                      : 'Connect'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Setup Instructions</Text>
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionTitle}>WiFi/Ethernet Printers:</Text>
              <Text style={styles.instructionText}>
                • Printer must be powered on and connected to the network{'\n'}
                • Ethernet printers connected via cable are automatically detected{'\n'}
                • Enhanced support for Star, Epson, Citizen, Bixolon, Brother, and Zebra printers{'\n'}
                • Comprehensive port scanning including manufacturer-specific ports{'\n'}
                • Multiple network ranges checked including factory defaults{'\n'}
                • Only reachable printers will appear in the list above
              </Text>
              
              <Text style={[styles.instructionTitle, { marginTop: 16 }]}>Bluetooth Printers:</Text>
              <Text style={styles.instructionText}>
                • Printer must be paired with this device first{'\n'}
                • Printer must be powered on and within range{'\n'}
                • Only connected Bluetooth printers will be shown
              </Text>
              
              <Text style={[styles.instructionTitle, { marginTop: 16 }]}>Supported Brands & Ports:</Text>
              <Text style={styles.instructionText}>
                • Star Micronics: Ports 3001-3008, 12000-12002{'\n'}
                • Epson: Ports 8001-8005, 10001-10005, 11000-11002{'\n'}
                • Citizen: Ports 4001-4004{'\n'}
                • Bixolon: Ports 5001-5004{'\n'}
                • Brother: Ports 6001-6003{'\n'}
                • Zebra: Ports 6101-6103{'\n'}
                • Standard ESC/POS: Ports 9100-9105
              </Text>
              
              <Text style={[styles.instructionTitle, { marginTop: 16 }]}>Troubleshooting:</Text>
              <Text style={styles.instructionText}>
                • If your ethernet printer doesn&apos;t appear, check power and cable connection{'\n'}
                • Verify the printer has a valid IP address on your network{'\n'}
                • Try scanning again after ensuring printer is ready{'\n'}
                • Enhanced detection covers manufacturer factory default IP ranges{'\n'}
                • Scan includes 40+ ports per manufacturer for comprehensive coverage{'\n'}
                • Some printers may take longer to respond - wait for scan to complete
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TheatreColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: TheatreColors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TheatreColors.text,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.surface,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.primary,
  },
  printerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  connectedCard: {
    borderWidth: 2,
    borderColor: TheatreColors.success,
    backgroundColor: TheatreColors.surface,
  },
  printerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  printerDetails: {
    flex: 1,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginBottom: 2,
  },
  printerAddress: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    marginBottom: 2,
  },
  printerType: {
    fontSize: 12,
    color: TheatreColors.accent,
    fontWeight: '500',
  },
  printerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: TheatreColors.primary,
  },
  connectedButton: {
    backgroundColor: TheatreColors.success,
  },
  connectingButton: {
    backgroundColor: TheatreColors.textSecondary,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TheatreColors.background,
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: TheatreColors.error,
  },
  disconnectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: TheatreColors.background,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: TheatreColors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: TheatreColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: TheatreColors.text,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: TheatreColors.textSecondary,
    lineHeight: 20,
  },
});
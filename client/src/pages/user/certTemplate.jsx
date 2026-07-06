import { useOutletContext } from "react-router-dom"; 
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import { PDFViewer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { flexDirection: "column", backgroundColor: "#fcfbf8", padding: 30 },
  outerBorder: { border: "4pt solid #1e3a8a", padding: 6, flexGrow: 1 },
  innerBorder: { border: "2pt solid #b89f5d", flexGrow: 1, padding: 40, alignItems: "center", position: "relative" },
  
  // Top corner elements
  qrCode: { position: "absolute", top: 20, left: 30, width: 55, height: 55 },
  certNumber: { position: "absolute", top: 20, right: 30, fontSize: 8, color: "#888" },
  
  headerText: { fontSize: 10, textTransform: "uppercase", color: "#555", marginBottom: 4, letterSpacing: 1 },
  headerSub: { fontSize: 10, color: "#777", marginBottom: 20, textAlign: "center" },
  title: { fontSize: 38, fontWeight: "bold", color: "#1e3a8a", marginBottom: 5, letterSpacing: 2 },
  subtitle: { fontSize: 16, color: "#b89f5d", marginBottom: 20, letterSpacing: 1 },
  certifyText: { fontSize: 12, marginBottom: 15, color: "#444" },
  nameContainer: { borderBottom: "1.5pt solid #1e3a8a", minWidth: 400, marginBottom: 5, paddingBottom: 5, alignItems: "center" },
  name: { fontSize: 28, fontWeight: "bold", color: "#000" },
  nameSubLine: { fontSize: 8, color: "#777", marginBottom: 20, textTransform: "uppercase", letterSpacing: 1 },
  description: { fontSize: 11, lineHeight: 1.5, marginHorizontal: 60, marginBottom: 15, textAlign: "center", color: "#333" },
  dateText: { fontSize: 11, marginTop: 10, color: "#555", fontStyle: "italic" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", width: "100%", position: "absolute", bottom: 30, paddingHorizontal: 30 },
  sigBlock: { alignItems: "center", width: 180 },
  sigName: { fontSize: 12, fontWeight: "bold", color: "#1e3a8a", textTransform: "uppercase", marginBottom: 4 },
  sigLine: { borderTop: "1pt solid #000", width: "100%", paddingTop: 4, alignItems: "center" },
  sigTitle: { fontSize: 10, color: "#555" },
  sealPlaceholder: { width: 70, height: 70, borderRadius: 35, border: "2pt dashed #b89f5d", justifyContent: "center", alignItems: "center" },
  sealText: { fontSize: 8, color: "#b89f5d", textAlign: "center", textTransform: "uppercase", fontWeight: "bold" }
});

export default function CertificateTemplate() {
  const { currentUser } = useOutletContext();
  const residentName = currentUser?.name || "Resident"; 

  const { data: certData } = useQuery({
    queryKey: ["certificateData"],
    queryFn: async () => {
      const response = await apiClient.get('/users/certificate-data');
      return response.data;
    }
  });



  // Construct the ID
  const dbControlNumber = certData?.certControl_no || "0000";
  const certId = `DRRM-BAC-2026-${dbControlNumber}`;

  // Use a reliable QR Code API instead of fighting Vite packages
  const verificationUrl = `https://bacolor-lms.edu.ph/verify?id=${certId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;

  const dateIssued = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const barangayAdminName = "Hon. Juan Dela Cruz"; 
  const systemAdminName = "System Administrator";

  return (
    <div className="flex flex-col h-full w-full bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{residentName}'s Certification</h1>
          <p className="text-gray-500 text-sm">View and download your official completion certificate below.</p>
        </div>
      </div>
      
      <div className="w-full mt-4 border-2 border-gray-200 rounded-xl overflow-hidden shadow-inner">
        <PDFViewer style={{ width: "100%", height: "800px", border: "none", display: "block" }} showToolbar={false}>
          <Document>
             <Page size="A4" orientation="landscape" style={styles.page}>
              <View style={styles.outerBorder}>
                <View style={styles.innerBorder}>
                  
                  {/* Fetches the QR image instantly from the web */}
                  <Image style={styles.qrCode} src={qrImageUrl} />

                  <Text style={styles.certNumber}>Control No. {certId}</Text>
                  
                  <Text style={styles.headerText}>Republic of the Philippines</Text>
                  <Text style={styles.headerSub}>
                    Municipality of Bacolor, Pampanga{"\n"}
                    Municipal Disaster Risk Reduction and Management Office
                  </Text>
                  <Text style={styles.title}>CERTIFICATE</Text>
                  <Text style={styles.subtitle}>OF COMPLETION</Text>
                  <Text style={styles.certifyText}>This is to officially certify that</Text>
                  <View style={styles.nameContainer}>
                    <Text style={styles.name}>{residentName}</Text>
                  </View>
                  <Text style={styles.nameSubLine}>Authorized Resident</Text>
                  <Text style={styles.description}>
                    has successfully satisfied all academic and practical requirements of the Community Disaster 
                    Learning Management System. The aforementioned resident has demonstrated comprehensive 
                    knowledge and tactical readiness in Disaster Risk Reduction and Management (DRRM) 
                    protocols, strictly adhering to PRC and NDRRMC standards for Flooding, Earthquake, 
                    and Fire Safety scenarios.
                  </Text>
                  <Text style={styles.dateText}>Conferred this {dateIssued}.</Text>

                  <View style={styles.bottomRow}>
                    <View style={styles.sigBlock}>
                      <Text style={styles.sigName}>{barangayAdminName}</Text>
                      <View style={styles.sigLine}>
                        <Text style={styles.sigTitle}>Barangay Administrator</Text>
                      </View>
                    </View>
                    <View style={styles.sealPlaceholder}>
                      <Text style={styles.sealText}>Official{"\n"}MDRRMO{"\n"}Seal</Text>
                    </View>
                    <View style={styles.sigBlock}>
                      <Text style={styles.sigName}>{systemAdminName}</Text>
                      <View style={styles.sigLine}>
                        <Text style={styles.sigTitle}>Platform Verification</Text>
                      </View>
                    </View>
                  </View>

                </View>
              </View>
            </Page>
          </Document>
        </PDFViewer>
      </div>
    </div>
  );
}
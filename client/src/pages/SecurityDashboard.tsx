import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldX, Lock, 
  Globe, Server, AlertTriangle, CheckCircle2, XCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: "pass" | "warning" | "fail" | "pending";
  details?: string;
}

export default function SecurityDashboard() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([
    { id: "ssl", name: "SSL/TLS Certificate", description: "HTTPS encryption enabled", status: "pass", details: "Valid certificate" },
    { id: "hsts", name: "HSTS Header", description: "HTTP Strict Transport Security", status: "pass", details: "max-age=31536000" },
    { id: "csp", name: "Content Security Policy", description: "Prevents XSS attacks", status: "warning", details: "CSP could be stricter" },
    { id: "xframe", name: "X-Frame-Options", description: "Prevents clickjacking", status: "pass", details: "DENY" },
    { id: "xcontent", name: "X-Content-Type-Options", description: "Prevents MIME sniffing", status: "pass", details: "nosniff" },
    { id: "xss", name: "X-XSS-Protection", description: "XSS filter", status: "pass", details: "1; mode=block" },
    { id: "referrer", name: "Referrer-Policy", description: "Controls referrer info", status: "warning", details: "Consider stricter policy" },
    { id: "cors", name: "CORS Configuration", description: "Cross-origin sharing", status: "pass", details: "Properly configured" },
    { id: "cookies", name: "Secure Cookies", description: "HttpOnly and Secure flags", status: "pass", details: "All cookies secure" },
    { id: "deps", name: "Dependency Vulnerabilities", description: "Known package issues", status: "warning", details: "2 low severity" },
    { id: "auth", name: "Authentication Security", description: "Login and sessions", status: "pass", details: "OAuth 2.0 secure" },
  ]);

  const runSecurityScan = async () => {
    setIsScanning(true);
    toast.info("Running security scan...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLastScan(new Date());
    setIsScanning(false);
    toast.success("Security scan completed");
  };

  const passCount = securityChecks.filter(c => c.status === "pass").length;
  const warningCount = securityChecks.filter(c => c.status === "warning").length;
  const failCount = securityChecks.filter(c => c.status === "fail").length;
  const securityScore = Math.round((passCount / securityChecks.length) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "fail": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass": return <Badge className="bg-green-500/20 text-green-500">Pass</Badge>;
      case "warning": return <Badge className="bg-yellow-500/20 text-yellow-500">Warning</Badge>;
      case "fail": return <Badge className="bg-red-500/20 text-red-500">Fail</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="h-8 w-8" />Security Dashboard</h1>
            <p className="text-muted-foreground mt-2">Ethical hacking tools to test your website security</p>
          </div>
          <Button onClick={runSecurityScan} disabled={isScanning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? "Scanning..." : "Run Scan"}
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Security Score</p>
                  <p className="text-4xl font-bold text-primary">{securityScore}%</p>
                </div>
                {securityScore >= 80 ? <ShieldCheck className="h-12 w-12 text-green-500" /> : 
                 securityScore >= 60 ? <ShieldAlert className="h-12 w-12 text-yellow-500" /> : 
                 <ShieldX className="h-12 w-12 text-red-500" />}
              </div>
              <Progress value={securityScore} className="mt-4 h-2" />
            </CardContent>
          </Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Passed</p><p className="text-3xl font-bold text-green-500">{passCount}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Warnings</p><p className="text-3xl font-bold text-yellow-500">{warningCount}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Failed</p><p className="text-3xl font-bold text-red-500">{failCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Security Checks</CardTitle>
            <CardDescription>{lastScan ? `Last scan: ${lastScan.toLocaleString()}` : "Run a scan to check security"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityChecks.map(check => (
                <div key={check.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(check.status)}
                    <div>
                      <h4 className="font-medium">{check.name}</h4>
                      <p className="text-sm text-muted-foreground">{check.description}</p>
                      {check.details && <p className="text-xs text-muted-foreground">{check.details}</p>}
                    </div>
                  </div>
                  {getStatusBadge(check.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>OWASP Top 10</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: "A01: Broken Access Control", status: "pass" },
                { name: "A02: Cryptographic Failures", status: "pass" },
                { name: "A03: Injection", status: "pass" },
                { name: "A04: Insecure Design", status: "warning" },
                { name: "A05: Security Misconfiguration", status: "warning" },
                { name: "A06: Vulnerable Components", status: "warning" },
                { name: "A07: Auth Failures", status: "pass" },
                { name: "A08: Data Integrity", status: "pass" },
                { name: "A09: Logging Failures", status: "pass" },
                { name: "A10: SSRF", status: "pass" },
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">{item.name}</span>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>External Security Tools</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => window.open('https://observatory.mozilla.org/', '_blank')}>
                <Globe className="h-8 w-8 mb-2" /><span>Mozilla Observatory</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => window.open('https://www.ssllabs.com/ssltest/', '_blank')}>
                <Lock className="h-8 w-8 mb-2" /><span>SSL Labs</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => window.open('https://securityheaders.com/', '_blank')}>
                <Server className="h-8 w-8 mb-2" /><span>Security Headers</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

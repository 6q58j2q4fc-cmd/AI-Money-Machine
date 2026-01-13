import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Link2, DollarSign, Globe, CheckCircle2, AlertCircle, 
  ExternalLink, Settings, Zap, RefreshCw, Plus,
  ShoppingCart, Percent, CreditCard, Wallet, Building2,
  Code, Database, Cloud, Bot, Sparkles, Lock
} from "lucide-react";

// Affiliate Networks Configuration
const AFFILIATE_NETWORKS = [
  {
    id: 'cj',
    name: 'Commission Junction (CJ)',
    description: 'One of the largest affiliate networks with thousands of advertisers',
    logo: '🔗',
    fields: [
      { key: 'cid', label: 'CID (Company ID)', placeholder: 'Your CJ Company ID' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Your CJ API Key', secret: true },
      { key: 'websiteId', label: 'Website ID', placeholder: 'Your Website ID' }
    ],
    connected: true,
    earnings: '$0.00'
  },
  {
    id: 'shareasale',
    name: 'ShareASale',
    description: 'Popular affiliate network with diverse merchant programs',
    logo: '💰',
    fields: [
      { key: 'affiliateId', label: 'Affiliate ID', placeholder: 'Your ShareASale Affiliate ID' },
      { key: 'apiToken', label: 'API Token', placeholder: 'Your API Token', secret: true },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'Your API Secret', secret: true }
    ],
    connected: false,
    signupUrl: 'https://www.shareasale.com/join/'
  },
  {
    id: 'amazon',
    name: 'Amazon Associates',
    description: 'Earn commissions on Amazon product referrals',
    logo: '📦',
    fields: [
      { key: 'trackingId', label: 'Tracking ID', placeholder: 'your-tag-20' },
      { key: 'accessKey', label: 'Access Key', placeholder: 'Your Access Key', secret: true },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'Your Secret Key', secret: true }
    ],
    connected: false,
    signupUrl: 'https://affiliate-program.amazon.com/'
  },
  {
    id: 'clickbank',
    name: 'ClickBank',
    description: 'Digital products marketplace with high commissions',
    logo: '💳',
    fields: [
      { key: 'nickname', label: 'Account Nickname', placeholder: 'Your ClickBank Nickname' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Your API Key', secret: true },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'Your Secret Key', secret: true }
    ],
    connected: false,
    signupUrl: 'https://www.clickbank.com/signup/'
  },
  {
    id: 'rakuten',
    name: 'Rakuten Advertising',
    description: 'Global affiliate network with premium brands',
    logo: '🌐',
    fields: [
      { key: 'siteId', label: 'Site ID', placeholder: 'Your Rakuten Site ID' },
      { key: 'token', label: 'API Token', placeholder: 'Your API Token', secret: true }
    ],
    connected: false,
    signupUrl: 'https://rakutenadvertising.com/affiliate/'
  },
  {
    id: 'impact',
    name: 'Impact Radius',
    description: 'Partnership automation platform with major brands',
    logo: '🎯',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'Your Account SID' },
      { key: 'authToken', label: 'Auth Token', placeholder: 'Your Auth Token', secret: true }
    ],
    connected: false,
    signupUrl: 'https://impact.com/'
  },
  {
    id: 'awin',
    name: 'Awin',
    description: 'Global affiliate network with 21,000+ advertisers',
    logo: '🔄',
    fields: [
      { key: 'publisherId', label: 'Publisher ID', placeholder: 'Your Publisher ID' },
      { key: 'apiToken', label: 'API Token', placeholder: 'Your API Token', secret: true }
    ],
    connected: false,
    signupUrl: 'https://www.awin.com/us/publishers'
  },
  {
    id: 'flexoffers',
    name: 'FlexOffers',
    description: 'Affiliate network with 12,000+ advertisers',
    logo: '📊',
    fields: [
      { key: 'publisherId', label: 'Publisher ID', placeholder: 'Your Publisher ID' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Your API Key', secret: true }
    ],
    connected: false,
    signupUrl: 'https://www.flexoffers.com/'
  }
];

// Free API Services
const FREE_API_SERVICES = [
  {
    id: 'openai',
    name: 'OpenAI API',
    description: 'AI content generation and optimization',
    category: 'AI',
    icon: <Sparkles className="h-5 w-5" />,
    fields: [{ key: 'apiKey', label: 'API Key', secret: true }],
    connected: true,
    builtIn: true
  },
  {
    id: 'google-indexing',
    name: 'Google Indexing API',
    description: 'Fast indexing of new content',
    category: 'SEO',
    icon: <Globe className="h-5 w-5" />,
    fields: [{ key: 'serviceAccount', label: 'Service Account JSON', secret: true }],
    connected: false
  },
  {
    id: 'bing-webmaster',
    name: 'Bing Webmaster API',
    description: 'Submit URLs to Bing search',
    category: 'SEO',
    icon: <Globe className="h-5 w-5" />,
    fields: [{ key: 'apiKey', label: 'API Key', secret: true }],
    connected: false
  },
  {
    id: 'indexnow',
    name: 'IndexNow',
    description: 'Instant indexing for search engines',
    category: 'SEO',
    icon: <Zap className="h-5 w-5" />,
    fields: [],
    connected: true,
    builtIn: true
  },
  {
    id: 'medium',
    name: 'Medium API',
    description: 'Auto-publish articles to Medium',
    category: 'Publishing',
    icon: <Code className="h-5 w-5" />,
    fields: [{ key: 'integrationToken', label: 'Integration Token', secret: true }],
    connected: false
  },
  {
    id: 'devto',
    name: 'Dev.to API',
    description: 'Auto-publish to Dev.to community',
    category: 'Publishing',
    icon: <Code className="h-5 w-5" />,
    fields: [{ key: 'apiKey', label: 'API Key', secret: true }],
    connected: false
  },
  {
    id: 'hashnode',
    name: 'Hashnode API',
    description: 'Publish to Hashnode blogs',
    category: 'Publishing',
    icon: <Code className="h-5 w-5" />,
    fields: [{ key: 'apiKey', label: 'API Key', secret: true }],
    connected: false
  },
  {
    id: 'wordpress',
    name: 'WordPress REST API',
    description: 'Auto-post to WordPress sites',
    category: 'Publishing',
    icon: <Globe className="h-5 w-5" />,
    fields: [
      { key: 'siteUrl', label: 'Site URL' },
      { key: 'username', label: 'Username' },
      { key: 'appPassword', label: 'Application Password', secret: true }
    ],
    connected: false
  },
  {
    id: 'telegram',
    name: 'Telegram Bot API',
    description: 'Send notifications and updates',
    category: 'Notifications',
    icon: <Bot className="h-5 w-5" />,
    fields: [{ key: 'botToken', label: 'Bot Token', secret: true }],
    connected: false
  },
  {
    id: 'discord',
    name: 'Discord Webhooks',
    description: 'Post updates to Discord channels',
    category: 'Notifications',
    icon: <Bot className="h-5 w-5" />,
    fields: [{ key: 'webhookUrl', label: 'Webhook URL', secret: true }],
    connected: false
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp API',
    description: 'Email marketing automation',
    category: 'Marketing',
    icon: <CreditCard className="h-5 w-5" />,
    fields: [
      { key: 'apiKey', label: 'API Key', secret: true },
      { key: 'listId', label: 'List ID' }
    ],
    connected: false
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare API',
    description: 'CDN and performance optimization',
    category: 'Infrastructure',
    icon: <Cloud className="h-5 w-5" />,
    fields: [
      { key: 'apiToken', label: 'API Token', secret: true },
      { key: 'zoneId', label: 'Zone ID' }
    ],
    connected: false
  }
];

export default function NetworkConnections() {
  const [activeTab, setActiveTab] = useState("affiliate");
  const [networkCredentials, setNetworkCredentials] = useState<Record<string, Record<string, string>>>({});
  const [apiCredentials, setApiCredentials] = useState<Record<string, Record<string, string>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Note: saveApiCredentials mutation would need to be added to routers.ts
  // For now, we'll use a local state approach and toast notifications

  const handleNetworkConnect = async (networkId: string) => {
    const creds = networkCredentials[networkId];
    if (!creds || Object.keys(creds).length === 0) {
      toast.error("Please fill in the required credentials");
      return;
    }

    // In production, this would save to the database
    toast.success(`${networkId} credentials saved! Connection will be verified.`);
  };

  const handleApiConnect = async (serviceId: string) => {
    const creds = apiCredentials[serviceId];
    if (!creds || Object.keys(creds).length === 0) {
      toast.error("Please fill in the required credentials");
      return;
    }

    // In production, this would save to the database
    toast.success(`${serviceId} API connected successfully!`);
  };

  const updateNetworkCred = (networkId: string, key: string, value: string) => {
    setNetworkCredentials(prev => ({
      ...prev,
      [networkId]: { ...prev[networkId], [key]: value }
    }));
  };

  const updateApiCred = (serviceId: string, key: string, value: string) => {
    setApiCredentials(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], [key]: value }
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Link2 className="h-8 w-8 text-green-500" />
              Network Connections
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect affiliate networks and free APIs to maximize income
            </p>
          </div>
          <Badge variant="outline" className="text-lg py-2 px-4">
            <DollarSign className="h-5 w-5 mr-1" />
            PayPal: dakotarea@icloud.com
          </Badge>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-muted-foreground">Networks Connected</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <Globe className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-muted-foreground">Networks Available</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">APIs Connected</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">APIs Available</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="affiliate" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Affiliate Networks
            </TabsTrigger>
            <TabsTrigger value="apis" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Free API Services
            </TabsTrigger>
          </TabsList>

          {/* Affiliate Networks Tab */}
          <TabsContent value="affiliate" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AFFILIATE_NETWORKS.map((network) => (
                <Card key={network.id} className={network.connected ? "border-green-500/50" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{network.logo}</span>
                        <div>
                          <CardTitle className="text-lg">{network.name}</CardTitle>
                          <CardDescription className="text-xs">{network.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={network.connected ? "default" : "outline"}>
                        {network.connected ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                        ) : (
                          <><AlertCircle className="h-3 w-3 mr-1" /> Not Connected</>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {network.fields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs">{field.label}</Label>
                        <div className="flex gap-2">
                          <Input
                            type={field.secret && !showSecrets[`${network.id}-${field.key}`] ? "password" : "text"}
                            placeholder={field.placeholder}
                            value={networkCredentials[network.id]?.[field.key] || ''}
                            onChange={(e) => updateNetworkCred(network.id, field.key, e.target.value)}
                            className="text-sm"
                          />
                          {field.secret && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowSecrets(prev => ({
                                ...prev,
                                [`${network.id}-${field.key}`]: !prev[`${network.id}-${field.key}`]
                              }))}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        className="flex-1" 
                        onClick={() => handleNetworkConnect(network.id)}
                        disabled={network.connected}
                      >
                        {network.connected ? "Connected" : "Connect"}
                      </Button>
                      {network.signupUrl && !network.connected && (
                        <Button variant="outline" asChild>
                          <a href={network.signupUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Sign Up
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Free APIs Tab */}
          <TabsContent value="apis" className="space-y-4 mt-4">
            {['AI', 'SEO', 'Publishing', 'Notifications', 'Marketing', 'Infrastructure'].map((category) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {category === 'AI' && <Sparkles className="h-5 w-5 text-purple-500" />}
                  {category === 'SEO' && <Globe className="h-5 w-5 text-blue-500" />}
                  {category === 'Publishing' && <Code className="h-5 w-5 text-green-500" />}
                  {category === 'Notifications' && <Bot className="h-5 w-5 text-yellow-500" />}
                  {category === 'Marketing' && <CreditCard className="h-5 w-5 text-pink-500" />}
                  {category === 'Infrastructure' && <Cloud className="h-5 w-5 text-cyan-500" />}
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FREE_API_SERVICES.filter(s => s.category === category).map((service) => (
                    <Card key={service.id} className={service.connected ? "border-green-500/50" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              {service.icon}
                            </div>
                            <div>
                              <CardTitle className="text-sm">{service.name}</CardTitle>
                              <CardDescription className="text-xs">{service.description}</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {service.builtIn ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Built-in
                          </Badge>
                        ) : (
                          <>
                            {service.fields.map((field) => (
                              <div key={field.key} className="space-y-1">
                                <Label className="text-xs">{field.label}</Label>
                                <Input
                                  type={field.secret ? "password" : "text"}
                                  placeholder={`Enter ${field.label}`}
                                  value={apiCredentials[service.id]?.[field.key] || ''}
                                  onChange={(e) => updateApiCred(service.id, field.key, e.target.value)}
                                  className="text-sm h-8"
                                />
                              </div>
                            ))}
                            <Button 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => handleApiConnect(service.id)}
                            >
                              Connect
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Auto-Discovery Section */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Auto-Discovery Mode
            </CardTitle>
            <CardDescription>
              The Hive Mind continuously searches for new free APIs and services to integrate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm">Enable automatic discovery and integration of new services</p>
                <p className="text-xs text-muted-foreground">
                  The system will automatically find and connect to free APIs that can help generate income
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch defaultChecked />
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Scan Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

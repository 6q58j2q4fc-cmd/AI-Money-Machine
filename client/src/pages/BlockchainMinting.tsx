import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Wallet, FileCode, Fuel, Database, CheckCircle2, Circle,
  ExternalLink, Copy, Zap, Shield, Clock, DollarSign
} from "lucide-react";
import { toast } from "sonner";

const networks = [
  { name: "Ethereum", symbol: "ETH", gasPrice: "$5-50", speed: "12-15 sec", security: "Highest", color: "bg-blue-500" },
  { name: "Polygon", symbol: "MATIC", gasPrice: "$0.01-0.10", speed: "2 sec", security: "High", color: "bg-purple-500" },
  { name: "Arbitrum", symbol: "ETH", gasPrice: "$0.10-1.00", speed: "1-2 sec", security: "High", color: "bg-cyan-500" },
  { name: "Base", symbol: "ETH", gasPrice: "$0.01-0.05", speed: "2 sec", security: "High", color: "bg-blue-600" },
  { name: "Optimism", symbol: "ETH", gasPrice: "$0.05-0.50", speed: "2 sec", security: "High", color: "bg-red-500" },
];

const erc721Contract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MoneyMachineNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    constructor() ERC721("MoneyMachine NFT", "MMNFT") Ownable(msg.sender) {}
    
    function safeMint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`;

export default function BlockchainMinting() {
  const [checklist, setChecklist] = useState([
    { id: "wallet", title: "Set up a crypto wallet", description: "Install MetaMask or use a hardware wallet", completed: false, link: "https://metamask.io" },
    { id: "funds", title: "Fund your wallet", description: "Add ETH or MATIC for gas fees ($50-100 recommended)", completed: false },
    { id: "network", title: "Choose a blockchain network", description: "Select Ethereum for prestige or Polygon/Base for lower fees", completed: false },
    { id: "storage", title: "Set up IPFS/Arweave storage", description: "Use Pinata, NFT.Storage, or Arweave for metadata", completed: false, link: "https://www.pinata.cloud" },
    { id: "contract", title: "Deploy smart contract", description: "Deploy ERC-721 or ERC-1155 contract", completed: false },
    { id: "verify", title: "Verify contract on Etherscan", description: "Verify source code for transparency", completed: false, link: "https://etherscan.io/verifyContract" },
    { id: "test", title: "Test minting on testnet", description: "Mint test NFTs before mainnet", completed: false },
    { id: "launch", title: "Launch on mainnet", description: "Deploy and start minting real NFTs", completed: false },
  ]);

  const [gasPrice, setGasPrice] = useState(30);
  const [nftCount, setNftCount] = useState(100);
  const ethPrice = 2000;

  const toggleItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;
  const deploymentCost = ((gasPrice * 2000000) / 1e9) * ethPrice;
  const mintCost = ((gasPrice * 150000) / 1e9) * ethPrice;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Blockchain Minting Requirements</h1>
          <p className="text-muted-foreground mt-2">Everything you need to enable real NFT minting</p>
        </div>

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Setup Progress</h3>
                <p className="text-sm text-muted-foreground">{completedCount} of {checklist.length} steps completed</p>
              </div>
              <Badge variant={progress === 100 ? "default" : "secondary"} className="text-lg px-4 py-2">{Math.round(progress)}%</Badge>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        <Tabs defaultValue="checklist" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="networks">Networks</TabsTrigger>
            <TabsTrigger value="contracts">Smart Contracts</TabsTrigger>
            <TabsTrigger value="costs">Cost Calculator</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-4">
            {checklist.map((item, index) => (
              <Card key={item.id} className={`cursor-pointer transition-all ${item.completed ? 'bg-green-500/10 border-green-500/30' : 'hover:bg-muted/50'}`} onClick={() => toggleItem(item.id)}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">{index + 1}</div>
                  {item.completed ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  {item.link && (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); window.open(item.link, '_blank'); }}>
                      <ExternalLink className="h-4 w-4 mr-2" />Guide
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="networks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Blockchain Network Comparison</CardTitle>
                <CardDescription>Choose the best network for your NFT collection</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Network</th>
                      <th className="text-left py-3 px-4">Gas Cost</th>
                      <th className="text-left py-3 px-4">Speed</th>
                      <th className="text-left py-3 px-4">Security</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networks.map(network => (
                      <tr key={network.name} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${network.color}`} />
                            <span className="font-medium">{network.name}</span>
                            <Badge variant="outline" className="text-xs">{network.symbol}</Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4"><DollarSign className="h-4 w-4 inline mr-1" />{network.gasPrice}</td>
                        <td className="py-3 px-4"><Clock className="h-4 w-4 inline mr-1" />{network.speed}</td>
                        <td className="py-3 px-4"><Shield className="h-4 w-4 inline mr-1" />{network.security}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5" />Wallet Setup</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>MetaMask</strong> - Most popular, browser extension</p>
                  <p><strong>Ledger/Trezor</strong> - Hardware wallets for security</p>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open('https://metamask.io', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />Get MetaMask
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Database className="h-5 w-5" />Metadata Storage</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Pinata</strong> - Easy IPFS pinning, free tier</p>
                  <p><strong>NFT.Storage</strong> - Free, backed by Filecoin</p>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open('https://www.pinata.cloud', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />Get Pinata
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Fuel className="h-5 w-5" />Gas Optimization</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Batch minting</strong> - Mint multiple in one tx</p>
                  <p><strong>L2 networks</strong> - 10-100x cheaper than L1</p>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open('https://etherscan.io/gastracker', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />Gas Tracker
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><FileCode className="h-5 w-5" />ERC-721 Contract</CardTitle>
                    <CardDescription>Standard NFT contract - one token per ID</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(erc721Contract); toast.success("Contract copied!"); }}>
                    <Copy className="h-4 w-4 mr-2" />Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-80"><code>{erc721Contract}</code></pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Deployment Instructions</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Using Remix IDE</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Go to remix.ethereum.org</li>
                    <li>Create new file, paste contract code</li>
                    <li>Compile with Solidity 0.8.20+</li>
                    <li>Connect MetaMask, select network</li>
                    <li>Deploy and save contract address</li>
                  </ol>
                  <Button variant="outline" size="sm" onClick={() => window.open('https://remix.ethereum.org', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />Open Remix
                  </Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Using Hardhat</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>npm install hardhat @openzeppelin/contracts</li>
                    <li>npx hardhat init</li>
                    <li>Add contract to contracts/</li>
                    <li>Configure network in hardhat.config.js</li>
                    <li>npx hardhat run scripts/deploy.js</li>
                  </ol>
                  <Button variant="outline" size="sm" onClick={() => window.open('https://hardhat.org/docs', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />Hardhat Docs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Cost Calculator</CardTitle>
                <CardDescription>Estimate your NFT minting costs on Ethereum mainnet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Gas Price (Gwei): {gasPrice}</label>
                      <input type="range" min="10" max="200" value={gasPrice} onChange={(e) => setGasPrice(Number(e.target.value))} className="w-full mt-2" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Number of NFTs: {nftCount.toLocaleString()}</label>
                      <input type="range" min="1" max="10000" value={nftCount} onChange={(e) => setNftCount(Number(e.target.value))} className="w-full mt-2" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Contract Deployment</div>
                      <div className="text-2xl font-bold text-primary">${deploymentCost.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Per NFT Mint</div>
                      <div className="text-2xl font-bold text-primary">${mintCost.toFixed(2)}</div>
                    </div>
                    <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
                      <div className="text-sm text-muted-foreground">Total for {nftCount.toLocaleString()} NFTs</div>
                      <div className="text-3xl font-bold text-primary">${(deploymentCost + mintCost * nftCount).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                  <p className="text-sm"><strong>Tip:</strong> Use Polygon or Base to reduce costs by 90-99%.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

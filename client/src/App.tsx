import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import TrendingTopics from "./pages/TrendingTopics";
import Articles from "./pages/Articles";
import ArticleEditor from "./pages/ArticleEditor";
import AffiliateLinks from "./pages/AffiliateLinks";
import Analytics from "./pages/Analytics";
import MonetizationGuide from "./pages/MonetizationGuide";
import CJIntegration from "./pages/CJIntegration";
import AutoPublish from "./pages/AutoPublish";
import AutomationCenter from "./pages/AutomationCenter";
import Blog from "./pages/Blog";
import PublicArticle from "./pages/PublicArticle";
import DistributionCenter from "./pages/DistributionCenter";
import BotIntelligence from "./pages/BotIntelligence";
import Settings from "./pages/Settings";
import FreePublishingBot from "./pages/FreePublishingBot";
import DataAccuracy from "./pages/DataAccuracy";
import AuditLog from "./pages/AuditLog";
import AICommandCenter from "./pages/AICommandCenter";
import LLMSettings from "./pages/LLMSettings";
import ContentPipeline from "./pages/ContentPipeline";
import SystemOptimizer from "./pages/SystemOptimizer";
import ProductPages from "./pages/ProductPages";
import HiveMindCenter from "./pages/HiveMindCenter";
import NetworkConnections from "./pages/NetworkConnections";
import FreeIncome from "./pages/FreeIncome";
import NFTGallery from "./pages/NFTGallery";
import AwinIntegration from "./pages/AwinIntegration";
import NFTEmpire from './pages/NFTEmpire';
import AlwaysAwake from './pages/AlwaysAwake';
import WalletSettings from './pages/WalletSettings';
import HotWallet from './pages/HotWallet';
import SystemHealth from './pages/SystemHealth';
import DebugAdmin from './pages/DebugAdmin';
import MasterTodo from './pages/MasterTodo';
import FaucetAccounts from './pages/FaucetAccounts';
import NFTMarketplace from './pages/NFTMarketplace';
import TransactionHistory from './pages/TransactionHistory';
import NFTWatchlist from './pages/NFTWatchlist';

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={NFTMarketplace} />
      <Route path="/marketplace/nft/:id" component={NFTMarketplace} />
      <Route path="/transactions" component={TransactionHistory} />
      <Route path="/watchlist" component={NFTWatchlist} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={PublicArticle} />
      <Route path="/article/:slug" component={PublicArticle} />
      
      {/* Dashboard routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/topics" component={TrendingTopics} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/new" component={ArticleEditor} />
      <Route path="/articles/:id" component={ArticleEditor} />
      <Route path="/affiliate-links" component={AffiliateLinks} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/monetization-guide" component={MonetizationGuide} />
      <Route path="/cj-integration" component={CJIntegration} />
      <Route path="/auto-publish" component={AutoPublish} />
      <Route path="/automation" component={AutomationCenter} />
      <Route path="/distribution" component={DistributionCenter} />
      <Route path="/system-optimizer" component={SystemOptimizer} />
      <Route path="/bot" component={BotIntelligence} />
      <Route path="/settings" component={Settings} />
      <Route path="/free-publishing" component={FreePublishingBot} />
      <Route path="/data-accuracy" component={DataAccuracy} />
      <Route path="/audit-log" component={AuditLog} />
      <Route path="/ai-command" component={AICommandCenter} />
      <Route path="/llm-settings" component={LLMSettings} />
      <Route path="/content-pipeline" component={ContentPipeline} />
      <Route path="/product-pages" component={ProductPages} />
      <Route path="/hive-mind" component={HiveMindCenter} />
      <Route path="/network-connections" component={NetworkConnections} />
      <Route path="/free-income" component={FreeIncome} />
      <Route path="/nft-gallery" component={NFTGallery} />
      <Route path="/awin-integration" component={AwinIntegration} />
      <Route path="/nft-empire" component={NFTEmpire} />
      <Route path="/always-awake" component={AlwaysAwake} />
      <Route path="/wallet-settings" component={WalletSettings} />
      <Route path="/hot-wallet" component={HotWallet} />
      <Route path="/system-health" component={SystemHealth} />
      <Route path="/debug-admin" component={DebugAdmin} />
      <Route path="/master-todo" component={MasterTodo} />
      <Route path="/faucet-accounts" component={FaucetAccounts} />
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

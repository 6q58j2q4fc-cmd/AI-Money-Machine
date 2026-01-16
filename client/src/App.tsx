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
import NFTPortfolio from './pages/NFTPortfolio';
import Collections from './pages/Collections';
import NftBlog from './pages/NftBlog';
import RealEarnings from './pages/RealEarnings';
import FaucetConnections from './pages/FaucetConnections';
import PublicMarketplace from './pages/PublicMarketplace';
import PublicNFTDetail from './pages/PublicNFTDetail';
import MarketplaceProfile from './pages/MarketplaceProfile';
import PaymentHistory from './pages/PaymentHistory';
import AdminOnly from './components/AdminOnly';

// Admin-protected page wrapper
const AdminPage = ({ component: Component }: { component: React.ComponentType }) => (
  <AdminOnly><Component /></AdminOnly>
);

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/market" component={PublicMarketplace} />
      <Route path="/nft/:id" component={PublicNFTDetail} />
      <Route path="/profile" component={MarketplaceProfile} />
      <Route path="/marketplace" component={NFTMarketplace} />
      <Route path="/marketplace/nft/:id" component={NFTMarketplace} />
      <Route path="/transactions" component={TransactionHistory} />
      <Route path="/watchlist" component={NFTWatchlist} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={PublicArticle} />
      <Route path="/article/:slug" component={PublicArticle} />
      
      {/* Admin-only Dashboard routes */}
      <Route path="/dashboard">{() => <AdminPage component={Dashboard} />}</Route>
      <Route path="/topics">{() => <AdminPage component={TrendingTopics} />}</Route>
      <Route path="/articles">{() => <AdminPage component={Articles} />}</Route>
      <Route path="/articles/new">{() => <AdminPage component={ArticleEditor} />}</Route>
      <Route path="/articles/:id">{() => <AdminPage component={ArticleEditor} />}</Route>
      <Route path="/affiliate-links">{() => <AdminPage component={AffiliateLinks} />}</Route>
      <Route path="/analytics">{() => <AdminPage component={Analytics} />}</Route>
      <Route path="/monetization-guide">{() => <AdminPage component={MonetizationGuide} />}</Route>
      <Route path="/cj-integration">{() => <AdminPage component={CJIntegration} />}</Route>
      <Route path="/auto-publish">{() => <AdminPage component={AutoPublish} />}</Route>
      <Route path="/automation">{() => <AdminPage component={AutomationCenter} />}</Route>
      <Route path="/distribution">{() => <AdminPage component={DistributionCenter} />}</Route>
      <Route path="/system-optimizer">{() => <AdminPage component={SystemOptimizer} />}</Route>
      <Route path="/bot">{() => <AdminPage component={BotIntelligence} />}</Route>
      <Route path="/settings">{() => <AdminPage component={Settings} />}</Route>
      <Route path="/free-publishing">{() => <AdminPage component={FreePublishingBot} />}</Route>
      <Route path="/data-accuracy">{() => <AdminPage component={DataAccuracy} />}</Route>
      <Route path="/audit-log">{() => <AdminPage component={AuditLog} />}</Route>
      <Route path="/ai-command">{() => <AdminPage component={AICommandCenter} />}</Route>
      <Route path="/llm-settings">{() => <AdminPage component={LLMSettings} />}</Route>
      <Route path="/content-pipeline">{() => <AdminPage component={ContentPipeline} />}</Route>
      <Route path="/product-pages">{() => <AdminPage component={ProductPages} />}</Route>
      <Route path="/hive-mind">{() => <AdminPage component={HiveMindCenter} />}</Route>
      <Route path="/network-connections">{() => <AdminPage component={NetworkConnections} />}</Route>
      <Route path="/free-income">{() => <AdminPage component={FreeIncome} />}</Route>
      <Route path="/nft-gallery">{() => <AdminPage component={NFTGallery} />}</Route>
      <Route path="/awin-integration">{() => <AdminPage component={AwinIntegration} />}</Route>
      <Route path="/nft-empire">{() => <AdminPage component={NFTEmpire} />}</Route>
      <Route path="/always-awake">{() => <AdminPage component={AlwaysAwake} />}</Route>
      <Route path="/wallet-settings">{() => <AdminPage component={WalletSettings} />}</Route>
      <Route path="/hot-wallet">{() => <AdminPage component={HotWallet} />}</Route>
      <Route path="/system-health">{() => <AdminPage component={SystemHealth} />}</Route>
      <Route path="/debug-admin">{() => <AdminPage component={DebugAdmin} />}</Route>
      <Route path="/master-todo">{() => <AdminPage component={MasterTodo} />}</Route>
      <Route path="/faucet-accounts">{() => <AdminPage component={FaucetAccounts} />}</Route>
      <Route path="/nft-portfolio">{() => <AdminPage component={NFTPortfolio} />}</Route>
      <Route path="/collections">{() => <AdminPage component={Collections} />}</Route>
      <Route path="/nft-blog">{() => <AdminPage component={NftBlog} />}</Route>
      <Route path="/real-earnings">{() => <AdminPage component={RealEarnings} />}</Route>
      <Route path="/faucet-connections">{() => <AdminPage component={FaucetConnections} />}</Route>
      <Route path="/payment-history" component={PaymentHistory} />
      
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

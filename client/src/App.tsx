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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/topics" component={TrendingTopics} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/new" component={ArticleEditor} />
      <Route path="/articles/:id" component={ArticleEditor} />
      <Route path="/affiliate-links" component={AffiliateLinks} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/monetization-guide" component={MonetizationGuide} />
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

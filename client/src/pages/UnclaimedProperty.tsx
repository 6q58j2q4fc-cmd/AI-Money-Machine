import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, DollarSign, ExternalLink, MapPin, Building2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// All 50 US States + DC + Federal unclaimed property databases
const STATE_DATABASES = [
  { code: 'AL', name: 'Alabama', url: 'https://treasury.alabama.gov/unclaimed-property/', searchUrl: 'https://treasury.alabama.gov/unclaimed-property/search/' },
  { code: 'AK', name: 'Alaska', url: 'https://unclaimedproperty.alaska.gov/', searchUrl: 'https://unclaimedproperty.alaska.gov/app/claim-search' },
  { code: 'AZ', name: 'Arizona', url: 'https://azdor.gov/unclaimed-property', searchUrl: 'https://azdor.gov/unclaimed-property/search-unclaimed-property' },
  { code: 'AR', name: 'Arkansas', url: 'https://www.claimitarkansas.org/', searchUrl: 'https://www.claimitarkansas.org/app/claim-search' },
  { code: 'CA', name: 'California', url: 'https://sco.ca.gov/upd.html', searchUrl: 'https://ucpi.sco.ca.gov/UCP/Default.aspx' },
  { code: 'CO', name: 'Colorado', url: 'https://colorado.findyourunclaimedproperty.com/', searchUrl: 'https://colorado.findyourunclaimedproperty.com/app/claim-search' },
  { code: 'CT', name: 'Connecticut', url: 'https://portal.ct.gov/OTT/Unclaimed-Property', searchUrl: 'https://ctbiglist.com/' },
  { code: 'DE', name: 'Delaware', url: 'https://unclaimedproperty.delaware.gov/', searchUrl: 'https://unclaimedproperty.delaware.gov/app/claim-search' },
  { code: 'DC', name: 'Washington DC', url: 'https://cfo.dc.gov/page/unclaimed-property', searchUrl: 'https://dc.findyourunclaimedproperty.com/' },
  { code: 'FL', name: 'Florida', url: 'https://www.fltreasurehunt.gov/', searchUrl: 'https://www.fltreasurehunt.gov/' },
  { code: 'GA', name: 'Georgia', url: 'https://dor.georgia.gov/unclaimed-property', searchUrl: 'https://georgia.findyourunclaimedproperty.com/' },
  { code: 'HI', name: 'Hawaii', url: 'https://budget.hawaii.gov/unclaimed-property/', searchUrl: 'https://budget.hawaii.gov/unclaimed-property/search-for-unclaimed-property/' },
  { code: 'ID', name: 'Idaho', url: 'https://sto.idaho.gov/Unclaimed-Property', searchUrl: 'https://yourmoney.idaho.gov/' },
  { code: 'IL', name: 'Illinois', url: 'https://icash.illinois.gov/', searchUrl: 'https://icash.illinois.gov/app/claim-search' },
  { code: 'IN', name: 'Indiana', url: 'https://www.indianaunclaimed.gov/', searchUrl: 'https://www.indianaunclaimed.gov/' },
  { code: 'IA', name: 'Iowa', url: 'https://greatiowatreasure.gov/', searchUrl: 'https://greatiowatreasure.gov/app/claim-search' },
  { code: 'KS', name: 'Kansas', url: 'https://kansascash.ks.gov/', searchUrl: 'https://kansascash.ks.gov/app/claim-search' },
  { code: 'KY', name: 'Kentucky', url: 'https://treasury.ky.gov/unclaimedproperty/', searchUrl: 'https://treasury.ky.gov/unclaimedproperty/Pages/Search.aspx' },
  { code: 'LA', name: 'Louisiana', url: 'https://www.treasury.la.gov/unclaimed-property', searchUrl: 'https://www.treasury.la.gov/unclaimed-property' },
  { code: 'ME', name: 'Maine', url: 'https://www.maine.gov/treasurer/unclaimed_property/', searchUrl: 'https://www.maine.gov/treasurer/unclaimed_property/search/' },
  { code: 'MD', name: 'Maryland', url: 'https://marylandtaxes.gov/unclaimed-property/', searchUrl: 'https://interactive.marylandtaxes.gov/Unclaimed/' },
  { code: 'MA', name: 'Massachusetts', url: 'https://www.findmassmoney.com/', searchUrl: 'https://www.findmassmoney.com/' },
  { code: 'MI', name: 'Michigan', url: 'https://unclaimedproperty.michigan.gov/', searchUrl: 'https://unclaimedproperty.michigan.gov/app/claim-search' },
  { code: 'MN', name: 'Minnesota', url: 'https://mn.gov/commerce/consumers/your-money/find-missing-money/', searchUrl: 'https://mn.gov/commerce/consumers/your-money/find-missing-money/' },
  { code: 'MS', name: 'Mississippi', url: 'https://treasury.ms.gov/for-citizens/unclaimed-property/', searchUrl: 'https://treasury.ms.gov/for-citizens/unclaimed-property/search/' },
  { code: 'MO', name: 'Missouri', url: 'https://treasurer.mo.gov/unclaimedproperty/', searchUrl: 'https://treasurer.mo.gov/unclaimedproperty/' },
  { code: 'MT', name: 'Montana', url: 'https://mtrevenue.gov/taxes/unclaimed-property/', searchUrl: 'https://mtrevenue.gov/taxes/unclaimed-property/' },
  { code: 'NE', name: 'Nebraska', url: 'https://treasurer.nebraska.gov/up/', searchUrl: 'https://treasurer.nebraska.gov/up/search.aspx' },
  { code: 'NV', name: 'Nevada', url: 'https://nevadatreasurer.gov/unclaimed_property/', searchUrl: 'https://nevadatreasurer.gov/unclaimed_property/Search/' },
  { code: 'NH', name: 'New Hampshire', url: 'https://www.nh.gov/treasury/divisions/unclaimed-property/', searchUrl: 'https://www.claimit.nh.gov/' },
  { code: 'NJ', name: 'New Jersey', url: 'https://www.unclaimedproperty.nj.gov/', searchUrl: 'https://www.unclaimedproperty.nj.gov/' },
  { code: 'NM', name: 'New Mexico', url: 'https://www.tax.newmexico.gov/individuals/unclaimed-property/', searchUrl: 'https://ucp.tax.newmexico.gov/' },
  { code: 'NY', name: 'New York', url: 'https://www.osc.state.ny.us/unclaimed-funds', searchUrl: 'https://www.osc.state.ny.us/unclaimed-funds' },
  { code: 'NC', name: 'North Carolina', url: 'https://www.nccash.com/', searchUrl: 'https://www.nccash.com/' },
  { code: 'ND', name: 'North Dakota', url: 'https://www.land.nd.gov/unclaimed-property', searchUrl: 'https://ucp.nd.gov/' },
  { code: 'OH', name: 'Ohio', url: 'https://com.ohio.gov/divisions-and-programs/unclaimed-funds', searchUrl: 'https://unclaimedproperty.ohio.gov/' },
  { code: 'OK', name: 'Oklahoma', url: 'https://www.ok.gov/unclaimed/', searchUrl: 'https://www.ok.gov/unclaimed/' },
  { code: 'OR', name: 'Oregon', url: 'https://oregon.findyourunclaimedproperty.com/', searchUrl: 'https://oregon.findyourunclaimedproperty.com/' },
  { code: 'PA', name: 'Pennsylvania', url: 'https://www.patreasury.gov/unclaimed-property/', searchUrl: 'https://www.patreasury.gov/unclaimed-property/' },
  { code: 'RI', name: 'Rhode Island', url: 'https://treasury.ri.gov/programs/unclaimed-property', searchUrl: 'https://findrimoney.com/' },
  { code: 'SC', name: 'South Carolina', url: 'https://treasurer.sc.gov/what-we-do/for-citizens/unclaimed-property/', searchUrl: 'https://treasurer.sc.gov/what-we-do/for-citizens/unclaimed-property/search/' },
  { code: 'SD', name: 'South Dakota', url: 'https://sdtreasurer.gov/unclaimed-property/', searchUrl: 'https://sdtreasurer.gov/unclaimed-property/' },
  { code: 'TN', name: 'Tennessee', url: 'https://treasury.tn.gov/Unclaimed-Property', searchUrl: 'https://claimittn.gov/' },
  { code: 'TX', name: 'Texas', url: 'https://claimittexas.org/', searchUrl: 'https://claimittexas.org/' },
  { code: 'UT', name: 'Utah', url: 'https://mycash.utah.gov/', searchUrl: 'https://mycash.utah.gov/' },
  { code: 'VT', name: 'Vermont', url: 'https://www.vermonttreasurer.gov/unclaimed-property', searchUrl: 'https://www.vermonttreasurer.gov/unclaimed-property' },
  { code: 'VA', name: 'Virginia', url: 'https://www.trs.virginia.gov/Unclaimed-Property', searchUrl: 'https://vamoneysearch.org/' },
  { code: 'WA', name: 'Washington', url: 'https://ucp.dor.wa.gov/', searchUrl: 'https://ucp.dor.wa.gov/' },
  { code: 'WV', name: 'West Virginia', url: 'https://www.wvsto.com/unclaimed-property/', searchUrl: 'https://www.wvsto.com/unclaimed-property/' },
  { code: 'WI', name: 'Wisconsin', url: 'https://statetreasurer.wi.gov/Pages/UnclaimedProperty.aspx', searchUrl: 'https://statetreasurer.wi.gov/Pages/UnclaimedPropertySearch.aspx' },
  { code: 'WY', name: 'Wyoming', url: 'https://treasurer.wyo.gov/unclaimed-property', searchUrl: 'https://treasurer.wyo.gov/unclaimed-property' },
  { code: 'FED', name: 'Federal (NAUPA)', url: 'https://www.missingmoney.com/', searchUrl: 'https://www.missingmoney.com/en/' },
];

interface SearchResult {
  state: string;
  stateName: string;
  searchUrl: string;
  status: 'pending' | 'searching' | 'found' | 'none' | 'error';
  message?: string;
}

export default function UnclaimedProperty() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>(['ALL']);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<{ name: string; date: string; states: number }[]>([]);
  // Using sonner toast

  const handleSearch = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Please enter both first and last name to search.');
      return;
    }

    setIsSearching(true);
    
    const statesToSearch = selectedStates.includes('ALL') 
      ? STATE_DATABASES 
      : STATE_DATABASES.filter(s => selectedStates.includes(s.code));

    // Initialize results
    const initialResults: SearchResult[] = statesToSearch.map(state => ({
      state: state.code,
      stateName: state.name,
      searchUrl: state.searchUrl,
      status: 'pending',
    }));
    setSearchResults(initialResults);

    // Simulate searching each state (in reality, user clicks through to each)
    for (let i = 0; i < initialResults.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setSearchResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'searching' } : r
      ));
      await new Promise(resolve => setTimeout(resolve, 200));
      setSearchResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'found', message: 'Click to search on official site' } : r
      ));
    }

    // Add to search history
    setSearchHistory(prev => [{
      name: `${firstName} ${lastName}`,
      date: new Date().toLocaleDateString(),
      states: statesToSearch.length,
    }, ...prev.slice(0, 9)]);

    setIsSearching(false);
    
    toast.success(`Generated search links for ${statesToSearch.length} state databases. Click each to search.`);
  };

  const handleSelectAllStates = () => {
    setSelectedStates(['ALL']);
  };

  const handleSelectState = (stateCode: string) => {
    if (stateCode === 'ALL') {
      setSelectedStates(['ALL']);
    } else {
      setSelectedStates(prev => {
        const filtered = prev.filter(s => s !== 'ALL');
        if (filtered.includes(stateCode)) {
          return filtered.filter(s => s !== stateCode);
        }
        return [...filtered, stateCode];
      });
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Unclaimed Property Search | MoneyMachine</title>
        <meta name="description" content="Search all 50 US state databases for unclaimed money legally owed to you. Find forgotten bank accounts, refunds, and more." />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
              <DollarSign className="h-8 w-8" />
              Unclaimed Property Search
            </h1>
            <p className="text-gray-400 mt-1">
              Search all 50 US state databases for money legally owed to you
            </p>
          </div>
          <Badge variant="outline" className="text-green-400 border-green-400">
            100% Legal & Free
          </Badge>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-400">What is Unclaimed Property?</h3>
                <p className="text-gray-300 text-sm mt-1">
                  Unclaimed property includes forgotten bank accounts, uncashed checks, security deposits, 
                  insurance payments, stocks, and more. States hold this money until the rightful owner claims it.
                  <strong className="text-green-400"> Over $80 billion</strong> in unclaimed property is currently held by US states!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Form */}
          <Card className="lg:col-span-2 bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-amber-400" />
                Search Your Name
              </CardTitle>
              <CardDescription>
                Enter your name to generate search links for official state databases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select States to Search</Label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-800/50 rounded-lg">
                  <Badge
                    variant={selectedStates.includes('ALL') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-amber-500/20"
                    onClick={handleSelectAllStates}
                  >
                    All 50 States + DC
                  </Badge>
                  {STATE_DATABASES.map(state => (
                    <Badge
                      key={state.code}
                      variant={selectedStates.includes(state.code) && !selectedStates.includes('ALL') ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-amber-500/20"
                      onClick={() => handleSelectState(state.code)}
                    >
                      {state.code}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isSearching ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generating Search Links...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Generate Search Links
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Search History */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                Search History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No searches yet</p>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map((search, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <div>
                        <p className="text-sm font-medium">{search.name}</p>
                        <p className="text-xs text-gray-500">{search.date}</p>
                      </div>
                      <Badge variant="outline">{search.states} states</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-amber-400" />
                Search Results - Click Each State to Search
              </CardTitle>
              <CardDescription>
                Click each link to search the official state database for "{firstName} {lastName}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((result) => (
                  <a
                    key={result.state}
                    href={result.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-sm">{result.stateName}</p>
                        <p className="text-xs text-gray-500">{result.state}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.status === 'searching' && (
                        <Clock className="h-4 w-4 text-amber-400 animate-spin" />
                      )}
                      {result.status === 'found' && (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      )}
                      <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-400">Search Variations</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Try maiden names, nicknames, and previous addresses. Property may be listed under old information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-400">Check Deceased Relatives</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Search for deceased family members. You may be entitled to claim their unclaimed property.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-400">Never Pay Finders</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Claiming is always free! Never pay a "finder" service. Go directly to state websites.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

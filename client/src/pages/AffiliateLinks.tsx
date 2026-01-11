import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Link2, 
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  MousePointer,
  DollarSign,
  Copy
} from "lucide-react";

const categories = [
  "Technology",
  "Finance",
  "Health",
  "Lifestyle",
  "Business",
  "Entertainment",
  "Education",
  "Travel",
  "Other"
];

const programs = [
  "Amazon Associates",
  "ShareASale",
  "Commission Junction",
  "ClickBank",
  "Rakuten",
  "Impact",
  "Awin",
  "Other"
];

export default function AffiliateLinks() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [category, setCategory] = useState("");
  const [program, setProgram] = useState("");
  const [commission, setCommission] = useState("");

  const utils = trpc.useUtils();

  const { data: links, isLoading } = trpc.affiliate.list.useQuery(
    { category: selectedCategory === "all" ? undefined : selectedCategory }
  );

  const createMutation = trpc.affiliate.create.useMutation({
    onSuccess: () => {
      toast.success("Affiliate link created!");
      utils.affiliate.list.invalidate();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => toast.error(error.message)
  });

  const updateMutation = trpc.affiliate.update.useMutation({
    onSuccess: () => {
      toast.success("Affiliate link updated!");
      utils.affiliate.list.invalidate();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = trpc.affiliate.delete.useMutation({
    onSuccess: () => {
      toast.success("Affiliate link deleted!");
      utils.affiliate.list.invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const resetForm = () => {
    setName("");
    setUrl("");
    setShortCode("");
    setCategory("");
    setProgram("");
    setCommission("");
    setEditingLink(null);
  };

  const handleEdit = (link: any) => {
    setEditingLink(link);
    setName(link.name);
    setUrl(link.url);
    setShortCode(link.shortCode);
    setCategory(link.category);
    setProgram(link.program || "");
    setCommission(link.commission || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name || !url || !shortCode || !category) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = { name, url, shortCode, category, program, commission };

    if (editingLink) {
      updateMutation.mutate({ id: editingLink.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this affiliate link?")) {
      deleteMutation.mutate({ id });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const generateShortCode = () => {
    const code = name.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 20);
    setShortCode(code + "-" + Math.random().toString(36).substring(2, 6));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Link2 className="w-8 h-8 text-primary" />
              Affiliate Links
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your affiliate links for monetization
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-glow">
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingLink ? "Edit Affiliate Link" : "Add Affiliate Link"}
                </DialogTitle>
                <DialogDescription>
                  {editingLink ? "Update your affiliate link details" : "Add a new affiliate link to use in your content"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Best Laptop 2025"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="url">Affiliate URL *</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shortCode">Short Code *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="shortCode"
                      value={shortCode}
                      onChange={(e) => setShortCode(e.target.value)}
                      placeholder="best-laptop-2025"
                    />
                    <Button variant="outline" onClick={generateShortCode} type="button">
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Program</Label>
                    <Select value={program} onValueChange={setProgram}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map(prog => (
                          <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="commission">Commission</Label>
                  <Input
                    id="commission"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="e.g., 5% or $10 per sale"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingLink ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Links Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : links && links.length > 0 ? (
          <div className="grid gap-4">
            {links.map((link) => (
              <Card key={link.id} className="card-glow hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">{link.name}</h3>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {link.url}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(link.url)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(link.url, "_blank")}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(link)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(link.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{link.category}</Badge>
                        {link.program && (
                          <Badge variant="outline">{link.program}</Badge>
                        )}
                        {link.commission && (
                          <Badge variant="outline" className="text-primary">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {link.commission}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-secondary">
                          {link.shortCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-xl font-bold">
                          <MousePointer className="w-4 h-4 text-primary" />
                          {link.clicks}
                        </div>
                        <div className="text-xs text-muted-foreground">Clicks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">
                          {link.conversions}
                        </div>
                        <div className="text-xs text-muted-foreground">Conversions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold gradient-text">
                          ${parseFloat(link.revenue || "0").toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No affiliate links yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first affiliate link to start monetizing your content
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

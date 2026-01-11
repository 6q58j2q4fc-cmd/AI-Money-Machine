import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  FileText, 
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  MousePointer
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusTabs = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "review", label: "In Review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function Articles() {
  const [, setLocation] = useLocation();
  const [selectedStatus, setSelectedStatus] = useState("all");
  const utils = trpc.useUtils();

  const { data: articles, isLoading } = trpc.articles.list.useQuery({ status: selectedStatus });

  const deleteMutation = trpc.articles.delete.useMutation({
    onSuccess: () => {
      toast.success("Article deleted");
      utils.articles.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this article?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    return <Badge className={`status-${status}`}>{status}</Badge>;
  };

  const getSeoScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "score-excellent";
    if (score >= 60) return "score-good";
    if (score >= 40) return "score-average";
    return "score-poor";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Articles
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and optimize your content
            </p>
          </div>
          <Button onClick={() => setLocation("/articles/new")} className="btn-glow">
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>

        {/* Status Tabs */}
        <Tabs defaultValue="all" onValueChange={setSelectedStatus}>
          <TabsList className="bg-secondary">
            {statusTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {statusTabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : articles && articles.length > 0 ? (
                <div className="grid gap-4">
                  {articles.map((article) => (
                    <Card 
                      key={article.id} 
                      className="card-glow hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/articles/${article.id}`)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-lg font-semibold line-clamp-1">{article.title}</h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setLocation(`/articles/${article.id}`);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(article.id);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {article.excerpt && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {article.excerpt}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {article.views} views
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer className="w-4 h-4" />
                                {article.clicks} clicks
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className={`text-xl font-bold ${getSeoScoreColor(article.seoScore)}`}>
                                {article.seoScore || "-"}
                              </div>
                              <div className="text-xs text-muted-foreground">SEO</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-xl font-bold ${getSeoScoreColor(article.readabilityScore)}`}>
                                {article.readabilityScore || "-"}
                              </div>
                              <div className="text-xs text-muted-foreground">Read</div>
                            </div>
                            {getStatusBadge(article.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No articles found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first article to start monetizing content
                  </p>
                  <Button onClick={() => setLocation("/articles/new")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Article
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

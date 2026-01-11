import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { 
  FileText, 
  Sparkles,
  Save,
  Eye,
  Send,
  Loader2,
  ArrowLeft,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  ListTree,
  Link2,
  Wand2,
  DollarSign
} from "lucide-react";

export default function ArticleEditor() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const isNew = !params.id || params.id === "new";
  const articleId = isNew ? null : parseInt(params.id);

  // Form state
  const [title, setTitle] = useState(searchParams.get("topic") || "");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>(
    searchParams.get("keywords")?.split(",").filter(Boolean) || []
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [status, setStatus] = useState<"draft" | "review" | "published" | "archived">("draft");
  const [tone, setTone] = useState<"professional" | "casual" | "informative" | "persuasive">("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");

  // SEO Analysis state
  const [seoAnalysis, setSeoAnalysis] = useState<any>(null);

  const utils = trpc.useUtils();

  // Load existing article
  const { data: article, isLoading: articleLoading } = trpc.articles.get.useQuery(
    { id: articleId! },
    { enabled: !!articleId }
  );

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content || "");
      setExcerpt(article.excerpt || "");
      setMetaTitle(article.metaTitle || "");
      setMetaDescription(article.metaDescription || "");
      setFocusKeyword(article.focusKeyword || "");
      setKeywords((article.keywords as string[]) || []);
      setStatus(article.status);
    }
  }, [article]);

  // Mutations
  const createMutation = trpc.articles.create.useMutation({
    onSuccess: (data) => {
      toast.success("Article created!");
      setLocation(`/articles/${data.id}`);
    },
    onError: (error) => toast.error(error.message)
  });

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Article saved!");
      utils.articles.get.invalidate({ id: articleId! });
    },
    onError: (error) => toast.error(error.message)
  });

  const generateContentMutation = trpc.articles.generateContent.useMutation({
    onSuccess: (data) => {
      const contentStr = typeof data.content === 'string' ? data.content : '';
      setContent(contentStr);
      toast.success("Content generated!");
    },
    onError: (error) => toast.error(error.message)
  });

  const generateOutlineMutation = trpc.articles.generateOutline.useMutation({
    onSuccess: (data) => {
      // Convert outline to markdown content
      let outlineContent = `# ${title}\n\n`;
      outlineContent += `## Introduction\n${data.introduction}\n\n`;
      data.sections.forEach((section: any) => {
        outlineContent += `## ${section.heading}\n`;
        section.points.forEach((point: string) => {
          outlineContent += `- ${point}\n`;
        });
        outlineContent += "\n";
      });
      outlineContent += `## Conclusion\n${data.conclusion}\n`;
      
      setContent(outlineContent);
      if (data.suggestedKeywords) {
        setKeywords(prev => {
          const combined = [...prev, ...data.suggestedKeywords];
          return combined.filter((v, i, a) => a.indexOf(v) === i);
        });
      }
      toast.success("Outline generated!");
    },
    onError: (error) => toast.error(error.message)
  });

  const analyzeSeoMutation = trpc.articles.analyzeSEO.useMutation({
    onSuccess: (data) => {
      setSeoAnalysis(data);
      toast.success("SEO analysis complete!");
    },
    onError: (error) => toast.error(error.message)
  });

  // Smart affiliate link insertion
  const { data: affiliateLinks } = trpc.affiliate.list.useQuery({});
  const suggestLinksMutation = trpc.affiliate.suggestLinks.useMutation({
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        setLinkSuggestions(data.suggestions);
        toast.success(`Found ${data.suggestions.length} affiliate link opportunities!`);
      } else {
        toast.info("No affiliate link opportunities found. Add more affiliate links first.");
      }
    },
    onError: (error) => toast.error(error.message)
  });

  const [linkSuggestions, setLinkSuggestions] = useState<any[]>([]);

  const handleSuggestLinks = () => {
    if (!content.trim()) {
      toast.error("Add content first to find affiliate opportunities");
      return;
    }
    if (!affiliateLinks || affiliateLinks.length === 0) {
      toast.error("Add affiliate links first to find placement opportunities");
      return;
    }
    suggestLinksMutation.mutate({ 
      content,
      existingLinks: affiliateLinks.map(l => ({ id: l.id, name: l.name, category: l.category }))
    });
  };

  const handleInsertLink = (suggestion: any) => {
    const link = affiliateLinks?.find(l => l.id === suggestion.linkId);
    if (!link) return;

    // Find the context in content and wrap with markdown link
    const anchorText = suggestion.anchorText;
    const markdownLink = `[${anchorText}](${link.url})`;
    
    // Replace first occurrence of anchor text with the link
    const newContent = content.replace(anchorText, markdownLink);
    setContent(newContent);
    
    // Remove this suggestion from the list
    setLinkSuggestions(prev => prev.filter(s => s !== suggestion));
    toast.success(`Inserted affiliate link for "${anchorText}"`);
  };

  const handleInsertAllLinks = () => {
    let newContent = content;
    let insertedCount = 0;
    
    for (const suggestion of linkSuggestions) {
      const link = affiliateLinks?.find(l => l.id === suggestion.linkId);
      if (!link) continue;
      
      const anchorText = suggestion.anchorText;
      const markdownLink = `[${anchorText}](${link.url})`;
      
      // Only replace if not already a link
      if (!newContent.includes(`[${anchorText}]`)) {
        newContent = newContent.replace(anchorText, markdownLink);
        insertedCount++;
      }
    }
    
    setContent(newContent);
    setLinkSuggestions([]);
    toast.success(`Inserted ${insertedCount} affiliate links!`);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const data = {
      title,
      content,
      excerpt,
      metaTitle,
      metaDescription,
      focusKeyword,
      keywords,
      status,
      seoScore: seoAnalysis?.seoScore,
      readabilityScore: seoAnalysis?.readabilityScore,
    };

    if (articleId) {
      updateMutation.mutate({ id: articleId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleAnalyzeSeo = () => {
    if (!content.trim()) {
      toast.error("Add content first to analyze SEO");
      return;
    }
    analyzeSeoMutation.mutate({
      title,
      content,
      focusKeyword,
      metaDescription,
    });
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error": return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "warning": return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  if (articleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/articles")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? "New Article" : "Edit Article"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isNew ? "Create a new monetizable article" : "Update your article"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-glow"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <Card className="card-glow">
              <CardContent className="pt-6">
                <Label htmlFor="title">Article Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a compelling title..."
                  className="mt-2 text-lg"
                />
              </CardContent>
            </Card>

            {/* Content Tabs */}
            <Card className="card-glow">
              <Tabs defaultValue="write">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <TabsList>
                      <TabsTrigger value="write">
                        <FileText className="w-4 h-4 mr-2" />
                        Write
                      </TabsTrigger>
                      <TabsTrigger value="preview">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateOutlineMutation.mutate({ title, keywords })}
                        disabled={!title || generateOutlineMutation.isPending}
                      >
                        {generateOutlineMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ListTree className="w-4 h-4 mr-2" />
                        )}
                        Outline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateContentMutation.mutate({ title, keywords, tone, length })}
                        disabled={!title || generateContentMutation.isPending}
                      >
                        {generateContentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Generate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSuggestLinks}
                        disabled={!content || suggestLinksMutation.isPending}
                        className="text-primary border-primary/50 hover:bg-primary/10"
                      >
                        {suggestLinksMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <DollarSign className="w-4 h-4 mr-2" />
                        )}
                        Add Links
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="write" className="mt-0">
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your article content in Markdown..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                      <span>{content.split(/\s+/).filter(Boolean).length} words</span>
                      <div className="flex gap-4">
                        <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="informative">Informative</SelectItem>
                            <SelectItem value="persuasive">Persuasive</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={length} onValueChange={(v: any) => setLength(v)}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue placeholder="Length" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="long">Long</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="mt-0">
                    <div className="prose prose-invert max-w-none min-h-[400px] p-4 rounded-lg bg-secondary/50">
                      <Streamdown>{content || "*No content yet*"}</Streamdown>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            {/* Excerpt */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-base">Excerpt</CardTitle>
                <CardDescription>A short summary for previews and search results</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Write a compelling excerpt..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Affiliate Link Suggestions */}
            {linkSuggestions.length > 0 && (
              <Card className="card-glow border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Affiliate Opportunities ({linkSuggestions.length})
                    </CardTitle>
                    <Button size="sm" onClick={handleInsertAllLinks} className="btn-glow">
                      <Wand2 className="w-3 h-3 mr-1" />
                      Insert All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {linkSuggestions.map((suggestion, i) => {
                    const link = affiliateLinks?.find(l => l.id === suggestion.linkId);
                    return (
                      <div key={i} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-primary">
                            {link?.name || `Link #${suggestion.linkId}`}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleInsertLink(suggestion)}
                          >
                            <Link2 className="w-3 h-3 mr-1" />
                            Insert
                          </Button>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Anchor: </span>
                          <span className="font-medium text-primary">{suggestion.anchorText}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {suggestion.reason}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* SEO Settings */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="w-4 h-4 text-primary" />
                  SEO Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="focusKeyword">Focus Keyword</Label>
                  <Input
                    id="focusKeyword"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="Main keyword to target"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="SEO title (max 60 chars)"
                    maxLength={70}
                    className="mt-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {metaTitle.length}/60 characters
                  </div>
                </div>
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="SEO description (max 160 chars)"
                    maxLength={160}
                    className="mt-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {metaDescription.length}/160 characters
                  </div>
                </div>
                <div>
                  <Label>Keywords</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      placeholder="Add keyword"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
                    />
                    <Button variant="outline" onClick={handleAddKeyword}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {keywords.map((keyword, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={handleAnalyzeSeo}
                  disabled={analyzeSeoMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {analyzeSeoMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Analyze SEO
                </Button>
              </CardContent>
            </Card>

            {/* SEO Analysis Results */}
            {seoAnalysis && (
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-base">SEO Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-secondary">
                      <div className={`text-2xl font-bold ${seoAnalysis.seoScore >= 70 ? "score-excellent" : seoAnalysis.seoScore >= 50 ? "score-good" : "score-poor"}`}>
                        {seoAnalysis.seoScore}
                      </div>
                      <div className="text-xs text-muted-foreground">SEO Score</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary">
                      <div className={`text-2xl font-bold ${seoAnalysis.readabilityScore >= 70 ? "score-excellent" : seoAnalysis.readabilityScore >= 50 ? "score-good" : "score-poor"}`}>
                        {seoAnalysis.readabilityScore}
                      </div>
                      <div className="text-xs text-muted-foreground">Readability</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Word Count: {seoAnalysis.wordCount}</div>
                    <div className="text-sm font-medium">Keyword Density: {seoAnalysis.keywordDensity.toFixed(1)}%</div>
                  </div>

                  {seoAnalysis.strengths?.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Strengths</div>
                      {seoAnalysis.strengths.map((strength: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground mb-1">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          {strength}
                        </div>
                      ))}
                    </div>
                  )}

                  {seoAnalysis.issues?.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Issues</div>
                      {seoAnalysis.issues.map((issue: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm mb-2">
                          {getIssueIcon(issue.type)}
                          <div>
                            <div className="text-muted-foreground">{issue.message}</div>
                            <div className="text-xs text-primary">{issue.suggestion}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {seoAnalysis.suggestedMetaTitle && (
                    <div>
                      <div className="text-sm font-medium mb-1">Suggested Meta Title</div>
                      <div 
                        className="text-sm text-muted-foreground p-2 rounded bg-secondary cursor-pointer hover:bg-secondary/80"
                        onClick={() => setMetaTitle(seoAnalysis.suggestedMetaTitle)}
                      >
                        {seoAnalysis.suggestedMetaTitle}
                      </div>
                    </div>
                  )}

                  {seoAnalysis.suggestedMetaDescription && (
                    <div>
                      <div className="text-sm font-medium mb-1">Suggested Meta Description</div>
                      <div 
                        className="text-sm text-muted-foreground p-2 rounded bg-secondary cursor-pointer hover:bg-secondary/80"
                        onClick={() => setMetaDescription(seoAnalysis.suggestedMetaDescription)}
                      >
                        {seoAnalysis.suggestedMetaDescription}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

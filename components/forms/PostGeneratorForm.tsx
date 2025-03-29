"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { CalendarIcon, Check, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const formSchema = z.object({
  category: z.string({
    required_error: "Please select a post category",
  }),
  audience: z.string({
    required_error: "Please select your target audience",
  }),
  goal: z.string({
    required_error: "Please select the goal of your post",
  }),
  gist: z.string()
    .min(10, "Your post gist should be at least 10 characters")
    .max(1000, "Your post gist should not exceed 1000 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function PostGeneratorForm() {
  const [generatedPosts, setGeneratedPosts] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      audience: "",
      goal: "",
      gist: "",
    },
  });
  
  const onSubmit = async (formData: FormValues) => {
    setIsLoading(true);
    try {
      const promptText = `Create a LinkedIn post with the following details:
      Category: ${formData.category}
      Target Audience: ${formData.audience}
      Goal: ${formData.goal}
      Gist: ${formData.gist}
      
      Generate 3 different variations of the post that are engaging, professional, and optimized for LinkedIn's algorithm. Separate each post variation with "---".`;
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: promptText }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate posts");
      }
      
      const responseData = await response.json();
      setGeneratedPosts(responseData.posts);
    } catch (error) {
      console.error("Error generating posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!selectedPost) return;
    
    setIsScheduling(true);
    try {
      const response = await fetch("/api/linkedin/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          postContent: selectedPost, 
          scheduledTime: scheduleDate?.toISOString() 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to schedule post");
      }
      
      const data = await response.json();
      
      toast({
        title: "Success!",
        description: "Your post has been scheduled on LinkedIn",
      });
      
      // Reset form after successful scheduling
      setShowScheduleDialog(false);
      setSelectedPost("");
      setScheduleDate(undefined);
      setGeneratedPosts([]);
      form.reset();
      
    } catch (error) {
      console.error("Error scheduling post:", error);
      toast({
        title: "Error",
        description: "Failed to schedule post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="thoughtLeadership">Thought Leadership</SelectItem>
                        <SelectItem value="industryInsights">Industry Insights</SelectItem>
                        <SelectItem value="personalAchievement">Personal Achievement</SelectItem>
                        <SelectItem value="companyUpdate">Company Update</SelectItem>
                        <SelectItem value="jobOpening">Job Opening</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the category that best describes your post
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your target audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="professionals">Professionals</SelectItem>
                        <SelectItem value="jobSeekers">Job Seekers</SelectItem>
                        <SelectItem value="recruiters">Recruiters</SelectItem>
                        <SelectItem value="industryPeers">Industry Peers</SelectItem>
                        <SelectItem value="customers">Customers</SelectItem>
                        <SelectItem value="investors">Investors</SelectItem>
                        <SelectItem value="generalNetwork">General Network</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Who is the primary audience for this post?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Goal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the goal of your post" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="generateLeads">Generate Leads</SelectItem>
                        <SelectItem value="buildBrand">Build Brand Awareness</SelectItem>
                        <SelectItem value="shareKnowledge">Share Knowledge</SelectItem>
                        <SelectItem value="networkGrowth">Grow Network</SelectItem>
                        <SelectItem value="driveTraffic">Drive Traffic</SelectItem>
                        <SelectItem value="recruitment">Recruitment</SelectItem>
                        <SelectItem value="celebration">Celebration</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      What do you hope to achieve with this post?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Gist</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the main idea or content you want to convey in your post..." 
                        className="min-h-32 resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a summary or the key points you want to include in your post.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Posts...
                  </>
                ) : "Generate LinkedIn Posts"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedPosts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Generated Posts</h2>
            <Tabs defaultValue="post1" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="post1">Version 1</TabsTrigger>
                <TabsTrigger value="post2">Version 2</TabsTrigger>
                <TabsTrigger value="post3">Version 3</TabsTrigger>
              </TabsList>
              
              {generatedPosts.map((post, index) => (
                <TabsContent key={index} value={`post${index + 1}`}>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="whitespace-pre-wrap mb-4">{post}</div>
                      <Button 
                        onClick={() => setSelectedPost(post)}
                        variant={selectedPost === post ? "default" : "outline"}
                        className="w-full"
                      >
                        {selectedPost === post ? "Selected" : "Select this post"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
            
            {selectedPost && (
              <div className="mt-6">
                <Button 
                  className="w-full"
                  onClick={() => setShowScheduleDialog(true)}
                >
                  Schedule on LinkedIn
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule LinkedIn Post</DialogTitle>
            <DialogDescription>
              Choose when you want to publish this post on LinkedIn.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="font-medium">Selected Post:</div>
              <div className="max-h-32 overflow-y-auto p-2 rounded-md bg-muted text-sm">
                {selectedPost}
              </div>
              
              <div className="space-y-2">
                <label className="font-medium">Schedule Date and Time</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSchedulePost} 
              disabled={!scheduleDate || isScheduling}
            >
              {isScheduling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Schedule Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GitBranch, Github, Plus, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const createRepositorySchema = z.object({
  name: z.string().min(1, "Repository name is required"),
  githubUsername: z.string().min(1, "GitHub username is required"),
  repositoryName: z.string().min(1, "Repository name is required").regex(/^[a-zA-Z0-9._-]+$/, "Repository name can only contain letters, numbers, dots, hyphens, and underscores"),
  token: z.string().min(1, "GitHub token is required"),
  workflowName: z.string().min(1, "Workflow name is required").regex(/^[a-zA-Z0-9._-]+\.yml$/, "Workflow name must end with .yml"),
});

type CreateRepositoryForm = z.infer<typeof createRepositorySchema>;

interface CreateRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (repository: any) => void;
}

export default function CreateRepoModal({ isOpen, onClose, onSuccess }: CreateRepoModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  const form = useForm<CreateRepositoryForm>({
    resolver: zodResolver(createRepositorySchema),
    defaultValues: {
      name: "",
      githubUsername: "",
      repositoryName: "",
      token: "",
      workflowName: "deploy.yml",
    },
  });

  // Check user's current bot count
  const { data: botLimitCheck } = useQuery<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
  }>({
    queryKey: ["/api/users/bot-limit"],
    enabled: isOpen,
  });

  const createRepositoryMutation = useMutation({
    mutationFn: async (data: CreateRepositoryForm) => {
      setIsCreatingRepo(true);
      return await apiRequest("/api/github/repositories", "POST", data);
    },
    onSuccess: (repository: any) => {
      toast({
        title: "Repository Created!",
        description: `GitHub repository ${repository.name} has been created and configured successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/github/repositories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/bot-limit"] });
      onSuccess?.(repository);
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create repository. Please check your GitHub token and try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCreatingRepo(false);
    },
  });

  const onSubmit = (data: CreateRepositoryForm) => {
    createRepositoryMutation.mutate(data);
  };

  const canCreateRepository = botLimitCheck?.allowed !== false;
  const currentBotCount = botLimitCheck?.currentCount || 0;
  const maxBots = botLimitCheck?.maxAllowed || 10;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Create GitHub Repository
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!canCreateRepository && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have reached the maximum limit of {maxBots} repositories. You currently have {currentBotCount} repositories.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <GitBranch className="h-4 w-4" />
            <AlertDescription>
              This will create a new GitHub repository that you own and manage. Each bot deployment will be a separate branch in this repository.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository Display Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="My Bot Repository"
                        data-testid="input-repo-name"
                      />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this repository
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="githubUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="your-github-username"
                        data-testid="input-github-username"
                      />
                    </FormControl>
                    <FormDescription>
                      Your GitHub username or organization name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="repositoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="my-bot-repo"
                        data-testid="input-repository-name"
                      />
                    </FormControl>
                    <FormDescription>
                      The actual GitHub repository name (must be unique on GitHub)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub Personal Access Token</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        data-testid="input-github-token"
                      />
                    </FormControl>
                    <FormDescription>
                      GitHub token with repo permissions to create and manage repositories
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workflowName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workflow File Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="deploy.yml"
                        data-testid="input-workflow-name"
                      />
                    </FormControl>
                    <FormDescription>
                      The GitHub Actions workflow file name (must end with .yml)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isCreatingRepo}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canCreateRepository || isCreatingRepo}
                  data-testid="button-create-repository"
                >
                  {isCreatingRepo ? (
                    <>
                      <Plus className="mr-2 h-4 w-4 animate-spin" />
                      Creating Repository...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Repository
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
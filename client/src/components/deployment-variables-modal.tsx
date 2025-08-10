import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Plus, Trash2, Save, RefreshCw, Rocket, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface DeploymentVariable {
  _id: string;
  deploymentId: string;
  key: string;
  value: string;
  description?: string;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeploymentVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentId: string;
  deploymentName: string;
}

export default function DeploymentVariablesModal({ 
  isOpen, 
  onClose, 
  deploymentId, 
  deploymentName 
}: DeploymentVariablesModalProps) {
  const { toast } = useToast();
  const [newVariable, setNewVariable] = useState({
    key: '',
    value: '',
    description: '',
    isRequired: true
  });
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fetch deployment variables
  const { data: variables, isLoading: variablesLoading, refetch } = useQuery<DeploymentVariable[]>({
    queryKey: ['/api/deployments', deploymentId, 'variables'],
    enabled: isOpen && !!deploymentId,
    retry: false,
  });

  // Create/Update variable mutation
  const createVariableMutation = useMutation({
    mutationFn: async (data: { key: string; value: string; description?: string; isRequired: boolean }) => {
      await apiRequest(`/api/deployments/${deploymentId}/variables`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Variable saved successfully!",
      });
      setNewVariable({ key: '', value: '', description: '', isRequired: true });
      refetch();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save variable",
        variant: "destructive",
      });
    },
  });

  // Update variable mutation
  const updateVariableMutation = useMutation({
    mutationFn: async ({ variableId, value }: { variableId: string; value: string }) => {
      await apiRequest(`/api/deployments/${deploymentId}/variables/${variableId}`, "PUT", { value });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Variable updated successfully!",
      });
      setEditingVariable(null);
      setEditValue('');
      refetch();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update variable",
        variant: "destructive",
      });
    },
  });

  // Delete variable mutation
  const deleteVariableMutation = useMutation({
    mutationFn: async (variableId: string) => {
      await apiRequest(`/api/deployments/${deploymentId}/variables/${variableId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Variable deleted successfully!",
      });
      refetch();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete variable",
        variant: "destructive",
      });
    },
  });

  // Redeploy mutation
  const redeployMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/deployments/${deploymentId}/redeploy`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deployment restarted with updated variables!",
      });
      onClose();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      // Handle GitHub configuration errors
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to redeploy";
      const errorDetails = error?.response?.data?.details;
      
      if (errorMessage.includes('GitHub integration not configured') || errorMessage.includes('GitHub authentication failed')) {
        toast({
          title: "GitHub Integration Required",
          description: errorDetails || "Contact administrator to configure GitHub integration for deployment management.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Redeploy Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handleCreateVariable = () => {
    if (!newVariable.key || !newVariable.value) {
      toast({
        title: "Error",
        description: "Key and value are required",
        variant: "destructive",
      });
      return;
    }

    createVariableMutation.mutate(newVariable);
  };

  const handleUpdateVariable = (variableId: string) => {
    if (!editValue) {
      toast({
        title: "Error",
        description: "Value is required",
        variant: "destructive",
      });
      return;
    }

    updateVariableMutation.mutate({ variableId, value: editValue });
  };

  const startEditing = (variable: DeploymentVariable) => {
    setEditingVariable(variable._id);
    setEditValue(variable.value);
  };

  const cancelEditing = () => {
    setEditingVariable(null);
    setEditValue('');
  };

  // Common bot variables with descriptions
  const commonVariables = [
    { key: 'SESSION_ID', description: 'WhatsApp session ID for bot authentication' },
    { key: 'OWNER_NUMBER', description: 'WhatsApp number of the bot owner' },
    { key: 'BOT_NAME', description: 'Display name for the bot' },
    { key: 'PREFIX', description: 'Command prefix (e.g., ".", "!", "/")', defaultValue: '.' },
    { key: 'MODE', description: 'Bot mode: "public" or "private"', defaultValue: 'private' },
    { key: 'AUTO_READ', description: 'Auto-read messages: "true" or "false"', defaultValue: 'false' },
    { key: 'ALWAYS_ONLINE', description: 'Always show online: "true" or "false"', defaultValue: 'false' },
  ];

  const addCommonVariable = (variable: { key: string; description: string; defaultValue?: string }) => {
    setNewVariable({
      key: variable.key,
      value: variable.defaultValue || '',
      description: variable.description,
      isRequired: true
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Deployment Variables - {deploymentName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Common Variables Quick Add */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Add Common Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonVariables.map((variable) => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    onClick={() => addCommonVariable(variable)}
                    className="text-xs"
                  >
                    {variable.key}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add New Variable */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add New Variable</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key">Variable Key</Label>
                  <Input
                    id="key"
                    placeholder="e.g., SESSION_ID"
                    value={newVariable.key}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    placeholder="Enter variable value"
                    value={newVariable.value}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this variable does"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <Button 
                onClick={handleCreateVariable}
                disabled={createVariableMutation.isPending || !newVariable.key || !newVariable.value}
                className="w-full"
              >
                {createVariableMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variable
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Variables</CardTitle>
            </CardHeader>
            <CardContent>
              {variablesLoading ? (
                <div className="text-center py-4">Loading variables...</div>
              ) : variables && variables.length > 0 ? (
                <div className="space-y-3">
                  {variables.map((variable) => (
                    <div key={variable._id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-mono text-sm font-semibold bg-gray-100 px-2 py-1 rounded">
                              {variable.key}
                            </span>
                            {variable.isRequired && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                            )}
                          </div>
                          
                          {editingVariable === variable._id ? (
                            <div className="space-y-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="Enter new value"
                              />
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateVariable(variable._id)}
                                  disabled={updateVariableMutation.isPending}
                                >
                                  {updateVariableMutation.isPending ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono text-sm text-gray-700 mb-1">
                                {variable.value || <span className="text-gray-400">No value set</span>}
                              </div>
                              {variable.description && (
                                <div className="text-xs text-gray-500">{variable.description}</div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {editingVariable !== variable._id && (
                          <div className="flex space-x-1 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(variable)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteVariableMutation.mutate(variable._id)}
                              disabled={deleteVariableMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No variables configured yet. Add some variables above to get started!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redeploy Section */}
          {variables && variables.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                After making changes to variables, you need to redeploy your bot for the changes to take effect.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {variables && variables.length > 0 && (
              <Button
                onClick={() => redeployMutation.mutate()}
                disabled={redeployMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {redeployMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Redeploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Redeploy with New Variables
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
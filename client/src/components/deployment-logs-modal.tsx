import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DeploymentLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentId: string;
  deploymentName: string;
  isAdmin?: boolean;
}

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
  head_commit: {
    message: string;
  };
}

interface JobLog {
  jobId: number;
  jobName: string;
  logs: string;
}

export default function DeploymentLogsModal({ 
  isOpen, 
  onClose, 
  deploymentId, 
  deploymentName,
  isAdmin = false 
}: DeploymentLogsModalProps) {
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  // Fetch workflow runs for the deployment
  const { data: runsData, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
    queryKey: [`/api/deployments/${deploymentId}/logs`],
    enabled: isOpen && !!deploymentId,
    refetchInterval: 15000, // Refetch every 15 seconds for better performance
  });

  // Fetch specific run logs when a run is selected
  const { data: runLogsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: [`/api/deployments/${deploymentId}/runs/${selectedRunId}/logs`],
    enabled: isOpen && !!selectedRunId,
    refetchInterval: 8000, // Refetch logs every 8 seconds for live updates
  });

  const workflowRuns: WorkflowRun[] = (runsData as any)?.workflowRuns || [];
  const logs: JobLog[] = (runLogsData as any)?.logs || [];

  const getStatusIcon = (status: string, conclusion: string) => {
    if (status === 'in_progress') return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    if (conclusion === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (conclusion === 'failure') return <XCircle className="w-4 h-4 text-red-500" />;
    if (conclusion === 'cancelled') return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string, conclusion: string) => {
    if (status === 'in_progress') return <Badge variant="secondary">Running</Badge>;
    if (conclusion === 'success') return <Badge variant="default" className="bg-green-600">Success</Badge>;
    if (conclusion === 'failure') return <Badge variant="destructive">Failed</Badge>;
    if (conclusion === 'cancelled') return <Badge variant="outline">Cancelled</Badge>;
    return <Badge variant="secondary">Queued</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatLogContent = (logs: string) => {
    // Advanced log formatting with better styling and detection
    return logs
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
      .split('\n')
      .map((line, index) => {
        // Detect different types of log lines
        const isError = line.toLowerCase().includes('error') || line.includes('ERROR');
        const isWarning = line.toLowerCase().includes('warn') || line.includes('WARN');
        const isSuccess = line.toLowerCase().includes('success') || line.includes('✓') || line.includes('complete');
        const isInstall = line.includes('npm install') || line.includes('installing');
        const isStart = line.includes('npm start') || line.includes('node index.js') || line.includes('Server is running');
        const isTimestamp = /^\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}/.test(line);
        
        // Apply appropriate styling
        let className = "font-mono text-xs leading-relaxed ";
        if (isError) className += "text-red-400";
        else if (isWarning) className += "text-yellow-400";
        else if (isSuccess) className += "text-green-400";
        else if (isInstall) className += "text-blue-400";
        else if (isStart) className += "text-cyan-400 font-semibold";
        else if (isTimestamp) className += "text-gray-500";
        else className += "text-green-200";

        return (
          <div key={index} className={className} data-testid={`log-line-${index}`}>
            {line || '\u00A0'} {/* Non-breaking space for empty lines */}
          </div>
        );
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>Deployment Logs: {deploymentName}</span>
              <Badge variant="outline" className="ml-2">
                {isAdmin ? 'Admin View' : 'User View'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchRuns();
                  if (selectedRunId) refetchLogs();
                }}
                disabled={runsLoading || logsLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${runsLoading || logsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="secondary" className="text-xs">
                Auto-refresh: 10s
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* Workflow Runs Sidebar */}
          <div className="w-1/3 border-r border-border p-4">
            <h3 className="font-semibold mb-4">Workflow Runs</h3>
            <ScrollArea className="h-full">
              {runsLoading ? (
                <div className="text-center py-4">Loading runs...</div>
              ) : workflowRuns.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <div className="mb-2">No workflow runs found</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    This may indicate that GitHub integration is not configured or no builds have been triggered yet.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflowRuns.map((run) => (
                    <Card
                      key={run.id}
                      className={`cursor-pointer transition-colors ${
                        selectedRunId === run.id ? 'ring-2 ring-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedRunId(run.id)}
                      data-testid={`workflow-run-${run.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(run.status, run.conclusion)}
                            <span className="font-medium">#{run.run_number}</span>
                          </div>
                          {getStatusBadge(run.status, run.conclusion)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatDate(run.created_at)}
                        </div>
                        <div className="text-xs truncate">
                          {run.head_commit?.message || 'No commit message'}
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(run.html_url, '_blank');
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View on GitHub
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Logs Content */}
          <div className="flex-1 p-4">
            {!selectedRunId ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a workflow run to view logs
              </div>
            ) : logsLoading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="mb-2">No logs available for this run</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    The build may still be in progress or logs haven't been generated yet.
                  </div>
                </div>
              </div>
            ) : (
              <Tabs defaultValue={logs[0]?.jobId.toString()} className="h-full">
                <TabsList className="mb-4">
                  {logs.map((job) => (
                    <TabsTrigger key={job.jobId} value={job.jobId.toString()}>
                      {job.jobName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {logs.map((job) => (
                  <TabsContent 
                    key={job.jobId} 
                    value={job.jobId.toString()} 
                    className="h-[calc(100%-3rem)]"
                  >
                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{job.jobName}</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[calc(100%-4rem)]">
                        <ScrollArea className="h-full">
                          <div className="bg-black border border-gray-800 rounded-lg p-4 min-h-full">
                            {/* Terminal header */}
                            <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-3">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="text-gray-400 text-sm font-mono">{job.jobName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {(job as any).status === 'in_progress' && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-blue-400 text-xs">Running</span>
                                  </div>
                                )}
                                {(job as any).conclusion === 'success' && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 text-xs">Complete</span>
                                  </div>
                                )}
                                {(job as any).conclusion === 'failure' && (
                                  <div className="flex items-center space-x-1">
                                    <XCircle className="w-4 h-4 text-red-400" />
                                    <span className="text-red-400 text-xs">Failed</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Log content */}
                            <div className="text-green-400 font-mono text-sm space-y-1" data-testid="terminal-content">
                              {job.logs === 'No logs available' || job.logs === 'Error fetching logs' || job.logs === 'Logs not yet available' ? (
                                <div className="text-yellow-400 flex items-center space-x-2">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>{job.logs}</span>
                                </div>
                              ) : (
                                formatLogContent(job.logs)
                              )}
                            </div>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
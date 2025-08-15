import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Users, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Voucher {
  _id: string;
  code: string;
  coinAmount: number;
  createdBy: string;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  usedBy: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminVouchers() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    coinAmount: "",
    expiresAt: "",
    maxUsage: "1"
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vouchers, isLoading } = useQuery<Voucher[]>({
    queryKey: ['/api/admin/vouchers'],
  });

  const createVoucherMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vouchers'] });
      setIsCreateDialogOpen(false);
      setFormData({ code: "", coinAmount: "", expiresAt: "", maxUsage: "1" });
      toast({ title: "Voucher created successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/admin/vouchers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error('Failed to update voucher status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vouchers'] });
      toast({ title: "Voucher status updated!" });
    }
  });

  const deleteVoucherMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/vouchers/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete voucher');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vouchers'] });
      toast({ title: "Voucher deleted successfully!" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      code: formData.code.toUpperCase(),
      coinAmount: parseInt(formData.coinAmount),
      maxUsage: parseInt(formData.maxUsage)
    };

    if (formData.expiresAt) {
      payload.expiresAt = new Date(formData.expiresAt);
    }

    createVoucherMutation.mutate(payload);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Voucher Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Voucher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Voucher</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Voucher Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Enter voucher code"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateRandomCode}>
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="coinAmount">Coin Amount</Label>
                <Input
                  id="coinAmount"
                  type="number"
                  value={formData.coinAmount}
                  onChange={(e) => setFormData({ ...formData, coinAmount: e.target.value })}
                  placeholder="Amount of coins to give"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="maxUsage">Maximum Uses</Label>
                <Input
                  id="maxUsage"
                  type="number"
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                  placeholder="Maximum number of uses"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={createVoucherMutation.isPending}>
                {createVoucherMutation.isPending ? "Creating..." : "Create Voucher"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {vouchers?.map((voucher) => (
          <Card key={voucher._id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-mono">{voucher.code}</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {voucher.coinAmount} coins
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {voucher.usageCount}/{voucher.maxUsage || '∞'} uses
                    </div>
                    {voucher.expiresAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Expires: {new Date(voucher.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={voucher.isActive ? "default" : "secondary"}>
                    {voucher.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={voucher.isActive}
                    onCheckedChange={(checked) => 
                      updateStatusMutation.mutate({ id: voucher._id, isActive: checked })
                    }
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteVoucherMutation.mutate(voucher._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-gray-500">
                Created: {new Date(voucher.createdAt).toLocaleString()}
              </div>
              {voucher.usageCount > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  Last used: {new Date(voucher.updatedAt).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {vouchers?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">No vouchers created yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
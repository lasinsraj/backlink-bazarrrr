import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSessionContext } from "@supabase/auth-helpers-react";

const Payment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSessionContext();

  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!session) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(*)")
        .eq("id", orderId)
        .eq("user_id", session.user.id)
        .single();
      
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      if (!data) throw new Error("Order not found");
      return data;
    },
    retry: false,
    enabled: !!session && !!orderId,
  });

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          orderId: orderId,
          productId: order?.products?.id,
          price: order?.products?.price,
        },
      });

      if (error) {
        console.error("Payment error:", error);
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      console.error("Payment processing error:", err);
      setError(err.message || "Failed to process payment");
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please sign in to access this page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                {orderError?.message || "Order not found"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Complete Payment</CardTitle>
            <CardDescription>
              Review your order details before proceeding to payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">{order.products?.title}</h2>
              <p className="text-gray-600 mb-4">{order.products?.description}</p>
              <div className="text-2xl font-bold text-primary">${order.products?.price}</div>
            </div>

            <div className="space-y-2">
              {order.keywords && (
                <p className="text-sm text-gray-600">Keywords: {order.keywords}</p>
              )}
              {order.target_url && (
                <p className="text-sm text-gray-600">Target URL: {order.target_url}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handlePayment}
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-5 w-5 mr-2" />
              )}
              Proceed to Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
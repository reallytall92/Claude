"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Upload, BarChart3, HelpCircle } from "lucide-react";

type DashboardData = {
  setupComplete: boolean;
  companyName: string | null;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  cashPosition: number;
  unclassifiedCount: number;
  accountCount: number;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data.setupComplete) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to S-Corp Books</h1>
          <p className="text-muted-foreground">
            Let&apos;s get your books set up
          </p>
        </div>
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-lg">
              You haven&apos;t set up your company yet. The setup wizard will walk you through
              entering your company info, opening balances, and bank accounts.
            </p>
            <Link href="/setup">
              <Button size="lg">Start Setup</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {data.companyName || "Your business"} at a glance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-success-subtle">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">YTD Income</p>
              <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(data.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">YTD Expenses</p>
              <TrendingDown className="size-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(data.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Net Income</p>
              <DollarSign className={`size-5 ${data.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`} />
            </div>
            <p className={`text-2xl font-bold ${data.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
              {formatCurrency(data.netIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-info-subtle">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Cash Position</p>
              <Wallet className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(data.cashPosition)}</p>
          </CardContent>
        </Card>
      </div>

      {data.unclassifiedCount > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="destructive">{data.unclassifiedCount}</Badge>
              <p>
                You have {data.unclassifiedCount} transaction{data.unclassifiedCount !== 1 ? "s" : ""} that need{data.unclassifiedCount === 1 ? "s" : ""} to be classified
              </p>
            </div>
            <Link href="/transactions?tab=needs_review">
              <Button variant="outline">Review Now</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/transactions/upload">
          <Card className="hover:border-primary/50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="py-6 text-center">
              <Upload className="size-6 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">Upload Statement</p>
              <p className="text-sm text-muted-foreground mt-1">Import transactions from a bank statement PDF</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="hover:border-primary/50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="py-6 text-center">
              <BarChart3 className="size-6 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">Generate Reports</p>
              <p className="text-sm text-muted-foreground mt-1">P&amp;L, Balance Sheet, and more</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/guide">
          <Card className="hover:border-primary/50 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <CardContent className="py-6 text-center">
              <HelpCircle className="size-6 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">How It Works</p>
              <p className="text-sm text-muted-foreground mt-1">Step-by-step guide to managing your books</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

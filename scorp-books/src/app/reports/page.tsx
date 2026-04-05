"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type PLLineItem = { code: string; friendlyName: string; amount: number };
type BSLineItem = { code: string; friendlyName: string; amount: number };

type PLReport = {
  periodStart: string;
  periodEnd: string;
  income: PLLineItem[];
  expenses: PLLineItem[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
};

type BSReport = {
  asOfDate: string;
  assets: BSLineItem[];
  liabilities: BSLineItem[];
  equity: BSLineItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

const currentYear = new Date().getFullYear();

export default function ReportsPage() {
  const [tab, setTab] = useState("profit-loss");

  // P&L state
  const [plStart, setPlStart] = useState(`${currentYear}-01-01`);
  const [plEnd, setPlEnd] = useState(new Date().toISOString().split("T")[0]);
  const [plReport, setPlReport] = useState<PLReport | null>(null);
  const [plLoading, setPlLoading] = useState(false);

  // Balance Sheet state
  const [bsDate, setBsDate] = useState(new Date().toISOString().split("T")[0]);
  const [bsReport, setBsReport] = useState<BSReport | null>(null);
  const [bsLoading, setBsLoading] = useState(false);

  async function generatePL() {
    setPlLoading(true);
    const params = new URLSearchParams({ type: "profit-loss", periodStart: plStart, periodEnd: plEnd });
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setPlReport(data);
    setPlLoading(false);
  }

  async function generateBS() {
    setBsLoading(true);
    const params = new URLSearchParams({ type: "balance-sheet", asOfDate: bsDate });
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setBsReport(data);
    setBsLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate financial reports for your CPA or tax return
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profit-loss">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="profit-loss" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit &amp; Loss</CardTitle>
              <CardDescription>
                Shows all money your business earned and spent during a period.
                Your CPA uses this to prepare your tax return (Form 1120-S, page 1).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={plStart} onChange={(e) => setPlStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={plEnd} onChange={(e) => setPlEnd(e.target.value)} />
                </div>
                <Button onClick={generatePL} disabled={plLoading}>
                  {plLoading ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {plReport && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Profit &amp; Loss Statement
                </CardTitle>
                <CardDescription>
                  {plReport.periodStart} through {plReport.periodEnd}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Income */}
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Income</h3>
                    {plReport.income.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No income recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {plReport.income.map((item) => (
                          <div key={item.code} className="flex justify-between py-1">
                            <span className="text-sm">{item.friendlyName}</span>
                            <span className="font-mono text-sm">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t mt-2 font-semibold">
                      <span>Total Income</span>
                      <span className="font-mono">{formatCurrency(plReport.totalIncome)}</span>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Expenses</h3>
                    {plReport.expenses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No expenses recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {plReport.expenses.map((item) => (
                          <div key={item.code} className="flex justify-between py-1">
                            <span className="text-sm">{item.friendlyName}</span>
                            <span className="font-mono text-sm">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t mt-2 font-semibold">
                      <span>Total Expenses</span>
                      <span className="font-mono">{formatCurrency(plReport.totalExpenses)}</span>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className="flex justify-between py-3 border-t-2 border-b-2 font-bold text-lg bg-muted/30 px-2 rounded">
                    <span>Net Income</span>
                    <span className={`font-mono ${plReport.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {formatCurrency(plReport.netIncome)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>
                A snapshot of what your business owns, owes, and your ownership equity as of a specific date.
                Your CPA needs this for Schedule L on Form 1120-S.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>As of Date</Label>
                  <Input type="date" value={bsDate} onChange={(e) => setBsDate(e.target.value)} />
                </div>
                <div />
                <Button onClick={generateBS} disabled={bsLoading}>
                  {bsLoading ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {bsReport && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Balance Sheet</CardTitle>
                    <CardDescription>As of {bsReport.asOfDate}</CardDescription>
                  </div>
                  <Badge
                    variant={bsReport.balanced ? "outline" : "destructive"}
                    className={bsReport.balanced ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" : ""}
                  >
                    {bsReport.balanced ? "Balanced" : "Out of Balance"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Assets */}
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Assets</h3>
                    {bsReport.assets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No assets recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {bsReport.assets.map((item) => (
                          <div key={item.code} className="flex justify-between py-1">
                            <span className="text-sm">{item.friendlyName}</span>
                            <span className="font-mono text-sm">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t mt-2 font-semibold">
                      <span>Total Assets</span>
                      <span className="font-mono">{formatCurrency(bsReport.totalAssets)}</span>
                    </div>
                  </div>

                  {/* Liabilities */}
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Liabilities</h3>
                    {bsReport.liabilities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No liabilities recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {bsReport.liabilities.map((item) => (
                          <div key={item.code} className="flex justify-between py-1">
                            <span className="text-sm">{item.friendlyName}</span>
                            <span className="font-mono text-sm">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t mt-2 font-semibold">
                      <span>Total Liabilities</span>
                      <span className="font-mono">{formatCurrency(bsReport.totalLiabilities)}</span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Equity</h3>
                    {bsReport.equity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No equity recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {bsReport.equity.map((item) => (
                          <div key={item.code} className="flex justify-between py-1">
                            <span className="text-sm">{item.friendlyName}</span>
                            <span className="font-mono text-sm">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t mt-2 font-semibold">
                      <span>Total Equity</span>
                      <span className="font-mono">{formatCurrency(bsReport.totalEquity)}</span>
                    </div>
                  </div>

                  {/* Verification */}
                  <div className={`rounded-lg p-4 ${bsReport.balanced ? "bg-success-subtle" : "bg-danger-subtle"}`}>
                    <div className="flex justify-between font-bold">
                      <span>Total Liabilities + Equity</span>
                      <span className="font-mono">
                        {formatCurrency(bsReport.totalLiabilities + bsReport.totalEquity)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold mt-1">
                      <span>Total Assets</span>
                      <span className="font-mono">{formatCurrency(bsReport.totalAssets)}</span>
                    </div>
                    {!bsReport.balanced && (
                      <p className="text-sm text-destructive mt-2">
                        The balance sheet is out of balance by{" "}
                        {formatCurrency(Math.abs(bsReport.totalAssets - (bsReport.totalLiabilities + bsReport.totalEquity)))}.
                        This usually means there are unclassified transactions or missing journal entries.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

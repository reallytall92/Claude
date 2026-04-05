"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CategoryPicker } from "@/components/category-picker";
import { Upload, CircleCheck, TriangleAlert, FileText, X, CopyMinus } from "lucide-react";
import { toast } from "sonner";

type BankAccount = {
  id: number;
  name: string;
  type: string;
  institution: string | null;
};

type ParsedTransaction = {
  date: string;
  description: string;
  rawDescription: string;
  amount: number;
  type: "debit" | "credit";
  section: string;
  categoryId?: number | null;
  categoryName?: string | null;
  excluded?: boolean;
  isDuplicate?: boolean;
};

type StatementInfo = {
  bank: string;
  accountNumber: string;
  periodStart: string;
  periodEnd: string;
  beginningBalance: number;
  endingBalance: number;
};

type Verification = {
  passed: boolean;
  warnings: {
    type: string;
    message: string;
    expected: number;
    actual: number;
    section?: string;
  }[];
};

type ParsedStatement = {
  uploadId: number;
  filename: string;
  statement: StatementInfo;
  transactions: ParsedTransaction[];
  verification: Verification | null;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(amount));
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year}`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Batch parsed state
  const [parsedStatements, setParsedStatements] = useState<ParsedStatement[]>([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
  }, []);

  async function handleFiles(files: File[]) {
    if (!selectedAccountId) {
      toast.error("Please select a bank account first.");
      return;
    }

    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfFiles.length === 0) {
      toast.error("Only PDF files are supported.");
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: pdfFiles.length });

    const results: ParsedStatement[] = [];
    const errors: string[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      setUploadProgress({ current: i + 1, total: pdfFiles.length });
      const file = pdfFiles[i];

      const formData = new FormData();
      formData.append("file", file);
      formData.append("accountId", selectedAccountId);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          errors.push(`${file.name}: ${data.error || "Upload failed"}`);
          continue;
        }

        results.push({
          uploadId: data.upload.id,
          filename: file.name,
          statement: data.statement,
          transactions: data.transactions.map((t: ParsedTransaction & { isDuplicate?: boolean }) => ({
            ...t,
            categoryId: null,
            categoryName: null,
            excluded: t.isDuplicate ?? false,
            isDuplicate: t.isDuplicate ?? false,
          })),
          verification: data.verification || null,
        });
      } catch {
        errors.push(`${file.name}: Upload failed`);
      }
    }

    if (results.length > 0) {
      // Sort by period start date
      results.sort((a, b) => a.statement.periodStart.localeCompare(b.statement.periodStart));
      setParsedStatements(results);
      const totalTxns = results.reduce((s, r) => s + r.transactions.length, 0);
      const totalDups = results.reduce((s, r) => s + r.transactions.filter((t) => t.isDuplicate).length, 0);
      const dupMsg = totalDups > 0 ? ` (${totalDups} duplicate${totalDups !== 1 ? "s" : ""} auto-excluded)` : "";
      toast.success(`Parsed ${results.length} statement${results.length !== 1 ? "s" : ""} with ${totalTxns} transactions${dupMsg}.`);
    }

    if (errors.length > 0) {
      for (const err of errors) {
        toast.error(err);
      }
    }

    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFiles(files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFiles(files);
    // Reset so the same files can be re-selected
    e.target.value = "";
  }

  function updateTransaction(stmtIndex: number, txnIndex: number, updates: Partial<ParsedTransaction>) {
    setParsedStatements((prev) =>
      prev.map((stmt, si) =>
        si === stmtIndex
          ? {
              ...stmt,
              transactions: stmt.transactions.map((t, ti) =>
                ti === txnIndex ? { ...t, ...updates } : t
              ),
            }
          : stmt
      )
    );
  }

  function removeStatement(stmtIndex: number) {
    setParsedStatements((prev) => prev.filter((_, i) => i !== stmtIndex));
  }

  async function handleConfirm() {
    setSaving(true);

    let totalSaved = 0;

    for (const stmt of parsedStatements) {
      const toSave = stmt.transactions
        .filter((t) => !t.excluded)
        .map((t) => ({
          date: t.date,
          description: t.description,
          rawDescription: t.rawDescription,
          amount: t.amount,
          type: t.type,
          categoryId: t.categoryId,
        }));

      if (toSave.length === 0) continue;

      try {
        const res = await fetch("/api/upload", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: stmt.uploadId,
            accountId: selectedAccountId,
            confirmedTransactions: toSave,
          }),
        });

        const data = await res.json();
        totalSaved += data.saved;
        if (data.skippedDuplicates > 0) {
          toast.info(`${data.skippedDuplicates} duplicate${data.skippedDuplicates !== 1 ? "s" : ""} skipped from ${stmt.filename}`);
        }
      } catch {
        toast.error(`Failed to save transactions from ${stmt.filename}`);
      }
    }

    toast.success(`Saved ${totalSaved} transactions. Head to Transactions to classify them.`);
    setSaving(false);
    router.push("/transactions");
  }

  const totalTransactions = parsedStatements.reduce(
    (s, stmt) => s + stmt.transactions.filter((t) => !t.excluded).length,
    0
  );
  const totalClassified = parsedStatements.reduce(
    (s, stmt) => s + stmt.transactions.filter((t) => !t.excluded && t.categoryId).length,
    0
  );
  const progress = totalTransactions > 0 ? (totalClassified / totalTransactions) * 100 : 0;
  const allVerified = parsedStatements.length > 0 && parsedStatements.every((s) => s.verification?.passed);
  const hasWarnings = parsedStatements.some((s) => s.verification && !s.verification.passed);
  const totalDuplicates = parsedStatements.reduce(
    (s, stmt) => s + stmt.transactions.filter((t) => t.isDuplicate).length,
    0
  );

  // Review screen
  if (parsedStatements.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review Transactions</h1>
            <p className="text-muted-foreground">
              {parsedStatements.length} statement{parsedStatements.length !== 1 ? "s" : ""} — {totalTransactions} transactions
            </p>
          </div>
          <Button onClick={handleConfirm} disabled={saving || totalTransactions === 0}>
            {saving ? "Saving..." : `Import ${totalTransactions} Transactions`}
          </Button>
        </div>

        {/* Overall verification summary */}
        {parsedStatements.length > 1 && (
          <Card className={allVerified
            ? "border-green-500/30 bg-green-500/5"
            : hasWarnings
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border"
          }>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                {allVerified ? (
                  <CircleCheck className="size-5 text-green-500 shrink-0" />
                ) : hasWarnings ? (
                  <TriangleAlert className="size-5 text-amber-500 shrink-0" />
                ) : null}
                <p className="text-sm font-medium">
                  {allVerified
                    ? `All ${parsedStatements.length} statements verified`
                    : hasWarnings
                      ? "Some statements have verification warnings — review below"
                      : `${parsedStatements.length} statements ready for review`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {totalDuplicates > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <CopyMinus className="size-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {totalDuplicates} duplicate{totalDuplicates !== 1 ? "s" : ""} found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    These transactions already exist and have been excluded. You can re-include them if needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Classifying now is optional — you can always do it later on the Transactions page.
          </p>
        </div>

        {parsedStatements.map((stmt, stmtIndex) => {
          const stmtActive = stmt.transactions.filter((t) => !t.excluded).length;
          return (
            <div key={stmtIndex} className="space-y-2">
              {/* Statement header */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(stmt.statement.periodStart)} — {formatDate(stmt.statement.periodEnd)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stmtActive} transactions — {formatCurrency(stmt.statement.beginningBalance)} → {formatCurrency(stmt.statement.endingBalance)}
                    </p>
                  </div>
                  {stmt.verification && (
                    stmt.verification.passed ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs gap-1">
                        <CircleCheck className="size-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs gap-1">
                        <TriangleAlert className="size-3" /> Warnings
                      </Badge>
                    )
                  )}
                </div>
                {parsedStatements.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeStatement(stmtIndex)}>
                    <X className="size-4" />
                  </Button>
                )}
              </div>

              {/* Per-statement verification warnings */}
              {stmt.verification && !stmt.verification.passed && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="py-2 px-4">
                    {stmt.verification.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {w.message}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Transactions */}
              <div className="space-y-1">
                {stmt.transactions.map((txn, txnIndex) => (
                  <Card key={txnIndex} className={txn.excluded ? "opacity-40" : ""}>
                    <CardContent className="flex items-center gap-4 py-3 px-4">
                      <div className="w-20 text-sm text-muted-foreground shrink-0">
                        {formatDate(txn.date)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{txn.description}</p>
                          {txn.isDuplicate && (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs gap-1 shrink-0">
                              <CopyMinus className="size-3" /> Duplicate
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{txn.rawDescription}</p>
                      </div>
                      {!txn.excluded && (
                        <div className="shrink-0">
                          <CategoryPicker
                            value={txn.categoryId ?? null}
                            categoryName={txn.categoryName}
                            onSelect={(catId) => updateTransaction(stmtIndex, txnIndex, { categoryId: catId })}
                          />
                        </div>
                      )}
                      <div className={`w-24 text-right font-mono text-sm shrink-0 ${txn.type === "credit" ? "text-green-600 dark:text-green-400" : ""}`}>
                        {txn.type === "credit" ? "+" : "-"}{formatCurrency(txn.amount)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => updateTransaction(stmtIndex, txnIndex, { excluded: !txn.excluded })}
                      >
                        {txn.excluded ? "Include" : "Skip"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setParsedStatements([])}>
            Start Over
          </Button>
          <Button onClick={handleConfirm} disabled={saving || totalTransactions === 0}>
            {saving ? "Saving..." : `Import ${totalTransactions} Transactions`}
          </Button>
        </div>
      </div>
    );
  }

  // Upload screen
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Bank Statement</h1>
        <p className="text-muted-foreground">
          Upload one or more PDF bank statements to import transactions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Account</CardTitle>
          <CardDescription>
            Which account are these statements for?
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bank accounts found. Add one on the Accounts page first.
            </p>
          ) : (
            <Select value={selectedAccountId} onValueChange={(v) => v && setSelectedAccountId(v)}>
              <SelectTrigger>
                {selectedAccountId ? (
                  (() => {
                    const acct = accounts.find((a) => String(a.id) === selectedAccountId);
                    return acct ? `${acct.name}${acct.institution ? ` (${acct.institution})` : ""}` : <SelectValue />;
                  })()
                ) : (
                  <span className="text-muted-foreground">Select a bank account</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                    {a.institution && ` (${a.institution})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Statement PDFs</CardTitle>
          <CardDescription>
            Drag and drop one or more bank statement PDFs, or click to browse.
            Currently supports Chase accessible PDF format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? "border-primary bg-accent ring-2 ring-primary/20 scale-[1.02]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30"
            }`}
          >
            {uploading ? (
              <div className="space-y-2">
                <Upload className="size-8 text-primary mx-auto mb-2 animate-pulse" />
                <p className="text-sm font-medium">
                  Parsing statement {uploadProgress.current} of {uploadProgress.total}...
                </p>
                <p className="text-xs text-muted-foreground">
                  Extracting transactions from your PDFs
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">
                  Drop your PDFs here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF files only. Select multiple files to batch upload.
                </p>
              </div>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium mb-2">How to download your Chase statement:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Log in to chase.com and go to your business checking account</li>
            <li>Click &quot;Statements&quot; in the left menu</li>
            <li>Select the statement period you want</li>
            <li>Click &quot;Download&quot; and choose &quot;Accessible PDF&quot;</li>
            <li>Upload the downloaded file here</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionKey" TEXT,
    "amount" REAL DEFAULT 0,
    "moneroSubaddress" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionKey_key" ON "Transaction"("transactionKey");

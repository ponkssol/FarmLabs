-- Backfill amount + currency from legacy amountUsd (dev one-off)
UPDATE EscrowOrder SET amount = amountUsd, currency = 'USDC' WHERE amount IS NULL;

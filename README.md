# Solana Vault & Escrow

A small collection of Solana programs I built with **Rust and Anchor** while working through the Turbine Q3 2026 coursework.

The goal here wasn't just to ship something that works — it was to actually understand how accounts, PDAs, token accounts, CPIs, and program constraints fit together under the hood in a real Solana program.

## Programs

### 1. Vault

A simple SOL vault. Nothing fancy — just the basics done right:

- Initialize a vault for yourself
- Deposit SOL into it
- Withdraw SOL back out
- Close the vault when you're done

Under the hood, it's all controlled by a PDA, so no one but the vault owner can move funds in or out.

### 2. Escrow

A token-swap escrow — think "I'll lock up Token A until someone gives me Token B in return." It supports:

- `make` — create the escrow and lock in Token A
- `take` — someone else comes along, pays Token B, and walks away with Token A
- `refund` — the maker changes their mind (or time runs out) and gets Token A back
- `update` — tweak the exchange amount or expiration after creating it

It also has an optional expiration built in, checked against the on-chain clock. If you set one, the escrow can't be taken after it expires — but it *can* be refunded once expired, so nothing ever gets stuck.

### 3. Non-Custodial Vault

This one's the more interesting piece — a vault where deposits earn you shares, and redeeming those shares always works, no matter what.

- Deposit an underlying asset and get shares back, proportional to what's already in the vault
- Redeem shares for your fair slice of whatever the vault *actually* holds right now — not some outdated internal number
- That last part matters: even if the vault's balance has dropped for whatever reason, you can still redeem and exit. Worst case you get less back, but you're never stuck holding shares you can't cash out.

## Tech Stack

- Rust
- Anchor
- Solana
- SPL Token
- TypeScript
- Anchor TypeScript Client

## Project Structure

```text
programs/
├── vault/
├── escrow/
└── non_custodial_vault/

tests/
├── vault.ts
├── escrow.ts
└── non_custodial_vault.ts
```
## Test Results

All 15 tests pass across the three programs, including rejection cases for over-withdrawal and over-redemption:

<img width="1208" height="1386" alt="image" src="https://github.com/user-attachments/assets/71a7a50d-471d-4689-8b39-ff1b0ab1b548" />
